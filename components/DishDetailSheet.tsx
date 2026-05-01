"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { X, Star, Share2, Check, Plus, Minus } from "lucide-react";
import {
  addToCart as addToCartLib,
  getCart,
  updateItemQuantity,
} from "@/lib/cart";

export type SheetDish = {
  id: string;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  restaurant_id: string;
  restaurant_name?: string;
  restaurant_cuisine?: string;
};

interface Props {
  dish: SheetDish | null;
  onClose: () => void;
}

const CUISINE_EMOJI: Record<string, string> = {
  Indian: "🍛", Mexican: "🌮", Asian: "🍜", Italian: "🍝",
  Healthy: "🥗", Vegan: "🌿", Desserts: "🍰", Breakfast: "🍳",
  Mediterranean: "🥙", "South Indian": "🫕", American: "🍔",
  Filipino: "🍲", Chinese: "🥡", Thai: "🍜",
};

const NUTRITION = [
  { label: "Calories", value: "~320", unit: "kcal" },
  { label: "Protein",  value: "~18",  unit: "g"    },
  { label: "Carbs",    value: "~42",  unit: "g"    },
  { label: "Fat",      value: "~12",  unit: "g"    },
  { label: "Fiber",    value: "~4",   unit: "g"    },
  { label: "Sodium",   value: "~480", unit: "mg"   },
];

function getDietaryTags(description: string, ingredients: string) {
  const t = `${description} ${ingredients}`.toLowerCase();
  const tags: { label: string; emoji: string; bg: string }[] = [];
  if (t.includes("vegan") || t.includes("plant-based"))
    tags.push({ label: "Vegan", emoji: "🌿", bg: "#D1FAE5" });
  if (t.includes("vegetarian") || t.includes("veggie"))
    tags.push({ label: "Vegetarian", emoji: "🥦", bg: "#DCFCE7" });
  if (t.includes("gluten-free") || t.includes("gluten free"))
    tags.push({ label: "Gluten-Free", emoji: "🌾", bg: "#FEF3C7" });
  if (t.match(/spicy|chili|jalape|cayenne|hot sauce|sriracha/))
    tags.push({ label: "Spicy", emoji: "🌶️", bg: "#FEE2E2" });
  if (t.match(/\bnut\b|almond|peanut|cashew|walnut/))
    tags.push({ label: "Contains Nuts", emoji: "🥜", bg: "#FEF3C7" });
  return tags;
}

