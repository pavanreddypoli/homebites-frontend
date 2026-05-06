import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.slice(7);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user }, error: authErr } = await supabaseServer.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.user_metadata?.role !== "home_restaurant")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const ip        = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const now       = new Date().toISOString();

  const { error: hrErr } = await supabaseServer.from("home_restaurants").upsert(
    { id: user.id, user_id: user.id, labeling_acknowledged_at: now },
    { onConflict: "id" }
  );
  if (hrErr) return NextResponse.json({ error: hrErr.message }, { status: 500 });

  const { error: logErr } = await supabaseServer.from("compliance_audit_log").insert({
    user_id: user.id,
    home_restaurant_id: user.id,
    event_type: "labeling_acknowledged",
    event_data: { acknowledged_at: now },
    ip_address: ip,
    user_agent: userAgent,
  });
  if (logErr) console.error("[acknowledge-labeling] audit log error:", logErr.message);

  return NextResponse.json({ ok: true });
}
