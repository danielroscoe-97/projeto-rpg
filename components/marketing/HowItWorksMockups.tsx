/* ─── Mini-Mockup Illustrations for "Como Funciona" LP Section ────────────
 *  Each mockup is a tiny, animated representation of the real Pocket DM UI.
 *  Designed to communicate the feature visually without needing to read text.
 *  Animations are CSS-only via globals.css keyframes (mockup-*).
 * ──────────────────────────────────────────────────────────────────────── */

const CARD =
  "mockup-animated w-full rounded-xl border border-gold/[0.12] bg-[#111119] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.4)]";
const CARD_INNER = "relative";

// ── Step 1: Search Compendium ────────────────────────────────────────────

function SearchMockup() {
  const monsters = [
    { name: "Adult Red Dragon", cr: "17", color: "#EF4444", delay: "0.4s", highlight: true },
    { name: "Adult Blue Dragon", cr: "16", color: "#3B82F6", delay: "0.7s" },
    { name: "Adult Green Dragon", cr: "15", color: "#22C55E", delay: "1.0s" },
  ];

  return (
    <div className={CARD}>
      <div className={CARD_INNER}>
        {/* Search bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">
          <svg className="w-3 h-3 text-muted-foreground/60 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <div className="flex items-center gap-px">
            <span className="text-[10px] font-mono text-muted-foreground leading-none">Adult Red Dr</span>
            <span
              className="inline-block w-[1px] h-[11px] bg-gold"
              style={{ animation: "mockup-blink 1s step-end infinite" }}
            />
          </div>
        </div>

        {/* Results */}
        <div className="px-2 py-1.5 space-y-1">
          {monsters.map((m, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2 py-1 rounded"
              style={{
                opacity: 0,
                animation: `mockup-slide-in 0.4s ease-out ${m.delay} forwards`,
                background: m.highlight ? "rgba(212,168,83,0.06)" : "transparent",
                borderLeft: m.highlight ? "2px solid rgba(212,168,83,0.4)" : "2px solid transparent",
              }}
            >
              {/* Token circle */}
              <div
                className="w-4 h-4 rounded-full shrink-0"
                style={{
                  background: `${m.color}20`,
                  border: `1px solid ${m.color}50`,
                  boxShadow: m.highlight ? `0 0 6px ${m.color}30` : "none",
                }}
              />
              {/* Name */}
              <span className="text-[9px] text-[#C8C6C0] truncate flex-1 leading-none">{m.name}</span>
              {/* CR badge */}
              <span
                className="text-[8px] font-mono px-1 py-0.5 rounded-sm leading-none"
                style={{
                  color: "var(--accent-gold)",
                  background: "rgba(212,168,83,0.1)",
                }}
              >
                CR {m.cr}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom stat bar */}
        <div className="flex items-center justify-center gap-3 px-2 py-2 border-t border-white/[0.04] bg-white/[0.015]">
          <span className="text-[10px] text-gold/80 font-mono">1.100+ monstros</span>
          <span className="text-[8px] text-white/20">|</span>
          <span className="text-[10px] text-gold/80 font-mono">604 magias</span>
        </div>
      </div>
    </div>
  );
}

// ── Step 2: Initiative Order ─────────────────────────────────────────────

function InitiativeMockup() {
  const combatants = [
    { init: 18, name: "Goblin Boss", type: "monster", active: true },
    { init: 16, name: "Ragnar", type: "player" },
    { init: 14, name: "Lyra", type: "player" },
    { init: 8, name: "Kael", type: "player" },
  ];

  return (
    <div className={CARD}>
      <div className={CARD_INNER}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.06] bg-white/[0.02]">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none">Iniciativa</span>
          <div className="flex items-center gap-1">
            <svg className="w-[10px] h-[10px] text-gold/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <span className="text-[7px] text-gold/80 font-mono leading-none">auto-sort</span>
          </div>
        </div>

        {/* Combatant rows */}
        <div className="px-2 py-1.5 space-y-[3px]">
          {combatants.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2 py-1 rounded"
              style={{
                opacity: 0,
                animation: `mockup-slide-in 0.35s ease-out ${0.3 + i * 0.15}s forwards`,
                background: c.active ? "rgba(212,168,83,0.08)" : "transparent",
                borderLeft: c.active ? "2px solid rgba(212,168,83,0.5)" : "2px solid transparent",
              }}
            >
              {/* Turn indicator */}
              {c.active && (
                <span
                  className="text-[7px] text-gold leading-none"
                  style={{ animation: "mockup-turn-glow 2s ease-in-out infinite" }}
                >
                  &#9654;
                </span>
              )}
              {/* Init badge */}
              <span
                className="text-[10px] font-mono font-bold w-[18px] text-center leading-none shrink-0"
                style={{ color: c.active ? "var(--accent-gold)" : "var(--text-secondary)" }}
              >
                {c.init}
              </span>
              {/* Token */}
              <div
                className="w-3.5 h-3.5 rounded-full shrink-0"
                style={{
                  background: c.type === "monster" ? "rgba(239,68,68,0.2)" : "rgba(59,130,246,0.2)",
                  border: `1px solid ${c.type === "monster" ? "rgba(239,68,68,0.4)" : "rgba(59,130,246,0.4)"}`,
                }}
              />
              {/* Name */}
              <span className="text-[9px] text-[#C8C6C0] truncate flex-1 leading-none">{c.name}</span>
              {/* Drag handle */}
              <svg className="w-[10px] h-[10px] text-white/20 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
              </svg>
            </div>
          ))}
        </div>

        {/* Bottom hint */}
        <div className="flex items-center justify-center gap-3 px-2 py-2 border-t border-white/[0.04] bg-white/[0.015]">
          <span className="text-[10px] text-gold/80 font-mono">drag &amp; drop</span>
          <span className="text-[8px] text-white/20">|</span>
          <span className="text-[10px] text-gold/80 font-mono">empates resolvidos</span>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Share Link ───────────────────────────────────────────────────

function ShareMockup() {
  return (
    <div className={CARD}>
      <div className={CARD_INNER}>
        {/* Visual: DM laptop → signal → player phone with combat inside */}
        <div className="flex items-center justify-center gap-0 px-3 pt-4 pb-2.5">
          {/* DM laptop */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <svg className="w-9 h-9 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-[9px] text-gold font-mono leading-none">DM</span>
          </div>

          {/* Signal waves + QR */}
          <div className="relative w-[52px] h-[34px] flex items-center justify-center mx-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="absolute w-[18px] h-[18px] rounded-full border border-gold/40"
                style={{
                  animation: `mockup-signal 2.4s ease-out ${i * 0.6}s infinite`,
                }}
              />
            ))}
            <svg className="relative z-10 w-3.5 h-3.5 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="3" height="3" />
              <path d="M21 14h-3v3h3v4h-4v-4" />
            </svg>
          </div>

          {/* Player phone with mini combat inside */}
          <div
            className="shrink-0 rounded-lg border border-[#5B8DEF]/30 bg-[#0A0A0F] overflow-hidden"
            style={{
              width: 92,
              opacity: 0,
              animation: "mockup-slide-in 0.4s ease-out 0.8s forwards",
              boxShadow: "0 0 14px rgba(91,141,239,0.15)",
            }}
          >
            {/* Phone status bar */}
            <div className="flex items-center justify-between px-2 py-[3px] bg-[#5B8DEF]/10">
              <span className="text-[6px] text-[#5B8DEF] font-mono leading-none">Pocket DM</span>
              <span
                className="w-[5px] h-[5px] rounded-full bg-emerald-500"
                style={{ animation: "mockup-blink 2s ease-in-out infinite" }}
              />
            </div>
            {/* Mini combat rows inside phone */}
            <div className="px-1.5 py-1 space-y-[3px]">
              {[
                { name: "Goblin Boss", color: "#EF4444", hp: "100%", hpC: "#22C55E", active: true },
                { name: "Ragnar", color: "#3B82F6", hp: "58%", hpC: "#EAB308" },
                { name: "Lyra", color: "#3B82F6", hp: "87%", hpC: "#22C55E" },
              ].map((p, i) => (
                <div key={i} className="flex items-center gap-1">
                  {p.active && <span className="text-[5px] text-gold leading-none">&#9654;</span>}
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ background: `${p.color}30`, border: `0.5px solid ${p.color}50` }}
                  />
                  <span className="text-[6px] text-[#C8C6C0] truncate flex-1 leading-none">{p.name}</span>
                  <div className="w-[24px] h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: p.hp, background: p.hpC }} />
                  </div>
                </div>
              ))}
            </div>
            {/* Phone home indicator */}
            <div className="flex justify-center py-[3px]">
              <div className="w-7 h-[2px] rounded-full bg-white/10" />
            </div>
          </div>
        </div>

        {/* Bottom: zero friction badges */}
        <div className="flex items-center justify-center gap-3 px-2 py-2 border-t border-white/[0.04] bg-white/[0.015]">
          {["Sem app", "Sem conta", "Sem login"].map((label, i) => (
            <div key={i} className="flex items-center gap-1">
              <svg className="w-3 h-3 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <span className="text-[10px] text-emerald-500/90 leading-none">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Live Combat ──────────────────────────────────────────────────

function CombatMockup() {
  const rows = [
    { name: "Goblin Boss", init: 18, active: true, hpAnimated: true, type: "monster" },
    { name: "Ragnar", init: 16, hpPct: "58%", hpColor: "#EAB308", condition: "Envenenado", condColor: "#A855F7", type: "player" },
    { name: "Lyra", init: 14, hpPct: "87%", hpColor: "#22C55E", condition: "Concentrando", condColor: "#3B82F6", type: "player" },
  ];

  return (
    <div className={CARD}>
      <div className={CARD_INNER}>
        {/* Header with round + live badge */}
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/[0.06] bg-white/[0.02]">
          <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider leading-none">Rodada 3</span>
          <div className="flex items-center gap-1">
            <span
              className="w-[6px] h-[6px] rounded-full bg-red-500"
              style={{ animation: "mockup-blink 1.5s ease-in-out infinite" }}
            />
            <span className="text-[8px] font-mono text-red-400 uppercase leading-none">ao vivo</span>
          </div>
        </div>

        {/* Combatant rows */}
        <div className="px-2 py-1.5 space-y-1">
          {rows.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 px-2 py-1 rounded"
              style={{
                opacity: 0,
                animation: `mockup-slide-in 0.35s ease-out ${0.3 + i * 0.18}s forwards`,
                background: r.active ? "rgba(212,168,83,0.08)" : "transparent",
                borderLeft: r.active ? "2px solid rgba(212,168,83,0.5)" : "2px solid transparent",
              }}
            >
              {/* Turn arrow */}
              {r.active && (
                <span
                  className="text-[6px] text-gold leading-none"
                  style={{ animation: "mockup-turn-glow 2s ease-in-out infinite" }}
                >
                  &#9654;
                </span>
              )}
              {/* Init */}
              <span className="text-[9px] font-mono font-bold w-[16px] text-center leading-none shrink-0" style={{ color: r.active ? "var(--accent-gold)" : "var(--text-tertiary)" }}>
                {r.init}
              </span>
              {/* Token */}
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{
                  background: r.type === "monster" ? "rgba(239,68,68,0.2)" : "rgba(59,130,246,0.2)",
                  border: `1px solid ${r.type === "monster" ? "rgba(239,68,68,0.4)" : "rgba(59,130,246,0.4)"}`,
                }}
              />
              {/* Name */}
              <span className="text-[8px] text-[#C8C6C0] truncate leading-none" style={{ flex: "0 1 auto", minWidth: 0, maxWidth: "52px" }}>{r.name}</span>
              {/* HP bar */}
              <div className="flex-1 h-[5px] bg-white/[0.06] rounded-full overflow-hidden min-w-[28px]">
                <div
                  className="h-full rounded-full"
                  style={
                    r.hpAnimated
                      ? { transformOrigin: "left", animation: "mockup-hp-drain 6s ease-in-out infinite" }
                      : { width: r.hpPct, background: r.hpColor }
                  }
                />
              </div>
              {/* Condition badge */}
              {r.condition && (
                <span
                  className="text-[6px] px-1 py-0.5 rounded-sm leading-none shrink-0"
                  style={{
                    color: r.condColor,
                    background: `${r.condColor}18`,
                    border: `0.5px solid ${r.condColor}30`,
                  }}
                >
                  {r.condition}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Bottom features */}
        <div className="flex items-center justify-center gap-3 px-2 py-2 border-t border-white/[0.04] bg-white/[0.015]">
          <span className="text-[10px] text-gold/80 font-mono">HP</span>
          <span className="text-[8px] text-white/20">|</span>
          <span className="text-[10px] text-gold/80 font-mono">condições</span>
          <span className="text-[8px] text-white/20">|</span>
          <span className="text-[10px] text-gold/80 font-mono">undo/redo</span>
        </div>
      </div>
    </div>
  );
}

// ── Public API ───────────────────────────────────────────────────────────

export function StepMockup({ step }: { step: number }) {
  let content: React.ReactNode;
  switch (step) {
    case 1: content = <SearchMockup />; break;
    case 2: content = <InitiativeMockup />; break;
    case 3: content = <ShareMockup />; break;
    case 4: content = <CombatMockup />; break;
    default: return null;
  }
  return <div aria-hidden="true" role="presentation">{content}</div>;
}
