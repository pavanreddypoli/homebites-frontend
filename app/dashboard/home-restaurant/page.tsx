"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ChefNav from "@/components/ChefNav";
import { UtensilsCrossed, Sparkles, ClipboardList } from "lucide-react";

export default function HomeRestaurantDashboard() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      const { data, error } = await supabase
        .from("home_restaurants")
        .select("id")
        .eq("id", user.id)
        .single();

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--hb-bg)" }}>
        <p className="text-[15px] animate-pulse" style={{ color: "var(--hb-fg-muted)" }}>
          Loading your restaurant…
        </p>
      </div>
    );
  }

  const cards = [
    {
      Icon: UtensilsCrossed,
      title: "Menu",
      desc: "Create and manage your dishes.",
      action: "Add Dish",
      href: "/dashboard/home-restaurant/add-item",
      secondary: "View Menu",
      secondaryHref: "/dashboard/home-restaurant/menu",
    },
    {
      Icon: ClipboardList,
      title: "Orders",
      desc: "View and manage incoming orders.",
      action: "Open Orders",
      href: "/dashboard/home-restaurant/orders",
    },
    {
      Icon: Sparkles,
      title: "AI Tools",
      desc: "Smart pricing & recommendations.",
      action: "Coming Soon",
      href: "#",
      disabled: true,
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--hb-bg)" }}>
      <ChefNav />

      <main className="pt-14 max-w-[900px] mx-auto px-4 lg:px-8 py-8">
        <h1
          className="text-[28px] lg:text-[36px] font-bold tracking-tight mb-1"
          style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
        >
          Your Home Restaurant
        </h1>
        <p className="text-[14px] mb-8" style={{ color: "var(--hb-fg-muted)" }}>
          Manage your dishes, orders, and settings.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(({ Icon, title, desc, action, href, secondary, secondaryHref, disabled }) => (
            <div
              key={title}
              className="bg-white rounded-2xl p-5 flex flex-col gap-4"
              style={{ border: "1px solid var(--hb-border-soft)", boxShadow: "var(--hb-shadow-soft)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "var(--hb-primary-soft)" }}
              >
                <Icon size={20} style={{ color: "var(--hb-primary)" }} />
              </div>
              <div>
                <h2 className="text-[16px] font-bold mb-1" style={{ color: "var(--hb-fg)" }}>
                  {title}
                </h2>
                <p className="text-[13px]" style={{ color: "var(--hb-fg-muted)" }}>{desc}</p>
              </div>
              <div className="flex flex-col gap-2 mt-auto">
                <button
                  onClick={() => { if (!disabled && href !== "#") window.location.href = href; }}
                  disabled={disabled}
                  className="w-full py-2.5 rounded-full text-[13px] font-semibold text-white transition-colors"
                  style={{ background: disabled ? "var(--hb-fg-subtle)" : "var(--hb-primary)" }}
                >
                  {action}
                </button>
                {secondary && secondaryHref && (
                  <button
                    onClick={() => (window.location.href = secondaryHref)}
                    className="w-full py-2.5 rounded-full text-[13px] font-semibold transition-colors"
                    style={{
                      color: "var(--hb-primary)",
                      border: "1px solid var(--hb-primary)",
                      background: "transparent",
                    }}
                  >
                    {secondary}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
