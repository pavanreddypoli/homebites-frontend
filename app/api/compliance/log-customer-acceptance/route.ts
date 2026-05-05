import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  let body: { user_id?: string; doc_types?: string[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { user_id, doc_types } = body;
  if (!user_id || !Array.isArray(doc_types) || doc_types.length === 0) {
    return NextResponse.json({ error: "user_id and doc_types required" }, { status: 400 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  // Look up live versions for the requested doc types
  const { data: liveDocs, error: liveError } = await supabaseServer
    .from("legal_documents")
    .select("doc_type, version")
    .is("superseded_at", null)
    .in("doc_type", doc_types);

  if (liveError || !liveDocs || liveDocs.length === 0) {
    return NextResponse.json({ error: "Could not fetch live documents" }, { status: 500 });
  }

  // Fix 3: idempotency — check which (doc_type, version) pairs are already recorded
  const { data: alreadyAccepted } = await supabaseServer
    .from("compliance_audit_log")
    .select("event_data")
    .eq("user_id", user_id)
    .eq("event_type", "customer_terms_accepted");

  const acceptedSet = new Set(
    (alreadyAccepted ?? []).map(
      (r: { event_data: { doc_type?: string; version?: string } }) =>
        `${r.event_data?.doc_type}:${r.event_data?.version}`
    )
  );

  const filteredDocs = liveDocs.filter(
    (doc) => !acceptedSet.has(`${doc.doc_type}:${doc.version}`)
  );

  if (filteredDocs.length === 0) {
    return NextResponse.json({ ok: true, alreadyAccepted: true });
  }

  const rows = filteredDocs.map((doc) => ({
    user_id,
    home_restaurant_id: null,
    event_type: "customer_terms_accepted",
    event_data: { doc_type: doc.doc_type, version: doc.version },
    ip_address: ip,
    user_agent: userAgent,
  }));

  const { error: insertError } = await supabaseServer
    .from("compliance_audit_log")
    .insert(rows);

  if (insertError) {
    console.error("[log-customer-acceptance] insert error:", insertError);
    return NextResponse.json({ error: "Failed to record acceptance" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
