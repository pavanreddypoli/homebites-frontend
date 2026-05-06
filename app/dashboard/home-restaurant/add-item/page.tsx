"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase }  from "@/lib/supabaseClient";
import ChefNav       from "@/components/ChefNav";

const ALLERGENS = [
  { id: "milk",      label: "Milk" },
  { id: "eggs",      label: "Eggs" },
  { id: "fish",      label: "Fish" },
  { id: "shellfish", label: "Shellfish" },
  { id: "tree_nuts", label: "Tree Nuts" },
  { id: "peanuts",   label: "Peanuts" },
  { id: "wheat",     label: "Wheat" },
  { id: "soybeans",  label: "Soybeans" },
  { id: "sesame",    label: "Sesame" },
];

export default function AddMenuItem() {
  const router = useRouter();

  const [name, setName]               = useState("");
  const [ingredients, setIngredients] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice]             = useState("");
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [message, setMessage]         = useState("");
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [phase, setPhase] = useState<"idle" | "checking" | "saving">("idle");

  function toggleAllergen(id: string, checked: boolean) {
    setSelectedAllergens((prev) => checked ? [...prev, id] : prev.filter((a) => a !== id));
  }

  async function handleSave() {
    if (!name.trim()) { setMessage("Dish name is required."); return; }
    setPhase("checking");
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("User not logged in."); setPhase("idle"); return; }

    // FIX 1: use primary key id (home_restaurants.id = auth.users.id per schema)
    const { data: restaurantRow, error: restaurantError } = await supabase
      .from("home_restaurants")
      .select("id")
      .eq("id", user.id)
      .single();

    if (restaurantError || !restaurantRow) {
      setMessage("Could not find your Home Restaurant profile.");
      setPhase("idle");
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setMessage("Session expired. Please log in again.");
      setPhase("idle");
      return;
    }

    let moderationResult: { status: string; reason: string; allergens: string[] };
    try {
      const res = await fetch("/api/moderation/check-dish", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ name, description, ingredients }),
      });
      moderationResult = await res.json();
    } catch {
      // Moderation service down → fail safe to review queue
      moderationResult = { status: "pending_review", reason: "Moderation service unavailable", allergens: [] };
    }

    if (moderationResult.status === "rejected") {
      setMessage(`This dish can't be listed: ${moderationResult.reason} Try a vegetarian or soy-based version.`);
      setPhase("idle");
      return;
    }

    setPhase("saving");

    let image_url: string | null = null;
    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const filePath = `dishes/${user.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("dish-images")
        .upload(filePath, imageFile);
      if (uploadError) {
        setMessage("Image upload failed: " + uploadError.message);
        setPhase("idle");
        return;
      }
      const { data: urlData } = supabase.storage.from("dish-images").getPublicUrl(filePath);
      image_url = urlData.publicUrl;
    }

    const finalAllergens = [...new Set([...selectedAllergens, ...moderationResult.allergens])];
    const moderationStatus = moderationResult.status === "approved" ? "approved" : "pending_review";

    const { error } = await supabase.from("dishes").insert({
      home_restaurant_id: restaurantRow.id,
      name,
      ingredients,
      description,
      price:             price === "" ? null : Number(price),
      image_url,
      moderation_status: moderationStatus,
      allergens:         finalAllergens,
    });

    if (error) { setMessage(error.message); setPhase("idle"); return; }

    if (moderationResult.status === "pending_review") {
      setMessage("Your dish is being reviewed. We'll email you within 24 hours.");
      setTimeout(() => router.push("/dashboard/home-restaurant/menu"), 3000);
      return;
    }

    router.push("/dashboard/home-restaurant/menu");
  }

  const fieldClass = "w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-colors";
  const fieldStyle = {
    background: "#F9F6F2",
    border: "1px solid var(--hb-border)",
    color: "var(--hb-fg)",
  };
  const labelStyle: React.CSSProperties = {
    color: "var(--hb-fg-muted)",
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--hb-bg)" }}>
      <ChefNav />

      <main className="pt-14 flex items-start justify-center px-4 py-8">
        <div
          className="w-full max-w-lg bg-white rounded-2xl p-6 lg:p-8 space-y-5"
          style={{ border: "1px solid var(--hb-border-soft)", boxShadow: "var(--hb-shadow-card)" }}
        >
          <div>
            <h1
              className="text-[22px] font-bold tracking-tight"
              style={{ fontFamily: "var(--font-display)", color: "var(--hb-fg)" }}
            >
              Add a Dish
            </h1>
            <p className="text-[13px] mt-0.5" style={{ color: "var(--hb-fg-muted)" }}>
              This will appear on your public menu after review.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { label: "Dish Name", placeholder: "e.g. Ghee Roast Dosa", value: name, onChange: setName },
              { label: "Ingredients", placeholder: "e.g. Rice batter, ghee, spices…", value: ingredients, onChange: setIngredients },
            ].map(({ label, placeholder, value, onChange }) => (
              <div key={label}>
                <label className="block mb-1.5" style={labelStyle}>{label}</label>
                <input
                  placeholder={placeholder}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  className={fieldClass}
                  style={fieldStyle}
                />
              </div>
            ))}

            <div>
              <label className="block mb-1.5" style={labelStyle}>Description</label>
              <textarea
                rows={3}
                placeholder="Describe the taste, texture, special background…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={`${fieldClass} resize-none`}
                style={fieldStyle}
              />
            </div>

            <div>
              <label className="block mb-1.5" style={labelStyle}>Price ($)</label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 12.99"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={fieldClass}
                style={fieldStyle}
              />
            </div>

            <div>
              <label className="block mb-1.5" style={labelStyle}>Food Photo (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="w-full text-[13px] file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[12px] file:font-semibold file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100"
              />
            </div>

            <div>
              <label className="block mb-2" style={labelStyle}>
                Allergens — check all that apply
              </label>
              <div className="grid grid-cols-3 gap-y-2 gap-x-3">
                {ALLERGENS.map(({ id, label }) => (
                  <label key={id} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedAllergens.includes(id)}
                      onChange={(e) => toggleAllergen(id, e.target.checked)}
                      className="h-3.5 w-3.5 rounded accent-[var(--hb-primary)]"
                    />
                    <span className="text-[13px]" style={{ color: "var(--hb-fg)" }}>{label}</span>
                  </label>
                ))}
              </div>
              <p className="text-[11.5px] mt-1.5" style={{ color: "var(--hb-fg-muted)" }}>
                AI will also detect allergens on save. You can edit these later.
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={phase !== "idle"}
            className="w-full py-3.5 rounded-full text-[14px] font-semibold text-white transition-colors"
            style={{ background: phase !== "idle" ? "var(--hb-fg-subtle)" : "var(--hb-primary)" }}
          >
            {phase === "checking" ? "Checking…" : phase === "saving" ? "Saving…" : "Save Dish"}
          </button>

          {message && (
            <p
              className="text-center text-[13px]"
              style={{ color: message.startsWith("Your dish is being reviewed") ? "#92400E" : "#DC2626" }}
            >
              {message}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
