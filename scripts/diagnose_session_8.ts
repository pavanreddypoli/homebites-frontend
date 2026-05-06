import * as dotenv from "dotenv";
import * as path   from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function run() {
  const { supabaseServer } = await import("../lib/supabaseServer");
  const { runExpireCerts } = await import("../lib/cron/expire-certs-logic");

  console.log("=== Session 8 cron smoke test ===\n");

  // ── Setup: borrow a test chef row ──
  // is_test_data is never touched — we use opts.includeTestData to reach test rows
  const { data: testChef, error: findErr } = await supabaseServer
    .from("home_restaurants")
    .select("id, name, notification_email, food_handler_cert_expires_at, suspended_at, suspension_reason, is_active")
    .eq("is_test_data", true)
    .not("notification_email", "is", null)
    .limit(1)
    .single();

  if (findErr || !testChef) {
    console.error("SETUP FAIL: could not find a test chef:", findErr?.message);
    process.exit(1);
  }
  console.log(`Using test chef: ${testChef.name} (${testChef.id})`);
  console.log(`Original cert date: ${testChef.food_handler_cert_expires_at}\n`);

  const origCertDate = testChef.food_handler_cert_expires_at;

  const today   = new Date().toISOString().split("T")[0];
  const today30 = new Date(Date.now() + 30 * 86_400_000).toISOString().split("T")[0];
  const today60 = new Date(Date.now() + 60 * 86_400_000).toISOString().split("T")[0];

  const emailLog: Array<{ to: string; subject: string }> = [];
  const mockSendEmail = async ({ to, subject }: { to: string; subject: string; html: string }) => {
    emailLog.push({ to, subject });
    console.log(`    [mock email] to=${to}`);
    console.log(`                 subject="${subject}"`);
  };

  let passed = 0;
  let failed = 0;
  const pass = (msg: string) => { console.log(`  ✓ ${msg}`);        passed++; };
  const fail = (msg: string) => { console.error(`  ✗ FAIL: ${msg}`); failed++; };

  try {
    // ── TEST 1: cert expired today → suspend + audit log + email ──
    console.log("TEST 1: cert expired today → suspend + audit log + email");
    await supabaseServer.from("home_restaurants").update({
      food_handler_cert_expires_at: today,
      suspended_at:                 null,
      suspension_reason:            null,
    }).eq("id", testChef.id);

    emailLog.length = 0;
    const stats1 = await runExpireCerts(supabaseServer, mockSendEmail, { includeTestData: true });

    const { data: after1 } = await supabaseServer
      .from("home_restaurants")
      .select("suspended_at, suspension_reason, is_active")
      .eq("id", testChef.id)
      .single();

    after1?.suspended_at
      ? pass(`suspended_at set: ${after1.suspended_at}`)
      : fail("suspended_at was not set");
    after1?.suspension_reason?.includes("expired")
      ? pass(`suspension_reason: "${after1.suspension_reason}"`)
      : fail(`unexpected suspension_reason: ${after1?.suspension_reason}`);
    after1?.is_active === false
      ? pass("is_active = false")
      : fail("is_active was not set to false");
    emailLog.some((e) => e.subject.toLowerCase().includes("suspended"))
      ? pass("suspension email triggered")
      : fail("no suspension email triggered");
    stats1.expired === 1
      ? pass(`stats.expired = ${stats1.expired}`)
      : fail(`stats.expired = ${stats1.expired}, expected 1`);

    const { data: auditRow } = await supabaseServer
      .from("compliance_audit_log")
      .select("event_type, event_data")
      .eq("home_restaurant_id", testChef.id)
      .eq("event_type", "cert_expired_deactivation")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    auditRow
      ? pass(`audit log entry written: ${JSON.stringify(auditRow.event_data)}`)
      : fail("no cert_expired_deactivation row in compliance_audit_log");

    // Clear suspension between tests (is_test_data is never touched)
    await supabaseServer.from("home_restaurants").update({
      suspended_at:      null,
      suspension_reason: null,
    }).eq("id", testChef.id);
    console.log("");

    // ── TEST 2: cert expires in 30 days → warning email, not suspended ──
    console.log("TEST 2: cert expires in 30 days → warning email only");
    await supabaseServer.from("home_restaurants").update({
      food_handler_cert_expires_at: today30,
    }).eq("id", testChef.id);

    emailLog.length = 0;
    const stats2 = await runExpireCerts(supabaseServer, mockSendEmail, { includeTestData: true });

    const { data: after2 } = await supabaseServer
      .from("home_restaurants")
      .select("suspended_at")
      .eq("id", testChef.id)
      .single();

    !after2?.suspended_at
      ? pass("not suspended (correct — cert not expired)")
      : fail("unexpectedly suspended");
    emailLog.some((e) => e.subject.includes("30 days"))
      ? pass("30-day warning email triggered")
      : fail("30-day warning email not triggered");
    !emailLog.some((e) => e.subject.toLowerCase().includes("suspended"))
      ? pass("no suspension email (correct)")
      : fail("suspension email fired unexpectedly");
    stats2.warning_30 === 1
      ? pass(`stats.warning_30 = ${stats2.warning_30}`)
      : fail(`stats.warning_30 = ${stats2.warning_30}, expected 1`);
    console.log("");

    // ── TEST 3: cert expires in 60 days → no action ──
    console.log("TEST 3: cert expires in 60 days → no action");
    await supabaseServer.from("home_restaurants").update({
      food_handler_cert_expires_at: today60,
    }).eq("id", testChef.id);

    emailLog.length = 0;
    const stats3 = await runExpireCerts(supabaseServer, mockSendEmail, { includeTestData: true });

    const { data: after3 } = await supabaseServer
      .from("home_restaurants")
      .select("suspended_at")
      .eq("id", testChef.id)
      .single();

    !after3?.suspended_at
      ? pass("not suspended (correct)")
      : fail("unexpectedly suspended");
    emailLog.length === 0
      ? pass("no emails sent (correct)")
      : fail(`unexpected emails: ${emailLog.map((e) => e.subject).join(", ")}`);
    stats3.expired === 0 && stats3.warning_30 === 0 && stats3.warning_14 === 0 && stats3.warning_7 === 0
      ? pass("all stats = 0 (correct)")
      : fail(`unexpected stats: ${JSON.stringify(stats3)}`);
    console.log("");

  } finally {
    // Restore original cert date — harmless even if script crashed mid-test
    await supabaseServer.from("home_restaurants").update({
      food_handler_cert_expires_at: origCertDate,
      suspended_at:                 null,
      suspension_reason:            null,
    }).eq("id", testChef.id);
    console.log("Test chef cert date restored to original state.");
    console.log("Note: compliance_audit_log rows from TEST 1 persist (append-only by design).\n");
  }

  console.log(`=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => { console.error(err); process.exit(1); });
