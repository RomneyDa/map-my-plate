"use client";

import {
  Camera,
  Compass,
  Layers,
  Locate,
  MapPin,
  Moon,
  PackageSearch,
  Send,
  Share2,
  Sun,
  X,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  sampleMealMap,
  summarizeConfidence,
  type IngredientOrigin,
  type MealLocation,
} from "@map-my-plate/core";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  cartoProvider,
  getTheme,
  type MapThemeId,
} from "./map-providers";
import { TileMapCanvas } from "./tile-map-canvas";
import {
  useConversation,
  type AssistantClarification,
  type ConversationTurn,
} from "./use-conversation";

const locationPresets: MealLocation[] = [
  {
    label: "San Francisco, California",
    countryCode: "US",
    latitude: 37.7749,
    longitude: -122.4194,
    precision: "city",
    source: "manual",
  },
  {
    label: "Brooklyn, New York",
    countryCode: "US",
    latitude: 40.6782,
    longitude: -73.9442,
    precision: "city",
    source: "manual",
  },
  {
    label: "London, United Kingdom",
    countryCode: "GB",
    latitude: 51.5072,
    longitude: -0.1276,
    precision: "city",
    source: "manual",
  },
  {
    label: "Tokyo, Japan",
    countryCode: "JP",
    latitude: 35.6762,
    longitude: 139.6503,
    precision: "city",
    source: "manual",
  },
];

function confidenceLabel(value: number) {
  if (value >= 0.6) return "High";
  if (value >= 0.42) return "Medium";
  return "Low";
}

function sourceLabel(source: IngredientOrigin["source"]) {
  return source
    .split("-")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-grid size-10 place-items-center rounded-full border border-border bg-glass text-foreground/80 shadow-sm backdrop-blur-md transition hover:text-foreground hover:bg-glass-strong"
      aria-label="Toggle dark mode"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

function GlassButton({
  label,
  children,
  onClick,
  active = false,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`inline-grid size-10 place-items-center rounded-full border border-border bg-glass text-foreground/80 shadow-sm backdrop-blur-md transition hover:text-foreground hover:bg-glass-strong ${
        active ? "ring-2 ring-accent/40" : ""
      }`}
    >
      {children}
    </button>
  );
}


function IngredientChip({
  ingredient,
  active,
  dimmed,
  onClick,
}: {
  ingredient: IngredientOrigin;
  active: boolean;
  dimmed: boolean;
  onClick: () => void;
}) {
  const confidence = ingredient.confidence;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex shrink-0 snap-start items-center gap-3 rounded-full border px-3 py-2 text-left backdrop-blur-md transition ${
        active
          ? "border-border-strong bg-glass-strong shadow-lg"
          : "border-border bg-glass shadow-sm hover:bg-glass-strong"
      } ${dimmed ? "opacity-60" : "opacity-100"}`}
    >
      <span
        className="relative grid size-7 place-items-center rounded-full"
        style={{ background: "var(--route-glow)" }}
      >
        <span
          className="size-2 rounded-full"
          style={{ background: "var(--route)" }}
        />
      </span>
      <span className="flex flex-col">
        <span className="text-[13px] font-medium leading-tight text-foreground">
          {ingredient.ingredient}
        </span>
        <span className="text-[11px] leading-tight text-muted-foreground">
          {ingredient.origin.label}
        </span>
      </span>
      <span className="ml-1 flex flex-col items-end">
        <span className="text-[13px] font-semibold tabular-nums text-foreground">
          {Math.round(ingredient.probability * 100)}%
        </span>
        <span className="h-1 w-10 overflow-hidden rounded-full bg-muted">
          <span
            className="block h-full rounded-full"
            style={{
              width: `${confidence * 100}%`,
              background: "var(--accent)",
            }}
          />
        </span>
      </span>
    </button>
  );
}

function IngredientDetail({
  ingredient,
  onClose,
}: {
  ingredient: IngredientOrigin;
  onClose: () => void;
}) {
  return (
    <div
      className="pointer-events-auto w-full max-w-md rounded-2xl border border-border bg-glass-strong p-5 shadow-2xl backdrop-blur-xl"
      style={{ animation: "mmp-fade-up 220ms ease-out both" }}
      role="dialog"
      aria-label={`${ingredient.ingredient} detail`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Likely origin
          </p>
          <h3 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            {ingredient.ingredient}
          </h3>
          <p className="text-sm text-muted-foreground">
            {ingredient.origin.label}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid size-8 place-items-center rounded-full border border-border bg-glass text-muted-foreground transition hover:text-foreground"
          aria-label="Close ingredient detail"
        >
          <X size={14} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card/60 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Probability
          </p>
          <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
            {Math.round(ingredient.probability * 100)}%
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card/60 p-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Confidence
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {confidenceLabel(ingredient.confidence)}
          </p>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${ingredient.confidence * 100}%`,
                background: "var(--accent)",
              }}
            />
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-relaxed text-foreground/80">
        {ingredient.rationale}
      </p>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-[12px] text-muted-foreground">
        <span>Source · {sourceLabel(ingredient.source)}</span>
        <span className="capitalize">{ingredient.category}</span>
      </div>
    </div>
  );
}

