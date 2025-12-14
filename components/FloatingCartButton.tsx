// components/FloatingCartButton.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import CartDrawer from "@/components/CartDrawer";
import { getCart } from "@/lib/cart";

export default function FloatingCartButton() {
  const [open, setOpen] = useState(false);
  const [tick, setTick] = useState(0); // simple re-render trigger

  useEffect(() => {
    const onUpdated = () => setTick((t) => t + 1);
    const onOpen = () => setOpen(true);

    window.addEventListener("homebites:cart-updated", onUpdated);
    window.addEventListener("homebites:cart-open", onOpen);

    return () => {
      window.removeEventListener("homebites:cart-updated", onUpdated);
      window.removeEventListener("homebites:cart-open", onOpen);
    };
  }, []);

  const cart = useMemo(() => getCart(), [tick]);
  const items = Array.isArray(cart.items) ? cart.items : [];

  const count = items.reduce((s, i) => s + i.quantity, 0);

  if (count <= 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[55] rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg px-4 py-3 flex items-center gap-2"
      >
        <span className="text-lg">🛒</span>
        <span className="text-sm font-medium">View Cart</span>
        <span className="ml-1 bg-white/20 px-2 py-0.5 rounded-full text-xs">
          {count}
        </span>
      </button>

      <CartDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
