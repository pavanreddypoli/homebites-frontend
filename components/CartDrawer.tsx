"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getCart,
  updateItemQuantity,
  getCartSubtotal,
  clearCart,
} from "@/lib/cart";
import { Plus, Minus, X, ShoppingBag, Trash2 } from "lucide-react";

export default function CartDrawer() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<any>(null);

  /* Mount detection (hydration-safe) */
  useEffect(() => { setMounted(true); }, []);

  /* Cart events */
  useEffect(() => {
    if (!mounted) return;

    setCart(getCart());

    function refreshCart() { setCart(getCart()); }
    function openCart()    { setCart(getCart()); setOpen(true); }
    function closeCart()   { setOpen(false); }

    window.addEventListener("homebites:cart-updated", refreshCart);
    window.addEventListener("homebites:open-cart", openCart);
    window.addEventListener("homebites:close-cart", closeCart);

    return () => {
      window.removeEventListener("homebites:cart-updated", refreshCart);
      window.removeEventListener("homebites:open-cart", openCart);
      window.removeEventListener("homebites:close-cart", closeCart);
    };
  }, [mounted]);

  const subtotal = useMemo(() => (cart ? getCartSubtotal() : 0), [cart]);
  const serviceFee = subtotal * 0.05;
  const tax = (subtotal + serviceFee) * 0.0825;
  const total = subtotal + serviceFee + tax;

  /* Render guards */
  if (!mounted) return null;
  if (!open && (!cart || cart.items.length === 0)) return null;

  const isEmpty = !cart || cart.items.length === 0;

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[110]"
          style={{ background: "rgba(11,19,28,.45)" }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white z-[120] transform transition-transform duration-300 flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ boxShadow: "-12px 0 40px -12px rgba(11,19,28,.18)" }}
      >
        {/* Header */}
        <div
          className="px-5 py-4 flex items-center justify-between flex-shrink-0"
          style={{ borderBottom: "1px solid var(--hb-border-soft)" }}
        >
          <div>
            <h2
              className="font-bold text-[20px] tracking-[-0.02em]"
              style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
            >
              Your bag
            </h2>
            {!isEmpty && cart.restaurant_name && (
              <p className="text-[12px] mt-0.5" style={{ color: "var(--hb-fg-muted)" }}>
                from <b style={{ color: "var(--hb-fg)" }}>{cart.restaurant_name}</b>
              </p>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: "#F5F2ED",
              color: "var(--hb-fg)",
            }}
            aria-label="Close"
          >
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        {isEmpty ? (
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: "var(--hb-primary-soft)", color: "var(--hb-primary)" }}
            >
              <ShoppingBag size={28} />
            </div>
            <h3
              className="font-bold text-[18px] mb-1"
              style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
            >
              Your bag is empty
            </h3>
            <p className="text-[13.5px]" style={{ color: "var(--hb-fg-muted)" }}>
              Add a few dishes from your favorite home restaurant — they'll show up here.
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {cart.items.map((item: any) => (
                <div
                  key={item.dish_id}
                  className="flex gap-3 p-3 rounded-2xl"
                  style={{ background: "#FBF7F1" }}
                >
                  <div
                    className="w-16 h-16 rounded-xl bg-cover bg-center flex-shrink-0"
                    style={{
                      backgroundImage: item.image_url
                        ? `url(${item.image_url})`
                        : "linear-gradient(135deg, #FFF1E3 0%, #FFE4CB 100%)",
                    }}
                  >
                    {!item.image_url && (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        🍽️
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[14px] font-bold truncate"
                      style={{ color: "var(--hb-fg)" }}
                    >
                      {item.name}
                    </p>
                    <p
                      className="text-[12.5px] font-bold mt-0.5"
                      style={{ color: "var(--hb-fg)", fontVariantNumeric: "tabular-nums" }}
                    >
                      ${(item.price * item.quantity).toFixed(2)}
                    </p>

                    {/* Stepper */}
                    <div className="mt-2 flex items-center gap-1">
                      <button
                        className="w-7 h-7 rounded-full bg-white flex items-center justify-center transition-colors"
                        style={{
                          border: "1px solid var(--hb-border-soft)",
                          color: "var(--hb-fg)",
                        }}
                        onClick={() => {
                          updateItemQuantity(item.dish_id, item.quantity - 1);
                          window.dispatchEvent(new Event("homebites:cart-updated"));
                        }}
                        aria-label="Decrease"
                      >
                        <Minus size={13} />
                      </button>
                      <span
                        className="text-[13px] font-bold w-7 text-center"
                        style={{ color: "var(--hb-fg)", fontVariantNumeric: "tabular-nums" }}
                      >
                        {item.quantity}
                      </span>
                      <button
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white transition-colors"
                        style={{ background: "var(--hb-primary)" }}
                        onClick={() => {
                          updateItemQuantity(item.dish_id, item.quantity + 1);
                          window.dispatchEvent(new Event("homebites:cart-updated"));
                        }}
                        aria-label="Increase"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() => {
                  clearCart();
                  window.dispatchEvent(new Event("homebites:cart-updated"));
                }}
                className="flex items-center gap-1.5 text-[12px] font-medium mt-3 px-2"
                style={{ color: "var(--hb-fg-muted)" }}
              >
                <Trash2 size={12} />
                Clear bag
              </button>
            </div>

            {/* Footer */}
            <div
              className="px-5 py-4 flex-shrink-0"
              style={{ borderTop: "1px solid var(--hb-border-soft)" }}
            >
              <div className="space-y-1.5 mb-4 text-[13px]" style={{ color: "var(--hb-fg-muted)" }}>
                <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
                <Row label="Service fee (5%)" value={`$${serviceFee.toFixed(2)}`} />
                <Row label="Estimated tax" value={`$${tax.toFixed(2)}`} />
                <div
                  className="flex justify-between font-bold text-[16px] pt-2 mt-2"
                  style={{ color: "var(--hb-fg)", borderTop: "1px solid var(--hb-border-soft)" }}
                >
                  <span style={{ fontFamily: "var(--font-display)" }}>Total</span>
                  <span style={{ fontVariantNumeric: "tabular-nums" }}>${total.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setOpen(false);
                  window.location.href = "/dashboard/customer/checkout";
                }}
                className="w-full py-3.5 rounded-full font-bold text-[15px] text-white transition-colors"
                style={{
                  background: "var(--hb-primary)",
                  boxShadow: "0 4px 14px -2px rgba(255,122,57,.45)",
                }}
              >
                Checkout · ${total.toFixed(2)}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}
