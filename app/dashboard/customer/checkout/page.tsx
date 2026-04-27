"use client";

import { useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { supabase } from "@/lib/supabaseClient";
import CustomerNav from "@/components/CustomerNav";
import { getCart, clearCart } from "@/lib/cart";
import type { Cart } from "@/lib/cart";
import { Button } from "@/components/ui/button";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// ─── Inner form (must live inside <Elements>) ─────────────────────────────────

interface CheckoutFormProps {
  cart: Cart;
  user: any;
  subtotal: number;
  serviceFee: number;
  tax: number;
  total: number;
}

function CheckoutForm({ cart, user, subtotal, serviceFee, tax, total }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState<string>(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    if (!firstName.trim() || !lastName.trim()) {
      setError("Please enter your first and last name.");
      return;
    }
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setError("");
    setPaying(true);

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard/customer`,
      },
    });

    if (stripeError) {
      setError(stripeError.message ?? "Payment failed. Please try again.");
      setPaying(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      const itemsPayload = cart.items.map((item) => ({
        dish_id: item.dish_id,
        dish_name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));

      const { data: orderId, error: rpcError } = await supabase.rpc(
        "create_order_with_items",
        {
          p_customer_id: user?.id ?? null,
          p_restaurant_id: cart.restaurant_id,
          p_restaurant_name: cart.restaurant_name,
          p_subtotal: subtotal,
          p_service_fee: serviceFee,
          p_tax: tax,
          p_total: total,
          p_order_type: "pickup",
          p_status: "placed",
          p_customer_email: email,
          p_items: itemsPayload,
        }
      );

      if (rpcError) {
        console.error("Order creation failed after payment:", rpcError);
        setError("Payment succeeded but order creation failed. Please contact support with your payment reference.");
        setPaying(false);
        return;
      }

      clearCart();

      // Fire confirmation email — best-effort, don't block navigation on failure
      fetch("/api/notify-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, email }),
      }).catch((err) => console.error("notify-order failed:", err));

      window.location.href = `/dashboard/customer/order-confirmation/${orderId}`;
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Pickup Info */}
      <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
        <h2 className="font-semibold mb-1">Pickup Details</h2>
        <p className="text-sm text-slate-600">{cart.restaurant_name}</p>
        <p className="text-sm text-slate-500">Pickup only</p>
      </div>

      {/* Order Summary */}
      <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
        <h2 className="font-semibold mb-4">Order Summary</h2>
        {cart.items.map((item) => (
          <div key={item.dish_id} className="flex justify-between mb-2">
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>${(item.price * item.quantity).toFixed(2)}</span>
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
        <h2 className="font-semibold mb-3">Contact Information</h2>
        <div className="flex gap-3 mb-3">
          <input
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
            required
          />
          <input
            type="text"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
            required
          />
        </div>
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-md px-3 py-2 mb-3"
          required
        />
        <input
          type="tel"
          placeholder="Phone number (optional)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full border rounded-md px-3 py-2"
        />
      </div>

      {/* Payment */}
      <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
        <h2 className="font-semibold mb-4">Payment</h2>
        <PaymentElement />
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      <Button type="submit" className="w-full" disabled={!stripe || paying}>
        {paying ? "Processing…" : `Pay $${total.toFixed(2)}`}
      </Button>

      <p className="text-xs text-slate-500 mt-3 text-center">
        Tax and fees are estimates and may vary.
      </p>
    </form>
  );
}

// ─── Outer page shell ─────────────────────────────────────────────────────────

export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [user, setUser] = useState<any>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [intentError, setIntentError] = useState("");

  useEffect(() => {
    async function init() {
      const loadedCart = getCart();
      const { data: userData } = await supabase.auth.getUser();
      setUser(userData.user ?? null);

      if (!loadedCart?.items?.length) {
        setLoading(false);
        return;
      }

      setCart(loadedCart);

      const sub = loadedCart.items.reduce((s, i) => s + i.price * i.quantity, 0);
      const fee = sub * 0.05;
      const taxAmt = (sub + fee) * 0.0825;
      const tot = sub + fee + taxAmt;

      try {
        const res = await fetch("/api/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount_cents: Math.round(tot * 100) }),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setClientSecret(data.clientSecret);
      } catch (err: any) {
        setIntentError("Failed to initialize payment. Please refresh and try again.");
      }

      setLoading(false);
    }

    init();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading checkout…
      </div>
    );
  }

  if (!cart || !cart.items.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Your cart is empty
      </div>
    );
  }

  if (intentError) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {intentError}
      </div>
    );
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Preparing payment…
      </div>
    );
  }

  const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const serviceFee = subtotal * 0.05;
  const tax = (subtotal + serviceFee) * 0.0825;
  const total = subtotal + serviceFee + tax;

  return (
    <>
      <CustomerNav />
      <div className="min-h-screen bg-slate-50 pt-16">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Elements
          stripe={stripePromise}
          options={{ clientSecret, appearance: { theme: "stripe" } }}
        >
          <CheckoutForm
            cart={cart}
            user={user}
            subtotal={subtotal}
            serviceFee={serviceFee}
            tax={tax}
            total={total}
          />
        </Elements>
      </div>
    </div>
    </>
  );
}
