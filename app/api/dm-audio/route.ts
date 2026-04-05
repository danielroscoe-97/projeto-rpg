import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { captureError } from "@/lib/errors/capture";
import { withRateLimit } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_CUSTOM_SOUNDS = 5;
const BUCKET = "dm-custom-sounds";

/** Validate MP3 magic bytes */
function isMp3(buffer: Uint8Array): boolean {
  if (buffer.length < 3) return false;
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) return true;
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return true;
  return false;
}

/** GET — List DM's custom sounds */
const getHandler: Parameters<typeof withRateLimit>[0] = async function getHandler() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data, error } = await supabase
      .from("dm_custom_sounds")
      .select("id, name, emoji, file_url, file_size, duration_ms, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    captureError(err, { component: "DmAudioAPI", action: "list", category: "database" });
    return NextResponse.json({ error: "Failed to list sounds" }, { status: 500 });
  }
};

/** POST — Upload a new custom sound */
const postHandler: Parameters<typeof withRateLimit>[0] = async function postHandler(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Check count limit
    const { count, error: countError } = await supabase
      .from("dm_custom_sounds")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) throw countError;
    if ((count ?? 0) >= MAX_CUSTOM_SOUNDS) {
      return NextResponse.json(
        { error: `Sound limit reached (max ${MAX_CUSTOM_SOUNDS})` },
        { status: 409 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string | null)?.trim().slice(0, 50) ?? "Sound";
    const emoji = (formData.get("emoji") as string | null) ?? "🎵";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum: 5MB." }, { status: 413 });
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    if (!isMp3(buffer)) {
      return NextResponse.json({ error: "Invalid file type. Use MP3." }, { status: 415 });
    }

    // Upload to storage
    const fileId = crypto.randomUUID();
    const filePath = `${user.id}/${fileId}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: "audio/mpeg",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
    const fileUrl = urlData.publicUrl;

    // Insert metadata
    const { data: record, error: insertError } = await supabase
      .from("dm_custom_sounds")
      .insert({
        user_id: user.id,
        name,
        emoji,
        file_url: fileUrl,
        file_size: file.size,
      })
      .select("id, name, emoji, file_url, file_size, duration_ms, created_at")
      .single();

    if (insertError) {
      await supabase.storage.from(BUCKET).remove([filePath]).catch(() => {});
      throw insertError;
    }

    return NextResponse.json({ data: record });
  } catch (err) {
    captureError(err, { component: "DmAudioAPI", action: "upload", category: "database" });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
};

/** DELETE — Remove a custom sound by id */
const deleteHandler: Parameters<typeof withRateLimit>[0] = async function deleteHandler(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const soundId = searchParams.get("id");
  if (!soundId) return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });

  try {
    const { data: sound, error: fetchError } = await supabase
      .from("dm_custom_sounds")
      .select("file_url")
      .eq("id", soundId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !sound) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Extract storage path from URL and validate it's under the user's directory
    const urlParts = sound.file_url.split(`${BUCKET}/`);
    const storagePath = urlParts[1];
    if (storagePath && storagePath.startsWith(`${user.id}/`)) {
      await supabase.storage.from(BUCKET).remove([storagePath]).catch(() => {});
    } else {
      captureError(new Error(`Unexpected file_url format: cannot extract storage path`), {
        component: "DmAudioAPI", action: "delete-cleanup", category: "database",
      });
    }

    await supabase.from("dm_custom_sounds").delete().eq("id", soundId);

    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    captureError(err, { component: "DmAudioAPI", action: "delete", category: "database" });
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
};

const rateLimitConfig = { max: 10, window: "15 m" } as const;
export const GET = withRateLimit(getHandler, rateLimitConfig);
export const POST = withRateLimit(postHandler, rateLimitConfig);
export const DELETE = withRateLimit(deleteHandler, rateLimitConfig);
