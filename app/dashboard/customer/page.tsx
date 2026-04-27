"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import {
  addToCart as addToCartLib,
  getCart,
  getCartSubtotal,
  getCartItemCount,
  updateItemQuantity,
} from "@/lib/cart";
import CartDrawer from "@/components/CartDrawer";
import {
  Bell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  House,
  MapPin,
  Menu,
  Package,
  Search,
  ShoppingBag,
  ShoppingCart,
  Store,
  User,
  Zap,
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

/* ─── Category chips ─────────────────────────────────────────────────────── */

const CATEGORY_CHIPS = [
  { label: "Indian",     emoji: "🍛", bg: "#FFF3E0" },
  { label: "Mexican",    emoji: "🌮", bg: "#E8F5E9" },
  { label: "Pizza",      emoji: "🍕", bg: "#FFEBEE" },
  { label: "Burgers",    emoji: "🍔", bg: "#FFF8E1" },
  { label: "Healthy",    emoji: "🥗", bg: "#F1F8E9" },
  { label: "Deals",      emoji: "⚡", bg: "#EDE7F6" },
  { label: "Asian",      emoji: "🍜", bg: "#E3F2FD" },
  { label: "Sandwiches", emoji: "🥪", bg: "#FFF3E0" },
  { label: "Vegan",      emoji: "🌿", bg: "#E8F5E9" },
  { label: "Desserts",   emoji: "🍰", bg: "#FCE4EC" },
  { label: "Breakfast",  emoji: "🍳", bg: "#FFFDE7" },
];

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

function getGreeting(user: any): string {
  const h = new Date().getHours();
  if (user) return "Welcome back!";
  if (h < 12) return "Good morning, hungry?";
  if (h < 17) return "Good afternoon, hungry?";
  return "Good evening, hungry?";
}

/* ─── Skeleton loaders ───────────────────────────────────────────────────── */

function RestaurantCardSkeleton() {
  return (
    <div className="flex-shrink-0 w-[200px] lg:w-[240px] bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden animate-pulse">
      <div className="h-[150px] bg-slate-100" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-2/3" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
        <div className="h-3 bg-slate-100 rounded w-1/3" />
      </div>
    </div>
  );
}

function DishCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden animate-pulse">
      <div className="h-[150px] bg-slate-100" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
        <div className="h-4 bg-slate-100 rounded w-1/4" />
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export default function CustomerDashboard() {
  // Auth
  const [user, setUser]       = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  // Order mode
  const [orderMode, setOrderMode] = useState<"delivery" | "pickup">("delivery");

  // Location
  const [locationLabel, setLocationLabel] = useState("Celina, TX");
  const [location, setLocation]           = useState<{ lat: number; lng: number } | null>(null);

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery]           = useState("");

  // Data
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [dishes, setDishes]           = useState<Dish[]>([]);
  const [loading, setLoading]         = useState(true);

  // Cart
  const [cartTick, setCartTick] = useState(0);
  const cart      = useMemo(() => getCart(),          [cartTick]);
  const cartTotal = useMemo(() => getCartSubtotal(),  [cartTick]);
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

  /* ── Restore saved location ── */
  useEffect(() => {
    const saved = localStorage.getItem("homebites_customer_context");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.location) setLocation(parsed.location);
        if (parsed.city)     setLocationLabel(parsed.city);
      } catch {}
    }
  }, []);

  /* ── Auto geolocation ── */
  useEffect(() => {
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
  }, []);

  /* ── Save location ── */
  useEffect(() => {
    if (!location) return;
    localStorage.setItem(
      "homebites_customer_context",
      JSON.stringify({ location, city: locationLabel })
    );
  }, [location, locationLabel]);

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
        const MAX_KM = 40;
        enriched = enriched
          .map((r) =>
            r.lat && r.lng
              ? { ...r, distance_km: calcDistance(location.lat, location.lng, r.lat, r.lng) }
              : r
          )
          .filter((r) => {
            if (!r.distance_km) return true;
            if (r.delivery_radius_km && r.distance_km > r.delivery_radius_km) return false;
            return r.distance_km <= MAX_KM;
          });
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
    return cart?.items.find((i) => i.dish_id === dishId)?.quantity ?? 0;
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

  /* ── Filtered dishes ── */
  const filteredDishes = useMemo(() => {
    let result = dishes;
    if (selectedCategory) {
      const q = selectedCategory.toLowerCase();
      result = result.filter(
        (d) =>
          (d.restaurant_cuisine ?? "").toLowerCase().includes(q) ||
          (d.restaurant_name    ?? "").toLowerCase().includes(q) ||
          (d.description        ?? "").toLowerCase().includes(q)
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.restaurant_name ?? "").toLowerCase().includes(q) ||
          (d.description     ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [dishes, selectedCategory, searchQuery]);

  /* ── Render ─────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-white">

      {/* ══ TOP NAVBAR ══════════════════════════════════════════════════════ */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#E5E7EB] h-16">
        <div className="h-full px-4 lg:px-6 flex items-center gap-3 lg:gap-4">

          {/* Hamburger — mobile only */}
          <button className="lg:hidden text-[#16202B] flex-shrink-0">
            <Menu size={24} />
          </button>

          {/* Logo */}
          <button
            onClick={() => (window.location.href = "/dashboard/customer")}
            className="flex-shrink-0"
          >
            <Image
              src="/homebites-logo.png"
              alt="HomeBites"
              width={32}
              height={32}
              className="h-8 w-auto object-contain"
            />
          </button>

          {/* Center search — desktop only */}
          <div className="hidden lg:flex flex-1 justify-center">
            <div className="flex items-center gap-2 bg-[#F5F5F5] rounded-full h-10 px-4 w-[400px]">
              <Search size={16} className="text-[#9CA3AF] flex-shrink-0" />
              <input
                type="text"
                className="flex-1 bg-transparent text-sm text-[#16202B] outline-none placeholder:text-[#9CA3AF]"
                placeholder="Search HomeBites"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Spacer on mobile so cart stays right */}
          <div className="flex-1 lg:hidden" />

          {/* Right actions */}
          <div className="flex items-center gap-2 lg:gap-3 flex-shrink-0">
            {/* Location — desktop only */}
            <button className="hidden lg:flex items-center gap-1.5 text-sm font-medium text-[#16202B] whitespace-nowrap">
              <MapPin size={16} className="text-[#FF7A39]" />
              {locationLabel}
            </button>

            {/* Divider — desktop only */}
            <span className="hidden lg:block text-[#E5E7EB] text-lg select-none">|</span>

            {/* Delivery / Pickup toggle — desktop only */}
            <div className="hidden lg:flex items-center gap-1">
              <button
                onClick={() => setOrderMode("delivery")}
                className={`rounded-full px-4 py-1.5 text-[14px] font-semibold transition-colors ${
                  orderMode === "delivery"
                    ? "bg-[#16202B] text-white"
                    : "bg-white text-[#16202B] hover:bg-[#F5F5F5]"
                }`}
              >
                Delivery
              </button>
              <button
                onClick={() => setOrderMode("pickup")}
                className={`rounded-full px-4 py-1.5 text-[14px] font-semibold transition-colors ${
                  orderMode === "pickup"
                    ? "bg-[#16202B] text-white"
                    : "bg-white text-[#16202B] hover:bg-[#F5F5F5]"
                }`}
              >
                Pickup
              </button>
            </div>

            {/* Bell — desktop only */}
            <button className="hidden lg:block text-[#16202B] hover:text-[#FF7A39] transition-colors">
              <Bell size={22} />
            </button>

            {/* Cart circle — always visible */}
            <button
              onClick={() => window.dispatchEvent(new Event("homebites:open-cart"))}
              className="relative w-9 h-9 rounded-full bg-[#FF7A39] flex items-center justify-center flex-shrink-0 hover:bg-[#e06a2e] transition-colors"
              aria-label="Open cart"
            >
              <ShoppingBag size={18} color="white" />
              {mounted && cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-white text-[#FF7A39] text-[9px] font-bold min-w-[16px] h-4 rounded-full flex items-center justify-center px-0.5 border border-[#FF7A39] leading-none">
                  {cartCount > 9 ? "9+" : cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ══ PAGE BODY ════════════════════════════════════════════════════════ */}
      <div className="flex pt-16">

        {/* ── LEFT SIDEBAR — desktop only ───────────────────────────────── */}
        <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-60 bg-white border-r border-[#E5E7EB] flex-col pt-[80px] z-40">

          {/* Primary nav */}
          <nav className="flex-1 px-2 space-y-0.5">
            {[
              { label: "Home",         Icon: House,        active: true  },
              { label: "Grocery",      Icon: ShoppingCart, active: false },
              { label: "Retail",       Icon: Store,        active: false },
              { label: "Reservations", Icon: Calendar,     active: false },
              { label: "Deals",        Icon: Zap,          active: false },
            ].map(({ label, Icon, active }) => (
              <button
                key={label}
                className={`w-full flex items-center gap-3 px-5 py-3 rounded-lg text-[15px] font-medium transition-colors ${
                  active
                    ? "bg-[#FFF3E0] text-[#FF7A39]"
                    : "text-[#16202B] hover:bg-[#F5F5F5]"
                }`}
              >
                <Icon size={20} color={active ? "#FF7A39" : "#16202B"} />
                {label}
              </button>
            ))}

            <div className="my-3 border-t border-[#E5E7EB]" />

            {[
              { label: "Orders",  Icon: Package, href: "/dashboard/customer" },
              { label: "Account", Icon: User,    href: user ? "/dashboard" : "/login" },
            ].map(({ label, Icon, href }) => (
              <button
                key={label}
                onClick={() => (window.location.href = href)}
                className="w-full flex items-center gap-3 px-5 py-3 rounded-lg text-[15px] font-medium text-[#16202B] hover:bg-[#F5F5F5] transition-colors"
              >
                <Icon size={20} color="#16202B" />
                {label}
              </button>
            ))}
          </nav>

          {/* Bottom links */}
          <div className="px-7 py-5 space-y-2 border-t border-[#E5E7EB]">
            {mounted && !user && (
              <a
                href="/login"
                className="block text-[14px] text-[#FF7A39] font-medium hover:underline"
              >
                Sign In
              </a>
            )}
            <a
              href="/signup"
              className="block text-[14px] text-[#FF7A39] font-medium hover:underline"
            >
              Become a Chef
            </a>
          </div>
        </aside>

        {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
        <main className="lg:ml-60 flex-1 min-h-[calc(100vh-64px)] bg-white pb-[68px] lg:pb-0">

          {/* Mobile search bar */}
          <div className="lg:hidden px-4 pt-3 pb-1">
            <div className="flex items-center gap-2 bg-[#F5F5F5] rounded-full h-10 px-4">
              <Search size={16} className="text-[#9CA3AF] flex-shrink-0" />
              <input
                type="text"
                className="flex-1 bg-transparent text-sm text-[#16202B] outline-none placeholder:text-[#9CA3AF]"
                placeholder="Search HomeBites"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="px-4 lg:px-8 py-4 lg:py-6">

            {/* A) Welcome */}
            <h1 className="text-xl lg:text-2xl font-bold text-[#16202B]">
              {mounted ? getGreeting(user) : "Good morning, hungry?"}
            </h1>

            {/* B) Category chips */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide py-4 -mx-1 px-1">
              {CATEGORY_CHIPS.map((c) => {
                const active = selectedCategory === c.label;
                return (
                  <button
                    key={c.label}
                    onClick={() =>
                      setSelectedCategory(active ? null : c.label)
                    }
                    className={`flex items-center gap-2 rounded-full px-3 py-2 border text-sm font-medium whitespace-nowrap flex-shrink-0 transition-colors ${
                      active
                        ? "bg-[#FFF3E0] border-orange-300 text-orange-600"
                        : "bg-white border-[#E5E7EB] text-[#16202B] hover:bg-[#F5F5F5]"
                    }`}
                  >
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                      style={{ backgroundColor: c.bg }}
                    >
                      {c.emoji}
                    </span>
                    {c.label}
                  </button>
                );
              })}
            </div>

            {/* C) Promo banners */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-2">
              {/* Banner 1 */}
              <div
                className="rounded-2xl p-6 h-[140px] flex flex-col justify-between"
                style={{ background: "linear-gradient(135deg, #E8F5E9, #C8E6C9)" }}
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-green-700">
                    New Here
                  </p>
                  <p className="text-[20px] font-bold text-[#16202B] leading-tight mt-1">
                    Save $5 on your first homemade meal
                  </p>
                  <p className="text-[13px] text-[#6F6A60] mt-1">
                    Use code HOMEBITES5. Terms apply.
                  </p>
                </div>
                <button className="self-start text-[13px] font-medium text-[#16202B] border border-[#16202B] rounded-full px-3 py-1 hover:bg-white/50 transition-colors">
                  Learn more
                </button>
              </div>

              {/* Banner 2 */}
              <div
                className="rounded-2xl p-6 h-[140px] flex flex-col justify-between"
                style={{ background: "linear-gradient(135deg, #EDE7F6, #D1C4E9)" }}
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-purple-600">
                    Chef Pass
                  </p>
                  <p className="text-[20px] font-bold text-[#16202B] leading-tight mt-1">
                    $0 service fees. Chef-only deals.
                  </p>
                </div>
                <button className="self-start text-[13px] font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-full px-4 py-1.5 transition-colors">
                  Start Free Trial
                </button>
              </div>
            </div>

            {/* D) Featured Home Restaurants */}
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[18px] lg:text-[22px] font-bold text-[#16202B]">
                  Featured Home Restaurants
                </h2>
                <button className="text-[14px] text-[#FF7A39] font-medium hover:underline">
                  See All
                </button>
              </div>

              <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <RestaurantCardSkeleton key={i} />)
                  : restaurants.length === 0
                  ? (
                    <p className="text-sm text-[#9CA3AF] italic py-4">
                      {location
                        ? "No home restaurants nearby yet."
                        : "Enable location to discover nearby home cooks."}
                    </p>
                  )
                  : restaurants.map((r) => (
                    <button
                      key={r.id}
                      onClick={() =>
                        (window.location.href = `/dashboard/customer/restaurant/${r.id}`)
                      }
                      className="flex-shrink-0 w-[200px] lg:w-[240px] bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden text-left cursor-pointer hover:shadow-md transition-shadow group"
                    >
                      {/* Restaurant image placeholder */}
                      <div className="h-[150px] bg-[#F5F5F5] flex items-end p-3 overflow-hidden">
                        <span className="text-5xl leading-none">
                          {({ Indian:"🍛", Mexican:"🌮", Asian:"🍜", Healthy:"🥗",
                             Desserts:"🍰", Italian:"🍝", Vegan:"🌿",
                             Breakfast:"🍳", "South Indian":"🫕",
                             Mediterranean:"🥙" } as Record<string,string>)[r.cuisine] ?? "🍽️"}
                        </span>
                      </div>
                      <div className="p-3">
                        <p className="text-[15px] font-semibold text-[#16202B] truncate group-hover:text-[#FF7A39] transition-colors">
                          {r.name}
                        </p>
                        <p className="text-[13px] text-[#9CA3AF] mt-0.5">
                          {r.distance_km != null
                            ? `${(r.distance_km * 0.621).toFixed(1)} mi • 30–45 min`
                            : "30–45 min"}
                        </p>
                        <p className="text-[13px] text-[#9CA3AF]">$0 delivery fee</p>
                        <p className="text-[12px] text-[#FF7A39] font-medium mt-1">
                          {r.cuisine}
                        </p>
                      </div>
                    </button>
                  ))
                }
              </div>
            </div>

            {/* E) What's cooking today */}
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[18px] lg:text-[22px] font-bold text-[#16202B]">
                  What&apos;s cooking today
                </h2>
                <div className="flex items-center gap-2">
                  <button className="text-[14px] text-[#FF7A39] font-medium hover:underline mr-2">
                    See all
                  </button>
                  <button className="hidden lg:flex w-8 h-8 rounded-full border border-[#E5E7EB] items-center justify-center text-[#9CA3AF] hover:bg-[#F5F5F5] transition-colors">
                    <ChevronLeft size={18} />
                  </button>
                  <button className="hidden lg:flex w-8 h-8 rounded-full border border-[#E5E7EB] items-center justify-center text-[#9CA3AF] hover:bg-[#F5F5F5] transition-colors">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => <DishCardSkeleton key={i} />)}
                </div>
              ) : filteredDishes.length === 0 ? (
                <p className="text-sm text-[#9CA3AF] italic py-4">
                  {location
                    ? "No dishes found — try a different category."
                    : "Enable location to see dishes near you."}
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredDishes.map((d) => {
                    const qty = getQty(d.id);
                    return (
                      <div
                        key={d.id}
                        className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                      >
                        {/* Image + add button */}
                        <div className="relative h-[150px] bg-[#F5F5F5] overflow-hidden">
                          <img
                            src={d.image_url || "/placeholder-dish.png"}
                            alt={d.name}
                            className="w-full h-full object-cover"
                          />

                          {/* Add button / stepper (absolute, bottom-right of image) */}
                          {qty > 0 ? (
                            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-white rounded-full border border-[#E5E7EB] shadow-sm px-1.5 py-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); setInlineQty(d.id, qty - 1); }}
                                className="w-6 h-6 flex items-center justify-center text-[#16202B] font-bold text-base leading-none"
                              >
                                −
                              </button>
                              <span className="text-sm font-bold text-[#16202B] w-4 text-center">
                                {qty}
                              </span>
                              <button
                                onClick={(e) => { e.stopPropagation(); addToCart(d); }}
                                className="w-6 h-6 flex items-center justify-center text-[#16202B] font-bold text-base leading-none"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => { e.stopPropagation(); addToCart(d); }}
                              className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white border border-[#E5E7EB] shadow-sm flex items-center justify-center text-[#16202B] font-bold text-xl leading-none hover:border-[#FF7A39] hover:text-[#FF7A39] transition-colors"
                              aria-label={`Add ${d.name}`}
                            >
                              +
                            </button>
                          )}
                        </div>

                        {/* Card body */}
                        <div
                          className="p-3"
                          onClick={() =>
                            (window.location.href = `/dashboard/customer/restaurant/${d.home_restaurant_id}`)
                          }
                        >
                          <p className="text-[14px] font-semibold text-[#16202B] leading-snug line-clamp-2">
                            {d.name}
                          </p>
                          <p className="text-[13px] text-[#FF7A39] font-medium mt-0.5 truncate">
                            {d.restaurant_name}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-[14px] font-bold text-[#16202B]">
                              ${d.price.toFixed(2)}
                            </p>
                            {d.distance_km != null && (
                              <p className="text-[12px] text-[#9CA3AF]">
                                {(d.distance_km * 0.621).toFixed(1)} mi
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Bottom breathing room */}
            <div className="h-8 lg:h-16" />
          </div>
        </main>
      </div>

      {/* ── Mobile floating cart bar ──────────────────────────────────────── */}
      {mounted && cartCount > 0 && (
        <div className="lg:hidden fixed bottom-[68px] left-4 right-4 z-40">
          <button
            onClick={() => window.dispatchEvent(new Event("homebites:open-cart"))}
            className="w-full bg-[#FF7A39] text-white rounded-full py-3.5 flex items-center justify-between px-5 shadow-lg hover:bg-[#e06a2e] transition-colors"
          >
            <span className="bg-white/20 text-white text-sm font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center">
              {cartCount}
            </span>
            <span className="text-sm font-semibold">View Cart</span>
            <span className="text-sm font-semibold">${cartTotal.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* ── Mobile bottom nav bar ─────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E5E7EB] h-[60px] flex items-center">
        {[
          { label: "Home",    Icon: House,    href: "/dashboard/customer", active: true  },
          { label: "Search",  Icon: Search,   href: "#",                   active: false },
          { label: "Orders",  Icon: Package,  href: "/dashboard/customer", active: false },
          { label: "Account", Icon: User,     href: user ? "/dashboard" : "/login", active: false },
        ].map(({ label, Icon, href, active }) => (
          <button
            key={label}
            onClick={() => { if (href !== "#") window.location.href = href; }}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
              active ? "text-[#FF7A39]" : "text-[#9CA3AF] hover:text-[#FF7A39]"
            }`}
          >
            <Icon size={22} />
            <span className="text-[10px] font-medium">{label}</span>
          </button>
        ))}
      </nav>

      {/* CartDrawer — driven by homebites:open-cart event */}
      <CartDrawer />
    </div>
  );
}
