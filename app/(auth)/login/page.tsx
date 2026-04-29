"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { ArrowLeft, ChefHat } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setLoading(false);
    } else {
      window.location.href = "/dashboard";
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        background: "linear-gradient(180deg, var(--hb-bg) 0%, var(--hb-bg-warm) 100%)",
      }}
    >
      <div className="w-full max-w-[420px]">
        <Link
          href="/dashboard/customer"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-5"
          style={{ color: "var(--hb-fg-muted)" }}
        >
          <ArrowLeft size={13} /> Back to browse
        </Link>

        <div
          className="bg-white rounded-3xl p-7 lg:p-8"
          style={{
            border: "1px solid var(--hb-border-soft)",
            boxShadow: "var(--hb-shadow-card)",
          }}
        >
          {/* Logo mark */}
          <div className="flex items-center gap-2.5 mb-6">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-[17px]"
              style={{ background: "var(--hero-gradient)" }}
            >
              H
            </span>
            <span
              className="font-bold text-[20px] tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
            >
              HomeBites
            </span>
          </div>

          <h1
            className="font-bold text-[28px] lg:text-[32px] leading-[1.1] tracking-[-0.025em] mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
          >
            Welcome back
          </h1>
          <p
            className="text-[14px] mb-6"
            style={{ color: "var(--hb-fg-muted)" }}
          >
            Sign in to track orders and revisit your favorite kitchens.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-3"
          >
            <Field
              type="email"
              placeholder="Email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />
            <Field
              type="password"
              placeholder="Password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full font-bold text-[15px] text-white mt-2 transition-colors disabled:opacity-60"
              style={{
                background: "var(--hb-primary)",
                boxShadow: "0 4px 14px -2px rgba(255,122,57,.45)",
              }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {message && (
            <p
              className="text-center text-[13px] mt-3"
              style={{ color: "#991B1B" }}
            >
              {message}
            </p>
          )}

          <div
            className="text-center text-[13px] mt-5"
            style={{ color: "var(--hb-fg-muted)" }}
          >
            New to HomeBites?{" "}
            <Link
              href="/signup"
              className="font-semibold"
              style={{ color: "var(--hb-primary)" }}
            >
              Create an account
            </Link>
          </div>
        </div>

        <Link
          href="/dashboard/customer"
          className="block text-center text-[12.5px] mt-4"
          style={{ color: "var(--hb-fg-subtle)" }}
        >
          Continue as guest →
        </Link>
      </div>
    </div>
  );
}

function Field({
  type = "text",
  placeholder,
  value,
  onChange,
  autoComplete,
}: {
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      autoComplete={autoComplete}
      required
      className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-colors focus:border-[var(--hb-primary)]"
      style={{
        background: "#FBF7F1",
        border: "1px solid var(--hb-border-soft)",
        color: "var(--hb-fg)",
      }}
    />
  );
}
