import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Pocket DM — Combat Tracker D&D 5e";

export default async function OgImage() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  // Load Cinzel 700 for brand consistency (edge runtime has no access to next/font)
  let cinzelData: ArrayBuffer | null = null;
  try {
    const res = await fetch(new URL("/fonts/cinzel-latin-700-normal.woff2", baseUrl));
    if (res.ok) cinzelData = await res.arrayBuffer();
  } catch {
    // font unavailable — fall back to Georgia
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0f0e12 0%, #1a1820 60%, #0f0e12 100%)",
          color: "#e8e4d0",
          fontFamily: "Cinzel, Georgia, serif",
          position: "relative",
        }}
      >
        {/* Subtle border frame */}
        <div
          style={{
            position: "absolute",
            inset: 24,
            border: "2px solid rgba(212,168,83,0.25)",
            borderRadius: 16,
          }}
        />

        {/* Dice icon */}
        <div style={{ fontSize: 96, marginBottom: 24, lineHeight: 1 }}>⚔️</div>

        {/* Brand name */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 700,
            color: "#D4A853",
            letterSpacing: -2,
            marginBottom: 12,
            fontFamily: "Cinzel, Georgia, serif",
          }}
        >
          Pocket DM
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 30,
            color: "#9d9a8a",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          Combat Tracker D&D 5e
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 20,
            color: "#6b6860",
            textAlign: "center",
            maxWidth: 700,
          }}
        >
          Iniciativa, HP e condições em tempo real para mestres de D&D
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: 48,
            fontSize: 18,
            color: "rgba(212,168,83,0.5)",
            letterSpacing: 1,
          }}
        >
          pocketdm.app
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      ...(cinzelData
        ? {
            fonts: [
              {
                name: "Cinzel",
                data: cinzelData,
                weight: 700 as const,
                style: "normal" as const,
              },
            ],
          }
        : {}),
    },
  );
}
