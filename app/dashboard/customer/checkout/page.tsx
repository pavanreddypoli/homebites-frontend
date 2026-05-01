"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeft, Lock, ShoppingBag, Store, AlertCircle } from "lucide-react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

/* ─── Inner form ──────────────────────────────────────────────────────────── */

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
  const router = useRouter();

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
        setError(
          "Payment succeeded but order creation failed. Please contact support with your payment reference."
        );
        setPaying(false);
        return;
      }

      clearCart();

      // Best-effort confirmation email
      fetch("/api/notify-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, email }),
      }).catch((err) => console.error("notify-order failed:", err));

      router.push(`/dashboard/customer/order-confirmation/${orderId}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8">
      {/* LEFT — forms */}
      <div className="space-y-5">
        {/* Pickup */}
        <Card title="Pickup details" icon={<Store size={16} />}>
          <p className="text-[14px] font-semibold" style={{ color: "var(--hb-fg)" }}>
            {cart.restaurant_name}
          </p>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--hb-fg-muted)" }}>
            Pickup only · Ready in 25–35 min
          </p>
        </Card>

        {/* Contact */}
        <Card title="Contact information">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <Field
              placeholder="First name"
              value={firstName}
              onChange={setFirstName}
              required
            />
            <Field
              placeholder="Last name"
              value={lastName}
              onChange={setLastName}
              required
            />
          </div>
          <Field
            type="email"
            placeholder="Email address"
            value={email}
            onChange={setEmail}
            required
            className="mb-3"
          />
          <Field
            type="tel"
            placeholder="Phone number (optional)"
            value={phone}
            onChange={setPhone}
          />
        </Card>

        {/* Payment */}
        <Card title="Payment" icon={<Lock size={14} />}>
          <div
            className="p-3 rounded-xl"
            style={{ background: "#FBF7F1", border: "1px solid var(--hb-border-soft)" }}
          >
            <PaymentElement />
          </div>
          <p className="text-[11.5px] mt-2.5" style={{ color: "var(--hb-fg-muted)" }}>
            Your payment is secured by Stripe. We don't store your card.
          </p>
        </Card>

        {error && (
          <div
            className="flex items-start gap-2 p-3.5 rounded-xl text-[13px]"
            style={{
              background: "#FEF2F2",
              border: "1px solid #FCA5A5",
              color: "#991B1B",
            }}
          >
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Mobile pay button */}
        <button
          type="submit"
          disabled={!stripe || paying}
          className="lg:hidden w-full py-3.5 rounded-full font-bold text-[15px] text-white transition-colors disabled:opacity-60"
          style={{
            background: "var(--hb-primary)",
            boxShadow: "0 4px 14px -2px rgba(255,122,57,.45)",
          }}
        >
          {paying ? "Processing…" : `Pay $${total.toFixed(2)}`}
        </button>
      </div>

      {/* RIGHT — sticky summary */}
      <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
        <Card title="Order summary" icon={<ShoppingBag size={14} />}>
          <div className="space-y-2 mb-3">
            {cart.items.map((item) => (
              <div key={item.dish_id} className="flex justify-between text-[13.5px]">
                <span style={{ color: "var(--hb-fg)" }}>
                  <b>{item.quantity}×</b> {item.name}
                </span>
                <span style={{ color: "var(--hb-fg)", fontVariantNumeric: "tabular-nums" }}>
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <hr style={{ borderColor: "var(--hb-border-soft)" }} />
          <div
            className="space-y-1.5 mt-3 text-[13px]"
            style={{ color: "var(--hb-fg-muted)" }}
          >
            <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
            <Row label="Service fee (5%)" value={`$${serviceFee.toFixed(2)}`} />
            <Row label="Estimated tax" value={`$${tax.toFixed(2)}`} />
          </div>
          <div
            className="flex justify-between font-bold text-[18px] pt-3 mt-3"
            style={{ color: "var(--hb-fg)", borderTop: "1px solid var(--hb-border-soft)" }}
          >
            <span style={{ fontFamily: "var(--font-display)" }}>Total</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>${total.toFixed(2)}</span>
          </div>
        </Card>

        <button
          type="submit"
          disabled={!stripe || paying}
          className="hidden lg:block w-full py-3.5 rounded-full font-bold text-[15px] text-white transition-colors disabled:opacity-60"
          style={{
            background: "var(--hb-primary)",
            boxShadow: "0 4px 14px -2px rgba(255,122,57,.45)",
          }}
        >
          {paying ? "Processing…" : `Pay $${total.toFixed(2)}`}
        </button>

        <p
          className="text-[11.5px] text-center"
          style={{ color: "var(--hb-fg-muted)" }}
        >
          Tax and fees are estimates and may vary.
        </p>
      </aside>
    </form>
  );
}

/* ─── Outer page shell ────────────────────────────────────────────────────── */

export default function CheckoutPage() {
  const router = useRouter();
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
    return <Shell><Centered text="Loading checkout…" /></Shell>;
  }
  if (!cart || !cart.items.length) {
    return (
      <Shell>
        <EmptyCart />
      </Shell>
    );
  }
  if (intentError) {
    return (
      <Shell>
        <Centered text={intentError} tone="error" />
      </Shell>
    );
  }
  if (!clientSecret) {
    return <Shell><Centered text="Preparing payment…" /></Shell>;
  }

  const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const serviceFee = subtotal * 0.05;
  const tax = (subtotal + serviceFee) * 0.0825;
  const total = subtotal + serviceFee + tax;

  return (
    <Shell>
      <div className="max-w-[1100px] mx-auto px-4 lg:px-8 py-6 lg:py-10">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-5 px-3 py-1.5 rounded-full transition-colors"
          style={{
            color: "var(--hb-fg)",
            background: "#fff",
            border: "1px solid var(--hb-border-soft)",
          }}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <h1
          className="font-bold text-[28px] lg:text-[40px] leading-tight tracking-[-0.025em] mb-1"
          style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
        >
          Checkout
        </h1>
        <p className="text-[14px] mb-7 lg:mb-8" style={{ color: "var(--hb-fg-muted)" }}>
          Review your order and pay securely.
        </p>

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
    </Shell>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CustomerNav />
      <div className="min-h-screen pt-14 lg:pt-16" style={{ background: "var(--hb-bg)" }}>
        {children}
      </div>
    </>
  );
}

function Centered({ text, tone }: { text: string; tone?: "error" }) {
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center px-6 text-center"
      style={{ color: tone === "error" ? "#991B1B" : "var(--hb-fg-muted)" }}
    >
      {text}
    </div>
  );
}

function EmptyCart() {
  const router = useRouter();
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
        style={{ background: "var(--hb-primary-soft)", color: "var(--hb-primary)" }}
      >
        <ShoppingBag size={28} />
      </div>
      <h2
        className="font-bold text-[22px] mb-1"
        style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
      >
        Your bag is empty
      </h2>
      <p className="text-[14px] mb-5" style={{ color: "var(--hb-fg-muted)" }}>
        Add a few dishes to start an order.
      </p>
      <button
        onClick={() => router.push("/dashboard/customer")}
        className="px-5 py-3 rounded-full font-bold text-[14px] text-white"
        style={{ background: "var(--hb-primary)" }}
      >
        Browse home restaurants
      </button>
    </div>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="bg-white rounded-2xl p-5"
      style={{
        border: "1px solid var(--hb-border-soft)",
        boxShadow: "var(--hb-shadow-soft)",
      }}
    >
      <h3
        className="flex items-center gap-2 font-bold text-[14px] uppercase tracking-wider mb-3"
        style={{ color: "var(--hb-fg-muted)", letterSpacing: "0.06em", fontSize: "11.5px" }}
      >
        {icon} {title}
      </h3>
      {children}
    </section>
  );
}

function Field({
  type = "text",
  placeholder,
  value,
  onChange,
  required,
  className = "",
}: {
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className={`w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-colors focus:border-[var(--hb-primary)] ${className}`}
      style={{
        background: "#FBF7F1",
        border: "1px solid var(--hb-border-soft)",
        color: "var(--hb-fg)",
      }}
    />
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
