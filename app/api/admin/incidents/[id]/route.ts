import { NextRequest, NextResponse } from "next/server";
import { supabaseServer }            from "@/lib/supabaseServer";

function isAdmin(email: string): boolean {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .includes(email.toLowerCase());
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = req.headers.get("authorization")?.slice(7);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user } } = await supabaseServer.auth.getUser(token);
  if (!user?.email || !isAdmin(user.email))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id: incidentId } = await params;

  const { data: incident, error } = await supabaseServer
    .from("incidents")
    .select("*")
    .eq("id", incidentId)
    .single();

  if (error || !incident) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let chef = null;
  if (incident.subject_chef_id) {
    const { data: chefRow } = await supabaseServer
      .from("home_restaurants")
      .select("id, name, notification_email, suspended_at, suspension_reason, is_active")
      .eq("id", incident.subject_chef_id)
      .single();
    chef = chefRow;
  }

  let order      = null;
  let orderItems = null;
  if (incident.subject_order_id) {
    const { data: orderRow } = await supabaseServer
      .from("orders")
      .select("id, restaurant_name, status, total, customer_email, created_at")
      .eq("id", incident.subject_order_id)
      .single();
    order = orderRow;
    if (order) {
      const { data: items } = await supabaseServer
        .from("order_items")
        .select("id, dish_name, price, quantity")
        .eq("order_id", incident.subject_order_id);
      orderItems = items;
    }
  }

  let auditLog = null;
  if (incident.subject_chef_id) {
    const { data: logs } = await supabaseServer
      .from("compliance_audit_log")
      .select("id, event_type, event_data, created_at, ip_address")
      .eq("home_restaurant_id", incident.subject_chef_id)
      .order("created_at", { ascending: false })
      .limit(50);
    auditLog = logs;
  }

  return NextResponse.json({ incident, chef, order, orderItems, auditLog });
}
