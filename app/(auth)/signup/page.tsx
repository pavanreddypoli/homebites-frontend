"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { role }, // 👈 this is what the trigger reads
      },
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    setMessage("Signup successful! Please check your email to verify.");

    setTimeout(() => {
      window.location.href = "/login";
    }, 1500);
  }

  return (
    <div className="min-h-screen bg-[#FFF5EB] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-4 border border-[#EDE3D2]">
        <div className="text-center">
          <h1 className="text-xl font-bold text-[#16202B]">
            Create Your Account
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Join HomeBites — eat or cook!
          </p>
        </div>

        <Input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-slate-50"
        />

        <Input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-slate-50"
        />

        <div>
          <label className="text-sm font-medium text-[#16202B] block mb-1.5">
            I want to…
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRole("customer")}
              className={`rounded-xl border-2 p-3 text-sm font-medium transition-colors text-left ${
                role === "customer"
                  ? "border-[#FF7A39] bg-[#FF7A39]/5 text-[#FF7A39]"
                  : "border-[#EDE3D2] text-slate-500"
              }`}
            >
              🛒 Order food
              <span className="block text-xs font-normal mt-0.5 opacity-70">
                Browse home cooks
              </span>
            </button>
            <button
              type="button"
              onClick={() => setRole("home_restaurant")}
              className={`rounded-xl border-2 p-3 text-sm font-medium transition-colors text-left ${
                role === "home_restaurant"
                  ? "border-[#FF7A39] bg-[#FF7A39]/5 text-[#FF7A39]"
                  : "border-[#EDE3D2] text-slate-500"
              }`}
            >
              🍳 Become a chef
              <span className="block text-xs font-normal mt-0.5 opacity-70">
                Sell home-cooked meals
              </span>
            </button>
          </div>
        </div>

        <Button
          onClick={handleSignup}
          disabled={loading}
          className="w-full bg-[#FF7A39] hover:bg-[#e06a2e] text-white py-3 border-0"
        >
          {loading ? "Creating account…" : "Sign Up"}
        </Button>

        {message && (
          <p className="text-center text-sm text-red-600">{message}</p>
        )}

        <p className="text-center text-xs text-slate-500">
          Already have an account?{" "}
          <a href="/login" className="text-[#FF7A39] font-medium hover:underline">
            Sign In
          </a>
        </p>
        <p className="text-center text-xs text-slate-400">
          <a href="/dashboard/customer" className="hover:underline">
            ← Continue as guest
          </a>
        </p>
      </div>
    </div>
  );
}
