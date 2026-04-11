import { createClient } from "@/lib/supabase/server";
import { readFileSync } from "fs";
import { createHash } from "crypto";
import { join } from "path";
import { NextResponse } from "next/server";

/**
 * Beta-tester-gated API route for full SRD data (including non-SRD content).
 * Requires: authenticated user + content_whitelist entry (or is_admin).
 *
 * GET /api/srd/full/monsters-2014.json
 * GET /api/srd/full/monsters-2024.json
 * GET /api/srd/full/spells-2014.json
 * GET /api/srd/full/spells-2024.json
 * GET /api/srd/full/items.json
 */

const ALLOWED_FILES = new Set([
  "monsters-2014.json",
  "monsters-2024.json",
  "monsters-mad.json",
  "spells-2014.json",
  "spells-2024.json",
  "items.json",
  "conditions.json",
  "feats.json",
  "backgrounds.json",
  "classes-srd.json",
]);

const DATA_DIR = join(process.cwd(), "data", "srd");

// In-memory cache to avoid repeated fs reads (process-scoped, cleared on deploy)
const fileCache = new Map<string, { data: string; etag: string }>();

function getFile(filename: string): { data: string; etag: string } {
  const cached = fileCache.get(filename);
  if (cached) return cached;

  const data = readFileSync(join(DATA_DIR, filename), "utf-8");
  const hash = createHash("md5").update(data).digest("hex").slice(0, 12);
  const etag = `"srd-${filename}-${hash}"`;
  const entry = { data, etag };
  fileCache.set(filename, entry);
  return entry;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Beta tester check: content_whitelist OR is_admin
  const [whitelistRes, adminRes] = await Promise.all([
    supabase
      .from("content_whitelist")
      .select("id")
      .eq("user_id", user.id)
      .is("revoked_at", null)
      .maybeSingle(),
    supabase
      .from("users")
      .select("is_admin")
      .eq("id", user.id)
      .single(),
  ]);

  const isBetaTester =
    !!whitelistRes.data || (!adminRes.error && !!adminRes.data?.is_admin);

  if (!isBetaTester) {
    return NextResponse.json(
      { error: "Forbidden — beta access required" },
      { status: 403 }
    );
  }

  const { path } = await params;
  const filename = path.join("/");

  if (!ALLOWED_FILES.has(filename)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { data, etag } = getFile(filename);

    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 });
    }

    return new NextResponse(data, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "private, max-age=3600, stale-while-revalidate=86400",
        ETag: etag,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
