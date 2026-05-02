"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ChefNav from "@/components/ChefNav";
import { Sparkles, Loader2 } from "lucide-react";

export default function AddMenuItem() {
  const router = useRouter();
  const [name, setName]             = useState("");
  const [ingredients, setIngredients] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice]           = useState("");
  const [imageFile, setImageFile]   = useState<File | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [message, setMessage]       = useState("");

  // AI description generation
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]     = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-clear AI error after 6 s
  useEffect(() => {
    if (!aiError) return;
    const t = setTimeout(() => setAiError(null), 6000);
    return () => clearTimeout(t);
  }, [aiError]);

  async function handleGenerateDescription() {
    if (!name.trim() || aiLoading) return;

    setAiLoading(true);
    setAiError(null);
    setDescription("");

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setAiError("Sign in to use AI writing.");
      setAiLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 10_000);

    try {
      const res = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ dishName: name, ingredients }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAiError(
          data.error ??
            (res.status === 401
              ? "Sign in to use AI writing."
              : "AI is unavailable right now, try again.")
        );
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setDescription(accumulated);
      }

      if (!accumulated.trim()) {
        setAiError("Couldn't generate a description. Try adding more ingredients.");
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        if (timedOut) setAiError("AI is slow right now — try again.");
        // user-cancelled: keep partial text, show no error
      } else {
        setAiError("AI is unavailable right now, try again.");
      }
    } finally {
      setAiLoading(false);
      abortRef.current = null;
    }
  }

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
  const labelStyle = {
    color: "var(--hb-fg-muted)",
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "uppercase" as const,
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

            {/* Description with AI write button */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label style={labelStyle}>Description</label>
                <button
                  type="button"
                  onClick={handleGenerateDescription}
                  disabled={!name.trim() || aiLoading}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold transition-all"
                  style={{
                    color: !name.trim() ? "var(--hb-fg-subtle)" : "var(--hb-primary)",
                    border: `1px solid ${!name.trim() ? "var(--hb-border)" : "var(--hb-primary)"}`,
                    background: "transparent",
                    opacity: !name.trim() ? 0.5 : 1,
                    cursor: !name.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {aiLoading ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Sparkles size={11} />
                  )}
                  {aiLoading ? "Writing…" : "Write with AI"}
                </button>
              </div>
              <textarea
                rows={3}
                placeholder="Describe the taste, texture, special background…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                readOnly={aiLoading}
                className={`${fieldClass} resize-none`}
                style={{ ...fieldStyle, opacity: aiLoading ? 0.75 : 1 }}
              />
              {aiLoading && (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="mt-1.5 text-[12px] underline"
                  style={{ color: "var(--hb-fg-muted)" }}
                >
                  Cancel
                </button>
              )}
              {aiError && (
                <p className="mt-1.5 text-[12px]" style={{ color: "#DC2626" }}>
                  {aiError}
                </p>
              )}
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
