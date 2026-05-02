"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import CustomerNav from "@/components/CustomerNav";
import { CheckCircle2, Store, Clock, Receipt, Copy, Check, Star } from "lucide-react";

type Order = {
  id: string;
  restaurant_id: string;
  restaurant_name: string;
  order_type: string;
  subtotal: number;
  service_fee: number;
  tax: number;
  total: number;
  created_at: string;
  status: string;
  customer_email?: string;
};

type OrderItem = {
  id: string;
  dish_name: string;
  price: number;
  quantity: number;
};

const CONFETTI_COLORS = ["#FF7A39", "#FFD700", "#FF69B4", "#00CED1", "#32CD32", "#9370DB", "#FF4500"];

const steps = [
  { label: "Order Placed",      icon: "✅", key: "placed"    },
  { label: "Being Prepared",    icon: "🍳", key: "preparing" },
  { label: "Ready for Pickup",  icon: "🎉", key: "ready"     },
];

function getStepState(status: string, stepIdx: number): "done" | "active" | "pending" {
  if (status === "placed") {
    if (stepIdx === 0) return "done";
    if (stepIdx === 1) return "active";
    return "pending";
  }
  if (status === "ready") {
    if (stepIdx <= 1) return "done";
    if (stepIdx === 2) return "active";
    return "pending";
  }
  if (status === "completed") return "done";
  return stepIdx === 0 ? "done" : "pending";
}

