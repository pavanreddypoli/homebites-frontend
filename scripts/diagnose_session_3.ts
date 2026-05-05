import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

// Inline client so dotenv runs before supabase-js reads env vars
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

async function run() {
  // Step 1: Get latest users (sorted by created_at desc)
  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 5 });
  if (usersError) { console.error("listUsers failed:", JSON.stringify(usersError)); return; }
  const users = usersData?.users ?? [];
  if (users.length === 0) { console.error("No users found"); return; }

  // sort descending by created_at
  users.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const user = users[0];
  console.log("Latest user:", user.id, user.email, "| confirmed:", user.email_confirmed_at ?? "NOT CONFIRMED");

  // Step 2: POST to the live API with that user_id
  console.log("\n--- POSTing to live API ---");
  const res = await fetch("https://homebitesai.com/api/compliance/log-customer-acceptance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: user.id, doc_types: ["terms_of_service", "privacy_policy"] }),
  });
  console.log("API status:", res.status);
  console.log("API body:", await res.text());

  // Step 3: Verify audit log
  console.log("\n--- Audit log (last 5 customer_terms_accepted rows) ---");
  const { data: log, error: logErr } = await supabase
    .from("compliance_audit_log")
    .select("user_id, event_type, event_data, ip_address, created_at")
    .eq("event_type", "customer_terms_accepted")
    .order("created_at", { ascending: false })
    .limit(5);
  if (logErr) { console.error("log query failed:", JSON.stringify(logErr)); return; }
  console.log("Audit log entries:", JSON.stringify(log, null, 2));
}

run().catch(console.error);
