"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useParams } from "next/navigation";
import NavBar from "../../NavBar";

export default function EditMenuItem() {
  const { id } = useParams<{ id: string }>();

  const [name, setName] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  // 🔹 Load existing dish
  useEffect(() => {
    async function loadDish() {
      const { data, error } = await supabase
        .from("dishes")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        setMessage("Could not load dish.");
        return;
      }

      setName(data.name ?? "");
      setIngredients(data.ingredients ?? "");
      setDescription(data.description ?? "");
      setPrice(data.price?.toString() ?? "");
    }

    if (id) loadDish();
  }, [id]);

  async function handleUpdate() {
    setUploading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("User not logged in.");
      setUploading(false);
      return;
    }

    // 🔹 Upload new image if provided
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

      const { data: urlData } = supabase.storage
        .from("dish-images")
        .getPublicUrl(filePath);

      image_url = urlData.publicUrl;
    }

    // 🔹 Update dish
    const { error } = await supabase
      .from("dishes")
      .update({
        name,
        ingredients,
        description,
        price: price === "" ? null : parseFloat(price),
        ...(image_url ? { image_url } : {}),
      })
      .eq("id", id);

    if (error) {
      setMessage(error.message);
      setUploading(false);
      return;
    }

    setUploading(false);
    window.location.href = "/dashboard/home-restaurant/menu";
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-indigo-900">
      {/* ✅ FIXED NAVBAR */}
      <div className="fixed top-0 left-0 w-full z-50">
        <NavBar />
      </div>

      {/* Spacer for navbar */}
      <div className="h-20 sm:h-24" />

      {/* Page content */}
      <div className="flex items-start sm:items-center justify-center px-4 sm:px-6 pb-10">
        <div className="w-full max-w-md sm:max-w-lg bg-white rounded-2xl shadow-xl p-5 sm:p-8 space-y-5">
          <h1 className="text-xl sm:text-2xl font-bold text-indigo-700 text-center">
            ✏️ Edit Menu Item
          </h1>

          {/* Dish Name */}
          <div>
            <label className="text-xs sm:text-sm font-semibold text-slate-700">
              Dish Name
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 bg-slate-50 text-sm"
            />
          </div>

          {/* Ingredients */}
          <div>
            <label className="text-xs sm:text-sm font-semibold text-slate-700">
              Ingredients
            </label>
            <Input
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              className="mt-1 bg-slate-50 text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs sm:text-sm font-semibold text-slate-700">
              Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 bg-slate-50 text-sm min-h-[90px] sm:min-h-[110px]"
            />
          </div>

          {/* Price */}
          <div>
            <label className="text-xs sm:text-sm font-semibold text-slate-700">
              Price ($)
            </label>
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 bg-slate-50 text-sm"
            />
          </div>

          {/* Image Upload */}
          <div>
            <label className="text-xs sm:text-sm font-semibold text-slate-700">
              Replace Food Photo (optional)
            </label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="mt-1 bg-slate-50 text-sm"
            />
          </div>

          {/* Update */}
          <Button
            onClick={handleUpdate}
            disabled={uploading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg shadow-md"
          >
            {uploading ? "Updating..." : "Update Dish"}
          </Button>

          {message && (
            <p className="text-center text-red-500 text-xs sm:text-sm">
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
