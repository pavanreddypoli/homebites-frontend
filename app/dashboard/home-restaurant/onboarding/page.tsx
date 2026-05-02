"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  ChefHat, Clock, Utensils, MapPin, Plus, Trash2, Sparkles,
  ArrowLeft, Copy, Check,
} from "lucide-react";

/* ─── Constants ─────────────────────────────────────────────────────────────── */

const CUISINE_OPTIONS = [
  "Indian","South Indian","Mexican","Asian","Italian","Mediterranean",
  "American","Healthy","Vegan","Desserts","Breakfast","Filipino","Chinese","Thai","Other",
];

const DAY_OPTIONS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

function toggleChip<T>(arr: T[], item: T): T[] {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
}

function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function buildHoursString(days: string[], from: string, to: string): string {
  if (!days.length) return "";
  return `${days.join(", ")} · ${formatTime(from)} – ${formatTime(to)}`;
}

function parse12to24(t: string): string {
  const m = t.match(/^(\d+):(\d+) (AM|PM)$/);
  if (!m) return "17:00";
  let h = parseInt(m[1]);
  const min = m[2];
  if (m[3] === "PM" && h !== 12) h += 12;
  if (m[3] === "AM" && h === 12) h = 0;
  return `${h.toString().padStart(2, "0")}:${min}`;
}

/* ─── Component ──────────────────────────────────────────────────────────────── */

