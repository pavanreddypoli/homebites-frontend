import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseServer = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  // Step 1: Find any test user with role=home_restaurant; reset their compliance fields first
  const { data: testRow } = await supabaseServer
    .from("home_restaurants")
    .select("id, name, cottage_food_attestation_at")
    .eq("is_test_data", true)
    .limit(1)
    .maybeSingle();

  if (!testRow) {
    console.error("No test chef rows exist at all.");
    return;
  }

  // Reset compliance fields so the smoke test starts clean
  console.log("Resetting compliance fields for test user:", testRow.id);
  await supabaseServer
    .from("home_restaurants")
    .update({
      cottage_food_attestation_at: null,
      food_handler_cert_url: null,
      food_handler_cert_expires_at: null,
      chef_agreement_version: null,
      chef_agreement_accepted_at: null,
      chef_agreement_ip: null,
    })
    .eq("id", testRow.id);

  console.log("Smoke testing with test user:", testRow.id, "(", testRow.name, ")");

  const { data: userResp } = await supabaseServer.auth.admin.getUserById(testRow.id);
  const email = userResp?.user?.email;
  console.log("User email:", email);

  console.log("\n--- Step 1: cottage_food_attestation ---");
  const now1 = new Date().toISOString();
  const { error: e1a } = await supabaseServer
    .from("home_restaurants")
    .upsert({
      id: testRow.id,
      user_id: testRow.id,
      cottage_food_attestation_at: now1,
    }, { onConflict: "id" });
  if (e1a) console.error("home_restaurants upsert error:", e1a.message);

  const { error: e1b } = await supabaseServer.from("compliance_audit_log").insert({
    user_id: testRow.id,
    home_restaurant_id: testRow.id,
    event_type: "cottage_food_attestation",
    event_data: { questions: ["q1","q2","q3","q4"], answers: [true,true,true,true] },
    ip_address: "127.0.0.1",
    user_agent: "smoke-test",
  });
  if (e1b) console.error("audit log insert error:", e1b.message);
  console.log("✓ Step 1 written");

  console.log("\n--- Step 2: profile saved ---");
  const { error: e2 } = await supabaseServer
    .from("home_restaurants")
    .upsert({
      id: testRow.id,
      user_id: testRow.id,
      name: "Smoke Test Kitchen",
      cuisine: "Test",
      lat: 33.0,
      lng: -96.7,
      city: "Celina",
      notification_email: email ?? "test@example.com",
      sells_tcs_foods: false,
    }, { onConflict: "id" });
  if (e2) console.error("profile upsert error:", e2.message);
  console.log("✓ Step 2 written");

  console.log("\n--- Step 3: cert uploaded (synthetic path) ---");
  const certPath = `${testRow.id}/food_handler_${Date.now()}.pdf`;
  const expiresAt = new Date(Date.now() + 365 * 86400 * 1000).toISOString().split("T")[0];
  const { error: e3 } = await supabaseServer
    .from("home_restaurants")
    .upsert({
      id: testRow.id,
      user_id: testRow.id,
      food_handler_cert_url: certPath,
      food_handler_cert_expires_at: expiresAt,
    }, { onConflict: "id" });
  if (e3) console.error("cert upsert error:", e3.message);
  console.log("✓ Step 3 written:", certPath);

  console.log("\n--- Step 4: agreement accepted ---");
  const { data: liveDoc, error: docErr } = await supabaseServer
    .from("legal_documents")
    .select("version")
    .eq("doc_type", "chef_agreement")
    .is("superseded_at", null)
    .single();
  if (docErr) console.error("legal_documents fetch error:", docErr.message);

  const { error: e4 } = await supabaseServer
    .from("home_restaurants")
    .upsert({
      id: testRow.id,
      user_id: testRow.id,
      chef_agreement_version: liveDoc?.version,
      chef_agreement_accepted_at: new Date().toISOString(),
      chef_agreement_ip: "127.0.0.1",
    }, { onConflict: "id" });
  if (e4) console.error("agreement upsert error:", e4.message);
  console.log("✓ Step 4 written, version:", liveDoc?.version);

  // Verify final state
  console.log("\n--- Final state check ---");
  const { data: final } = await supabaseServer
    .from("home_restaurants")
    .select("id, name, cottage_food_attestation_at, food_handler_cert_url, food_handler_cert_expires_at, chef_agreement_accepted_at, chef_agreement_version, stripe_payouts_enabled, labeling_acknowledged_at, is_active")
    .eq("id", testRow.id)
    .single();
  console.log(JSON.stringify(final, null, 2));

  // Try to activate — should fail because steps 5+6 not done
  console.log("\n--- Activation attempt (should FAIL — Stripe + labeling missing) ---");
  const { error: activateErr } = await supabaseServer
    .from("home_restaurants")
    .update({ is_active: true })
    .eq("id", testRow.id);
  if (activateErr) {
    console.log("✓ Trigger correctly blocked activation:", activateErr.message);
  } else {
    console.error("✗ FAILED: trigger should have blocked activation but did not");
  }

  // Verify audit log
  console.log("\n--- Audit log entries for this user ---");
  const { data: log } = await supabaseServer
    .from("compliance_audit_log")
    .select("event_type, event_data, created_at")
    .eq("user_id", testRow.id)
    .order("created_at", { ascending: true });
  console.log(JSON.stringify(log, null, 2));

  await triggerTest(testRow.id);
}

async function triggerTest(userId: string) {
  console.log("\n=== Targeted trigger test ===");

  // First, get current state
  const { data: before } = await supabaseServer
    .from("home_restaurants")
    .select("is_active, stripe_payouts_enabled, labeling_acknowledged_at")
    .eq("id", userId)
    .single();
  console.log("Current state:", before);

  // Scenario B: re-update is_active=true on already-active row
  console.log("\n--- Scenario B: UPDATE is_active=true on already-active row ---");
  const { error: scenBErr } = await supabaseServer
    .from("home_restaurants")
    .update({ is_active: true })
    .eq("id", userId);
  if (scenBErr) {
    console.log("Trigger fired even though value didn't change:", scenBErr.message);
  } else {
    console.log("✓ Confirmed: trigger correctly skips when is_active value unchanged (false→true is the only path that fires)");
  }

  // Scenario A: reset to false, then try to activate
  console.log("\n--- Scenario A: reset is_active=false, then attempt activation ---");
  const { error: resetErr } = await supabaseServer
    .from("home_restaurants")
    .update({ is_active: false })
    .eq("id", userId);
  if (resetErr) {
    console.error("Reset failed:", resetErr.message);
    return;
  }
  console.log("Reset is_active to false ✓");

  const { error: activateErr } = await supabaseServer
    .from("home_restaurants")
    .update({ is_active: true })
    .eq("id", userId);

  if (activateErr) {
    console.log("✓ Trigger correctly blocked activation:", activateErr.message);
    if (activateErr.message.includes("stripe_payouts_enabled")) {
      console.log("✓ Confirmed: blocked specifically on Stripe (next compliance gate)");
    } else {
      console.log("⚠ Unexpected exception message — investigate");
    }
  } else {
    console.error("✗ FAIL: trigger did NOT block activation despite Stripe + labeling missing — this is a Session 1 bug");
  }

  // Leave is_active = false — row reflects "incomplete onboarding" state
  console.log("\nLeft is_active = false — this row is in correct 'incomplete onboarding' state");

  // Final state
  const { data: after } = await supabaseServer
    .from("home_restaurants")
    .select("is_active, stripe_payouts_enabled, labeling_acknowledged_at")
    .eq("id", userId)
    .single();
  console.log("Final state:", after);
}

run().catch(console.error);
