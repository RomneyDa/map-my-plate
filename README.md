# Map My Plate

AI-first food provenance maps for understanding where meals likely came from.

## Structure

- `app/` - Next.js web app, intended for Vercel deployment and fast prototyping.
- `packages/core/` - shared provenance models and logic intended to be reused by web, API, and future native mobile apps.
- `spec.md` - product specification.

## Development

```bash
pnpm install
pnpm dev
```

The web app runs from `app/`.

## Vercel

Create a Vercel project for the web app with:

- Framework Preset: `Next.js`
- Root Directory: `app`
- Build Command: `cd .. && pnpm build:app`
- Install Command: `cd .. && pnpm install`
- Output Directory: `.next`

This keeps Vercel pointed at the deployable app while still installing and building from the monorepo root so shared packages are available.

## Mobile Direction

The native mobile app should become a separate workspace later, likely under `mobile/`, using React Native or Expo. Shared types, provenance models, evidence merging, adapter clients, and map-state serialization should live in `packages/` so the web prototype and mobile app behave consistently.

## Design System

The app uses a shadcn-inspired Tailwind theme: semantic color tokens, class-based dark mode, utility-first layout, and small local components instead of a heavyweight component library. Prefer Tailwind utilities and the tokens in `app/app/styles.css` for all UI work.

## API Keys

The first prototype does not require API keys. It uses local sample data and a self-contained map canvas.

Expected future keys:

- `OPENAI_API_KEY` - chat, meal parsing, image understanding, clarification handling.
- `USDA_FDC_API_KEY` - FoodData Central ingredient lookup.
- `MAPTILER_API_KEY` or `MAPBOX_ACCESS_TOKEN` - production-grade hosted map tiles, if not self-hosting tiles.
- `GOOGLE_PLACES_API_KEY` or equivalent - store, restaurant, and place search.

Open Food Facts does not require an API key for basic public lookups.
