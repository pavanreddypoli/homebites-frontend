import { NextRequest, NextResponse } from "next/server";
import { supabaseServer }            from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.slice(7);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseServer.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dishId = req.nextUrl.searchParams.get("dishId");
  if (!dishId) return NextResponse.json({ error: "dishId required" }, { status: 400 });

  // Verify chef owns this dish (home_restaurants.id = auth.users.id per schema)
  const { data: dish } = await supabaseServer
    .from("dishes")
    .select("home_restaurant_id, moderation_status")
    .eq("id", dishId)
    .single();

  if (!dish) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (dish.home_restaurant_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (dish.moderation_status !== "rejected")
    return NextResponse.json({ reason: null });

  const { data: queueEntry } = await supabaseServer
    .from("moderation_queue")
    .select("human_reason")
    .eq("dish_id", dishId)
    .eq("human_decision", "rejected")
    .order("reviewed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return NextResponse.json({ reason: queueEntry?.human_reason ?? null });
}
