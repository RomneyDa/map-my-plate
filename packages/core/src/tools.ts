import { z } from "zod";
import {
  EVIDENCE_SOURCES,
  LOCATION_PRECISIONS,
  type EvidenceSource,
  type IngredientOrigin,
  type LocationPrecision,
  type MealMap,
} from "./meal";

// Caps keep model output bounded and prevent runaway text-as-injection.
const MAX_SHORT_TEXT = 280;
const MAX_LONG_TEXT = 600;
const MAX_ID_LEN = 64;
const MAX_LABEL_LEN = 120;
const MAX_OPTIONS = 6;

const idSchema = z
  .string()
  .min(1)
  .max(MAX_ID_LEN)
  .regex(/^[a-z0-9][a-z0-9-]*$/i, "id must be alphanumeric or hyphens");

const sourceSchema = z.enum(EVIDENCE_SOURCES as readonly [
  EvidenceSource,
  ...EvidenceSource[],
]);

const precisionSchema = z.enum(LOCATION_PRECISIONS as readonly [
  LocationPrecision,
  ...LocationPrecision[],
]);

const probabilitySchema = z.number().min(0).max(1);
const latitudeSchema = z.number().min(-90).max(90);
const longitudeSchema = z.number().min(-180).max(180);
const countryCodeSchema = z
  .string()
  .regex(/^[A-Z]{2}$/u, "ISO 3166-1 alpha-2 (e.g. US, MX)")
  .optional();

const setMealTitleInput = z.object({
  title: z.string().min(1).max(MAX_LABEL_LEN),
});

const setMealDescriptionInput = z.object({
  description: z.string().min(1).max(MAX_LONG_TEXT),
});

const setMealLocationInput = z.object({
  label: z.string().min(1).max(MAX_LABEL_LEN),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  precision: precisionSchema,
  countryCode: countryCodeSchema,
});

const addIngredientInput = z.object({
  id: idSchema,
  name: z.string().min(1).max(MAX_LABEL_LEN),
  category: z.string().min(1).max(MAX_LABEL_LEN),
  originLabel: z.string().min(1).max(MAX_LABEL_LEN),
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  precision: precisionSchema,
  countryCode: countryCodeSchema,
  probability: probabilitySchema,
  confidence: probabilitySchema,
  source: sourceSchema,
  rationale: z.string().min(1).max(MAX_SHORT_TEXT),
});

const updateIngredientInput = z.object({
  id: idSchema,
  name: z.string().min(1).max(MAX_LABEL_LEN).optional(),
  category: z.string().min(1).max(MAX_LABEL_LEN).optional(),
  originLabel: z.string().min(1).max(MAX_LABEL_LEN).optional(),
  latitude: latitudeSchema.optional(),
  longitude: longitudeSchema.optional(),
  precision: precisionSchema.optional(),
  countryCode: countryCodeSchema,
  probability: probabilitySchema.optional(),
  confidence: probabilitySchema.optional(),
  source: sourceSchema.optional(),
  rationale: z.string().min(1).max(MAX_SHORT_TEXT).optional(),
});

const removeIngredientInput = z.object({ id: idSchema });

const askClarificationInput = z.object({
  question: z.string().min(1).max(MAX_SHORT_TEXT),
  options: z
    .array(
      z.object({
        label: z.string().min(1).max(MAX_LABEL_LEN),
        value: z.string().min(1).max(MAX_LABEL_LEN),
      }),
    )
    .min(2)
    .max(MAX_OPTIONS),
});

const explainPlanInput = z.object({
  text: z.string().min(1).max(MAX_LONG_TEXT),
});

const explainOriginInput = z.object({
  ingredientId: idSchema,
  text: z.string().min(1).max(MAX_LONG_TEXT),
});

const summarizeChangesInput = z.object({
  text: z.string().min(1).max(MAX_LONG_TEXT),
});

const doneInput = z.object({}).strict();

export const toolInputSchemas = {
  setMealTitle: setMealTitleInput,
  setMealDescription: setMealDescriptionInput,
  setMealLocation: setMealLocationInput,
  addIngredient: addIngredientInput,
  updateIngredient: updateIngredientInput,
  removeIngredient: removeIngredientInput,
  askClarification: askClarificationInput,
  explainPlan: explainPlanInput,
  explainOrigin: explainOriginInput,
  summarizeChanges: summarizeChangesInput,
  done: doneInput,
} as const;

export type ToolName = keyof typeof toolInputSchemas;

export const TOOL_NAMES: readonly ToolName[] = Object.keys(
  toolInputSchemas,
) as ToolName[];

