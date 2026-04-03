"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * When server-side auth fails (Supabase timeout/cold start), the LP renders
 * as logged-out. This component retries auth client-side and triggers a
 * server re-render if the user is actually logged in.
 */
export function LandingAuthRecovery() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    const recover = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getSession();
        if (!cancelled && data.session) {
          router.refresh();
        }
      } catch {
        // Client-side also failed — stay on logged-out version
      }
    };

    // Small delay to avoid hammering Supabase immediately
    const timer = setTimeout(recover, 1500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [router]);

  return null;
}
