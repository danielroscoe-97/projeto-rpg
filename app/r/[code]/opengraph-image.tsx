import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import type { CombatReport } from "@/lib/types/combat-report";
import { formatDuration } from "@/lib/utils/combat-stats";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const AWARD_EMOJIS: Record<string, string> = {
  mvp: "\ud83c\udfc6",
  assassin: "\ud83d\udc80",
  tank: "\ud83d\udee1\ufe0f",
  healer: "\ud83d\udc9a",
  crit_king: "\ud83c\udfaf",
  unlucky: "\ud83d\ude2c",
  speedster: "\u26a1",
  slowpoke: "\ud83d\udc22",
};

export default async function OgImage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("combat_reports")
    .select("encounter_name, report_data")
    .eq("short_code", code)
    .maybeSingle();

  if (!data) {
    return new ImageResponse(
      <div style={{ display: "flex", width: "100%", height: "100%", background: "#0a0a0f", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "#666", fontSize: 32 }}>Report not found</p>
      </div>,
      { ...size },
    );
  }

  const report = data.report_data as CombatReport;
  const { awards, summary } = report;
  const mvp = awards.find((a) => a.type === "mvp");
  const topAwards = awards.slice(0, 4);

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "#0a0a0f",
        padding: "48px 60px",
        fontFamily: "Georgia, serif",
      }}
    >
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <p style={{ color: "#D4A853", fontSize: 18, letterSpacing: "0.15em", textTransform: "uppercase" as const }}>
          \u2694\ufe0f Pocket DM \u2014 Combat Recap
        </p>
        <p style={{ color: "#555", fontSize: 16 }}>pocketdm.app</p>
      </div>

      {/* Divider */}
      <div style={{ display: "flex", width: "100%", height: 1, background: "#D4A853", opacity: 0.3, marginTop: 20, marginBottom: 24 }} />

      {/* Encounter name */}
      <p style={{ color: "#fff", fontSize: 42, fontWeight: 700, lineHeight: 1.1 }}>
        {data.encounter_name}
      </p>
      <p style={{ color: "#888", fontSize: 22, marginTop: 8 }}>
        {summary.matchup} \u00b7 {summary.totalRounds} rounds \u00b7 {formatDuration(summary.totalDuration)}
      </p>

      {/* MVP highlight */}
      {mvp && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 32, background: "rgba(212,168,83,0.08)", borderRadius: 16, padding: "16px 24px", border: "1px solid rgba(212,168,83,0.25)" }}>
          <p style={{ fontSize: 36 }}>\ud83c\udfc6</p>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <p style={{ color: "#D4A853", fontSize: 14, textTransform: "uppercase" as const, letterSpacing: "0.1em" }}>MVP</p>
            <p style={{ color: "#fff", fontSize: 28, fontWeight: 700 }}>{mvp.combatantName}</p>
            <p style={{ color: "#aaa", fontSize: 18 }}>{mvp.displayValue}</p>
          </div>
        </div>
      )}

      {/* Other awards */}
      <div style={{ display: "flex", gap: 16, marginTop: 24, flexWrap: "wrap" as const }}>
        {topAwards.filter((a) => a.type !== "mvp").map((award) => (
          <div key={award.type} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "10px 16px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ fontSize: 20 }}>{AWARD_EMOJIS[award.type] ?? "\u2b50"}</p>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <p style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>{award.combatantName}</p>
              <p style={{ color: "#888", fontSize: 13 }}>{award.displayValue}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom stats */}
      <div style={{ display: "flex", gap: 24, marginTop: "auto", color: "#666", fontSize: 16 }}>
        {summary.pcsDown > 0 && <span>\ud83d\udc94 {summary.pcsDown} PCs down</span>}
        {summary.monstersDefeated > 0 && <span>\ud83d\udc80 {summary.monstersDefeated} monsters slain</span>}
        {summary.totalCrits > 0 && <span>\ud83c\udfb2 {summary.totalCrits} crits</span>}
      </div>
    </div>,
    { ...size },
  );
}