export default function HomeRestaurantOnboarding() {
  const router = useRouter();
  const [step, setStep]             = useState(1);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving]         = useState(false);
  const [message, setMessage]       = useState("");

  /* Step 1 */
  const [kitchenName, setKitchenName]         = useState("");
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([]);
  const [description, setDescription]         = useState("");
  const [city, setCity]                       = useState("");

  /* Step 2 */
  const [selectedDays, setSelectedDays]       = useState<string[]>([]);
  const [hourFrom, setHourFrom]               = useState("17:00");
  const [hourTo, setHourTo]                   = useState("21:00");
  const [notificationEmail, setNotifEmail]    = useState("");
  const [deliveryRadius, setDeliveryRadius]   = useState(5);
  const [address, setAddress]                 = useState("");
  const [addressResults, setAddressResults]   = useState<any[]>([]);
  const [lat, setLat]                         = useState<number | null>(null);
  const [lng, setLng]                         = useState<number | null>(null);
  const [detectingLoc, setDetectingLoc]       = useState(false);

  /* Step 3 — dish form */
  const [dishName, setDishName]               = useState("");
  const [dishPrice, setDishPrice]             = useState("");
  const [dishDesc, setDishDesc]               = useState("");
  const [dishIngredients, setDishIngredients] = useState("");
  const [dishImageFile, setDishImageFile]     = useState<File | null>(null);
  const [dishImagePreview, setDishImagePreview] = useState<string | null>(null);
  const [dishes, setDishes]                   = useState<{ id: string; name: string; price: number }[]>([]);
  const [addingDish, setAddingDish]           = useState(false);

  /* Step 4 */
  const [copied, setCopied]                   = useState(false);

  /* ── Load existing data ── */
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }
      setNotifEmail(user.email ?? "");

      const { data } = await supabase
        .from("home_restaurants")
        .select("id, name, cuisine, description, city, hours, lat, lng, delivery_radius_km, notification_email")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setRestaurantId(data.id);
        setKitchenName(data.name ?? "");
        setSelectedCuisines(data.cuisine ? data.cuisine.split(", ").filter(Boolean) : []);
        setDescription(data.description ?? "");
        setCity(data.city ?? "");
        setLat(data.lat ?? null);
        setLng(data.lng ?? null);
        setDeliveryRadius(typeof data.delivery_radius_km === "number" ? data.delivery_radius_km : 5);
        if (data.notification_email) setNotifEmail(data.notification_email);

        if (data.hours) {
          const match = data.hours.match(/^(.+) · (.+?) – (.+)$/);
          if (match) {
            const parsedDays = match[1].split(", ").map((d: string) => d.trim());
            setSelectedDays(parsedDays.filter((d: string) => DAY_OPTIONS.includes(d)));
            setHourFrom(parse12to24(match[2]));
            setHourTo(parse12to24(match[3]));
          }
        }

        const { data: existingDishes } = await supabase
          .from("dishes")
          .select("id, name, price")
          .eq("home_restaurant_id", data.id)
          .eq("is_archived", false);
        setDishes(
          (existingDishes ?? []).map((d: any) => ({ id: d.id, name: d.name, price: d.price ?? 0 }))
        );
      }
      setLoadingProfile(false);
    }
    load();
  }, []);

  /* ── Address search (Nominatim) ── */
  async function searchAddress(query: string) {
    if (query.length < 3) { setAddressResults([]); return; }
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}`
    );
    const data = await res.json();
    setAddressResults(data.slice(0, 5));
  }

  /* ── Detect location ── */
  function detectLocation() {
    if (!navigator.geolocation) return;
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLat(latitude);
        setLng(longitude);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          setAddress(data.display_name ?? "");
          const c = data.address?.city || data.address?.town || data.address?.suburb || "";
          if (c) setCity(c);
        } catch {}
        setDetectingLoc(false);
      },
      () => setDetectingLoc(false),
      { timeout: 8000 }
    );
  }

  /* ── Save step 1 ── */
  async function saveStep1() {
    if (!kitchenName.trim()) { setMessage("Please enter your restaurant name."); return; }
    setSaving(true); setMessage("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login"); return; }

    const payload = {
      name: kitchenName,
      cuisine: selectedCuisines.join(", "),
      description,
      city,
    };

    let id = restaurantId;
    if (id) {
      await supabase.from("home_restaurants").update(payload).eq("id", id);
    } else {
      const { data: newRow } = await supabase
        .from("home_restaurants")
        .insert({ user_id: user.id, ...payload })
        .select("id")
        .single();
      id = newRow?.id ?? null;
      setRestaurantId(id);
    }
    setSaving(false);
    setStep(2);
  }

  /* ── Save step 2 ── */
  async function saveStep2() {
    setSaving(true); setMessage("");
    const hours = buildHoursString(selectedDays, hourFrom, hourTo);
    const payload: Record<string, any> = {
      hours,
      notification_email: notificationEmail,
      delivery_radius_km: deliveryRadius,
      is_active: true,
    };
    if (lat !== null) payload.lat = lat;
    if (lng !== null) payload.lng = lng;

    if (restaurantId) {
      await supabase.from("home_restaurants").update(payload).eq("id", restaurantId);
    }
    setSaving(false);
    setStep(3);
  }

  /* ── Add dish ── */
  async function addDish() {
    if (!dishName.trim()) { setMessage("Enter a dish name."); return; }
    if (!restaurantId) { setMessage("Save your restaurant info first."); return; }
    setAddingDish(true); setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setAddingDish(false); return; }

    let image_url: string | null = null;
    if (dishImageFile) {
      const fileExt = dishImageFile.name.split(".").pop();
      const filePath = `dishes/${user.id}_${Date.now()}.${fileExt}`;
      const { error: upErr } = await supabase.storage.from("dish-images").upload(filePath, dishImageFile);
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("dish-images").getPublicUrl(filePath);
        image_url = urlData.publicUrl;
      }
    }

    const { data, error } = await supabase
      .from("dishes")
      .insert({
        home_restaurant_id: restaurantId,
        name: dishName,
        price: parseFloat(dishPrice) || null,
        description: dishDesc,
        ingredients: dishIngredients,
        image_url,
      })
      .select("id, name, price")
      .single();

    if (!error && data) {
      setDishes((prev) => [...prev, { id: data.id, name: data.name, price: data.price ?? 0 }]);
      setDishName(""); setDishPrice(""); setDishDesc(""); setDishIngredients("");
      setDishImageFile(null); setDishImagePreview(null);
    } else if (error) {
      setMessage(error.message);
    }
    setAddingDish(false);
  }

  /* ── Copy share link ── */
  function copyShareLink() {
    if (!restaurantId) return;
    navigator.clipboard.writeText(
      `https://homebitesai.com/dashboard/customer/restaurant/${restaurantId}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  /* ── Loading screen ── */
  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--hb-bg)" }}>
        <p className="text-[15px] animate-pulse" style={{ color: "var(--hb-fg-muted)" }}>
          Loading your profile…
        </p>
      </div>
    );
  }

  /* ── Shared styles ── */
  const fc = "w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-colors";
  const fs: React.CSSProperties = { background: "#F9F6F2", border: "1px solid var(--hb-border)", color: "var(--hb-fg)" };
  const ls: React.CSSProperties = {
    color: "var(--hb-fg-muted)", fontSize: "12px", fontWeight: 600,
    textTransform: "uppercase", letterSpacing: "0.05em",
  };

  /* ── Chip helper ── */
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
    <div className="min-h-screen" style={{ background: "var(--hb-bg)" }}>
      {/* Mini nav */}
      <div
        className="fixed top-0 left-0 right-0 z-[100] h-14 px-4 flex items-center justify-between backdrop-blur-md"
        style={{ background: "rgba(255,251,245,0.9)", borderBottom: "1px solid var(--hb-border-soft)" }}
      >
        <button
          onClick={() => (router.push("/dashboard/customer"))}
          className="flex items-center gap-2"
        >
          <span
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm"
            style={{ background: "var(--hero-gradient)" }}
          >H</span>
          <span
            className="font-bold text-[16px] tracking-tight"
            style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
          >HomeBites</span>
        </button>
        <span className="text-[12px] font-semibold" style={{ color: "var(--hb-fg-muted)" }}>
          Chef Setup
        </span>
      </div>

      <main className="pt-20 pb-16 px-4 flex flex-col items-center">
        <div className="w-full max-w-lg">

          {/* Progress bar */}
          <div className="flex items-center gap-1.5 mb-6">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className="h-1.5 flex-1 rounded-full transition-all duration-300"
                style={{ background: s <= step ? "var(--hb-primary)" : "#E8E2DA" }}
              />
            ))}
            <span
              className="text-[11px] font-bold ml-2 whitespace-nowrap"
              style={{ color: "var(--hb-fg-muted)" }}
            >
              Step {step} of 4
            </span>
          </div>

          <div
            className="bg-white rounded-2xl p-6 lg:p-8 space-y-5"
            style={{ border: "1px solid var(--hb-border-soft)", boxShadow: "var(--hb-shadow-card)" }}
          >

            {/* ════════════════ STEP 1 ════════════════ */}
            {step === 1 && (
              <>
                <div className="flex items-start gap-3">
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: "var(--hb-primary)" }}
                  >
                    <ChefHat size={18} />
                  </span>
                  <div>
                    <h2
                      className="text-[20px] font-bold tracking-tight leading-tight"
                      style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
                    >Tell us about your Home Restaurant</h2>
                    <p className="text-[13px] mt-0.5" style={{ color: "var(--hb-fg-muted)" }}>
                      Help customers know what to expect
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block mb-1.5" style={ls}>Kitchen / Restaurant name</label>
                    <input
                      value={kitchenName}
                      onChange={(e) => setKitchenName(e.target.value)}
                      placeholder="e.g. Anjali's Kitchen"
                      className={fc} style={fs}
                    />
                  </div>

                  <div>
                    <label className="block mb-2" style={ls}>Cuisine type</label>
                    <div className="flex flex-wrap gap-2">
                      {CUISINE_OPTIONS.map((c) => (
                        <Chip
                          key={c}
                          label={c}
                          active={selectedCuisines.includes(c)}
                          onClick={() => setSelectedCuisines(toggleChip(selectedCuisines, c))}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label style={ls}>What makes your cooking special?</label>
                      <span
                        className="text-[11px]"
                        style={{ color: description.length > 140 ? "#C04010" : "var(--hb-fg-subtle)" }}
                      >
                        {description.length}/150
                      </span>
                    </div>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value.slice(0, 150))}
                      placeholder="My grandmother's recipes, authentic spices, made fresh daily…"
                      className={`${fc} resize-none`}
                      style={fs}
                    />
                  </div>

                  <div>
                    <label className="block mb-1.5" style={ls}>City / Neighborhood</label>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Celina, TX"
                      className={fc} style={fs}
                    />
                  </div>
                </div>

                {message && <p className="text-[13px]" style={{ color: "#991B1B" }}>{message}</p>}

                <button
                  onClick={saveStep1}
                  disabled={saving}
                  className="w-full py-3.5 rounded-full text-[14px] font-semibold text-white transition-colors"
                  style={{ background: saving ? "var(--hb-fg-subtle)" : "var(--hb-primary)" }}
                >
                  {saving ? "Saving…" : "Next: Hours & Location →"}
                </button>
              </>
            )}

            {/* ════════════════ STEP 2 ════════════════ */}
            {step === 2 && (
              <>
                <div className="flex items-start gap-3">
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: "var(--hb-primary)" }}
                  >
                    <Clock size={18} />
                  </span>
                  <div>
                    <h2
                      className="text-[20px] font-bold tracking-tight leading-tight"
                      style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
                    >Set your hours & location</h2>
                    <p className="text-[13px] mt-0.5" style={{ color: "var(--hb-fg-muted)" }}>
                      Let customers know when and where you operate
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Days */}
                  <div>
                    <label className="block mb-2" style={ls}>Operating days</label>
                    <div className="flex flex-wrap gap-2">
                      {DAY_OPTIONS.map((d) => (
                        <Chip
                          key={d}
                          label={d}
                          active={selectedDays.includes(d)}
                          onClick={() => setSelectedDays(toggleChip(selectedDays, d))}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Hours from / to */}
                  <div>
                    <label className="block mb-1.5" style={ls}>Hours</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="time"
                        value={hourFrom}
                        onChange={(e) => setHourFrom(e.target.value)}
                        className={`flex-1 ${fc}`}
                        style={fs}
                      />
                      <span className="text-[13px] font-medium" style={{ color: "var(--hb-fg-muted)" }}>to</span>
                      <input
                        type="time"
                        value={hourTo}
                        onChange={(e) => setHourTo(e.target.value)}
                        className={`flex-1 ${fc}`}
                        style={fs}
                      />
                    </div>
                    {selectedDays.length > 0 && (
                      <p className="text-[11px] mt-1.5" style={{ color: "var(--hb-fg-subtle)" }}>
                        Preview: <b>{buildHoursString(selectedDays, hourFrom, hourTo)}</b>
                      </p>
                    )}
                  </div>

                  {/* Notification email */}
                  <div>
                    <label className="block mb-1.5" style={ls}>Order notification email</label>
                    <input
                      type="email"
                      value={notificationEmail}
                      onChange={(e) => setNotifEmail(e.target.value)}
                      placeholder="chef@yourkitchen.com"
                      className={fc} style={fs}
                    />
                    <p className="text-[11px] mt-1" style={{ color: "var(--hb-fg-subtle)" }}>
                      We'll send new order alerts to this email.
                    </p>
                  </div>

                  {/* Delivery radius */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label style={ls}>Delivery radius</label>
                      <span className="text-[13px] font-bold" style={{ color: "var(--hb-primary)" }}>
                        {deliveryRadius} km
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={25}
                      value={deliveryRadius}
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

                  {/* Address */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label style={ls}>Your address</label>
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
                      onChange={(e) => { setAddress(e.target.value); searchAddress(e.target.value); }}
                      className={fc}
                      style={fs}
                      placeholder="Start typing your address…"
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
                              setLat(parseFloat(item.lat));
                              setLng(parseFloat(item.lon));
                              const c = item.address?.city || item.address?.town || item.address?.village || "";
                              if (c) setCity(c);
                              setAddressResults([]);
                            }}
                          >
                            {item.display_name}
                          </div>
                        ))}
                      </div>
                    )}
                    {lat && lng && (
                      <p className="text-[11px] mt-1" style={{ color: "var(--hb-success-ink)" }}>
                        Location saved ✓
                      </p>
                    )}
                  </div>
                </div>

                {message && <p className="text-[13px]" style={{ color: "#991B1B" }}>{message}</p>}

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-full text-[13px] font-semibold transition-colors"
                    style={{ color: "var(--hb-fg-muted)", border: "1px solid var(--hb-border)", background: "#fff" }}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={saveStep2}
                    disabled={saving}
                    className="flex-1 py-3 rounded-full text-[14px] font-semibold text-white transition-colors"
                    style={{ background: saving ? "var(--hb-fg-subtle)" : "var(--hb-primary)" }}
                  >
                    {saving ? "Saving…" : "Next: Add a Dish →"}
                  </button>
                </div>
              </>
            )}

            {/* ════════════════ STEP 3 ════════════════ */}
            {step === 3 && (
              <>
                <div className="flex items-start gap-3">
                  <span
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: "var(--hb-primary)" }}
                  >
                    <Utensils size={18} />
                  </span>
                  <div>
                    <h2
                      className="text-[20px] font-bold tracking-tight leading-tight"
                      style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
                    >Add your first dish</h2>
                    <p className="text-[13px] mt-0.5" style={{ color: "var(--hb-fg-muted)" }}>
                      Add at least one dish to go live
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Name + price row */}
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block mb-1.5" style={ls}>Dish name</label>
                      <input
                        value={dishName}
                        onChange={(e) => setDishName(e.target.value)}
                        placeholder="e.g. Ghee Roast Dosa"
                        className={fc} style={fs}
                      />
                    </div>
                    <div className="w-28">
                      <label className="block mb-1.5" style={ls}>Price</label>
                      <div className="relative">
                        <span
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] font-semibold pointer-events-none"
                          style={{ color: "var(--hb-fg-muted)" }}
                        >$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={dishPrice}
                          onChange={(e) => setDishPrice(e.target.value)}
                          placeholder="0.00"
                          className={`${fc} pl-7`}
                          style={fs}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label style={ls}>Description</label>
                      <span
                        className="flex items-center gap-1 text-[11px] font-semibold opacity-40 cursor-not-allowed"
                        style={{ color: "var(--hb-primary)" }}
                        title="AI writing assistant coming in Week 7"
                      >
                        <Sparkles size={10} /> Write with AI
                      </span>
                    </div>
                    <textarea
                      rows={2}
                      value={dishDesc}
                      onChange={(e) => setDishDesc(e.target.value)}
                      placeholder="Describe the taste, texture, special ingredients…"
                      className={`${fc} resize-none`}
                      style={fs}
                    />
                  </div>

                  {/* Ingredients */}
                  <div>
                    <label className="block mb-1.5" style={ls}>Ingredients</label>
                    <input
                      value={dishIngredients}
                      onChange={(e) => setDishIngredients(e.target.value)}
                      placeholder="e.g. Rice, ghee, curry leaves…"
                      className={fc} style={fs}
                    />
                  </div>

                  {/* Photo */}
                  <div>
                    <label className="block mb-1.5" style={ls}>Food photo (optional)</label>
                    {dishImagePreview ? (
                      <div className="relative w-full h-32 rounded-xl overflow-hidden">
                        <img src={dishImagePreview} alt="preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => { setDishImageFile(null); setDishImagePreview(null); }}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white flex items-center justify-center"
                          style={{ boxShadow: "var(--hb-shadow-soft)" }}
                        >
                          <Trash2 size={13} style={{ color: "#991B1B" }} />
                        </button>
                      </div>
                    ) : (
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const f = e.target.files?.[0] ?? null;
                          setDishImageFile(f);
                          if (f) setDishImagePreview(URL.createObjectURL(f));
                        }}
                        className="w-full text-[13px] file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[12px] file:font-semibold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
                      />
                    )}
                  </div>
                </div>

                {message && <p className="text-[13px]" style={{ color: "#991B1B" }}>{message}</p>}

                {/* Add dish button */}
                <button
                  onClick={addDish}
                  disabled={addingDish || !dishName.trim()}
                  className="w-full py-3 rounded-full text-[13px] font-semibold transition-all"
                  style={{
                    background: "var(--hb-primary-soft)",
                    color: "var(--hb-primary)",
                    border: "1.5px solid var(--hb-primary)",
                    opacity: !dishName.trim() ? 0.5 : 1,
                  }}
                >
                  {addingDish
                    ? "Adding…"
                    : <span className="flex items-center justify-center gap-1.5"><Plus size={14} /> Add dish</span>
                  }
                </button>

                {/* Added dishes list */}
                {dishes.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <p
                      className="text-[11px] font-bold uppercase tracking-wide"
                      style={{ color: "var(--hb-fg-muted)" }}
                    >
                      Added ({dishes.length})
                    </p>
                    {dishes.map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between px-3.5 py-2.5 rounded-xl"
                        style={{ background: "#F5F2ED", border: "1px solid var(--hb-border-soft)" }}
                      >
                        <span className="text-[13px] font-semibold" style={{ color: "var(--hb-fg)" }}>{d.name}</span>
                        <span className="text-[13px] font-bold" style={{ color: "var(--hb-primary)" }}>
                          ${d.price.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setStep(2)}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-full text-[13px] font-semibold"
                    style={{ color: "var(--hb-fg-muted)", border: "1px solid var(--hb-border)", background: "#fff" }}
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                  <button
                    onClick={() => setStep(4)}
                    disabled={dishes.length === 0}
                    className="flex-1 py-3 rounded-full text-[14px] font-semibold text-white transition-colors disabled:opacity-40"
                    style={{ background: "var(--hb-primary)" }}
                  >
                    {dishes.length === 0 ? "Add a dish to continue" : "Next: Go Live →"}
                  </button>
                </div>

                <button
                  onClick={() => setStep(4)}
                  className="w-full text-center text-[12px] font-medium py-1 transition-colors"
                  style={{ color: "var(--hb-fg-subtle)" }}
                >
                  I'll add dishes later →
                </button>
              </>
            )}

            {/* ════════════════ STEP 4 ════════════════ */}
            {step === 4 && (
              <>
                <div className="text-center py-4">
                  <div className="text-5xl mb-4">🎉</div>
                  <h2
                    className="text-[24px] font-bold tracking-tight mb-2"
                    style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
                  >
                    Your Home Restaurant is live on HomeBites!
                  </h2>
                  <p className="text-[14px]" style={{ color: "var(--hb-fg-muted)" }}>
                    Customers near you can now find and order from your Home Restaurant.
                  </p>
                </div>

                {/* Summary card */}
                <div
                  className="rounded-2xl p-4 space-y-1.5"
                  style={{ background: "#FFF8F0", border: "1.5px solid var(--hb-primary)" }}
                >
                  <p className="text-[14px] font-bold" style={{ color: "var(--hb-fg)" }}>{kitchenName}</p>
                  {selectedCuisines.length > 0 && (
                    <p className="text-[12px] font-medium" style={{ color: "var(--hb-primary)" }}>
                      {selectedCuisines.join(", ")}
                    </p>
                  )}
                  {city && (
                    <p className="text-[12px]" style={{ color: "var(--hb-fg-muted)" }}>📍 {city}</p>
                  )}
                  <p className="text-[12px]" style={{ color: "var(--hb-fg-muted)" }}>
                    🍽️ {dishes.length} dish{dishes.length !== 1 ? "es" : ""} on menu
                    {dishes.length === 0 && (
                      <span className="ml-1 text-[11px]" style={{ color: "#C04010" }}>
                        (add dishes from the menu manager)
                      </span>
                    )}
                  </p>
                </div>

                <button
                  onClick={() => (router.push("/dashboard/home-restaurant"))}
                  className="w-full py-3.5 rounded-full text-[15px] font-bold text-white"
                  style={{
                    background: "var(--hb-primary)",
                    boxShadow: "0 4px 14px -2px rgba(255,122,57,.45)",
                  }}
                >
                  Go to my dashboard →
                </button>

                <div className="pt-1">
                  <p
                    className="text-center text-[12.5px] mb-2"
                    style={{ color: "var(--hb-fg-muted)" }}
                  >
                    Share your Home Restaurant with friends
                  </p>
                  <button
                    onClick={copyShareLink}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-[13px] font-semibold transition-colors"
                    style={{ border: "1.5px solid var(--hb-border)", color: "var(--hb-fg)", background: "#fff" }}
                  >
                    {copied
                      ? <Check size={14} style={{ color: "var(--hb-success-ink)" }} />
                      : <Copy size={14} />
                    }
                    {copied ? "Link copied!" : "Copy kitchen link"}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
