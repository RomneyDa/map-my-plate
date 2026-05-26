import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  SYSTEM_PROMPT,
  applyToolCall,
  renderMealMapForModel,
  toolDefinitions,
  validateToolCall,
  type MealMap,
  type ToolEffect,
  type ValidatedToolCall,
} from "@map-my-plate/core";

export const runtime = "nodejs";

const MAX_TOOL_CALLS_PER_TURN = 24;
const MAX_USER_MESSAGE_CHARS = 4000;
const MAX_HISTORY_MESSAGES = 60;

const userTurnSchema = z.object({
  message: z.string().min(1).max(MAX_USER_MESSAGE_CHARS),
  mealMap: z.unknown(),
  history: z
    .array(z.unknown())
    .max(MAX_HISTORY_MESSAGES)
    .optional(),
});

export type AssistantTurnEvent =
  | { type: "tool"; name: string; effect: ToolEffect }
  | { type: "error"; message: string };

export type ChatResponse = {
  mealMap: MealMap;
  events: AssistantTurnEvent[];
  history: Anthropic.MessageParam[];
  callCount: number;
  budgetExhausted: boolean;
};

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let parsed: z.infer<typeof userTurnSchema>;
  try {
    const body = await request.json();
    parsed = userTurnSchema.parse(body);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Invalid request" },
      { status: 400 },
    );
  }

  let mealMap = parsed.mealMap as MealMap;

  // Build the message array. The system prompt is cached; the meal-map
  // snapshot is injected as an ordinary user turn so updates don't churn
  // the prefix cache. The user's typed message is appended at the end.
  const history = (parsed.history ?? []) as Anthropic.MessageParam[];
  const messages: Anthropic.MessageParam[] = [
    ...history,
    {
      role: "user",
      content: [
        {
          type: "text",
          text:
            "Current meal map state (read-only snapshot — do not echo back):\n" +
            renderMealMapForModel(mealMap),
        },
      ],
    },
    {
      role: "user",
      content: [{ type: "text", text: parsed.message }],
    },
  ];

  const client = new Anthropic({ apiKey });
  const events: AssistantTurnEvent[] = [];
  let callCount = 0;
  let budgetExhausted = false;
  let sawDone = false;

  // Tool loop. tool_choice "any" forces a tool every turn — no free text.
  while (!sawDone && callCount < MAX_TOOL_CALLS_PER_TURN) {
    let response: Anthropic.Message;
    try {
      response = await client.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 4096,
        thinking: { type: "adaptive" },
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        tools: toolDefinitions,
        tool_choice: { type: "any" },
        messages,
      });
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        return Response.json(
          { error: `Upstream error (${error.status}): ${error.message}` },
          { status: 502 },
        );
      }
      throw error;
    }

    // Append the assistant turn verbatim — preserves tool_use IDs for the
    // tool_result reply.
    messages.push({ role: "assistant", content: response.content });

    const toolUses = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );

    // Silently drop any text the model produced (security: text-only output
    // is the injection surface we explicitly disallow).
    if (toolUses.length === 0) {
      events.push({
        type: "error",
        message: "Model returned no tool calls; ending turn.",
      });
      break;
    }

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of toolUses) {
      callCount++;
      if (callCount > MAX_TOOL_CALLS_PER_TURN) {
        budgetExhausted = true;
        break;
      }

      const validation = validateToolCall(block.name, block.input);
      if (!validation.ok) {
        events.push({ type: "error", message: validation.error });
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          is_error: true,
          content: validation.error,
        });
        continue;
      }

      const call: ValidatedToolCall = validation.call;
      const outcome = applyToolCall(mealMap, call);

      if (!outcome.ok) {
        events.push({ type: "error", message: outcome.error });
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          is_error: true,
          content: outcome.error,
        });
        continue;
      }

      mealMap = outcome.mealMap;
      events.push({ type: "tool", name: call.name, effect: outcome.effect });

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: "ok",
      });

      if (call.name === "done") {
        sawDone = true;
      }
    }

    if (toolResults.length > 0) {
      messages.push({ role: "user", content: toolResults });
    }

    if (sawDone || budgetExhausted) break;
    if (response.stop_reason === "end_turn") break;
  }

  if (callCount >= MAX_TOOL_CALLS_PER_TURN && !sawDone) {
    budgetExhausted = true;
    events.push({
      type: "error",
      message: "Tool budget exhausted for this turn.",
    });
  }

  // Hand back the updated messages array so the client can keep history.
  // The snapshot/user-message pair we synthesized at the top of this turn
  // is intentionally preserved — it's the only honest record of what the
  // model actually saw.
  const responsePayload: ChatResponse = {
    mealMap,
    events,
    history: messages,
    callCount,
    budgetExhausted,
  };

  return Response.json(responsePayload);
}
