import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "@/lib/markdownComponents";

interface Props {
  content: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export default function MarkdownPageLayout({ content, ctaLabel, ctaHref }: Props) {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-gray-200 px-6 py-4">
        <Link href="/" className="text-lg font-bold text-orange-500 hover:text-orange-600">
          HomeBites AI
        </Link>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">
        <article>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {content}
          </ReactMarkdown>
        </article>

        {ctaLabel && ctaHref && (
          <div className="mt-12 pt-8 border-t border-gray-200 text-center">
            <Link
              href={ctaHref}
              className="inline-block px-8 py-3 rounded-full font-bold text-white"
              style={{ background: "var(--hb-primary)", boxShadow: "0 4px 14px -2px rgba(255,122,57,.45)" }}
            >
              {ctaLabel}
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
