"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    async function redirectUser() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (!user) {
        router.replace("/login");
        return;
      }

      const role = user.user_metadata?.role;

      if (role === "home_restaurant") {
        const { data: restaurant, error } = await supabase
          .from("home_restaurants")
          .select("is_active")
          .eq("user_id", user.id)
          .single();

        if (error || !restaurant || restaurant.is_active !== true) {
          router.replace("/dashboard/home-restaurant/onboarding");
          return;
        }

        router.replace("/dashboard/home-restaurant");
        return;
      }

      router.replace("/dashboard/customer");
    }

    redirectUser();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-900 text-white">
      Redirecting...
    </div>
  );
}
