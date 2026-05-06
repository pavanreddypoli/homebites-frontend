"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import ChefNav      from "@/components/ChefNav";

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

export default function EditMenuItem() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [name, setName]               = useState("");
  const [ingredients, setIngredients] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice]             = useState("");
  const [isArchived, setIsArchived]   = useState(false);
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [message, setMessage]         = useState("");

  const [selectedAllergens, setSelectedAllergens]   = useState<string[]>([]);
  const [moderationStatus, setModerationStatus]     = useState<string>("");
  const [rejectionReason, setRejectionReason]       = useState<string | null>(null);
  // FIX 2: track original text content so moderation only re-runs when it changes
  const [originalContent, setOriginalContent]       = useState<{
    name: string; description: string; ingredients: string;
  } | null>(null);
  const [phase, setPhase] = useState<"idle" | "checking" | "saving">("idle");

  function toggleAllergen(id: string, checked: boolean) {
    setSelectedAllergens((prev) => checked ? [...prev, id] : prev.filter((a) => a !== id));
  }

  useEffect(() => {
    async function loadDish() {
      const { data, error } = await supabase.from("dishes").select("*").eq("id", id).single();
      if (error || !data) { setMessage("Could not load dish."); return; }

      setName(data.name ?? "");
      setIngredients(data.ingredients ?? "");
      setDescription(data.description ?? "");
      setPrice(data.price?.toString() ?? "");
      setIsArchived(data.is_archived ?? false);
      setModerationStatus(data.moderation_status ?? "");
      setSelectedAllergens(Array.isArray(data.allergens) ? data.allergens : []);

      // Snapshot for FIX 2 change detection
      setOriginalContent({
        name:        data.name ?? "",
        description: data.description ?? "",
        ingredients: data.ingredients ?? "",
      });

      // Fetch rejection reason from service-role route (moderation_queue is admin-only RLS)
      if (data.moderation_status === "rejected") {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          fetch(`/api/chef/dish-rejection-reason?dishId=${id}`, {
            headers: { "Authorization": `Bearer ${session.access_token}` },
          })
            .then((r) => r.json())
            .then(({ reason }) => setRejectionReason(reason ?? null))
            .catch(() => {});
        }
      }
    }
    if (id) loadDish();
  }, [id]);

  async function handleUnarchive() {
    const { error } = await supabase.from("dishes").update({ is_archived: false }).eq("id", id);
    if (error) { setMessage("Unarchive failed: " + error.message); return; }
    setIsArchived(false);
  }

  async function handleUpdate() {
    if (!name.trim()) { setMessage("Dish name is required."); return; }
    setMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMessage("User not logged in."); return; }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { setMessage("Session expired. Please log in again."); return; }

    // FIX 2: only re-run moderation if text content changed (price/image changes skip API call)
    const contentChanged = !originalContent || (
      name !== originalContent.name ||
      description !== originalContent.description ||
      ingredients !== originalContent.ingredients
    );

    let newModerationStatus = moderationStatus;
    let newAllergens        = selectedAllergens;
    let isPendingReview     = false;

    if (contentChanged) {
      setPhase("checking");
      let moderationResult: { status: string; reason: string; allergens: string[] };
      try {
        const res = await fetch("/api/moderation/check-dish", {
          method:  "POST",
          headers: {
            "Content-Type":  "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ name, description, ingredients, dish_id: id }),
        });
        moderationResult = await res.json();
      } catch {
        moderationResult = { status: "pending_review", reason: "Moderation service unavailable", allergens: [] };
      }

      if (moderationResult.status === "rejected") {
        setMessage(`This dish can't be listed: ${moderationResult.reason}`);
        setModerationStatus("rejected");
        setPhase("idle");
        return;
      }

      newModerationStatus = moderationResult.status === "approved" ? "approved" : "pending_review";
      newAllergens        = [...new Set([...selectedAllergens, ...moderationResult.allergens])];
      isPendingReview     = moderationResult.status === "pending_review";
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

    const { error } = await supabase.from("dishes").update({
      name, ingredients, description,
      price:             price === "" ? null : parseFloat(price),
      moderation_status: newModerationStatus,
      allergens:         newAllergens,
      ...(image_url ? { image_url } : {}),
    }).eq("id", id);

    if (error) { setMessage(error.message); setPhase("idle"); return; }

    if (isPendingReview) {
      setMessage("Your dish is being reviewed. We'll email you within 24 hours.");
      setTimeout(() => router.push("/dashboard/home-restaurant/menu"), 3000);
      return;
    }

    router.push("/dashboard/home-restaurant/menu");
  }

  const fieldClass = "w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-colors";
  const fieldStyle: React.CSSProperties = {
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
              Edit Dish
            </h1>
          </div>

          {/* Rejection reason banner */}
          {moderationStatus === "rejected" && (
            <div
              className="flex items-start gap-3 px-4 py-3 rounded-xl"
              style={{ background: "#FEF2F2", border: "1px solid #FCA5A5" }}
            >
              <span className="text-[16px] leading-none mt-0.5">❌</span>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "#991B1B" }}>
                  This dish was rejected
                </p>
                {rejectionReason && (
                  <p className="text-[12px] mt-0.5" style={{ color: "#7F1D1D" }}>
                    {rejectionReason}
                  </p>
                )}
                <p className="text-[12px] mt-1" style={{ color: "#991B1B" }}>
                  Edit the name, description, or ingredients and save to re-submit for review.
                </p>
              </div>
            </div>
          )}

          {/* Pending review banner */}
          {moderationStatus === "pending_review" && (
            <div
              className="flex items-start gap-3 px-4 py-3 rounded-xl"
              style={{ background: "#FFFBEB", border: "1px solid #FCD34D" }}
            >
              <span className="text-[16px] leading-none mt-0.5">⏳</span>
              <p className="text-[13px] font-semibold" style={{ color: "#92400E" }}>
                This dish is under review — not visible to customers yet.
              </p>
            </div>
          )}

          {/* Archived banner */}
          {isArchived && (
            <div
              className="flex items-start gap-3 px-4 py-3 rounded-xl"
              style={{ background: "#FFFBEB", border: "1px solid #FCD34D" }}
            >
              <span className="text-[16px] leading-none mt-0.5">⚠️</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: "#92400E" }}>
                  This dish is archived. Customers can&apos;t order it.
                </p>
                <button
                  onClick={handleUnarchive}
                  className="text-[12px] font-bold underline mt-0.5"
                  style={{ color: "#D97706" }}
                >
                  Unarchive to make it available
                </button>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {[
              { label: "Dish Name", value: name, onChange: setName, placeholder: "e.g. Ghee Roast Dosa" },
              { label: "Ingredients", value: ingredients, onChange: setIngredients, placeholder: "e.g. Rice batter, ghee…" },
            ].map(({ label, value, onChange, placeholder }) => (
              <div key={label}>
                <label className="block mb-1.5" style={labelStyle}>{label}</label>
                <input
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={placeholder}
                  className={fieldClass}
                  style={fieldStyle}
                />
              </div>
            ))}

            <div>
              <label className="block mb-1.5" style={labelStyle}>Description</label>
              <textarea
                rows={3}
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
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={fieldClass}
                style={fieldStyle}
                placeholder="e.g. 12.99"
              />
            </div>

            <div>
              <label className="block mb-1.5" style={labelStyle}>Replace Food Photo (optional)</label>
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
                {ALLERGENS.map(({ id: aid, label }) => (
                  <label key={aid} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedAllergens.includes(aid)}
                      onChange={(e) => toggleAllergen(aid, e.target.checked)}
                      className="h-3.5 w-3.5 rounded accent-[var(--hb-primary)]"
                    />
                    <span className="text-[13px]" style={{ color: "var(--hb-fg)" }}>{label}</span>
                  </label>
                ))}
              </div>
              <p className="text-[11.5px] mt-1.5" style={{ color: "var(--hb-fg-muted)" }}>
                Editing name, description, or ingredients re-runs the compliance check.
              </p>
            </div>
          </div>

          <button
            onClick={handleUpdate}
            disabled={phase !== "idle"}
            className="w-full py-3.5 rounded-full text-[14px] font-semibold text-white transition-colors"
            style={{ background: phase !== "idle" ? "var(--hb-fg-subtle)" : "var(--hb-primary)" }}
          >
            {phase === "checking" ? "Checking…" : phase === "saving" ? "Saving…" : "Update Dish"}
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