const themeSwatches: Record<MapThemeId, string> = {
  light: "linear-gradient(135deg, #f4f1ea 0%, #d9d4c8 100%)",
  dark: "linear-gradient(135deg, #2c3340 0%, #0f141d 100%)",
  color: "linear-gradient(135deg, #f6e7c3 0%, #b9d4d2 50%, #d59a73 100%)",
};

function MapStyleMenu({
  currentId,
  onSelect,
  onClose,
}: {
  currentId: MapThemeId;
  onSelect: (id: MapThemeId) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute right-0 top-12 z-40 w-56 rounded-2xl border border-border bg-glass-strong p-2 shadow-2xl backdrop-blur-xl"
      style={{ animation: "mmp-fade-up 200ms ease-out both" }}
      role="menu"
    >
      <p className="px-3 pb-2 pt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Map style
      </p>
      {cartoProvider.themes.map((theme) => {
        const isActive = currentId === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            role="menuitem"
            onClick={() => {
              onSelect(theme.id);
              onClose();
            }}
            className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition ${
              isActive
                ? "bg-muted text-foreground"
                : "text-foreground/80 hover:bg-muted"
            }`}
          >
            <span
              className="size-5 shrink-0 rounded-md border border-border-strong"
              style={{ background: themeSwatches[theme.id] }}
            />
            <span className="flex-1 text-left">{theme.label}</span>
            {isActive ? (
              <span
                className="size-1.5 rounded-full"
                style={{ background: "var(--accent)" }}
              />
            ) : null}
          </button>
        );
      })}
      <p className="border-t border-border px-3 pb-1 pt-2 text-[10px] text-muted-foreground">
        Free basemaps via {cartoProvider.label}.
      </p>
    </div>
  );
}

function LocationMenu({
  current,
  onSelect,
  onLocate,
  onClose,
}: {
  current: MealLocation;
  onSelect: (location: MealLocation) => void;
  onLocate: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute right-0 top-12 z-40 w-72 rounded-2xl border border-border bg-glass-strong p-2 shadow-2xl backdrop-blur-xl"
      style={{ animation: "mmp-fade-up 200ms ease-out both" }}
      role="menu"
    >
      <div className="px-3 pb-2 pt-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Market context
        </p>
        <p className="mt-0.5 text-sm font-medium text-foreground">
          {current.label}
        </p>
      </div>
      <div className="flex flex-col">
        {locationPresets.map((preset) => {
          const isActive = preset.label === current.label;
          return (
            <button
              key={preset.label}
              type="button"
              role="menuitem"
              onClick={() => {
                onSelect(preset);
                onClose();
              }}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                isActive
                  ? "bg-muted text-foreground"
                  : "text-foreground/80 hover:bg-muted"
              }`}
            >
              <span>{preset.label}</span>
              {isActive ? (
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: "var(--accent)" }}
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <div className="border-t border-border pt-1">
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onLocate();
            onClose();
          }}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          <Locate size={15} />
          Use current location
        </button>
      </div>
    </div>
  );
}

