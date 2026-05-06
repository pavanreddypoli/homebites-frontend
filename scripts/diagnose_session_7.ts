import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function run() {
  // Dynamic imports after dotenv so env vars are set before module-level init
  const { supabaseServer } = await import("../lib/supabaseServer");
  const { moderateDish }   = await import("../lib/moderation/moderate");
  const { keywordCheck }   = await import("../lib/moderation/keywords");

  console.log("=== Session 7 moderation smoke test ===\n");

  // ── TEST 1: Layer 1 hard block (chicken) ──
  console.log("TEST 1: Layer 1 hard-block on 'Chicken Biryani'");
  const t1l1 = keywordCheck("Chicken Biryani");
  console.log(" Layer 1:", JSON.stringify(t1l1));
  if (t1l1.status !== "blocked" || t1l1.matched !== "chicken") {
    console.error(" ✗ FAIL: should be blocked on 'chicken'");
  } else {
    console.log(" ✓ PASS: hard-blocked\n");
  }

  const t1full = await moderateDish({
    name: "Chicken Biryani",
    description: "Aromatic basmati rice with marinated chicken",
    ingredients: "chicken, rice, yogurt, spices",
  });
  console.log(" Full pipeline:", t1full.status);
  console.log(" Reason:", t1full.reason);
  console.log(" Layer 2 was called:", t1full.layer2 !== undefined);
  if (t1full.status !== "rejected") console.error(" ✗ FAIL: should be rejected");
  if (t1full.layer2 !== undefined)   console.error(" ✗ FAIL: Layer 2 should be skipped on hard-block (cost optimization)");
  console.log("");

  // ── TEST 2: Layer 1 review flag (biryani without meat keyword) ──
  console.log("TEST 2: 'Vegetable Biryani' (Layer 1 review flag, Layer 2 should clear)");
  const t2l1 = keywordCheck("Vegetable Biryani");
  console.log(" Layer 1:", JSON.stringify(t2l1));
  if (t2l1.status !== "review" || t2l1.matched !== "biryani") {
    console.error(" ✗ FAIL: should be flagged for review on 'biryani'");
  } else {
    console.log(" ✓ Layer 1 correctly flagged\n");
  }

  const t2full = await moderateDish({
    name: "Vegetable Biryani",
    description: "Fragrant rice with mixed vegetables and aromatic spices",
    ingredients: "rice, onions, tomatoes, mixed vegetables, ghee, cardamom, cinnamon",
  });
  console.log(" Full pipeline:", t2full.status);
  console.log(" Layer 2 decision:", t2full.layer2?.decision);
  console.log(" Layer 2 confidence:", t2full.layer2?.confidence);
  console.log(" Allergens detected:", t2full.allergens);
  console.log(" Reason:", t2full.reason);
  console.log("");

  // ── TEST 3: Clean dish with allergens ──
  console.log("TEST 3: 'Cheesecake' (clean, expect approval + allergens)");
  const t3 = await moderateDish({
    name: "Classic New York Cheesecake",
    description: "Rich and creamy cheesecake on a graham cracker crust",
    ingredients: "cream cheese, eggs, sugar, graham crackers, butter, vanilla",
  });
  console.log(" Status:", t3.status);
  console.log(" Layer 2 decision:", t3.layer2?.decision);
  console.log(" Layer 2 confidence:", t3.layer2?.confidence);
  console.log(" Allergens detected:", t3.allergens);
  console.log(" Reason:", t3.reason);
  const expected = ["milk", "eggs", "wheat"];
  const missing = expected.filter((a) => !t3.allergens.includes(a));
  if (missing.length > 0) console.error(" ⚠ Missing expected allergens:", missing);
  console.log("");

  // ── TEST 4: "Kheema" (should review or block) ──
  console.log("TEST 4: 'Kheema' (Hindi transliteration for ground meat — should review/block)");
  const t4l1 = keywordCheck("Kheema");
  console.log(" Layer 1:", JSON.stringify(t4l1));
  const t4full = await moderateDish({
    name: "Kheema",
    description: "Spiced ground filling",
    ingredients: "ground meat, onions, ginger, garlic, garam masala",
  });
  console.log(" Full pipeline:", t4full.status);
  console.log(" Reason:", t4full.reason);
  console.log("");

  // ── TEST 5: Soy kheema (vegetarian alternative) ──
  console.log("TEST 5: 'Soy Kheema' (vegetarian alternative — should pass or review)");
  const t5 = await moderateDish({
    name: "Soy Kheema",
    description: "Vegetarian ground soy crumble cooked with Indian spices",
    ingredients: "soy granules, onions, tomatoes, ginger, garlic, garam masala, oil",
  });
  console.log(" Status:", t5.status);
  console.log(" Layer 2 decision:", t5.layer2?.decision);
  console.log(" Layer 2 confidence:", t5.layer2?.confidence);
  console.log(" Allergens detected:", t5.allergens);
  console.log(" Reason:", t5.reason);
  console.log("");

  // ── TEST 6: moderation_queue audit trail ──
  console.log("TEST 6: Verify moderation_queue audit trail");
  const { data: queueRows, error } = await supabaseServer
    .from("moderation_queue")
    .select("id, ai_classification, ai_decision, ai_confidence, created_at")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    console.error(" ✗ FAIL: could not read moderation_queue:", error.message);
  } else {
    console.log(`  Found ${queueRows?.length ?? 0} recent moderation_queue rows`);
    queueRows?.slice(0, 5).forEach((row, i) => {
      console.log(`  [${i + 1}] decision=${row.ai_decision} conf=${row.ai_confidence}`);
    });
  }
  console.log("");

  console.log("Note: Tests 1-5 bypass the API route, so they don't write to moderation_queue.");
  console.log("Real chef saves through /add-item or /edit-item DO write — that's what queueRows shows.\n");

  // ── TEST 7: ADMIN_EMAILS env var ──
  console.log("TEST 7: Verify ADMIN_EMAILS env var is set");
  const adminEmails = process.env.ADMIN_EMAILS;
  if (!adminEmails) {
    console.error(" ✗ FAIL: ADMIN_EMAILS not set in .env.local");
  } else {
    console.log(" ✓ ADMIN_EMAILS =", adminEmails);
    if (!adminEmails.includes("info@algorythmai.com")) {
      console.error(" ⚠ Expected info@algorythmai.com in ADMIN_EMAILS");
    }
  }
  console.log("");

  // ── TEST 8: Customer query filter ──
  console.log("TEST 8: Verify customer dishes query excludes pending/rejected");
  const { data: customerVisible } = await supabaseServer
    .from("dishes")
    .select("id, moderation_status")
    .in("moderation_status", ["approved", "auto_approved"])
    .limit(5);
  const { data: customerHidden } = await supabaseServer
    .from("dishes")
    .select("id, moderation_status")
    .not("moderation_status", "in", "(approved,auto_approved)")
    .limit(5);
  console.log(`  Visible to customers: ${customerVisible?.length ?? 0} dishes`);
  console.log(`  Hidden (pending/rejected/null): ${customerHidden?.length ?? 0} dishes`);
  console.log("");

  console.log("=== Smoke test complete ===");
}

run().catch((err) => { console.error(err); process.exit(1); });
