"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import CustomerNav from "@/components/CustomerNav";
import CartDrawer from "@/components/CartDrawer";
import { addToCart } from "@/lib/cart";
import {
  ArrowLeft, MapPin, Star, Clock, ChefHat, Plus, Search,
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
  Mediterranean: "🥙", "South Indian": "🫕", "Vegan · Healthy": "🌿",
};

export default function RestaurantMenuPage() {
  const params = useParams();
  const restaurantId = params.id as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadData() {
      const { data: restaurantData } = await supabase
        .from("home_restaurants")
        .select("id, name, cuisine, description, city")
        .eq("id", restaurantId)
        .single();

      const { data: dishData } = await supabase
        .from("dishes")
        .select("id, name, description, price, image_url")
        .eq("home_restaurant_id", restaurantId)
        .order("id", { ascending: false });

      setRestaurant(restaurantData);
      setDishes(dishData || []);
      setLoading(false);
    }

    loadData();
  }, [restaurantId]);

  function handleAddToCart(dish: Dish) {
    if (!restaurant) return;

    const result = addToCart({
      restaurant_id: restaurant.id,
      restaurant_name: restaurant.name,
      dish: {
        id: dish.id,
        name: dish.name,
        price: dish.price,
        image_url: dish.image_url,
      },
      quantity: 1,
    });

    if (result.blocked) {
      alert(
        "Your cart already has items from another home restaurant. Please clear the cart first."
      );
      window.dispatchEvent(new Event("homebites:open-cart"));
      window.dispatchEvent(new Event("homebites:cart-updated"));
      return;
    }

    window.dispatchEvent(new Event("homebites:open-cart"));
    window.dispatchEvent(new Event("homebites:cart-updated"));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--hb-bg)", color: "var(--hb-fg-muted)" }}>
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

      {/* HERO COVER */}
      <section
        className="relative pt-14 lg:pt-16"
        style={{
          background: "linear-gradient(135deg, #FFF1E3 0%, #FFE4CB 100%)",
        }}
      >
        <div className="max-w-[1100px] mx-auto px-4 lg:px-8 py-10 lg:py-14 relative">
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-5 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur transition-colors"
            style={{ color: "var(--hb-fg)", border: "1px solid var(--hb-border-soft)" }}
          >
            <ArrowLeft size={14} /> Back
          </button>

          <div className="flex items-start gap-5 lg:gap-7">
            <div
              className="w-20 h-20 lg:w-28 lg:h-28 rounded-2xl flex items-center justify-center text-5xl lg:text-6xl flex-shrink-0"
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
                className="text-[11px] font-bold uppercase tracking-wider mb-1.5"
                style={{ color: "#C24B12" }}
              >
                Home restaurant
              </div>
              <h1
                className="font-bold text-[28px] lg:text-[44px] leading-[1.05] tracking-[-0.025em] mb-2"
                style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
              >
                {restaurant.name}
              </h1>
              <div
                className="flex flex-wrap items-center gap-2 lg:gap-3 text-[13px] lg:text-[14px]"
                style={{ color: "var(--hb-fg-muted)" }}
              >
                <span className="flex items-center gap-1.5 font-semibold" style={{ color: "var(--hb-primary)" }}>
                  <ChefHat size={13} /> {restaurant.cuisine}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Star size={13} fill="#FFB400" stroke="#FFB400" />
                  <b style={{ color: "var(--hb-fg)" }}>4.9</b> (312)
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <MapPin size={12} /> {restaurant.city}
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} /> 25–35 min
                </span>
              </div>
              <p
                className="mt-3 lg:mt-4 text-[14px] lg:text-[16px] leading-[1.55] max-w-[680px]"
                style={{ color: "var(--hb-fg-muted)" }}
              >
                {restaurant.description}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MENU */}
      <section className="max-w-[1100px] mx-auto px-4 lg:px-8 py-8 lg:py-10">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-5">
          <h2
            className="font-bold text-[24px] lg:text-[32px] tracking-[-0.025em]"
            style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
          >
            Menu
          </h2>
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-full max-w-[320px] w-full"
            style={{ background: "#fff", border: "1px solid var(--hb-border-soft)" }}
          >
            <Search size={14} style={{ color: "var(--hb-fg-muted)" }} />
            <input
              placeholder="Search this menu"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent outline-none text-[14px]"
              style={{ color: "var(--hb-fg)" }}
            />
          </div>
        </div>

        {filteredDishes.length === 0 ? (
          <div
            className="rounded-2xl py-12 px-6 text-center"
            style={{
              background: "#fff",
              border: "1px dashed var(--hb-border)",
              color: "var(--hb-fg-muted)",
            }}
          >
            {search ? "No dishes match your search." : "No dishes available yet."}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
            {filteredDishes.map((dish) => (
              <article
                key={dish.id}
                className="bg-white rounded-2xl overflow-hidden flex flex-col transition-all hover:-translate-y-0.5"
                style={{
                  border: "1px solid var(--hb-border-soft)",
                  boxShadow: "var(--hb-shadow-soft)",
                }}
              >
                <div
                  className="aspect-[16/10] bg-cover bg-center flex-shrink-0"
                  style={{
                    backgroundImage: dish.image_url
                      ? `url(${dish.image_url})`
                      : "linear-gradient(135deg, #FFF1E3 0%, #FFE4CB 100%)",
                  }}
                >
                  {!dish.image_url && (
                    <div className="w-full h-full flex items-center justify-center text-5xl">
                      {CUISINE_EMOJI[restaurant.cuisine] ?? "🍽️"}
                    </div>
                  )}
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3
                    className="text-[16px] font-bold leading-snug"
                    style={{ color: "var(--hb-fg)" }}
                  >
                    {dish.name}
                  </h3>
                  {dish.description && (
                    <p
                      className="text-[13px] leading-[1.5] mt-1.5 line-clamp-2"
                      style={{ color: "var(--hb-fg-muted)" }}
                    >
                      {dish.description}
                    </p>
                  )}
                  <div className="mt-auto pt-3 flex items-center justify-between">
                    <p
                      className="text-[16px] font-bold"
                      style={{ color: "var(--hb-fg)", fontVariantNumeric: "tabular-nums" }}
                    >
                      ${Number(dish.price).toFixed(2)}
                    </p>
                    <button
                      onClick={() => handleAddToCart(dish)}
                      className="flex items-center gap-1 px-3.5 py-2 rounded-full text-[13px] font-bold text-white transition-colors"
                      style={{
                        background: "var(--hb-primary)",
                        boxShadow: "0 4px 14px -4px rgba(255,122,57,.45)",
                      }}
                    >
                      <Plus size={14} strokeWidth={2.8} />
                      Add
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <CartDrawer />
    </div>
  );
}
