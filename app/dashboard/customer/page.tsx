"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import CartDrawer from "@/components/CartDrawer";
import { addToCart as addToCartLib, getCart, updateItemQuantity } from "@/lib/cart";

/* ---------------- TYPES ---------------- */

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
  id: number;
  name: string;
  description: string;
  price: number;
  home_restaurant_id: string;
  image_url?: string;
  restaurant_name?: string;
  distance_km?: number;
};

/* ---------------- CONSTANTS ---------------- */

const CATEGORIES = [
  "All",
  "Indian",
  "South Indian",
  "North Indian",
  "Mexican",
  "Asian",
  "Healthy",
  "Vegan",
  "Desserts",
];

/* ---------------- HELPERS ---------------- */

function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
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

function SkeletonRestaurant() {
  return (
    <div className="border rounded-xl p-4 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-2/3 mb-2" />
      <div className="h-3 bg-slate-200 rounded w-1/3 mb-2" />
      <div className="h-3 bg-slate-200 rounded w-full" />
    </div>
  );
}

function SkeletonDish() {
  return (
    <div className="border rounded-lg p-2 animate-pulse">
      <div className="w-full h-24 bg-slate-200 rounded-md mb-2" />
      <div className="h-3 bg-slate-200 rounded w-3/4 mb-2" />
      <div className="h-3 bg-slate-200 rounded w-1/2 mb-2" />
      <div className="h-8 bg-slate-200 rounded w-full mt-3" />
    </div>
  );
}

/* ---------------- COMPONENT ---------------- */

