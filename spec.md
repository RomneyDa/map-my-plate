# Source My Food Product Specification

## Overview

Source My Food is an AI-first food provenance app that helps people understand where their meals likely came from. A user can describe what they are eating, scan a barcode, upload a package label, or take a photo of a meal. The app decomposes the food into likely ingredients, estimates where those ingredients likely originated or were sourced from, and turns that estimate into a beautiful, editable, shareable world map.

The app is explicit that most results are probabilistic. It should distinguish between verified evidence, user-provided corrections, public-data estimates, and AI inference. Users can refine a map conversationally: for example, "the avocado sticker says Mexico," "this was organic from Whole Foods," "the salmon package says wild Alaska," or "I made the tortilla myself." Each clarification updates the provenance model and the visual map.

## Product Goals

- Make food origin visible, understandable, and emotionally compelling.
- Start from natural user input: chat, meal photo, product photo, barcode, or ingredient list.
- Generate a provenance map for a meal or product without requiring the user to manually research every ingredient.
- Treat uncertain information honestly with confidence scores, source labels, and editable assumptions.
- Save every generated map as a persistent artifact that can be revisited, shared, duplicated, and updated later.
- Build on open and self-hostable data sources first, avoiding unnecessary dependency on proprietary supply-chain platforms.

## Non-Goals

- Do not claim exact farm-level provenance unless verified evidence exists.
- Do not present AI guesses as factual supply-chain records.
- Do not rebuild commodity, nutrition, barcode, or mapping infrastructure when reliable third-party data exists.
- Do not require brand or retailer integrations for the core consumer experience.
- Do not make sustainability scoring the primary product before provenance mapping works well.

## Core User Workflows

### 1. Describe a Meal

The user enters a natural prompt such as "I am eating a chicken burrito from a supermarket deli in California." The assistant identifies likely ingredients, asks clarifying questions only when they would materially improve the map, and generates a provenance estimate.

### 2. Upload a Meal Photo

The user takes a photo of a plate or packaged food. The app detects likely dishes and visible ingredients, then starts a chat thread where the user can confirm or correct the interpretation.

### 3. Scan a Barcode or Label

The user scans a barcode or uploads a package label. The app uses product databases and OCR to extract ingredient lists, certifications, manufacturing locations, product origin fields, and package images. This evidence gets higher confidence than generic AI inference.

### 4. Clarify and Correct

The user can refine the map conversationally:

- "The tomatoes are from Mexico."
- "I bought this at Trader Joe's."
- "It was organic."
- "The package says made in Italy."
- "Remove cilantro."
- "The beef was grass-fed from Oregon."

The app updates ingredient origins, confidence scores, map annotations, and the evidence history.

### 5. Save, Share, and Edit Later

Every provenance map is saved with its source conversation, evidence graph, assumptions, generated visual state, and share settings. A shared map can be viewed as a polished artifact. The owner can reopen it later and continue the same AI conversation to update it.

### 6. Use and Update Location

The app should ask for location permission when location would materially improve sourcing estimates. If granted, the app dynamically loads the user's current location and uses it as the default market context for provenance modeling. The user should be able to view, edit, remove, or temporarily override this location at any time.

Location should support multiple levels of precision:

- Current device location
- User-selected city, state, region, or country
- Store, restaurant, market, or purchase location
- Account-level default location
- Per-meal override location

The app should explain why location matters: the same avocado, salmon, rice, or tomato can have very different likely origins depending on where the user bought or ate it.

## Core Concepts

### Meal

A user-created food event. A meal can contain one dish, many dishes, packaged products, or manually entered ingredients.

### Ingredient

A normalized food component in a meal. Ingredients may be directly observed, extracted from package data, inferred from a dish, or manually added.

### Origin Estimate

A probabilistic guess about where an ingredient likely came from. An estimate can include country, region, state, city, farm, processing location, route, confidence score, and source rationale.

### Evidence

