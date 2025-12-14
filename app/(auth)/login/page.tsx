"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) setMessage(error.message);
    else window.location.href = "/dashboard"; // keep original working redirect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-indigo-900 flex items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-xl p-6 sm:p-8 animate-fadeIn">
        {/* Logo */}
        <div className="flex justify-center mb-3">
          <Image
            src="/homebites-logo.png"
            alt="HomeBites AI"
            width={70}
            height={70}
            className="h-16 w-16"
          />
        </div>

        <h1 className="text-center text-2xl sm:text-3xl font-bold text-indigo-700 mb-1">
          HomeBites AI
        </h1>
        <p className="text-center text-slate-500 text-sm sm:text-base mb-6">
          Welcome back
        </p>

        {/* 🔐 LOGIN FORM (FIXED) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
        >
          {/* Email */}
          <Input
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-slate-50 mb-3 text-sm sm:text-base"
            autoComplete="email"
            required
          />

          {/* Password */}
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-slate-50 mb-4 text-sm sm:text-base"
            autoComplete="current-password"
            required
          />

          {/* Login Button */}
          <Button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-3 shadow-md text-sm sm:text-base"
          >
            Login
          </Button>
        </form>

        {/* Error */}
        {message && (
          <p className="text-center text-red-500 text-xs sm:text-sm mt-2">
            {message}
          </p>
        )}

        {/* Signup Link */}
        <p className="text-center text-xs sm:text-sm text-slate-600 mt-4">
          Don’t have an account?{" "}
          <Link href="/signup" className="text-indigo-600 hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
