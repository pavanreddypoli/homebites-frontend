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

  const { chef_id, reason } = await req.json();
  if (!chef_id || !reason?.trim())
    return NextResponse.json({ error: "chef_id and reason required" }, { status: 400 });

  // Clear suspension only — activation trigger re-gates is_active when chef attempts to go live
  const { error } = await supabaseServer
    .from("home_restaurants")
    .update({
      suspended_at:      null,
      suspension_reason: null,
    })
    .eq("id", chef_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  try {
    await supabaseServer.from("compliance_audit_log").insert({
      user_id:            user.id,
      home_restaurant_id: chef_id,
      event_type:         "chef_reactivated",
      event_data:         {
        reactivated_by:            user.email,
        cleared_suspension_reason: reason.trim(),
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
        subject: "Your HomeBites suspension has been lifted",
        html:    `<p>Hi ${chef.name ?? "Chef"},</p><p>Your account suspension has been cleared. Complete your onboarding to go live again — your listing will reactivate automatically once all compliance requirements are met.</p><p><strong>Note:</strong> ${reason.trim()}</p>`,
      });
    }
  } catch { /* non-blocking */ }

  return NextResponse.json({ ok: true });
}
