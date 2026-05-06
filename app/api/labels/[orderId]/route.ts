import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { LabelDocument } from "@/lib/labelPDF";
import type { LabelData, LabelItem } from "@/lib/labelPDF";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const token = req.headers.get("authorization")?.slice(7);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user }, error: authErr } = await supabaseServer.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.user_metadata?.role !== "home_restaurant")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { orderId } = await params;

  // Fetch order — restaurant_id is text in the DB, compare as strings (V1 confirmed: same UUID-with-hyphens format)
  const { data: order, error: orderErr } = await supabaseServer
    .from("orders")
    .select("id, restaurant_id")
    .eq("id", orderId)
    .maybeSingle();

  if (orderErr || !order)
    return NextResponse.json({ error: "Order not found" }, { status: 404 });

  if (order.restaurant_id !== user.id)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Chef restaurant info
  const { data: restaurant, error: restErr } = await supabaseServer
    .from("home_restaurants")
    .select("name, city, dshs_registration_id")
    .eq("id", user.id)
    .single();

  if (restErr || !restaurant)
    return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });

  // Order items joined to dishes — FK confirmed present (V2)
  const { data: rawItems, error: itemsErr } = await supabaseServer
    .from("order_items")
    .select("dish_name, quantity, dishes(allergens, is_tcs)")
    .eq("order_id", orderId);

  if (itemsErr || !rawItems)
    return NextResponse.json({ error: "Order items not found" }, { status: 404 });

  const productionDate = new Date().toISOString().split("T")[0];

  const items: LabelItem[] = rawItems.map((item) => {
    // Fix 4: defensive guard — Supabase returns a single object here (V2 confirmed), but guard for array just in case
    const raw = item.dishes;
    const dish = (Array.isArray(raw) ? raw[0] : raw) as
      { allergens: string[] | null; is_tcs: boolean | null } | null;
    return {
      dishName: item.dish_name,
      quantity: item.quantity,
      allergens: dish?.allergens ?? [],
      isTcs: dish?.is_tcs ?? false,
    };
  });

  const labelData: LabelData = {
    orderId,
    chefName: restaurant.name ?? "HomeBites Chef",
    chefAddress: restaurant.city ? `${restaurant.city}, TX` : "Texas",
    dshsId: restaurant.dshs_registration_id ?? null,
    items,
    productionDate,
  };

  // Cast required: renderToBuffer types expect ReactElement<DocumentProps> but
  // wrapping in a custom component is valid at runtime — only the outermost element matters
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(
    createElement(LabelDocument, { data: labelData }) as ReactElement<any>
  );

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="labels-${orderId.slice(0, 8)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
