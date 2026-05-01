import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const normalized = email.toLowerCase().trim();

  const { data: orders, error } = await supabaseServer
    .from("orders")
    .select("*")
    .eq("customer_email", normalized)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orderIds = (orders || []).map((o: any) => o.id);
  let itemsByOrder: Record<string, any[]> = {};

  if (orderIds.length > 0) {
    const { data: items } = await supabaseServer
      .from("order_items")
      .select("*")
      .in("order_id", orderIds);

    items?.forEach((item: any) => {
      if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
      itemsByOrder[item.order_id].push(item);
    });
  }

  return NextResponse.json({ orders: orders || [], itemsByOrder });
}
