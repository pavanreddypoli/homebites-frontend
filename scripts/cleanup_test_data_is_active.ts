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
  // --- Dry-run SELECT ---
  console.log("=== Dry-run: rows that will be deactivated ===");
  const { data: dryRun, error: dryErr } = await sb
    .from("home_restaurants")
    .select("id, name, is_active, cottage_food_attestation_at, stripe_payouts_enabled")
    .eq("is_test_data", true)
    .or(
      "cottage_food_attestation_at.is.null,food_handler_cert_url.is.null,chef_agreement_accepted_at.is.null,stripe_payouts_enabled.is.false,labeling_acknowledged_at.is.null"
    );

  if (dryErr) { console.error("Dry-run error:", dryErr.message); return; }
  console.log("Row count:", dryRun.length);
  console.log(JSON.stringify(dryRun, null, 2));

  // --- UPDATE ---
  console.log("\n=== Running UPDATE ===");
  const { error: updateErr, count } = await sb
    .from("home_restaurants")
    .update({ is_active: false })
    .eq("is_test_data", true)
    .or(
      "cottage_food_attestation_at.is.null,food_handler_cert_url.is.null,chef_agreement_accepted_at.is.null,stripe_payouts_enabled.is.false,labeling_acknowledged_at.is.null"
    );

  if (updateErr) { console.error("UPDATE error:", updateErr.message); return; }
  console.log("UPDATE complete. Rows affected (if count returned):", count ?? "n/a");

  // --- Verification ---
  console.log("\n=== Verification: COUNT(*) WHERE is_active = true ===");
  const { data: activeRows, error: countErr } = await sb
    .from("home_restaurants")
    .select("id, name, is_test_data, stripe_payouts_enabled, labeling_acknowledged_at")
    .eq("is_active", true);

  if (countErr) { console.error("Count error:", countErr.message); return; }
  console.log("Active rows count:", activeRows.length);
  if (activeRows.length > 0) {
    console.log("Active rows (should only be rows that completed all 7 steps):");
    console.log(JSON.stringify(activeRows, null, 2));
  } else {
    console.log("✓ Zero active rows — expected, no chef has completed all 7 onboarding steps yet");
  }
}

run().catch(console.error);
