"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // ✅ NEW
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

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

export default function HomeRestaurantOrdersPage() {
  const router = useRouter(); // ✅ NEW

  const [orders, setOrders] = useState<Order[]>([]);
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, OrderItem[]>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: restaurant } = await supabase
      .from("home_restaurants")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!restaurant) return;

    const { data: ordersData } = await supabase
      .from("orders")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("created_at", { ascending: false });

    setOrders(ordersData || []);

    const orderIds = (ordersData || []).map((o) => o.id);

    if (orderIds.length > 0) {
      const { data: items } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds);

      const grouped: Record<string, OrderItem[]> = {};
      items?.forEach((item: any) => {
        if (!grouped[item.order_id]) grouped[item.order_id] = [];
        grouped[item.order_id].push(item);
      });

      setItemsByOrder(grouped);
    } else {
      setItemsByOrder({});
    }

    setLoading(false);
  }

  async function updateStatus(orderId: string, status: string) {
    setUpdatingIds((prev) => ({ ...prev, [orderId]: true }));

    const prevOrders = orders;
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );

    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      console.error(error);
      setOrders(prevOrders);
      alert("Failed to update order");
      setUpdatingIds((prev) => ({ ...prev, [orderId]: false }));
      return;
    }

    // ✅ Notify customer when order is READY
    if (status === "ready") {
      fetch("/api/notify-customer-order-ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      }).catch(() => {});
    }

    setUpdatingIds((prev) => ({ ...prev, [orderId]: false }));
  }

  const statusBadge = (status: string) => {
    if (status === "placed") return "bg-yellow-100 text-yellow-800";
    if (status === "ready") return "bg-blue-100 text-blue-800";
    if (status === "completed") return "bg-green-100 text-green-800";
    return "bg-slate-100 text-slate-700";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading orders…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 py-8">

        {/* ✅ NEW: Top Navigation */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push("/dashboard/home-restaurant")}
            className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Existing Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">
              Incoming Orders
            </h1>
            <p className="text-slate-500 text-sm">
              Manage and prepare customer orders
            </p>
          </div>

          <Button
            onClick={loadOrders}
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Refresh
          </Button>
        </div>

        {orders.length === 0 && (
          <p className="text-slate-500">No orders yet.</p>
        )}

        {orders.length > 0 && (
          <div className="bg-white rounded-2xl shadow-md overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left">Order #</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Items</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => {
                  const dt = new Date(order.created_at);
                  const items = itemsByOrder[order.id] || [];
                  const isUpdating = !!updatingIds[order.id];

                  return (
                    <tr
                      key={order.id}
                      className="border-t hover:bg-indigo-50 transition"
                    >
                      <td className="px-4 py-3 font-semibold">
                        #{order.id.slice(0, 8)}
                      </td>

                      <td className="px-4 py-3">
                        {dt.toLocaleDateString()}
                      </td>

                      <td className="px-4 py-3">
                        {dt.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      <td className="px-4 py-3">
                        {order.customer_name || "Guest"}
                      </td>

                      <td className="px-4 py-3">
                        {items.map((item) => (
                          <div key={item.id}>
                            {item.dish_name} × {item.quantity}
                          </div>
                        ))}
                      </td>

                      <td className="px-4 py-3 text-right font-bold">
                        ${order.total.toFixed(2)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-semibold ${statusBadge(
                            order.status
                          )}`}
                        >
                          {order.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        {order.status === "placed" && (
                          <Button
                            size="sm"
                            disabled={isUpdating}
                            onClick={() =>
                              updateStatus(order.id, "ready")
                            }
                          >
                            Mark Ready
                          </Button>
                        )}

                        {order.status === "ready" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={isUpdating}
                            onClick={() =>
                              updateStatus(order.id, "completed")
                            }
                          >
                            Mark Completed
                          </Button>
                        )}

                        {order.status === "completed" && (
                          <span className="text-green-600 font-semibold">
                            ✓ Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