Any information used to support or override an estimate. Evidence can come from barcode data, label OCR, user statements, public agriculture data, trade-flow data, crop-origin datasets, retailer priors, or AI inference.

### Provenance Map

The saved visual artifact. It contains map geometry, ingredient layers, confidence styling, labels, paths, sources, notes, and share metadata.

### User Location

The user's market context for estimating likely sourcing. Location can come from device permission, account settings, manual entry, store metadata, restaurant metadata, receipt data, or per-meal overrides.

## Experience Principles

- The first screen should be the working chat and map experience, not a marketing page.
- The map should feel like the primary artifact, not a decorative companion to text.
- The app should show uncertainty visually: probability bands, source badges, confidence opacity, and "known vs likely" labels.
- The user should be able to inspect why an origin was chosen.
- Manual editing should exist, but the main editing mode should remain conversational.
- Saved maps should feel worth sharing: clean, visually rich, and understandable without reading the full chat.
- Location should feel trustworthy and user-controlled. The app should ask for permission clearly, degrade gracefully when permission is denied, and make manual location updates easy.

## Data Architecture

The app should store provenance as an evidence graph rather than only storing rendered map pins.

Recommended model:

- `User`
- `Meal`
- `Conversation`
- `Message`
- `Ingredient`
- `Product`
- `Evidence`
- `OriginEstimate`
- `UserLocation`
- `MealLocation`
- `MapArtifact`
- `ShareLink`

Each `OriginEstimate` should reference one or more `Evidence` records and should include:

- Ingredient ID
- Location type: country, region, coordinate, facility, farm, processing site, or unknown
- Location value and geometry
- Confidence score
- Estimate method
- Source adapter
- Human-readable rationale
- Created and superseded timestamps

Each `UserLocation` or `MealLocation` should include:

- Location source: device permission, manual entry, account default, store, restaurant, receipt, or imported metadata
- Precision level: coordinate, city, region, country, store, or unknown
- User-facing label
- Latitude and longitude when available
- Administrative geography
- Confidence or verification status
- Privacy and sharing visibility
- Created and updated timestamps

## Adapter Strategy

Adapters should be isolated behind a common interface so the provenance engine can combine free, self-hosted, open-data, and commercial sources without hard-coding business logic to one provider.

Each adapter should expose:

- Search or lookup capabilities
- Source metadata and license metadata
- Confidence hints
- Attribution requirements
- Raw response storage policy
- Normalized entities produced by the adapter

## Priority 1: Free or Self-Hostable Adapters

### Open Food Facts Adapter

Purpose:

- Barcode lookup
- Packaged-product metadata
- Ingredient lists
- Product images
- Labels and certifications
- Manufacturing or processing locations when available
- Countries where sold
- Product and ingredient origin fields when available

Why it matters:

Open Food Facts is the best initial source for packaged foods and barcode workflows. It prevents the app from rebuilding product lookup, ingredient extraction, and barcode infrastructure.

Constraints:

- Data quality is uneven because it is community-contributed.
- Origin fields are often missing.
- The database is under ODbL, so attribution and share-alike implications must be handled deliberately.

### USDA FoodData Central Adapter

Purpose:

- Normalize generic ingredients and foods.
- Match user-described ingredients to canonical food entities.
- Support nutrition and food-category metadata.
- Help bridge free-text meal descriptions to structured ingredients.

Why it matters:

Open Food Facts is strong for packaged products. USDA FoodData Central is stronger for generic foods like rice, chicken, tomatoes, lentils, milk, and bananas.

Constraints:

- It is not a provenance database.
- It is U.S.-centered and primarily food-composition oriented.

### CIAT / Alliance Bioversity Crop Origins Adapter

Purpose:

- Provide historical or domestication-origin context for crop ingredients.
- Add an educational layer distinct from modern sourcing.

Why it matters:

This makes maps richer and helps users understand the difference between where a crop originally comes from and where their food was likely produced today.

Constraints:

- It covers crop origins, not current supply chains.
- It is not useful for animal products, processed additives, or farm-level sourcing.

