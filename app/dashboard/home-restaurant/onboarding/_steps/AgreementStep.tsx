"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ScrollText } from "lucide-react";
import { markdownComponents } from "@/lib/markdownComponents";
import { supabase } from "@/lib/supabaseClient";
import type { HomeRestaurantRow } from "@/lib/compliance";

interface Props {
  accessToken: string;
  onBack: () => void;
  onComplete: (updates: Partial<HomeRestaurantRow>) => void;
}

export default function AgreementStep({ accessToken, onBack, onComplete }: Props) {
  const scrollRef                           = useRef<HTMLDivElement>(null);
  const [doc, setDoc]                       = useState<{ version: string; content_md: string } | null>(null);
  const [loadErr, setLoadErr]               = useState(false);
  const [scrolledToEnd, setScrolledToEnd]   = useState(false);
  const [agreed, setAgreed]                 = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState("");

  useEffect(() => {
    supabase
      .from("legal_documents")
      .select("version, content_md")
      .eq("doc_type", "chef_agreement")
      .is("superseded_at", null)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setLoadErr(true); return; }
        setDoc(data as { version: string; content_md: string });
      });
  }, []);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el || scrolledToEnd) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) setScrolledToEnd(true);
  }

  async function handleContinue() {
    if (!agreed || !doc || saving) return;
    setSaving(true); setError("");
    const res = await fetch("/api/onboarding/accept-agreement", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ version: doc.version }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed to record agreement."); setSaving(false); return; }
    onComplete({
      chef_agreement_accepted_at: new Date().toISOString(),
      chef_agreement_version: doc.version,
    });
  }

  if (loadErr) {
    return (
      <div className="text-center py-8">
        <p className="text-[14px]" style={{ color: "#991B1B" }}>
          Could not load the Chef Agreement. Please refresh and try again.
        </p>
      </div>
    );
  }

  if (!doc) {
    return (
      <p className="text-center py-8 text-[14px] animate-pulse" style={{ color: "var(--hb-fg-muted)" }}>
        Loading agreement…
      </p>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
          style={{ background: "var(--hb-primary)" }}
        >
          <ScrollText size={18} />
        </span>
        <div>
          <h2
            className="text-[20px] font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
          >
            Chef Agreement
          </h2>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--hb-fg-muted)" }}>
            Read the full agreement before accepting — v{doc.version}
          </p>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-y-auto rounded-xl px-5 py-4"
        style={{ maxHeight: 400, border: "1px solid var(--hb-border)", background: "#FAFAF8" }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
          {doc.content_md}
        </ReactMarkdown>
      </div>

      {!scrolledToEnd && (
        <p className="text-center text-[12px]" style={{ color: "var(--hb-fg-subtle)" }}>
          ↓ Scroll to the bottom to enable the checkbox
        </p>
      )}

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          disabled={!scrolledToEnd}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[var(--hb-primary)] flex-shrink-0 disabled:cursor-not-allowed"
        />
        <span
          className="text-[13px] leading-snug"
          style={{ color: scrolledToEnd ? "var(--hb-fg)" : "var(--hb-fg-subtle)" }}
        >
          I have read and agree to the HomeBites AI Chef Agreement (v{doc.version})
        </span>
      </label>

      {error && <p className="text-[13px]" style={{ color: "#991B1B" }}>{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-3 rounded-full text-[13px] font-semibold"
          style={{ color: "var(--hb-fg-muted)", border: "1px solid var(--hb-border)", background: "#fff" }}
        >
          ← Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!agreed || saving}
          className="flex-1 py-3 rounded-full text-[14px] font-semibold text-white disabled:opacity-40"
          style={{ background: "var(--hb-primary)" }}
        >
          {saving ? "Saving…" : "Accept & Continue →"}
        </button>
      </div>
    </div>
  );
}
