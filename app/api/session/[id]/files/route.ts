import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const MAGIC_BYTES: Record<string, number[]> = {
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/jpeg": [0xff, 0xd8, 0xff],
  "application/pdf": [0x25, 0x50, 0x44, 0x46],
  // WebP: first 4 bytes "RIFF", bytes 8-11 "WEBP"
};

function detectFileType(buffer: Uint8Array): string | null {
  // PNG
  if (matchBytes(buffer, MAGIC_BYTES["image/png"])) return "image";
  // JPEG
  if (matchBytes(buffer, MAGIC_BYTES["image/jpeg"])) return "image";
  // PDF
  if (matchBytes(buffer, MAGIC_BYTES["application/pdf"])) return "pdf";
  // WebP: RIFF....WEBP
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return "image";
  }
  return null;
}

function matchBytes(buffer: Uint8Array, magic: number[]): boolean {
  if (buffer.length < magic.length) return false;
  return magic.every((byte, i) => buffer[i] === byte);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = await createClient();

  // Auth check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership
  const { data: session } = await supabase
    .from("sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("owner_id", user.id)
    .single();

  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    // Size validation
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum: 10MB." }, { status: 413 });
    }

    // Magic bytes validation
    const buffer = new Uint8Array(await file.arrayBuffer());
    const fileType = detectFileType(buffer);
    if (!fileType) {
      return NextResponse.json({ error: "Invalid file type. Use images (PNG, JPG, WebP) or PDF." }, { status: 415 });
    }

    // Upload to Storage
    const filePath = `${sessionId}/${crypto.randomUUID()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("session-files")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    // Insert metadata
    const { data: fileRecord, error: insertError } = await supabase
      .from("session_files")
      .insert({
        session_id: sessionId,
        uploaded_by: user.id,
        file_name: file.name,
        file_path: filePath,
        file_type: fileType,
        file_size_bytes: file.size,
      })
      .select("id, file_name, file_path, file_type, file_size_bytes, created_at")
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ data: fileRecord });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("fileId");
  if (!fileId) return NextResponse.json({ error: "Missing fileId" }, { status: 400 });

  try {
    // Fetch file to get storage path
    const { data: file } = await supabase
      .from("session_files")
      .select("file_path")
      .eq("id", fileId)
      .eq("session_id", sessionId)
      .eq("uploaded_by", user.id)
      .single();

    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Delete from Storage
    await supabase.storage.from("session-files").remove([file.file_path]);

    // Delete from DB
    await supabase.from("session_files").delete().eq("id", fileId);

    return NextResponse.json({ data: { deleted: true } });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
