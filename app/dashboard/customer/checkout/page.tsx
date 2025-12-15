"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCart, getCartSubtotal, clearCart } from "@/lib/cart";
import { Button } from "@/components/ui/button";

export default function CheckoutPage() {
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";

  /* ---------------- CLIENT-ONLY INIT ---------------- */
  useEffect(() => {
    const loadedCart = getCart();
    setCart(loadedCart);

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setLoading(false);
    });
  }, []);

  /* ---------------- GUARDS ---------------- */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading checkout…
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Your cart is empty
      </div>
    );
  }

  /* ---------------- CALCULATIONS ---------------- */
  const subtotal = getCartSubtotal();
  const serviceFee = subtotal * 0.05;
  const tax = (subtotal + serviceFee) * 0.0825;
  const total = subtotal + serviceFee + tax;

  /* ---------------- PLACE ORDER (RPC – FINAL) ---------------- */
  async function placeOrder() {
    if (!email && !phone) {
      setError("Please provide either an email or phone number.");
      return;
    }

    setError("");

    try {
      const itemsPayload = cart.items.map((item: any) => ({
        dish_id: item.dish_id,
        dish_name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));

      const { data: orderId, error: rpcError } = await supabase.rpc(
        "create_order_with_items",
        {
          p_customer_id: user?.id || null,
          p_restaurant_id: cart.restaurant_id,
          p_restaurant_name: cart.restaurant_name,
          p_subtotal: subtotal,
          p_service_fee: serviceFee,
          p_tax: tax,
          p_total: total,
          p_order_type: "pickup",
          p_status: "placed",
          p_customer_email: email || null,
          p_items: itemsPayload,
        }
      );

      if (rpcError) {
        console.error("RPC ORDER ERROR:", rpcError);
        alert(rpcError.message || "Failed to place order");
        return;
      }

      clearCart();

      // 🔔 Notify customer (order placed)
      await fetch("/api/notify-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      // 🔔 Notify home restaurant (new order)
      await fetch("/api/notify-chef-new-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });

      window.location.href = SITE_URL + `/dashboard/customer/order-confirmation/${orderId}`;
    } catch (err) {
      console.error("Order failed:", err);
      alert("Failed to place order");
    }
  }

  /* ---------------- UI ---------------- */
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Checkout</h1>

        {/* Pickup Info */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <h2 className="font-semibold mb-1">Pickup Details</h2>
          <p className="text-sm text-slate-600">
            {cart.restaurant_name}
          </p>
          <p className="text-sm text-slate-500">Pickup only</p>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <h2 className="font-semibold mb-4">Order Summary</h2>

          {cart.items.map((item: any) => (
            <div key={item.dish_id} className="flex justify-between mb-2">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>
                ${(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}

          <hr className="my-3" />

          <div className="flex justify-between text-sm mb-1">
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-sm mb-1">
            <span>Service fee (5%)</span>
            <span>${serviceFee.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-sm mb-1">
            <span>Estimated tax</span>
            <span>${tax.toFixed(2)}</span>
          </div>

          <div className="flex justify-between font-semibold mt-3">
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <h2 className="font-semibold mb-2">Contact Information</h2>

          <input
            type="email"
            placeholder="Email (optional)"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-md px-3 py-2 mb-3"
          />

          <input
            type="tel"
            placeholder="Phone number (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />

          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
        </div>

        <Button className="w-full" onClick={placeOrder}>
          Place Order
        </Button>

        <p className="text-xs text-slate-500 mt-3 text-center">
          Tax and fees are estimates and may vary.
        </p>
      </div>
    </div>
  );
}
