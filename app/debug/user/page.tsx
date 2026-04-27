"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DebugUser() {
  useEffect(() => {
    async function showUser() {
      const { data } = await supabase.auth.getUser();
      console.log("USER DATA:", data);
      alert("Your user ID is:\n\n" + data.user?.id);
    }
    showUser();
  }, []);

  return <div style={{ padding: 40 }}>Check console + alert popup</div>;
}
