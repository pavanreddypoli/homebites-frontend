"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Menu, X, LogOut, ChefHat } from "lucide-react";

const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard/home-restaurant" },
  { label: "Menu",      href: "/dashboard/home-restaurant/menu" },
  { label: "Add Dish",  href: "/dashboard/home-restaurant/add-item" },
  { label: "Orders",    href: "/dashboard/home-restaurant/orders" },
  { label: "Settings",  href: "/dashboard/home-restaurant/onboarding" },
];

export default function ChefNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function isActive(href: string) {
    if (href === "/dashboard/home-restaurant") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <>
      <header
        className="fixed top-0 left-0 right-0 z-[100] bg-white"
        style={{ borderBottom: "1px solid var(--hb-border)" }}
      >
        <div className="h-14 px-4 lg:px-8 flex items-center gap-4 max-w-[1400px] mx-auto">
          {/* Logo */}
          <Link
            href="/dashboard/home-restaurant"
            className="flex items-center gap-2 flex-shrink-0"
          >
            <span
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white"
              style={{ background: "var(--hero-gradient)" }}
            >
              <ChefHat size={15} />
            </span>
            <span
              className="hidden sm:block font-bold text-[16px] tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
            >
              HomeBites
            </span>
            <span
              className="hidden sm:block text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: "var(--hb-primary-soft)",
                color: "var(--hb-primary)",
              }}
            >
              Chef
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1 ml-4">
            {NAV_LINKS.map(({ label, href }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className="px-3 py-1.5 rounded-lg text-[13.5px] font-medium transition-colors"
                  style={{
                    background: active ? "var(--hb-primary-soft)" : "transparent",
                    color: active ? "var(--hb-primary)" : "var(--hb-fg-muted)",
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          <div className="flex-1" />

          {/* Logout — desktop */}
          <button
            onClick={logout}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors"
            style={{ color: "var(--hb-fg-muted)" }}
          >
            <LogOut size={14} />
            Logout
          </button>

          {/* Hamburger — mobile */}
          <button
            className="md:hidden p-2 rounded-lg"
            style={{ color: "var(--hb-fg)" }}
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>

      {/* Mobile dropdown */}
      {open && (
        <div
          className="md:hidden fixed top-14 left-0 right-0 z-[99] bg-white px-4 py-3 flex flex-col gap-1"
          style={{ borderBottom: "1px solid var(--hb-border)" }}
        >
          {NAV_LINKS.map(({ label, href }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="px-4 py-2.5 rounded-lg text-[14px] font-medium transition-colors"
                style={{
                  background: active ? "var(--hb-primary-soft)" : "transparent",
                  color: active ? "var(--hb-primary)" : "var(--hb-fg)",
                }}
              >
                {label}
              </Link>
            );
          })}
          <button
            onClick={logout}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-[14px] font-medium mt-1"
            style={{
              color: "#DC2626",
              background: "#FEF2F2",
            }}
          >
            <LogOut size={15} />
            Logout
          </button>
        </div>
      )}
    </>
  );
}
