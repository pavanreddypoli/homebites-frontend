"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  addToCart as addToCartLib,
  getCart,
  getCartSubtotal,
  getCartItemCount,
  updateItemQuantity,
} from "@/lib/cart";
import { useRouter } from "next/navigation";
import CartDrawer from "@/components/CartDrawer";
import CustomerNav from "@/components/CustomerNav";
import DishDetailSheet, { type SheetDish } from "@/components/DishDetailSheet";
import {
  MapPin, Search, Sparkles, Star, Clock, ArrowRight, Plus, Minus, ChefHat,
  House, Package, User, X, Pencil, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ─── Types ──────────────────────────────────────────────────────────────── */

type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  description: string;
  city: string;
  lat?: number;
  lng?: number;
  delivery_radius_km?: number;
  distance_km?: number;
  is_open?: boolean;
  closed_message?: string | null;
  avg_rating?: number;
  review_count?: number;
};

type Dish = {
  id: string;
  name: string;
  description: string;
  price: number;
  home_restaurant_id: string;
  image_url?: string;
  restaurant_name?: string;
  restaurant_cuisine?: string;
  distance_km?: number;
};

/* ─── Categories (cuisine-emoji map for placeholders) ────────────────────── */

const CUISINES: { label: string; emoji: string }[] = [
  { label: "All",         emoji: "🍽️" },
  { label: "Indian",      emoji: "🍛" },
  { label: "Mexican",     emoji: "🌮" },
  { label: "Asian",       emoji: "🍜" },
  { label: "Italian",     emoji: "🍝" },
  { label: "Healthy",     emoji: "🥗" },
  { label: "Vegan",       emoji: "🌿" },
  { label: "Desserts",    emoji: "🍰" },
  { label: "Breakfast",   emoji: "🍳" },
  { label: "Mediterranean", emoji: "🥙" },
];

const CUISINE_EMOJI: Record<string, string> = Object.fromEntries(
  CUISINES.map((c) => [c.label, c.emoji])
);
CUISINE_EMOJI["South Indian"] = "🫕";
CUISINE_EMOJI["Vegan · Healthy"] = "🌿";

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const kmToMi = (km: number) => km * 0.621371;
const miToKm = (mi: number) => mi / 0.621371;

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
    );
    const data = await res.json();
    return (
      data.address?.city ||
      data.address?.town ||
      data.address?.suburb ||
      data.address?.county ||
      "Your Location"
    );
  } catch {
    return "Your Location";
  }
}

/* ─── Reusable bits ──────────────────────────────────────────────────────── */

