"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [message, setMessage]     = useState("");
  const [loading, setLoading]     = useState(false);

  async function handleLogin() {
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setMessage(error.message); setLoading(false); return; }
    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.user_metadata?.role;
    window.location.href = role === "home_restaurant"
      ? "/dashboard/home-restaurant"
      : "/dashboard/customer";
  }

  const inputClass = "w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-colors";
  const inputStyle = { background: "#FBF7F1", border: "1px solid var(--hb-border-soft)", color: "var(--hb-fg)" };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(180deg, var(--hb-bg) 0%, var(--hb-bg-warm) 100%)" }}
    >
      <div className="w-full max-w-[420px]">
        <div
          className="bg-white rounded-3xl p-7 lg:p-8"
          style={{ border: "1px solid var(--hb-border-soft)", boxShadow: "var(--hb-shadow-card)" }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-6">
            <span
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-[17px]"
              style={{ background: "var(--hero-gradient)" }}
            >H</span>
            <span
              className="font-bold text-[20px] tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
            >HomeBites</span>
          </div>

          <h1
            className="font-bold text-[28px] lg:text-[32px] leading-[1.1] tracking-[-0.025em] mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
          >
            Welcome back to HomeBites
          </h1>
          <p className="text-[14px] mb-6" style={{ color: "var(--hb-fg-muted)" }}>
            Sign in to your Home Restaurant
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); handleLogin(); }}
            className="space-y-3"
          >
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className={inputClass}
              style={inputStyle}
            />

            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className={`${inputClass} pr-11`}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--hb-fg-muted)" }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="text-right">
              <button
                type="button"
                className="text-[12.5px] font-medium"
                style={{ color: "var(--hb-fg-subtle)" }}
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full font-bold text-[15px] text-white mt-1 transition-colors disabled:opacity-60"
              style={{
                background: "var(--hb-primary)",
                boxShadow: "0 4px 14px -2px rgba(255,122,57,.45)",
              }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {message && (
            <p className="text-center text-[13px] mt-3" style={{ color: "#991B1B" }}>{message}</p>
          )}

          <div className="text-center text-[13px] mt-5" style={{ color: "var(--hb-fg-muted)" }}>
            New Home Restaurant?{" "}
            <Link href="/signup" className="font-semibold" style={{ color: "var(--hb-primary)" }}>
              Create your account →
            </Link>
          </div>
        </div>

        <p className="text-center text-[12.5px] mt-4" style={{ color: "var(--hb-fg-subtle)" }}>
          Just want to order?{" "}
          <Link href="/dashboard/customer" className="font-semibold" style={{ color: "var(--hb-fg-muted)" }}>
            Browse as a guest →
          </Link>
        </p>
      </div>
    </div>
  );
}
