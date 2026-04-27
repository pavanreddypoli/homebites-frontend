import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabaseServer";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();

    // 1) Load order
    const { data: order, error: orderErr } = await supabaseServer
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) throw new Error("Order not found");

    // 2) Load restaurant (to get chef email)
    const { data: hr, error: hrErr } = await supabaseServer
      .from("home_restaurants")
      .select("id, notification_email, name")
      .eq("id", order.restaurant_id)
      .single();

    if (hrErr || !hr) throw new Error("Home restaurant not found");
    if (!hr.notification_email) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "No chef notification email set",
      });
    }

    // 3) Load items
    const { data: items, error: itemsErr } = await supabaseServer
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    if (itemsErr) throw itemsErr;

    const itemsHtml = (items || [])
      .map(
        (i: any) =>
          `<tr>
            <td style="padding:6px 0">${i.dish_name} × ${i.quantity}</td>
            <td style="padding:6px 0;text-align:right">$${(i.price * i.quantity).toFixed(2)}</td>
          </tr>`
      )
      .join("");

    // 4) Send email
    await resend.emails.send({
      from: "HomeBites <onboarding@resend.dev>",
      to: hr.notification_email,
      subject: `📦 New HomeBites Order #${String(order.id).slice(0, 8)}`,
      html: `
        <div style="background:#f8fafc;padding:24px;font-family:Arial,sans-serif">
          <div style="max-width:600px;margin:0 auto">

            <div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px">
              <h2 style="margin:0 0 8px 0;color:#0f172a">📦 New Order Received</h2>
              <p style="margin:0;color:#475569">Please prepare this order for pickup.</p>
            </div>

            <div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px">
              <h3 style="margin:0 0 12px 0">Order Details</h3>
              <p style="margin:4px 0"><strong>Order ID:</strong> ${order.id}</p>
              <p style="margin:4px 0"><strong>Customer:</strong> ${order.customer_name || "Guest"}</p>
              <p style="margin:4px 0"><strong>Order Type:</strong> Pickup</p>
              <p style="margin:4px 0"><strong>Placed At:</strong> ${new Date(order.created_at).toLocaleString()}</p>
            </div>

            <div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px">
              <h3 style="margin:0 0 12px 0">Items</h3>
              <table style="width:100%;border-collapse:collapse">
                ${itemsHtml}
              </table>
              <hr style="margin:12px 0"/>
              <p style="text-align:right;font-weight:700;margin:0">Total: $${Number(order.total).toFixed(2)}</p>
            </div>

            <div style="text-align:center;margin-top:24px">
              <a href="https://homebites.com" style="color:#2563eb;text-decoration:none;font-weight:700">
                Open HomeBites
              </a>
            </div>

          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("notify-chef-new-order error:", e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
