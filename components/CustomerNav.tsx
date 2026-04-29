"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { ShoppingBag, MapPin, Search, ChevronDown } from "lucide-react";
import { getCartItemCount } from "@/lib/cart";

/**
 * Responsive top header used across customer-flow pages.
 * Matches the design system: brand orange, Fraunces wordmark, soft warm border,
 * compact on mobile, expanded on desktop with address + nav links.
 */
export default function CustomerNav({
  address,
  onAddressClick,
}: {
  address?: string;
  onAddressClick?: () => void;
}) {
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setCartCount(getCartItemCount());
    function onCartUpdated() { setCartCount(getCartItemCount()); }
    window.addEventListener("homebites:cart-updated", onCartUpdated);
    return () => window.removeEventListener("homebites:cart-updated", onCartUpdated);
  }, [mounted]);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[100] backdrop-blur-md"
      style={{
        background: "rgba(255,251,245,0.85)",
        borderBottom: "1px solid var(--hb-border-soft)",
      }}
    >
      <div className="h-14 lg:h-16 px-4 lg:px-8 flex items-center gap-3 lg:gap-5 max-w-[1400px] mx-auto">
        {/* Logo + wordmark */}
        <button
          onClick={() => (window.location.href = "/dashboard/customer")}
          className="flex items-center gap-2 flex-shrink-0"
        >
          <span
            className="w-8 h-8 lg:w-9 lg:h-9 rounded-xl flex items-center justify-center text-white font-bold text-base"
            style={{ background: "var(--hero-gradient)" }}
          >
            H
          </span>
          <span
            className="hidden sm:block font-bold text-[16px] lg:text-[19px] tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
          >
            HomeBites
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1 ml-2">
          {["Browse", "How it works"].map((label) => (
            <button
              key={label}
              className="px-3 py-1.5 text-[13.5px] font-medium rounded-md transition-colors"
              style={{ color: "var(--hb-fg-muted)" }}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Address pill — desktop */}
        {address && (
          <button
            onClick={onAddressClick}
            className="hidden md:flex items-center gap-2 bg-white rounded-full px-3 py-2 text-[13px] font-semibold transition-shadow"
            style={{
              border: "1px solid var(--hb-border-soft)",
              boxShadow: "var(--hb-shadow-soft)",
              color: "var(--hb-fg)",
            }}
          >
            <MapPin size={14} style={{ color: "var(--hb-primary)" }} />
            <span className="max-w-[160px] truncate">{address}</span>
            <ChevronDown size={13} style={{ color: "var(--hb-fg-subtle)" }} />
          </button>
        )}

        {/* Restaurant login — desktop only */}
        <button
          onClick={() => (window.location.href = "/login")}
          className="hidden lg:block px-3 py-1.5 text-[13.5px] font-semibold rounded-md transition-colors"
          style={{ color: "var(--hb-fg-muted)" }}
        >
          {mounted && user ? "Account" : "Restaurant login"}
        </button>

        {/* Become a Home restaurant — desktop only */}
        <button
          onClick={() => (window.location.href = "/signup")}
          className="hidden lg:flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-colors text-white"
          style={{
            background: "var(--hb-fg)",
          }}
        >
          Become a Home restaurant
        </button>

        {/* Sign In / Account — mobile only */}
        <button
          onClick={() => (window.location.href = mounted && user ? "/dashboard" : "/login")}
          className="lg:hidden px-3 py-1.5 text-[12px] font-semibold rounded-full"
          style={{
            color: "var(--hb-primary)",
            border: "1px solid var(--hb-primary)",
          }}
        >
          {mounted && user ? "Account" : "Sign in"}
        </button>

        {/* Cart */}
        <button
          onClick={() => window.dispatchEvent(new Event("homebites:open-cart"))}
          className="relative w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
          style={{
            background: "#fff",
            border: "1px solid var(--hb-border-soft)",
            boxShadow: "var(--hb-shadow-soft)",
          }}
          aria-label="Open cart"
        >
          <ShoppingBag size={17} style={{ color: "var(--hb-fg)" }} />
          {mounted && cartCount > 0 && (
            <span
              className="absolute -top-1 -right-1 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 leading-none"
              style={{
                background: "var(--hb-accent)",
                border: "2px solid var(--hb-bg)",
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {cartCount > 9 ? "9+" : cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
