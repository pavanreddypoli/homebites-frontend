import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  // ── Verification 1: restaurant_id format in orders ──────────────────────────
  console.log("=== VERIFICATION 1: orders.restaurant_id format ===");
  const { data: orders, error: ordErr } = await sb
    .from("orders")
    .select("id, restaurant_id")
    .limit(10);

  if (ordErr) { console.error("Error:", ordErr.message); }
  else {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    for (const row of (orders ?? [])) {
      const rid = row.restaurant_id as string | null;
      console.log({
        order_id: row.id,
        restaurant_id: rid,
        rid_length: rid?.length ?? null,
        is_valid_uuid_format: rid ? uuidPattern.test(rid) : false,
      });
    }
  }

  // ── Verification 2: FK from order_items.dish_id → dishes.id ─────────────────
  console.log("\n=== VERIFICATION 2: order_items → dishes FK (join test) ===");
  const { data: joinTest, error: joinErr } = await sb
    .from("order_items")
    .select("id, dish_id, dishes(id, allergens, is_tcs)")
    .limit(3);

  if (joinErr) {
    console.error("Join FAILED (FK likely missing):", joinErr.message);
  } else {
    console.log("Join SUCCEEDED — FK exists. Sample rows:");
    console.log(JSON.stringify(joinTest, null, 2));
  }

  // ── Also try fetching orders.restaurant_id vs a known home_restaurant id ────
  console.log("\n=== Cross-check: order restaurant_id vs home_restaurants.id format ===");
  const { data: hr } = await sb
    .from("home_restaurants")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (hr && orders?.length) {
    const sampleRid = (orders[0] as any).restaurant_id as string;
    console.log("home_restaurants.id sample:", hr.id, "(len:", hr.id.length, ")");
    console.log("orders.restaurant_id sample:", sampleRid, "(len:", sampleRid?.length, ")");
    console.log("Same format?", hr.id.length === sampleRid?.length);
  }
}

run().catch(console.error);
