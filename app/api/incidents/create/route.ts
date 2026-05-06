import { NextRequest, NextResponse } from "next/server";
import { supabaseServer }            from "@/lib/supabaseServer";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SEVERITY_MAP: Record<string, string> = {
  illness_report:          "P0",
  allergen_mislabeling:    "P1",
  foreign_object:          "P1",
  spoilage_mold:           "P1",
  fraud_misrepresentation: "P2",
  service_complaint:       "P3",
  other:                   "P3",
};

const VALID_CATEGORIES = new Set(Object.keys(SEVERITY_MAP));

export async function POST(req: NextRequest) {
  let body: {
    category?: string;
    description?: string;
    reporter_email?: string;
    subject_chef_id?: string;
    subject_order_id?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { category, description, reporter_email, subject_chef_id, subject_order_id } = body;

  if (!category || !VALID_CATEGORIES.has(category))
    return NextResponse.json({ error: "Invalid or missing category" }, { status: 400 });
  if (!description || description.trim().length < 20)
    return NextResponse.json({ error: "Description must be at least 20 characters" }, { status: 400 });
  if (!reporter_email || !reporter_email.includes("@"))
    return NextResponse.json({ error: "Valid reporter_email required" }, { status: 400 });

  // FIX 1: Validate UUID format before INSERT — orders.restaurant_id is text in DB
  if (subject_chef_id && !UUID_RE.test(subject_chef_id))
    return NextResponse.json({ error: "Invalid chef id format" }, { status: 400 });
  if (subject_order_id && !UUID_RE.test(subject_order_id))
    return NextResponse.json({ error: "Invalid order id format" }, { status: 400 });

  // Optional auth — guest reporters have no account
  let reporter_id: string | null = null;
  const token = req.headers.get("authorization")?.slice(7);
  if (token) {
    const { data: { user } } = await supabaseServer.auth.getUser(token);
    reporter_id = user?.id ?? null;
  }

  const severity = SEVERITY_MAP[category];

  const { data: incident, error } = await supabaseServer
    .from("incidents")
    .insert({
      reporter_id,
      reporter_email: reporter_email.trim(),
      subject_chef_id:  subject_chef_id  || null,
      subject_order_id: subject_order_id || null,
      severity,
      category,
      description: description.trim(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[incidents/create]", error.message);
    return NextResponse.json({ error: "Failed to create incident" }, { status: 500 });
  }

  // Audit log (non-blocking)
  try {
    await supabaseServer.from("compliance_audit_log").insert({
      user_id:            reporter_id,
      home_restaurant_id: subject_chef_id || null,
      event_type:         "incident_created",
      event_data:         { incident_id: incident.id, severity, category },
      ip_address:         req.headers.get("x-forwarded-for") ?? "unknown",
    });
  } catch { /* non-blocking */ }

  // Confirmation email to reporter + admin alert for P0/P1 (non-blocking)
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from:    "HomeBites AI <notifications@homebitesai.com>",
      to:      reporter_email.trim(),
      subject: "We received your report",
      html:    `<p>Thank you for reporting this issue. We'll review it and follow up within 24–48 hours.</p><p>Your report ID: <strong>${incident.id.slice(0, 8).toUpperCase()}</strong></p>`,
    });

    if (severity === "P0" || severity === "P1") {
      const adminEmails = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim()).filter(Boolean);
      if (adminEmails.length > 0) {
        await resend.emails.send({
          from:    "HomeBites AI <notifications@homebitesai.com>",
          to:      adminEmails[0],
          subject: `[${severity}] New incident: ${category.replace(/_/g, " ")}`,
          html:    `<p><strong>Severity:</strong> ${severity}</p><p><strong>Category:</strong> ${category}</p><p><strong>Description:</strong> ${description.trim()}</p><p><strong>Reporter:</strong> ${reporter_email.trim()}</p>`,
        });
      }
    } else {
      console.log(`[incidents] ${severity} incident created: ${incident.id} (${category})`);
    }
  } catch (emailErr) {
    console.error("[incidents/create] email error:", emailErr);
  }

  return NextResponse.json({ ok: true, incident_id: incident.id, severity });
}
