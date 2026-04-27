"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import NavBar from "../NavBar";

export default function AddMenuItem() {
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

    // 1️⃣ Get logged-in user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("User not logged in.");
      setUploading(false);
      return;
    }

    // 2️⃣ Find this user's Home Restaurant
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

    // 3️⃣ Upload image (optional)
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

    // 4️⃣ Insert dish
    const { error } = await supabase.from("dishes").insert({
      home_restaurant_id: homeRestaurantId,
      name,
      ingredients,
      description,
      price: price === "" ? null : Number(price),
      image_url,
    });

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

      {/* ✅ FIXED TOP NAVBAR */}
      <div className="fixed top-0 left-0 w-full z-50">
        <NavBar />
      </div>

      {/* ✅ CONTENT WITH PROPER TOP PADDING */}
      <div className="flex items-center justify-center px-4 pt-28 pb-10">
        <div className="w-full max-w-lg bg-white rounded-xl shadow-xl p-6 sm:p-8 space-y-5">

          <h1 className="text-2xl font-bold text-indigo-700 text-center">
            🍲 Add Menu Item
          </h1>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Dish Name
            </label>
            <Input
              placeholder="e.g. Ghee Roast Dosa"
              onChange={(e) => setName(e.target.value)}
              className="mt-1 bg-slate-50"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Ingredients
            </label>
            <Input
              placeholder="e.g. Rice batter, ghee, spices..."
              onChange={(e) => setIngredients(e.target.value)}
              className="mt-1 bg-slate-50"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Description
            </label>
            <Textarea
              placeholder="Describe the taste, texture, special background..."
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 bg-slate-50"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Price ($)
            </label>
            <Input
              type="number"
              step="0.01"
              placeholder="e.g. 12.99"
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 bg-slate-50"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Upload Food Photo
            </label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="mt-1 bg-slate-50"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={uploading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg shadow-md"
          >
            {uploading ? "Saving..." : "Save Dish"}
          </Button>

          {message && (
            <p className="text-center text-red-500 text-sm">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
