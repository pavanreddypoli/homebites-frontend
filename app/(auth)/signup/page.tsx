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
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-indigo-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6 space-y-5">
        <h1 className="text-xl font-bold text-center text-indigo-700">
          Create Your HomeBites Account
        </h1>

        <Input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div>
          <label className="text-sm text-gray-600">Select role</label>
          <select
            className="w-full mt-1 border rounded-md p-2"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="customer">Customer</option>
            <option value="home_restaurant">Home Restaurant</option>
          </select>
        </div>

        <Button
          onClick={handleSignup}
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3"
        >
          {loading ? "Signing up..." : "Sign Up"}
        </Button>

        {message && (
          <p className="text-center text-sm text-red-600">{message}</p>
        )}
      </div>
    </div>
  );
}
