import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "@/lib/markdownComponents";

interface LegalDoc {
  doc_type: string;
  version: string;
  content_md: string;
  effective_at: string;
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export default async function LegalDocPage({ docType }: { docType: string }) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("legal_documents")
    .select("doc_type, version, content_md, effective_at")
    .eq("doc_type", docType)
    .is("superseded_at", null)
    .single();

  const effectiveDate = data
    ? new Date((data as LegalDoc).effective_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-200 px-6 py-4">
        <Link
          href="/"
          className="text-lg font-bold text-orange-500 hover:text-orange-600"
        >
          HomeBites AI
        </Link>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        {error || !data ? (
          <p className="text-gray-500 text-center py-20">
            This document is not currently available.
          </p>
        ) : (
          <>
            <div className="text-sm text-gray-400 mb-8 pb-4 border-b border-gray-100">
              <span className="font-medium text-gray-600">
                Version {(data as LegalDoc).version}
              </span>
              <span className="mx-2">·</span>
              <span>Effective {effectiveDate}</span>
            </div>
            <article>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {(data as LegalDoc).content_md}
              </ReactMarkdown>
            </article>
          </>
        )}
      </main>
    </div>
  );
}