export default function OrderConfirmationPage() {
  const { orderId } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  // Review state
  const [selectedRating, setSelectedRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [existingReview, setExistingReview] = useState<{ rating: number; comment?: string | null } | null>(null);

  const confettiPieces = useRef(
    Array.from({ length: 32 }, (_, i) => ({
      id: i,
      left: `${(i / 32) * 100 + Math.random() * 3}%`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: `${(i * 0.05).toFixed(2)}s`,
      size: `${7 + (i % 5)}px`,
      duration: `${2.2 + (i % 4) * 0.3}s`,
    }))
  );

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) { setLoading(false); return; }

      const { data, error: rpcError } = await supabase.rpc(
        "get_order_with_items",
        { p_order_id: String(orderId) }
      );

      if (rpcError || !data) {
        console.error("ORDER CONFIRMATION RPC ERROR:", rpcError);
        setLoading(false);
        return;
      }

      const loadedOrder = (data as any).order ?? null;
      setOrder(loadedOrder);
      setItems(((data as any).items ?? []) as OrderItem[]);
      setLoading(false);

      if (loadedOrder?.status === "ready") {
        setShowConfetti(true);
        document.title = "🎉 Order Ready! — HomeBites";
        setTimeout(() => setShowConfetti(false), 4000);
      }

      // Check for existing review
      if (loadedOrder?.id) {
        const { data: reviewData } = await supabase
          .from("reviews")
          .select("rating, comment")
          .eq("order_id", loadedOrder.id)
          .maybeSingle();
        if (reviewData) setExistingReview(reviewData);
      }
    }

    loadOrder();
  }, [orderId]);

  // Realtime: listen for status changes on this specific order
  useEffect(() => {
    if (!orderId) return;

    const channel = supabase
      .channel(`order-status-${orderId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
        (payload) => {
          const updated = payload.new as Partial<Order>;
          setOrder((prev) => prev ? { ...prev, ...updated } : prev);
          if (updated.status === "ready") {
            setShowConfetti(true);
            document.title = "🎉 Order Ready! — HomeBites";
            setTimeout(() => setShowConfetti(false), 4000);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orderId]);

  if (loading) {
    return <Shell><Centered text="Loading order…" /></Shell>;
  }

  if (!order) {
    return <Shell><Centered text="Order not found." /></Shell>;
  }

  async function handleSubmitReview() {
    if (!selectedRating || !order) return;
    setReviewSubmitting(true);
    await supabase.from("reviews").insert({
      order_id:      order.id,
      restaurant_id: order.restaurant_id,
      customer_email: order.customer_email ?? "guest",
      rating:  selectedRating,
      comment: reviewComment.trim() || null,
    });
    setReviewSubmitting(false);
    setReviewSubmitted(true);
    setExistingReview({ rating: selectedRating, comment: reviewComment.trim() || null });
  }

  const shortId = order.id.slice(0, 8).toUpperCase();
  const statusMsg =
    order.status === "ready"
      ? "🎉 Your order is ready for pickup!"
      : order.status === "completed"
      ? "✓ Order completed — thank you!"
      : `Your order is being prepared by ${order.restaurant_name}.`;

  return (
    <Shell>
      {/* Confetti overlay */}
      {showConfetti && (
        <>
          <style>{`
            @keyframes confetti-fall {
              0%   { transform: translateY(-20px) rotate(0deg); opacity: 1; }
              85%  { opacity: 1; }
              100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
            }
          `}</style>
          <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
            {confettiPieces.current.map((p) => (
              <div
                key={p.id}
                style={{
                  position: "absolute",
                  top: "-20px",
                  left: p.left,
                  width: p.size,
                  height: p.size,
                  background: p.color,
                  borderRadius: p.id % 3 === 0 ? "50%" : "2px",
                  animation: `confetti-fall ${p.duration} ${p.delay} ease-in forwards`,
                }}
              />
            ))}
          </div>
        </>
      )}

      <div className="max-w-[760px] mx-auto px-4 lg:px-8 py-8 lg:py-12">
        {/* Hero card */}
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
            <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: "#C24B12" }}>
              Order confirmed
            </div>
            <h1
              className="font-bold text-[28px] lg:text-[40px] leading-[1.05] tracking-[-0.025em] mb-2"
              style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
            >
              {order.status === "ready" ? (
                <>Your food is{" "}
                  <span style={{ color: "var(--hb-primary)", fontStyle: "italic" }}>ready!</span>
                </>
              ) : (
                <>Your order is on the way to{" "}
                  <span style={{ color: "var(--hb-primary)", fontStyle: "italic" }}>being made</span>
                </>
              )}
            </h1>
            <p className="text-[14px] lg:text-[15px] leading-[1.55]" style={{ color: "var(--hb-fg-muted)" }}>
              {statusMsg}
            </p>

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

        {/* Progress tracker */}
        <div
          className="bg-white rounded-2xl p-5 mb-4"
          style={{ border: "1px solid var(--hb-border-soft)", boxShadow: "var(--hb-shadow-soft)" }}
        >
          <h3
            className="font-bold uppercase tracking-wider mb-5 text-[11.5px]"
            style={{ color: "var(--hb-fg-muted)", letterSpacing: "0.06em" }}
          >
            Order status
          </h3>
          <div className="flex items-start">
            {steps.map((step, idx) => {
              const state = getStepState(order.status, idx);
              return (
                <div key={step.key} className="flex-1 flex flex-col items-center relative">
                  {/* Connector line */}
                  {idx < steps.length - 1 && (
                    <div
                      className="absolute top-[14px] left-1/2 w-full h-[2px]"
                      style={{
                        background: getStepState(order.status, idx + 1) !== "pending"
                          ? "var(--hb-primary)"
                          : "var(--hb-border-soft)",
                        zIndex: 0,
                      }}
                    />
                  )}
                  {/* Circle */}
                  <div
                    className="relative z-10 w-7 h-7 rounded-full flex items-center justify-center text-[13px] mb-2 flex-shrink-0"
                    style={{
                      background:
                        state === "done"   ? "var(--hb-primary)" :
                        state === "active" ? "var(--hb-primary)" :
                        "var(--hb-border-soft)",
                      boxShadow: state === "active" ? "0 0 0 4px rgba(255,122,57,0.2)" : "none",
                      animation: state === "active" ? "pulse 2s infinite" : "none",
                    }}
                  >
                    {state === "done" ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <span style={{ fontSize: "12px" }}>{step.icon}</span>
                    )}
                  </div>
                  {/* Label */}
                  <p
                    className="text-[11px] font-semibold text-center leading-tight px-1"
                    style={{
                      color: state === "pending" ? "var(--hb-fg-muted)" : "var(--hb-fg)",
                    }}
                  >
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pickup card */}
        <Card title="Pickup details" icon={<Store size={14} />}>
          <p className="text-[15px] font-semibold" style={{ color: "var(--hb-fg)" }}>
            {order.restaurant_name}
          </p>
          <div className="flex items-center gap-2 mt-2 text-[13px]" style={{ color: "var(--hb-fg-muted)" }}>
            <Clock size={13} style={{ color: "var(--hb-primary)" }} />
            <span>
              <b style={{ color: "var(--hb-fg)" }}>Ready in 25–35 min</b> · We'll notify you when it's ready
            </span>
          </div>
          <div
            className="mt-3 p-3 rounded-xl text-[13px] leading-[1.55]"
            style={{ background: "#FBF7F1", color: "var(--hb-fg-muted)" }}
          >
            Please pick up your order directly from the home restaurant. Bring your order ID — they'll be expecting you.
          </div>
        </Card>

        {/* Order summary */}
        <Card title="Order summary" icon={<Receipt size={14} />} className="mt-4">
          <div className="space-y-2.5">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between text-[14px]">
                <span style={{ color: "var(--hb-fg)" }}>
                  <b>{item.quantity}×</b> {item.dish_name}
                </span>
                <span style={{ color: "var(--hb-fg)", fontVariantNumeric: "tabular-nums" }}>
                  ${(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <hr className="my-4" style={{ borderColor: "var(--hb-border-soft)" }} />

          <div className="space-y-1.5 text-[13px]" style={{ color: "var(--hb-fg-muted)" }}>
            <Row label="Subtotal" value={`$${(order.subtotal ?? 0).toFixed(2)}`} />
            <Row label="Service fee" value={`$${(order.service_fee ?? 0).toFixed(2)}`} />
            <Row label="Tax" value={`$${(order.tax ?? 0).toFixed(2)}`} />
          </div>

          <div
            className="flex justify-between font-bold text-[18px] pt-3 mt-3"
            style={{ color: "var(--hb-fg)", borderTop: "1px solid var(--hb-border-soft)" }}
          >
            <span style={{ fontFamily: "var(--font-display)" }}>Total paid</span>
            <span style={{ fontVariantNumeric: "tabular-nums" }}>${(order.total ?? 0).toFixed(2)}</span>
          </div>
        </Card>

        {/* Review card — shown when order is ready or completed */}
        {(order.status === "ready" || order.status === "completed") && (
          <div
            className="mt-4 bg-white rounded-2xl p-5"
            style={{ border: "1px solid #EDE3D2", boxShadow: "var(--hb-shadow-soft)" }}
          >
            {existingReview ? (
              <div>
                <h3 className="text-[16px] font-semibold mb-2" style={{ color: "var(--hb-fg)" }}>
                  Your review
                </h3>
                <div className="flex gap-1 mb-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      size={22}
                      fill={s <= existingReview.rating ? "#FFB400" : "none"}
                      stroke={s <= existingReview.rating ? "#FFB400" : "#D1D5DB"}
                    />
                  ))}
                </div>
                {existingReview.comment && (
                  <p className="text-[13px] leading-[1.55]" style={{ color: "var(--hb-fg-muted)" }}>
                    "{existingReview.comment}"
                  </p>
                )}
              </div>
            ) : reviewSubmitted ? (
              <p className="text-[15px] font-semibold text-center py-2" style={{ color: "var(--hb-fg)" }}>
                Thanks for your review! 🙏
              </p>
            ) : (
              <div>
                <h3 className="text-[16px] font-semibold mb-3" style={{ color: "var(--hb-fg)" }}>
                  How was your order?
                </h3>
                <div
                  className="flex gap-2 mb-4"
                  onMouseLeave={() => setHoveredRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedRating(s)}
                      onMouseEnter={() => setHoveredRating(s)}
                      className="p-0.5 transition-transform hover:scale-110"
                    >
                      <Star
                        size={32}
                        fill={(hoveredRating || selectedRating) >= s ? "#FFB400" : "none"}
                        stroke={(hoveredRating || selectedRating) >= s ? "#FFB400" : "#D1D5DB"}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  placeholder="Tell us more (optional)"
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-[13px] outline-none resize-none mb-3"
                  style={{
                    background: "#FBF7F1",
                    border: "1px solid #EDE3D2",
                    color: "var(--hb-fg)",
                  }}
                />
                <button
                  onClick={handleSubmitReview}
                  disabled={!selectedRating || reviewSubmitting}
                  className="w-full py-3 rounded-full font-bold text-[14px] text-white disabled:opacity-50"
                  style={{ background: "var(--hb-primary)" }}
                >
                  {reviewSubmitting ? "Submitting…" : "Submit Review"}
                </button>
              </div>
            )}
          </div>
        )}

        <button
          className="w-full mt-6 py-3.5 rounded-full font-bold text-[15px] text-white transition-colors"
          style={{
            background: "var(--hb-primary)",
            boxShadow: "0 4px 14px -2px rgba(255,122,57,.45)",
          }}
          onClick={() => router.push("/dashboard/customer")}
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
      style={{ border: "1px solid var(--hb-border-soft)", boxShadow: "var(--hb-shadow-soft)" }}
    >
      <h3
        className="flex items-center gap-2 font-bold uppercase tracking-wider mb-3"
        style={{ color: "var(--hb-fg-muted)", letterSpacing: "0.06em", fontSize: "11.5px" }}
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
