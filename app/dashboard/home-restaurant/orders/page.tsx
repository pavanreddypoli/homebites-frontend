"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ChefNav from "@/components/ChefNav";
import { RefreshCw } from "lucide-react";

type Order = {
  id: string;
  created_at: string;
  status: string;
  total: number;
  customer_name?: string | null;
};

type OrderItem = {
  id: string;
  dish_name: string;
  quantity: number;
  order_id?: string;
};

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  placed:    { bg: "#FFF8E1", color: "#B45309", label: "Placed"    },
  ready:     { bg: "#E0F2FE", color: "#0369A1", label: "Ready"     },
  completed: { bg: "#DCFCE7", color: "#15803D", label: "Completed" },
};

export default function HomeRestaurantOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, OrderItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});

  useEffect(() => { loadOrders(); }, []);

  async function loadOrders() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: restaurant } = await supabase
      .from("home_restaurants").select("id").eq("user_id", user.id).single();
    if (!restaurant) { setLoading(false); return; }

    const { data: ordersData } = await supabase
      .from("orders").select("*").eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false });

    setOrders(ordersData || []);

    const orderIds = (ordersData || []).map((o) => o.id);
    if (orderIds.length > 0) {
      const { data: items } = await supabase
        .from("order_items").select("*").in("order_id", orderIds);
      const grouped: Record<string, OrderItem[]> = {};
      items?.forEach((item: any) => {
        if (!grouped[item.order_id]) grouped[item.order_id] = [];
        grouped[item.order_id].push(item);
      });
      setItemsByOrder(grouped);
    }
    setLoading(false);
  }

  async function updateStatus(orderId: string, status: string) {
    setUpdatingIds((prev) => ({ ...prev, [orderId]: true }));
    const prevOrders = orders;
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));

    const { error } = await supabase.from("orders").update({ status }).eq("id", orderId);
    if (error) {
      setOrders(prevOrders);
      alert("Failed to update order");
      setUpdatingIds((prev) => ({ ...prev, [orderId]: false }));
      return;
    }

    if (status === "ready") {
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

      <main className="pt-14 max-w-[1100px] mx-auto px-4 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-[24px] lg:text-[30px] font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
            >
              Incoming Orders
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--hb-fg-muted)" }}>
              {orders.length} total order{orders.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={loadOrders}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-semibold transition-colors"
            style={{ color: "var(--hb-fg-muted)", border: "1px solid var(--hb-border)", background: "#fff" }}
          >
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        {orders.length === 0 ? (
          <div
            className="rounded-2xl py-16 px-6 text-center"
            style={{ background: "#fff", border: "1px dashed var(--hb-border)" }}
          >
            <p className="text-[15px]" style={{ color: "var(--hb-fg-muted)" }}>No orders yet.</p>
          </div>
        ) : (
          <div
            className="bg-white rounded-2xl overflow-x-auto"
            style={{ border: "1px solid var(--hb-border-soft)", boxShadow: "var(--hb-shadow-soft)" }}
          >
            <table className="min-w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--hb-border)", background: "#FAFAF9" }}>
                  {["Order #", "Date / Time", "Customer", "Items", "Total", "Status", "Action"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wide"
                      style={{ color: "var(--hb-fg-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const dt = new Date(order.created_at);
                  const items = itemsByOrder[order.id] || [];
                  const isUpdating = !!updatingIds[order.id];
                  const s = STATUS_STYLES[order.status] ?? { bg: "#F3F4F6", color: "#374151", label: order.status };

                  return (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-[#FAFAF9]"
                      style={{ borderBottom: "1px solid var(--hb-border-soft)" }}
                    >
                      <td className="px-4 py-3 font-mono text-[12px]" style={{ color: "var(--hb-fg-muted)" }}>
                        #{order.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: "var(--hb-fg-muted)" }}>
                        {dt.toLocaleDateString()}<br />
                        <span className="text-[11px]">{dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </td>
                      <td className="px-4 py-3 text-[13px] font-medium" style={{ color: "var(--hb-fg)" }}>
                        {order.customer_name || "Guest"}
                      </td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: "var(--hb-fg-muted)" }}>
                        {items.map((item) => (
                          <div key={item.id}>{item.dish_name} × {item.quantity}</div>
                        ))}
                      </td>
                      <td className="px-4 py-3 text-[13px] font-bold" style={{ color: "var(--hb-fg)" }}>
                        ${order.total.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2.5 py-1 rounded-full text-[11px] font-bold"
                          style={{ background: s.bg, color: s.color }}
                        >
                          {s.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {order.status === "placed" && (
                          <button
                            disabled={isUpdating}
                            onClick={() => updateStatus(order.id, "ready")}
                            className="px-3 py-1.5 rounded-full text-[12px] font-semibold text-white"
                            style={{ background: "var(--hb-primary)" }}
                          >
                            Mark Ready
                          </button>
                        )}
                        {order.status === "ready" && (
                          <button
                            disabled={isUpdating}
                            onClick={() => updateStatus(order.id, "completed")}
                            className="px-3 py-1.5 rounded-full text-[12px] font-semibold"
                            style={{ background: "#DCFCE7", color: "#15803D" }}
                          >
                            Mark Completed
                          </button>
                        )}
                        {order.status === "completed" && (
                          <span className="text-[12px] font-semibold" style={{ color: "#15803D" }}>✓ Done</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
