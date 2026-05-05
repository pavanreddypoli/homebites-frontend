import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.slice(7);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: { user }, error: authErr } = await supabaseServer.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.user_metadata?.role !== "home_restaurant")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { storage_path, expires_at } = await req.json();
  if (!storage_path?.trim()) return NextResponse.json({ error: "storage_path is required" }, { status: 400 });
  if (!expires_at) return NextResponse.json({ error: "expires_at is required" }, { status: 400 });

  const today = new Date().toISOString().split("T")[0];
  if (expires_at <= today)
    return NextResponse.json({ error: "Certificate must not be expired" }, { status: 400 });

  // Fix 3: strict path validation — reject traversal attempts and enforce naming pattern
  if (
    storage_path.includes("..") ||
    storage_path.includes("//") ||
    !storage_path.startsWith(`${user.id}/`)
  ) {
    return NextResponse.json({ error: "Invalid storage path" }, { status: 400 });
  }
  const pathPattern = new RegExp(`^${user.id}/food_handler_\\d+\\.(pdf|jpg|jpeg|png)$`);
  if (!pathPattern.test(storage_path)) {
    return NextResponse.json({ error: "Invalid storage path format" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  const { error: hrErr } = await supabaseServer.from("home_restaurants").upsert(
    {
      id: user.id,
      user_id: user.id, // Fix 1: user_id
      food_handler_cert_url: storage_path,
      food_handler_cert_expires_at: expires_at,
    },
    { onConflict: "id" }
  );
  if (hrErr) return NextResponse.json({ error: hrErr.message }, { status: 500 });

  const { error: logErr } = await supabaseServer.from("compliance_audit_log").insert({
    user_id: user.id,
    home_restaurant_id: user.id,
    event_type: "cert_uploaded",
    event_data: { storage_path, expires_at },
    ip_address: ip,
    user_agent: userAgent,
  });
  if (logErr) console.error("[save-cert] audit log error:", logErr.message);

  return NextResponse.json({ ok: true });
}
