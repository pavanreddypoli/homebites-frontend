"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";

export default function HomeRestaurantOnboarding() {
  const [restaurantName, setRestaurantName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [hours, setHours] = useState("");
  const [address, setAddress] = useState("");
  const [addressResults, setAddressResults] = useState<any[]>([]);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);

  // ✅ NEW (aligned with DB)
  const [notificationEmail, setNotificationEmail] = useState("");

  // ✅ Delivery Radius (km)
  const [deliveryRadius, setDeliveryRadius] = useState(5);

  const [message, setMessage] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);

  // ✅ Load existing profile
  useEffect(() => {
    async function loadExisting() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data } = await supabase
        .from("home_restaurants")
        .select(
          "id, name, cuisine, description, city, hours, lat, lng, delivery_radius_km, notification_email"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setRestaurantName(data.name ?? "");
        setCuisine(data.cuisine ?? "");
        setDescription(data.description ?? "");
        setCity(data.city ?? "");
        setHours(data.hours ?? "");
        setLat(data.lat ?? null);
        setLng(data.lng ?? null);
        setDeliveryRadius(
          typeof data.delivery_radius_km === "number"
            ? data.delivery_radius_km
            : 5
        );
        setNotificationEmail(data.notification_email ?? "");
      }

      setLoadingProfile(false);
    }

    loadExisting();
  }, []);

  /* 📍 FREE ADDRESS SEARCH (NOMINATIM) */
  async function searchAddress(query: string) {
    if (query.length < 3) {
      setAddressResults([]);
      return;
    }

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(
        query
      )}`
    );

    const data = await res.json();
    setAddressResults(data.slice(0, 5));
  }

  async function handleSave() {
    setSaving(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("User not logged in.");
      setSaving(false);
      return;
    }

    if (!notificationEmail) {
      setMessage("Please provide an email for order notifications.");
      setSaving(false);
      return;
    }

    if (address.trim().length > 0 && (!lat || !lng)) {
      setMessage("Please select a valid address from suggestions.");
      setSaving(false);
      return;
    }

    const { data: existing } = await supabase
      .from("home_restaurants")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const payload = {
      name: restaurantName,
      cuisine,
      description,
      city,
      hours,
      lat,
      lng,
      delivery_radius_km: deliveryRadius,
      notification_email: notificationEmail,
      is_active: true,
    };

    if (existing?.id) {
      await supabase
        .from("home_restaurants")
        .update(payload)
        .eq("id", existing.id);
    } else {
      await supabase.from("home_restaurants").insert({
        user_id: user.id,
        ...payload,
      });
    }

    setSaving(false);
    window.location.href = "/dashboard/home-restaurant/menu";
  }

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-indigo-900 flex items-center justify-center text-white">
        Loading your profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-indigo-900">
      <Header />

      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-lg bg-white rounded-xl shadow-xl p-8 space-y-6">
          <h1 className="text-2xl font-bold text-indigo-700 text-center">
            🍽️ Set Up Your Home Restaurant
          </h1>

          <p className="text-center text-slate-500 text-sm -mt-2">
            Tell customers who you are and what you cook.
          </p>

          {/* Restaurant Name */}
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Restaurant Name
            </label>
            <Input
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className="mt-1 bg-slate-50"
            />
          </div>

          {/* Cuisine */}
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Cuisine Type
            </label>
            <Input
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value)}
              className="mt-1 bg-slate-50"
            />
          </div>

          {/* ✅ NEW: Notification Email */}
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Order Notification Email
            </label>
            <Input
              type="email"
              placeholder="chef@yourkitchen.com"
              value={notificationEmail}
              onChange={(e) => setNotificationEmail(e.target.value)}
              className="mt-1 bg-slate-50"
            />
            <p className="text-xs text-slate-500 mt-1">
              We’ll send new order and pickup notifications to this email.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Short Description
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 bg-slate-50"
            />
          </div>

          {/* Address */}
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Restaurant Address
            </label>
            <Input
              placeholder="Start typing your address"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                searchAddress(e.target.value);
              }}
              className="mt-1 bg-slate-50"
            />

            {addressResults.length > 0 && (
              <div className="mt-2 border rounded-md bg-white shadow-sm max-h-48 overflow-auto">
                {addressResults.map((item) => (
                  <div
                    key={item.place_id}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50"
                    onClick={() => {
                      setAddress(item.display_name);
                      setLat(parseFloat(item.lat));
                      setLng(parseFloat(item.lon));
                      setCity(
                        item.address?.city ||
                          item.address?.town ||
                          item.address?.village ||
                          ""
                      );
                      setAddressResults([]);
                    }}
                  >
                    {item.display_name}
                  </div>
                ))}
              </div>
            )}

            {city && (
              <p className="text-xs text-slate-500 mt-1">
                Detected city: <b>{city}</b>
              </p>
            )}

            {lat && lng && (
              <p className="text-xs text-green-600 mt-1">
                Location saved ✔
              </p>
            )}
          </div>

          {/* Delivery Radius */}
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Delivery Radius: <b>{deliveryRadius} km</b>
            </label>
            <input
              type="range"
              min={1}
              max={25}
              value={deliveryRadius}
              onChange={(e) => setDeliveryRadius(Number(e.target.value))}
              className="w-full mt-2"
            />
            <p className="text-xs text-slate-500 mt-1">
              Customers outside this radius won&apos;t see your restaurant.
            </p>
          </div>

          {/* Operating Hours */}
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Operating Hours
            </label>
            <Input
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="mt-1 bg-slate-50"
            />
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg"
          >
            {saving ? "Saving..." : "Save & Continue"}
          </Button>

          {message && (
            <p className="text-center text-red-500 text-sm">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
