import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env.local") });

async function run() {
  const { supabaseServer } = await import("../lib/supabaseServer");

  console.log("=== Session 9 incident response smoke test ===\n");

  let passed = 0;
  let failed = 0;
  const pass = (msg: string) => { console.log(`  ✓ ${msg}`); passed++; };
  const fail = (msg: string) => { console.error(`  ✗ FAIL: ${msg}`); failed++; };

  // Find a test chef to be the subject
  const { data: testChef } = await supabaseServer
    .from("home_restaurants")
    .select("id, name, notification_email, suspended_at, is_active")
    .eq("is_test_data", true)
    .limit(1)
    .single();

  if (!testChef) {
    console.error("SETUP FAIL: no test chef available");
    process.exit(1);
  }
  console.log(`Test chef: ${testChef.name} (${testChef.id})\n`);
  const origSuspended = testChef.suspended_at;

  // ── TEST 1: Severity assignment from category (server-side, not client) ──
  console.log("TEST 1: Severity is assigned server-side from category");

  const SEVERITY_EXPECTED: Record<string, string> = {
    illness_report: "P0",
    allergen_mislabeling: "P1",
    foreign_object: "P1",
    spoilage_mold: "P1",
    fraud_misrepresentation: "P2",
    service_complaint: "P3",
    other: "P3",
  };

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const createdIncidentIds: string[] = [];

  for (const [category, expectedSev] of Object.entries(SEVERITY_EXPECTED)) {
    const res = await fetch(`${baseUrl}/api/incidents/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        category,
        description: `Test report for ${category} — synthetic test data, please ignore`,
        reporter_email: "smoke-test@homebites-test.com",
        subject_chef_id: testChef.id,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      fail(`category=${category}: API returned ${res.status} - ${json.error}`);
      continue;
    }
    if (json.severity !== expectedSev) {
      fail(`category=${category}: expected severity ${expectedSev}, got ${json.severity}`);
    } else {
      pass(`category=${category} → severity=${json.severity}`);
    }
    createdIncidentIds.push(json.incident_id);
  }
  console.log("");

  // ── TEST 2: Customer-supplied severity is IGNORED ──
  console.log("TEST 2: Customer cannot escalate severity by passing severity field");
  const res2 = await fetch(`${baseUrl}/api/incidents/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: "service_complaint",
      severity: "P0",  // CUSTOMER trying to escalate
      description: "Trying to escalate to P0 by passing severity in body",
      reporter_email: "smoke-test@homebites-test.com",
      subject_chef_id: testChef.id,
    }),
  });
  const json2 = await res2.json();
  if (json2.severity === "P3") {
    pass("Server correctly ignored client severity, assigned P3 from category");
  } else {
    fail(`Expected P3, got ${json2.severity} — client severity bypass!`);
  }
  if (json2.incident_id) createdIncidentIds.push(json2.incident_id);
  console.log("");

  // ── TEST 3: Invalid UUID rejected ──
  console.log("TEST 3: Malformed UUIDs in subject_chef_id are rejected");
  const res3 = await fetch(`${baseUrl}/api/incidents/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: "service_complaint",
      description: "Testing UUID validation with bad data",
      reporter_email: "smoke-test@homebites-test.com",
      subject_chef_id: "not-a-uuid",
    }),
  });
  if (res3.status === 400) {
    pass(`Malformed UUID rejected with 400 (${(await res3.json()).error})`);
  } else {
    fail(`Expected 400 for malformed UUID, got ${res3.status}`);
  }
  console.log("");

  // ── TEST 4: Description min length ──
  console.log("TEST 4: Description under 20 chars is rejected");
  const res4 = await fetch(`${baseUrl}/api/incidents/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      category: "other",
      description: "too short",
      reporter_email: "smoke-test@homebites-test.com",
      subject_chef_id: testChef.id,
    }),
  });
  if (res4.status === 400) {
    pass(`Short description rejected (${(await res4.json()).error})`);
  } else {
    fail(`Expected 400 for short description, got ${res4.status}`);
  }
  console.log("");

  // ── TEST 5: Audit log entries written ──
  console.log("TEST 5: incident_created entries appear in compliance_audit_log");
  const { data: auditEntries } = await supabaseServer
    .from("compliance_audit_log")
    .select("event_type, event_data")
    .eq("event_type", "incident_created")
    .in("event_data->>incident_id", createdIncidentIds)
    .order("created_at", { ascending: false });

  // Note: in operator on JSON path may not work — try a different query
  const { data: allRecent } = await supabaseServer
    .from("compliance_audit_log")
    .select("event_type, event_data, created_at")
    .eq("event_type", "incident_created")
    .order("created_at", { ascending: false })
    .limit(20);

  const matchingEntries = (allRecent ?? []).filter((row: any) =>
    createdIncidentIds.includes(row.event_data?.incident_id)
  );

  if (matchingEntries.length >= createdIncidentIds.length) {
    pass(`Found ${matchingEntries.length} audit entries for ${createdIncidentIds.length} incidents`);
  } else {
    fail(`Expected ${createdIncidentIds.length} audit entries, found ${matchingEntries.length}`);
  }
  console.log("");

  // ── TEST 6: Manual suspension (admin route — simulated direct DB) ──
  console.log("TEST 6: Manual suspension flow (DB-level, simulating admin action)");
  const { error: suspErr } = await supabaseServer
    .from("home_restaurants")
    .update({
      is_active: false,
      suspended_at: new Date().toISOString(),
      suspension_reason: "Smoke test — testing manual suspension flow",
    })
    .eq("id", testChef.id);

  if (suspErr) {
    fail(`Suspension update failed: ${suspErr.message}`);
  } else {
    const { data: after } = await supabaseServer
      .from("home_restaurants")
      .select("suspended_at, suspension_reason, is_active")
      .eq("id", testChef.id)
      .single();
    after?.suspended_at ? pass("suspended_at set") : fail("suspended_at not set");
    after?.is_active === false ? pass("is_active = false") : fail("is_active not false");
  }
  console.log("");

  // ── TEST 7: Reactivation does NOT auto-set is_active=true ──
  console.log("TEST 7: Reactivation clears suspended_at WITHOUT setting is_active=true");
  await supabaseServer
    .from("home_restaurants")
    .update({ suspended_at: null, suspension_reason: null })
    .eq("id", testChef.id);

  const { data: after7 } = await supabaseServer
    .from("home_restaurants")
    .select("suspended_at, suspension_reason, is_active")
    .eq("id", testChef.id)
    .single();

  !after7?.suspended_at ? pass("suspended_at cleared") : fail("suspended_at still set");
  !after7?.suspension_reason ? pass("suspension_reason cleared") : fail("suspension_reason still set");
  // CRITICAL: is_active should NOT be true (trigger blocks compliance failures)
  after7?.is_active === false
    ? pass("is_active still false (correct — DB trigger gates compliance)")
    : fail(`is_active = ${after7?.is_active} — should not auto-flip true`);
  console.log("");

  // ── TEST 8: Cleanup — delete test incidents to keep DB clean ──
  console.log("TEST 8: Cleanup — delete smoke-test incidents");
  if (createdIncidentIds.length > 0) {
    const { error: delErr } = await supabaseServer
      .from("incidents")
      .delete()
      .in("id", createdIncidentIds);
    if (delErr) {
      console.error("  Cleanup warning:", delErr.message);
    } else {
      console.log(`  Deleted ${createdIncidentIds.length} test incidents`);
    }
  }

  // Restore chef original suspension state
  await supabaseServer
    .from("home_restaurants")
    .update({ suspended_at: origSuspended, suspension_reason: null })
    .eq("id", testChef.id);
  console.log("  Test chef restored\n");

  console.log("Note: compliance_audit_log entries from this test persist (append-only).\n");
  console.log(`=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => { console.error(err); process.exit(1); });
