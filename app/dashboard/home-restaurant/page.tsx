"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ChefNav from "@/components/ChefNav";
import { UtensilsCrossed, Sparkles, ClipboardList, AlertCircle, Star } from "lucide-react";

export default function HomeRestaurantDashboard() {
  const router = useRouter();
  const [loading, setLoading]       = useState(true);
  const [restaurant, setRestaurant] = useState<any>(null);
  const [dishCount, setDishCount]   = useState(0);

  // Availability toggle
  const [isOpen, setIsOpen]             = useState(true);

  // Reviews
  const [reviews, setReviews] = useState<{ rating: number; comment?: string | null; created_at: string }[]>([]);
  const [closedMessage, setClosedMessage] = useState("");
  const [savingMsg, setSavingMsg]       = useState(false);
  const [toast, setToast]               = useState<string | null>(null);

  useEffect(() => {
    async function checkProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login"); return; }

      const { data } = await supabase
        .from("home_restaurants")
        .select("id, name, description, hours, is_open, closed_message")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!data) {
        router.replace("/dashboard/home-restaurant/onboarding");
        return;
      }

      setRestaurant(data);
      setIsOpen(data.is_open ?? true);
      setClosedMessage(data.closed_message ?? "");

      const { count } = await supabase
        .from("dishes")
        .select("id", { count: "exact", head: true })
        .eq("home_restaurant_id", data.id)
        .eq("is_archived", false);

      setDishCount(count ?? 0);

      const { data: reviewData } = await supabase
        .from("reviews")
        .select("rating, comment, created_at")
        .eq("restaurant_id", data.id)
        .order("created_at", { ascending: false });
      setReviews(reviewData || []);

      setLoading(false);
    }
    checkProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleToggle() {
    const newVal = !isOpen;
    setIsOpen(newVal);
    showToast(newVal ? "You're now Open! 🟢" : "You're now Closed 🔴");
    await supabase
      .from("home_restaurants")
      .update({ is_open: newVal })
      .eq("id", restaurant.id);
  }

  async function handleSaveMessage() {
    setSavingMsg(true);
    await supabase
      .from("home_restaurants")
      .update({ closed_message: closedMessage.trim() || null })
      .eq("id", restaurant.id);
    setSavingMsg(false);
    showToast("Message saved");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--hb-bg)" }}>
        <p className="text-[15px] animate-pulse" style={{ color: "var(--hb-fg-muted)" }}>
          Loading your restaurant…
        </p>
      </div>
    );
  }

  const profileIncomplete =
    !restaurant?.description || !restaurant?.hours || dishCount === 0;

  const avgRating    = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : null;
  const reviewCount  = reviews.length;
  const recentReviews = reviews.slice(0, 3);

  const cards = [
    {
      Icon: UtensilsCrossed,
      title: "Menu",
      desc: "Create and manage your dishes.",
      action: "Add Dish",
      href: "/dashboard/home-restaurant/add-item",
      secondary: "View Menu",
      secondaryHref: "/dashboard/home-restaurant/menu",
    },
    {
      Icon: ClipboardList,
      title: "Orders",
      desc: "View and manage incoming orders.",
      action: "Open Orders",
      href: "/dashboard/home-restaurant/orders",
    },
    {
      Icon: Sparkles,
      title: "AI Tools",
      desc: "Smart pricing & recommendations.",
      action: "Coming Soon",
      href: "#",
      disabled: true,
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--hb-bg)" }}>
      <ChefNav />

      <main className="pt-14 max-w-[900px] mx-auto px-4 lg:px-8 py-8">

        {/* ── Availability toggle card ── */}
        <div
          className="bg-white rounded-2xl p-5 mb-6"
          style={{ border: "1px solid #EDE3D2", boxShadow: "var(--hb-shadow-soft)" }}
        >
          <div className="flex items-center justify-between gap-4">
            {/* Left */}
            <div className="min-w-0">
              <p className="text-[16px] font-semibold" style={{ color: "var(--hb-fg)" }}>
                Your Restaurant
              </p>
              <p
                className="text-[14px] font-medium mt-0.5"
                style={{ color: isOpen ? "#16A34A" : "#DC2626" }}
              >
                {isOpen ? "Open for orders" : "Closed"}
              </p>
              <p className="text-[12px] mt-0.5" style={{ color: "var(--hb-fg-muted)" }}>
                Customers can see your status in real-time
              </p>
            </div>

            {/* Toggle switch */}
            <button
              onClick={handleToggle}
              aria-label={isOpen ? "Close your restaurant" : "Open your restaurant"}
              className="relative flex-shrink-0 transition-colors duration-200 rounded-full"
              style={{
                width: 52,
                height: 28,
                background: isOpen ? "#22C55E" : "#D1D5DB",
              }}
            >
              <span
                className="absolute top-[3px] w-[22px] h-[22px] bg-white rounded-full shadow transition-transform duration-200"
                style={{ transform: isOpen ? "translateX(27px)" : "translateX(3px)" }}
              />
            </button>
          </div>

          {/* Closed message input — only when closed */}
          {!isOpen && (
            <div className="mt-4 flex gap-2">
              <input
                value={closedMessage}
                onChange={(e) => setClosedMessage(e.target.value)}
                placeholder="e.g. Back tomorrow at 6pm!"
                className="flex-1 px-3 py-2 rounded-xl text-[13px] outline-none"
                style={{
                  background: "#F5F2ED",
                  border: "1px solid var(--hb-border-soft)",
                  color: "var(--hb-fg)",
                }}
              />
              <button
                onClick={handleSaveMessage}
                disabled={savingMsg}
                className="px-3.5 py-2 rounded-xl text-[12px] font-semibold text-white flex-shrink-0"
                style={{ background: savingMsg ? "var(--hb-fg-subtle)" : "var(--hb-primary)" }}
              >
                {savingMsg ? "Saving…" : "Save"}
              </button>
            </div>
          )}
        </div>

        {/* ── Ratings summary card ── */}
        <div
          className="bg-white rounded-2xl p-5 mb-6"
          style={{ border: "1px solid #EDE3D2", boxShadow: "var(--hb-shadow-soft)" }}
        >
          <p className="text-[16px] font-semibold mb-3" style={{ color: "var(--hb-fg)" }}>
            Customer Reviews
          </p>
          {reviewCount === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--hb-fg-muted)" }}>
              No reviews yet — your first order is the start!
            </p>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="text-[42px] font-bold leading-none"
                  style={{ color: "var(--hb-primary)", fontFamily: "var(--font-display)" }}
                >
                  {avgRating!.toFixed(1)}
                </span>
                <div>
                  <div className="flex gap-0.5 mb-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={18}
                        fill={s <= Math.round(avgRating!) ? "#FFB400" : "none"}
                        stroke={s <= Math.round(avgRating!) ? "#FFB400" : "#D1D5DB"}
                      />
                    ))}
                  </div>
                  <p className="text-[12px]" style={{ color: "var(--hb-fg-muted)" }}>
                    {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {recentReviews.map((rev, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl"
                    style={{ background: "#FBF7F1", border: "1px solid #EDE3D2" }}
                  >
                    <div className="flex items-center gap-1 mb-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          size={12}
                          fill={s <= rev.rating ? "#FFB400" : "none"}
                          stroke={s <= rev.rating ? "#FFB400" : "#D1D5DB"}
                        />
                      ))}
                    </div>
                    {rev.comment ? (
                      <p className="text-[12px] leading-[1.55]" style={{ color: "var(--hb-fg)" }}>
                        "{rev.comment}"
                      </p>
                    ) : (
                      <p className="text-[12px] italic" style={{ color: "var(--hb-fg-muted)" }}>No comment</p>
                    )}
                    <p className="text-[11px] mt-1" style={{ color: "var(--hb-fg-muted)" }}>
                      {new Date(rev.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Complete profile banner */}
        {profileIncomplete && (
          <div
            className="mb-6 px-4 lg:px-5 py-3.5 rounded-2xl flex items-center gap-3"
            style={{ background: "#FFF5EB", border: "1.5px solid var(--hb-primary)" }}
          >
            <AlertCircle size={18} style={{ color: "var(--hb-primary)", flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold" style={{ color: "var(--hb-fg)" }}>
                Your Home Restaurant is missing some info
              </p>
              <p className="text-[12px]" style={{ color: "var(--hb-fg-muted)" }}>
                Complete your profile to attract more customers
              </p>
            </div>
            <button
              onClick={() => router.push("/dashboard/home-restaurant/onboarding")}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold text-white"
              style={{ background: "var(--hb-primary)" }}
            >
              Complete now →
            </button>
          </div>
        )}

        <h1
          className="text-[28px] lg:text-[36px] font-bold tracking-tight mb-1"
          style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
        >
          {restaurant?.name ?? "Your Kitchen"}
        </h1>
        <p className="text-[14px] mb-8" style={{ color: "var(--hb-fg-muted)" }}>
          Manage your dishes, orders, and settings.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map(({ Icon, title, desc, action, href, secondary, secondaryHref, disabled }) => (
            <div
              key={title}
              className="bg-white rounded-2xl p-5 flex flex-col gap-4"
              style={{ border: "1px solid var(--hb-border-soft)", boxShadow: "var(--hb-shadow-soft)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "var(--hb-primary-soft)" }}
              >
                <Icon size={20} style={{ color: "var(--hb-primary)" }} />
              </div>
              <div>
                <h2 className="text-[16px] font-bold mb-1" style={{ color: "var(--hb-fg)" }}>{title}</h2>
                <p className="text-[13px]" style={{ color: "var(--hb-fg-muted)" }}>{desc}</p>
              </div>
              <div className="flex flex-col gap-2 mt-auto">
                <button
                  onClick={() => { if (!disabled && href !== "#") router.push(href); }}
                  disabled={disabled}
                  className="w-full py-2.5 rounded-full text-[13px] font-semibold text-white transition-colors"
                  style={{ background: disabled ? "var(--hb-fg-subtle)" : "var(--hb-primary)" }}
                >
                  {action}
                </button>
                {secondary && secondaryHref && (
                  <button
                    onClick={() => router.push(secondaryHref)}
                    className="w-full py-2.5 rounded-full text-[13px] font-semibold transition-colors"
                    style={{
                      color: "var(--hb-primary)",
                      border: "1px solid var(--hb-primary)",
                      background: "transparent",
                    }}
                  >
                    {secondary}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] px-5 py-3 rounded-full text-[13px] font-semibold text-white shadow-lg whitespace-nowrap"
          style={{ background: "#16202B" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
