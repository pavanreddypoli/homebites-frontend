import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getUnacceptedLegalDocs } from "@/lib/compliance";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: { user }, error } = await supabaseServer.auth.getUser(token);
  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const unaccepted = await getUnacceptedLegalDocs(user.id);

  // Fix 1: filter to customer-facing docs only (terms + privacy); exclude chef_agreement
  const customerFacingDocs = unaccepted.filter(
    (doc) => doc.doc_type === "terms_of_service" || doc.doc_type === "privacy_policy"
  );

  return NextResponse.json({
    unaccepted: customerFacingDocs.map(({ doc_type, version, title }) => ({
      doc_type,
      version,
      title,
    })),
  });
}
