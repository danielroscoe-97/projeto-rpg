import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";

// Simple in-process rate limit (per-edge-instance)
// Production: replace with Upstash Redis — see NFR14
const authAttempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = authAttempts.get(ip);
  if (!record || now > record.resetAt) {
    authAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  record.count += 1;
  return record.count > MAX_ATTEMPTS;
}

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
    if (checkRateLimit(ip)) {
      return new NextResponse("Too many requests", { status: 429 });
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
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

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

  // Redirect authed users away from auth pages
  if (user && (pathname === "/auth/login" || pathname === "/auth/sign-up")) {
    const url = request.nextUrl.clone();
    url.pathname = "/app/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
