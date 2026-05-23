"use client";

import {
  ArrowUpRight,
  Camera,
  CircleHelp,
  Compass,
  LocateFixed,
  MapPin,
  MessageCircle,
  Moon,
  PackageSearch,
  Share2,
  SlidersHorizontal,
  Sun,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  sampleMealMap,
  summarizeConfidence,
  updateMealLocation,
  type IngredientOrigin,
  type MealLocation,
  type MealMap,
} from "@map-my-plate/core";
import { useEffect, useMemo, useState } from "react";

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

const continents = [
  "left-[8%] top-[22%] h-[26%] w-[25%] rotate-[-14deg] rounded-[58%_42%_48%_52%]",
  "left-[25%] top-[51%] h-[29%] w-[12%] rotate-[15deg] rounded-[44%_58%_50%_54%]",
  "left-[47%] top-[26%] h-[13%] w-[13%] rotate-[8deg] rounded-[46%_54%_45%_55%]",
  "left-[48%] top-[39%] h-[27%] w-[16%] rotate-[-7deg] rounded-[50%_48%_46%_54%]",
  "left-[61%] top-[24%] h-[29%] w-[28%] rotate-[4deg] rounded-[52%_48%_48%_52%]",
  "left-[75%] top-[65%] h-[10%] w-[12%] rotate-[-8deg] rounded-[55%_45%_48%_52%]",
];

function projectPoint(latitude: number, longitude: number) {
  return {
    x: ((longitude + 180) / 360) * 100,
    y: ((90 - latitude) / 180) * 100,
  };
}

function confidenceLabel(value: number) {
  if (value >= 0.6) return "Higher";
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
      className="inline-grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm transition hover:opacity-90"
      aria-label="Toggle dark mode"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function IconButton({
  label,
  children,
  onClick,
}: {
  label: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-grid size-11 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm transition hover:opacity-90"
      aria-label={label}
    >
      {children}
    </button>
  );
}

function WorldMap({ mealMap }: { mealMap: MealMap }) {
  const destination = projectPoint(
    mealMap.location.latitude,
    mealMap.location.longitude,
  );

  return (
    <section
      className="overflow-hidden rounded-lg border border-border bg-card shadow-[0_18px_50px_var(--surface-shadow)]"
      aria-label="Ingredient origin map"
    >
      <div className="flex items-center justify-between gap-3 p-5">
        <div>
          <span className="block text-xs font-extrabold uppercase tracking-normal text-primary">
            Live provenance map
          </span>
          <h2 className="mt-1 text-xl font-black tracking-normal text-card-foreground">
            {mealMap.title}
          </h2>
        </div>
        <IconButton label="Share map">
          <Share2 size={18} />
        </IconButton>
      </div>

      <div className="relative h-[430px] overflow-hidden bg-water md:h-[540px]">
        <div className="absolute inset-0 bg-[linear-gradient(var(--map-grid)_1px,transparent_1px),linear-gradient(90deg,var(--map-grid)_1px,transparent_1px)] bg-[length:8.33%_16.66%] [mask-image:linear-gradient(to_bottom,transparent,black_8%,black_92%,transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_38%,var(--map-glow-primary),transparent_22%),radial-gradient(circle_at_68%_40%,var(--map-glow-secondary),transparent_28%)]" />

        {continents.map((shape) => (
          <div
            key={shape}
            className={`absolute border border-primary/10 bg-terrain/55 shadow-xl shadow-primary/10 ${shape}`}
          />
        ))}

        <svg
          className="absolute inset-0 h-full w-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {mealMap.ingredients.map((ingredient) => {
            const origin = projectPoint(
              ingredient.origin.latitude,
              ingredient.origin.longitude,
            );
            const midX = (origin.x + destination.x) / 2;
            const midY = Math.min(origin.y, destination.y) - 10;

            return (
              <path
                key={ingredient.id}
                d={`M ${origin.x} ${origin.y} Q ${midX} ${midY} ${destination.x} ${destination.y}`}
                fill="none"
                stroke="var(--route)"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                style={{
                  opacity: 0.25 + ingredient.confidence * 0.55,
                  strokeWidth: 0.2 + ingredient.probability * 0.55,
                }}
              />
            );
          })}
        </svg>

        {mealMap.ingredients.map((ingredient) => {
          const point = projectPoint(
            ingredient.origin.latitude,
            ingredient.origin.longitude,
          );

          return (
            <div
              className="absolute z-10 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5"
              key={ingredient.id}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            >
              <span className="size-3 rounded-full border-[3px] border-card bg-route shadow-[0_0_0_7px_var(--route-glow)]" />
              <span className="hidden max-w-32 rounded-lg border border-border bg-card/95 px-2 py-1 text-xs font-extrabold leading-tight text-card-foreground shadow-lg md:block">
                {ingredient.ingredient}
              </span>
            </div>
          );
        })}

        <div
          className="absolute z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 text-primary"
          style={{ left: `${destination.x}%`, top: `${destination.y}%` }}
        >
          <MapPin className="box-content rounded-full bg-primary p-2 text-primary-foreground shadow-[0_0_0_10px_var(--map-glow-primary)]" size={18} />
          <span className="max-w-36 rounded-lg border border-border bg-card/95 px-2 py-1 text-xs font-extrabold leading-tight text-card-foreground shadow-lg">
            {mealMap.location.label}
          </span>
        </div>
      </div>
    </section>
  );
}

