"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import CustomerNav from "@/components/CustomerNav";
import { clearCart, saveCart } from "@/lib/cart";
import type { Cart } from "@/lib/cart";
import { ShoppingBag, Search, RotateCcw, ChevronRight } from "lucide-react";

type Order = {
  id: string;
  created_at: string;
  status: string;
  total: number;
  restaurant_name: string;
  restaurant_id: string;
  customer_email: string;
};

type OrderItem = {
  id: string;
  dish_id: string;
  dish_name: string;
  price: number;
  quantity: number;
  order_id: string;
};

const STATUS: Record<string, { bg: string; color: string; label: string }> = {
  placed:    { bg: "#FFF3D0", color: "#B45309", label: "Being Prepared" },
  ready:     { bg: "#E0F2FE", color: "#0369A1", label: "Ready"          },
  completed: { bg: "#DCFCE7", color: "#15803D", label: "Completed"      },
};

export default function OrdersPage() {
  return (
    <Suspense>
      <CustomerOrdersPage />
    </Suspense>
  );
}

function CustomerOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [searchedEmail, setSearchedEmail] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, OrderItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [reorderingId, setReorderingId] = useState<string | null>(null);

  // Auto-load: URL ?email= param (from /foodies redirect) takes priority over auth user
  useEffect(() => {
    async function init() {
      const urlEmail = searchParams.get("email");
      if (urlEmail) {
        setEmail(urlEmail);
        doSearch(urlEmail);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
        doSearch(user.email);
      }
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doSearch(emailToSearch: string) {
    const trimmed = emailToSearch.trim();
    if (!trimmed) return;

    setLoading(true);
    setSearched(true);
    setSearchedEmail(trimmed);

    const res = await fetch("/api/orders-by-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed }),
    });

    if (!res.ok) {
      setOrders([]);
      setItemsByOrder({});
      setLoading(false);
      return;
    }

    const data = await res.json();
    setOrders(data.orders || []);
    setItemsByOrder(data.itemsByOrder || {});
    setLoading(false);
  }

  async function handleReorder(order: Order) {
    const items = itemsByOrder[order.id] || [];
    if (!items.length) return;

    setReorderingId(order.id);

    clearCart();
    const cart: Cart = {
      restaurant_id: order.restaurant_id,
      restaurant_name: order.restaurant_name,
      items: items.map((item) => ({
        dish_id: item.dish_id,
        name: item.dish_name,
        price: item.price,
        quantity: item.quantity,
      })),
    };
    saveCart(cart);
    window.dispatchEvent(new Event("homebites:cart-updated"));

    setReorderingId(null);
    router.push(`/dashboard/customer/restaurant/${order.restaurant_id}`);
  }

  return (
    <>
      <CustomerNav />
      <div className="min-h-screen pt-14 lg:pt-16" style={{ background: "var(--hb-bg)" }}>
        <div className="max-w-[760px] mx-auto px-4 lg:px-8 py-8 lg:py-12">
          <h1
            className="font-bold text-[28px] lg:text-[36px] leading-tight tracking-[-0.025em] mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
          >
            Order History
          </h1>
          <p className="text-[14px] mb-7" style={{ color: "var(--hb-fg-muted)" }}>
            Look up past orders by email address.
          </p>

          {/* Email lookup form */}
          <form
            onSubmit={(e) => { e.preventDefault(); doSearch(email); }}
            className="flex gap-2 mb-8"
          >
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex-1 px-4 py-3 rounded-xl text-[14px] outline-none"
              style={{
                background: "#fff",
                border: "1px solid var(--hb-border-soft)",
                color: "var(--hb-fg)",
              }}
            />
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-3 rounded-xl text-[14px] font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--hb-primary)" }}
            >
              <Search size={15} />
              {loading ? "Searching…" : "Search"}
            </button>
          </form>

          {/* Results */}
          {loading && (
            <p className="text-center text-[14px] animate-pulse" style={{ color: "var(--hb-fg-muted)" }}>
              Looking up orders…
            </p>
          )}

          {!loading && searched && orders.length === 0 && (
            <div className="text-center py-16">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "var(--hb-primary-soft)", color: "var(--hb-primary)" }}
              >
                <ShoppingBag size={28} />
              </div>
              <h2
                className="font-bold text-[20px] mb-1"
                style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
              >
                No orders found
              </h2>
              <p className="text-[14px] mb-5" style={{ color: "var(--hb-fg-muted)" }}>
                No orders found for <b>{searchedEmail}</b>.
              </p>
              <button
                onClick={() => router.push("/dashboard/customer")}
                className="px-5 py-3 rounded-full font-bold text-[14px] text-white"
                style={{ background: "var(--hb-primary)" }}
              >
                Browse restaurants
              </button>
            </div>
          )}

          {!loading && orders.length > 0 && (
            <div className="space-y-3">
              {orders.map((order) => {
                const items = itemsByOrder[order.id] || [];
                const s = STATUS[order.status] ?? { bg: "#F3F4F6", color: "#374151", label: order.status };
                const dt = new Date(order.created_at);
                const isReordering = reorderingId === order.id;

                return (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl p-4"
                    style={{ border: "1px solid var(--hb-border-soft)", boxShadow: "var(--hb-shadow-soft)" }}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-[15px] font-bold" style={{ color: "var(--hb-fg)" }}>
                          {order.restaurant_name}
                        </p>
                        <p className="text-[12px] mt-0.5" style={{ color: "var(--hb-fg-muted)" }}>
                          {dt.toLocaleDateString()} · {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {" · "}
                          <span className="font-mono"># {order.id.slice(0, 8).toUpperCase()}</span>
                        </p>
                      </div>
                      <span
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold flex-shrink-0 ml-2"
                        style={{ background: s.bg, color: s.color }}
                      >
                        {s.label}
                      </span>
                    </div>

                    {/* Items summary */}
                    {items.length > 0 && (
                      <p className="text-[13px] mb-3" style={{ color: "var(--hb-fg-muted)" }}>
                        {items.slice(0, 3).map((i) => `${i.quantity}× ${i.dish_name}`).join(", ")}
                        {items.length > 3 && ` +${items.length - 3} more`}
                      </p>
                    )}

                    {/* Footer */}
                    <div
                      className="flex items-center justify-between pt-3"
                      style={{ borderTop: "1px solid var(--hb-border-soft)" }}
                    >
                      <span className="text-[15px] font-bold" style={{ color: "var(--hb-fg)", fontVariantNumeric: "tabular-nums" }}>
                        ${(order.total ?? 0).toFixed(2)}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReorder(order)}
                          disabled={isReordering}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold disabled:opacity-60"
                          style={{ color: "var(--hb-primary)", border: "1px solid var(--hb-primary)", background: "transparent" }}
                        >
                          <RotateCcw size={11} />
                          {isReordering ? "Adding…" : "Reorder"}
                        </button>
                        <button
                          onClick={() => router.push(`/dashboard/customer/order-confirmation/${order.id}`)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[12px] font-semibold"
                          style={{ color: "var(--hb-fg-muted)", border: "1px solid var(--hb-border-soft)", background: "#fff" }}
                        >
                          Track <ChevronRight size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
