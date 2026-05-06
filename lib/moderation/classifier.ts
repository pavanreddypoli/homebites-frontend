import "server-only"; // build-time guard — prevents accidental client bundle inclusion

import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a food compliance classifier for a Texas home-chef marketplace operating under Texas Cottage Food Law (SB 541).

Texas Cottage Food Law PROHIBITS sale of any food containing:
1. Meat (beef, pork, lamb, goat, venison, etc.)
2. Poultry (chicken, turkey, duck, etc.)
3. Seafood (any fish, shellfish, crustaceans)
4. Ice cream, gelato, sorbet, popsicles, or frozen ice products
5. Low-acid canned goods (home-canned vegetables, soups in jars)
6. Raw or unpasteurized milk products
7. CBD, THC, or cannabis-derived ingredients

ALLOWED items include:
- Eggs and egg dishes (anda curry, deviled eggs, frittatas)
- All vegetarian and vegan dishes
- Plant-based "meat" alternatives (soy chunks, jackfruit, mock meat)
- Dairy products from pasteurized milk (cheese, yogurt, butter, paneer)
- Baked goods (breads, cakes, cookies, pies)
- Pickles, jams, preserves, chutneys (high-acid)
- Cooked rice/grain dishes (vegetable biryani, dal, pulao)
- Honey, syrups, dried herbs

Be careful with:
- "Biryani" — flag if it mentions meat; allow if vegetable/paneer/egg
- "Kheema" / "Keema" — almost always meat; allow only if explicitly "soy" or "vegetarian"
- "Kebab" — meat by default; allow paneer/vegetable kebabs
- Ambiguous names — err toward REVIEW

Also identify allergens present. FDA Big 9: milk, eggs, fish, shellfish, tree_nuts, peanuts, wheat, soybeans, sesame.

Respond with strict JSON only — no preamble, no markdown fences.`;

export interface ClassifierInput {
  name:         string;
  description?: string | null;
  ingredients?: string | null;
}

export interface ClassifierOutput {
  decision:   "allow" | "block" | "review";
  category:   "meat" | "poultry" | "seafood" | "frozen" | "raw_milk" | "cannabis" | "low_acid_canned" | "ambiguous" | "clear";
  reason:     string;
  confidence: number;
  allergens:  string[];
}

export async function classifyDish(input: ClassifierInput): Promise<ClassifierOutput> {
  const userMessage = `Classify this dish:

Name: ${input.name}
Description: ${input.description ?? "(none)"}
Ingredients: ${input.ingredients ?? "(none)"}

Return JSON exactly in this shape:
{
  "decision": "allow" | "block" | "review",
  "category": "meat" | "poultry" | "seafood" | "frozen" | "raw_milk" | "cannabis" | "low_acid_canned" | "ambiguous" | "clear",
  "reason": "<one short sentence>",
  "confidence": 0.0,
  "allergens": ["milk", "wheat"]
}`;

  const msg = await client.messages.create({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 300,
    system:     SYSTEM_PROMPT,
    messages:   [{ role: "user", content: userMessage }],
  });

  const text    = msg.content[0].type === "text" ? msg.content[0].text : "";
  const cleaned = text.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned) as ClassifierOutput;
    if (!Array.isArray(parsed.allergens)) parsed.allergens = [];
    return parsed;
  } catch {
    console.error("[classifier] malformed JSON:", cleaned);
    // Fail safe: unknown → human review, never auto-approve
    return {
      decision:   "review",
      category:   "ambiguous",
      reason:     "Classifier returned malformed response — manual review required",
      confidence: 0,
      allergens:  [],
    };
  }
}
