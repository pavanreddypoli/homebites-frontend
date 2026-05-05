"use client";

import { useState } from "react";
import { ShieldCheck, ExternalLink } from "lucide-react";

const QUESTIONS = [
  "I am an individual Texas resident cooking from my own home kitchen.",
  "I will not sell more than $150,000 in cottage foods this year (across all platforms).",
  "I will not list any meat, poultry, seafood, ice cream, raw milk, low-acid canned goods, or CBD/THC items.",
  "I have, or will obtain, a Texas DSHS-accredited food handler certification before listing.",
];

interface Props {
  accessToken: string;
  onComplete: () => void;
}

export default function EligibilityStep({ accessToken, onComplete }: Props) {
  const [answers, setAnswers] = useState<(boolean | null)[]>([null, null, null, null]);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  const allYes      = answers.every((a) => a === true);
  const anyNo       = answers.some((a) => a === false);
  const allAnswered = answers.every((a) => a !== null);

  function setAnswer(i: number, val: boolean) {
    setAnswers((prev) => { const n = [...prev]; n[i] = val; return n; });
  }

  async function handleContinue() {
    if (!allYes || saving) return;
    setSaving(true); setError("");
    const res = await fetch("/api/onboarding/attest-eligibility", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ answers }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed to save. Please try again."); setSaving(false); return; }
    onComplete();
  }

  if (anyNo) {
    return (
      <div className="space-y-4">
        <div className="text-center py-2">
          <div className="text-4xl mb-3">😔</div>
          <h2
            className="text-[20px] font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
          >
            HomeBites AI may not be the right fit yet
          </h2>
          <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "var(--hb-fg-muted)" }}>
            HomeBites AI operates exclusively under the Texas Cottage Food Law (SB 541), which has
            specific eligibility requirements. Based on your answers, you may not currently qualify.
          </p>
        </div>

        <a
          href="https://texascottagefoodlaw.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-[13px] font-semibold"
          style={{ background: "#FFF5EB", color: "var(--hb-primary)", border: "1.5px solid var(--hb-primary)" }}
        >
          <ExternalLink size={14} /> Learn about Texas Cottage Food Law
        </a>

        <a
          href="mailto:support@homebitesai.com?subject=Onboarding%20Question"
          className="block text-center text-[13px] font-semibold underline"
          style={{ color: "var(--hb-fg-muted)" }}
        >
          Contact support
        </a>

        <button
          onClick={() => setAnswers([null, null, null, null])}
          className="w-full text-center text-[12px] py-1"
          style={{ color: "var(--hb-fg-subtle)" }}
        >
          ← Start over
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
          style={{ background: "var(--hb-primary)" }}
        >
          <ShieldCheck size={18} />
        </span>
        <div>
          <h2
            className="text-[20px] font-bold tracking-tight leading-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
          >
            Are you eligible to sell on HomeBites AI?
          </h2>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--hb-fg-muted)" }}>
            Texas Cottage Food Law lets individuals sell home-cooked food without a commercial kitchen — with limits.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {QUESTIONS.map((q, i) => (
          <div
            key={i}
            className="rounded-xl p-4 space-y-3"
            style={{ background: "#F9F6F2", border: "1px solid var(--hb-border-soft)" }}
          >
            <p className="text-[13px] font-medium leading-snug" style={{ color: "var(--hb-fg)" }}>
              {i + 1}. {q}
            </p>
            <div className="flex gap-3">
              {([true, false] as const).map((val) => (
                <label
                  key={String(val)}
                  className="flex items-center gap-2 cursor-pointer px-4 py-2 rounded-full text-[13px] font-semibold transition-all"
                  style={{
                    background: answers[i] === val ? (val ? "var(--hb-primary)" : "#991B1B") : "#fff",
                    color: answers[i] === val ? "#fff" : "var(--hb-fg-muted)",
                    border: `1.5px solid ${answers[i] === val ? (val ? "var(--hb-primary)" : "#991B1B") : "var(--hb-border)"}`,
                  }}
                >
                  <input
                    type="radio"
                    name={`q${i}`}
                    className="sr-only"
                    checked={answers[i] === val}
                    onChange={() => setAnswer(i, val)}
                  />
                  {val ? "Yes" : "No"}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-[13px]" style={{ color: "#991B1B" }}>{error}</p>}

      <button
        onClick={handleContinue}
        disabled={!allAnswered || !allYes || saving}
        className="w-full py-3.5 rounded-full font-bold text-[15px] text-white transition-colors disabled:opacity-40"
        style={{
          background: "var(--hb-primary)",
          boxShadow: allYes ? "0 4px 14px -2px rgba(255,122,57,.45)" : "none",
        }}
      >
        {saving ? "Saving…" : "Confirm & Continue →"}
      </button>

      {allAnswered && !allYes && (
        <p className="text-center text-[12px]" style={{ color: "#991B1B" }}>
          All four questions must be answered Yes to proceed.
        </p>
      )}
    </div>
  );
}
