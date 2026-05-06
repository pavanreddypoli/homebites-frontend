import "server-only";

import { keywordCheck }                         from "./keywords";
import { classifyDish, type ClassifierOutput }  from "./classifier";

export interface ModerationInput {
  name:         string;
  description?: string | null;
  ingredients?: string | null;
}

export interface ModerationDecision {
  status:    "approved" | "rejected" | "pending_review";
  reason:    string;
  layer1:    { status: string; matched?: string };
  layer2?:   ClassifierOutput;
  allergens: string[];
}

export async function moderateDish(input: ModerationInput): Promise<ModerationDecision> {
  const combined = [input.name, input.description, input.ingredients]
    .filter(Boolean)
    .join(" ");

  // Layer 1 — instant, free
  const l1 = keywordCheck(combined);

  if (l1.status === "blocked") {
    return {
      status:    "rejected",
      reason:    `Contains prohibited ingredient: "${l1.matched}". Texas Cottage Food Law does not allow this category of food from a home kitchen.`,
      layer1:    { status: l1.status, matched: l1.matched },
      allergens: [],
    };
  }

  // Layer 2 — always runs (allergen detection + context-aware classification)
  const l2 = await classifyDish(input);

  if (l2.decision === "block") {
    return {
      status:    "rejected",
      reason:    l2.reason,
      layer1:    { status: l1.status, matched: l1.status === "review" ? l1.matched : undefined },
      layer2:    l2,
      allergens: l2.allergens,
    };
  }

  if (l1.status === "review" || l2.decision === "review" || l2.confidence < 0.85) {
    return {
      status:    "pending_review",
      reason:    l2.reason,
      layer1:    { status: l1.status, matched: l1.status === "review" ? l1.matched : undefined },
      layer2:    l2,
      allergens: l2.allergens,
    };
  }

  return {
    status:    "approved",
    reason:    "Auto-approved",
    layer1:    { status: l1.status },
    layer2:    l2,
    allergens: l2.allergens,
  };
}
