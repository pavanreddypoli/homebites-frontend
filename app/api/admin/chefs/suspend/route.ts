import { NextRequest, NextResponse } from "next/server";
import { supabaseServer }            from "@/lib/supabaseServer";

function isAdmin(email: string): boolean {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.slice(7);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseServer.auth.getUser(token);
  if (!user?.email || !isAdmin(user.email))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { chef_id, reason, related_incident_id } = await req.json();
  if (!chef_id || !reason?.trim())
    return NextResponse.json({ error: "chef_id and reason required" }, { status: 400 });

  const suspendedAt = new Date().toISOString();

  const { error } = await supabaseServer
    .from("home_restaurants")
    .update({
      is_active:         false,
      suspended_at:      suspendedAt,
      suspension_reason: reason.trim(),
    })
    .eq("id", chef_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await supabaseServer.from("compliance_audit_log").insert({
      user_id:            user.id,
      home_restaurant_id: chef_id,
      event_type:         "manual_suspension",
      event_data:         {
        reason:                reason.trim(),
        related_incident_id:   related_incident_id ?? null,
        suspended_until_review: true,
      },
      ip_address: req.headers.get("x-forwarded-for") ?? "unknown",
    });
  } catch { /* non-blocking */ }

  try {
    const { data: chef } = await supabaseServer
      .from("home_restaurants")
      .select("name, notification_email")
      .eq("id", chef_id)
      .single();

    if (chef?.notification_email) {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from:    "HomeBites AI <notifications@homebitesai.com>",
        to:      chef.notification_email,
        subject: "Your HomeBites listing has been suspended",
        html:    `<p>Hi ${chef.name ?? "Chef"},</p><p>Your HomeBites listing has been temporarily suspended pending review.</p><p><strong>Reason:</strong> ${reason.trim()}</p><p>Our team will be in touch. Reply to this email with any questions.</p>`,
      });
    }
  } catch { /* non-blocking */ }

  return NextResponse.json({ ok: true });
}
