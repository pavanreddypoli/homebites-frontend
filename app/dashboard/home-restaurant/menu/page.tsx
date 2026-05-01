"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import ChefNav from "@/components/ChefNav";
import { Plus, Pencil, Trash2 } from "lucide-react";

type Dish = {
  id: string;
  name: string;
  ingredients: string;
  description: string;
  price?: number;
  image_url?: string;
  home_restaurant_id?: string;
};

export default function MyMenuItems() {
  const router = useRouter();
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDishes() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: restaurantRow } = await supabase
        .from("home_restaurants")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!restaurantRow) { setLoading(false); return; }

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

  async function handleDelete(id: string) {
    if (!confirm("Delete this dish?")) return;
    const { error } = await supabase.from("dishes").delete().eq("id", id);
    if (error) { alert("Delete failed: " + error.message); return; }
    setDishes((prev) => prev.filter((d) => d.id !== id));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--hb-bg)" }}>
        <p className="text-[15px] animate-pulse" style={{ color: "var(--hb-fg-muted)" }}>
          Loading your menu…
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--hb-bg)" }}>
      <ChefNav />

      <main className="pt-14 max-w-[1000px] mx-auto px-4 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-[24px] lg:text-[30px] font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
            >
              My Menu
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--hb-fg-muted)" }}>
              {dishes.length} {dishes.length === 1 ? "dish" : "dishes"}
            </p>
          </div>
          <button
            onClick={() => (router.push("/dashboard/home-restaurant/add-item"))}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-semibold text-white"
            style={{ background: "var(--hb-primary)" }}
          >
            <Plus size={15} />
            Add Dish
          </button>
        </div>

        {dishes.length === 0 ? (
          <div
            className="rounded-2xl py-16 px-6 text-center"
            style={{ background: "#fff", border: "1px dashed var(--hb-border)" }}
          >
            <p className="text-[15px] font-medium mb-4" style={{ color: "var(--hb-fg-muted)" }}>
              You have no menu items yet.
            </p>
            <button
              onClick={() => (router.push("/dashboard/home-restaurant/add-item"))}
              className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-white"
              style={{ background: "var(--hb-primary)" }}
            >
              Add Your First Dish
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 lg:gap-4">
            {dishes.map((dish) => (
              <div
                key={dish.id}
                className="bg-white rounded-2xl overflow-hidden"
                style={{ border: "1px solid var(--hb-border-soft)", boxShadow: "var(--hb-shadow-soft)" }}
              >
                {dish.image_url ? (
                  <Image
                    src={dish.image_url}
                    alt={dish.name}
                    width={200}
                    height={140}
                    className="w-full h-[120px] object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-[120px] flex items-center justify-center text-3xl"
                    style={{ background: "linear-gradient(135deg, #FFF1E3 0%, #FFE4CB 100%)" }}
                  >
                    🍽️
                  </div>
                )}

                <div className="p-3">
                  <p className="text-[13px] font-bold truncate" style={{ color: "var(--hb-fg)" }}>
                    {dish.name}
                  </p>
                  {dish.description && (
                    <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: "var(--hb-fg-muted)" }}>
                      {dish.description}
                    </p>
                  )}
                  {dish.price !== undefined && (
                    <p className="text-[13px] font-bold mt-1.5" style={{ color: "var(--hb-fg)" }}>
                      ${dish.price.toFixed(2)}
                    </p>
                  )}

                  <div className="flex gap-1.5 mt-2.5">
                    <button
                      onClick={() => (router.push(`/dashboard/home-restaurant/edit-item/${dish.id}`))}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                      style={{ color: "var(--hb-primary)", border: "1px solid var(--hb-primary)", background: "transparent" }}
                    >
                      <Pencil size={10} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(dish.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                      style={{ color: "#DC2626", border: "1px solid #FCA5A5", background: "#FEF2F2" }}
                    >
                      <Trash2 size={10} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
