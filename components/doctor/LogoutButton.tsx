"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Supabase logout failed:", error);
      setIsLoggingOut(false);
      return;
    }

    router.replace("/doctor/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="mt-4 w-full rounded-md border border-slate-700 px-3 py-2 text-left text-sm text-slate-300 transition hover:border-cyan-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isLoggingOut ? "Signing out..." : "Log out"}
    </button>
  );
}