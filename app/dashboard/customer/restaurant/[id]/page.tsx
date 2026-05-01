"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import CustomerNav from "@/components/CustomerNav";
import CartDrawer from "@/components/CartDrawer";
import DishDetailSheet, { type SheetDish } from "@/components/DishDetailSheet";
import {
  addToCart as addToCartLib,
  getCart,
  getCartSubtotal,
  getCartItemCount,
} from "@/lib/cart";
import {
  ArrowLeft, MapPin, Star, Clock, ChefHat, Plus, Search,
  Share2, Check, ArrowRight, House, Package, User, X,
} from "lucide-react";

type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  description: string;
  city: string;
};

type Dish = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url?: string;
};

const CUISINE_EMOJI: Record<string, string> = {
  Indian: "🍛", Mexican: "🌮", Asian: "🍜", Italian: "🍝",
  Healthy: "🥗", Vegan: "🌿", Desserts: "🍰", Breakfast: "🍳",
  Mediterranean: "🥙", "South Indian": "🫕", American: "🍔",
  Filipino: "🍲", Chinese: "🥡", Thai: "🍜",
};

export default function RestaurantMenuPage() {
  const params       = useParams();
  const restaurantId = params.id as string;

  const [restaurant, setRestaurant]   = useState<Restaurant | null>(null);
  const [dishes, setDishes]           = useState<Dish[]>([]);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState("");

  // Cart
  const [cartTick, setCartTick]       = useState(0);
  const [mounted, setMounted]         = useState(false);
  const [cartBarDismissed, setDismissed] = useState(false);
  const prevCartCountRef              = useRef(0);
  const touchStartYRef                = useRef(0);

  const cartCount = useMemo(() => getCartItemCount(), [cartTick]);
  const cartTotal = useMemo(() => getCartSubtotal(),  [cartTick]);

  function bumpCart() { setCartTick((v) => v + 1); }

  // Dish sheet
  const [selectedDish, setSelectedDish] = useState<SheetDish | null>(null);

  // Share restaurant
  const [shared, setShared] = useState(false);

  useEffect(() => {
    setMounted(true);
    bumpCart();
    function onCartUpdated() { bumpCart(); }
    window.addEventListener("homebites:cart-updated", onCartUpdated);
    return () => window.removeEventListener("homebites:cart-updated", onCartUpdated);
  }, []);

  // Re-show cart bar when items added
  useEffect(() => {
    if (cartCount > prevCartCountRef.current) setDismissed(false);
    prevCartCountRef.current = cartCount;
  }, [cartCount]);

  useEffect(() => {
    async function loadData() {
      const [{ data: restaurantData }, { data: dishData }] = await Promise.all([
        supabase
          .from("home_restaurants")
          .select("id, name, cuisine, description, city")
          .eq("id", restaurantId)
          .single(),
        supabase
          .from("dishes")
          .select("id, name, description, price, image_url")
          .eq("home_restaurant_id", restaurantId)
          .order("id", { ascending: false }),
      ]);
      setRestaurant(restaurantData);
      setDishes(dishData || []);
      setLoading(false);
    }
    loadData();
  }, [restaurantId]);

  function getQty(dishId: string) {
    return getCart()?.items.find((i) => i.dish_id === dishId)?.quantity ?? 0;
  }

  function handleQuickAdd(dish: Dish) {
    if (!restaurant) return;
    const result = addToCartLib({
      restaurant_id:   restaurant.id,
      restaurant_name: restaurant.name,
      dish: { id: dish.id, name: dish.name, price: dish.price, image_url: dish.image_url },
      quantity: 1,
    });
    if (result.blocked) {
      alert("Your cart has items from another Home Restaurant. Please clear the cart first.");
      window.dispatchEvent(new Event("homebites:open-cart"));
    }
    window.dispatchEvent(new Event("homebites:cart-updated"));
    bumpCart();
  }

  function openDishSheet(dish: Dish) {
    if (!restaurant) return;
    setSelectedDish({
      id:                 dish.id,
      name:               dish.name,
      description:        dish.description,
      price:              dish.price,
      image_url:          dish.image_url,
      restaurant_id:      restaurant.id,
      restaurant_name:    restaurant.name,
      restaurant_cuisine: restaurant.cuisine,
    });
  }

  function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: restaurant?.name, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2200);
    }
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--hb-bg)", color: "var(--hb-fg-muted)" }}
      >
        Loading menu…
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--hb-bg)" }}>
        Restaurant not found
      </div>
    );
  }

  const filteredDishes = search.trim()
    ? dishes.filter(
        (d) =>
          d.name.toLowerCase().includes(search.toLowerCase()) ||
          (d.description ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : dishes;

  return (
    <div className="min-h-screen" style={{ background: "var(--hb-bg)" }}>
      <CustomerNav />

      {/* ── RESTAURANT HERO ──────────────────────────────────────────────── */}
      <section
        className="relative pt-14 lg:pt-16"
        style={{ background: "linear-gradient(135deg, #FFF1E3 0%, #FFE4CB 100%)" }}
      >
        <div className="max-w-[1100px] mx-auto px-4 lg:px-8 py-8 lg:py-12 relative">
          {/* Back + Share row */}
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => (window.location.href = "/dashboard/customer")}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3 py-1.5 rounded-full bg-white/80 backdrop-blur transition-colors"
              style={{ color: "var(--hb-fg)", border: "1px solid var(--hb-border-soft)" }}
            >
              <ArrowLeft size={14} /> Back to Home
            </button>

            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full bg-white/80 backdrop-blur transition-colors"
              style={{ color: "var(--hb-fg)", border: "1px solid var(--hb-border-soft)" }}
            >
              {shared
                ? <><Check size={13} style={{ color: "var(--hb-success-ink)" }} /> Copied!</>
                : <><Share2 size={13} /> Share</>
              }
            </button>
          </div>

          {/* Restaurant info */}
          <div className="flex items-start gap-4 lg:gap-7">
            <div
              className="w-16 h-16 lg:w-24 lg:h-24 rounded-2xl flex items-center justify-center text-4xl lg:text-5xl flex-shrink-0"
              style={{
                background: "#fff",
                boxShadow: "var(--hb-shadow-pop)",
                border: "1px solid var(--hb-border-soft)",
              }}
            >
              {CUISINE_EMOJI[restaurant.cuisine] ?? "🍽️"}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className="text-[10px] font-bold uppercase tracking-wider mb-1"
                style={{ color: "#C24B12" }}
              >
                Home Restaurant
              </div>
              <h1
                className="font-bold text-[24px] lg:text-[40px] leading-[1.05] tracking-[-0.025em] mb-2"
                style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
              >
                {restaurant.name}
              </h1>
              <div
                className="flex flex-wrap items-center gap-1.5 lg:gap-3 text-[12px] lg:text-[14px]"
                style={{ color: "var(--hb-fg-muted)" }}
              >
                <span className="flex items-center gap-1 font-semibold" style={{ color: "var(--hb-primary)" }}>
                  <ChefHat size={12} /> {restaurant.cuisine}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Star size={12} fill="#FFB400" stroke="#FFB400" />
                  <b style={{ color: "var(--hb-fg)" }}>4.9</b> (312)
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MapPin size={11} /> {restaurant.city}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock size={11} /> 25–35 min
                </span>
              </div>
              {restaurant.description && (
                <p
                  className="mt-2 lg:mt-3 text-[13px] lg:text-[15px] leading-[1.55] max-w-[680px]"
                  style={{ color: "var(--hb-fg-muted)" }}
                >
                  {restaurant.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── MENU GRID ─────────────────────────────────────────────────────── */}
      <section className="max-w-[1100px] mx-auto px-4 lg:px-8 py-6 lg:py-8 pb-28">
        {/* Menu header + search */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2
            className="font-bold text-[18px] lg:text-[28px] tracking-[-0.02em]"
            style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
          >
            Menu
            <span className="ml-2 text-[13px] font-normal" style={{ color: "var(--hb-fg-muted)" }}>
              ({filteredDishes.length})
            </span>
          </h2>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-full flex-1 max-w-[220px] lg:max-w-[280px]"
            style={{ background: "#fff", border: "1px solid var(--hb-border-soft)" }}
          >
            <Search size={13} style={{ color: "var(--hb-fg-muted)" }} />
            <input
              placeholder="Search menu"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-[13px]"
              style={{ color: "var(--hb-fg)" }}
            />
          </div>
        </div>

        {filteredDishes.length === 0 ? (
          <div
            className="rounded-2xl py-12 px-6 text-center"
            style={{ background: "#fff", border: "1px dashed var(--hb-border)", color: "var(--hb-fg-muted)" }}
          >
            {search ? "No dishes match your search." : "No dishes available yet."}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 lg:gap-3">
            {filteredDishes.map((dish) => {
              const qty = getQty(dish.id);
              return (
                <div
                  key={dish.id}
                  className="w-full bg-white rounded-2xl overflow-hidden transition-all hover:-translate-y-0.5 cursor-pointer"
                  style={{ border: "1px solid var(--hb-border-soft)", boxShadow: "var(--hb-shadow-soft)" }}
                  onClick={() => openDishSheet(dish)}
                >
                  {/* Image */}
                  <div className="relative h-[90px] lg:aspect-square lg:h-auto bg-[#F5F2ED] overflow-hidden">
                    {dish.image_url ? (
                      <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center text-3xl lg:text-5xl"
                        style={{ background: "linear-gradient(135deg, #FFF1E3 0%, #FFE4CB 100%)" }}
                      >
                        {CUISINE_EMOJI[restaurant.cuisine] ?? "🍽️"}
                      </div>
                    )}

                    {/* Qty badge */}
                    {qty > 0 && (
                      <div
                        className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white leading-none"
                        style={{ background: "var(--hb-primary)" }}
                      >
                        {qty}
                      </div>
                    )}

                    {/* Quick-add "+" */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleQuickAdd(dish); }}
                      className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-full bg-white flex items-center justify-center transition-colors"
                      style={{
                        border: "1px solid var(--hb-border-soft)",
                        boxShadow: "var(--hb-shadow-soft)",
                        color: "var(--hb-primary)",
                      }}
                      aria-label={`Add ${dish.name}`}
                    >
                      <Plus size={12} strokeWidth={2.5} />
                    </button>
                  </div>

                  {/* Body */}
                  <div className="p-1.5 lg:p-2.5">
                    <p
                      className="text-[11px] lg:text-[13px] font-semibold line-clamp-1 leading-tight"
                      style={{ color: "var(--hb-fg)" }}
                    >
                      {dish.name}
                    </p>
                    <p
                      className="text-[11px] font-bold mt-0.5"
                      style={{ color: "var(--hb-fg)", fontVariantNumeric: "tabular-nums" }}
                    >
                      ${Number(dish.price).toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Floating cart bar — mobile ────────────────────────────────────── */}
      {mounted && cartCount > 0 && !cartBarDismissed && (
        <div
          className="lg:hidden fixed bottom-16 left-4 right-4 z-40"
          onTouchStart={(e) => { touchStartYRef.current = e.touches[0].clientY; }}
          onTouchEnd={(e) => {
            if (e.changedTouches[0].clientY - touchStartYRef.current > 30) setDismissed(true);
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
              onClick={() => setDismissed(true)}
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
          { label: "Home",    Icon: House,   href: "/dashboard/customer" },
          { label: "Search",  Icon: Search,  href: "#"                   },
          { label: "Orders",  Icon: Package, href: "/dashboard/customer" },
          { label: "Account", Icon: User,    href: "/login"              },
        ].map(({ label, Icon, href }) => (
          <button
            key={label}
            onClick={() => { if (href !== "#") window.location.href = href; }}
            className="flex-1 flex flex-col items-center justify-center gap-0.5"
            style={{ color: "var(--hb-fg-subtle)" }}
          >
            <Icon size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-semibold">{label}</span>
          </button>
        ))}
      </nav>

      {/* ── Dish detail bottom sheet ──────────────────────────────────────── */}
      <DishDetailSheet
        dish={selectedDish}
        onClose={() => {
          setSelectedDish(null);
          bumpCart();
        }}
      />

      <CartDrawer />
    </div>
  );
}
