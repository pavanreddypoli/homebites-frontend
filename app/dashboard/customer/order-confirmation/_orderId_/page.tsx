"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import CustomerNav from "@/components/CustomerNav";
import { CheckCircle2, Store, Clock, Receipt, Copy, Check } from "lucide-react";

type Order = {
  id: string;
  restaurant_name: string;
  order_type: string;
  subtotal: number;
  service_fee: number;
  tax: number;
  total: number;
  created_at: string;
};

type OrderItem = {
  id: string;
  dish_name: string;
  price: number;
  quantity: number;
};

export default function OrderConfirmationPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) {
        setLoading(false);
        return;
      }

      const { data, error: rpcError } = await supabase.rpc(
        "get_order_with_items",
        { p_order_id: String(orderId) }
      );

      if (rpcError || !data) {
        console.error("ORDER CONFIRMATION RPC ERROR:", rpcError);
        setLoading(false);
        return;
      }

      setOrder((data as any).order ?? null);
      setItems(((data as any).items ?? []) as OrderItem[]);
      setLoading(false);
    }

    loadOrder();
  }, [orderId]);

  if (loading) {
    return <Shell><Centered text="Loading order…" /></Shell>;
  }

  if (!order) {
    return <Shell><Centered text="Order not found." /></Shell>;
  }

  const shortId = order.id.slice(0, 8).toUpperCase();

  return (
    <Shell>
      <div className="max-w-[760px] mx-auto px-4 lg:px-8 py-8 lg:py-12">
        {/* Hero confirmation card */}
        <div
          className="relative overflow-hidden rounded-3xl p-7 lg:p-10 mb-6"
          style={{
            background: "linear-gradient(135deg, #FFF1E3 0%, #FFE4CB 100%)",
            border: "1px solid #FFE1C7",
          }}
        >
          <div className="relative z-10">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center mb-4 text-white"
              style={{
                background: "var(--hb-success)",
                boxShadow: "0 8px 24px -6px rgba(46,204,113,.5)",
              }}
            >
              <CheckCircle2 size={26} strokeWidth={2.4} />
            </div>
            <div
              className="text-[11px] font-bold uppercase tracking-wider mb-2"
              style={{ color: "#C24B12" }}
            >
              Order confirmed
            </div>
            <h1
              className="font-bold text-[28px] lg:text-[40px] leading-[1.05] tracking-[-0.025em] mb-2"
              style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
            >
              Your order is on the way to{" "}
              <span style={{ color: "var(--hb-primary)", fontStyle: "italic" }}>
                being made
              </span>
            </h1>
            <p
              className="text-[14px] lg:text-[15px] leading-[1.55]"
              style={{ color: "var(--hb-fg-muted)" }}
            >
              <b style={{ color: "var(--hb-fg)" }}>{order.restaurant_name}</b> is preparing
              your meal. We'll notify you when it's ready for pickup.
            </p>

            {/* Order ID pill */}
            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(order.id);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="inline-flex items-center gap-2 bg-white rounded-full pl-3 pr-3 py-1.5 text-[12px] font-bold transition-colors"
                style={{
                  color: "var(--hb-fg)",
                  border: "1px solid var(--hb-border-soft)",
                  boxShadow: "var(--hb-shadow-soft)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                #{shortId}
                {copied ? (
                  <Check size={12} style={{ color: "var(--hb-success)" }} />
                ) : (
                  <Copy size={12} style={{ color: "var(--hb-fg-subtle)" }} />
                )}
              </button>
              <span className="text-[12px]" style={{ color: "var(--hb-fg-muted)" }}>
                Placed {new Date(order.created_at).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Pickup card */}
        <Card title="Pickup details" icon={<Store size={14} />}>
          <p className="text-[15px] font-semibold" style={{ color: "var(--hb-fg)" }}>
            {order.restaurant_name}
          </p>
          <div
            className="flex items-center gap-2 mt-2 text-[13px]"
            style={{ color: "var(--hb-fg-muted)" }}
          >
            <Clock size={13} style={{ color: "var(--hb-primary)" }} />
            <span>
              <b style={{ color: "var(--hb-fg)" }}>Ready in 25–35 min</b> · We'll text you
              when it's ready
            </span>
          </div>
          <div
            className="mt-3 p-3 rounded-xl text-[13px] leading-[1.55]"
            style={{ background: "#FBF7F1", color: "var(--hb-fg-muted)" }}
          >
            Please pick up your order directly from the home restaurant. Bring your order
            ID — they'll be expecting you.
          </div>
        </Card>

        {/* Items + totals */}
        <Card title="Order summary" icon={<Receipt size={14} />} className="mt-4">
          <div className="space-y-2.5">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-[14px]">
                <span style={{ color: "var(--hb-fg)" }}>
                  <b>{item.quantity}×</b> {item.dish_name}
                </span>
                <span
                  style={{ color: "var(--hb-fg)", fontVariantNumeric: "tabular-nums" }}
                >
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <hr className="my-4" style={{ borderColor: "var(--hb-border-soft)" }} />

          <div
            className="space-y-1.5 text-[13px]"
            style={{ color: "var(--hb-fg-muted)" }}
          >
            <Row label="Subtotal" value={`$${order.subtotal.toFixed(2)}`} />
            <Row label="Service fee" value={`$${order.service_fee.toFixed(2)}`} />
            <Row label="Tax" value={`$${order.tax.toFixed(2)}`} />
          </div>

          <div
            className="flex justify-between font-bold text-[18px] pt-3 mt-3"
            style={{
              color: "var(--hb-fg)",
              borderTop: "1px solid var(--hb-border-soft)",
            }}
          >
            <span style={{ fontFamily: "var(--font-display)" }}>Total paid</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              ${order.total.toFixed(2)}
            </span>
          </div>
        </Card>

        {/* CTA */}
        <button
          className="w-full mt-6 py-3.5 rounded-full font-bold text-[15px] text-white transition-colors"
          style={{
            background: "var(--hb-primary)",
            boxShadow: "0 4px 14px -2px rgba(255,122,57,.45)",
          }}
          onClick={() => (window.location.href = "/dashboard/customer")}
        >
          Order something else
        </button>
      </div>
    </Shell>
  );
}

/* Helpers */

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

function Centered({ text }: { text: string }) {
  return (
    <div
      className="min-h-[60vh] flex items-center justify-center px-6 text-center"
      style={{ color: "var(--hb-fg-muted)" }}
    >
      {text}
    </div>
  );
}

function Card({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-white rounded-2xl p-5 ${className}`}
      style={{
        border: "1px solid var(--hb-border-soft)",
        boxShadow: "var(--hb-shadow-soft)",
      }}
    >
      <h3
        className="flex items-center gap-2 font-bold uppercase tracking-wider mb-3"
        style={{
          color: "var(--hb-fg-muted)",
          letterSpacing: "0.06em",
          fontSize: "11.5px",
        }}
      >
        {icon} {title}
      </h3>
      {children}
    </section>
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
