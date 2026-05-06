import { NextRequest, NextResponse } from "next/server";
import { supabaseServer }            from "@/lib/supabaseServer";

function isAdmin(email: string): boolean {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}

const VALID_STATUSES = new Set(["open", "investigating", "resolved", "closed"]);

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.slice(7);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseServer.auth.getUser(token);
  if (!user?.email || !isAdmin(user.email))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { incident_id, status, resolution_notes } = await req.json();
  if (!incident_id || !status)
    return NextResponse.json({ error: "incident_id and status required" }, { status: 400 });
  if (!VALID_STATUSES.has(status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const updates: Record<string, unknown> = { status };
  if (resolution_notes !== undefined) updates.resolution_notes = resolution_notes;
  if (status === "resolved") {
    updates.resolved_at  = new Date().toISOString();
    updates.resolver_id  = user.id;
  }

  const { error } = await supabaseServer
    .from("incidents")
    .update(updates)
    .eq("id", incident_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (status === "resolved" || status === "closed") {
    try {
      await supabaseServer.from("compliance_audit_log").insert({
        user_id:    user.id,
        event_type: "incident_resolved",
        event_data: { incident_id, resolution_notes: resolution_notes ?? null, status },
        ip_address: req.headers.get("x-forwarded-for") ?? "unknown",
      });
    } catch { /* non-blocking */ }
  }

  return NextResponse.json({ ok: true });
}
