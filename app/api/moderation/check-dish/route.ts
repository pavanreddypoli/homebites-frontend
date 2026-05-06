import { NextRequest, NextResponse } from "next/server";
import { supabaseServer }            from "@/lib/supabaseServer";
import { moderateDish }              from "@/lib/moderation/moderate";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.slice(7);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user }, error: authErr } = await supabaseServer.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.user_metadata?.role !== "home_restaurant")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { name, description, ingredients, dish_id } = body;
  if (!name?.trim()) return NextResponse.json({ error: "Dish name is required" }, { status: 400 });

  const decision = await moderateDish({ name, description, ingredients });

  const aiDecision =
    decision.status === "rejected"       ? "block"  :
    decision.status === "pending_review" ? "review" : "allow";

  // Log every moderation event.
  // dish_id is null for new dishes (known gap: dish is saved by client after this call;
  // for edit-item dish_id is always provided and FK is satisfied).
  await supabaseServer.from("moderation_queue").insert({
    dish_id:           dish_id ?? null,
    chef_id:           user.id,
    ai_classification: {
      dish_name:        name,
      dish_description: description ?? null,
      dish_ingredients: ingredients ?? null,
      layer1:           decision.layer1,
      layer2:           decision.layer2 ?? null,
    },
    ai_decision:   aiDecision,
    ai_confidence: decision.layer2?.confidence ?? 1.0,
  });

  return NextResponse.json({
    status:    decision.status,
    reason:    decision.reason,
    allergens: decision.allergens,
  });
}
