import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const QUESTIONS = [
  "I am an individual Texas resident cooking from my own home kitchen.",
  "I will not sell more than $150,000 in cottage foods this year (across all platforms).",
  "I will not list any meat, poultry, seafood, ice cream, raw milk, low-acid canned goods, or CBD/THC items.",
  "I have, or will obtain, a Texas DSHS-accredited food handler certification before listing.",
];

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.slice(7);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user }, error: authErr } = await supabaseServer.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.user_metadata?.role !== "home_restaurant")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { answers } = await req.json();
  if (!Array.isArray(answers) || answers.length !== 4 || answers.some((a) => a !== true))
    return NextResponse.json({ error: "All four eligibility questions must be answered Yes" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const now = new Date().toISOString();

  const { error: hrErr } = await supabaseServer
    .from("home_restaurants")
    .upsert(
      { id: user.id, user_id: user.id, cottage_food_attestation_at: now }, // Fix 1: user_id
      { onConflict: "id" }
    );
  if (hrErr) return NextResponse.json({ error: hrErr.message }, { status: 500 });

  const { error: logErr } = await supabaseServer.from("compliance_audit_log").insert({
    user_id: user.id,
    home_restaurant_id: user.id,
    event_type: "cottage_food_attestation",
    event_data: { questions: QUESTIONS, answers },
    ip_address: ip,
    user_agent: userAgent,
  });
  if (logErr) console.error("[attest-eligibility] audit log error:", logErr.message);

  return NextResponse.json({ ok: true });
}
