"use client";

import { useEffect } from "react";

export default function HomePage() {
  useEffect(() => {
    window.location.href = "/dashboard/customer";
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-indigo-900 text-white">
      Loading HomeBites…
    </div>
  );
}
