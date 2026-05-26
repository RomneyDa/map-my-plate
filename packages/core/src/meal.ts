export type EvidenceSource =
  | "user"
  | "barcode"
  | "label"
  | "public-production-data"
  | "public-trade-flow"
  | "inference"
  | "crop-origin-context";

export const EVIDENCE_SOURCES: readonly EvidenceSource[] = [
  "user",
  "barcode",
  "label",
  "public-production-data",
  "public-trade-flow",
  "inference",
  "crop-origin-context",
] as const;

export type LocationPrecision =
  | "coordinate"
  | "city"
  | "region"
  | "country"
  | "store"
  | "restaurant"
  | "unknown";

export const LOCATION_PRECISIONS: readonly LocationPrecision[] = [
  "coordinate",
  "city",
  "region",
  "country",
  "store",
  "restaurant",
  "unknown",
] as const;

export type MealLocationSource =
  | "device"
  | "manual"
  | "account-default"
  | "store"
  | "restaurant"
  | "assistant";

export type GeoPoint = {
  label: string;
  countryCode?: string;
  latitude: number;
  longitude: number;
  precision: LocationPrecision;
};

export type IngredientOrigin = {
  id: string;
  ingredient: string;
  category: string;
  origin: GeoPoint;
  probability: number;
  confidence: number;
  source: EvidenceSource;
  rationale: string;
};

export type MealLocation = GeoPoint & {
  source: MealLocationSource;
};

export type MealMap = {
  id: string;
  title: string;
  description: string;
  location: MealLocation;
  ingredients: IngredientOrigin[];
};

export const sampleMealMap: MealMap = {
  id: "sample-chicken-burrito",
  title: "Chicken Burrito",
  description:
    "A first-pass provenance estimate for a supermarket chicken burrito in California.",
  location: {
    label: "San Francisco, California",
    countryCode: "US",
    latitude: 37.7749,
    longitude: -122.4194,
    precision: "city",
    source: "manual",
  },
  ingredients: [
    {
      id: "rice",
      ingredient: "Rice",
      category: "grain",
      origin: {
        label: "California Central Valley",
        countryCode: "US",
        latitude: 38.5816,
        longitude: -121.4944,
        precision: "region",
      },
      probability: 0.42,
      confidence: 0.46,
      source: "public-production-data",
      rationale:
        "California is a meaningful U.S. rice-producing region and is plausible for a California supermarket meal.",
    },
    {
      id: "black-beans",
      ingredient: "Black beans",
      category: "legume",
      origin: {
        label: "North Dakota",
        countryCode: "US",
        latitude: 47.5515,
        longitude: -101.002,
        precision: "region",
      },
      probability: 0.31,
      confidence: 0.38,
      source: "public-production-data",
      rationale:
        "Dry beans are commonly produced in northern U.S. states; this is a market prior, not package evidence.",
    },
    {
      id: "avocado",
      ingredient: "Avocado",
      category: "produce",
      origin: {
        label: "Michoacan, Mexico",
        countryCode: "MX",
        latitude: 19.5665,
        longitude: -101.7068,
        precision: "region",
      },
      probability: 0.68,
      confidence: 0.62,
      source: "public-trade-flow",
      rationale:
        "Avocados sold in the U.S. are frequently imported from Mexico, especially when no local label is provided.",
    },
    {
      id: "tomato",
      ingredient: "Tomato",
      category: "produce",
      origin: {
        label: "Sinaloa, Mexico",
        countryCode: "MX",
        latitude: 25.1721,
        longitude: -107.4795,
        precision: "region",
      },
      probability: 0.39,
      confidence: 0.41,
      source: "public-trade-flow",
      rationale:
        "A location-aware estimate based on common produce trade flows into the western United States.",
    },
    {
      id: "chicken",
      ingredient: "Chicken",
      category: "animal protein",
      origin: {
        label: "United States",
        countryCode: "US",
        latitude: 35.7596,
        longitude: -79.0193,
        precision: "country",
      },
      probability: 0.74,
      confidence: 0.52,
      source: "public-production-data",
      rationale:
        "Chicken in U.S. prepared foods is likely domestically sourced unless label evidence says otherwise.",
    },
  ],
};

export function summarizeConfidence(mealMap: MealMap): {
  averageConfidence: number;
  verifiedCount: number;
  inferredCount: number;
} {
  if (mealMap.ingredients.length === 0) {
    return { averageConfidence: 0, verifiedCount: 0, inferredCount: 0 };
  }
  const total = mealMap.ingredients.reduce(
    (sum, ingredient) => sum + ingredient.confidence,
    0,
  );
  const verifiedSources: EvidenceSource[] = ["barcode", "label", "user"];
  return {
    averageConfidence: total / mealMap.ingredients.length,
    verifiedCount: mealMap.ingredients.filter((ingredient) =>
      verifiedSources.includes(ingredient.source),
    ).length,
    inferredCount: mealMap.ingredients.filter(
      (ingredient) => !verifiedSources.includes(ingredient.source),
    ).length,
  };
}
