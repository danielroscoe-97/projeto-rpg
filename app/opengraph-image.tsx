import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Pocket DM — Rastreador de Combate D&D 5e";

export default async function OgImage() {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  let cinzelData: ArrayBuffer | null = null;
  try {
    const res = await fetch(
      new URL("/fonts/cinzel-latin-700-normal.woff2", baseUrl),
    );
    if (res.ok) cinzelData = await res.arrayBuffer();
  } catch {
    /* font unavailable — fall back to Georgia */
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
          background:
            "linear-gradient(160deg, #12111a 0%, #1a1725 40%, #12111a 100%)",
          color: "#e8e4d0",
          fontFamily: "Cinzel, Georgia, serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Radial glow */}
        <div
          style={{
            position: "absolute",
            top: -100,
            left: "50%",
            width: 800,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse, rgba(212,168,83,0.12) 0%, transparent 70%)",
            transform: "translateX(-50%)",
          }}
        />

        {/* Corner accents */}
        <div
          style={{
            position: "absolute",
            inset: 28,
            border: "1.5px solid rgba(212,168,83,0.2)",
            borderRadius: 12,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 38,
            left: 38,
            width: 24,
            height: 24,
            borderTop: "2px solid rgba(212,168,83,0.5)",
            borderLeft: "2px solid rgba(212,168,83,0.5)",
            borderRadius: "4px 0 0 0",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 38,
            right: 38,
            width: 24,
            height: 24,
            borderTop: "2px solid rgba(212,168,83,0.5)",
            borderRight: "2px solid rgba(212,168,83,0.5)",
            borderRadius: "0 4px 0 0",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 38,
            left: 38,
            width: 24,
            height: 24,
            borderBottom: "2px solid rgba(212,168,83,0.5)",
            borderLeft: "2px solid rgba(212,168,83,0.5)",
            borderRadius: "0 0 0 4px",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 38,
            right: 38,
            width: 24,
            height: 24,
            borderBottom: "2px solid rgba(212,168,83,0.5)",
            borderRight: "2px solid rgba(212,168,83,0.5)",
            borderRadius: "0 0 4px 0",
          }}
        />

        {/* D20 symbol */}
        <div
          style={{
            fontSize: 48,
            marginBottom: 16,
            opacity: 0.9,
          }}
        >
          🎲
        </div>

        {/* Brand */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            color: "#D4A853",
            letterSpacing: -1,
            marginBottom: 8,
            textShadow: "0 0 60px rgba(212,168,83,0.3)",
          }}
        >
          Pocket DM
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 28,
            color: "#a09d90",
            marginBottom: 32,
            textAlign: "center",
            letterSpacing: 2,
          }}
        >
          RASTREADOR DE COMBATE D&D 5e
        </div>

        {/* Feature pills */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 24,
          }}
        >
          {["Iniciativa", "HP & Condições", "3000+ Monstros", "900+ Magias"].map(
            (label) => (
              <div
                key={label}
                style={{
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "1px solid rgba(212,168,83,0.25)",
                  background: "rgba(212,168,83,0.06)",
                  fontSize: 16,
                  color: "#c4b890",
                  letterSpacing: 0.5,
                }}
              >
                {label}
              </div>
            ),
          )}
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 18,
            color: "#6b6860",
            textAlign: "center",
          }}
        >
          Gratuito &bull; Sem cadastro &bull; Tempo real no celular dos jogadores
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: 42,
            fontSize: 16,
            color: "rgba(212,168,83,0.45)",
            letterSpacing: 2,
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
