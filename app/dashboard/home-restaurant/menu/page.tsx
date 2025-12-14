"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import NavBar from "../NavBar";

type Dish = {
  id: number;
  name: string;
  ingredients: string;
  description: string;
  price?: number;
  image_url?: string;
  home_restaurant_id?: string;
};

export default function MyMenuItems() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);

  // Load dishes for logged-in restaurant (CORRECT + ISOLATED)
  useEffect(() => {
    async function loadDishes() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      // ✅ Get THIS user's restaurant
      const { data: restaurantRow } = await supabase
        .from("home_restaurants")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!restaurantRow) {
        setDishes([]);
        setLoading(false);
        return;
      }

      // ✅ Load ONLY dishes for this restaurant
      const { data, error } = await supabase
        .from("dishes")
        .select("*")
        .eq("home_restaurant_id", restaurantRow.id)
        .order("id", { ascending: false });

      if (!error && data) setDishes(data);
      setLoading(false);
    }

    loadDishes();
  }, []);

  // DELETE
  async function handleDeleteDish(id: number) {
    if (!confirm("Delete this dish?")) return;

    const { error } = await supabase.from("dishes").delete().eq("id", id);

    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }

    setDishes((prev) => prev.filter((d) => d.id !== id));
  }

  // EDIT
  function handleEditDish(id: number) {
    window.location.href = `/dashboard/home-restaurant/edit-item/${id}`;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-indigo-900 flex items-center justify-center text-white">
        <p className="text-lg animate-pulse">Loading your menu...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-indigo-900 p-3 sm:p-4">
      {/* FIXED NAVBAR */}
      <div className="fixed top-0 left-0 w-full z-50">
        <NavBar />
      </div>

      {/* Spacer so content does not hide under NavBar */}
      <div className="h-20 sm:h-24" />

      <h1 className="text-xl sm:text-2xl font-bold text-white mb-4 text-center">
        🍽️ My Menu Items
      </h1>

      {dishes.length === 0 ? (
        <div className="bg-white p-6 rounded-xl shadow-xl text-center max-w-md mx-auto">
          <p className="text-slate-700">You have no menu items yet.</p>

          <Button
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
            onClick={() =>
              (window.location.href = "/dashboard/home-restaurant/add-item")
            }
          >
            Add Your First Dish
          </Button>
        </div>
      ) : (
        // SUPER COMPACT GRID — 20–30 items per view
        <div
          className="
            grid
            grid-cols-2
            sm:grid-cols-3
            md:grid-cols-4
            lg:grid-cols-5
            xl:grid-cols-6
            2xl:grid-cols-8
            gap-3 sm:gap-4
          "
        >
          {dishes.map((dish) => (
            <div
              key={dish.id}
              className="
                bg-white 
                rounded-lg 
                shadow 
                hover:shadow-lg 
                transition-all 
                overflow-hidden
                border border-gray-200
              "
            >
              {/* IMAGE */}
              {dish.image_url ? (
                <Image
                  src={dish.image_url}
                  alt={dish.name}
                  width={200}
                  height={140}
                  className="w-full h-20 sm:h-24 md:h-28 object-cover"
                />
              ) : (
                <div className="w-full h-20 sm:h-24 md:h-28 bg-gray-200 flex items-center justify-center text-gray-500 text-xs">
                  No Image
                </div>
              )}

              <div className="p-2">
                <h2 className="text-xs sm:text-sm font-semibold text-indigo-700 truncate">
                  {dish.name}
                </h2>

                <p className="text-[10px] text-gray-600 truncate">
                  {dish.description}
                </p>

                <p className="text-[9px] text-gray-500 truncate">
                  {dish.ingredients}
                </p>

                {dish.price !== undefined && (
                  <p className="mt-1 text-xs sm:text-sm font-bold text-green-600">
                    ₹ {dish.price}
                  </p>
                )}

                <div className="flex justify-between mt-2">
                  <Button
                    variant="outline"
                    className="
                      h-6 px-2 text-[9px] sm:text-[10px]
                      border-indigo-600 
                      text-indigo-600 
                      hover:bg-indigo-50
                    "
                    onClick={() => handleEditDish(dish.id)}
                  >
                    Edit
                  </Button>

                  <Button
                    variant="destructive"
                    className="h-6 px-2 text-[9px] sm:text-[10px]"
                    onClick={() => handleDeleteDish(dish.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
