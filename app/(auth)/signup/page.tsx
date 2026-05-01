"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, ChefHat } from "lucide-react";

export default function SignupPage() {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]       = useState<"customer" | "home_restaurant">("customer");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSignup() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { role, full_name: name } },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => { window.location.href = "/login"; }, 2000);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        background: "linear-gradient(180deg, var(--hb-bg) 0%, var(--hb-bg-warm) 100%)",
      }}
    >
      <div className="w-full max-w-[460px]">
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
            className="font-bold text-[26px] lg:text-[30px] leading-[1.1] tracking-[-0.025em] mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
          >
            Join the table
          </h1>
          <p className="text-[14px] mb-6" style={{ color: "var(--hb-fg-muted)" }}>
            Eat home-cooked food, or share your kitchen with the neighborhood.
          </p>

          {/* Role picker — large visual cards */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            <RoleCard
              active={role === "customer"}
              onClick={() => setRole("customer")}
              icon={<ShoppingBag size={22} />}
              title="I want to order food"
              subtitle="Browse & order from home cooks near you"
            />
            <RoleCard
              active={role === "home_restaurant"}
              onClick={() => setRole("home_restaurant")}
              icon={<ChefHat size={22} />}
              title="I want to cook and sell"
              subtitle="Set up your kitchen and start earning"
            />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSignup();
            }}
            className="space-y-3"
          >
            <Field
              type="text"
              placeholder="Full name"
              value={name}
              onChange={setName}
              autoComplete="name"
            />
            <Field
              type="email"
              placeholder="Email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />
            <Field
              type="password"
              placeholder="Password (min. 6 characters)"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
            />

            <button
              type="submit"
              disabled={loading || success}
              className="w-full py-3.5 rounded-full font-bold text-[15px] text-white mt-2 transition-colors disabled:opacity-60"
              style={{
                background: success ? "var(--hb-success)" : "var(--hb-primary)",
                boxShadow: "0 4px 14px -2px rgba(255,122,57,.45)",
              }}
            >
              {success
                ? "Account created — check your inbox →"
                : loading
                ? "Creating account…"
                : "Create account"}
            </button>
          </form>

          {message && !success && (
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
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-semibold"
              style={{ color: "var(--hb-primary)" }}
            >
              Sign in
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

function RoleCard({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left p-4 rounded-2xl transition-all"
      style={{
        background: active ? "var(--hb-primary-soft)" : "#FBF7F1",
        border: active ? "2px solid var(--hb-primary)" : "2px solid transparent",
        outline: "none",
      }}
    >
      <span
        className="flex items-center justify-center w-10 h-10 rounded-xl mb-3"
        style={{
          background: active ? "var(--hb-primary)" : "#F0EBE3",
          color: active ? "#fff" : "var(--hb-fg-muted)",
        }}
      >
        {icon}
      </span>
      <span
        className="block text-[13.5px] font-bold leading-snug mb-1"
        style={{ color: active ? "var(--hb-fg)" : "var(--hb-fg)" }}
      >
        {title}
      </span>
      <span
        className="block text-[11.5px] leading-snug"
        style={{ color: active ? "#C24B12" : "var(--hb-fg-subtle)" }}
      >
        {subtitle}
      </span>
    </button>
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
      className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-colors"
      style={{
        background: "#FBF7F1",
        border: "1px solid var(--hb-border-soft)",
        color: "var(--hb-fg)",
      }}
    />
  );
}