export type ToolInput<N extends ToolName> = z.infer<
  (typeof toolInputSchemas)[N]
>;

export type ValidatedToolCall =
  | { name: "setMealTitle"; input: ToolInput<"setMealTitle"> }
  | { name: "setMealDescription"; input: ToolInput<"setMealDescription"> }
  | { name: "setMealLocation"; input: ToolInput<"setMealLocation"> }
  | { name: "addIngredient"; input: ToolInput<"addIngredient"> }
  | { name: "updateIngredient"; input: ToolInput<"updateIngredient"> }
  | { name: "removeIngredient"; input: ToolInput<"removeIngredient"> }
  | { name: "askClarification"; input: ToolInput<"askClarification"> }
  | { name: "explainPlan"; input: ToolInput<"explainPlan"> }
  | { name: "explainOrigin"; input: ToolInput<"explainOrigin"> }
  | { name: "summarizeChanges"; input: ToolInput<"summarizeChanges"> }
  | { name: "done"; input: ToolInput<"done"> };

/**
 * JSON Schemas advertised to the model. Hand-written so the descriptions are
 * tuned for Claude; Zod above is the authoritative runtime validator.
 */
export type ToolDefinition = {
  name: ToolName;
  description: string;
  input_schema: {
    type: "object";
    additionalProperties?: boolean;
    required?: string[];
    properties?: Record<string, unknown>;
  };
};

const sourceEnum = [...EVIDENCE_SOURCES];
const precisionEnum = [...LOCATION_PRECISIONS];

const geoFields = {
  latitude: {
    type: "number",
    minimum: -90,
    maximum: 90,
    description: "Latitude in decimal degrees.",
  },
  longitude: {
    type: "number",
    minimum: -180,
    maximum: 180,
    description: "Longitude in decimal degrees.",
  },
  precision: {
    type: "string",
    enum: precisionEnum,
    description:
      "How specific the location is. Pick the loosest level the evidence supports.",
  },
  countryCode: {
    type: "string",
    pattern: "^[A-Z]{2}$",
    description: "ISO 3166-1 alpha-2 country code, e.g. US, MX, JP.",
  },
} as const;

