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

  const { queue_id, dish_id } = await req.json();
  if (!queue_id || !dish_id)
    return NextResponse.json({ error: "queue_id and dish_id required" }, { status: 400 });

  await Promise.all([
    supabaseServer.from("dishes").update({ moderation_status: "approved" }).eq("id", dish_id),
    supabaseServer.from("moderation_queue").update({
      human_decision:    "approved",
      human_reviewer_id: user.id,
      reviewed_at:       new Date().toISOString(),
    }).eq("id", queue_id),
  ]);

  // TODO Session 9: email chef via Resend
  console.log(`[admin] approved dish ${dish_id} (queue entry ${queue_id})`);

  return NextResponse.json({ ok: true });
}
