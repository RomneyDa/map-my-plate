"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import type { IngredientOrigin, MealMap } from "@map-my-plate/core";
import type { MapProvider, MapTheme } from "./map-providers";

type LeafletModule = typeof import("leaflet");
type LeafletMap = import("leaflet").Map;
type LeafletTileLayer = import("leaflet").TileLayer;
type LeafletPoint = import("leaflet").Point;

const ZOOM_EASE = "cubic-bezier(0, 0, 0.25, 1)";

export function TileMapCanvas({
  mealMap,
  activeId,
  onSelect,
  provider,
  theme,
}: {
  mealMap: MealMap;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  provider: MapProvider;
  theme: MapTheme;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const tileLayerRef = useRef<LeafletTileLayer | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const zoomingRef = useRef(false);
  const [, setTick] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let map: LeafletMap | null = null;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;
      leafletRef.current = L as unknown as LeafletModule;

      map = L.map(containerRef.current, {
        center: [mealMap.location.latitude, mealMap.location.longitude],
        zoom: 2,
        minZoom: 2,
        maxZoom: 7,
        zoomControl: false,
        attributionControl: false,
        worldCopyJump: true,
        scrollWheelZoom: true,
        zoomSnap: 0.25,
      });

      const tile = L.tileLayer(theme.tileUrl, {
        subdomains: (provider.subdomains?.split("") as never) ?? "abc",
        maxZoom: provider.maxZoom,
        crossOrigin: true,
      }).addTo(map);

      mapRef.current = map;
      tileLayerRef.current = tile;

      const refresh = () => {
        if (!zoomingRef.current) {
          setTick((t) => (t + 1) % 1_000_000);
        }
      };
      map.on("move", refresh);
      map.on("resize", refresh);

      map.on("zoomstart", () => {
        zoomingRef.current = true;
        const el = overlayRef.current;
        if (el) {
          el.style.transition = `transform 250ms ${ZOOM_EASE}`;
          el.style.willChange = "transform";
        }
      });

      map.on("zoomanim", (event) => {
        const el = overlayRef.current;
        if (!el || !mapRef.current) return;
        const m = mapRef.current;
        const targetZoom = (event as unknown as { zoom: number }).zoom;
        const targetCenter = (event as unknown as { center: import("leaflet").LatLng }).center;
        const scale = m.getZoomScale(targetZoom, m.getZoom());
        const size = m.getSize();
        const oldCx = size.x / 2;
        const oldCy = size.y / 2;
        const newCenterPx = m.latLngToContainerPoint(targetCenter);
        let anchorX: number;
        let anchorY: number;
        if (Math.abs(1 - scale) < 1e-4) {
          anchorX = newCenterPx.x;
          anchorY = newCenterPx.y;
        } else {
          anchorX = (oldCx - newCenterPx.x * scale) / (1 - scale);
          anchorY = (oldCy - newCenterPx.y * scale) / (1 - scale);
        }
        el.style.transformOrigin = `${anchorX}px ${anchorY}px`;
        el.style.transform = `scale(${scale})`;
      });

      map.on("zoomend", () => {
        const el = overlayRef.current;
        if (el) {
          el.style.transition = "none";
        }
        flushSync(() => setTick((t) => (t + 1) % 1_000_000));
        if (el) {
          el.style.transform = "";
          el.style.transformOrigin = "";
          // restore transition for next zoom; one rAF avoids the cleared transform
          // animating back to identity.
          requestAnimationFrame(() => {
            if (el) {
              el.style.transition = "";
              el.style.willChange = "";
            }
          });
        }
        zoomingRef.current = false;
      });

      // Initial fit-to-bounds across all points
      const points: [number, number][] = [
        [mealMap.location.latitude, mealMap.location.longitude],
        ...mealMap.ingredients.map(
          (i) =>
            [i.origin.latitude, i.origin.longitude] as [number, number],
        ),
      ];
      if (points.length > 1) {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [120, 120], animate: false });
      }

      setReady(true);
    })();

    return () => {
      cancelled = true;
      if (map) {
        map.remove();
      }
      mapRef.current = null;
      tileLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const layer = tileLayerRef.current;
    if (!layer) return;
    layer.setUrl(theme.tileUrl);
  }, [theme.tileUrl]);

  useEffect(() => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;
    const points: [number, number][] = [
      [mealMap.location.latitude, mealMap.location.longitude],
      ...mealMap.ingredients.map(
        (i) => [i.origin.latitude, i.origin.longitude] as [number, number],
      ),
    ];
    const bounds = L.latLngBounds(points);
    map.flyToBounds(bounds, {
      padding: [120, 120],
      duration: 0.9,
      maxZoom: 5,
    });
  }, [
    mealMap.location.latitude,
    mealMap.location.longitude,
    mealMap.id,
  ]);

  const map = mapRef.current;

  const destinationPx = map
    ? (map.latLngToContainerPoint([
        mealMap.location.latitude,
        mealMap.location.longitude,
      ]) as LeafletPoint)
    : null;

  const ingredientsPx = map
    ? mealMap.ingredients.map((ing) => ({
        ing,
        pt: map.latLngToContainerPoint([
          ing.origin.latitude,
          ing.origin.longitude,
        ]) as LeafletPoint,
      }))
    : [];

  return (
    <div className="absolute inset-0 bg-water">
      <div
        ref={containerRef}
        className="absolute inset-0"
        aria-label="Provenance map"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 65% 50% at 50% 50%, transparent 60%, var(--surface-shadow) 100%)",
        }}
      />
      {ready && destinationPx ? (
        <div
          ref={overlayRef}
          className="pointer-events-none absolute inset-0"
          style={{ transformOrigin: "0 0" }}
        >
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          aria-hidden
        >
          <defs>
            <radialGradient id="mmp-tile-dest-halo" cx="50%" cy="50%" r="50%">
              <stop
                offset="0%"
                stopColor="var(--primary)"
                stopOpacity="0.45"
              />
              <stop
                offset="55%"
                stopColor="var(--primary)"
                stopOpacity="0.1"
              />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </radialGradient>
            <radialGradient
              id="mmp-tile-origin-halo"
              cx="50%"
              cy="50%"
              r="50%"
            >
              <stop offset="0%" stopColor="var(--route)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="var(--route)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <g>
            {ingredientsPx.map(({ ing, pt }) => {
              const dx = pt.x - destinationPx.x;
              const dy = pt.y - destinationPx.y;
              const distance = Math.hypot(dx, dy);
              const lift = Math.min(220, 40 + distance * 0.3);
              const midX = (pt.x + destinationPx.x) / 2;
              const midY = Math.min(pt.y, destinationPx.y) - lift;
              const isActive = activeId === ing.id;
              const isDimmed = activeId !== null && !isActive;
              return (
                <path
                  key={ing.id}
                  d={`M ${pt.x} ${pt.y} Q ${midX} ${midY} ${destinationPx.x} ${destinationPx.y}`}
                  fill="none"
                  stroke="var(--route)"
                  strokeLinecap="round"
                  style={{
                    opacity: isDimmed
                      ? 0.1
                      : 0.45 +
                        ing.confidence * 0.4 +
                        (isActive ? 0.15 : 0),
                    strokeWidth:
                      1.4 + ing.probability * 1.6 + (isActive ? 1.2 : 0),
                    strokeDasharray: isActive ? "4 3" : undefined,
                    transition:
                      "opacity 300ms ease, stroke-width 300ms ease",
                  }}
                />
              );
            })}
          </g>

          <g>
            {ingredientsPx.map(({ ing, pt }) => {
              const isActive = activeId === ing.id;
              const isDimmed = activeId !== null && !isActive;
              return (
                <OriginMarker
                  key={ing.id}
                  ingredient={ing}
                  x={pt.x}
                  y={pt.y}
                  isActive={isActive}
                  isDimmed={isDimmed}
                  onSelect={onSelect}
                />
              );
            })}
          </g>

          <g transform={`translate(${destinationPx.x},${destinationPx.y})`}>
            <circle r="34" fill="url(#mmp-tile-dest-halo)" />
            <circle r="10" fill="var(--primary)" opacity="0.25">
              <animate
                attributeName="r"
                from="10"
                to="28"
                dur="2.6s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                from="0.4"
                to="0"
                dur="2.6s"
                repeatCount="indefinite"
              />
            </circle>
            <circle
              r="10"
              fill="var(--primary)"
              stroke="var(--card)"
              strokeWidth="2.5"
            />
            <circle r="3" fill="var(--primary-foreground)" />
            <g transform="translate(0,-22)" style={{ pointerEvents: "none" }}>
              <DestinationLabel label={mealMap.location.label.split(",")[0]} />
            </g>
          </g>
        </svg>
        </div>
      ) : null}
      <div className="pointer-events-auto absolute bottom-1 right-2 z-10 select-none text-[10px] text-muted-foreground opacity-70 [&_a]:underline-offset-2 [&_a:hover]:underline">
        <span
          dangerouslySetInnerHTML={{ __html: provider.attribution }}
        />
      </div>
    </div>
  );
}

