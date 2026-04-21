import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasEnvVars } from "../utils";
import { checkRateLimit } from "../rate-limit";
import { JOIN_CODE_RE } from "../validation/join-code";

/** Routes that never need a Supabase session refresh.
 *  Skipping auth here avoids AbortError on fast client-side navigations
 *  between public pages (BUG-003).
 *  SEO-CRITICAL: Googlebot has no Supabase cookies — running session refresh
 *  on public pages can cause redirect errors that block indexation. */
const PUBLIC_PREFIXES = [
  "/api/health",
  "/compendium",
  "/blog",
  "/methodology",
  "/try",
  "/srd",
  "/join",
  "/feedback",
  // Public compendium pages (EN)
  "/monsters",
  "/spells",
  "/classes",
  "/races",
  "/feats",
  "/backgrounds",
  "/items",
  "/conditions",
  "/diseases",
  "/damage-types",
  "/ability-scores",
  "/actions",
  "/rules",
  "/dice",
  "/encounter-builder",
  // Public compendium pages (PT-BR)
  "/monstros",
  "/magias",
  "/classes-pt",
  "/racas",
  "/talentos",
  "/antecedentes",
  "/itens",
  "/condicoes",
  "/doencas",
  "/tipos-de-dano",
  "/atributos",
  "/acoes-em-combate",
  "/regras",
  "/dados",
  "/calculadora-encontro",
  // Other public pages
  "/about",
  "/faq",
  "/pricing",
  "/ebook",
  "/legal",
  "/r/",
];

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // BUG-003: Skip Supabase auth refresh on purely public routes — avoids
  // AbortError when the browser cancels the fetch during fast navigation.
  // SEO-CRITICAL: Also prevents redirect errors for Googlebot (no Supabase cookies).
  if (pathname === "/" || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next({ request });
  }

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
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
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
    } else if (joinCode && JOIN_CODE_RE.test(joinCode)) {
      url.pathname = `/join-campaign/${joinCode}`;
      url.searchParams.delete("join_code");
    } else {
      url.pathname = "/app/dashboard";
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