### FAOSTAT Adapter

Purpose:

- Use agricultural production data to estimate likely producing countries or regions for commodity ingredients.
- Build priors for crops, livestock products, and food categories.

Why it matters:

FAOSTAT is a foundation for probabilistic sourcing. It helps answer "which countries produce this ingredient at meaningful scale?"

Constraints:

- Production data does not prove the user's specific food came from a place.
- Commodity matching will require careful normalization.

### UN Comtrade Adapter

Purpose:

- Use import and export flows to estimate likely supply origins for a user's country or region.
- Improve estimates for foods commonly imported into the user's market.

Why it matters:

For many ingredients, production data alone is not enough. Trade-flow data helps estimate what a U.S. shopper is likely eating versus what the world produces overall.

Constraints:

- Commodity-code mapping is complex.
- Trade data may lag behind current retail conditions.
- Results should be modeled as priors, not facts.

### Natural Earth Adapter

Purpose:

- Provide country and region geometries for custom map rendering, export, and static share images.

Why it matters:

Natural Earth is public-domain and useful for beautiful, controlled map visuals without depending on a hosted map provider for every rendered artifact.

Constraints:

- It is cartographic geometry, not live map infrastructure.

### MapLibre Renderer

Purpose:

- Render interactive maps on web and mobile using open-source map tooling.
- Display ingredient pins, arcs, uncertainty regions, route lines, source badges, and saved map styles.

Why it matters:

MapLibre avoids early lock-in to a proprietary map SDK while still supporting high-quality interactive maps.

Constraints:

- The app still needs a tile strategy: hosted tiles, self-hosted tiles, or static Natural Earth renders for some contexts.

### User Evidence Adapter

Purpose:

- Treat user corrections and statements as first-class evidence.
- Preserve provenance for manual overrides and conversational clarifications.
- Preserve user-provided location context such as store, restaurant, city, country, or travel location.

Why it matters:

The user often has better information than public datasets. A package label, sticker, receipt, farmer's market sign, or personal memory should be able to override generic priors.

Constraints:

- User evidence should be trusted as user-provided, not externally verified.

### Geolocation and Places Adapter

Purpose:

- Request browser or mobile location permission.
- Resolve current coordinates into city, region, country, and market context.
- Let users search for and select stores, restaurants, markets, cities, or countries.
- Convert purchase or meal locations into provenance priors.

Why it matters:

Modern sourcing estimates are market-dependent. Location lets the app estimate what a user in Los Angeles, London, Tokyo, or Mexico City is likely eating, rather than relying on global production averages.

Constraints:

- Exact device location should be optional.
- The app should support manual location entry for users who deny permission.
- Location precision should be minimized when exact coordinates are not needed.
- Location data should not be exposed on shared maps unless the user explicitly chooses to include it.

## Priority 2: Optional Free or Open Environmental Adapters

### Agribalyse / Eco-Score Adapter

Purpose:

- Add environmental impact overlays such as carbon, land use, water impacts, packaging, and transport assumptions.

Why it matters:

After provenance mapping works, impact layers can make the product more useful for sustainability-minded users.

Constraints:

- Agribalyse is France/EU-centered.
- Life-cycle assessment data should not be mixed into provenance confidence without clear labeling.
- Some downstream datasets may have licensing or dependency constraints that require review.

## Priority 3: Paid or Partnership Adapters

### HowGood / Latis Adapter

Purpose:

- Add high-quality ingredient sustainability intelligence, emission factors, and sourcing-location heuristics if commercial access is available.

Why it matters:

This could save years of sustainability data modeling and improve enterprise or premium features.

Constraints:

- Likely requires a paid commercial relationship.
- The app should not depend on it for the core consumer MVP.

### Sourcemap Adapter

Purpose:

- Import or link verified supplier-chain maps for brands, restaurants, or producers that have real supply-chain records.

Why it matters:

This can support a future verified provenance tier where participating producers provide real supply-chain evidence instead of relying on probabilistic estimates.

