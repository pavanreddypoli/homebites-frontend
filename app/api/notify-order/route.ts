import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabaseServer";


const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { orderId, email } = await req.json();

    if (!email) {
      return NextResponse.json({ success: true });
    }

    // 1️⃣ Fetch order (for restaurant + pickup address)
    const { data: order, error: orderError } = await supabaseServer
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // 2️⃣ Fetch order items
    const { data: items, error: itemsError } = await supabaseServer
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (itemsError) {
      throw itemsError;
    }

    // 3️⃣ Build items HTML
    const itemsHtml = items
      .map(
        (item) => `
        <tr>
          <td style="padding:6px 0">${item.dish_name} × ${item.quantity}</td>
          <td style="padding:6px 0;text-align:right">
            $${(item.price * item.quantity).toFixed(2)}
          </td>
        </tr>
      `
      )
      .join("");

    // 4️⃣ Send email
    await resend.emails.send({
      from: "HomeBites <onboarding@resend.dev>",
      to: email,
      subject: "🎉 Your HomeBites order is confirmed",
      html: `
      <div style="background:#f8fafc;padding:24px;font-family:Arial,sans-serif">
        <div style="max-width:600px;margin:0 auto">

          <!-- Header -->
          <div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px">
            <h2 style="color:#16a34a;margin:0 0 8px 0">
              🎉 Order Confirmed
            </h2>
            <p style="color:#475569;margin:0">
              Your order has been placed successfully.
            </p>
          </div>

          <!-- Order Details -->
          <div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px">
            <h3 style="margin:0 0 12px 0">Order Details</h3>
            <p><strong>Order ID:</strong> ${order.id}</p>
            <p><strong>Restaurant:</strong> ${order.restaurant_name}</p>
            <p><strong>Order Type:</strong> Pickup</p>
          </div>

          <!-- Pickup Address -->
          <div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px">
            <h3 style="margin:0 0 12px 0">Pickup Address</h3>
            <p style="margin:0">${order.restaurant_name}</p>
            <p style="margin:4px 0;color:#475569">
              ${order.pickup_address || "Address provided at restaurant"}
            </p>
          </div>

          <!-- Items -->
          <div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px">
            <h3 style="margin:0 0 12px 0">Items</h3>
            <table style="width:100%;border-collapse:collapse">
              ${itemsHtml}
            </table>
            <hr style="margin:12px 0"/>
            <p style="text-align:right;font-weight:600">
              Total: $${order.total.toFixed(2)}
            </p>
          </div>

          <!-- Thank You -->
          <div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px">
            <p style="margin:0;color:#334155">
              Thank you for supporting <strong>${order.restaurant_name}</strong> 🙏
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align:center;margin-top:24px">
            <a
              href="https://homebites.com"
              style="color:#2563eb;text-decoration:none;font-weight:600"
            >
              Visit HomeBites
            </a>
          </div>

        </div>
      </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notification error:", error);
    return NextResponse.json(
      { success: false },
      { status: 500 }
    );
  }
}
