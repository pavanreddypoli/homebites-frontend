"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/lib/cart"; // ✅ already present

type Restaurant = {
  id: string;
  name: string;
  cuisine: string;
  description: string;
  city: string;
};

type Dish = {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url?: string;
};

export default function RestaurantMenuPage() {
  const params = useParams();
  const restaurantId = params.id as string;

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      // 1️⃣ Fetch restaurant
      const { data: restaurantData } = await supabase
        .from("home_restaurants")
        .select("id, name, cuisine, description, city")
        .eq("id", restaurantId)
        .single();

      // 2️⃣ Fetch dishes for THIS restaurant only
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

    // ✅ FIX: use object-based cart API (matches lib/cart.ts)
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

    // 🚫 Multi-restaurant protection (correct API)
    if (result.blocked) {
      alert(
        "Your cart already has items from another home restaurant. Please clear the cart first."
      );
      window.dispatchEvent(new Event("homebites:open-cart"));
      window.dispatchEvent(new Event("homebites:cart-updated"));
      return;
    }

    // 🔔 Notify cart drawer
    window.dispatchEvent(new Event("homebites:open-cart"));
    window.dispatchEvent(new Event("homebites:cart-updated"));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-900 text-white">
        Loading menu…
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Restaurant not found
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-indigo-900 text-white">
      {/* Header */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button
          onClick={() => window.history.back()}
          className="text-sm text-indigo-100 hover:underline mb-4"
        >
          ← Back
        </button>

        <h1 className="text-3xl font-bold">{restaurant.name}</h1>
        <p className="text-indigo-200 text-sm mt-1">
          {restaurant.cuisine} • {restaurant.city}
        </p>
        <p className="text-indigo-100 mt-3 max-w-2xl">
          {restaurant.description}
        </p>
      </div>

      {/* Menu */}
      <div className="bg-white rounded-t-3xl text-slate-900">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h2 className="text-xl font-semibold mb-6">Menu</h2>

          {dishes.length === 0 ? (
            <p className="text-slate-500">No dishes available yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dishes.map((dish) => (
                <div
                  key={dish.id}
                  className="border rounded-xl p-4 bg-white shadow-sm"
                >
                  {dish.image_url && (
                    <img
                      src={dish.image_url}
                      alt={dish.name}
                      className="w-full h-36 object-cover rounded-lg mb-3"
                    />
                  )}

                  <h3 className="font-semibold">{dish.name}</h3>
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {dish.description}
                  </p>

                  <div className="flex items-center justify-between mt-3">
                    <p className="font-bold text-green-600">
                      ₹ {dish.price}
                    </p>

                    {/* ✅ ADD TO CART */}
                    <Button
                      type="button"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log("Add to cart clicked", dish.name);
                        handleAddToCart(dish);
                      }}
                    >
                      Add to Cart
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
