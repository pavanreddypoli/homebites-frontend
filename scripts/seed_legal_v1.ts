/**
 * One-time seed: insert v1.0.0 of the three legal documents.
 * Idempotent — skips any (doc_type, version) that already exists.
 *
 * Run: npx ts-node --project tsconfig.json scripts/seed_legal_v1.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

import dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.join(__dirname, "../.env.local") });

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

const DOCS = [
  {
    doc_type: "chef_agreement",
    file: path.join(__dirname, "../docs/legal/01-chef-agreement.md"),
  },
  {
    doc_type: "terms_of_service",
    file: path.join(__dirname, "../docs/legal/02-customer-terms-of-service.md"),
  },
  {
    doc_type: "privacy_policy",
    file: path.join(__dirname, "../docs/legal/03-privacy-policy.md"),
  },
];

const VERSION = "1.0.0";
const EFFECTIVE_AT = "2026-05-05T00:00:00Z";

async function seed() {
  for (const doc of DOCS) {
    const { data: existing } = await supabase
      .from("legal_documents")
      .select("id")
      .eq("doc_type", doc.doc_type)
      .eq("version", VERSION)
      .maybeSingle();

    if (existing) {
      console.log(`Skip  ${doc.doc_type} v${VERSION} — already seeded`);
      continue;
    }

    const content_md = fs.readFileSync(doc.file, "utf-8");

    const { error } = await supabase.from("legal_documents").insert({
      doc_type: doc.doc_type,
      version: VERSION,
      content_md,
      effective_at: EFFECTIVE_AT,
    });

    if (error) {
      console.error(`Failed to seed ${doc.doc_type}:`, error.message);
      process.exit(1);
    }

    console.log(`Seeded ${doc.doc_type} v${VERSION}`);
  }

  console.log("Done.");
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
