import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.slice(7);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user }, error: authErr } = await supabaseServer.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.user_metadata?.role !== "home_restaurant")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { version } = await req.json();
  if (!version?.trim()) return NextResponse.json({ error: "version is required" }, { status: 400 });

  // Verify the version is currently live in legal_documents
  const { data: liveDoc } = await supabaseServer
    .from("legal_documents")
    .select("version")
    .eq("doc_type", "chef_agreement")
    .eq("version", version)
    .is("superseded_at", null)
    .maybeSingle();

  if (!liveDoc)
    return NextResponse.json({ error: "Chef Agreement version not found or no longer live" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";
  const now = new Date().toISOString();

  const { error: hrErr } = await supabaseServer.from("home_restaurants").upsert(
    {
      id: user.id,
      user_id: user.id, // Fix 1: user_id
      chef_agreement_version: version,
      chef_agreement_accepted_at: now,
      chef_agreement_ip: ip,
    },
    { onConflict: "id" }
  );
  if (hrErr) return NextResponse.json({ error: hrErr.message }, { status: 500 });

  const { error: logErr } = await supabaseServer.from("compliance_audit_log").insert({
    user_id: user.id,
    home_restaurant_id: user.id,
    event_type: "chef_agreement_accepted",
    event_data: { version, ip, user_agent: userAgent },
    ip_address: ip,
    user_agent: userAgent,
  });
  if (logErr) console.error("[accept-agreement] audit log error:", logErr.message);

  return NextResponse.json({ ok: true });
}
