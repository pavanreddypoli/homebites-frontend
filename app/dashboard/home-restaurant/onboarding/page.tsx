"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ChefNav from "@/components/ChefNav";

export default function HomeRestaurantOnboarding() {
  const [restaurantName, setRestaurantName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [hours, setHours] = useState("");
  const [address, setAddress] = useState("");
  const [addressResults, setAddressResults] = useState<any[]>([]);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [deliveryRadius, setDeliveryRadius] = useState(5);
  const [message, setMessage] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadExisting() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }

      const { data } = await supabase
        .from("home_restaurants")
        .select("id, name, cuisine, description, city, hours, lat, lng, delivery_radius_km, notification_email")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setRestaurantName(data.name ?? "");
        setCuisine(data.cuisine ?? "");
        setDescription(data.description ?? "");
        setCity(data.city ?? "");
        setHours(data.hours ?? "");
        setLat(data.lat ?? null);
        setLng(data.lng ?? null);
        setDeliveryRadius(typeof data.delivery_radius_km === "number" ? data.delivery_radius_km : 5);
        setNotificationEmail(data.notification_email ?? "");
      }
      setLoadingProfile(false);
    }
    loadExisting();
  }, []);

  async function searchAddress(query: string) {
    if (query.length < 3) { setAddressResults([]); return; }
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}`
    );
    const data = await res.json();
    setAddressResults(data.slice(0, 5));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("User not logged in."); setSaving(false); return; }
    if (!notificationEmail) { setMessage("Please provide an email for order notifications."); setSaving(false); return; }
    if (address.trim().length > 0 && (!lat || !lng)) {
      setMessage("Please select a valid address from suggestions.");
      setSaving(false);
      return;
    }

    const { data: existing } = await supabase
      .from("home_restaurants").select("id").eq("user_id", user.id).maybeSingle();

    const payload = {
      name: restaurantName, cuisine, description, city, hours, lat, lng,
      delivery_radius_km: deliveryRadius,
      notification_email: notificationEmail,
      is_active: true,
    };

    if (existing?.id) {
      await supabase.from("home_restaurants").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("home_restaurants").insert({ user_id: user.id, ...payload });
    }

    setSaving(false);
    setMessage("Saved!");
    setTimeout(() => (window.location.href = "/dashboard/home-restaurant/menu"), 800);
  }

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--hb-bg)" }}>
        <p className="text-[15px] animate-pulse" style={{ color: "var(--hb-fg-muted)" }}>Loading your profile…</p>
      </div>
    );
  }

  const fieldClass = "w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-colors";
  const fieldStyle = { background: "#F9F6F2", border: "1px solid var(--hb-border)", color: "var(--hb-fg)" };
  const labelStyle = { color: "var(--hb-fg-muted)", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em" };

  return (
    <div className="min-h-screen" style={{ background: "var(--hb-bg)" }}>
      <ChefNav />

      <main className="pt-14 flex items-start justify-center px-4 py-8">
        <div
          className="w-full max-w-lg bg-white rounded-2xl p-6 lg:p-8 space-y-5"
          style={{ border: "1px solid var(--hb-border-soft)", boxShadow: "var(--hb-shadow-card)" }}
        >
          <div>
            <h1
              className="text-[22px] font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
            >
              Restaurant Settings
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--hb-fg-muted)" }}>
              Tell customers who you are and what you cook.
            </p>
          </div>

          <div className="space-y-4">
            {/* Restaurant Name */}
            <div>
              <label className="block mb-1.5" style={labelStyle}>Restaurant Name</label>
              <input value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)}
                className={fieldClass} style={fieldStyle} placeholder="e.g. Anjali's Kitchen" />
            </div>

            {/* Cuisine */}
            <div>
              <label className="block mb-1.5" style={labelStyle}>Cuisine Type</label>
              <input value={cuisine} onChange={(e) => setCuisine(e.target.value)}
                className={fieldClass} style={fieldStyle} placeholder="e.g. South Indian" />
            </div>

            {/* Notification Email */}
            <div>
              <label className="block mb-1.5" style={labelStyle}>Order Notification Email</label>
              <input type="email" value={notificationEmail} onChange={(e) => setNotificationEmail(e.target.value)}
                className={fieldClass} style={fieldStyle} placeholder="chef@yourkitchen.com" />
              <p className="text-[11px] mt-1" style={{ color: "var(--hb-fg-subtle)" }}>
                We'll send new order alerts to this email.
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block mb-1.5" style={labelStyle}>Short Description</label>
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                className={`${fieldClass} resize-none`} style={fieldStyle}
                placeholder="Tell customers about your kitchen…" />
            </div>

            {/* Address */}
            <div>
              <label className="block mb-1.5" style={labelStyle}>Restaurant Address</label>
              <input
                value={address}
                onChange={(e) => { setAddress(e.target.value); searchAddress(e.target.value); }}
                className={fieldClass} style={fieldStyle} placeholder="Start typing your address…"
              />
              {addressResults.length > 0 && (
                <div
                  className="mt-1.5 rounded-xl overflow-hidden shadow-lg"
                  style={{ border: "1px solid var(--hb-border)", background: "#fff" }}
                >
                  {addressResults.map((item) => (
                    <div
                      key={item.place_id}
                      className="px-4 py-2.5 text-[13px] cursor-pointer transition-colors hover:bg-[#FFF5EB]"
                      style={{ color: "var(--hb-fg)", borderBottom: "1px solid var(--hb-border-soft)" }}
                      onClick={() => {
                        setAddress(item.display_name);
                        setLat(parseFloat(item.lat));
                        setLng(parseFloat(item.lon));
                        setCity(item.address?.city || item.address?.town || item.address?.village || "");
                        setAddressResults([]);
                      }}
                    >
                      {item.display_name}
                    </div>
                  ))}
                </div>
              )}
              {city && (
                <p className="text-[11px] mt-1" style={{ color: "var(--hb-fg-subtle)" }}>
                  City: <b>{city}</b>
                </p>
              )}
              {lat && lng && (
                <p className="text-[11px] mt-0.5" style={{ color: "var(--hb-success-ink)" }}>
                  Location saved ✓
                </p>
              )}
            </div>

            {/* Delivery Radius */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label style={labelStyle}>Delivery Radius</label>
                <span className="text-[13px] font-bold" style={{ color: "var(--hb-primary)" }}>
                  {deliveryRadius} km
                </span>
              </div>
              <input
                type="range" min={1} max={25} value={deliveryRadius}
                onChange={(e) => setDeliveryRadius(Number(e.target.value))}
                className="hb-range w-full"
                style={{
                  background: `linear-gradient(to right, var(--hb-primary) 0%, var(--hb-primary) ${
                    ((deliveryRadius - 1) / 24) * 100
                  }%, #F0EBE3 ${((deliveryRadius - 1) / 24) * 100}%, #F0EBE3 100%)`,
                }}
              />
              <p className="text-[11px] mt-1" style={{ color: "var(--hb-fg-subtle)" }}>
                Customers outside this radius won't see your restaurant.
              </p>
            </div>

            {/* Hours */}
            <div>
              <label className="block mb-1.5" style={labelStyle}>Operating Hours</label>
              <input value={hours} onChange={(e) => setHours(e.target.value)}
                className={fieldClass} style={fieldStyle} placeholder="e.g. Mon–Fri 5 PM – 9 PM" />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 rounded-full text-[14px] font-semibold text-white transition-colors"
            style={{ background: saving ? "var(--hb-fg-subtle)" : "var(--hb-primary)" }}
          >
            {saving ? "Saving…" : "Save & Continue"}
          </button>

          {message && (
            <p
              className="text-center text-[13px]"
              style={{ color: message === "Saved!" ? "var(--hb-success-ink)" : "#DC2626" }}
            >
              {message}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
