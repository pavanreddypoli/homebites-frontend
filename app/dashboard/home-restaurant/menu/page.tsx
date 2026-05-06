"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";
import ChefNav from "@/components/ChefNav";
import { Plus, Pencil, Archive, ArchiveRestore } from "lucide-react";

type Dish = {
  id: string;
  name: string;
  ingredients: string;
  description: string;
  price?: number;
  image_url?: string;
  home_restaurant_id?: string;
  is_archived: boolean;
  moderation_status?: string;
};

export default function MyMenuItems() {
  const router = useRouter();
  const [dishes, setDishes]             = useState<Dish[]>([]);
  const [loading, setLoading]           = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<string | null>(null);

  useEffect(() => {
    async function loadDishes() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data: restaurantRow } = await supabase
        .from("home_restaurants")
        .select("id")
        .eq("id", user.id)
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

  async function handleArchive(id: string) {
    const { error } = await supabase.from("dishes").update({ is_archived: true }).eq("id", id);
    if (error) { alert("Archive failed: " + error.message); return; }
    setDishes((prev) => prev.map((d) => d.id === id ? { ...d, is_archived: true } : d));
    setArchiveTarget(null);
  }

  async function handleUnarchive(id: string) {
    const { error } = await supabase.from("dishes").update({ is_archived: false }).eq("id", id);
    if (error) { alert("Unarchive failed: " + error.message); return; }
    setDishes((prev) => prev.map((d) => d.id === id ? { ...d, is_archived: false } : d));
  }

  const activeDishCount   = dishes.filter((d) => !d.is_archived).length;
  const archivedDishCount = dishes.filter((d) => d.is_archived).length;
  const visibleDishes     = showArchived ? dishes : dishes.filter((d) => !d.is_archived);

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

      {/* Archive confirm modal */}
      {archiveTarget && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.45)" }}>
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full"
            style={{ border: "1px solid var(--hb-border-soft)", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: "#FEF3C7" }}
              >
                <Archive size={17} style={{ color: "#D97706" }} />
              </div>
              <h2 className="text-[16px] font-bold" style={{ color: "var(--hb-fg)" }}>Archive this dish?</h2>
            </div>
            <p className="text-[13px] leading-relaxed mb-5" style={{ color: "var(--hb-fg-muted)" }}>
              It will no longer appear on your menu, but past orders will still reference it. You can unarchive it later.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setArchiveTarget(null)}
                className="flex-1 py-2.5 rounded-full text-[13px] font-semibold transition-colors"
                style={{ border: "1px solid var(--hb-border)", color: "var(--hb-fg)", background: "#F9F6F2" }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleArchive(archiveTarget)}
                className="flex-1 py-2.5 rounded-full text-[13px] font-semibold text-white transition-colors"
                style={{ background: "#D97706" }}
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="pt-14 max-w-[1000px] mx-auto px-4 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1
              className="text-[24px] lg:text-[30px] font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
            >
              My Menu
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--hb-fg-muted)" }}>
              {activeDishCount} active {activeDishCount === 1 ? "dish" : "dishes"}
              {archivedDishCount > 0 && ` · ${archivedDishCount} archived`}
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/home-restaurant/add-item")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full text-[13px] font-semibold text-white"
            style={{ background: "var(--hb-primary)" }}
          >
            <Plus size={15} />
            Add Dish
          </button>
        </div>

        {/* Show archived toggle — only shown when there are archived dishes */}
        {archivedDishCount > 0 && (
          <div className="flex items-center gap-2.5 mb-5">
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="relative flex-shrink-0 transition-colors duration-200 rounded-full"
              aria-label={showArchived ? "Hide archived dishes" : "Show archived dishes"}
              style={{ width: 36, height: 20, background: showArchived ? "var(--hb-primary)" : "#D1D5DB" }}
            >
              <span
                className="absolute top-[3px] w-[14px] h-[14px] bg-white rounded-full shadow transition-transform duration-200"
                style={{ transform: showArchived ? "translateX(19px)" : "translateX(3px)" }}
              />
            </button>
            <span className="text-[13px]" style={{ color: "var(--hb-fg-muted)" }}>
              Show archived dishes
            </span>
          </div>
        )}

        {visibleDishes.length === 0 && activeDishCount === 0 ? (
          <div
            className="rounded-2xl py-16 px-6 text-center"
            style={{ background: "#fff", border: "1px dashed var(--hb-border)" }}
          >
            <p className="text-[15px] font-medium mb-4" style={{ color: "var(--hb-fg-muted)" }}>
              You have no menu items yet.
            </p>
            <button
              onClick={() => router.push("/dashboard/home-restaurant/add-item")}
              className="px-5 py-2.5 rounded-full text-[13px] font-semibold text-white"
              style={{ background: "var(--hb-primary)" }}
            >
              Add Your First Dish
            </button>
          </div>
        ) : visibleDishes.length === 0 ? (
          <div
            className="rounded-2xl py-12 px-6 text-center"
            style={{ background: "#fff", border: "1px dashed var(--hb-border)" }}
          >
            <p className="text-[14px]" style={{ color: "var(--hb-fg-muted)" }}>
              No active dishes. Toggle "Show archived dishes" to see archived ones.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 lg:gap-4">
            {visibleDishes.map((dish) => (
              <div
                key={dish.id}
                className="bg-white rounded-2xl overflow-hidden transition-opacity"
                style={{
                  border: "1px solid var(--hb-border-soft)",
                  boxShadow: "var(--hb-shadow-soft)",
                  opacity: dish.is_archived ? 0.6 : 1,
                }}
              >
                <div className="relative">
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
                  {dish.is_archived && (
                    <span
                      className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold text-white leading-none"
                      style={{ background: "#6B7280" }}
                    >
                      Archived
                    </span>
                  )}
                  {!dish.is_archived && dish.moderation_status === "pending_review" && (
                    <span
                      className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold leading-none"
                      style={{ background: "#FEF3C7", color: "#92400E", border: "1px solid #FCD34D" }}
                    >
                      Under review
                    </span>
                  )}
                  {!dish.is_archived && dish.moderation_status === "rejected" && (
                    <span
                      className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold leading-none"
                      style={{ background: "#FEF2F2", color: "#991B1B", border: "1px solid #FCA5A5" }}
                    >
                      Rejected
                    </span>
                  )}
                </div>

                <div className="p-3">
                  <p className="text-[13px] font-bold truncate" style={{ color: "var(--hb-fg)" }}>
                    {dish.name}
                  </p>
                  {dish.description && (
                    <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: "var(--hb-fg-muted)" }}>
                      {dish.description}
                    </p>
                  )}
                  {dish.price != null && (
                    <p className="text-[13px] font-bold mt-1.5" style={{ color: "var(--hb-fg)" }}>
                      ${(dish.price ?? 0).toFixed(2)}
                    </p>
                  )}

                  <div className="flex gap-1.5 mt-2.5">
                    {dish.is_archived ? (
                      <button
                        onClick={() => handleUnarchive(dish.id)}
                        className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                        style={{ color: "#16A34A", border: "1px solid #86EFAC", background: "#F0FDF4" }}
                      >
                        <ArchiveRestore size={10} /> Unarchive
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => router.push(`/dashboard/home-restaurant/edit-item/${dish.id}`)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                          style={{ color: "var(--hb-primary)", border: "1px solid var(--hb-primary)", background: "transparent" }}
                        >
                          <Pencil size={10} /> Edit
                        </button>
                        <button
                          onClick={() => setArchiveTarget(dish.id)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                          style={{ color: "#D97706", border: "1px solid #FCD34D", background: "#FFFBEB" }}
                        >
                          <Archive size={10} /> Archive
                        </button>
                      </>
                    )}
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
