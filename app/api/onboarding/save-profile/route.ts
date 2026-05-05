import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.slice(7);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user }, error: authErr } = await supabaseServer.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.user_metadata?.role !== "home_restaurant")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const {
    name, cuisine, description, city, lat, lng, hours,
    delivery_radius_km, notification_email, sells_tcs_foods, dshs_registration_id,
  } = body;

  if (!name?.trim())
    return NextResponse.json({ error: "Restaurant name is required" }, { status: 400 });
  if (!cuisine?.trim())
    return NextResponse.json({ error: "Cuisine type is required" }, { status: 400 });
  if (!notification_email?.trim())
    return NextResponse.json({ error: "Notification email is required" }, { status: 400 });
  if (lat == null || lng == null)
    return NextResponse.json({ error: "Address is required — use autocomplete to set coordinates" }, { status: 400 });
  if (sells_tcs_foods && !dshs_registration_id?.trim())
    return NextResponse.json({ error: "DSHS registration ID is required for TCS foods" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  const { error: hrErr } = await supabaseServer.from("home_restaurants").upsert(
    {
      id: user.id,
      user_id: user.id, // Fix 1: user_id
      name: name.trim(),
      cuisine: cuisine.trim(),
      description: description?.trim() ?? null,
      city: city?.trim() ?? null,
      lat,
      lng,
      hours: hours?.trim() ?? null,
      delivery_radius_km: delivery_radius_km ?? 5,
      notification_email: notification_email.trim(),
      sells_tcs_foods: sells_tcs_foods ?? false,
      dshs_registration_id: sells_tcs_foods ? dshs_registration_id?.trim() : null,
    },
    { onConflict: "id" }
  );
  if (hrErr) return NextResponse.json({ error: hrErr.message }, { status: 500 });

  const { error: logErr } = await supabaseServer.from("compliance_audit_log").insert({
    user_id: user.id,
    home_restaurant_id: user.id,
    event_type: "profile_saved",
    event_data: {
      name,
      cuisine,
      sells_tcs_foods,
      has_dshs_id: !!dshs_registration_id,
    },
    ip_address: ip,
    user_agent: userAgent,
  });
  if (logErr) console.error("[save-profile] audit log error:", logErr.message);

  return NextResponse.json({ ok: true });
}
