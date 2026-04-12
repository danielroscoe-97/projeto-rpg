import { createBrowserClient } from "@supabase/ssr";

/** BUG-004: True singleton — every call returns the SAME instance.
 *  Multiple instances cause lock contention on the auth storage,
 *  leading to "AbortError: The operation was aborted" (navigator.locks). */
let singleton: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (!singleton) {
    singleton = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
  }
  return singleton;
}