function CuisineEmojiBg({ cuisine, className = "" }: { cuisine: string; className?: string }) {
  // For restaurant card covers when no image is available — warm gradient with emoji.
  const e = CUISINE_EMOJI[cuisine] ?? "🍽️";
  return (
    <div
      className={`flex items-end justify-end p-3 ${className}`}
      style={{
        background: "linear-gradient(135deg, #FFF1E3 0%, #FFE4CB 100%)",
      }}
    >
      <span className="text-5xl leading-none opacity-90">{e}</span>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */

export default function CustomerDashboard() {
  const router = useRouter();

  // Auth
  const [user, setUser]       = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Location
  const [locationLabel, setLocationLabel] = useState("Celina, TX");
  const [location, setLocation]           = useState<{ lat: number; lng: number } | null>(null);

  // Filters
  const [selectedCuisine, setSelectedCuisine] = useState<string>("All");
  const [searchQuery, setSearchQuery]         = useState("");
  const [radiusMi, setRadiusMi]               = useState(5);
  const [showAll, setShowAll]                 = useState(false);

  // Data
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [dishes, setDishes]           = useState<Dish[]>([]);
  const [loading, setLoading]         = useState(true);

  // Dish detail sheet
  const [selectedDish, setSelectedDish] = useState<SheetDish | null>(null);

  // Location edit dropdown
  const [locEditing, setLocEditing]         = useState(false);
  const [locInput, setLocInput]             = useState("");
  const [locSuggestions, setLocSuggestions] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [recentLocs, setRecentLocs]         = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [locToast, setLocToast]             = useState<string | null>(null);
  const [locGPSLoading, setLocGPSLoading]   = useState(false);
  const [locGPSError, setLocGPSError]       = useState<string | null>(null);
  const nomTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cart re-render trigger
  const [cartTick, setCartTick] = useState(0);
  const cartCount = useMemo(() => getCartItemCount(), [cartTick]);
  const cartTotal = useMemo(() => getCartSubtotal(),  [cartTick]);
  function bumpCart() { setCartTick((v) => v + 1); }

  // Dismissible cart bar
  const [cartBarDismissed, setCartBarDismissed] = useState(false);
  const prevCartCountRef = useRef(0);
  const touchStartYRef = useRef(0);

  useEffect(() => {
    if (cartCount > prevCartCountRef.current) {
      setCartBarDismissed(false);
    }
    prevCartCountRef.current = cartCount;
  }, [cartCount]);

  /* ── Cart listener ── */
  useEffect(() => {
    function onCartUpdated() { bumpCart(); }
    window.addEventListener("homebites:cart-updated", onCartUpdated);
    return () => window.removeEventListener("homebites:cart-updated", onCartUpdated);
  }, []);

  /* ── Mount + auth ── */
  useEffect(() => {
    setMounted(true);
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    bumpCart();
  }, []);

  /* ── Restore saved location + radius ── */
  useEffect(() => {
    const saved = localStorage.getItem("homebites_customer_context");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.location) setLocation(parsed.location);
        if (parsed.city)     setLocationLabel(parsed.city);
        if (typeof parsed.radiusMi === "number") setRadiusMi(parsed.radiusMi);
      } catch {}
    }
    if (localStorage.getItem("homebites_show_all_restaurants") === "true") {
      setShowAll(true);
    }
  }, []);

  /* ── Persist nationwide toggle ── */
  useEffect(() => {
    localStorage.setItem("homebites_show_all_restaurants", String(showAll));
  }, [showAll]);

  /* ── Auto geolocation (only if not saved) ── */
  useEffect(() => {
    if (location) return;
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocation({ lat, lng });
        const city = await reverseGeocode(lat, lng);
        setLocationLabel(city);
      },
      () => {},
      { timeout: 8000 }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Save location + radius ── */
  useEffect(() => {
    if (!location) return;
    localStorage.setItem(
      "homebites_customer_context",
      JSON.stringify({ location, city: locationLabel, radiusMi })
    );
  }, [location, locationLabel, radiusMi]);

  /* ── Load recent locations ── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem("homebites_recent_locations");
      if (raw) setRecentLocs(JSON.parse(raw));
    } catch {}
  }, []);


  /* ── Location helper functions ── */
  function saveRecentLoc(label: string, lat: number, lng: number) {
    const updated = [
      { label, lat, lng },
      ...recentLocs.filter((r) => r.label !== label),
    ].slice(0, 3);
    setRecentLocs(updated);
    localStorage.setItem("homebites_recent_locations", JSON.stringify(updated));
  }

  function applyLocation(label: string, lat: number, lng: number) {
    setLocationLabel(label);
    setLocation({ lat, lng });
    setLocEditing(false);
    setLocInput("");
    setLocSuggestions([]);
    saveRecentLoc(label, lat, lng);
    setLocToast(`Showing results near ${label}`);
    setTimeout(() => setLocToast(null), 3500);
  }

  async function handleUseGPS() {
    if (!navigator.geolocation) {
      setLocGPSError("Geolocation is not supported by your browser.");
      return;
    }
    setLocGPSLoading(true);
    setLocGPSError(null);
    setLocEditing(false);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const city = await reverseGeocode(lat, lng);
        applyLocation(city, lat, lng);
        setLocGPSLoading(false);
      },
      (err) => {
        setLocGPSLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocGPSError("Location permission denied — please enter an address below.");
        } else if (err.code === err.TIMEOUT) {
          setLocGPSError("Location timed out. Try entering an address below.");
        } else {
          setLocGPSError("Location unavailable. Try entering an address below.");
        }
      },
      { timeout: 8000 }
    );
  }

  function handleLocInputChange(value: string) {
    setLocInput(value);
    if (nomTimerRef.current) clearTimeout(nomTimerRef.current);
    if (value.length < 3) { setLocSuggestions([]); return; }
    nomTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json();
        setLocSuggestions(data || []);
      } catch {}
    }, 500);
  }

  function handleSelectSuggestion(s: { display_name: string; lat: string; lon: string }) {
    const label = s.display_name.split(",").slice(0, 3).join(",").trim();
    applyLocation(label, parseFloat(s.lat), parseFloat(s.lon));
  }

  /* ── Load data ── */
  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const [{ data: restaurantData }, { data: dishData }, { data: reviewData }] = await Promise.all([
        supabase
          .from("home_restaurants")
          .select("id, name, cuisine, description, city, lat, lng, delivery_radius_km, is_open, closed_message")
          .eq("is_active", true),
        supabase
          .from("dishes")
          .select("id, name, description, price, home_restaurant_id, image_url")
          .eq("is_archived", false),
        supabase
          .from("reviews")
          .select("restaurant_id, rating"),
      ]);

      // Build per-restaurant rating stats
      const ratingStats = new Map<string, { sum: number; count: number }>();
      reviewData?.forEach((rev: any) => {
        const s = ratingStats.get(rev.restaurant_id) ?? { sum: 0, count: 0 };
        ratingStats.set(rev.restaurant_id, { sum: s.sum + rev.rating, count: s.count + 1 });
      });

      let enriched: Restaurant[] = (restaurantData ?? []).map((r) => {
        const s = ratingStats.get(r.id);
        return {
          ...r,
          avg_rating:   s && s.count > 0 ? s.sum / s.count : undefined,
          review_count: s?.count ?? 0,
        };
      });

      if (location) {
        enriched = enriched.map((r) =>
          r.lat && r.lng
            ? { ...r, distance_km: calcDistance(location.lat, location.lng, r.lat, r.lng) }
            : r
        );
      }

      const rMap = new Map(enriched.map((r) => [r.id, r]));

      const enrichedDishes: Dish[] = (dishData ?? [])
        .map((d) => {
          const r = rMap.get(d.home_restaurant_id);
          if (!r) return null;
          return {
            ...d,
            restaurant_name:    r.name,
            restaurant_cuisine: r.cuisine,
            distance_km:        r.distance_km,
          };
        })
        .filter(Boolean) as Dish[];

      setRestaurants(enriched);
      setDishes(enrichedDishes);
      setLoading(false);
    }

    loadData();
  }, [location]);

  /* ── Realtime: update is_open/closed_message instantly ── */
  useEffect(() => {
    const channel = supabase
      .channel("restaurant-availability")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "home_restaurants" },
        (payload) => {
          setRestaurants((prev) =>
            prev.map((r) =>
              r.id === payload.new.id
                ? { ...r, is_open: payload.new.is_open, closed_message: payload.new.closed_message }
                : r
            )
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  /* ── Cart helpers ── */
  function getQty(dishId: string) {
    return getCart()?.items.find((i) => i.dish_id === dishId)?.quantity ?? 0;
  }

  function setInlineQty(dishId: string, qty: number) {
    updateItemQuantity(dishId, qty);
    window.dispatchEvent(new Event("homebites:cart-updated"));
    bumpCart();
  }

  function addToCart(dish: Dish) {
    const result = addToCartLib({
      restaurant_id:   dish.home_restaurant_id,
      restaurant_name: dish.restaurant_name ?? "Home Restaurant",
      dish: { id: dish.id, name: dish.name, price: dish.price, image_url: dish.image_url },
      quantity: 1,
    });
    if (result.blocked) {
      alert(
        `Your cart has items from ${result.cart?.restaurant_name ?? "another restaurant"}. Clear your cart to add from here.`
      );
      window.dispatchEvent(new Event("homebites:open-cart"));
    }
    window.dispatchEvent(new Event("homebites:cart-updated"));
    bumpCart();
  }

  /* ── Filtering ── */
  const radiusKm = miToKm(radiusMi);

  // Restaurants within selected radius (or all if no location yet, or showAll)
  const restaurantsNear = useMemo(() => {
    let list = restaurants;
    if (location && !showAll) {
      list = list.filter((r) => r.distance_km == null || r.distance_km <= radiusKm);
    }
    if (selectedCuisine !== "All") {
      const q = selectedCuisine.toLowerCase();
      list = list.filter((r) => (r.cuisine ?? "").toLowerCase().includes(q));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.cuisine ?? "").toLowerCase().includes(q) ||
          (r.description ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [restaurants, selectedCuisine, searchQuery, radiusKm, location, showAll]);

  const dishesNear = useMemo(() => {
    let list = dishes;
    if (location && !showAll) {
      list = list.filter((d) => d.distance_km == null || d.distance_km <= radiusKm);
    }
    if (selectedCuisine !== "All") {
      const q = selectedCuisine.toLowerCase();
      list = list.filter(
        (d) =>
          (d.restaurant_cuisine ?? "").toLowerCase().includes(q) ||
          (d.restaurant_name ?? "").toLowerCase().includes(q)
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.restaurant_name ?? "").toLowerCase().includes(q) ||
          (d.description ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [dishes, selectedCuisine, searchQuery, radiusKm, location, showAll]);

  /* ── Render ─────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen" style={{ background: "var(--hb-bg)" }}>
      <CustomerNav address={locationLabel} />

      {/* Location change toast */}
      {locToast && (
        <div
          className="fixed top-20 left-1/2 -translate-x-1/2 z-[400] px-5 py-3 rounded-full text-[13px] font-semibold text-white shadow-lg pointer-events-none whitespace-nowrap"
          style={{ background: "#16202B" }}
        >
          {locToast}
        </div>
      )}

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden pt-24 lg:pt-28 pb-10 lg:pb-20 px-4 lg:px-8"
        style={{
          background: "linear-gradient(180deg, var(--hb-bg) 0%, var(--hb-bg-warm) 100%)",
        }}
      >
        {/* decorative blob */}
        <div
          className="hidden lg:block absolute -top-32 -right-32 w-[520px] h-[520px] pointer-events-none"
          style={{
            background: "radial-gradient(circle, rgba(255,122,57,0.18) 0%, transparent 65%)",
            filter: "blur(20px)",
          }}
        />
        <div className="max-w-[1200px] mx-auto relative grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-12 items-center">
          {/* LEFT */}
          <div>
            <div
              className="inline-flex items-center gap-2 bg-white rounded-full pl-1.5 pr-3.5 py-1.5 text-[12px] font-semibold mb-5"
              style={{
                border: "1px solid rgba(11,19,28,.06)",
                color: "#C24B12",
                boxShadow: "var(--hb-shadow-soft)",
              }}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-white"
                style={{ background: "var(--hb-primary)" }}
              >
                <Sparkles size={11} />
              </span>
              Real food from real people
            </div>

            <h1
              className="font-bold text-[40px] sm:text-[52px] lg:text-[64px] leading-[1.04] tracking-[-0.035em] mb-4 lg:mb-5"
              style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
            >
              What are you<br />
              <span style={{ fontStyle: "italic", color: "var(--hb-primary)", fontWeight: 600 }}>
                craving
              </span>{" "}today?
            </h1>

            <p
              className="text-[16px] lg:text-[18px] leading-[1.55] mb-6 lg:mb-7 max-w-[480px]"
              style={{ color: "var(--hb-fg-muted)" }}
            >
              Discover home cooks near you. Every kitchen has a story — and a flavor you can't get anywhere else.
            </p>

            {/* Search panel — address + radius slider + search input */}
            <div
              className="bg-white p-4 lg:p-5 max-w-[560px]"
              style={{
                borderRadius: "var(--hb-radius-xl)",
                border: "1px solid rgba(11,19,28,.04)",
                boxShadow: "var(--hb-shadow-card)",
              }}
            >
              {/* Deliver to — click toggles address input */}
              <button
                onClick={() => { setLocEditing(!locEditing); setLocInput(""); setLocSuggestions([]); setLocGPSError(null); }}
                className="flex items-center gap-2.5 px-1 pb-3 w-full text-left"
                style={{ borderBottom: "1px solid rgba(11,19,28,.06)" }}
              >
                <MapPin size={15} style={{ color: "var(--hb-primary)", flexShrink: 0 }} />
                <span
                  className="text-[10.5px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--hb-fg-muted)" }}
                >
                  Deliver to
                </span>
                <span className="flex-1 text-[14px] font-semibold truncate text-left" style={{ color: "var(--hb-fg)" }}>
                  {locationLabel}
                </span>
                <Pencil size={12} style={{ color: "var(--hb-fg-muted)", flexShrink: 0 }} />
              </button>

              {/* Inline location action buttons — always visible */}
              <div className="flex flex-row gap-2 pt-3 pb-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUseGPS}
                  disabled={locGPSLoading}
                  className="flex items-center gap-2 text-[12.5px] font-semibold flex-1 justify-center"
                  style={{ borderColor: "var(--hb-border-soft)", color: "var(--hb-fg)" }}
                >
                  {locGPSLoading ? (
                    <Loader2 size={13} className="animate-spin" style={{ color: "var(--hb-primary)" }} />
                  ) : (
                    <MapPin size={13} style={{ color: "var(--hb-primary)" }} />
                  )}
                  Use my location
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setLocEditing(!locEditing); setLocInput(""); setLocSuggestions([]); setLocGPSError(null); }}
                  className="flex items-center gap-2 text-[12.5px] font-semibold flex-1 justify-center"
                  style={{ borderColor: "var(--hb-border-soft)", color: "var(--hb-fg)" }}
                >
                  <Pencil size={13} style={{ color: "var(--hb-fg-muted)" }} />
                  Enter an address
                </Button>
              </div>

              {/* GPS error */}
              {locGPSError && (
                <p className="px-1 pb-1 text-[12px]" style={{ color: "#DC2626" }}>
                  {locGPSError}
                </p>
              )}

              {/* Inline address input — toggled by pill or "Enter an address" button */}
              {locEditing && (
                <div className="pb-3">
                  <div className="relative">
                    <input
                      value={locInput}
                      onChange={(e) => handleLocInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && locSuggestions.length > 0) {
                          handleSelectSuggestion(locSuggestions[0]);
                        }
                      }}
                      placeholder="Search any address"
                      autoFocus
                      className="w-full px-3.5 py-2.5 rounded-xl text-[13px] outline-none"
                      style={{
                        background: "#F5F2ED",
                        border: "1px solid var(--hb-border-soft)",
                        color: "var(--hb-fg)",
                      }}
                    />
                    {locSuggestions.length > 0 && (
                      <div
                        className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl overflow-hidden z-10"
                        style={{
                          border: "1px solid var(--hb-border-soft)",
                          boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                          maxHeight: 200,
                          overflowY: "auto",
                        }}
                      >
                        {locSuggestions.map((s, i) => (
                          <button
                            key={i}
                            onClick={() => handleSelectSuggestion(s)}
                            className="w-full text-left px-3.5 py-2.5 text-[12px] transition-colors hover:bg-[#FBF7F1]"
                            style={{
                              color: "var(--hb-fg)",
                              borderBottom: i < locSuggestions.length - 1 ? "1px solid var(--hb-border-soft)" : "none",
                            }}
                          >
                            {s.display_name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recent locations */}
                  {recentLocs.length > 0 && locSuggestions.length === 0 && (
                    <div className="mt-3">
                      <p
                        className="text-[10.5px] font-bold uppercase tracking-wider mb-2"
                        style={{ color: "var(--hb-fg-muted)" }}
                      >
                        Recent
                      </p>
                      {recentLocs.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => applyLocation(r.label, r.lat, r.lng)}
                          className="w-full flex items-center gap-2.5 px-1 py-2 text-[12.5px] rounded-lg transition-colors hover:bg-[#FBF7F1]"
                          style={{ color: "var(--hb-fg)" }}
                        >
                          <Clock size={12} style={{ color: "var(--hb-fg-muted)", flexShrink: 0 }} />
                          <span className="truncate">{r.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Radius slider */}
              <div
                className="px-1 pt-3.5 pb-1 transition-opacity"
                style={{ opacity: showAll ? 0.6 : 1 }}
              >
                <div className="flex justify-between items-center mb-2">
                  <span
                    className="text-[10.5px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--hb-fg-muted)" }}
                  >
                    Search radius
                  </span>
                  <span
                    className="text-[14px] font-bold"
                    style={{ color: "var(--hb-primary)", fontVariantNumeric: "tabular-nums" }}
                  >
                    {radiusMi.toFixed(1)} mi
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="30"
                  step="0.5"
                  value={radiusMi}
                  onChange={(e) => { if (showAll) setShowAll(false); setRadiusMi(parseFloat(e.target.value)); }}
                  className="hb-range w-full"
                  style={{
                    background: `linear-gradient(to right, var(--hb-primary) 0%, var(--hb-primary) ${
                      ((radiusMi - 0.5) / 29.5) * 100
                    }%, #F0EBE3 ${((radiusMi - 0.5) / 29.5) * 100}%, #F0EBE3 100%)`,
                  }}
                />
                <div
                  className="flex justify-between mt-1 text-[10.5px] font-medium"
                  style={{ color: "var(--hb-fg-subtle)" }}
                >
                  <span>0.5 mi</span>
                  <span>30 mi</span>
                </div>
              </div>

              {/* Nationwide toggle */}
              <div
                className="flex items-center justify-between gap-3 mt-3.5 px-1 py-2.5"
                style={{ borderTop: "1px solid rgba(11,19,28,.06)" }}
              >
                <div className={showAll ? "" : ""}>
                  <p
                    className="text-[12.5px] font-semibold"
                    style={{ color: "var(--hb-fg)" }}
                  >
                    Show all restaurants nationwide
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--hb-fg-muted)" }}>
                    Ignores distance filter
                  </p>
                </div>
                <button
                  onClick={() => setShowAll((v) => !v)}
                  aria-label={showAll ? "Disable nationwide view" : "Enable nationwide view"}
                  className="relative flex-shrink-0 transition-colors duration-200 rounded-full"
                  style={{
                    width: 44,
                    height: 24,
                    background: showAll ? "var(--hb-primary)" : "#D1D5DB",
                  }}
                >
                  <span
                    className="absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full shadow transition-transform duration-200"
                    style={{ transform: showAll ? "translateX(23px)" : "translateX(3px)" }}
                  />
                </button>
              </div>

              {/* Search input + button */}
              <div className="flex gap-2.5 mt-3">
                <div
                  className="flex items-center gap-2.5 px-4 py-3 flex-1"
                  style={{ background: "#F5F2ED", borderRadius: "var(--hb-radius-pill)" }}
                >
                  <Search size={15} style={{ color: "var(--hb-fg-muted)" }} />
                  <input
                    placeholder="What are we craving for?"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-[14px] italic"
                    style={{ color: "var(--hb-fg)" }}
                  />
                </div>
                <button
                  onClick={() => {
                    document
                      .getElementById("near-you")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="px-5 lg:px-6 py-3 rounded-full font-bold text-[14px] text-white whitespace-nowrap transition-colors"
                  style={{
                    background: "var(--hb-primary)",
                    boxShadow: "0 4px 14px -2px rgba(255,122,57,.45)",
                  }}
                >
                  Find food
                </button>
              </div>

              {/* Result count */}
              <div
                className="px-1 pt-3 text-[12px]"
                style={{ color: "var(--hb-fg-muted)" }}
              >
                {showAll ? (
                  location ? (
                    <><b style={{ color: "var(--hb-fg)" }}>{restaurantsNear.length}</b> home restaurants ·{" "}
                    <b style={{ color: "var(--hb-fg)" }}>{dishesNear.length}</b> dishes{" "}
                    <b style={{ color: "var(--hb-primary)" }}>nationwide</b></>
                  ) : (
                    <><b style={{ color: "var(--hb-fg)" }}>{restaurantsNear.length}</b> home restaurants ·{" "}
                    <b style={{ color: "var(--hb-fg)" }}>{dishesNear.length}</b> dishes</>
                  )
                ) : (
                  <><b style={{ color: "var(--hb-fg)" }}>{restaurantsNear.length}</b> home restaurants ·{" "}
                  <b style={{ color: "var(--hb-fg)" }}>{dishesNear.length}</b> dishes within{" "}
                  <b style={{ color: "var(--hb-primary)" }}>{radiusMi.toFixed(1)} mi</b></>
                )}
              </div>
            </div>

            {/* Stats row — desktop only */}
            <div
              className="hidden lg:flex gap-8 mt-8 text-[13px]"
              style={{ color: "var(--hb-fg-muted)" }}
            >
              <Stat n="2,400+" l="Home cooks" />
              <Stat n="38" l="Cuisines" />
              <Stat n="4.9★" l="Avg rating" />
            </div>
          </div>

          {/* RIGHT — collage (desktop only) */}
          <div className="hidden lg:block relative h-[480px]">
            <div
              className="absolute top-0 right-0 w-[68%] h-[75%] rounded-3xl overflow-hidden bg-cover bg-center"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800)",
                boxShadow: "0 20px 60px -16px rgba(11,19,28,.3)",
              }}
            />
            <div
              className="absolute bottom-0 left-0 w-[55%] h-[60%] rounded-2xl overflow-hidden bg-cover bg-center"
              style={{
                backgroundImage:
                  "url(https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600)",
                boxShadow: "0 16px 40px -12px rgba(11,19,28,.28)",
                border: "6px solid var(--hb-bg)",
              }}
            />
            <div
              className="absolute top-[38%] -left-[2%] bg-white rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5"
              style={{
                boxShadow: "var(--hb-shadow-pop)",
                border: "1px solid rgba(11,19,28,.04)",
              }}
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white"
                style={{ background: "var(--hero-gradient)" }}
              >
                <ChefHat size={16} />
              </div>
              <div>
                <div className="text-[12px] font-bold" style={{ color: "var(--hb-fg)" }}>
                  {restaurantsNear[0]?.name ?? "Local kitchen"} · {restaurantsNear[0]?.distance_km != null ? kmToMi(restaurantsNear[0].distance_km).toFixed(1) : "1.4"} mi
                </div>
                <div className="text-[11px]" style={{ color: "#C24B12" }}>
                  ★ 4.9 · {restaurantsNear[0]?.cuisine ?? "Home-cooked"}
                </div>
              </div>
            </div>
            <div
              className="absolute bottom-[8%] -right-[2%] bg-white rounded-full pl-2.5 pr-3.5 py-2 flex items-center gap-2"
              style={{
                boxShadow: "var(--hb-shadow-pop)",
                border: "1px solid rgba(11,19,28,.04)",
              }}
            >
              <span
                className="w-6 h-6 rounded-full flex items-center justify-center"
                style={{ background: "var(--hb-success-soft)", color: "var(--hb-success-ink)" }}
              >
                <Clock size={13} />
              </span>
              <span className="text-[12px] font-bold" style={{ color: "var(--hb-fg)" }}>
                Order ready in 22 min
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── MAIN BODY ────────────────────────────────────────────────────── */}
      <main className="max-w-[1200px] mx-auto px-4 lg:px-8 pb-20">
        {/* Browse by cuisine */}
        <SectionHeader title="Browse by cuisine" />
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
          {CUISINES.map((c) => {
            const active = selectedCuisine === c.label;
            return (
              <button
                key={c.label}
                onClick={() => setSelectedCuisine(c.label)}
                className={`flex flex-col items-center justify-center flex-shrink-0 transition-all ${
                  active ? "" : "hover:opacity-80"
                }`}
                style={{
                  width: 84,
                  paddingTop: 8,
                  paddingBottom: 8,
                }}
              >
                <span
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-1.5 transition-all"
                  style={{
                    background: active ? "var(--hb-primary)" : "#fff",
                    border: active ? "1px solid var(--hb-primary)" : "1px solid var(--hb-border)",
                    boxShadow: active ? "0 6px 16px -4px rgba(255,122,57,.4)" : "var(--hb-shadow-soft)",
                  }}
                >
                  {c.emoji}
                </span>
                <span
                  className="text-[12px] font-semibold truncate w-full text-center"
                  style={{ color: active ? "var(--hb-primary)" : "var(--hb-fg)" }}
                >
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Home restaurants near you — radius-filtered */}
        <div id="near-you" className="scroll-mt-24">
          <SectionHeader
            title={showAll ? "All home restaurants" : "Home restaurants near you"}
            kicker="Featured"
            subtitle={
              showAll
                ? location ? `Showing all restaurants nationwide · distances from ${locationLabel}` : "Showing all restaurants nationwide"
                : location ? `Within ${radiusMi.toFixed(1)} mi of ${locationLabel}` : "Enable location to filter by distance"
            }
            action="View all"
          />
          {loading ? (
            <CardRowSkeleton kind="restaurant" />
          ) : restaurantsNear.length === 0 ? (
            <EmptyState
              text={
                location
                  ? `No home restaurants within ${radiusMi.toFixed(1)} mi. Try expanding the radius above.`
                  : "Enable location to discover nearby home cooks."
              }
            />
          ) : (
            <div className="grid grid-cols-4 gap-2 lg:flex lg:gap-4 lg:overflow-x-auto lg:scrollbar-hide lg:pb-2">
              {restaurantsNear.map((r) => (
                <RestaurantCard key={r.id} r={r} />
              ))}
            </div>
          )}
        </div>

        {/* Promo banner */}
        <div className="mt-8 mb-2">
          <div
            className="rounded-2xl p-5 lg:p-6 flex items-center gap-4"
            style={{
              background: "linear-gradient(110deg, #FFF1E3 0%, #FFE4CB 100%)",
              border: "1px solid #FFE1C7",
            }}
          >
            <div className="flex-1 min-w-0">
              <div
                className="text-[10.5px] font-bold uppercase tracking-wider mb-1"
                style={{ color: "#C24B12" }}
              >
                New here
              </div>
              <div
                className="font-bold text-[18px] lg:text-[22px] leading-[1.15] tracking-[-0.02em]"
                style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
              >
                $5 off your first home-cooked meal
              </div>
              <div className="text-[12px] lg:text-[13px] mt-1" style={{ color: "var(--hb-fg-muted)" }}>
                Use code <b>HOMEBITES5</b>. Terms apply.
              </div>
            </div>
            <button
              className="px-4 py-2 rounded-full text-[13px] font-bold text-white whitespace-nowrap"
              style={{ background: "var(--hb-fg)" }}
            >
              Claim
            </button>
          </div>
        </div>

        {/* Tonight's homemade */}
        <SectionHeader
          title="Tonight's homemade"
          subtitle="Fresh dishes from your neighbors — ready soon"
          action="See all"
        />
        {loading ? (
          <CardRowSkeleton kind="dish" />
        ) : dishesNear.length === 0 ? (
          <EmptyState
            text={
              location
                ? `No dishes within ${radiusMi.toFixed(1)} mi. Expand the radius above.`
                : "Enable location to see dishes near you."
            }
          />
        ) : (
          <div className="grid grid-cols-4 gap-2 lg:gap-4">
            {dishesNear.map((d) => (
              <DishCard
                key={d.id}
                d={d}
                qty={getQty(d.id)}
                onAdd={() => addToCart(d)}
                onInc={() => addToCart(d)}
                onDec={() => setInlineQty(d.id, getQty(d.id) - 1)}
                onOpenSheet={() => {
                  const rest = restaurants.find((r) => r.id === d.home_restaurant_id);
                  setSelectedDish({
                    id: d.id,
                    name: d.name,
                    description: d.description,
                    price: d.price,
                    image_url: d.image_url,
                    restaurant_id: d.home_restaurant_id,
                    restaurant_name: d.restaurant_name,
                    restaurant_cuisine: d.restaurant_cuisine,
                    restaurant_avg_rating: rest?.avg_rating,
                    restaurant_review_count: rest?.review_count,
                  });
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Floating cart bar — mobile only, shows when cart has items ─── */}
      {mounted && cartCount > 0 && !cartBarDismissed && (
        <div
          className="lg:hidden fixed bottom-16 left-4 right-4 z-40"
          onTouchStart={(e) => { touchStartYRef.current = e.touches[0].clientY; }}
          onTouchEnd={(e) => {
            const dy = e.changedTouches[0].clientY - touchStartYRef.current;
            if (dy > 30) setCartBarDismissed(true);
          }}
        >
          <div
            className="w-full rounded-full py-3.5 px-4 flex items-center gap-3 shadow-lg"
            style={{ background: "var(--hb-primary)" }}
          >
            <button
              onClick={() => window.dispatchEvent(new Event("homebites:open-cart"))}
              className="flex items-center gap-3 flex-1 min-w-0"
            >
              <span className="text-sm font-bold text-white bg-white/20 rounded-full min-w-[26px] h-[26px] flex items-center justify-center px-1.5">
                {cartCount}
              </span>
              <span className="flex-1 text-[14px] font-bold text-white text-center">View cart</span>
              <span className="text-[14px] font-bold text-white">${cartTotal.toFixed(2)}</span>
              <ArrowRight size={16} color="white" />
            </button>
            <button
              onClick={() => setCartBarDismissed(true)}
              className="ml-1 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.2)" }}
              aria-label="Dismiss cart bar"
            >
              <X size={13} color="white" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white flex items-stretch h-[60px]"
        style={{ borderTop: "1px solid var(--hb-border)" }}
      >
        {[
          { label: "Home",    Icon: House,   href: "/dashboard/customer", active: true  },
          { label: "Search",  Icon: Search,  href: "#",                   active: false },
          { label: "Orders",  Icon: Package, href: "/dashboard/customer/orders", active: false },
          { label: "Account", Icon: User,    href: "/login",              active: false },
        ].map(({ label, Icon, href, active }) => (
          <button
            key={label}
            onClick={() => { if (href !== "#") router.push(href); }}
            className="flex-1 flex flex-col items-center justify-center gap-0.5"
            style={{ color: active ? "var(--hb-primary)" : "var(--hb-fg-subtle)" }}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span className="text-[10px] font-semibold">{label}</span>
          </button>
        ))}
      </nav>

      <DishDetailSheet
        dish={selectedDish}
        onClose={() => { setSelectedDish(null); bumpCart(); }}
      />
      <CartDrawer />
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────────────────────── */

function Stat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="font-bold text-[18px]" style={{ color: "var(--hb-fg)" }}>
        {n}
      </div>
      <div className="text-[12px]" style={{ color: "var(--hb-fg-muted)" }}>
        {l}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  kicker,
  subtitle,
  action,
}: {
  title: string;
  kicker?: string;
  subtitle?: string;
  action?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 mt-6 lg:mt-12 mb-3 lg:mb-5">
      <div className="min-w-0">
        {kicker && (
          <div
            className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
            style={{ color: "var(--hb-primary)" }}
          >
            {kicker}
          </div>
        )}
        <h2
          className="font-bold text-[16px] lg:text-[32px] tracking-[-0.025em] leading-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
        >
          {title}
        </h2>
        {subtitle && (
          <div
            className="hidden lg:block text-[14px] mt-1"
            style={{ color: "var(--hb-fg-muted)" }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {action && (
        <button
          className="flex items-center gap-0.5 text-[13px] font-semibold whitespace-nowrap flex-shrink-0"
          style={{ color: "var(--hb-primary)" }}
        >
          {action} <span className="text-[15px] leading-none">›</span>
        </button>
      )}
    </div>
  );
}

function RestaurantCard({ r }: { r: Restaurant }) {
  const router = useRouter();
  const open = r.is_open !== false;

  return (
    <button
      onClick={() => { if (open) router.push(`/dashboard/customer/restaurant/${r.id}`); }}
      className="w-full lg:flex-shrink-0 lg:w-[280px] bg-white rounded-2xl text-left transition-all overflow-hidden hover:-translate-y-0.5"
      style={{
        border: "1px solid var(--hb-border-soft)",
        boxShadow: "var(--hb-shadow-soft)",
        opacity: open ? 1 : 0.6,
        cursor: open ? "pointer" : "default",
      }}
    >
      {/* Image + status badge */}
      <div className="relative">
        <CuisineEmojiBg cuisine={r.cuisine} className="h-[80px] lg:h-[150px]" />
        <span
          className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white leading-none"
          style={{ background: open ? "#16A34A" : "#6B7280" }}
        >
          {open ? "Open" : "Closed"}
        </span>
      </div>

      <div className="p-2 lg:p-3.5">
        {/* Name row */}
        <div className="flex items-start justify-between gap-1">
          <p
            className="text-[11px] lg:text-[15px] font-semibold lg:font-bold truncate flex-1"
            style={{ color: "var(--hb-fg)" }}
          >
            {r.name}
          </p>
          {/* Rating — desktop only, beside name */}
          {r.avg_rating != null && r.review_count != null && r.review_count > 0 && (
            <span
              className="hidden lg:flex items-center gap-0.5 text-[12px] font-bold whitespace-nowrap"
              style={{ color: "var(--hb-fg)" }}
            >
              <Star size={11} fill="#FFB400" stroke="#FFB400" />
              {r.avg_rating.toFixed(1)}
            </span>
          )}
        </div>

        {/* Cuisine — desktop only */}
        <p className="hidden lg:block text-[12.5px] mt-0.5" style={{ color: "var(--hb-primary)" }}>
          {r.cuisine}
        </p>

        {/* Rating + distance — mobile only */}
        <div
          className="lg:hidden flex items-center gap-1 mt-0.5"
          style={{ color: "var(--hb-fg-subtle)" }}
        >
          {r.avg_rating != null && r.review_count != null && r.review_count > 0 && (
            <>
              <Star size={9} fill="#FFB400" stroke="#FFB400" />
              <span className="text-[10px]">{r.avg_rating.toFixed(1)}</span>
            </>
          )}
          {r.distance_km != null && (
            <span className="text-[10px]">{r.avg_rating != null && r.review_count != null && r.review_count > 0 ? "· " : ""}{kmToMi(r.distance_km).toFixed(1)} mi</span>
          )}
        </div>

        {/* Distance + time — desktop only */}
        <div
          className="hidden lg:flex items-center gap-2 text-[12px] mt-2"
          style={{ color: "var(--hb-fg-muted)" }}
        >
          <span className="flex items-center gap-1">
            <MapPin size={11} />
            {r.distance_km != null ? `${kmToMi(r.distance_km).toFixed(1)} mi` : r.city}
          </span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            25–35 min
          </span>
        </div>
      </div>
    </button>
  );
}

function DishCard({
  d, qty, onAdd, onInc, onDec, onOpenSheet,
}: {
  d: Dish;
  qty: number;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
  onOpenSheet: () => void;
}) {
  return (
    <div
      className="w-full lg:w-auto bg-white rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
      style={{
        border: "1px solid var(--hb-border-soft)",
        boxShadow: "var(--hb-shadow-soft)",
      }}
    >
      {/* Image */}
      <div className="relative h-[90px] lg:h-auto lg:aspect-square bg-[#F5F2ED] overflow-hidden">
        {d.image_url ? (
          <img
            src={d.image_url}
            alt={d.name}
            className="w-full h-full object-cover cursor-pointer"
            onClick={onOpenSheet}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-3xl lg:text-5xl cursor-pointer"
            style={{ background: "linear-gradient(135deg, #FFF1E3 0%, #FFE4CB 100%)" }}
            onClick={onOpenSheet}
          >
            {CUISINE_EMOJI[d.restaurant_cuisine ?? ""] ?? "🍽️"}
          </div>
        )}

        {/* Qty badge — mobile only, top-left orange circle */}
        {qty > 0 && (
          <div
            className="lg:hidden absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white leading-none"
            style={{ background: "var(--hb-primary)" }}
          >
            {qty}
          </div>
        )}

        {/* "+" button — mobile only, 24px circle, always shown */}
        <button
          onClick={(e) => { e.stopPropagation(); onAdd(); }}
          className="lg:hidden absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-white flex items-center justify-center transition-colors"
          style={{
            border: "1px solid var(--hb-border-soft)",
            boxShadow: "var(--hb-shadow-soft)",
            color: "var(--hb-primary)",
          }}
          aria-label={`Add ${d.name}`}
        >
          <Plus size={12} strokeWidth={2.5} />
        </button>

        {/* Desktop: stepper or "+" */}
        {qty > 0 ? (
          <div
            className="hidden lg:flex absolute bottom-2 right-2 items-center gap-1 bg-white rounded-full px-1.5 py-1"
            style={{ border: "1px solid var(--hb-border-soft)", boxShadow: "var(--hb-shadow-soft)" }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); onDec(); }}
              className="w-6 h-6 flex items-center justify-center"
              style={{ color: "var(--hb-fg)" }}
            >
              <Minus size={13} />
            </button>
            <span
              className="text-[13px] font-bold w-4 text-center"
              style={{ color: "var(--hb-fg)", fontVariantNumeric: "tabular-nums" }}
            >
              {qty}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); onInc(); }}
              className="w-6 h-6 flex items-center justify-center"
              style={{ color: "var(--hb-primary)" }}
            >
              <Plus size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); onAdd(); }}
            className="hidden lg:flex absolute bottom-2 right-2 w-9 h-9 rounded-full bg-white items-center justify-center transition-colors"
            style={{
              border: "1px solid var(--hb-border-soft)",
              boxShadow: "var(--hb-shadow-soft)",
              color: "var(--hb-primary)",
            }}
            aria-label={`Add ${d.name}`}
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {/* Card body */}
      <div
        className="p-1.5 lg:p-3 cursor-pointer"
        onClick={onOpenSheet}
      >
        <p
          className="text-[11px] lg:text-[14px] font-bold leading-tight line-clamp-1"
          style={{ color: "var(--hb-fg)" }}
        >
          {d.name}
        </p>

        {/* Restaurant name — desktop only */}
        <p
          className="hidden lg:block text-[11.5px] font-medium mt-0.5 truncate"
          style={{ color: "var(--hb-primary)" }}
        >
          {d.restaurant_name}
        </p>

        {/* Mobile: price + delivery time */}
        <div className="lg:hidden flex items-center gap-1 mt-1">
          <span
            className="text-[11px] font-bold"
            style={{ color: "var(--hb-fg)", fontVariantNumeric: "tabular-nums" }}
          >
            ${(d.price ?? 0).toFixed(2)}
          </span>
          <span className="text-[10px]" style={{ color: "var(--hb-fg-subtle)" }}>· 25 min</span>
        </div>

        {/* Desktop: price + distance */}
        <div className="hidden lg:flex items-center justify-between mt-2">
          <p
            className="text-[14px] font-bold"
            style={{ color: "var(--hb-fg)", fontVariantNumeric: "tabular-nums" }}
          >
            ${(d.price ?? 0).toFixed(2)}
          </p>
          {d.distance_km != null && (
            <p className="text-[11px]" style={{ color: "var(--hb-fg-subtle)" }}>
              {kmToMi(d.distance_km).toFixed(1)} mi
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CardRowSkeleton({ kind }: { kind: "restaurant" | "dish" }) {
  if (kind === "restaurant") {
    return (
      <div className="grid grid-cols-4 gap-2 lg:flex lg:gap-3 lg:overflow-x-auto lg:scrollbar-hide lg:pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="w-full lg:flex-shrink-0 lg:w-[280px] bg-white rounded-2xl overflow-hidden animate-pulse"
            style={{ border: "1px solid var(--hb-border-soft)" }}
          >
            <div className="h-[80px] lg:h-[150px] bg-[#F0EBE3]" />
            <div className="p-2 lg:p-3.5 space-y-1.5">
              <div className="h-3 lg:h-4 bg-[#F0EBE3] rounded w-3/4" />
              <div className="h-2.5 lg:h-3 bg-[#F0EBE3] rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-4 gap-2 lg:gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="w-full lg:w-auto bg-white rounded-2xl overflow-hidden animate-pulse"
          style={{ border: "1px solid var(--hb-border-soft)" }}
        >
          <div className="h-[90px] lg:h-auto lg:aspect-square bg-[#F0EBE3]" />
          <div className="p-1.5 lg:p-3 space-y-1.5">
            <div className="h-3 bg-[#F0EBE3] rounded w-3/4" />
            <div className="h-2.5 bg-[#F0EBE3] rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      className="rounded-2xl py-10 px-6 text-center"
      style={{
        background: "#fff",
        border: "1px dashed var(--hb-border)",
        color: "var(--hb-fg-muted)",
      }}
    >
      <p className="text-[14px]">{text}</p>
    </div>
  );
}