Constraints:

- Enterprise-oriented.
- Best suited for partner data, not arbitrary consumer meals.

### Brand, Retailer, and Restaurant Adapters

Purpose:

- Add verified supply-chain records, receipt data, product metadata, seasonal sourcing rules, and private-label sourcing information.

Why it matters:

Retailer and restaurant partnerships could dramatically improve confidence for specific foods.

Constraints:

- Partnership-heavy.
- Should be follow-up work after the open-data provenance engine proves value.

## AI Responsibilities

The AI system should:

- Parse user descriptions into likely dishes and ingredients.
- Interpret meal photos, product photos, and labels.
- Ask targeted clarifying questions when needed.
- Explain assumptions in plain language.
- Convert user corrections into structured evidence.
- Choose when to use adapters and how to merge their outputs.
- Generate map summaries and share text.

The AI system should not:

- Invent exact farms, suppliers, or facilities without evidence.
- Hide uncertainty.
- Override verified user or label evidence with generic priors.
- Treat historical crop origin as modern supply origin.

## Confidence and Source Labeling

Every visible origin should have a source label:

- Verified label or barcode data
- User-provided
- Public production data
- Public trade-flow estimate
- Historical crop-origin context
- AI-inferred ingredient
- AI-inferred sourcing prior

Confidence should be shown in both text and visuals. Low-confidence estimates should still be useful, but they should look and read differently from verified data.

## MVP Scope

The MVP should support:

- Chat-first meal entry
- Manual ingredient confirmation
- Barcode lookup through Open Food Facts
- Generic ingredient normalization through USDA FoodData Central
- Initial probabilistic country-level origin estimates using FAOSTAT and UN Comtrade
- Permission-based current-location detection
- Manual location search and per-meal location overrides
- Location-aware sourcing priors based on the user's market
- Historical crop-origin layer for supported crops
- Interactive MapLibre map
- Saved map artifacts
- Shareable read-only map links
- Conversational edits after saving
- Clear confidence and evidence labels

## Later Scope

- Meal photo recognition
- Label OCR
- Receipt parsing
- Retailer-specific priors
- Store and restaurant place lookup
- Travel mode for meals eaten away from the user's default location
- Multiple saved user locations
- More precise region-level and seasonal sourcing models
- Organic and certification-aware priors
- Environmental impact layers
- Verified producer profiles
- Brand and restaurant partner portals
- Sourcemap or other verified supply-chain imports
- HowGood or similar paid sustainability-data integration
- Mobile apps with barcode scanning and camera-first capture

## Open Questions

- What is the right default geography for a user: current location, account location, store location, restaurant location, or user-selected market?
- How should the app balance exact location usefulness with privacy-preserving coarse market context?
- When should the app ask for location permission: onboarding, first map generation, barcode scan, or only when a low-confidence estimate would improve?
- How much of the Open Food Facts-derived data can be cached or remixed without triggering unwanted share-alike obligations for proprietary app data?
- Should shared maps expose raw evidence, summarized evidence, or both?
- How should the app represent multi-origin commodities such as flour, sugar, oils, spices, and generic additives?
- How should restaurant meals be modeled when there is no package, barcode, or label?
- What is the right product tone: educational atlas, personal food diary, sustainability tool, or magical AI mapmaker?

## Initial Technical Direction

Start with a web app and server-side provenance engine.

Suggested first implementation layers:

- API layer for conversations, meals, ingredients, maps, and share links
- Adapter layer for external data sources
- Provenance engine that merges evidence into origin estimates
- Location service for permission-based detection, manual overrides, geocoding, and market context
- Map renderer using MapLibre and stored map state
- Persistence layer for evidence graphs and saved artifacts
- Background jobs for slow data lookups and map artifact generation

The first prototype should prove the core loop:

1. User describes or scans food.
2. App identifies ingredients.
3. App estimates likely origins with source labels.
4. App renders a beautiful map.
5. User corrects one assumption.
6. App updates and saves the map.
