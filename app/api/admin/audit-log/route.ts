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
  const emailFilter  = searchParams.get("email")?.trim();
  const eventTypes   = searchParams.get("event_type")?.split(",").filter(Boolean) ?? [];
  const dateFrom     = searchParams.get("date_from");
  const dateTo       = searchParams.get("date_to");
  const page         = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const isExport     = searchParams.get("export") === "1";
  const limit        = isExport ? 1000 : 50;
  const offset       = isExport ? 0 : (page - 1) * limit;

  let restaurantId: string | null = null;
  if (emailFilter) {
    const { data: chef } = await supabaseServer
      .from("home_restaurants")
      .select("id")
      .eq("notification_email", emailFilter)
      .limit(1)
      .single();
    if (!chef) return NextResponse.json({ logs: [], total: 0 });
    restaurantId = chef.id;
  }

  let query = supabaseServer
    .from("compliance_audit_log")
    .select("id, user_id, home_restaurant_id, event_type, event_data, ip_address, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (restaurantId)      query = query.eq("home_restaurant_id", restaurantId);
  if (eventTypes.length) query = query.in("event_type", eventTypes);
  if (dateFrom)          query = query.gte("created_at", dateFrom);
  if (dateTo)            query = query.lte("created_at", dateTo + "T23:59:59Z");

  const { data: logs, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ logs: logs ?? [], total: count ?? 0 });
}
