/* ─── Mini-Mockup Illustrations for "Compêndio" LP Section ───────────────
 *  Each mockup is a tiny, animated representation of a compendium page.
 *  Follows the same pattern as HowItWorksMockups.tsx — CSS-only animations.
 * ──────────────────────────────────────────────────────────────────────── */

const CARD =
  "mockup-animated w-full rounded-xl border border-gold/[0.12] bg-[#111119] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.4)]";
const CARD_INNER = "relative flex flex-col";
const CARD_CONTENT = "px-2.5 py-2 space-y-1 flex-1";
const CARD_FOOTER =
  "flex items-center justify-center gap-3 px-2.5 py-2 border-t border-white/[0.04] bg-white/[0.015] mt-auto";

// ── Monsters: Mini Bestiary ─────────────────────────────────────────────

function MonstersMockup() {
  const monsters = [
    { name: "Adult Red Dragon", cr: "17", type: "Dragon", color: "#EF4444", delay: "0.4s", highlight: true },
    { name: "Beholder", cr: "13", type: "Aberration", color: "#A855F7", delay: "0.7s" },
    { name: "Lich", cr: "21", type: "Undead", color: "#22C55E", delay: "1.0s" },
  ];

  return (
    <div className={CARD}>
      <div className={CARD_INNER}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none">Bestiário</span>
          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-sm leading-none text-gold bg-gold/10">
            1.100+
          </span>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/[0.04]">
          {["CR 0-4", "CR 5-10", "CR 11+"].map((f, i) => (
            <span
              key={i}
              className="text-[7px] px-1.5 py-0.5 rounded-full leading-none"
              style={{
                color: i === 2 ? "var(--accent-gold)" : "var(--text-tertiary)",
                background: i === 2 ? "rgba(212,168,83,0.1)" : "rgba(255,255,255,0.04)",
                border: i === 2 ? "0.5px solid rgba(212,168,83,0.3)" : "0.5px solid rgba(255,255,255,0.06)",
              }}
            >
              {f}
            </span>
          ))}
        </div>

        {/* Monster rows */}
        <div className={CARD_CONTENT}>
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
              {/* Token */}
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
              {/* Type */}
              <span className="text-[7px] text-[#5C5A65] leading-none hidden sm:inline">{m.type}</span>
              {/* CR */}
              <span className="text-[8px] font-mono px-1 py-0.5 rounded-sm leading-none text-gold bg-gold/10">
                CR {m.cr}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className={CARD_FOOTER}>
          <span className="text-[10px] text-gold/80 font-mono">SRD 5.1</span>
          <span className="text-[8px] text-white/20">|</span>
          <span className="text-[10px] text-gold/80 font-mono">SRD 2024</span>
          <span className="text-[8px] text-white/20">|</span>
          <span className="text-[10px] text-gold/80 font-mono">MAD</span>
        </div>
      </div>
    </div>
  );
}

// ── Spells: Mini Spell List ─────────────────────────────────────────────

