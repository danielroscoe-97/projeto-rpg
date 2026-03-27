import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { captureError } from "@/lib/errors/capture";

const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB
const MAX_FILES_PER_PLAYER = 6;

/** Validate MP3 magic bytes: MPEG frame sync (0xFF + high 3 bits set) or ID3 tag (0x49 0x44 0x33) */
function isMp3(buffer: Uint8Array): boolean {
  if (buffer.length < 3) return false;
  // ID3 tag header (ID3v2)
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) return true;
  // MPEG audio frame sync: first 11 bits must be set (0xFF + 0xE0 mask on second byte)
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) return true;
  return false;
}

/** GET — List authenticated player's audio files */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { data, error } = await supabase
      .from("player_audio_files")
      .select("id, user_id, file_name, file_path, file_size_bytes, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (err) {
    captureError(err, { component: "PlayerAudioAPI", action: "list", category: "database" });
    return NextResponse.json({ error: "Failed to list audio files" }, { status: 500 });
  }
}

/** POST — Upload a new MP3 audio file */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Check file count limit
    const { count, error: countError } = await supabase
      .from("player_audio_files")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) throw countError;
    if ((count ?? 0) >= MAX_FILES_PER_PLAYER) {
      return NextResponse.json({ error: "File limit reached (max 6)" }, { status: 409 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const fileName = (formData.get("name") as string | null) ?? file?.name ?? "audio";

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Size check
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum: 3MB." }, { status: 413 });
    }

    // Magic bytes validation
    const buffer = new Uint8Array(await file.arrayBuffer());
    if (!isMp3(buffer)) {
      return NextResponse.json({ error: "Invalid file type. Use MP3." }, { status: 415 });
    }

    // Upload to Supabase Storage
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 50);
    const filePath = `${user.id}/${crypto.randomUUID()}_${sanitizedName}`;
    const { error: uploadError } = await supabase.storage
      .from("player-audio")
      .upload(filePath, buffer, {
        contentType: "audio/mpeg",
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Insert metadata — clean up storage file if DB insert fails
    const { data: record, error: insertError } = await supabase
      .from("player_audio_files")
      .insert({
        user_id: user.id,
        file_name: sanitizedName,
        file_path: filePath,
        file_size_bytes: file.size,
      })
      .select("id, user_id, file_name, file_path, file_size_bytes, created_at")
      .single();

    if (insertError) {
      // Clean up orphaned storage file
      await supabase.storage.from("player-audio").remove([filePath]).catch(() => {});
      throw insertError;
    }

    return NextResponse.json({ data: record });
  } catch (err) {
    captureError(err, { component: "PlayerAudioAPI", action: "upload", category: "database" });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

/** DELETE — Remove an audio file by id */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("id");
  if (!fileId) return NextResponse.json({ error: "Missing id parameter" }, { status: 400 });

  try {
    // Fetch record and verify ownership
    const { data: file, error: fetchError } = await supabase
      .from("player_audio_files")
      .select("file_path")
      .eq("id", fileId)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !file) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Delete from Storage
    await supabase.storage.from("player-audio").remove([file.file_path]);

    // Delete from DB
    await supabase.from("player_audio_files").delete().eq("id", fileId);

    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    captureError(err, { component: "PlayerAudioAPI", action: "delete", category: "database" });
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
