"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const linkBase =
    "px-4 py-2 rounded-md text-sm font-medium transition hover:bg-indigo-700 hover:text-white";
  const active =
    "bg-white text-indigo-700 shadow font-semibold hover:bg-white hover:text-indigo-700";

  return (
    <nav className="w-full bg-indigo-800 text-white p-4 flex items-center shadow-md">
      {/* LEFT: Brand */}
      <div className="flex items-center gap-2">
        <span className="text-xl">🍳</span>
        <h1 className="text-lg font-bold tracking-wide">HomeBites AI</h1>
      </div>

      {/* DESKTOP LINKS */}
      <div className="hidden md:flex items-center gap-4 ml-8">
        <Link
          href="/dashboard/home-restaurant"
          className={`${linkBase} ${
            pathname === "/dashboard/home-restaurant" ? active : ""
          }`}
        >
          Dashboard
        </Link>

        <Link
          href="/dashboard/home-restaurant/menu"
          className={`${linkBase} ${pathname.includes("/menu") ? active : ""}`}
        >
          Menu
        </Link>

        <Link
          href="/dashboard/home-restaurant/add-item"
          className={`${linkBase} ${
            pathname.includes("/add-item") ? active : ""
          }`}
        >
          Add Item
        </Link>

        <Link
          href="/dashboard/home-restaurant/orders"
          className={`${linkBase} ${pathname.includes("/orders") ? active : ""}`}
        >
          Orders
        </Link>

        <Link
          href="/dashboard/home-restaurant/profile"
          className={`${linkBase} ${
            pathname.includes("/profile") ? active : ""
          }`}
        >
          Profile
        </Link>

        {/* ✅ NEW: Edit Profile (Onboarding) */}
        <Link
          href="/dashboard/home-restaurant/onboarding"
          className={`${linkBase} ${
            pathname.includes("/onboarding") ? active : ""
          }`}
        >
          Edit Profile
        </Link>
      </div>

      {/* LOGOUT button (Desktop) */}
      <button
        onClick={logout}
        className="hidden md:block ml-auto px-4 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white text-sm"
      >
        Logout
      </button>

      {/* MOBILE MENU BUTTON */}
      <button
        className="ml-auto md:hidden p-2 rounded-md hover:bg-indigo-700"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* MOBILE DROPDOWN MENU */}
      {open && (
        <div className="absolute top-16 left-0 w-full bg-indigo-800 text-white p-4 flex flex-col gap-4 md:hidden shadow-lg z-50">
          <Link
            href="/dashboard/home-restaurant"
            onClick={() => setOpen(false)}
            className={`${linkBase} ${
              pathname === "/dashboard/home-restaurant" ? active : ""
            }`}
          >
            Dashboard
          </Link>

          <Link
            href="/dashboard/home-restaurant/menu"
            onClick={() => setOpen(false)}
            className={`${linkBase} ${pathname.includes("/menu") ? active : ""}`}
          >
            Menu
          </Link>

          <Link
            href="/dashboard/home-restaurant/add-item"
            onClick={() => setOpen(false)}
            className={`${linkBase} ${
              pathname.includes("/add-item") ? active : ""
            }`}
          >
            Add Item
          </Link>

          <Link
            href="/dashboard/home-restaurant/orders"
            onClick={() => setOpen(false)}
            className={`${linkBase} ${
              pathname.includes("/orders") ? active : ""
            }`}
          >
            Orders
          </Link>

          <Link
            href="/dashboard/home-restaurant/profile"
            onClick={() => setOpen(false)}
            className={`${linkBase} ${
              pathname.includes("/profile") ? active : ""
            }`}
          >
            Profile
          </Link>

          {/* ✅ NEW: Edit Profile (Onboarding) */}
          <Link
            href="/dashboard/home-restaurant/onboarding"
            onClick={() => setOpen(false)}
            className={`${linkBase} ${
              pathname.includes("/onboarding") ? active : ""
            }`}
          >
            Edit Profile
          </Link>

          <button
            onClick={logout}
            className="w-full px-4 py-2 rounded-md bg-red-500 hover:bg-red-600 text-white text-sm mt-2"
          >
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
