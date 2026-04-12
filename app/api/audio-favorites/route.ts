import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { captureError } from "@/lib/errors/capture";
import { withRateLimit } from "@/lib/rate-limit";

const MAX_FAVORITES = 12;
const MAX_PRESET_ID_LENGTH = 200;

/** GET — List user's audio favorites ordered by position */
const getHandler: Parameters<typeof withRateLimit>[0] = async function getHandler() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data, error } = await supabase
      .from("audio_favorites")
      .select("id, preset_id, source, position, created_at")
      .eq("user_id", user.id)
      .order("position", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    captureError(err, { component: "AudioFavoritesAPI", action: "list", category: "database" });
    return NextResponse.json({ error: "Failed to list favorites" }, { status: 500 });
  }
};

/** POST — Add a preset to favorites */
const postHandler: Parameters<typeof withRateLimit>[0] = async function postHandler(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const { preset_id, source = "preset" } = body as { preset_id?: string; source?: string };

    if (!preset_id || typeof preset_id !== "string" || preset_id.length > MAX_PRESET_ID_LENGTH) {
      return NextResponse.json({ error: "Missing or invalid preset_id" }, { status: 400 });
    }
    if (source !== "preset" && source !== "custom") {
      return NextResponse.json({ error: "Invalid source" }, { status: 400 });
    }

    // Check limit
    const { count, error: countError } = await supabase
      .from("audio_favorites")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) throw countError;
    if ((count ?? 0) >= MAX_FAVORITES) {
      return NextResponse.json({ error: "Favorites limit reached" }, { status: 409 });
    }

    // Next position = current max + 1
    const { data: maxRow } = await supabase
      .from("audio_favorites")
      .select("position")
      .eq("user_id", user.id)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = (maxRow?.position ?? -1) + 1;

    const { data: record, error: insertError } = await supabase
      .from("audio_favorites")
      .insert({
        user_id: user.id,
        preset_id,
        source,
        position: nextPosition,
      })
      .select("id, preset_id, source, position, created_at")
      .single();

    if (insertError) {
      // Unique constraint violation = already favorited
      if (insertError.code === "23505") {
        return NextResponse.json({ error: "Already in favorites" }, { status: 409 });
      }
      throw insertError;
    }

    return NextResponse.json({ data: record });
  } catch (err) {
    captureError(err, { component: "AudioFavoritesAPI", action: "add", category: "database" });
    return NextResponse.json({ error: "Failed to add favorite" }, { status: 500 });
  }
};

/** DELETE — Remove a favorite by preset_id (query param) */
const deleteHandler: Parameters<typeof withRateLimit>[0] = async function deleteHandler(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const presetId = searchParams.get("preset_id");
  const source = searchParams.get("source") ?? "preset";

  if (!presetId) return NextResponse.json({ error: "Missing preset_id" }, { status: 400 });
  if (source !== "preset" && source !== "custom") return NextResponse.json({ error: "Invalid source" }, { status: 400 });

  try {
    const { error } = await supabase
      .from("audio_favorites")
      .delete()
      .eq("user_id", user.id)
      .eq("preset_id", presetId)
      .eq("source", source);

    if (error) throw error;
    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    captureError(err, { component: "AudioFavoritesAPI", action: "remove", category: "database" });
    return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });
  }
};

const rateLimitConfig = { max: 30, window: "1 m" } as const;
export const GET = withRateLimit(getHandler, rateLimitConfig);
export const POST = withRateLimit(postHandler, rateLimitConfig);
export const DELETE = withRateLimit(deleteHandler, rateLimitConfig);
