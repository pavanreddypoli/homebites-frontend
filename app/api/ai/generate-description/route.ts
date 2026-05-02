import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "@/lib/supabaseServer";

// Haiku 4.5 pricing: $1.00/M input, $5.00/M output
// Typical call: ~170 input + ~70 output tokens ≈ $0.00052
// At 20 calls/day × 100 active chefs ≈ $31/month at full saturation
const INPUT_COST_PER_TOKEN  = 1.00 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 5.00 / 1_000_000;
const DAILY_LIMIT = 20;

const SYSTEM_PROMPT = `You are a food copywriter for HomeBites, a platform featuring authentic home-cooked meals.
Write a menu description for the dish provided. Rules:
- 50–80 words exactly
- Warm, specific, sensory (texture, aroma, visual)
- Never use: "mouth-watering", "delicious", "amazing", "incredible", "must-try", "flavorful", "savory", "tasty"
- Reflect that this is home-cooked, not restaurant food — authenticity over polish
- Do NOT start with the dish name
- No call to action, no closing line
- Respond with the description only — no quotes, no labels`;

export async function POST(req: NextRequest) {
  // 1. Auth — verify caller is a logged-in chef
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return new Response("Unauthorized", { status: 401 });

  const { data: { user }, error: authError } = await supabaseServer.auth.getUser(token);
  if (authError || !user) {
    console.error("[AI] Auth failed:", authError?.message);
    return new Response("Unauthorized", { status: 401 });
  }

  // 2. Parse body
  let dishName: string, ingredients: string;
  try {
    const body = await req.json();
    dishName    = (body.dishName    ?? "").trim();
    ingredients = (body.ingredients ?? "").trim();
  } catch (err) {
    console.error("[AI] Body parse failed:", err);
    return new Response("Invalid request body", { status: 400 });
  }
  if (!dishName) return new Response("dishName is required", { status: 400 });

  console.log("[AI] Request — dishName:", dishName, "| hasIngredients:", !!ingredients, "| userId:", user.id);

  // 3. Fetch chef's cuisine for richer prompt context (home_restaurants.id = auth user id)
  const { data: restaurant, error: restaurantErr } = await supabaseServer
    .from("home_restaurants")
    .select("cuisine")
    .eq("id", user.id)
    .single();
  const cuisine = restaurant?.cuisine ?? "home-cooked";
  console.log("[AI] Cuisine fetched:", cuisine, "| restaurantErr:", restaurantErr?.message ?? null);

  // 4. Rate limit: max DAILY_LIMIT generations per chef per rolling 24 h
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await supabaseServer
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("feature", "menu_description")
    .gte("created_at", since);

  console.log("[AI] Rate limit count (last 24h):", count);

  if ((count ?? 0) >= DAILY_LIMIT) {
    return new Response(
      JSON.stringify({ error: "Daily AI limit reached. Try again tomorrow." }),
      { status: 429, headers: { "Content-Type": "application/json" } }
    );
  }

  // 5. Build prompt
  const userPrompt = [
    `Dish: ${dishName}`,
    `Cuisine: ${cuisine}`,
    ingredients ? `Ingredients: ${ingredients}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  console.log("[AI] User prompt:\n", userPrompt);

  // 6. Stream from Claude — full dated model ID to avoid alias resolution surprises
  // ANTHROPIC_API_KEY must be set in .env.local (dev) and in Vercel env vars (prod/preview)
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  console.log("[AI] Starting stream — model: claude-haiku-4-5-20251001");

  let messageStream: ReturnType<typeof anthropic.messages.stream>;
  try {
    messageStream = anthropic.messages.stream({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
  } catch (err) {
    console.error("[AI] Stream creation failed:", err);
    return new Response(
      JSON.stringify({ error: "AI is unavailable right now, try again." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  // Abort Anthropic stream when client disconnects to avoid wasting tokens
  req.signal.addEventListener("abort", () => messageStream.abort(), { once: true });

  const encoder = new TextEncoder();
  const capturedStream = messageStream;

  const readable = new ReadableStream({
    async start(controller) {
      let completed = false;
      let totalChars = 0;
      try {
        for await (const text of capturedStream.textStream) {
          totalChars += text.length;
          controller.enqueue(encoder.encode(text));
        }
        completed = true;
        console.log("[AI] Stream done — totalChars:", totalChars);
      } catch (err) {
        console.error("[AI] Stream error:", err);
      }
      controller.close();

      // 7. Log usage only on successful completion (not on cancel or error)
      if (completed) {
        try {
          const final    = await capturedStream.getFinalMessage();
          const tokensIn  = final.usage.input_tokens;
          const tokensOut = final.usage.output_tokens;
          const cost_usd  = tokensIn * INPUT_COST_PER_TOKEN + tokensOut * OUTPUT_COST_PER_TOKEN;
          console.log("[AI] Usage — tokensIn:", tokensIn, "tokensOut:", tokensOut, "cost_usd:", cost_usd);
          await supabaseServer.from("ai_usage_log").insert({
            user_id:    user.id,
            feature:    "menu_description",
            tokens_in:  tokensIn,
            tokens_out: tokensOut,
            cost_usd,
          });
        } catch (err) {
          console.error("[AI] Usage log failed:", err);
        }
      }
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
