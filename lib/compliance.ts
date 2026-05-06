import { supabaseServer } from "@/lib/supabaseServer";

// ─── Customer acceptance helpers (Session 3) ─────────────────────────────────

interface UnacceptedDoc {
  doc_type: string;
  version: string;
  title: string;
}

export async function getUnacceptedLegalDocs(userId: string): Promise<UnacceptedDoc[]> {
  const { data: liveDocs, error: liveError } = await supabaseServer
    .from("legal_documents")
    .select("doc_type, version")
    .is("superseded_at", null);

  if (liveError || !liveDocs || liveDocs.length === 0) return [];

  const { data: accepted } = await supabaseServer
    .from("compliance_audit_log")
    .select("event_data")
    .eq("user_id", userId)
    .eq("event_type", "customer_terms_accepted");

  const acceptedSet = new Set(
    (accepted ?? []).map((r: { event_data: { doc_type?: string; version?: string } }) =>
      `${r.event_data?.doc_type}:${r.event_data?.version}`
    )
  );

  const titles: Record<string, string> = {
    terms_of_service: "Terms of Service",
    privacy_policy: "Privacy Policy",
    chef_agreement: "Chef Agreement",
  };

  return liveDocs
    .filter((doc) => !acceptedSet.has(`${doc.doc_type}:${doc.version}`))
    .map((doc) => ({
      doc_type: doc.doc_type,
      version: doc.version,
      title: titles[doc.doc_type] ?? doc.doc_type,
    }));
}

// ─── Chef onboarding step calculation (Session 4) ────────────────────────────

export interface HomeRestaurantRow {
  id: string;
  name: string | null;
  cuisine: string | null;
  description: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  hours: string | null;
  delivery_radius_km: number | null;
  notification_email: string | null;
  is_active: boolean | null;
  sells_tcs_foods: boolean | null;
  dshs_registration_id: string | null;
  cottage_food_attestation_at: string | null;
  food_handler_cert_url: string | null;
  food_handler_cert_expires_at: string | null;
  chef_agreement_accepted_at: string | null;
  chef_agreement_version: string | null;
  chef_agreement_ip: string | null;
  stripe_payouts_enabled: boolean | null;
  labeling_acknowledged_at: string | null;
}

export type OnboardingStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | "complete";

export function calculateOnboardingStep(row: HomeRestaurantRow): OnboardingStep {
  if (!row.cottage_food_attestation_at) return 1;
  if (!row.name || !row.lat || !row.lng) return 2;
  if (!row.food_handler_cert_url || !row.food_handler_cert_expires_at) return 3;
  if (!row.chef_agreement_accepted_at) return 4;
  if (!row.labeling_acknowledged_at) return 5;
  if (!row.stripe_payouts_enabled) return 6;
  if (!row.is_active) return 7;
  return "complete";
}
