import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

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

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-3xl font-bold text-gray-900 mb-6 mt-2">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold text-gray-900 mt-10 mb-3 border-b border-gray-100 pb-2">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-gray-900 mt-6 mb-2">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="text-gray-700 leading-relaxed mb-4">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="list-disc pl-6 mb-4 space-y-1 text-gray-700">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal pl-6 mb-4 space-y-1 text-gray-700">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-orange-400 pl-4 py-1 my-4 text-gray-600 italic bg-orange-50 rounded-r">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-8 border-gray-200" />,
  // Checkboxes are read-only on legal pages — click-through acceptance is Session 3
  input: ({ type, checked }) =>
    type === "checkbox" ? (
      <input
        type="checkbox"
        checked={checked ?? false}
        disabled
        readOnly
        className="mr-2 align-middle accent-orange-500 cursor-not-allowed"
      />
    ) : null,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-orange-600 underline hover:text-orange-700"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
};

export default async function LegalDocPage({ docType }: { docType: string }) {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("legal_documents")
    .select("doc_type, version, content_md, effective_at")
    .eq("doc_type", docType)
    .is("superseded_at", null)
    .single();

  // TEMP DIAGNOSTIC — remove after issue resolved
  console.log("[LegalDocPage]", {
    docType,
    hasData: !!data,
    error: error?.message,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + "...",
    keyPresent: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });

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
