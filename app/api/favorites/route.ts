/**
 * S5.2 — Favorites API.
 *
 *   GET    /api/favorites?kind=monster   → { favorites: [{ slug, kind, favorited_at }] }
 *   POST   /api/favorites  body { kind, slug }  → 201 Created   { favorite }
 *   DELETE /api/favorites  body { kind, slug }  → 204 No Content
 *
 * All routes require a non-anonymous auth user (anon users rejected with 401).
 * Rate limit: 30/min per route+IP.
 *
 * Hard cap of 50 favorites per kind per user (defense-in-depth; client also
 * enforces). 409 on limit, 409 on duplicate.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withRateLimit } from "@/lib/rate-limit";
import { captureError } from "@/lib/errors/capture";

const MAX_PER_KIND = 50;
const KINDS = new Set(["monster", "item", "condition"]);
const MAX_SLUG_LENGTH = 200;

type Kind = "monster" | "item" | "condition";

function validateBody(body: unknown): { kind: Kind; slug: string } | { error: string } {
  if (!body || typeof body !== "object") return { error: "invalid_body" };
  const b = body as Record<string, unknown>;
  const kind = b.kind;
  const slug = b.slug;
  if (typeof kind !== "string" || !KINDS.has(kind)) return { error: "invalid_kind" };
  if (typeof slug !== "string" || slug.length === 0 || slug.length > MAX_SLUG_LENGTH) {
    return { error: "invalid_slug" };
  }
  return { kind: kind as Kind, slug };
}

const getHandler: Parameters<typeof withRateLimit>[0] = async function getHandler(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const kindRaw = searchParams.get("kind");
  if (kindRaw !== null && !KINDS.has(kindRaw)) {
    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  }

  try {
    let q = supabase
      .from("user_favorites")
      .select("slug, kind, favorited_at")
      .eq("user_id", user.id)
      .order("favorited_at", { ascending: false });

    if (kindRaw) q = q.eq("kind", kindRaw);

    const { data, error } = await q;
    if (error) throw error;

    return NextResponse.json({ favorites: data ?? [] });
  } catch (err) {
    captureError(err, { component: "FavoritesAPI", action: "list", category: "database" });
    return NextResponse.json({ error: "failed_to_list" }, { status: 500 });
  }
};

const postHandler: Parameters<typeof withRateLimit>[0] = async function postHandler(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const validated = validateBody(body);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const { kind, slug } = validated;

  try {
    // Enforce per-kind cap before insert (advisory — client also enforces).
    const { count, error: countError } = await supabase
      .from("user_favorites")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("kind", kind);
    if (countError) throw countError;
    if ((count ?? 0) >= MAX_PER_KIND) {
      return NextResponse.json({ error: "limit_reached", max: MAX_PER_KIND }, { status: 409 });
    }

    const { data: record, error: insertError } = await supabase
      .from("user_favorites")
      .insert({ user_id: user.id, kind, slug })
      .select("slug, kind, favorited_at")
      .single();

    if (insertError) {
      // 23505 = unique_violation → already favorited
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "already_favorite" }, { status: 409 });
      }
      throw insertError;
    }

    return NextResponse.json({ favorite: record }, { status: 201 });
  } catch (err) {
    captureError(err, { component: "FavoritesAPI", action: "add", category: "database" });
    return NextResponse.json({ error: "failed_to_add" }, { status: 500 });
  }
};

const deleteHandler: Parameters<typeof withRateLimit>[0] = async function deleteHandler(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const validated = validateBody(body);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }
  const { kind, slug } = validated;

  try {
    const { error } = await supabase
      .from("user_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("kind", kind)
      .eq("slug", slug);
    if (error) throw error;
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    captureError(err, { component: "FavoritesAPI", action: "remove", category: "database" });
    return NextResponse.json({ error: "failed_to_remove" }, { status: 500 });
  }
};

const rateLimitConfig = { max: 30, window: "1 m" } as const;
export const GET = withRateLimit(getHandler, rateLimitConfig);
export const POST = withRateLimit(postHandler, rateLimitConfig);
export const DELETE = withRateLimit(deleteHandler, rateLimitConfig);
