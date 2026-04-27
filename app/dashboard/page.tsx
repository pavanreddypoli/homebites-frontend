"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  useEffect(() => {
    async function redirectUser() {
      // 1️⃣ Get logged-in user
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const role = user.user_metadata?.role;

      // 2️⃣ If Home Restaurant, check onboarding completion
      if (role === "home_restaurant") {
        const { data: restaurant, error } = await supabase
          .from("home_restaurants")
          .select("is_active")
          .eq("user_id", user.id)
          .single();

        // If no row OR onboarding not completed → onboarding
        if (error || !restaurant || restaurant.is_active !== true) {
          window.location.href =
            "/dashboard/home-restaurant/onboarding";
          return;
        }

        // Onboarding complete → dashboard
        window.location.href = "/dashboard/home-restaurant";
        return;
      }

      // 3️⃣ Customer flow
      window.location.href = "/dashboard/customer";
    }

    redirectUser();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-900 text-white">
      Redirecting...
    </div>
  );
}
