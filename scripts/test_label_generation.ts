import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { createClient } from "@supabase/supabase-js";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement, type ReactElement } from "react";
import { LabelDocument } from "../lib/labelPDF";
import type { LabelData } from "../lib/labelPDF";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  console.log("Finding a test order with items...");

  const { data: orders, error: ordErr } = await sb
    .from("orders")
    .select("id, restaurant_id")
    .order("created_at", { ascending: false })
    .limit(20);

  if (ordErr || !orders?.length) { console.error("No orders found:", ordErr?.message); return; }

  let targetOrderId: string | null = null;
  let targetRestaurantId: string | null = null;

  for (const order of orders) {
    const { data: items } = await sb.from("order_items").select("id").eq("order_id", order.id).limit(1);
    if (items?.length) { targetOrderId = order.id; targetRestaurantId = order.restaurant_id; break; }
  }

  if (!targetOrderId || !targetRestaurantId) { console.error("No orders with items found."); return; }
  console.log("Using order:", targetOrderId.slice(0, 8), "· restaurant:", targetRestaurantId.slice(0, 8));

  const { data: restaurant } = await sb
    .from("home_restaurants")
    .select("name, city, dshs_registration_id")
    .eq("id", targetRestaurantId)
    .maybeSingle();

  const { data: rawItems, error: itemsErr } = await sb
    .from("order_items")
    .select("dish_name, quantity, dishes(allergens, is_tcs)")
    .eq("order_id", targetOrderId);

  if (itemsErr || !rawItems?.length) { console.error("Order has no items:", itemsErr?.message); return; }

  const items = rawItems.map((item) => {
    // Fix 4: defensive guard — confirmed single object from V2 but guard for array just in case
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

  const totalPages = items.reduce((sum, item) => sum + item.quantity, 0);
  console.log(`${items.length} line item(s), ${totalPages} label page(s) to render`);
  console.log("Items:", items.map((i) => `${i.dishName} ×${i.quantity}`).join(", "));

  const labelData: LabelData = {
    orderId: targetOrderId,
    chefName: restaurant?.name ?? "Test Kitchen",
    chefAddress: restaurant?.city ? `${restaurant.city}, TX` : "Texas",
    dshsId: restaurant?.dshs_registration_id ?? null,
    items,
    productionDate: new Date().toISOString().split("T")[0],
  };

  console.log("Rendering PDF...");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(LabelDocument, { data: labelData }) as ReactElement<any>);

  const outPath = "/tmp/test-label.pdf";
  fs.writeFileSync(outPath, buffer);
  console.log(`✓ PDF written to ${outPath} (${buffer.length.toLocaleString()} bytes)`);
  console.log("  Open with: open /tmp/test-label.pdf");
}

run().catch(console.error);
