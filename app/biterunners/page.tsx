"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { ArrowLeft } from "lucide-react";

export default function BiteRunnersPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: insertError } = await supabase
      .from("waitlist")
      .insert({ email: email.trim().toLowerCase(), list: "biterunners" });

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

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg text-center">
          <div
            className="inline-flex items-center gap-2 bg-white rounded-full px-3.5 py-1.5 text-[12px] font-semibold mb-6"
            style={{
              border: "1px solid rgba(11,19,28,.06)",
              color: "var(--hb-primary)",
              boxShadow: "var(--hb-shadow-soft)",
            }}
          >
            🚴 Coming Soon
          </div>

          <h1
            className="text-[44px] sm:text-[56px] font-bold tracking-tight leading-[1.06] mb-4"
            style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
          >
            BiteRunners
          </h1>

          <p
            className="text-[16px] lg:text-[18px] leading-[1.55] mb-8 max-w-[460px] mx-auto"
            style={{ color: "var(--hb-fg-muted)" }}
          >
            Become a community courier. Earn by delivering home-cooked meals from neighborhood kitchens to local foodies. Flexible hours, hyper-local routes.
          </p>

          {submitted ? (
            <div
              className="rounded-2xl px-6 py-5 text-[15px] font-semibold"
              style={{ background: "#F0FDF4", border: "1px solid #86EFAC", color: "#15803D" }}
            >
              Thanks — we&apos;ll email you when BiteRunners launches.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
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
      </main>
    </div>
  );
}
