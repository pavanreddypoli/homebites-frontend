"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ChefNav from "@/components/ChefNav";

export default function AddMenuItem() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    setUploading(true);
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("User not logged in."); setUploading(false); return; }

    const { data: restaurantRow, error: restaurantError } = await supabase
      .from("home_restaurants")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (restaurantError || !restaurantRow) {
      setMessage("Could not find your Home Restaurant profile.");
      setUploading(false);
      return;
    }

    const homeRestaurantId = restaurantRow.id;
    let image_url: string | null = null;

    if (imageFile) {
      const fileExt = imageFile.name.split(".").pop();
      const fileName = `${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `dishes/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("dish-images")
        .upload(filePath, imageFile);

      if (uploadError) {
        setMessage("Image upload failed: " + uploadError.message);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from("dish-images").getPublicUrl(filePath);
      image_url = urlData.publicUrl;
    }

    const { error } = await supabase.from("dishes").insert({
      home_restaurant_id: homeRestaurantId,
      name,
      ingredients,
      description,
      price: price === "" ? null : Number(price),
      image_url,
    });

    if (error) { setMessage(error.message); setUploading(false); return; }
    router.push("/dashboard/home-restaurant/menu");
  }

  const fieldClass = "w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-colors";
  const fieldStyle = {
    background: "#F9F6F2",
    border: "1px solid var(--hb-border)",
    color: "var(--hb-fg)",
  };
  const labelStyle = { color: "var(--hb-fg-muted)", fontSize: "12px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.05em" };

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
              This will appear on your public menu.
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
          </div>

          <button
            onClick={handleSave}
            disabled={uploading}
            className="w-full py-3.5 rounded-full text-[14px] font-semibold text-white transition-colors"
            style={{ background: uploading ? "var(--hb-fg-subtle)" : "var(--hb-primary)" }}
          >
            {uploading ? "Saving…" : "Save Dish"}
          </button>

          {message && (
            <p className="text-center text-[13px] text-red-600">{message}</p>
          )}
        </div>
      </main>
    </div>
  );
}
