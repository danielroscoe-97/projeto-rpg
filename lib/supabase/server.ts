import { cache } from "react";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

/** Abort-aware fetch with a per-request timeout (default 4s).
 *  Prevents Supabase queries from hanging when the DB/auth service is slow. */
function fetchWithTimeout(timeoutMs = 4000): typeof globalThis.fetch {
  return (input, init?) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    // If caller already has an AbortSignal, propagate its abort to our controller
    if (init?.signal) {
      init.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(id));
  };
}

/**
 * Especially important if using Fluid compute: Don't put this client in a
 * global variable. Always create a new client within each function when using
 * it.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { fetch: fetchWithTimeout(4000) },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have proxy refreshing
            // user sessions.
          }
        },
      },
    },
  );
}

/** Cached per-request auth check — deduplicates getUser() across layout + page
 *  + sub-layouts within the same server render. React.cache() ensures the
 *  Supabase auth API is hit at most ONCE per HTTP request, no matter how many
 *  server components call getAuthUser(). */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});

/** Service-role client that bypasses RLS.
 *  Use ONLY on the server for operations where the caller has no auth yet
 *  (e.g. validating a session join token for an anonymous player). */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { global: { fetch: fetchWithTimeout(4000) } },
  );
}