export default function CustomerDashboard() {
  // 📍 Location
  const [city, setCity] = useState<string | null>(null);
  const [address, setAddress] = useState("");
  const [addressResults, setAddressResults] = useState<any[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );

  // 🎚️ Distance slider
  const [distanceMiles, setDistanceMiles] = useState(5);
  const distanceKm = distanceMiles * 1.609;

  // 🤖 AI Search
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // 🏪 Data
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(false);

  // 🎨 Category chips
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  // 🛒 re-render when cart changes (for inline +/-)
  const [cartTick, setCartTick] = useState(0);
  const cart = useMemo(() => getCart(), [cartTick]);

  function bumpCart() {
    setCartTick((v) => v + 1);
  }

  useEffect(() => {
    function onCartUpdated() {
      bumpCart();
    }
    window.addEventListener("homebites:cart-updated", onCartUpdated);
    return () => window.removeEventListener("homebites:cart-updated", onCartUpdated);
  }, []);

  /* ---------------- RESTORE CONTEXT ---------------- */

  useEffect(() => {
    const saved = localStorage.getItem("homebites_customer_context");
    if (saved) {
      const parsed = JSON.parse(saved);
      setAddress(parsed.address || "");
      setCity(parsed.city || null);
      setDistanceMiles(parsed.distanceMiles || 5);
      if (parsed.location) setLocation(parsed.location);
    }
  }, []);

  /* ---------------- SAVE CONTEXT ---------------- */

  useEffect(() => {
    if (!location) return;
    localStorage.setItem(
      "homebites_customer_context",
      JSON.stringify({ address, city, location, distanceMiles })
    );
  }, [address, city, location, distanceMiles]);

  /* ---------------- LOAD DATA ---------------- */

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const { data: restaurantData } = await supabase
        .from("home_restaurants")
        .select(
          "id, name, cuisine, description, city, lat, lng, delivery_radius_km"
        )
        .eq("is_active", true);

      const { data: dishData } = await supabase
        .from("dishes")
        .select("id, name, description, price, home_restaurant_id, image_url");

      let enrichedRestaurants: Restaurant[] = restaurantData || [];

      if (location) {
        enrichedRestaurants = enrichedRestaurants
          .map((r) => {
            if (!r.lat || !r.lng) return r;
            return {
              ...r,
              distance_km: calculateDistance(
                location.lat,
                location.lng,
                r.lat,
                r.lng
              ),
            };
          })
          .filter((r) => {
            if (!r.distance_km) return true;
            if (r.delivery_radius_km && r.distance_km > r.delivery_radius_km)
              return false;
            return r.distance_km <= distanceKm;
          });
      }

      const restaurantMap = new Map(enrichedRestaurants.map((r) => [r.id, r]));

      const enrichedDishes: Dish[] =
        dishData
          ?.map((d) => {
            const r = restaurantMap.get(d.home_restaurant_id);
            if (!r || !r.distance_km) return null;
            return {
              ...d,
              restaurant_name: r.name,
              distance_km: r.distance_km,
            } as Dish;
          })
          .filter((d): d is Dish => d !== null)) ?? [];

      setRestaurants(enrichedRestaurants);
      setDishes(enrichedDishes);
      setLoading(false);
    }

    loadData();
  }, [location, distanceKm]);

  /* ---------------- ADDRESS SEARCH ---------------- */

  async function searchAddress(query: string) {
    if (query.length < 3) return setAddressResults([]);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}`
    );
    const data = await res.json();
    setAddressResults(data.slice(0, 5));
  }

  /* ---------------- CART HELPERS (ADDED, DOES NOT REMOVE YOUR CODE) ---------------- */

  function getQty(dishId: number) {
    if (!cart?.items?.length) return 0;
    const item = cart.items.find((i) => i.dish_id === dishId);
    return item?.quantity || 0;
  }

  function setInlineQty(dishId: number, qty: number) {
    updateItemQuantity(dishId, qty);
    window.dispatchEvent(new Event("homebites:cart-updated"));
    bumpCart();
  }

  /* ---------------- CART ADD (ENHANCED) ---------------- */

  function addToCart(dish: Dish) {
    // ✅ Uses robust lib/cart (backward compatible with your old localStorage array)
    const restaurantName = dish.restaurant_name || "Home Restaurant";

    const result = addToCartLib({
      restaurant_id: dish.home_restaurant_id,
      restaurant_name: restaurantName,
      dish: {
        id: dish.id,
        name: dish.name,
        price: dish.price,
        image_url: dish.image_url,
      },
      quantity: 1,
    });

    // 🚫 Disable add from multiple restaurants
    if (result.blocked) {
      const existingName = result.cart?.restaurant_name || "another restaurant";
      alert(
        `Your cart already has items from ${existingName}. Please clear the cart to add from a different restaurant.`
      );
      // show cart so user has visibility
      window.dispatchEvent(new Event("homebites:open-cart"));
      window.dispatchEvent(new Event("homebites:cart-updated"));
      bumpCart();
      return;
    }

    // ✅ After clicking Add, open cart for visibility
    window.dispatchEvent(new Event("homebites:open-cart"));
    window.dispatchEvent(new Event("homebites:cart-updated"));
    bumpCart();
  }

  async function handleAskAI() {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiLoading(false);
  }

  /* ---------------- FILTERED DISHES (ADDED) ---------------- */

  const filteredDishes = useMemo(() => {
    if (selectedCategory === "All") return dishes;
    return dishes.filter((d) => (d.restaurant_name || "").toLowerCase().includes(selectedCategory.toLowerCase()) ||
      (d.description || "").toLowerCase().includes(selectedCategory.toLowerCase())
    );
  }, [dishes, selectedCategory]);

  /* ---------------- UI ---------------- */

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-indigo-900 text-white">
      {/* NAVBAR */}
      <header className="sticky top-0 z-50 bg-indigo-700/90 border-b border-indigo-500">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between">
          <div className="font-bold text-lg">HomeBites</div>
          <div className="flex gap-3">
            <button onClick={() => (window.location.href = "/login")}>
              Login
            </button>
            <Button
              size="sm"
              className="bg-white text-indigo-700"
              onClick={() => (window.location.href = "/signup")}
            >
              Become a Home Restaurant
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <div className="max-w-6xl mx-auto px-4 pt-6 pb-6">
        <div className="bg-white/95 rounded-xl p-4 text-slate-900 mb-4">
          <label className="text-sm font-medium">Delivery Address</label>
          <input
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              searchAddress(e.target.value);
            }}
            className="mt-1 w-full border rounded px-3 py-2 text-sm"
          />

          {addressResults.map((item) => (
            <div
              key={item.place_id}
              className="text-sm cursor-pointer"
              onClick={() => {
                setAddress(item.display_name);
                setLocation({
                  lat: parseFloat(item.lat),
                  lng: parseFloat(item.lon),
                });
                setCity(item.display_name);
                setAddressResults([]);
              }}
            >
              {item.display_name}
            </div>
          ))}

          {location && (
            <div className="mt-4">
              <label className="text-xs font-medium">
                Search within {distanceMiles} miles
              </label>
              <input
                type="range"
                min={1}
                max={75}
                value={distanceMiles}
                onChange={(e) => setDistanceMiles(Number(e.target.value))}
                className="w-full"
              />
            </div>
          )}
        </div>

        <h1 className="text-2xl md:text-4xl font-bold mb-2">
          🍽️ What are you craving today?
        </h1>

        <div className="bg-white/95 rounded-xl p-4 flex gap-3">
          <Input
            placeholder='e.g. "spicy dosa"'
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
          />
          <Button onClick={handleAskAI}>
            {aiLoading ? "Thinking…" : "Ask AI"}
          </Button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="bg-white rounded-t-3xl text-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-10">
          {/* RESTAURANTS */}
          <section>
            <h2 className="text-lg font-semibold mb-4">
              Featured Home Restaurants
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonRestaurant key={i} />
                  ))
                : restaurants.map((r) => (
                    <div
                      key={r.id}
                      onClick={() =>
                        (window.location.href =
                          `/dashboard/customer/restaurant/${r.id}`)
                      }
                      className="border rounded-xl p-4 cursor-pointer"
                    >
                      <h3 className="font-semibold">{r.name}</h3>
                      <p className="text-xs">{r.cuisine}</p>
                      <p className="text-sm">{r.description}</p>
                    </div>
                  ))}
            </div>
          </section>

          {/* DISHES (UPDATED) */}
          <section>
            <h2 className="text-lg font-semibold mb-4">
              Featured Dishes Near You
            </h2>

            {/* 🎨 Category chips (ADDED) */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-sm border whitespace-nowrap ${
                    selectedCategory === cat
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-900"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {loading
                ? Array.from({ length: 8 }).map((_, i) => <SkeletonDish key={i} />)
                : filteredDishes.map((d) => {
                    const qty = getQty(d.id);

                    return (
                      <div key={d.id} className="border rounded-lg p-2">
                        <img
                          src={d.image_url || "/placeholder-dish.png"}
                          className="w-full h-24 object-cover rounded-md mb-1"
                        />

                        <div className="text-sm font-medium truncate">
                          {d.name}
                        </div>

                        <button
                          onClick={() =>
                            (window.location.href =
                              `/dashboard/customer/restaurant/${d.home_restaurant_id}`)
                          }
                          className="text-xs text-indigo-600 hover:underline"
                        >
                          {d.restaurant_name}
                        </button>

                        <div className="flex justify-between items-center mt-1">
                          <span className="font-semibold text-sm">
                            ${d.price}
                          </span>

                          {/* ➕ Quantity + / − inline (ADDED) */}
                          {qty > 0 ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setInlineQty(d.id, qty - 1)}
                                className="px-2 border rounded text-sm"
                              >
                                −
                              </button>
                              <span className="text-sm font-semibold">{qty}</span>
                              <button
                                onClick={() => addToCart(d)}
                                className="px-2 border rounded text-sm"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(d)}
                              className="text-xs bg-indigo-600 text-white px-2 py-1 rounded"
                            >
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
            </div>
          </section>
        </div>
      </div>

      {/* ✅ Cart must be mounted on customer page for visibility */}
      <CartDrawer />
    </div>
  );
}
