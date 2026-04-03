import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Pocket DM — Master your table.";

export default async function OgImage() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  // Cinzel 700 font
  let cinzelData: ArrayBuffer | null = null;
  try {
    const res = await fetch(new URL("/fonts/cinzel-latin-700-normal.woff2", baseUrl));
    if (res.ok) cinzelData = await res.arrayBuffer();
  } catch { /* fallback to Georgia */ }

  // Crown d20 logo
  let logoDataUri: string | null = null;
  try {
    const res = await fetch(new URL("/art/brand/logo-google-512.png", baseUrl));
    if (res.ok) {
      const buf = await res.arrayBuffer();
      const uint8 = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < uint8.length; i++) {
        binary += String.fromCharCode(uint8[i]);
      }
      logoDataUri = `data:image/png;base64,${btoa(binary)}`;
    }
  } catch { /* no logo */ }

  const features = ["Iniciativa", "HP & Condições", "1200+ Monstros", "750+ Magias"];

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
          background: "linear-gradient(150deg, #0f0e17 0%, #1a1725 45%, #0f0e17 100%)",
          color: "#e8e4d0",
          fontFamily: "Cinzel, Georgia, serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow */}
        <div
          style={{
            position: "absolute",
            top: "40%",
            left: "50%",
            width: 800,
            height: 500,
            background:
              "radial-gradient(ellipse, rgba(212,168,83,0.07) 0%, transparent 65%)",
            transform: "translate(-50%, -55%)",
          }}
        />

        {/* Outer frame */}
        <div
          style={{
            position: "absolute",
            inset: 22,
            border: "1px solid rgba(212,168,83,0.14)",
            borderRadius: 18,
          }}
        />

        {/* Corner — top-left */}
        <div
          style={{
            position: "absolute",
            top: 32,
            left: 32,
            width: 30,
            height: 30,
            borderTop: "2px solid rgba(212,168,83,0.5)",
            borderLeft: "2px solid rgba(212,168,83,0.5)",
            borderRadius: "5px 0 0 0",
          }}
        />
        {/* Corner — top-right */}
        <div
          style={{
            position: "absolute",
            top: 32,
            right: 32,
            width: 30,
            height: 30,
            borderTop: "2px solid rgba(212,168,83,0.5)",
            borderRight: "2px solid rgba(212,168,83,0.5)",
            borderRadius: "0 5px 0 0",
          }}
        />
        {/* Corner — bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: 32,
            width: 30,
            height: 30,
            borderBottom: "2px solid rgba(212,168,83,0.5)",
            borderLeft: "2px solid rgba(212,168,83,0.5)",
            borderRadius: "0 0 0 5px",
          }}
        />
        {/* Corner — bottom-right */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            right: 32,
            width: 30,
            height: 30,
            borderBottom: "2px solid rgba(212,168,83,0.5)",
            borderRight: "2px solid rgba(212,168,83,0.5)",
            borderRadius: "0 0 5px 0",
          }}
        />

        {/* Logo + brand */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 30,
            marginBottom: 20,
          }}
        >
          {logoDataUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoDataUri}
              width={112}
              height={112}
              alt=""
              style={{ borderRadius: 20 }}
            />
          ) : (
            <div style={{ fontSize: 84, lineHeight: 1 }}>🎲</div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                fontSize: 80,
                fontWeight: 700,
                color: "#D4A853",
                letterSpacing: -2,
                lineHeight: 1,
                textShadow: "0 2px 40px rgba(212,168,83,0.22)",
              }}
            >
              Pocket DM
            </div>
            <div
              style={{
                fontSize: 22,
                color: "#8a7f5a",
                letterSpacing: 5,
                fontStyle: "italic",
              }}
            >
              Master your table.
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 560,
            height: 1,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(212,168,83,0.28) 25%, rgba(212,168,83,0.28) 75%, transparent 100%)",
            marginBottom: 26,
          }}
        />

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
          {features.map((label) => (
            <div
              key={label}
              style={{
                padding: "8px 20px",
                borderRadius: 8,
                border: "1px solid rgba(212,168,83,0.2)",
                background: "rgba(212,168,83,0.05)",
                fontSize: 15,
                color: "#a89860",
                letterSpacing: 0.3,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 14,
            color: "rgba(160,157,144,0.45)",
            letterSpacing: 2.5,
            textTransform: "uppercase",
          }}
        >
          Rastreador de Combate · D&D 5e · Combat Tracker
        </div>

        {/* Domain */}
        <div
          style={{
            position: "absolute",
            bottom: 34,
            fontSize: 13,
            color: "rgba(212,168,83,0.38)",
            letterSpacing: 3,
            textTransform: "uppercase",
          }}
        >
          pocketdm.com.br
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
