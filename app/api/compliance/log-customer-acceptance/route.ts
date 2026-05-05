import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const isProd = process.env.VERCEL_ENV === "production";

function dbErrResponse(label: string, err: unknown, status: number) {
  const e = err as { message?: string; code?: string; hint?: string; details?: string };
  console.error(`[log-customer-acceptance] ${label}:`, JSON.stringify(e));
  return NextResponse.json(
    {
      error: label,
      ...(!isProd && {
        details: e?.message,
        code: e?.code,
        hint: e?.hint,
        pg_details: e?.details,
      }),
    },
    { status }
  );
}

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

  const { data: liveDocs, error: liveError } = await supabaseServer
    .from("legal_documents")
    .select("doc_type, version")
    .is("superseded_at", null)
    .in("doc_type", doc_types);

  if (liveError || !liveDocs || liveDocs.length === 0) {
    return dbErrResponse("Could not fetch live documents", liveError ?? { message: "no rows" }, 500);
  }

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
    return dbErrResponse("Failed to record acceptance", insertError, 500);
  }

  return NextResponse.json({ ok: true });
}
