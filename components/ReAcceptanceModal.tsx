"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface UnacceptedDoc {
  doc_type: string;
  version: string;
  title: string;
}

const DOC_LINKS: Record<string, string> = {
  terms_of_service: "/legal/terms",
  privacy_policy: "/legal/privacy",
  chef_agreement: "/legal/chef-agreement",
};

export default function ReAcceptanceModal() {
  const [unaccepted, setUnaccepted] = useState<UnacceptedDoc[]>([]);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetched, setFetched] = useState(false);

  async function checkAcceptance(token: string) {
    try {
      const res = await fetch("/api/compliance/check-acceptance", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const json = await res.json();
      setUnaccepted(json.unaccepted ?? []);
    } catch {
      // best-effort; modal stays hidden if network fails
    } finally {
      setFetched(true);
    }
  }

  // On mount: check if user is signed in and has unaccepted docs
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || cancelled) {
        setFetched(true);
        return;
      }
      await checkAcceptance(session.access_token);
    })();
    return () => { cancelled = true; };
  }, []);

  // Fix 4: auth state listener — re-check on sign-in; clear on sign-out
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        setChecked(false);
        await checkAcceptance(session.access_token);
      } else if (event === "SIGNED_OUT") {
        setUnaccepted([]);
        setFetched(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Fix 2: scroll lock when modal is visible
  useEffect(() => {
    if (unaccepted.length > 0) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [unaccepted.length]);

  async function handleAccept() {
    if (!checked || submitting) return;
    setSubmitting(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSubmitting(false); return; }

    try {
      await fetch("/api/compliance/log-customer-acceptance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: session.user.id,
          doc_types: unaccepted.map((d) => d.doc_type),
        }),
      });
      setUnaccepted([]);
    } catch {
      // best-effort
    } finally {
      setSubmitting(false);
    }
  }

  if (!fetched || unaccepted.length === 0) return null;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.6)", zIndex: 200 }}
    >
      <div
        className="w-full max-w-[440px] rounded-3xl p-7 bg-white"
        style={{ border: "1px solid var(--hb-border-soft)", boxShadow: "var(--hb-shadow-card)" }}
      >
        <h2
          className="font-bold text-[22px] leading-[1.2] tracking-[-0.02em] mb-2"
          style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
        >
          We&apos;ve updated our policies
        </h2>
        <p className="text-[14px] mb-5" style={{ color: "var(--hb-fg-muted)" }}>
          Please review and accept the updated documents to continue using HomeBites AI.
        </p>

        <ul className="space-y-2 mb-5">
          {unaccepted.map((doc) => (
            <li key={doc.doc_type}>
              <a
                href={DOC_LINKS[doc.doc_type] ?? "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[14px] font-semibold underline"
                style={{ color: "var(--hb-primary)" }}
              >
                {doc.title}
              </a>
              <span className="text-[12px] ml-1.5" style={{ color: "var(--hb-fg-subtle)" }}>
                v{doc.version}
              </span>
            </li>
          ))}
        </ul>

        <label className="flex items-start gap-3 mb-5 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-[var(--hb-primary)] flex-shrink-0"
          />
          <span className="text-[13px] leading-[1.5]" style={{ color: "var(--hb-fg)" }}>
            I have read and agree to the updated{" "}
            {unaccepted.map((d, i) => (
              <span key={d.doc_type}>
                <a
                  href={DOC_LINKS[d.doc_type] ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                  style={{ color: "var(--hb-primary)" }}
                >
                  {d.title}
                </a>
                {i < unaccepted.length - 1 ? " and " : ""}
              </span>
            ))}
            .
          </span>
        </label>

        <button
          onClick={handleAccept}
          disabled={!checked || submitting}
          className="w-full py-3.5 rounded-full font-bold text-[15px] text-white transition-colors disabled:opacity-50"
          style={{
            background: "var(--hb-primary)",
            boxShadow: "0 4px 14px -2px rgba(255,122,57,.45)",
          }}
        >
          {submitting ? "Saving…" : "Accept & Continue"}
        </button>

        {/* Fix 2: sign-out escape hatch */}
        <button
          onClick={() => supabase.auth.signOut()}
          className="block mx-auto text-xs mt-3 underline hover:text-gray-700"
          style={{ color: "var(--hb-fg-subtle)" }}
        >
          Sign out instead
        </button>
      </div>
    </div>
  );
}
