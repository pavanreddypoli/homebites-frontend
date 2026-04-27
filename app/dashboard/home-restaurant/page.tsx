"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import NavBar from "./NavBar";

export default function HomeRestaurantDashboard() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkProfile() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      // Check if their profile exists in home_restaurants table
      const { data, error } = await supabase
        .from("home_restaurants")
        .select("id")
        .eq("id", user.id)
        .single();

      // If no profile → send to onboarding
      if (!data || error) {
        window.location.href = "/dashboard/home-restaurant/onboarding";
        return;
      }

      setLoading(false);
    }

    checkProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-indigo-900 flex items-center justify-center text-white">
        <p className="text-lg animate-pulse">Loading your restaurant...</p>
      </div>
    );
  }

  // ---------- ACTUAL DASHBOARD UI (unchanged) ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-indigo-900 p-10 text-white">
      <NavBar />
      <h1 className="text-3xl font-bold mb-2">🍽️ Your Home Restaurant</h1>
      <p className="text-indigo-200 mb-8">
        Manage your dishes, earnings, and AI tools.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">

        <div className="bg-white text-black rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-2">Menu</h2>
          <p className="text-slate-600 mb-4">Create and edit your dishes.</p>
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg"
            onClick={() =>
              (window.location.href = "/dashboard/home-restaurant/add-item")
            }
          >
            Add Menu Item
          </Button>
        </div>

        <div className="bg-white text-black rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-2">AI Tools</h2>
          <p className="text-slate-600 mb-4">
            Smart pricing & recommendations.
          </p>
          <Button
            variant="outline"
            className="w-full border-indigo-600 text-indigo-600 hover:bg-indigo-50 py-3 rounded-lg"
          >
            Coming Soon
          </Button>
        </div>

        <div className="bg-white text-black rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold mb-2">My Menu Items</h2>
          <p className="text-slate-600 mb-4">
            View, edit, and manage all your dishes.
          </p>
          <Button
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg"
            onClick={() =>
            (window.location.href = "/dashboard/home-restaurant/menu")
            }
         >
            View Menu
          </Button>
        </div>

      </div>
    </div>
  );
}
