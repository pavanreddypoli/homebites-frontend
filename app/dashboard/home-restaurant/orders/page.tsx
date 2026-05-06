"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ChefNav from "@/components/ChefNav";

type Order = {
  id: string;
  created_at: string;
  status: string;
  total: number;
  customer_email?: string | null;
};

type OrderItem = {
  id: string;
  dish_name: string;
  quantity: number;
  price: number;
  order_id?: string;
};

const STATUS: Record<string, { bg: string; color: string; label: string }> = {
  placed:    { bg: "#FFF3D0", color: "#B45309", label: "New Order" },
  ready:     { bg: "#E0F2FE", color: "#0369A1", label: "Ready"     },
  completed: { bg: "#DCFCE7", color: "#15803D", label: "Completed" },
};

function playDing() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.6);
  } catch {}
}

function flashTitle() {
  const original = document.title;
  let tick = true;
  const iv = setInterval(() => {
    document.title = tick ? "🍽️ New Order! — HomeBites" : original;
    tick = !tick;
  }, 800);
  setTimeout(() => {
    clearInterval(iv);
    document.title = original;
  }, 10000);
}

export default function HomeRestaurantOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, OrderItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState("");

  const today = new Date().toDateString();
  const todayOrders = orders.filter((o) => new Date(o.created_at).toDateString() === today);
  const todayRevenue = todayOrders.reduce((s, o) => s + (o.total || 0), 0);
  const pendingCount = orders.filter((o) => o.status === "placed").length;

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 5000);
  }

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function fetchItemsFor(orderIds: string[]) {
      if (!orderIds.length) return;
      const { data } = await supabase.from("order_items").select("*").in("order_id", orderIds);
      if (!data) return;
      setItemsByOrder((prev) => {
        const next = { ...prev };
        data.forEach((item: any) => {
          if (!next[item.order_id]) next[item.order_id] = [];
          if (!next[item.order_id].find((i: OrderItem) => i.id === item.id)) {
            next[item.order_id] = [...next[item.order_id], item];
          }
        });
        return next;
      });
    }

    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      setAccessToken(session?.access_token ?? "");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data: restaurant } = await supabase
        .from("home_restaurants").select("id").eq("user_id", user.id).single();
      if (!restaurant) { setLoading(false); return; }

      const { data: ordersData } = await supabase
        .from("orders").select("*").eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: false });

      setOrders(ordersData || []);
      await fetchItemsFor((ordersData || []).map((o) => o.id));
      setLoading(false);

      channel = supabase
        .channel(`chef-orders-${restaurant.id}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurant.id}` },
          async (payload) => {
            const newOrder = payload.new as Order;
            setOrders((prev) => [newOrder, ...prev]);
            await fetchItemsFor([newOrder.id]);
            setNewOrderIds((prev) => new Set([...prev, newOrder.id]));
            playDing();
            showToast("New order received! 🍽️");
            flashTitle();
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "orders", filter: `restaurant_id=eq.${restaurant.id}` },
          (payload) => {
            const updated = payload.new as Order;
            setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)));
          }
        )
        .subscribe();
    }

    init();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, []);

  async function printLabels(orderId: string) {
    if (!accessToken) { alert("Session expired — please refresh."); return; }
    const res = await fetch(`/api/labels/${orderId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) { alert("Could not generate labels. Please try again."); return; }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }

  async function updateStatus(orderId: string, status: string) {
    setUpdatingIds((prev) => ({ ...prev, [orderId]: true }));
    const prevOrders = orders;
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));

    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) {
      setOrders(prevOrders);
      alert("Failed to update order");
    } else if (status === "ready") {
      fetch("/api/notify-customer-order-ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      }).catch(() => {});
    }
    setUpdatingIds((prev) => ({ ...prev, [orderId]: false }));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--hb-bg)" }}>
        <p className="text-[15px] animate-pulse" style={{ color: "var(--hb-fg-muted)" }}>Loading orders…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--hb-bg)" }}>
      <ChefNav />

      {toast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 rounded-full font-semibold text-white text-[14px] shadow-lg pointer-events-none"
          style={{ background: "var(--hb-primary)", boxShadow: "0 4px 20px rgba(255,122,57,0.45)" }}
        >
          {toast}
        </div>
      )}

      <main className="pt-14 max-w-[900px] mx-auto px-4 lg:px-8 py-8">
        <div className="mb-6">
          <h1
            className="text-[24px] lg:text-[30px] font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
          >
            Incoming Orders
          </h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--hb-fg-muted)" }}>
            Live · {orders.length} total order{orders.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Today's Orders", value: String(todayOrders.length), hi: false },
            { label: "Today's Revenue", value: `$${todayRevenue.toFixed(2)}`, hi: false },
            { label: "Pending", value: String(pendingCount), hi: pendingCount > 0 },
          ].map(({ label, value, hi }) => (
            <div
              key={label}
              className="rounded-2xl p-4 text-center"
              style={{
                background: hi ? "#FFF3D0" : "#fff",
                border: `1px solid ${hi ? "#FDE68A" : "var(--hb-border-soft)"}`,
                boxShadow: "var(--hb-shadow-soft)",
              }}
            >
              <p
                className="text-[22px] font-bold"
                style={{ color: hi ? "#B45309" : "var(--hb-fg)", fontFamily: "var(--font-display)" }}
              >
                {value}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "var(--hb-fg-muted)" }}>{label}</p>
            </div>
          ))}
        </div>

        {orders.length === 0 ? (
          <div
            className="rounded-2xl py-16 px-6 text-center"
            style={{ background: "#fff", border: "1px dashed var(--hb-border)" }}
          >
            <p className="text-[15px]" style={{ color: "var(--hb-fg-muted)" }}>
              No orders yet. New orders appear here instantly.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const isNew = newOrderIds.has(order.id);
              const items = itemsByOrder[order.id] || [];
              const isUpdating = !!updatingIds[order.id];
              const s = STATUS[order.status] ?? { bg: "#F3F4F6", color: "#374151", label: order.status };
              const dt = new Date(order.created_at);

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl overflow-hidden"
                  style={{
                    borderTop: "1px solid var(--hb-border-soft)",
                    borderRight: "1px solid var(--hb-border-soft)",
                    borderBottom: "1px solid var(--hb-border-soft)",
                    borderLeft: isNew ? "4px solid var(--hb-primary)" : "1px solid var(--hb-border-soft)",
                    boxShadow: "var(--hb-shadow-soft)",
                  }}
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[13px] font-bold" style={{ color: "var(--hb-fg)" }}>
                            #{order.id.slice(0, 6).toUpperCase()}
                          </span>
                          {isNew && (
                            <span
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white animate-pulse"
                              style={{ background: "var(--hb-primary)" }}
                            >
                              NEW
                            </span>
                          )}
                        </div>
                        <p className="text-[11.5px] mt-0.5" style={{ color: "var(--hb-fg-muted)" }}>
                          {dt.toLocaleDateString()} · {dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {order.customer_email && ` · ${order.customer_email}`}
                        </p>
                      </div>
                      <span
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold flex-shrink-0 ml-2"
                        style={{ background: s.bg, color: s.color }}
                      >
                        {s.label}
                      </span>
                    </div>

                    <div className="space-y-1 mb-3">
                      {items.length === 0 ? (
                        <p className="text-[12px]" style={{ color: "var(--hb-fg-muted)" }}>Loading items…</p>
                      ) : items.map((item) => (
                        <div key={item.id} className="flex justify-between text-[13px]">
                          <span style={{ color: "var(--hb-fg)" }}>
                            <b>{item.quantity}×</b> {item.dish_name}
                          </span>
                          {item.price != null && (
                            <span style={{ color: "var(--hb-fg-muted)", fontVariantNumeric: "tabular-nums" }}>
                              ${(item.price * item.quantity).toFixed(2)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    <div
                      className="flex items-center justify-between pt-3"
                      style={{ borderTop: "1px solid var(--hb-border-soft)" }}
                    >
                      <span
                        className="text-[15px] font-bold"
                        style={{ color: "var(--hb-fg)", fontVariantNumeric: "tabular-nums" }}
                      >
                        ${order.total.toFixed(2)}
                      </span>
                      <div>
                        {order.status === "placed" && (
                          <button
                            disabled={isUpdating}
                            onClick={() => updateStatus(order.id, "ready")}
                            className="px-4 py-2 rounded-full text-[12px] font-semibold text-white disabled:opacity-60"
                            style={{ background: "var(--hb-primary)" }}
                          >
                            {isUpdating ? "Saving…" : "Mark Ready"}
                          </button>
                        )}
                        {order.status === "ready" && (
                          <button
                            disabled={isUpdating}
                            onClick={() => updateStatus(order.id, "completed")}
                            className="px-4 py-2 rounded-full text-[12px] font-semibold disabled:opacity-60"
                            style={{ background: "#DCFCE7", color: "#15803D", border: "1px solid #86EFAC" }}
                          >
                            {isUpdating ? "Saving…" : "Mark Completed"}
                          </button>
                        )}
                        {order.status === "completed" && (
                          <span className="text-[12px] font-semibold" style={{ color: "#15803D" }}>✓ Completed</span>
                        )}
                      </div>
                    </div>

                    {/* Print labels */}
                    <div className="px-4 pb-3">
                      <button
                        onClick={() => printLabels(order.id)}
                        className="text-[12px] font-semibold px-3 py-1.5 rounded-full"
                        style={{ color: "var(--hb-primary)", border: "1px solid var(--hb-primary)", background: "#fff" }}
                      >
                        Print labels
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
