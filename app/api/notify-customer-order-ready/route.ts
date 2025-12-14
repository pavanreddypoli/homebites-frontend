import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseServer } from "@/lib/supabaseServer";


const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();

    // Load order (must contain customer_email)
    const { data: order, error: orderErr } = await supabaseServer
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) throw new Error("Order not found");
    if (!order.customer_email) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "No customer email on order",
      });
    }

    // Items
    const { data: items } = await supabaseServer
      .from("order_items")
      .select("*")
      .eq("order_id", orderId);

    const itemsHtml = (items || [])
      .map(
        (i: any) =>
          `<tr>
            <td style="padding:6px 0">${i.dish_name} × ${i.quantity}</td>
            <td style="padding:6px 0;text-align:right">$${(i.price * i.quantity).toFixed(2)}</td>
          </tr>`
      )
      .join("");

    await resend.emails.send({
      from: "HomeBites <onboarding@resend.dev>",
      to: order.customer_email,
      subject: `✅ Your order is ready for pickup (#${String(order.id).slice(0, 8)})`,
      html: `
        <div style="background:#f8fafc;padding:24px;font-family:Arial,sans-serif">
          <div style="max-width:600px;margin:0 auto">

            <div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px">
              <h2 style="color:#16a34a;margin:0 0 8px 0">✅ Ready for Pickup</h2>
              <p style="color:#475569;margin:0">
                Your order from <strong>${order.restaurant_name}</strong> is ready.
              </p>
            </div>

            <div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px">
              <h3 style="margin:0 0 12px 0">Pickup Address</h3>
              <p style="margin:0">${order.restaurant_name}</p>
              <p style="margin:4px 0;color:#475569">${order.pickup_address || "See restaurant details in app"}</p>
            </div>

            <div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px">
              <h3 style="margin:0 0 12px 0">Items</h3>
              <table style="width:100%;border-collapse:collapse">
                ${itemsHtml}
              </table>
              <hr style="margin:12px 0"/>
              <p style="text-align:right;font-weight:700;margin:0">Total: $${Number(order.total).toFixed(2)}</p>
            </div>

            <div style="background:white;border-radius:12px;padding:20px;margin-bottom:16px">
              <p style="margin:0;color:#334155">
                Thank you for supporting <strong>${order.restaurant_name}</strong> 🙏
              </p>
            </div>

            <div style="text-align:center;margin-top:24px">
              <a href="https://homebites.com" style="color:#2563eb;text-decoration:none;font-weight:700">
                Visit HomeBites
              </a>
            </div>

          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("notify-customer-order-ready error:", e);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
