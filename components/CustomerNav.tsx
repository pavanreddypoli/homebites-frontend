"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ShoppingBag, User } from "lucide-react";
import Image from "next/image";
import { getCartItemCount } from "@/lib/cart";

export default function CustomerNav() {
  const [user, setUser]         = useState<any>(null);
  const [mounted, setMounted]   = useState(false);
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
    <header className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-[#EDE3D2] h-14">
      <div className="h-full max-w-[430px] mx-auto px-4 flex items-center justify-between">

        {/* Logo */}
        <button
          onClick={() => (window.location.href = "/dashboard/customer")}
          className="flex items-center gap-2"
        >
          <Image
            src="/homebites-logo.png"
            alt="HomeBites"
            width={32}
            height={32}
            className="h-8 w-auto object-contain rounded-lg"
          />
          <span className="font-bold text-[#16202B] text-[15px] tracking-tight">
            HomeBites
          </span>
        </button>

        {/* Right actions */}
        <div className="flex items-center gap-2.5">
          {/* Become a Chef link */}
          <a
            href="/signup"
            className="text-[11px] font-semibold text-[#FF7A39] hidden sm:block whitespace-nowrap"
          >
            🍳 Become a Chef
          </a>

          {/* Auth state */}
          {mounted && (
            user ? (
              <button
                onClick={() => (window.location.href = "/dashboard")}
                className="text-[#16202B]/60 hover:text-[#16202B] transition-colors"
                aria-label="Account"
              >
                <User size={22} />
              </button>
            ) : (
              <button
                onClick={() => (window.location.href = "/login")}
                className="text-[12px] font-semibold text-[#FF7A39] border border-[#FF7A39] rounded-full px-3 py-1 leading-none whitespace-nowrap"
              >
                Sign In
              </button>
            )
          )}

          {/* Cart icon */}
          <button
            onClick={() => window.dispatchEvent(new Event("homebites:open-cart"))}
            className="relative text-[#16202B] p-0.5"
            aria-label="Open cart"
          >
            <ShoppingBag size={22} />
            {mounted && cartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-[#FF7A39] text-white text-[9px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-0.5 leading-none">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
