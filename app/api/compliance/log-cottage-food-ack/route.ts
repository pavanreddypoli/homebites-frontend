import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.slice(7);
  let userId: string | null = null;
  if (token) {
    const { data: { user } } = await supabaseServer.auth.getUser(token);
    userId = user?.id ?? null;
  }

  const body = await req.json();
  const { order_id, restaurant_id } = body;
  if (!order_id) {
    return NextResponse.json({ error: "order_id required" }, { status: 400 });
  }

  const ip        = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  await supabaseServer.from("compliance_audit_log").insert({
    user_id:            userId,
    home_restaurant_id: null,
    event_type:         "cottage_food_acknowledged_at_order",
    event_data:         { order_id, restaurant_id, acknowledged_at: new Date().toISOString() },
    ip_address:         ip,
    user_agent:         userAgent,
  });

  return NextResponse.json({ ok: true });
}
