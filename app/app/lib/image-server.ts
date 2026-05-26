import "server-only";

import sharp from "sharp";

/**
 * Server-side image normalization. This is the source of truth — runs even
 * when the client already normalized, so a misbehaving client (or no client,
 * for future API consumers) cannot push a 50 MB CMYK TIFF at Claude vision.
 */

export type NormalizedServerImage = {
  base64: string;
  mediaType: "image/jpeg";
  width: number;
  height: number;
  byteSize: number;
  gps?: { latitude: number; longitude: number };
};

export class ImageInputError extends Error {}

const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MIN_INPUT_BYTES = 64;
const MIN_DIMENSION = 16;
const MAX_DIMENSION = 2048;
const TARGET_QUALITY = 85;

const FORMAT_ALLOWLIST: ReadonlySet<string> = new Set([
  "jpeg",
  "jpg",
  "png",
  "webp",
  "gif",
  "avif",
  "heif",
  "tiff",
]);

async function extractGps(buffer: Buffer): Promise<NormalizedServerImage["gps"]> {
  try {
    const exifr = await import("exifr");
    const fn = (exifr as { gps?: (input: Buffer) => Promise<unknown> }).gps
      ?? (exifr as { default?: { gps?: (input: Buffer) => Promise<unknown> } })
        .default?.gps;
    if (!fn) return undefined;
    const result = (await fn(buffer)) as
      | { latitude?: number; longitude?: number }
      | null
      | undefined;
    if (
      result &&
      typeof result.latitude === "number" &&
      typeof result.longitude === "number" &&
      Number.isFinite(result.latitude) &&
      Number.isFinite(result.longitude)
    ) {
      return {
        latitude: result.latitude,
        longitude: result.longitude,
      };
    }
  } catch {
    /* EXIF is optional */
  }
  return undefined;
}

export async function normalizeImageForModel(
  base64Input: string,
): Promise<NormalizedServerImage> {
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Input, "base64");
  } catch {
    throw new ImageInputError("Could not decode image payload.");
  }
  if (buffer.length < MIN_INPUT_BYTES) {
    throw new ImageInputError("Image is empty or too small to read.");
  }
  if (buffer.length > MAX_INPUT_BYTES) {
    throw new ImageInputError("Image is too large after upload (max 15 MB).");
  }

  let pipeline: sharp.Sharp;
  try {
    pipeline = sharp(buffer, { failOn: "none", limitInputPixels: 268435456 });
  } catch (err) {
    throw new ImageInputError(
      `Could not open image: ${err instanceof Error ? err.message : "unknown"}`,
    );
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await pipeline.metadata();
  } catch (err) {
    throw new ImageInputError(
      `Unsupported image format: ${err instanceof Error ? err.message : "unknown"}`,
    );
  }

  if (!metadata.format || !FORMAT_ALLOWLIST.has(metadata.format)) {
    throw new ImageInputError(
      `Unsupported image format${metadata.format ? ` (${metadata.format})` : ""}.`,
    );
  }

  const longestSide = Math.max(metadata.width ?? 0, metadata.height ?? 0);
  if (longestSide < MIN_DIMENSION) {
    throw new ImageInputError("Image is too small to read.");
  }

  const gps = await extractGps(buffer);

  let output: { data: Buffer; info: sharp.OutputInfo };
  try {
    output = await pipeline
      .rotate() // bake EXIF orientation into pixels
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: TARGET_QUALITY, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    // sharp strips metadata by default, including GPS — intended.
  } catch (err) {
    throw new ImageInputError(
      `Could not process image: ${err instanceof Error ? err.message : "unknown"}`,
    );
  }

  return {
    base64: output.data.toString("base64"),
    mediaType: "image/jpeg",
    width: output.info.width,
    height: output.info.height,
    byteSize: output.data.length,
    gps,
  };
}
