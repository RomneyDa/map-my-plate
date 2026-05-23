"use client";

import {
  ArrowUpRight,
  Camera,
  CircleHelp,
  Compass,
  LocateFixed,
  MapPin,
  MessageCircle,
  PackageSearch,
  Share2,
  SlidersHorizontal,
} from "lucide-react";
import {
  sampleMealMap,
  summarizeConfidence,
  updateMealLocation,
  type IngredientOrigin,
  type MealLocation,
  type MealMap,
} from "@map-my-plate/core";
import { useMemo, useState } from "react";

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

function WorldMap({ mealMap }: { mealMap: MealMap }) {
  const destination = projectPoint(
    mealMap.location.latitude,
    mealMap.location.longitude,
  );

  return (
    <section className="map-panel" aria-label="Ingredient origin map">
      <div className="map-toolbar">
        <div>
          <span className="eyebrow">Live provenance map</span>
          <h2>{mealMap.title}</h2>
        </div>
        <button type="button" className="icon-button" aria-label="Share map">
          <Share2 size={18} />
        </button>
      </div>

      <div className="world-map">
        <div className="map-grid" />
        <div className="continent continent-na" />
        <div className="continent continent-sa" />
        <div className="continent continent-eu" />
        <div className="continent continent-af" />
        <div className="continent continent-asia" />
        <div className="continent continent-au" />

        <svg className="arc-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
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
                className="map-arc"
                d={`M ${origin.x} ${origin.y} Q ${midX} ${midY} ${destination.x} ${destination.y}`}
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
              className="origin-pin"
              key={ingredient.id}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
            >
              <span>{ingredient.ingredient}</span>
            </div>
          );
        })}

        <div
          className="meal-pin"
          style={{ left: `${destination.x}%`, top: `${destination.y}%` }}
        >
          <MapPin size={18} />
          <span>{mealMap.location.label}</span>
        </div>
      </div>
    </section>
  );
}

function IngredientCard({ ingredient }: { ingredient: IngredientOrigin }) {
  return (
    <article className="ingredient-card">
      <div>
        <div className="ingredient-card-header">
          <h3>{ingredient.ingredient}</h3>
          <span>{Math.round(ingredient.probability * 100)}%</span>
        </div>
        <p>{ingredient.origin.label}</p>
      </div>
      <div className="confidence-row">
        <span>{confidenceLabel(ingredient.confidence)} confidence</span>
        <span>{sourceLabel(ingredient.source)}</span>
      </div>
      <div className="confidence-meter">
        <span style={{ width: `${ingredient.confidence * 100}%` }} />
      </div>
      <p className="rationale">{ingredient.rationale}</p>
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
    <main className="shell">
      <section className="workspace">
        <aside className="control-panel">
          <div className="brand-row">
            <div className="brand-mark">
              <Compass size={22} />
            </div>
            <div>
              <p className="eyebrow">Map My Plate</p>
              <h1>Map the world inside your meal.</h1>
            </div>
          </div>

          <div className="prompt-box">
            <label htmlFor="meal">What are you eating?</label>
            <textarea
              id="meal"
              value={mealPrompt}
              onChange={(event) => setMealPrompt(event.target.value)}
              rows={4}
            />
            <div className="action-row">
              <button type="button" className="primary-button">
                <MessageCircle size={17} />
                Ask AI
              </button>
              <button type="button" className="secondary-button">
                <Camera size={17} />
                Photo
              </button>
              <button type="button" className="secondary-button">
                <PackageSearch size={17} />
                Barcode
              </button>
            </div>
          </div>

          <div className="location-box">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Market context</span>
                <h2>{mealMap.location.label}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={requestLocation}
                aria-label="Use current location"
              >
                <LocateFixed size={18} />
              </button>
            </div>
            <div className="preset-grid">
              {locationPresets.map((location) => (
                <button
                  key={location.label}
                  type="button"
                  onClick={() =>
                    setMealMap((current) => updateMealLocation(current, location))
                  }
                >
                  {location.label}
                </button>
              ))}
            </div>
          </div>

          <div className="status-strip">
            <div>
              <strong>{mealMap.ingredients.length}</strong>
              <span>ingredients</span>
            </div>
            <div>
              <strong>{Math.round(summary.averageConfidence * 100)}%</strong>
              <span>avg confidence</span>
            </div>
            <div>
              <strong>{summary.inferredCount}</strong>
              <span>estimated</span>
            </div>
          </div>
        </aside>

        <div className="map-column">
          <WorldMap mealMap={mealMap} />

          <section className="ingredient-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">Ingredient evidence</span>
                <h2>Likely origins</h2>
              </div>
              <button type="button" className="secondary-button compact-button">
                <SlidersHorizontal size={16} />
                Tune
              </button>
            </div>
            <div className="ingredient-grid">
              {mealMap.ingredients.map((ingredient) => (
                <IngredientCard key={ingredient.id} ingredient={ingredient} />
              ))}
            </div>
          </section>
        </div>

        <aside className="notes-panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Shared logic plan</span>
              <h2>Web now, native next</h2>
            </div>
            <CircleHelp size={18} />
          </div>
          <p>
            The provenance model lives in <code>packages/core</code> so the web
            app, API routes, background jobs, and future React Native app can
            reuse the same meal, ingredient, location, and confidence logic.
          </p>
          <div className="timeline">
            <div>
              <span>1</span>
              <p>Prototype the chat, map, and evidence graph in Next.js.</p>
            </div>
            <div>
              <span>2</span>
              <p>Move reusable AI orchestration and adapters into packages.</p>
            </div>
            <div>
              <span>3</span>
              <p>Build a native app with shared core logic and native camera/GPS.</p>
            </div>
          </div>
          <button type="button" className="wide-button">
            Open share preview
            <ArrowUpRight size={17} />
          </button>
        </aside>
      </section>
    </main>
  );
}
