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

  const { queue_id, dish_id, reason } = await req.json();
  if (!queue_id || !dish_id || !reason?.trim())
    return NextResponse.json({ error: "queue_id, dish_id, and reason required" }, { status: 400 });

  await Promise.all([
    supabaseServer.from("dishes").update({ moderation_status: "rejected" }).eq("id", dish_id),
    supabaseServer.from("moderation_queue").update({
      human_decision:    "rejected",
      human_reason:      reason,
      human_reviewer_id: user.id,
      reviewed_at:       new Date().toISOString(),
    }).eq("id", queue_id),
  ]);

  // Wire deferred rejection email (Session 9)
  try {
    const { data: dish } = await supabaseServer
      .from("dishes")
      .select("name, home_restaurant_id")
      .eq("id", dish_id)
      .single();

    if (dish?.home_restaurant_id) {
      const { data: chef } = await supabaseServer
        .from("home_restaurants")
        .select("name, notification_email")
        .eq("id", dish.home_restaurant_id)
        .single();

      if (chef?.notification_email) {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from:    "HomeBites AI <notifications@homebitesai.com>",
          to:      chef.notification_email,
          subject: `Your dish "${dish.name}" was not approved`,
          html:    `<p>Hi ${chef.name ?? "Chef"},</p><p>Your dish <strong>${dish.name}</strong> was reviewed and could not be approved.</p><blockquote style="border-left:3px solid #E5E7EB;padding:8px 12px;color:#374151;margin:12px 0">${reason}</blockquote><p>Please update the dish and resubmit, or contact us if you have questions.</p>`,
        });
      }
    }
  } catch { /* non-blocking */ }

  return NextResponse.json({ ok: true });
}