export const toolDefinitions: ToolDefinition[] = [
  {
    name: "setMealTitle",
    description: "Set the user-facing title of the meal (e.g. 'Chicken Burrito').",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["title"],
      properties: {
        title: { type: "string", maxLength: MAX_LABEL_LEN },
      },
    },
  },
  {
    name: "setMealDescription",
    description: "Set a one-sentence description of what the meal is.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["description"],
      properties: {
        description: { type: "string", maxLength: MAX_LONG_TEXT },
      },
    },
  },
  {
    name: "setMealLocation",
    description:
      "Set the destination — where the user is eating or purchased the meal. Use only when you have concrete location evidence (mentioned in user message, store name, address).",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["label", "latitude", "longitude", "precision"],
      properties: {
        label: {
          type: "string",
          maxLength: MAX_LABEL_LEN,
          description: "Human-readable label, e.g. 'Brooklyn, New York'.",
        },
        ...geoFields,
      },
    },
  },
  {
    name: "addIngredient",
    description:
      "Add an ingredient with its likely origin to the meal. Use a short kebab-case id (e.g. 'rice', 'black-beans'). Probability is the chance THIS origin is correct (0-1); confidence is how strong the supporting evidence is (0-1). Always provide a one-sentence rationale.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "id",
        "name",
        "category",
        "originLabel",
        "latitude",
        "longitude",
        "precision",
        "probability",
        "confidence",
        "source",
        "rationale",
      ],
      properties: {
        id: {
          type: "string",
          pattern: "^[a-z0-9][a-z0-9-]*$",
          maxLength: MAX_ID_LEN,
          description: "Stable short id, lowercase, kebab-case.",
        },
        name: { type: "string", maxLength: MAX_LABEL_LEN },
        category: {
          type: "string",
          maxLength: MAX_LABEL_LEN,
          description:
            "Short category like 'grain', 'legume', 'produce', 'animal protein', 'spice', 'oil'.",
        },
        originLabel: {
          type: "string",
          maxLength: MAX_LABEL_LEN,
          description: "Human-readable origin, e.g. 'Sinaloa, Mexico'.",
        },
        ...geoFields,
        probability: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description:
            "How likely THIS origin is, given the available evidence. 0.4 means roughly 4-in-10.",
        },
        confidence: {
          type: "number",
          minimum: 0,
          maximum: 1,
          description:
            "How strong the supporting evidence is. Low confidence = market prior; high = barcode/label/user-confirmed.",
        },
        source: {
          type: "string",
          enum: sourceEnum,
          description: "Where the evidence came from.",
        },
        rationale: {
          type: "string",
          maxLength: MAX_SHORT_TEXT,
          description: "One sentence explaining the origin choice.",
        },
      },
    },
  },
  {
    name: "updateIngredient",
    description:
      "Update fields on an existing ingredient. Use when refining an origin in response to user evidence ('the avocado sticker says Peru'). Only include the fields you are changing; omit the rest.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["id"],
      properties: {
        id: { type: "string", maxLength: MAX_ID_LEN },
        name: { type: "string", maxLength: MAX_LABEL_LEN },
        category: { type: "string", maxLength: MAX_LABEL_LEN },
        originLabel: { type: "string", maxLength: MAX_LABEL_LEN },
        ...geoFields,
        probability: { type: "number", minimum: 0, maximum: 1 },
        confidence: { type: "number", minimum: 0, maximum: 1 },
        source: { type: "string", enum: sourceEnum },
        rationale: { type: "string", maxLength: MAX_SHORT_TEXT },
      },
    },
  },
  {
    name: "removeIngredient",
    description:
      "Remove an ingredient from the meal by id. Use when the user says they didn't have it.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["id"],
      properties: {
        id: { type: "string", maxLength: MAX_ID_LEN },
      },
    },
  },
  {
    name: "askClarification",
    description:
      "Ask the user a bounded clarifying question that would materially improve the map. Provide 2-6 mutually exclusive options. Do not use for open-ended chat.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["question", "options"],
      properties: {
        question: { type: "string", maxLength: MAX_SHORT_TEXT },
        options: {
          type: "array",
          minItems: 2,
          maxItems: MAX_OPTIONS,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["label", "value"],
            properties: {
              label: { type: "string", maxLength: MAX_LABEL_LEN },
              value: { type: "string", maxLength: MAX_LABEL_LEN },
            },
          },
        },
      },
    },
  },
  {
    name: "explainPlan",
    description:
      "Briefly tell the user what you are about to do this turn (one short paragraph). Use once per turn, before mutations.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["text"],
      properties: {
        text: { type: "string", maxLength: MAX_LONG_TEXT },
      },
    },
  },
  {
    name: "explainOrigin",
    description:
      "Explain in plain language why a specific ingredient's likely origin was chosen. Reference real-world reasons (production data, trade flows, label evidence).",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["ingredientId", "text"],
      properties: {
        ingredientId: { type: "string", maxLength: MAX_ID_LEN },
        text: { type: "string", maxLength: MAX_LONG_TEXT },
      },
    },
  },
  {
    name: "summarizeChanges",
    description:
      "End-of-turn summary of what changed and why (one short paragraph). Use once per turn, after mutations.",
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["text"],
      properties: {
        text: { type: "string", maxLength: MAX_LONG_TEXT },
      },
    },
  },
  {
    name: "done",
    description:
      "Signal the end of this turn. Always call exactly once, after every other tool you need to call.",
    input_schema: { type: "object", additionalProperties: false, properties: {} },
  },
];

export type ToolValidationResult =
  | { ok: true; call: ValidatedToolCall }
  | { ok: false; error: string };

export function validateToolCall(
  name: string,
  rawInput: unknown,
): ToolValidationResult {
  if (!(name in toolInputSchemas)) {
    return { ok: false, error: `Unknown tool: ${name}` };
  }
  const schema = toolInputSchemas[name as ToolName];
  const parsed = schema.safeParse(rawInput);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .slice(0, 3)
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    return { ok: false, error: `Invalid arguments — ${issues}` };
  }
  return {
    ok: true,
    call: { name, input: parsed.data } as ValidatedToolCall,
  };
}

export type ApplyOutcome =
  | { ok: true; mealMap: MealMap; effect: ToolEffect }
  | { ok: false; error: string };

export type ToolEffect =
  | { kind: "state-changed"; summary: string }
  | { kind: "explanation"; channel: "plan" | "origin" | "summary"; text: string; ingredientId?: string }
  | { kind: "clarification"; question: string; options: { label: string; value: string }[] }
  | { kind: "none" };

/**
 * Apply a validated tool call to the meal map. Pure — returns a new map and an
 * effect describing what the UI should render.
 */
