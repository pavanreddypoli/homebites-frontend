"use client";
import Image from "next/image";

export default function Header() {
  return (
    <header className="w-full py-4 px-6 flex items-center justify-between bg-white shadow-sm">
      <div className="flex items-center gap-2">
        <Image
          src="/homebites-logo.png"
          alt="HomeBites AI"
          width={42}
          height={42}
        />
        <h1 className="text-xl font-semibold text-indigo-700">HomeBites AI</h1>
      </div>
    </header>
  );
}