function ConversationPanel({
  turns,
  pending,
  onChooseOption,
}: {
  turns: ConversationTurn[];
  pending: boolean;
  onChooseOption: (value: string) => void;
}) {
  // Show only the latest user → assistant pair to keep the deck uncluttered.
  // The map IS the durable artifact; older explanations live with the data.
  const latest = useMemo(() => {
    const lastAssistant = [...turns].reverse().find((t) => t.kind === "assistant");
    const lastUser = [...turns].reverse().find((t) => t.kind === "user");
    return { lastUser, lastAssistant };
  }, [turns]);

  if (!latest.lastUser && !pending) return null;

  const assistant =
    latest.lastAssistant && latest.lastAssistant.kind === "assistant"
      ? latest.lastAssistant
      : null;

  const plan = assistant?.entries.find(
    (e) => e.kind === "explanation" && e.channel === "plan",
  );
  const summary = assistant?.entries.find(
    (e) => e.kind === "explanation" && e.channel === "summary",
  );
  const clarification = assistant?.entries.find(
    (e): e is AssistantClarification => e.kind === "clarification",
  );

  return (
    <div
      className="pointer-events-auto mx-auto w-full max-w-2xl"
      style={{ animation: "mmp-fade-up 240ms ease-out both" }}
    >
      <div className="space-y-2 rounded-2xl border border-border bg-glass p-3 shadow-lg backdrop-blur-md">
        {latest.lastUser && latest.lastUser.kind === "user" ? (
          <p className="text-[12px] leading-snug text-muted-foreground">
            <span className="font-medium text-foreground">You · </span>
            {latest.lastUser.text}
          </p>
        ) : null}

        {assistant?.pending || pending ? (
          <p className="flex items-center gap-2 text-[13px] text-muted-foreground">
            <span
              className="inline-block size-1.5 animate-pulse rounded-full"
              style={{ background: "var(--accent)" }}
            />
            Mapping the meal…
          </p>
        ) : null}

        {plan && plan.kind === "explanation" ? (
          <p className="text-[13px] leading-snug text-foreground/90">
            {plan.text}
          </p>
        ) : null}

        {summary && summary.kind === "explanation" ? (
          <p className="text-[13px] leading-snug text-foreground/90">
            {summary.text}
          </p>
        ) : null}

        {clarification ? (
          <div className="space-y-2 border-t border-border pt-2">
            <p className="text-[13px] font-medium text-foreground">
              {clarification.question}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {clarification.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onChooseOption(opt.value)}
                  disabled={pending}
                  className="rounded-full border border-border bg-card/70 px-3 py-1 text-[12px] font-medium text-foreground shadow-sm transition hover:bg-muted disabled:opacity-50"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {assistant?.errors.length ? (
          <p className="border-t border-border pt-2 text-[11px] text-accent">
            {assistant.errors[0]}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default function Home() {
  const [mealPrompt, setMealPrompt] = useState("");
  const { mealMap, setMealMap, turns, pending, send } = useConversation(
    sampleMealMap,
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [mapStyleOpen, setMapStyleOpen] = useState(false);
  const [mapThemeOverride, setMapThemeOverride] = useState<MapThemeId | null>(
    null,
  );
  const locationRef = useRef<HTMLDivElement | null>(null);
  const mapStyleRef = useRef<HTMLDivElement | null>(null);

  const { resolvedTheme } = useTheme();
  const provider = cartoProvider;
  const effectiveThemeId: MapThemeId =
    mapThemeOverride ?? (resolvedTheme === "dark" ? "dark" : "light");
  const mapTheme = useMemo(
    () => getTheme(provider, effectiveThemeId),
    [provider, effectiveThemeId],
  );

  const summary = useMemo(() => summarizeConfidence(mealMap), [mealMap]);
  const activeIngredient = useMemo(
    () => mealMap.ingredients.find((i) => i.id === activeId) ?? null,
    [activeId, mealMap.ingredients],
  );

  useEffect(() => {
    if (!locationOpen && !mapStyleOpen) return;
    function handleClick(event: MouseEvent) {
      if (
        locationOpen &&
        !locationRef.current?.contains(event.target as Node)
      ) {
        setLocationOpen(false);
      }
      if (
        mapStyleOpen &&
        !mapStyleRef.current?.contains(event.target as Node)
      ) {
        setMapStyleOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [locationOpen, mapStyleOpen]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveId(null);
        setLocationOpen(false);
        setMapStyleOpen(false);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  function requestLocation() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((position) => {
      setMealMap((current) => ({
        ...current,
        location: {
          label: "Current location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          precision: "coordinate",
          source: "device",
        },
      }));
    });
  }

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden bg-background text-foreground">
      <TileMapCanvas
        mealMap={mealMap}
        activeId={activeId}
        onSelect={setActiveId}
        provider={provider}
        theme={mapTheme}
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-start justify-between gap-3 p-4 md:p-6">
        <div className="pointer-events-auto flex items-center gap-3">
          <span
            className="grid size-10 place-items-center rounded-full text-primary-foreground shadow-lg"
            style={{ background: "var(--primary)" }}
          >
            <Compass size={18} />
          </span>
          <div className="hidden sm:block">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Map My Plate
            </p>
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              {mealMap.title}
            </h1>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <div className="relative" ref={locationRef}>
            <button
              type="button"
              onClick={() => setLocationOpen((open) => !open)}
              className="flex h-10 items-center gap-2 rounded-full border border-border bg-glass px-3.5 text-sm font-medium text-foreground shadow-sm backdrop-blur-md transition hover:bg-glass-strong"
              aria-haspopup="menu"
              aria-expanded={locationOpen}
            >
              <MapPin size={14} className="text-accent" />
              <span className="max-w-[140px] truncate sm:max-w-[200px]">
                {mealMap.location.label}
              </span>
            </button>
            {locationOpen ? (
              <LocationMenu
                current={mealMap.location}
                onSelect={(location) =>
                  setMealMap((current) => ({ ...current, location }))
                }
                onLocate={requestLocation}
                onClose={() => setLocationOpen(false)}
              />
            ) : null}
          </div>
          <div className="relative" ref={mapStyleRef}>
            <GlassButton
              label="Map style"
              active={mapStyleOpen}
              onClick={() => setMapStyleOpen((open) => !open)}
            >
              <Layers size={15} />
            </GlassButton>
            {mapStyleOpen ? (
              <MapStyleMenu
                currentId={effectiveThemeId}
                onSelect={(id) => setMapThemeOverride(id)}
                onClose={() => setMapStyleOpen(false)}
              />
            ) : null}
          </div>
          <GlassButton label="Share map">
            <Share2 size={15} />
          </GlassButton>
          <ThemeToggle />
        </div>
      </header>

      <div className="pointer-events-none absolute left-4 top-20 z-20 hidden md:left-6 md:block">
        <div
          className="pointer-events-auto flex items-center gap-3 rounded-full border border-border bg-glass px-4 py-2 text-[12px] text-muted-foreground shadow-sm backdrop-blur-md"
          style={{ animation: "mmp-fade-up 500ms ease-out both" }}
        >
          <span className="flex items-center gap-1.5">
            <span
              className="size-1.5 rounded-full"
              style={{ background: "var(--accent)" }}
            />
            <span className="font-medium text-foreground">
              {mealMap.ingredients.length}
            </span>
            ingredients
          </span>
          <span className="h-3 w-px bg-border-strong" />
          <span>
            <span className="font-medium text-foreground tabular-nums">
              {Math.round(summary.averageConfidence * 100)}%
            </span>{" "}
            avg confidence
          </span>
          <span className="h-3 w-px bg-border-strong" />
          <span>
            <span className="font-medium text-foreground tabular-nums">
              {summary.inferredCount}
            </span>{" "}
            estimated
          </span>
        </div>
      </div>

      {activeIngredient ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-44 z-30 flex justify-center px-4 md:bottom-48">
          <IngredientDetail
            ingredient={activeIngredient}
            onClose={() => setActiveId(null)}
          />
        </div>
      ) : null}

      <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex flex-col items-stretch gap-3 px-4 pb-5 md:px-6 md:pb-6">
        <div className="pointer-events-auto w-full overflow-x-auto pb-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
          <div className="mx-auto flex w-fit max-w-full snap-x snap-mandatory items-stretch gap-2">
            {mealMap.ingredients.map((ingredient) => (
              <IngredientChip
                key={ingredient.id}
                ingredient={ingredient}
                active={activeId === ingredient.id}
                dimmed={activeId !== null && activeId !== ingredient.id}
                onClick={() =>
                  setActiveId((current) =>
                    current === ingredient.id ? null : ingredient.id,
                  )
                }
              />
            ))}
          </div>
        </div>

        <ConversationPanel
          turns={turns}
          onChooseOption={(value) => {
            void send(value);
          }}
          pending={pending}
        />

        <form
          className="pointer-events-auto mx-auto w-full max-w-2xl"
          onSubmit={(event) => {
            event.preventDefault();
            const text = mealPrompt.trim();
            if (text.length === 0 || pending) return;
            setMealPrompt("");
            void send(text);
          }}
        >
          <div className="flex items-end gap-2 rounded-3xl border border-border bg-glass-strong p-2 shadow-2xl backdrop-blur-xl">
            <textarea
              value={mealPrompt}
              onChange={(event) => setMealPrompt(event.target.value)}
              rows={1}
              placeholder={
                pending
                  ? "Mapping…"
                  : "Describe a meal, paste a label, or share a photo…"
              }
              disabled={pending}
              className="min-h-10 flex-1 resize-none border-0 bg-transparent px-3 py-2.5 text-[15px] leading-snug text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-70"
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  const text = mealPrompt.trim();
                  if (text.length === 0 || pending) return;
                  setMealPrompt("");
                  void send(text);
                }
              }}
            />
            <div className="flex items-center gap-1 pr-1">
              <button
                type="button"
                className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Add photo"
              >
                <Camera size={16} />
              </button>
              <button
                type="button"
                className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Scan barcode"
              >
                <PackageSearch size={16} />
              </button>
              <button
                type="submit"
                className="ml-1 grid size-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-md transition hover:opacity-90 disabled:opacity-40"
                aria-label="Send"
                disabled={mealPrompt.trim().length === 0 || pending}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            Every origin shown is an estimate. Tell Map My Plate what you know
            and the map sharpens.
          </p>
        </form>
      </footer>
    </main>
  );
}
