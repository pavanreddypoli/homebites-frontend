"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getCart,
  updateItemQuantity,
  getCartSubtotal,
  clearCart,
  getCartItemCount,
} from "@/lib/cart";
import { Button } from "@/components/ui/button";

export default function CartDrawer() {
  /* ---------------- ALL HOOKS FIRST ---------------- */

  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<any>(null);

  /* ---------------- EFFECTS ---------------- */

  // Mount detection (hydration-safe)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load cart + listeners (client-only)
  useEffect(() => {
    if (!mounted) return;

    setCart(getCart());

    function refreshCart() {
      setCart(getCart());
    }

    function openCart() {
      setCart(getCart());
      setOpen(true);
    }

    function closeCart() {
      setOpen(false);
    }

    window.addEventListener("homebites:cart-updated", refreshCart);
    window.addEventListener("homebites:open-cart", openCart);
    window.addEventListener("homebites:close-cart", closeCart);

    return () => {
      window.removeEventListener("homebites:cart-updated", refreshCart);
      window.removeEventListener("homebites:open-cart", openCart);
      window.removeEventListener("homebites:close-cart", closeCart);
    };
  }, [mounted]);

  /* ---------------- DERIVED ---------------- */

  const itemCount = useMemo(
    () => (cart ? getCartItemCount() : 0),
    [cart]
  );

  const subtotal = useMemo(
    () => (cart ? getCartSubtotal() : 0),
    [cart]
  );

  /* ---------------- RENDER GUARDS (SAFE) ---------------- */

  if (!mounted) return null;
  if (!cart || cart.items.length === 0) return null;

  /* ---------------- UI ---------------- */

  return (
    <>
      {/* 🛒 Floating Cart Button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 bg-indigo-600 text-white px-4 py-3 rounded-full shadow-lg z-40"
        >
          🛒 {itemCount}
        </button>
      )}

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white z-50 shadow-xl transform transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b">
          <h2 className="text-lg font-semibold">Your Cart</h2>
          <button onClick={() => setOpen(false)}>✕</button>
        </div>

        {/* Items */}
        <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-170px)]">
          {cart.items.map((item: any) => (
            <div key={item.dish_id} className="flex justify-between items-center">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-slate-500">
                  ${item.price.toFixed(2)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  className="px-2 border rounded"
                  onClick={() => {
                    updateItemQuantity(item.dish_id, item.quantity - 1);
                    window.dispatchEvent(
                      new Event("homebites:cart-updated")
                    );
                  }}
                >
                  −
                </button>

                <span>{item.quantity}</span>

                <button
                  className="px-2 border rounded"
                  onClick={() => {
                    updateItemQuantity(item.dish_id, item.quantity + 1);
                    window.dispatchEvent(
                      new Event("homebites:cart-updated")
                    );
                  }}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <div className="flex justify-between mb-3">
            <span>Subtotal</span>
            <span className="font-semibold">
              ${subtotal.toFixed(2)}
            </span>
          </div>

          <Button
            className="w-full h-12"
            onClick={() => {
              setOpen(false);
              window.location.href = "/dashboard/customer/checkout";
            }}
          >
            Checkout
          </Button>

          <button
            className="w-full text-sm text-red-500 mt-2"
            onClick={() => {
              clearCart();
              window.dispatchEvent(
                new Event("homebites:cart-updated")
              );
            }}
          >
            Clear Cart
          </button>
        </div>
      </div>
    </>
  );
}
