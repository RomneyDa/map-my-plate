"use client";

/**
 * Client-side image normalization. Best-effort: tries to deliver a small,
 * orientation-baked JPEG to the server. If conversion fails (e.g. an exotic
 * HEIC variant), falls back to the original bytes — the server pipeline is
 * the source of truth and will re-normalize regardless.
 */

export type NormalizedImage = {
  base64: string;
  mediaType: string;
  width: number;
  height: number;
  byteSize: number;
  previewUrl: string;
  filename: string;
  fellBack: boolean;
};

const MAX_INPUT_BYTES = 30 * 1024 * 1024; // 30 MB raw input
const MIN_INPUT_BYTES = 64;
const MAX_DIMENSION = 2048;

export class ImageRejected extends Error {}

function isHeic(file: File): boolean {
  const lower = file.name.toLowerCase();
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    lower.endsWith(".heic") ||
    lower.endsWith(".heif")
  );
}

async function convertHeicToJpeg(file: File): Promise<File | null> {
  try {
    const mod = await import("heic2any");
    const heic2any = mod.default ?? (mod as unknown as typeof mod.default);
    const result = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });
    const blob = Array.isArray(result) ? result[0]! : result;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    return null;
  }
}

async function compressToJpeg(file: File): Promise<File> {
  const mod = await import("browser-image-compression");
  const compress = mod.default;
  return compress(file, {
    maxWidthOrHeight: MAX_DIMENSION,
    maxSizeMB: 3,
    useWebWorker: true,
    fileType: "image/jpeg",
    initialQuality: 0.85,
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read image bytes"));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Could not read image bytes"));
    reader.readAsDataURL(blob);
  });
}

function readDimensions(blob: Blob): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image"));
    };
    img.src = url;
  });
}

export async function normalizeImageForUpload(
  file: File,
): Promise<NormalizedImage> {
  if (!file.type.startsWith("image/") && !isHeic(file)) {
    throw new ImageRejected("That doesn't look like an image.");
  }
  if (file.size < MIN_INPUT_BYTES) {
    throw new ImageRejected("Image is empty or too small to read.");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageRejected("Image is too large — please try one under 30 MB.");
  }

  let working: File = file;
  let fellBack = false;

  if (isHeic(file)) {
    const converted = await convertHeicToJpeg(file);
    if (converted) {
      working = converted;
    } else {
      // Can't convert here — hand off to the server, which has sharp+libheif.
      fellBack = true;
    }
  }

  let processed: File;
  if (fellBack) {
    processed = working;
  } else {
    try {
      processed = await compressToJpeg(working);
    } catch {
      // Compression failed (memory, exotic codec) — let the server try.
      processed = working;
      fellBack = true;
    }
  }

  if (processed.size > MAX_INPUT_BYTES) {
    throw new ImageRejected("Image is still too large after processing.");
  }

  let dimensions = { width: 0, height: 0 };
  try {
    dimensions = await readDimensions(processed);
  } catch {
    // Can't decode in the browser (HEIC fallback path). Server will measure.
  }

  const base64 = await blobToBase64(processed);
  const previewUrl = URL.createObjectURL(processed);

  return {
    base64,
    mediaType: processed.type || "application/octet-stream",
    width: dimensions.width,
    height: dimensions.height,
    byteSize: processed.size,
    previewUrl,
    filename: processed.name,
    fellBack,
  };
}