function IngredientCard({ ingredient }: { ingredient: IngredientOrigin }) {
  return (
    <article className="flex min-h-52 flex-col justify-between rounded-lg border border-border bg-card/80 p-4">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-black tracking-normal text-card-foreground">
            {ingredient.ingredient}
          </h3>
          <span className="font-black text-primary">
            {Math.round(ingredient.probability * 100)}%
          </span>
        </div>
        <p className="mt-1 text-sm leading-snug text-muted-foreground">
          {ingredient.origin.label}
        </p>
      </div>
      <div>
        <div className="mb-2 mt-4 flex items-center justify-between gap-3 text-xs font-extrabold text-muted-foreground">
          <span>{confidenceLabel(ingredient.confidence)} confidence</span>
          <span>{sourceLabel(ingredient.source)}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-accent to-primary"
            style={{ width: `${ingredient.confidence * 100}%` }}
          />
        </div>
        <p className="mt-4 text-sm leading-snug text-muted-foreground">
          {ingredient.rationale}
        </p>
      </div>
    </article>
  );
}

export default function Home() {
  const [mealPrompt, setMealPrompt] = useState(
    "Chicken burrito from a supermarket deli",
  );
  const [mealMap, setMealMap] = useState<MealMap>(sampleMealMap);
  const summary = useMemo(() => summarizeConfidence(mealMap), [mealMap]);

  function requestLocation() {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition((position) => {
      setMealMap((current) =>
        updateMealLocation(current, {
          label: "Current location",
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          precision: "coordinate",
          source: "device",
        }),
      );
    });
  }

  return (
    <main className="min-h-screen bg-background bg-[linear-gradient(135deg,var(--map-glow-primary),transparent_34%),linear-gradient(315deg,var(--route-glow),transparent_34%)] p-3 text-foreground md:p-5">
      <section className="mx-auto grid max-w-[1500px] gap-4 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[340px_minmax(0,1fr)_300px]">
        <aside className="flex flex-col gap-5 rounded-lg border border-border bg-card/90 p-5 shadow-[0_18px_50px_var(--surface-shadow)] backdrop-blur-xl lg:sticky lg:top-5 lg:min-h-[calc(100vh-40px)]">
          <div className="grid grid-cols-[48px_1fr_auto] items-start gap-3">
            <div className="grid size-12 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Compass size={22} />
            </div>
            <div>
              <p className="text-xs font-extrabold uppercase tracking-normal text-primary">
                Map My Plate
              </p>
              <h1 className="mt-1 text-4xl font-black leading-none tracking-normal text-card-foreground md:text-[2.7rem]">
                Map the world inside your meal.
              </h1>
            </div>
            <ThemeToggle />
          </div>

          <div className="border-t border-border pt-5">
            <label
              htmlFor="meal"
              className="block text-sm font-extrabold text-muted-foreground"
            >
              What are you eating?
            </label>
            <textarea
              id="meal"
              value={mealPrompt}
              onChange={(event) => setMealPrompt(event.target.value)}
              rows={4}
              className="mt-2 w-full resize-y rounded-lg border border-border bg-background/70 p-3 text-foreground outline-none ring-primary/20 transition focus:border-primary focus:ring-4"
            />
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-3 font-extrabold text-primary-foreground transition hover:opacity-90" type="button">
                <MessageCircle size={17} />
                Ask AI
              </button>
              <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 font-extrabold text-card-foreground transition hover:bg-muted" type="button">
                <Camera size={17} />
                Photo
              </button>
              <button className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 font-extrabold text-card-foreground transition hover:bg-muted" type="button">
                <PackageSearch size={17} />
                Barcode
              </button>
            </div>
          </div>

          <div className="border-t border-border pt-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="block text-xs font-extrabold uppercase tracking-normal text-primary">
                  Market context
                </span>
                <h2 className="mt-1 text-xl font-black tracking-normal text-card-foreground">
                  {mealMap.location.label}
                </h2>
              </div>
              <IconButton label="Use current location" onClick={requestLocation}>
                <LocateFixed size={18} />
              </IconButton>
            </div>
            <div className="mt-3 grid gap-2">
              {locationPresets.map((location) => (
                <button
                  key={location.label}
                  type="button"
                  onClick={() =>
                    setMealMap((current) => updateMealLocation(current, location))
                  }
                  className="min-h-11 rounded-lg border border-border bg-card px-3 text-left font-medium text-card-foreground transition hover:bg-muted"
                >
                  {location.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 border-t border-border pt-5">
            <div className="min-w-0">
              <strong className="block text-3xl font-black">
                {mealMap.ingredients.length}
              </strong>
              <span className="block text-xs font-extrabold text-muted-foreground">
                ingredients
              </span>
            </div>
            <div className="min-w-0">
              <strong className="block text-3xl font-black">
                {Math.round(summary.averageConfidence * 100)}%
              </strong>
              <span className="block text-xs font-extrabold text-muted-foreground">
                avg confidence
              </span>
            </div>
            <div className="min-w-0">
              <strong className="block text-3xl font-black">
                {summary.inferredCount}
              </strong>
              <span className="block text-xs font-extrabold text-muted-foreground">
                estimated
              </span>
            </div>
          </div>
        </aside>

        <div className="grid gap-4">
          <WorldMap mealMap={mealMap} />

          <section className="rounded-lg border border-border bg-card/90 p-5 shadow-[0_18px_50px_var(--surface-shadow)] backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="block text-xs font-extrabold uppercase tracking-normal text-primary">
                  Ingredient evidence
                </span>
                <h2 className="mt-1 text-xl font-black tracking-normal text-card-foreground">
                  Likely origins
                </h2>
              </div>
              <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 font-extrabold text-card-foreground transition hover:bg-muted" type="button">
                <SlidersHorizontal size={16} />
                Tune
              </button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-5">
              {mealMap.ingredients.map((ingredient) => (
                <IngredientCard key={ingredient.id} ingredient={ingredient} />
              ))}
            </div>
          </section>
        </div>

        <aside className="flex flex-col gap-5 rounded-lg border border-border bg-card/90 p-5 text-muted-foreground shadow-[0_18px_50px_var(--surface-shadow)] backdrop-blur-xl lg:col-span-2 xl:sticky xl:top-5 xl:col-span-1 xl:min-h-[calc(100vh-40px)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="block text-xs font-extrabold uppercase tracking-normal text-primary">
                Shared logic plan
              </span>
              <h2 className="mt-1 text-xl font-black tracking-normal text-card-foreground">
                Web now, native next
              </h2>
            </div>
            <CircleHelp size={18} />
          </div>
          <p className="border-t border-border pt-5 text-base leading-snug">
            The provenance model lives in{" "}
            <code className="font-extrabold text-primary">packages/core</code> so
            the web app, API routes, background jobs, and future React Native app
            can reuse the same meal, ingredient, location, and confidence logic.
          </p>
          <div className="grid gap-4 border-t border-border pt-5">
            {[
              "Prototype the chat, map, and evidence graph in Next.js.",
              "Move reusable AI orchestration and adapters into packages.",
              "Build a native app with shared core logic and native camera/GPS.",
            ].map((item, index) => (
              <div className="grid grid-cols-[30px_1fr] gap-3" key={item}>
                <span className="grid size-[30px] place-items-center rounded-full bg-primary text-sm font-black text-primary-foreground">
                  {index + 1}
                </span>
                <p className="leading-snug">{item}</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 font-extrabold text-primary-foreground transition hover:opacity-90"
          >
            Open share preview
            <ArrowUpRight size={17} />
          </button>
        </aside>
      </section>
    </main>
  );
}
