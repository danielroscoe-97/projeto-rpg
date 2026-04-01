import { NextResponse, type NextRequest } from "next/server";

const UPSTREAM_BASE =
  "https://raw.githubusercontent.com/5etools-mirror-2/5etools-img/main/bestiary/tokens";

/** CDN cache: 30 days immutable (tokens never change). */
const CACHE_HEADER = "public, max-age=2592000, s-maxage=2592000, immutable";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  if (!path || path.length === 0) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  // Reconstruct upstream URL — path segments are already decoded by Next.js,
  // so re-encode each segment for the GitHub URL.
  const encodedPath = path.map((seg) => encodeURIComponent(seg)).join("/");
  const upstream = `${UPSTREAM_BASE}/${encodedPath}`;

  try {
    const res = await fetch(upstream, {
      next: { revalidate: 2592000 }, // ISR cache: 30 days
    });

    if (!res.ok) {
      return new NextResponse(null, {
        status: res.status,
        headers: {
          // Cache 404/503 for a short time to avoid hammering upstream
          "Cache-Control": "public, max-age=60, s-maxage=60",
        },
      });
    }

    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "image/webp",
        "Cache-Control": CACHE_HEADER,
      },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
