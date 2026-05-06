import { NextRequest, NextResponse } from "next/server";
import { supabaseServer }            from "@/lib/supabaseServer";

function isAdmin(email: string): boolean {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.slice(7);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseServer.auth.getUser(token);
  if (!user?.email || !isAdmin(user.email))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const status   = searchParams.get("status");
  const severity = searchParams.get("severity");

  let query = supabaseServer
    .from("incidents")
    .select("id, severity, category, status, reporter_email, subject_chef_id, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (status)   query = query.eq("status",   status);
  if (severity) query = query.eq("severity", severity);

  const { data: incidents, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with chef names
  const chefIds = [...new Set((incidents ?? []).map((i) => i.subject_chef_id).filter(Boolean))];
  let chefNames: Record<string, string> = {};
  if (chefIds.length > 0) {
    const { data: chefs } = await supabaseServer
      .from("home_restaurants")
      .select("id, name")
      .in("id", chefIds as string[]);
    chefNames = Object.fromEntries((chefs ?? []).map((c) => [c.id, c.name]));
  }

  const enriched = (incidents ?? []).map((i) => ({
    ...i,
    chef_name: i.subject_chef_id ? (chefNames[i.subject_chef_id] ?? "Unknown") : null,
  }));

  return NextResponse.json({ incidents: enriched });
}
