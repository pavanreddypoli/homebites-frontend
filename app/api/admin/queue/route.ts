import { NextRequest, NextResponse } from "next/server";
import { supabaseServer }            from "@/lib/supabaseServer";

function isAdmin(email: string): boolean {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.slice(7);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseServer.auth.getUser(token);
  if (!user?.email || !isAdmin(user.email))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // moderation_queue is admin-only RLS; supabaseServer (service role) bypasses it
  const { data, error } = await supabaseServer
    .from("moderation_queue")
    .select("id, dish_id, chef_id, ai_classification, ai_decision, ai_confidence, created_at")
    .is("human_decision", null)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with chef restaurant name
  const chefIds = [...new Set((data ?? []).map((r: any) => r.chef_id).filter(Boolean))];
  const { data: restaurants } = chefIds.length
    ? await supabaseServer.from("home_restaurants").select("id, name").in("id", chefIds)
    : { data: [] };

  const nameMap = new Map((restaurants ?? []).map((r: any) => [r.id, r.name]));

  const enriched = (data ?? []).map((row: any) => ({
    ...row,
    chef_name: nameMap.get(row.chef_id) ?? "Unknown",
  }));

  return NextResponse.json(enriched);
}
