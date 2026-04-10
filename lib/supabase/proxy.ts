import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";
import { checkRateLimit } from "../rate-limit";

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate-limit POST to auth endpoints
  if (
    request.method === "POST" &&
    (pathname.startsWith("/auth/login") || pathname.startsWith("/auth/sign-up"))
  ) {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "unknown";
    const { limited, reset } = await checkRateLimit(ip);
    if (limited) {
      return new NextResponse("Too many requests", {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((reset - Date.now()) / 1000)),
        },
      });
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  // Skip Supabase checks if env vars are not configured yet
  if (!hasEnvVars) {
    return supabaseResponse;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — must not run code between createServerClient and getClaims()
  // Timeout guard: if Supabase auth is slow/down, don't block EVERY request.
  // API routes handle their own auth; middleware only needs claims for route guards.
  let user: Record<string, unknown> | null = null;
  try {
    const result = await Promise.race([
      supabase.auth.getClaims(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000)),
    ]);
    if (result && "data" in result) {
      user = (result.data as { claims?: Record<string, unknown> | null })?.claims ?? null;
    }
  } catch {
    // Auth service unreachable — let the request through without auth context.
    // Protected routes (/app/*, /admin/*) will 401 via their own auth checks.
  }

  // Protect /app/* routes
  if (pathname.startsWith("/app/") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Protect /admin/* routes
  if (pathname.startsWith("/admin") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  // Redirect authed users away from auth pages — preserve invite/join context
  if (user && (pathname === "/auth/login" || pathname === "/auth/sign-up")) {
    const url = request.nextUrl.clone();
    const invite = url.searchParams.get("invite");
    const joinCode = url.searchParams.get("join_code");
    if (invite && /^[a-f0-9-]{36}$/i.test(invite)) {
      url.pathname = `/invite/${invite}`;
      url.searchParams.delete("invite");
      url.searchParams.delete("campaign");
    } else if (joinCode && /^[A-Z2-9]{8}$/i.test(joinCode)) {
      url.pathname = `/join-campaign/${joinCode}`;
      url.searchParams.delete("join_code");
    } else {
      url.pathname = "/app/dashboard";
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
