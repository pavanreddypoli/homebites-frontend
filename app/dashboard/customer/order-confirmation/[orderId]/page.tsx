"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";

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

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) {
        setLoading(false);
        return;
      }

      // ✅ Guest-safe: fetch via RPC (no direct SELECT on RLS-protected tables)
      const { data, error: rpcError } = await supabase.rpc(
        "get_order_with_items",
        { p_order_id: String(orderId) }
      );

      if (rpcError || !data) {
        console.error("ORDER CONFIRMATION RPC ERROR:", rpcError);
        setLoading(false);
        return;
      }

      // data shape returned by RPC: { order: {...}, items: [...] }
      setOrder((data as any).order ?? null);
      setItems(((data as any).items ?? []) as OrderItem[]);
      setLoading(false);
    }

    loadOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading order…
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Order not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Success */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h1 className="text-2xl font-bold text-green-600">
            🎉 Order Confirmed
          </h1>
          <p className="text-slate-600 mt-2">
            Your order has been placed successfully.
          </p>
        </div>

        {/* Order Info */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="font-semibold mb-2">Order Details</h2>
          <p className="text-sm text-slate-600">
            <strong>Order ID:</strong> {order.id}
          </p>
          <p className="text-sm text-slate-600">
            <strong>Restaurant:</strong> {order.restaurant_name}
          </p>
          <p className="text-sm text-slate-600">
            <strong>Order Type:</strong> Pickup
          </p>
          <p className="text-sm text-slate-600">
            <strong>Placed At:</strong>{" "}
            {new Date(order.created_at).toLocaleString()}
          </p>
        </div>

        {/* Pickup Info */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="font-semibold mb-2">Pickup Instructions</h2>
          <p className="text-sm text-slate-600">
            Please pick up your order directly from the home restaurant.
          </p>
        </div>

        {/* Items */}
        <div className="bg-white rounded-xl p-6 shadow-sm mb-6">
          <h2 className="font-semibold mb-4">Items</h2>

          {items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm mb-2">
              <span>
                {item.dish_name} × {item.quantity}
              </span>
              <span>${(item.price * item.quantity).toFixed(2)}</span>
            </div>
          ))}

          <hr className="my-3" />

          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>${order.subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span>Service fee</span>
            <span>${order.service_fee.toFixed(2)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span>Tax</span>
            <span>${order.tax.toFixed(2)}</span>
          </div>

          <div className="flex justify-between font-semibold mt-2">
            <span>Total</span>
            <span>${order.total.toFixed(2)}</span>
          </div>
        </div>

        <Button
          className="w-full"
          onClick={() => (window.location.href = "/dashboard/customer")}
        >
          Back to Home
        </Button>
      </div>
    </div>
  );
}
