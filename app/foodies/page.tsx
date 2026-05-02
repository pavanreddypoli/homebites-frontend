"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft, Search } from "lucide-react";

export default function FoodiesPage() {
  const router = useRouter();

  // Section 1 — order tracker
  const [trackEmail, setTrackEmail] = useState("");

  // Section 2 — waitlist
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = trackEmail.trim();
    if (!trimmed) return;
    router.push(`/dashboard/customer/orders?email=${encodeURIComponent(trimmed)}`);
  }

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: insertError } = await supabase
      .from("waitlist")
      .insert({ email: email.trim().toLowerCase(), list: "foodies" });

    if (insertError) {
      if (insertError.code === "23505") {
        setSubmitted(true);
      } else {
        setError("Something went wrong. Please try again.");
      }
      setLoading(false);
      return;
    }

    setSubmitted(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--hb-bg)" }}>
      <header className="px-4 lg:px-8 py-5">
        <button
          onClick={() => router.push("/dashboard/customer")}
          className="flex items-center gap-2 text-[13px] font-semibold transition-opacity hover:opacity-70"
          style={{ color: "var(--hb-fg-muted)" }}
        >
          <ArrowLeft size={15} />
          Back to HomeBites
        </button>
      </header>

      <main className="flex-1 px-4 py-8 lg:py-12">
        <div className="w-full max-w-lg mx-auto space-y-6">

          {/* ── Section 1: Free order tracker ── */}
          <div
            className="bg-white rounded-2xl p-6 lg:p-8"
            style={{
              border: "1px solid var(--hb-border-soft)",
              borderLeft: "4px solid #16A34A",
              boxShadow: "var(--hb-shadow-soft)",
            }}
          >
            <div
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold mb-4"
              style={{ background: "#F0FDF4", color: "#15803D" }}
            >
              ✓ Free · No signup needed
            </div>

            <h2
              className="text-[26px] font-bold tracking-tight mb-2"
              style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
            >
              Track Your Orders
            </h2>
            <p className="text-[14px] mb-5" style={{ color: "var(--hb-fg-muted)" }}>
              Enter the email used at checkout to see your order status.
            </p>

            <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={trackEmail}
                onChange={(e) => setTrackEmail(e.target.value)}
                className="flex-1 px-4 py-3 rounded-full text-[14px] outline-none"
                style={{
                  background: "#F9F6F2",
                  border: "1px solid var(--hb-border)",
                  color: "var(--hb-fg)",
                }}
              />
              <button
                type="submit"
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-full text-[14px] font-semibold text-white whitespace-nowrap transition-colors"
                style={{ background: "#16A34A" }}
              >
                <Search size={14} />
                Find my orders
              </button>
            </form>
          </div>

          {/* ── Divider ── */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: "var(--hb-border-soft)" }} />
            <span className="text-[12px] font-semibold px-1" style={{ color: "var(--hb-fg-subtle)" }}>
              or
            </span>
            <div className="flex-1 h-px" style={{ background: "var(--hb-border-soft)" }} />
          </div>

          {/* ── Section 2: Foodies Premium waitlist ── */}
          <div
            className="rounded-2xl p-6 lg:p-8 text-center"
            style={{
              background: "linear-gradient(135deg, #FFF8F3 0%, #FFF1E3 100%)",
              border: "1px solid #FFE1C7",
              boxShadow: "var(--hb-shadow-soft)",
            }}
          >
            <div
              className="inline-flex items-center gap-2 bg-white rounded-full px-3.5 py-1.5 text-[12px] font-semibold mb-5"
              style={{
                border: "1px solid rgba(11,19,28,.06)",
                color: "var(--hb-primary)",
                boxShadow: "var(--hb-shadow-soft)",
              }}
            >
              ✨ Coming Soon
            </div>

            <h1
              className="text-[36px] sm:text-[44px] font-bold tracking-tight leading-[1.06] mb-3"
              style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
            >
              Foodies
            </h1>

            <p
              className="text-[15px] lg:text-[16px] leading-[1.55] mb-6 max-w-[400px] mx-auto"
              style={{ color: "var(--hb-fg-muted)" }}
            >
              Premium AI-powered features for food lovers. Plan your meals, discover chefs matched to your taste, build custom meals across kitchens — all coming soon.
            </p>

            {submitted ? (
              <div
                className="rounded-2xl px-6 py-5 text-[15px] font-semibold"
                style={{ background: "#F0FDF4", border: "1px solid #86EFAC", color: "#15803D" }}
              >
                Thanks — we&apos;ll email you when Foodies launches.
              </div>
            ) : (
              <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                <input
                  type="email"
                  required
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-full text-[14px] outline-none"
                  style={{
                    background: "#fff",
                    border: "1px solid var(--hb-border)",
                    color: "var(--hb-fg)",
                  }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 rounded-full text-[14px] font-semibold text-white whitespace-nowrap transition-colors"
                  style={{ background: loading ? "var(--hb-fg-subtle)" : "var(--hb-primary)" }}
                >
                  {loading ? "Joining…" : "Join the waitlist"}
                </button>
              </form>
            )}

            {error && (
              <p className="mt-3 text-[13px] text-red-600">{error}</p>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
