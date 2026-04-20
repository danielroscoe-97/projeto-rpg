import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/blog/posts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateImageMetadata({
  params,
}: {
  params: { slug: string };
}) {
  return [{ id: "og", alt: `${params.slug} | Pocket DM Blog` }];
}

export default async function BlogOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const title = post?.title ?? "Blog | Pocket DM";
  const readingTime = post?.readingTime ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(160deg, #12111a 0%, #1a1725 40%, #12111a 100%)",
          color: "#e8e4d0",
          fontFamily: "Georgia, serif",
          padding: 60,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Radial glow */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: -80,
            right: -100,
            width: 600,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse, rgba(212,168,83,0.1) 0%, transparent 70%)",
          }}
        />

        {/* Border frame */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            inset: 24,
            border: "1.5px solid rgba(212,168,83,0.15)",
            borderRadius: 12,
          }}
        />

        {/* Top: brand + category */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#D4A853",
              letterSpacing: -0.5,
            }}
          >
            Pocket DM
          </div>
          <div
            style={{
              width: 2,
              height: 20,
              background: "rgba(212,168,83,0.3)",
              borderRadius: 1,
            }}
          />
          <div
            style={{
              fontSize: 16,
              color: "#8a8578",
              letterSpacing: 2,
              textTransform: "uppercase" as const,
            }}
          >
            Blog
          </div>
          {readingTime && (
            <>
              <div
                style={{
                  width: 2,
                  height: 20,
                  background: "rgba(212,168,83,0.3)",
                  borderRadius: 1,
                }}
              />
              <div
                style={{
                  fontSize: 16,
                  color: "#6b6860",
                }}
              >
                {readingTime} de leitura
              </div>
            </>
          )}
        </div>

        {/* Center: title */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            paddingRight: 80,
          }}
        >
          <div
            style={{
              fontSize: title.length > 50 ? 42 : 52,
              fontWeight: 700,
              color: "#D4A853",
              lineHeight: 1.2,
              textShadow: "0 0 60px rgba(212,168,83,0.2)",
            }}
          >
            {title}
          </div>
        </div>

        {/* Bottom: URL */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: 16,
              color: "rgba(212,168,83,0.4)",
              letterSpacing: 1.5,
            }}
          >
            pocketdm.com.br/blog
          </div>
          <div
            style={{
              padding: "8px 20px",
              borderRadius: 8,
              border: "1px solid rgba(212,168,83,0.25)",
              background: "rgba(212,168,83,0.06)",
              fontSize: 14,
              color: "#c4b890",
            }}
          >
            D&D 5e &bull; Combat Tracker
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
