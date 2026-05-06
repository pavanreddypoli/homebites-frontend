"use client";

import { useState } from "react";
import { Tag } from "lucide-react";
import type { HomeRestaurantRow } from "@/lib/compliance";

interface Props {
  accessToken: string;
  onBack: () => void;
  onComplete: (updates: Partial<HomeRestaurantRow>) => void;
}

export default function LabelingStep({ accessToken, onBack, onComplete }: Props) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");

  async function handleContinue() {
    if (!acknowledged || saving) return;
    setSaving(true); setError("");

    const res = await fetch("/api/onboarding/acknowledge-labeling", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed to save. Please try again."); setSaving(false); return; }

    onComplete({ labeling_acknowledged_at: new Date().toISOString() });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
          style={{ background: "var(--hb-primary)" }}
        >
          <Tag size={18} />
        </span>
        <div>
          <h2
            className="text-[20px] font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
          >
            Labeling your dishes
          </h2>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--hb-fg-muted)" }}>
            Texas Cottage Food Law requires every food item you sell to carry a specific label.
            We&apos;ll generate these PDFs for you automatically — you just print and stick.
          </p>
        </div>
      </div>

      {/* Label preview mockup */}
      <div>
        <p
          className="text-[11px] font-semibold uppercase tracking-wide mb-2"
          style={{ color: "var(--hb-fg-subtle)" }}
        >
          What your label looks like
        </p>
        <div
          className="rounded-xl p-4 font-mono text-[11px] leading-relaxed"
          style={{ background: "#FAFAF8", border: "1.5px solid var(--hb-border)" }}
        >
          <p className="text-[9px] mb-2" style={{ color: "#888" }}>
            HomeBites AI · Order #A1B2C3D4
          </p>
          <p className="font-bold text-[12px]" style={{ color: "#1a1a1a" }}>
            Anita&apos;s Kitchen
          </p>
          <p className="mb-2" style={{ color: "#555" }}>Celina, TX</p>
          <p className="font-bold text-[13px] mb-1" style={{ color: "#1a1a1a" }}>
            Vegetable Biryani
          </p>
          <p className="mb-1" style={{ color: "#333" }}>
            <span className="font-bold">CONTAINS: </span>milk, wheat
          </p>
          <p className="mb-3" style={{ color: "#333" }}>Made: 2026-05-10</p>
          <div
            className="p-2 text-center font-bold text-[10px] leading-snug"
            style={{ border: "1px solid #000", color: "#000" }}
          >
            THIS PRODUCT WAS PRODUCED IN A PRIVATE RESIDENCE THAT IS NOT SUBJECT TO GOVERNMENTAL
            LICENSING OR INSPECTION.
          </div>
        </div>
      </div>

      {/* Info card */}
      <div
        className="rounded-xl p-4 space-y-2"
        style={{ background: "#F0F9FF", border: "1px solid #BAE6FD" }}
      >
        {[
          "Every order generates label PDFs automatically — no extra work.",
          "You print and attach one label to each item before pickup.",
          "We handle all the legally required disclaimer text.",
          "You’re responsible for accurate labeling — we provide the tool, not the verification.",
        ].map((line, i) => (
          <p
            key={i}
            className="flex gap-2 text-[12.5px] leading-snug"
            style={{ color: "#0369A1" }}
          >
            <span className="flex-shrink-0 font-bold">{i + 1}.</span>
            {line}
          </p>
        ))}
      </div>

      {/* Checkbox */}
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[var(--hb-primary)] flex-shrink-0"
        />
        <span className="text-[13px] leading-snug" style={{ color: "var(--hb-fg)" }}>
          I understand I will print and attach a label to every order I prepare, and that accurate
          labeling (especially allergens) is my responsibility.
        </span>
      </label>

      {error && <p className="text-[13px]" style={{ color: "#991B1B" }}>{error}</p>}

      {/* Buttons */}
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
          disabled={!acknowledged || saving}
          className="flex-1 py-3 rounded-full text-[14px] font-semibold text-white disabled:opacity-40"
          style={{ background: "var(--hb-primary)" }}
        >
          {saving ? "Saving…" : "Acknowledge & Continue →"}
        </button>
      </div>
    </div>
  );
}
