import { ImageResponse } from "next/og";
import {
  getMonsterBySlugPt,
} from "@/lib/srd/srd-data-server";
import monsterNamesPt from "@/data/srd/monster-descriptions-pt.json";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// OG images are generated on-demand (ISR) — no need to pre-render ~776 PNGs at build time.

export default async function MonstroOgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const monster = getMonsterBySlugPt(slug);
  const ptName =
    monster && (monsterNamesPt as Record<string, { name?: string }>)[monster.name]?.name
      ? (monsterNamesPt as Record<string, { name?: string }>)[monster.name].name!
      : monster?.name ?? "Monstro";
  const cr = monster ? `CR ${monster.cr}` : "";
  const typeStr = monster ? `${monster.size} ${monster.type}` : "";
  const ac = monster ? `AC ${monster.armor_class}` : "";
  const hp = monster ? `HP ${monster.hit_points}` : "";

  const pills = [cr, typeStr, ac, hp].filter(Boolean);

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
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -100,
            width: 600,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse, rgba(180,60,60,0.1) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 24,
            border: "1.5px solid rgba(212,168,83,0.15)",
            borderRadius: 12,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{ fontSize: 28, fontWeight: 700, color: "#D4A853", letterSpacing: -0.5 }}
          >
            Pocket DM
          </div>
          <div
            style={{ width: 2, height: 20, background: "rgba(212,168,83,0.3)", borderRadius: 1 }}
          />
          <div
            style={{ fontSize: 16, color: "#8a8578", letterSpacing: 2, textTransform: "uppercase" as const }}
          >
            Bestiário
          </div>
        </div>

        <div
          style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, gap: 20 }}
        >
          <div
            style={{
              fontSize: ptName.length > 30 ? 48 : 60,
              fontWeight: 700,
              color: "#D4A853",
              lineHeight: 1.15,
              textShadow: "0 0 60px rgba(212,168,83,0.2)",
            }}
          >
            {ptName}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {pills.map((label) => (
              <div
                key={label}
                style={{
                  padding: "6px 16px",
                  borderRadius: 6,
                  border: "1px solid rgba(212,168,83,0.2)",
                  background: "rgba(212,168,83,0.05)",
                  fontSize: 15,
                  color: "#a89860",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 16, color: "rgba(212,168,83,0.4)", letterSpacing: 1.5 }}>
            pocketdm.com.br/monstros
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
            D&D 5e &bull; Bestiário SRD
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
