import { supabaseServer } from "@/lib/supabaseServer";

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