export default function DishDetailSheet({ dish, onClose }: Props) {
  const [open, setOpen]                     = useState(false);
  const [mounted, setMounted]               = useState(false);
  const [ingredients, setIngredients]       = useState("");
  const [loadingIng, setLoadingIng]         = useState(false);
  const [qty, setQty]                       = useState(1);
  const [shared, setShared]                 = useState(false);
  const [cartTick, setCartTick]             = useState(0);

  useEffect(() => {
    function onCartUpdated() { setCartTick((v) => v + 1); }
    window.addEventListener("homebites:cart-updated", onCartUpdated);
    return () => window.removeEventListener("homebites:cart-updated", onCartUpdated);
  }, []);

  const cartQty = dish
    ? (getCart()?.items.find((i) => i.dish_id === dish.id)?.quantity ?? 0)
    : 0;

  // Mount + animate in
  useEffect(() => {
    if (dish) {
      setMounted(true);
      const cq = getCart()?.items.find((i) => i.dish_id === dish.id)?.quantity ?? 0;
      setQty(Math.max(1, cq));
      // Double-rAF so the initial translate-y-full is painted before we remove it
      requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
      // Fetch ingredients lazily
      setIngredients("");
      setLoadingIng(true);
      supabase
        .from("dishes")
        .select("ingredients")
        .eq("id", dish.id)
        .single()
        .then(({ data }) => {
          setIngredients(data?.ingredients ?? "");
          setLoadingIng(false);
        });
    } else {
      setOpen(false);
      const t = setTimeout(() => setMounted(false), 310);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dish]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else       document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!mounted || !dish) return null;

  const tags      = getDietaryTags(dish.description ?? "", ingredients);
  const totalStr  = (dish.price * qty).toFixed(2);

  function handleShare() {
    if (!dish) return;
    const url = `${window.location.origin}/dashboard/customer/restaurant/${dish.restaurant_id}`;
    if (navigator.share) {
      navigator.share({ title: dish.name, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 2200);
    }
  }

  function handleAddToCart() {
    const inCart = cartQty > 0;
    if (inCart) {
      updateItemQuantity(dish.id, qty);
    } else {
      const result = addToCartLib({
        restaurant_id:   dish.restaurant_id,
        restaurant_name: dish.restaurant_name ?? "Home Restaurant",
        dish: { id: dish.id, name: dish.name, price: dish.price, image_url: dish.image_url },
        quantity: 1,
      });
      if (result.blocked) {
        alert(
          `Your cart has items from ${result.cart?.restaurant_name ?? "another restaurant"}. Clear your cart to add from here.`
        );
        window.dispatchEvent(new Event("homebites:open-cart"));
        return;
      }
      if (qty > 1) updateItemQuantity(dish.id, qty);
    }
    window.dispatchEvent(new Event("homebites:cart-updated"));
    onClose();
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[200] transition-opacity duration-300"
        style={{ background: "rgba(0,0,0,0.5)", opacity: open ? 1 : 0 }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[201] bg-white rounded-t-3xl flex flex-col transition-transform duration-300"
        style={{
          maxHeight: "85vh",
          transform: open ? "translateY(0)" : "translateY(100%)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-8 h-1 rounded-full bg-[#E5E7EB]" />
        </div>

        {/* Top-right actions */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <button
            onClick={handleShare}
            className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center transition-colors"
            style={{ border: "1px solid var(--hb-border-soft)", backdropFilter: "blur(8px)" }}
          >
            {shared
              ? <Check size={13} style={{ color: "var(--hb-success-ink)" }} />
              : <Share2 size={13} style={{ color: "var(--hb-fg-muted)" }} />
            }
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center transition-colors"
            style={{ border: "1px solid var(--hb-border-soft)", backdropFilter: "blur(8px)" }}
          >
            <X size={13} style={{ color: "var(--hb-fg-muted)" }} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          {/* Hero image */}
          <div className="w-full h-[220px] flex-shrink-0 overflow-hidden bg-[#F5F2ED]">
            {dish.image_url ? (
              <img src={dish.image_url} alt={dish.name} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-7xl"
                style={{ background: "linear-gradient(135deg, #FFF1E3 0%, #FFE4CB 100%)" }}
              >
                {CUISINE_EMOJI[dish.restaurant_cuisine ?? ""] ?? "🍽️"}
              </div>
            )}
          </div>

          {/* Header */}
          <div className="px-4 pt-4 pb-2">
            <h2
              className="text-[22px] font-bold leading-snug tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
            >
              {dish.name}
            </h2>
            <div className="flex items-center justify-between mt-1.5">
              <button
                onClick={() => {
                  onClose();
                  window.location.href = `/dashboard/customer/restaurant/${dish.restaurant_id}`;
                }}
                className="text-[14px] font-semibold transition-colors"
                style={{ color: "var(--hb-primary)" }}
              >
                {dish.restaurant_name ?? "View restaurant"}
              </button>
              <p
                className="text-[20px] font-bold"
                style={{ color: "var(--hb-fg)", fontVariantNumeric: "tabular-nums" }}
              >
                ${Number(dish.price).toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Star size={13} fill="#FFB400" stroke="#FFB400" />
              <span className="text-[13px]" style={{ color: "var(--hb-fg-muted)" }}>
                <b style={{ color: "var(--hb-fg)" }}>4.8</b> (120 ratings)
              </span>
            </div>
          </div>

          {/* Description */}
          {dish.description && (
            <div className="px-4 py-2">
              <p className="text-[14px] leading-[1.6]" style={{ color: "var(--hb-fg-muted)" }}>
                {dish.description}
              </p>
            </div>
          )}

          {/* Dietary tags */}
          {tags.length > 0 && (
            <div className="px-4 py-2">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag.label}
                    className="px-2.5 py-1 rounded-full text-[12px] font-semibold flex items-center gap-1"
                    style={{ background: tag.bg, color: "var(--hb-fg)" }}
                  >
                    {tag.emoji} {tag.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Ingredients */}
          <div className="px-4 py-3">
            <h3 className="text-[16px] font-semibold mb-2" style={{ color: "var(--hb-fg)" }}>
              Ingredients
            </h3>
            {loadingIng ? (
              <div className="flex gap-2">
                {[60, 80, 50, 70].map((w, i) => (
                  <div key={i} className={`h-6 bg-[#F0EBE3] rounded-full animate-pulse`} style={{ width: w }} />
                ))}
              </div>
            ) : ingredients ? (
              <div className="flex flex-wrap gap-1.5">
                {ingredients.split(/[,·]/).map((ing, i) => {
                  const t = ing.trim();
                  return t ? (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-full text-[12px] font-medium"
                      style={{
                        background: "#F5F2ED",
                        color: "var(--hb-fg-muted)",
                        border: "1px solid var(--hb-border-soft)",
                      }}
                    >
                      {t}
                    </span>
                  ) : null;
                })}
              </div>
            ) : (
              <p className="text-[13px]" style={{ color: "var(--hb-fg-subtle)" }}>
                No ingredients listed.
              </p>
            )}
          </div>

          {/* Nutrition Facts */}
          <div className="px-4 py-3">
            <h3 className="text-[16px] font-semibold mb-0.5" style={{ color: "var(--hb-fg)" }}>
              Nutrition Facts
            </h3>
            <p className="text-[11px] italic mb-3" style={{ color: "var(--hb-fg-subtle)" }}>
              Estimated values per serving
            </p>
            <div className="grid grid-cols-3 gap-2">
              {NUTRITION.map(({ label, value, unit }) => (
                <div
                  key={label}
                  className="rounded-xl p-2.5 text-center"
                  style={{ background: "#fff", border: "1px solid #EDE3D2" }}
                >
                  <p
                    className="text-[15px] font-bold leading-none mb-1"
                    style={{ color: "var(--hb-fg)" }}
                  >
                    {value}
                    <span
                      className="text-[10px] font-normal ml-0.5"
                      style={{ color: "var(--hb-fg-muted)" }}
                    >
                      {unit}
                    </span>
                  </p>
                  <p className="text-[10px]" style={{ color: "var(--hb-fg-muted)" }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-[10px] mt-2.5 italic" style={{ color: "var(--hb-fg-subtle)" }}>
              * Nutrition estimates are approximate and may vary.
            </p>
          </div>

          {/* Spacer above sticky footer */}
          <div className="h-32" />
        </div>

        {/* Sticky add-to-cart footer */}
        <div
          className="flex-shrink-0 px-4 pb-6 pt-4"
          style={{ borderTop: "1px solid #EDE3D2", background: "#fff" }}
        >
          {/* Qty stepper */}
          <div className="flex items-center justify-center gap-6 mb-3">
            <button
              onClick={() => setQty((v) => Math.max(1, v - 1))}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              style={{ border: "1.5px solid var(--hb-border)", color: "var(--hb-fg)" }}
            >
              <Minus size={17} />
            </button>
            <span
              className="text-[24px] font-bold min-w-[36px] text-center"
              style={{ color: "var(--hb-fg)", fontVariantNumeric: "tabular-nums" }}
            >
              {qty}
            </span>
            <button
              onClick={() => setQty((v) => v + 1)}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
              style={{ border: "1.5px solid var(--hb-primary)", color: "var(--hb-primary)" }}
            >
              <Plus size={17} />
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            className="w-full rounded-full font-semibold text-[15px] text-white transition-colors"
            style={{
              background: "var(--hb-primary)",
              boxShadow: "0 4px 14px -2px rgba(255,122,57,.45)",
              height: 52,
            }}
          >
            {cartQty > 0 ? `Update cart — $${totalStr}` : `Add to cart — $${totalStr}`}
          </button>

          <div className="text-center mt-2.5">
            <button
              onClick={() => {
                onClose();
                window.location.href = `/dashboard/customer/restaurant/${dish.restaurant_id}`;
              }}
              className="text-[12.5px] font-medium"
              style={{ color: "var(--hb-fg-muted)" }}
            >
              View full menu →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
