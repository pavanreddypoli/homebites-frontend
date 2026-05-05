"use client";

import { useEffect, useState } from "react";
import { MapPin, Utensils } from "lucide-react";
import type { HomeRestaurantRow } from "@/lib/compliance";

const CUISINE_OPTIONS = [
  "Indian", "South Indian", "North Indian", "Mexican", "Asian", "Italian",
  "Mediterranean", "American", "Healthy", "Vegan", "Desserts", "Breakfast",
  "Filipino", "Chinese", "Thai", "Other",
];
const DAY_OPTIONS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toggleChip<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

interface Props {
  row: HomeRestaurantRow;
  accessToken: string;
  onBack: () => void;
  onComplete: (updates: Partial<HomeRestaurantRow>) => void;
}

export default function ProfileStep({ row, accessToken, onBack, onComplete }: Props) {
  const [name, setName]                 = useState(row.name ?? "");
  const [cuisines, setCuisines]         = useState<string[]>(
    row.cuisine ? row.cuisine.split(", ").filter(Boolean) : []
  );
  const [description, setDescription]  = useState(row.description ?? "");
  const [address, setAddress]           = useState("");
  const [addressQuery, setAddressQuery] = useState(""); // Fix 2: debounced separately
  const [addressResults, setAddressResults] = useState<any[]>([]);
  const [lat, setLat]                   = useState<number | null>(row.lat);
  const [lng, setLng]                   = useState<number | null>(row.lng);
  const [city, setCity]                 = useState(row.city ?? "");
  const [days, setDays]                 = useState<string[]>([]);
  const [hourFrom, setHourFrom]         = useState("17:00");
  const [hourTo, setHourTo]             = useState("21:00");
  const [notifEmail, setNotifEmail]     = useState(row.notification_email ?? "");
  const [radius, setRadius]             = useState(row.delivery_radius_km ?? 5);
  const [sellsTcs, setSellsTcs]         = useState(row.sells_tcs_foods ?? false);
  const [dshsId, setDshsId]             = useState(row.dshs_registration_id ?? "");
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");

  // Fix 2: debounce Nominatim requests to avoid rate-limiting (350ms)
  useEffect(() => {
    if (addressQuery.length < 3) { setAddressResults([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(addressQuery)}`
        );
        setAddressResults((await res.json()).slice(0, 5));
      } catch {}
    }, 350);
    return () => clearTimeout(timer);
  }, [addressQuery]);

  function detectLocation() {
    if (!navigator.geolocation) return;
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
          );
          const d = await res.json();
          setAddress(d.display_name ?? "");
          setCity(d.address?.city || d.address?.town || d.address?.suburb || "");
        } catch {}
        setDetectingLoc(false);
      },
      () => setDetectingLoc(false),
      { timeout: 8000 }
    );
  }

  const valid =
    name.trim() &&
    cuisines.length > 0 &&
    notifEmail.trim() &&
    lat !== null &&
    lng !== null &&
    (!sellsTcs || dshsId.trim());

  async function handleContinue() {
    if (!valid || saving) return;
    setSaving(true); setError("");
    const hours =
      days.length > 0
        ? `${days.join(", ")} · ${formatTime(hourFrom)} – ${formatTime(hourTo)}`
        : "";

    const res = await fetch("/api/onboarding/save-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({
        name, cuisine: cuisines.join(", "), description, city, lat, lng, hours,
        delivery_radius_km: radius, notification_email: notifEmail,
        sells_tcs_foods: sellsTcs, dshs_registration_id: sellsTcs ? dshsId : null,
      }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error ?? "Failed to save."); setSaving(false); return; }
    onComplete({
      name, cuisine: cuisines.join(", "), description, city, lat, lng, hours,
      delivery_radius_km: radius, notification_email: notifEmail,
      sells_tcs_foods: sellsTcs, dshs_registration_id: sellsTcs ? dshsId : null,
    });
  }

  const fc = "w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-colors";
  const fs: React.CSSProperties = { background: "#F9F6F2", border: "1px solid var(--hb-border)", color: "var(--hb-fg)" };
  const ls: React.CSSProperties = {
    color: "var(--hb-fg-muted)", fontSize: "12px", fontWeight: 600,
    textTransform: "uppercase" as const, letterSpacing: "0.05em",
  };

  function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all"
        style={{
          background: active ? "var(--hb-primary)" : "#F5F2ED",
          color: active ? "#fff" : "var(--hb-fg)",
          border: active ? "1.5px solid var(--hb-primary)" : "1.5px solid transparent",
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3">
        <span
          className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
          style={{ background: "var(--hb-primary)" }}
        >
          <Utensils size={18} />
        </span>
        <div>
          <h2
            className="text-[20px] font-bold tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
          >
            Your restaurant profile
          </h2>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--hb-fg-muted)" }}>
            Help customers know what to expect
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="block mb-1.5" style={ls}>Kitchen / Restaurant name *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Anjali's Kitchen"
            className={fc} style={fs}
          />
        </div>

        {/* Cuisine */}
        <div>
          <label className="block mb-2" style={ls}>Cuisine type *</label>
          <div className="flex flex-wrap gap-2">
            {CUISINE_OPTIONS.map((c) => (
              <Chip key={c} label={c} active={cuisines.includes(c)}
                onClick={() => setCuisines(toggleChip(cuisines, c))} />
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <div className="flex justify-between mb-1.5">
            <label style={ls}>What makes your cooking special?</label>
            <span className="text-[11px]" style={{ color: description.length > 140 ? "#C04010" : "var(--hb-fg-subtle)" }}>
              {description.length}/150
            </span>
          </div>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, 150))}
            placeholder="My grandmother's recipes, made fresh daily…"
            className={`${fc} resize-none`} style={fs}
          />
        </div>

        {/* Address with debounced Nominatim */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label style={ls}>Your address *</label>
            <button
              type="button"
              onClick={detectLocation}
              disabled={detectingLoc}
              className="flex items-center gap-1 text-[11px] font-semibold transition-colors"
              style={{ color: "var(--hb-primary)" }}
            >
              <MapPin size={11} />
              {detectingLoc ? "Detecting…" : "Detect my location"}
            </button>
          </div>
          <input
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setAddressQuery(e.target.value); // triggers debounced effect
              setLat(null); setLng(null);       // clear coords until selection
            }}
            placeholder="Start typing your address…"
            className={fc} style={fs}
          />
          {addressResults.length > 0 && (
            <div
              className="mt-1.5 rounded-xl overflow-hidden shadow-lg"
              style={{ border: "1px solid var(--hb-border)", background: "#fff" }}
            >
              {addressResults.map((item) => (
                <div
                  key={item.place_id}
                  className="px-4 py-2.5 text-[13px] cursor-pointer hover:bg-[#FFF5EB] transition-colors"
                  style={{ color: "var(--hb-fg)", borderBottom: "1px solid var(--hb-border-soft)" }}
                  onClick={() => {
                    setAddress(item.display_name);
                    setAddressQuery(""); // stop further queries
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
          {lat && lng && (
            <p className="text-[11px] mt-1" style={{ color: "var(--hb-success-ink)" }}>Location confirmed ✓</p>
          )}
        </div>

        {/* Operating hours */}
        <div>
          <label className="block mb-2" style={ls}>Operating days (optional)</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {DAY_OPTIONS.map((d) => (
              <Chip key={d} label={d} active={days.includes(d)} onClick={() => setDays(toggleChip(days, d))} />
            ))}
          </div>
          {days.length > 0 && (
            <div className="flex items-center gap-3">
              <input type="time" value={hourFrom} onChange={(e) => setHourFrom(e.target.value)}
                className={`flex-1 ${fc}`} style={fs} />
              <span className="text-[13px]" style={{ color: "var(--hb-fg-muted)" }}>to</span>
              <input type="time" value={hourTo} onChange={(e) => setHourTo(e.target.value)}
                className={`flex-1 ${fc}`} style={fs} />
            </div>
          )}
        </div>

        {/* Notification email */}
        <div>
          <label className="block mb-1.5" style={ls}>Order notification email *</label>
          <input
            type="email"
            value={notifEmail}
            onChange={(e) => setNotifEmail(e.target.value)}
            placeholder="chef@yourkitchen.com"
            className={fc} style={fs}
          />
          <p className="text-[11px] mt-1" style={{ color: "var(--hb-fg-subtle)" }}>
            New order alerts go to this email.
          </p>
        </div>

        {/* Delivery radius */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label style={ls}>Pickup radius</label>
            <span className="text-[13px] font-bold" style={{ color: "var(--hb-primary)" }}>{radius} km</span>
          </div>
          <input
            type="range" min={1} max={25} value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="hb-range w-full"
            style={{
              background: `linear-gradient(to right, var(--hb-primary) 0%, var(--hb-primary) ${
                ((radius - 1) / 24) * 100
              }%, #F0EBE3 ${((radius - 1) / 24) * 100}%, #F0EBE3 100%)`,
            }}
          />
        </div>

        {/* TCS foods */}
        <div
          className="rounded-xl p-4 space-y-3"
          style={{ background: "#FFF8F0", border: "1px solid #FFD4A8" }}
        >
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={sellsTcs}
              onChange={(e) => setSellsTcs(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[var(--hb-primary)] flex-shrink-0"
            />
            <span className="text-[13px] leading-snug" style={{ color: "var(--hb-fg)" }}>
              I will sell items that need refrigeration or hot/cold holding — e.g. cheesecake, cooked curries, biryani-style rice
            </span>
          </label>
          {sellsTcs && (
            <div>
              <label className="block mb-1.5" style={ls}>Texas DSHS registration ID *</label>
              <input
                value={dshsId}
                onChange={(e) => setDshsId(e.target.value)}
                placeholder="e.g. 1234567890"
                className={fc} style={fs}
              />
              <p className="text-[11px] mt-1.5 leading-snug" style={{ color: "var(--hb-fg-muted)" }}>
                Get this free at{" "}
                <a
                  href="https://dshs.texas.gov/retail-food-establishments/texas-cottage-food-production"
                  target="_blank" rel="noopener noreferrer"
                  className="underline" style={{ color: "var(--hb-primary)" }}
                >
                  dshs.texas.gov
                </a>
              </p>
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-[13px]" style={{ color: "#991B1B" }}>{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-4 py-3 rounded-full text-[13px] font-semibold"
          style={{ color: "var(--hb-fg-muted)", border: "1px solid var(--hb-border)", background: "#fff" }}
        >
          ← Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!valid || saving}
          className="flex-1 py-3 rounded-full text-[14px] font-semibold text-white transition-colors disabled:opacity-40"
          style={{ background: "var(--hb-primary)" }}
        >
          {saving ? "Saving…" : "Continue →"}
        </button>
      </div>
    </div>
  );
}
