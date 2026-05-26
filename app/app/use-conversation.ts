"use client";

import { useCallback, useState } from "react";
import type { MealMap } from "@map-my-plate/core";

export type AssistantExplanation = {
  kind: "explanation";
  channel: "plan" | "origin" | "summary";
  text: string;
  ingredientId?: string;
};

export type AssistantClarification = {
  kind: "clarification";
  question: string;
  options: { label: string; value: string }[];
};

export type AssistantStateChange = {
  kind: "state-changed";
  summary: string;
};

export type AssistantEntry =
  | AssistantExplanation
  | AssistantClarification
  | AssistantStateChange;

export type ConversationTurn =
  | { id: string; kind: "user"; text: string }
  | {
      id: string;
      kind: "assistant";
      entries: AssistantEntry[];
      errors: string[];
      pending?: boolean;
    };

type ApiChatResponse = {
  mealMap: MealMap;
  events: Array<
    | {
        type: "tool";
        name: string;
        effect:
          | { kind: "state-changed"; summary: string }
          | {
              kind: "explanation";
              channel: "plan" | "origin" | "summary";
              text: string;
              ingredientId?: string;
            }
          | {
              kind: "clarification";
              question: string;
              options: { label: string; value: string }[];
            }
          | { kind: "none" };
      }
    | { type: "error"; message: string }
  >;
  history: unknown[];
  callCount: number;
  budgetExhausted: boolean;
};

function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function useConversation(initialMealMap: MealMap) {
  const [mealMap, setMealMap] = useState<MealMap>(initialMealMap);
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [apiHistory, setApiHistory] = useState<unknown[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (trimmed.length === 0 || pending) return;

      const userTurn: ConversationTurn = {
        id: newId(),
        kind: "user",
        text: trimmed,
      };
      const placeholder: ConversationTurn = {
        id: newId(),
        kind: "assistant",
        entries: [],
        errors: [],
        pending: true,
      };
      setTurns((prev) => [...prev, userTurn, placeholder]);
      setPending(true);
      setError(null);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            mealMap,
            history: apiHistory,
          }),
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(body.error ?? `Request failed: ${response.status}`);
        }

        const data = (await response.json()) as ApiChatResponse;

        const entries: AssistantEntry[] = [];
        const errors: string[] = [];
        for (const event of data.events) {
          if (event.type === "error") {
            errors.push(event.message);
            continue;
          }
          const effect = event.effect;
          switch (effect.kind) {
            case "state-changed":
              entries.push({ kind: "state-changed", summary: effect.summary });
              break;
            case "explanation":
              entries.push({
                kind: "explanation",
                channel: effect.channel,
                text: effect.text,
                ingredientId: effect.ingredientId,
              });
              break;
            case "clarification":
              entries.push({
                kind: "clarification",
                question: effect.question,
                options: effect.options,
              });
              break;
            case "none":
              break;
          }
        }
        if (data.budgetExhausted) {
          errors.push("Tool budget exhausted for this turn.");
        }

        setMealMap(data.mealMap);
        setApiHistory(data.history);
        setTurns((prev) =>
          prev.map((t) =>
            t.id === placeholder.id
              ? { ...t, entries, errors, pending: false }
              : t,
          ),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setTurns((prev) =>
          prev.map((t) =>
            t.id === placeholder.id
              ? {
                  ...t,
                  pending: false,
                  errors: [message],
                }
              : t,
          ),
        );
      } finally {
        setPending(false);
      }
    },
    [apiHistory, mealMap, pending],
  );

  return {
    mealMap,
    setMealMap,
    turns,
    pending,
    error,
    send,
  };
}
