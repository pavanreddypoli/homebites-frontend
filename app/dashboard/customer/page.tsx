"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  addToCart as addToCartLib,
  getCart,
  getCartSubtotal,
  getCartItemCount,
  updateItemQuantity,
} from "@/lib/cart";
import CartDrawer from "@/components/CartDrawer";
import CustomerNav from "@/components/CustomerNav";
import {
  MapPin, Search, Sparkles, Star, Clock, ArrowRight, Plus, Minus, ChefHat,
} from "lucide-react";

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
  // Auth
  const [user, setUser]       = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Location
  const [locationLabel, setLocationLabel] = useState("Celina, TX");
  const [location, setLocation]           = useState<{ lat: number; lng: number } | null>(null);

  // Filters
  const [selectedCuisine, setSelectedCuisine] = useState<string>("All");
  const [searchQuery, setSearchQuery]         = useState("");
  const [radiusMi, setRadiusMi]               = useState(2);

  // Data
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [dishes, setDishes]           = useState<Dish[]>([]);
  const [loading, setLoading]         = useState(true);

  // Cart re-render trigger
  const [cartTick, setCartTick] = useState(0);
  const cartCount = useMemo(() => getCartItemCount(), [cartTick]);
  function bumpCart() { setCartTick((v) => v + 1); }

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
  }, []);

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

  /* ── Load data ── */
  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const [{ data: restaurantData }, { data: dishData }] = await Promise.all([
        supabase
          .from("home_restaurants")
          .select("id, name, cuisine, description, city, lat, lng, delivery_radius_km")
          .eq("is_active", true),
        supabase
          .from("dishes")
          .select("id, name, description, price, home_restaurant_id, image_url"),
      ]);

      let enriched: Restaurant[] = restaurantData ?? [];

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

  // Restaurants within selected radius (or all if no location yet)
  const restaurantsNear = useMemo(() => {
    let list = restaurants;
    if (location) {
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
  }, [restaurants, selectedCuisine, searchQuery, radiusKm, location]);

  const dishesNear = useMemo(() => {
    let list = dishes;
    if (location) {
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
  }, [dishes, selectedCuisine, searchQuery, radiusKm, location]);

  /* ── Render ─────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen" style={{ background: "var(--hb-bg)" }}>
      <CustomerNav address={locationLabel} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden pt-20 lg:pt-24 pb-10 lg:pb-20 px-4 lg:px-8"
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
              {/* Deliver to */}
              <div
                className="flex items-center gap-2.5 px-1 pb-3"
                style={{ borderBottom: "1px solid rgba(11,19,28,.06)" }}
              >
                <MapPin size={15} style={{ color: "var(--hb-primary)" }} />
                <span
                  className="text-[10.5px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--hb-fg-muted)" }}
                >
                  Deliver to
                </span>
                <input
                  value={locationLabel}
                  onChange={(e) => setLocationLabel(e.target.value)}
                  className="flex-1 text-[14px] font-semibold bg-transparent outline-none"
                  style={{ color: "var(--hb-fg)" }}
                />
              </div>

              {/* Radius slider */}
              <div className="px-1 pt-3.5 pb-1">
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
                  max="10"
                  step="0.1"
                  value={radiusMi}
                  onChange={(e) => setRadiusMi(parseFloat(e.target.value))}
                  className="hb-range w-full"
                  style={{
                    background: `linear-gradient(to right, var(--hb-primary) 0%, var(--hb-primary) ${
                      ((radiusMi - 0.5) / 9.5) * 100
                    }%, #F0EBE3 ${((radiusMi - 0.5) / 9.5) * 100}%, #F0EBE3 100%)`,
                  }}
                />
                <div
                  className="flex justify-between mt-1 text-[10.5px] font-medium"
                  style={{ color: "var(--hb-fg-subtle)" }}
                >
                  <span>0.5 mi</span>
                  <span>10 mi</span>
                </div>
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
                <b style={{ color: "var(--hb-fg)" }}>{restaurantsNear.length}</b> home restaurants ·{" "}
                <b style={{ color: "var(--hb-fg)" }}>{dishesNear.length}</b> dishes within{" "}
                <b style={{ color: "var(--hb-primary)" }}>{radiusMi.toFixed(1)} mi</b>
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
            title="Home restaurants near you"
            kicker="Featured"
            subtitle={location ? `Within ${radiusMi.toFixed(1)} mi of ${locationLabel}` : "Enable location to filter by distance"}
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
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 lg:mx-0 lg:px-0">
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
            {dishesNear.map((d) => (
              <DishCard
                key={d.id}
                d={d}
                qty={getQty(d.id)}
                onAdd={() => addToCart(d)}
                onInc={() => addToCart(d)}
                onDec={() => setInlineQty(d.id, getQty(d.id) - 1)}
              />
            ))}
          </div>
        )}
      </main>

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
    <div className="flex items-end justify-between gap-4 mt-8 lg:mt-12 mb-4 lg:mb-5">
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
          className="font-bold text-[22px] lg:text-[32px] tracking-[-0.025em] leading-tight"
          style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
        >
          {title}
        </h2>
        {subtitle && (
          <div
            className="text-[12.5px] lg:text-[14px] mt-1"
            style={{ color: "var(--hb-fg-muted)" }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {action && (
        <button
          className="hidden sm:flex items-center gap-1 text-[13px] lg:text-[14px] font-semibold whitespace-nowrap"
          style={{ color: "var(--hb-primary)" }}
        >
          {action} <ArrowRight size={13} />
        </button>
      )}
    </div>
  );
}

function RestaurantCard({ r }: { r: Restaurant }) {
  return (
    <button
      onClick={() => (window.location.href = `/dashboard/customer/restaurant/${r.id}`)}
      className="flex-shrink-0 w-[260px] lg:w-[280px] bg-white rounded-2xl text-left transition-all overflow-hidden hover:-translate-y-0.5"
      style={{
        border: "1px solid var(--hb-border-soft)",
        boxShadow: "var(--hb-shadow-soft)",
      }}
    >
      <CuisineEmojiBg cuisine={r.cuisine} className="h-[150px]" />
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2">
          <p
            className="text-[15px] font-bold truncate"
            style={{ color: "var(--hb-fg)" }}
          >
            {r.name}
          </p>
          <span
            className="flex items-center gap-0.5 text-[12px] font-bold whitespace-nowrap"
            style={{ color: "var(--hb-fg)" }}
          >
            <Star size={11} fill="#FFB400" stroke="#FFB400" />
            4.9
          </span>
        </div>
        <p className="text-[12.5px] mt-0.5" style={{ color: "var(--hb-primary)" }}>
          {r.cuisine}
        </p>
        <div
          className="flex items-center gap-2 text-[12px] mt-2"
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
  d, qty, onAdd, onInc, onDec,
}: {
  d: Dish;
  qty: number;
  onAdd: () => void;
  onInc: () => void;
  onDec: () => void;
}) {
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5"
      style={{
        border: "1px solid var(--hb-border-soft)",
        boxShadow: "var(--hb-shadow-soft)",
      }}
    >
      <div className="relative aspect-square bg-[#F5F2ED] overflow-hidden">
        {d.image_url ? (
          <img
            src={d.image_url}
            alt={d.name}
            className="w-full h-full object-cover"
            onClick={() => (window.location.href = `/dashboard/customer/restaurant/${d.home_restaurant_id}`)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-5xl"
            style={{
              background: "linear-gradient(135deg, #FFF1E3 0%, #FFE4CB 100%)",
            }}
            onClick={() => (window.location.href = `/dashboard/customer/restaurant/${d.home_restaurant_id}`)}
          >
            {CUISINE_EMOJI[d.restaurant_cuisine ?? ""] ?? "🍽️"}
          </div>
        )}

        {qty > 0 ? (
          <div
            className="absolute bottom-2 right-2 flex items-center gap-1 bg-white rounded-full px-1.5 py-1"
            style={{
              border: "1px solid var(--hb-border-soft)",
              boxShadow: "var(--hb-shadow-soft)",
            }}
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
            className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-white flex items-center justify-center transition-colors"
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

      <div
        className="p-3 cursor-pointer"
        onClick={() => (window.location.href = `/dashboard/customer/restaurant/${d.home_restaurant_id}`)}
      >
        <p
          className="text-[14px] font-bold leading-tight line-clamp-1"
          style={{ color: "var(--hb-fg)" }}
        >
          {d.name}
        </p>
        <p
          className="text-[11.5px] font-medium mt-0.5 truncate"
          style={{ color: "var(--hb-primary)" }}
        >
          {d.restaurant_name}
        </p>
        <div className="flex items-center justify-between mt-2">
          <p
            className="text-[14px] font-bold"
            style={{ color: "var(--hb-fg)", fontVariantNumeric: "tabular-nums" }}
          >
            ${d.price.toFixed(2)}
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
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[260px] bg-white rounded-2xl overflow-hidden animate-pulse"
            style={{ border: "1px solid var(--hb-border-soft)" }}
          >
            <div className="h-[150px] bg-[#F0EBE3]" />
            <div className="p-3.5 space-y-2">
              <div className="h-4 bg-[#F0EBE3] rounded w-3/4" />
              <div className="h-3 bg-[#F0EBE3] rounded w-1/2" />
              <div className="h-3 bg-[#F0EBE3] rounded w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl overflow-hidden animate-pulse"
          style={{ border: "1px solid var(--hb-border-soft)" }}
        >
          <div className="aspect-square bg-[#F0EBE3]" />
          <div className="p-3 space-y-2">
            <div className="h-3.5 bg-[#F0EBE3] rounded w-3/4" />
            <div className="h-3 bg-[#F0EBE3] rounded w-1/2" />
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
