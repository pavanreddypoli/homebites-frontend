"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Info } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName]                   = useState("");
  const [email, setEmail]                 = useState("");
  const [password, setPassword]           = useState("");
  const [confirmPassword, setConfirm]     = useState("");
  const [showPassword, setShowPw]         = useState(false);
  const [showConfirm, setShowCf]          = useState(false);
  const [message, setMessage]             = useState("");
  const [loading, setLoading]             = useState(false);

  async function handleSignup() {
    if (password !== confirmPassword) { setMessage("Passwords don't match."); return; }
    if (password.length < 6) { setMessage("Password must be at least 6 characters."); return; }
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role: "home_restaurant", full_name: name } },
    });

    if (error) { setMessage(error.message); setLoading(false); return; }

    if (data.session) {
      router.push("/dashboard/home-restaurant/onboarding");
    } else {
      setMessage("Account created! Check your inbox to confirm your email, then sign in.");
      setLoading(false);
    }
  }

  const inputClass = "w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-colors";
  const inputStyle = { background: "#FBF7F1", border: "1px solid var(--hb-border-soft)", color: "var(--hb-fg)" };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: "linear-gradient(180deg, var(--hb-bg) 0%, var(--hb-bg-warm) 100%)" }}
    >
      <div className="w-full max-w-[440px]">
        <Link
          href="/dashboard/customer"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-5"
          style={{ color: "var(--hb-fg-muted)" }}
        >
          <ArrowLeft size={13} /> Back to browse
        </Link>

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
            className="font-bold text-[26px] lg:text-[28px] leading-[1.1] tracking-[-0.025em] mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
          >
            Start cooking for your community
          </h1>
          <p className="text-[14px] mb-6" style={{ color: "var(--hb-fg-muted)" }}>
            Join HomeBites as a Home Restaurant
          </p>

          {/* Info card */}
          <div
            className="rounded-2xl p-4 mb-6 flex gap-3"
            style={{ background: "#FFF5EB", border: "1px solid #FFD4A8" }}
          >
            <Info size={18} style={{ color: "#FF7A39", flexShrink: 0, marginTop: 1 }} />
            <div>
              <p className="text-[13px] leading-[1.6]" style={{ color: "#6F6A60" }}>
                You&apos;re creating a HomeBites account to publish and manage your Home Restaurant.
                Once your account is set up, you&apos;ll build your brand — add your restaurant name,
                cuisine, hours, and dishes. Your Home Restaurant page will be visible to customers near you.
              </p>
              <div className="mt-3 space-y-1.5">
                {[
                  { icon: "🏠", text: "Your own branded Home Restaurant page" },
                  { icon: "🍽️", text: "Publish dishes with photos and pricing" },
                  { icon: "📦", text: "Receive and manage orders from customers" },
                ].map(({ icon, text }) => (
                  <div key={text} className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: "#16202B" }}>
                    <span>{icon}</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); handleSignup(); }}
            className="space-y-3"
          >
            <div>
              <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--hb-fg-muted)" }}>
                Your name
              </label>
              <input
                type="text"
                placeholder="e.g. Priya Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
                className={inputClass}
                style={inputStyle}
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--hb-fg-muted)" }}>
                Email address
              </label>
              <input
                type="email"
                placeholder="you@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className={inputClass}
                style={inputStyle}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[12px] font-semibold mb-1" style={{ color: "var(--hb-fg-muted)" }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
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
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p className="text-[11.5px] mt-1.5" style={{ color: "var(--hb-fg-subtle)" }}>
                🔒 Your information is secure and never shared
              </p>
            </div>

            {/* Confirm password */}
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
                className={`${inputClass} pr-11`}
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => setShowCf((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--hb-fg-muted)" }}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-full font-bold text-[15px] text-white mt-2 transition-colors disabled:opacity-60"
              style={{
                background: "var(--hb-primary)",
                boxShadow: "0 4px 14px -2px rgba(255,122,57,.45)",
              }}
            >
              {loading ? "Creating account…" : "Create Home Restaurant Account"}
            </button>
          </form>

          {message && (
            <p
              className="text-center text-[13px] mt-3"
              style={{ color: message.startsWith("Account created") ? "var(--hb-success-ink)" : "#991B1B" }}
            >
              {message}
            </p>
          )}

          <div className="text-center text-[13px] mt-5" style={{ color: "var(--hb-fg-muted)" }}>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold" style={{ color: "var(--hb-primary)" }}>
              Sign in
            </Link>
          </div>
        </div>

        <p className="text-center text-[12.5px] mt-4" style={{ color: "var(--hb-fg-subtle)" }}>
          Want to order food instead?{" "}
          <Link href="/dashboard/customer" className="font-semibold" style={{ color: "var(--hb-fg-muted)" }}>
            Browse as a guest →
          </Link>
        </p>
      </div>
    </div>
  );
}