function SpellsMockup() {
  const spells = [
    { name: "Fireball", level: "3rd", school: "Evocation", schoolColor: "#EF4444", delay: "0.4s", highlight: true },
    { name: "Shield", level: "1st", school: "Abjuration", schoolColor: "#3B82F6", delay: "0.7s" },
    { name: "Counterspell", level: "3rd", school: "Abjuration", schoolColor: "#3B82F6", delay: "1.0s" },
  ];

  return (
    <div className={CARD}>
      <div className={CARD_INNER}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none">Grimório</span>
          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-sm leading-none text-[#A855F7] bg-[#A855F7]/10">
            600+
          </span>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/[0.04]">
          {[
            { label: "Nível", active: false },
            { label: "Escola", active: true },
            { label: "Classe", active: false },
          ].map((f, i) => (
            <span
              key={i}
              className="text-[7px] px-1.5 py-0.5 rounded-full leading-none"
              style={{
                color: f.active ? "#A855F7" : "var(--text-tertiary)",
                background: f.active ? "rgba(168,85,247,0.1)" : "rgba(255,255,255,0.04)",
                border: f.active ? "0.5px solid rgba(168,85,247,0.3)" : "0.5px solid rgba(255,255,255,0.06)",
              }}
            >
              {f.label}
            </span>
          ))}
        </div>

        {/* Spell rows */}
        <div className={CARD_CONTENT}>
          {spells.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2 py-1 rounded"
              style={{
                opacity: 0,
                animation: `mockup-slide-in 0.4s ease-out ${s.delay} forwards`,
                background: s.highlight ? "rgba(168,85,247,0.06)" : "transparent",
                borderLeft: s.highlight ? "2px solid rgba(168,85,247,0.4)" : "2px solid transparent",
              }}
            >
              {/* Level circle */}
              <div
                className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[7px] font-mono font-bold leading-none"
                style={{
                  color: s.highlight ? "#A855F7" : "var(--text-secondary)",
                  background: s.highlight ? "rgba(168,85,247,0.15)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${s.highlight ? "rgba(168,85,247,0.3)" : "rgba(255,255,255,0.08)"}`,
                }}
              >
                {s.level[0]}
              </div>
              {/* Name */}
              <span className="text-[9px] text-[#C8C6C0] truncate flex-1 leading-none">{s.name}</span>
              {/* School badge */}
              <span
                className="text-[7px] px-1 py-0.5 rounded-sm leading-none"
                style={{
                  color: s.schoolColor,
                  background: `${s.schoolColor}15`,
                  border: `0.5px solid ${s.schoolColor}30`,
                }}
              >
                {s.school}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className={CARD_FOOTER}>
          <span className="text-[10px] text-[#A855F7]/80 font-mono">cantrip → 9th</span>
          <span className="text-[8px] text-white/20">|</span>
          <span className="text-[10px] text-[#A855F7]/80 font-mono">8 escolas</span>
        </div>
      </div>
    </div>
  );
}

// ── Classes: Mini Class Cards ───────────────────────────────────────────

function ClassesMockup() {
  const classes = [
    { name: "Fighter", hitDie: "d10", role: "Martial", roleColor: "#EF4444", delay: "0.4s", highlight: true },
    { name: "Wizard", hitDie: "d6", role: "Caster", roleColor: "#3B82F6", delay: "0.7s" },
    { name: "Cleric", hitDie: "d8", role: "Support", roleColor: "#22C55E", delay: "1.0s" },
  ];

  return (
    <div className={CARD}>
      <div className={CARD_INNER}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none">Classes</span>
          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-sm leading-none text-gold bg-gold/10">
            12
          </span>
        </div>

        {/* Role filter */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/[0.04]">
          {[
            { label: "Todas", active: true },
            { label: "Martial", active: false },
            { label: "Caster", active: false },
          ].map((f, i) => (
            <span
              key={i}
              className="text-[7px] px-1.5 py-0.5 rounded-full leading-none"
              style={{
                color: f.active ? "var(--accent-gold)" : "var(--text-tertiary)",
                background: f.active ? "rgba(212,168,83,0.1)" : "rgba(255,255,255,0.04)",
                border: f.active ? "0.5px solid rgba(212,168,83,0.3)" : "0.5px solid rgba(255,255,255,0.06)",
              }}
            >
              {f.label}
            </span>
          ))}
        </div>

        {/* Class rows */}
        <div className={CARD_CONTENT}>
          {classes.map((c, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2 py-1 rounded"
              style={{
                opacity: 0,
                animation: `mockup-slide-in 0.4s ease-out ${c.delay} forwards`,
                background: c.highlight ? "rgba(212,168,83,0.06)" : "transparent",
                borderLeft: c.highlight ? "2px solid rgba(212,168,83,0.4)" : "2px solid transparent",
              }}
            >
              {/* Class icon placeholder */}
              <div
                className="w-4 h-4 rounded shrink-0 flex items-center justify-center"
                style={{
                  background: `${c.roleColor}15`,
                  border: `1px solid ${c.roleColor}30`,
                }}
              >
                <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke={c.roleColor} strokeWidth="2.5">
                  {c.role === "Martial" && <path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 7l4-4 4 4-4 4" />}
                  {c.role === "Caster" && <path d="M12 2L9 12l-7 3 7 3 3 4 3-4 7-3-7-3z" />}
                  {c.role === "Support" && <path d="M12 2v4m0 12v4M2 12h4m12 0h4m-3.5-6.5l-2.8 2.8m-5.4 5.4l-2.8 2.8m0-11l2.8 2.8m5.4 5.4l2.8 2.8" />}
                </svg>
              </div>
              {/* Name */}
              <span className="text-[9px] text-[#C8C6C0] truncate flex-1 leading-none">{c.name}</span>
              {/* Hit Die */}
              <span className="text-[8px] font-mono text-muted-foreground leading-none">{c.hitDie}</span>
              {/* Role badge */}
              <span
                className="text-[7px] px-1 py-0.5 rounded-sm leading-none"
                style={{
                  color: c.roleColor,
                  background: `${c.roleColor}15`,
                  border: `0.5px solid ${c.roleColor}30`,
                }}
              >
                {c.role}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className={CARD_FOOTER}>
          <span className="text-[10px] text-gold/80 font-mono">hit dice</span>
          <span className="text-[8px] text-white/20">|</span>
          <span className="text-[10px] text-gold/80 font-mono">subclasses</span>
          <span className="text-[8px] text-white/20">|</span>
          <span className="text-[10px] text-gold/80 font-mono">proficiências</span>
        </div>
      </div>
    </div>
  );
}

// ── Races: Mini Race Cards ──────────────────────────────────────────────

function RacesMockup() {
  const races = [
    { name: "Elf", bonus: "+2 DEX", trait: "Darkvision", color: "#22C55E", delay: "0.4s", highlight: true },
    { name: "Dwarf", bonus: "+2 CON", trait: "Resistance", color: "#F97316", delay: "0.7s" },
    { name: "Tiefling", bonus: "+2 CHA", trait: "Hellish Rebuke", color: "#A855F7", delay: "1.0s" },
  ];

  return (
    <div className={CARD}>
      <div className={CARD_INNER}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">
          <span className="text-[9px] text-muted-foreground uppercase tracking-wider leading-none">Raças</span>
          <span className="text-[8px] font-mono px-1.5 py-0.5 rounded-sm leading-none text-[#22C55E] bg-[#22C55E]/10">
            9
          </span>
        </div>

        {/* Ability filter */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-white/[0.04]">
          {[
            { label: "Todas", active: true },
            { label: "+STR", active: false },
            { label: "+DEX", active: false },
          ].map((f, i) => (
            <span
              key={i}
              className="text-[7px] px-1.5 py-0.5 rounded-full leading-none"
              style={{
                color: f.active ? "#22C55E" : "var(--text-tertiary)",
                background: f.active ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)",
                border: f.active ? "0.5px solid rgba(34,197,94,0.3)" : "0.5px solid rgba(255,255,255,0.06)",
              }}
            >
              {f.label}
            </span>
          ))}
        </div>

        {/* Race rows */}
        <div className={CARD_CONTENT}>
          {races.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-2 py-1 rounded"
              style={{
                opacity: 0,
                animation: `mockup-slide-in 0.4s ease-out ${r.delay} forwards`,
                background: r.highlight ? "rgba(34,197,94,0.06)" : "transparent",
                borderLeft: r.highlight ? "2px solid rgba(34,197,94,0.4)" : "2px solid transparent",
              }}
            >
              {/* Initial circle */}
              <div
                className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold leading-none"
                style={{
                  color: r.color,
                  background: `${r.color}15`,
                  border: `1px solid ${r.color}30`,
                }}
              >
                {r.name[0]}
              </div>
              {/* Name */}
              <span className="text-[9px] text-[#C8C6C0] truncate flex-1 leading-none">{r.name}</span>
              {/* Ability bonus */}
              <span className="text-[7px] font-mono text-gold leading-none">{r.bonus}</span>
              {/* Trait */}
              <span
                className="text-[7px] px-1 py-0.5 rounded-sm leading-none hidden sm:inline"
                style={{
                  color: r.color,
                  background: `${r.color}15`,
                  border: `0.5px solid ${r.color}30`,
                }}
              >
                {r.trait}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className={CARD_FOOTER}>
          <span className="text-[10px] text-[#22C55E]/80 font-mono">traços</span>
          <span className="text-[8px] text-white/20">|</span>
          <span className="text-[10px] text-[#22C55E]/80 font-mono">bônus</span>
          <span className="text-[8px] text-white/20">|</span>
          <span className="text-[10px] text-[#22C55E]/80 font-mono">habilidades</span>
        </div>
      </div>
    </div>
  );
}

// ── Public API ───────────────────────────────────────────────────────────

export function CompendiumMockup({ type }: { type: "monsters" | "spells" | "classes" | "races" }) {
  let content: React.ReactNode;
  switch (type) {
    case "monsters": content = <MonstersMockup />; break;
    case "spells": content = <SpellsMockup />; break;
    case "classes": content = <ClassesMockup />; break;
    case "races": content = <RacesMockup />; break;
    default: return null;
  }
  return <div aria-hidden="true" role="presentation">{content}</div>;
}