function OriginMarker({
  ingredient,
  x,
  y,
  isActive,
  isDimmed,
  onSelect,
}: {
  ingredient: IngredientOrigin;
  x: number;
  y: number;
  isActive: boolean;
  isDimmed: boolean;
  onSelect: (id: string | null) => void;
}) {
  return (
    <g
      transform={`translate(${x},${y})`}
      style={{
        pointerEvents: "auto",
        cursor: "pointer",
        opacity: isDimmed ? 0.55 : 1,
        transition: "opacity 200ms ease",
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelect(isActive ? null : ingredient.id);
      }}
    >
      <title>{`${ingredient.ingredient} — ${ingredient.origin.label}`}</title>
      <circle r="18" fill="url(#mmp-tile-origin-halo)" />
      {isActive ? (
        <circle
          r="6"
          fill="none"
          stroke="var(--route)"
          strokeWidth="1.4"
          opacity="0.7"
        >
          <animate
            attributeName="r"
            from="6"
            to="20"
            dur="1.6s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            from="0.7"
            to="0"
            dur="1.6s"
            repeatCount="indefinite"
          />
        </circle>
      ) : null}
      <circle
        r={isActive ? 7 : 5.5}
        fill="var(--route)"
        stroke="var(--card)"
        strokeWidth="2"
        style={{ transition: "r 200ms ease" }}
      />
    </g>
  );
}

function DestinationLabel({ label }: { label: string }) {
  const charW = 7;
  const width = Math.max(80, label.length * charW + 18);
  return (
    <>
      <rect
        x={-width / 2}
        y={-11}
        width={width}
        height={20}
        rx={10}
        style={{
          fill: "var(--glass-strong)",
          stroke: "var(--border-strong)",
          strokeWidth: 1,
        }}
      />
      <text
        x="0"
        y="1"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="11"
        fontWeight="600"
        style={{
          fill: "var(--foreground)",
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </text>
    </>
  );
}