export function applyToolCall(
  mealMap: MealMap,
  call: ValidatedToolCall,
): ApplyOutcome {
  switch (call.name) {
    case "setMealTitle":
      return {
        ok: true,
        mealMap: { ...mealMap, title: call.input.title },
        effect: { kind: "state-changed", summary: `Title set to ${call.input.title}` },
      };
    case "setMealDescription":
      return {
        ok: true,
        mealMap: { ...mealMap, description: call.input.description },
        effect: { kind: "state-changed", summary: "Description updated" },
      };
    case "setMealLocation":
      return {
        ok: true,
        mealMap: {
          ...mealMap,
          location: {
            label: call.input.label,
            latitude: call.input.latitude,
            longitude: call.input.longitude,
            precision: call.input.precision,
            countryCode: call.input.countryCode,
            source: "assistant",
          },
        },
        effect: { kind: "state-changed", summary: `Location → ${call.input.label}` },
      };
    case "addIngredient": {
      if (mealMap.ingredients.some((i) => i.id === call.input.id)) {
        return {
          ok: false,
          error: `Ingredient id '${call.input.id}' already exists. Use updateIngredient.`,
        };
      }
      const ingredient: IngredientOrigin = {
        id: call.input.id,
        ingredient: call.input.name,
        category: call.input.category,
        origin: {
          label: call.input.originLabel,
          latitude: call.input.latitude,
          longitude: call.input.longitude,
          precision: call.input.precision,
          countryCode: call.input.countryCode,
        },
        probability: call.input.probability,
        confidence: call.input.confidence,
        source: call.input.source,
        rationale: call.input.rationale,
      };
      return {
        ok: true,
        mealMap: {
          ...mealMap,
          ingredients: [...mealMap.ingredients, ingredient],
        },
        effect: {
          kind: "state-changed",
          summary: `Added ${ingredient.ingredient} (${Math.round(
            ingredient.probability * 100,
          )}% — ${ingredient.origin.label})`,
        },
      };
    }
    case "updateIngredient": {
      const existing = mealMap.ingredients.find(
        (i) => i.id === call.input.id,
      );
      if (!existing) {
        return {
          ok: false,
          error: `No ingredient with id '${call.input.id}'. Use addIngredient.`,
        };
      }
      const updatedOrigin: typeof existing.origin = {
        label: call.input.originLabel ?? existing.origin.label,
        latitude: call.input.latitude ?? existing.origin.latitude,
        longitude: call.input.longitude ?? existing.origin.longitude,
        precision: call.input.precision ?? existing.origin.precision,
        countryCode:
          call.input.countryCode ?? existing.origin.countryCode,
      };
      const updated: IngredientOrigin = {
        ...existing,
        ingredient: call.input.name ?? existing.ingredient,
        category: call.input.category ?? existing.category,
        origin: updatedOrigin,
        probability: call.input.probability ?? existing.probability,
        confidence: call.input.confidence ?? existing.confidence,
        source: call.input.source ?? existing.source,
        rationale: call.input.rationale ?? existing.rationale,
      };
      return {
        ok: true,
        mealMap: {
          ...mealMap,
          ingredients: mealMap.ingredients.map((i) =>
            i.id === updated.id ? updated : i,
          ),
        },
        effect: {
          kind: "state-changed",
          summary: `Updated ${updated.ingredient}`,
        },
      };
    }
    case "removeIngredient": {
      if (!mealMap.ingredients.some((i) => i.id === call.input.id)) {
        return {
          ok: false,
          error: `No ingredient with id '${call.input.id}'.`,
        };
      }
      return {
        ok: true,
        mealMap: {
          ...mealMap,
          ingredients: mealMap.ingredients.filter(
            (i) => i.id !== call.input.id,
          ),
        },
        effect: {
          kind: "state-changed",
          summary: `Removed ${call.input.id}`,
        },
      };
    }
    case "askClarification":
      return {
        ok: true,
        mealMap,
        effect: {
          kind: "clarification",
          question: call.input.question,
          options: call.input.options,
        },
      };
    case "explainPlan":
      return {
        ok: true,
        mealMap,
        effect: { kind: "explanation", channel: "plan", text: call.input.text },
      };
    case "explainOrigin":
      return {
        ok: true,
        mealMap,
        effect: {
          kind: "explanation",
          channel: "origin",
          text: call.input.text,
          ingredientId: call.input.ingredientId,
        },
      };
    case "summarizeChanges":
      return {
        ok: true,
        mealMap,
        effect: {
          kind: "explanation",
          channel: "summary",
          text: call.input.text,
        },
      };
    case "done":
      return { ok: true, mealMap, effect: { kind: "none" } };
  }
}
