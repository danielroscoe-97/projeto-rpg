import { cn } from "@/lib/utils";
import { Swords } from "lucide-react";
import type { SVGProps } from "react";

// ─── Inline SVG components (currentColor = inherits text color) ──────────────

function BarbarianIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M6.5 1C4 2.5 3 5.5 3.5 8.5c.4 2 1.5 3.8 3.2 4.8L12 16.5l5.3-2.7c1.7-1 2.8-2.8 3.2-4.8.5-3-.5-6-3-7.5L12 3 6.5 1z"/>
      <rect x="10.75" y="15" width="2.5" height="7" rx="0.75"/>
    </svg>
  );
}

function BardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M7 22a1 1 0 0 1-1-1V9a7 7 0 0 1 7-7c2.2 0 4 1.8 4 4v2h-1.5V6c0-1.4-1.1-2.5-2.5-2.5A5.5 5.5 0 0 0 7.5 9v12a.5.5 0 0 1-.5.5z"/>
      <path d="M16.5 6c.8 0 1.5.7 1.5 1.5 0 4-2 7.3-4.5 9.8L12 19l6-1c1.5-2.5 2.5-5.5 2.5-9 0-1.7-1.3-3-3-3h-1v-.5z" opacity="0.7"/>
      <line x1="8" y1="10" x2="14" y2="8" stroke="currentColor" strokeWidth="0.7" opacity="0.4"/>
      <line x1="8" y1="13" x2="13.5" y2="10.5" stroke="currentColor" strokeWidth="0.7" opacity="0.4"/>
      <line x1="8" y1="16" x2="12.5" y2="13.5" stroke="currentColor" strokeWidth="0.7" opacity="0.4"/>
    </svg>
  );
}

function ClericIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <circle cx="12" cy="12" r="4.5"/>
      <rect x="11" y="1.5" width="2" height="4" rx="1"/>
      <rect x="11" y="18.5" width="2" height="4" rx="1"/>
      <rect x="1.5" y="11" width="4" height="2" rx="1"/>
      <rect x="18.5" y="11" width="4" height="2" rx="1"/>
      <path d="M4.9 4.9l2.5 2.5M16.6 16.6l2.5 2.5M4.9 19.1l2.5-2.5M16.6 7.4l2.5-2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

function DruidIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <ellipse cx="12" cy="15.5" rx="5" ry="5.5"/>
      <circle cx="7" cy="7.5" r="2"/>
      <circle cx="10.5" cy="5" r="2"/>
      <circle cx="15" cy="5.5" r="1.8"/>
      <circle cx="18" cy="8.5" r="1.6"/>
    </svg>
  );
}

function FighterIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M14.5 2L4 12.5l1.8 1.8L16.3 3.8 14.5 2z"/>
      <path d="M3.3 13.2l.7-.7 2.5 2.5-.7.7-2.5-2.5z"/>
      <path d="M2.5 14.5l1 3 2-2-1-1h-2z"/>
      <path d="M9.5 2L20 12.5l-1.8 1.8L7.7 3.8 9.5 2z"/>
      <path d="M20.7 13.2l-.7-.7-2.5 2.5.7.7 2.5-2.5z"/>
      <path d="M21.5 14.5l-1 3-2-2 1-1h2z"/>
    </svg>
  );
}

function MonkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M6.5 11.5C6.5 10.1 7.6 9 9 9V7.5C9 6.7 9.7 6 10.5 6s1.5.7 1.5 1.5V7c0-.8.7-1.5 1.5-1.5S15 6.2 15 7v2c0-.8.7-1.5 1.5-1.5s1.5.7 1.5 1.5v5c0 3.3-2.7 6-6 6h-1c-2.8 0-5-2.2-5-5v-2c0-.8.4-1.5 1-2z"/>
      <path d="M9 9v2.5M11 7.5v4M13 7v4.5M15 7.5v4" stroke="currentColor" strokeWidth="0.6" opacity="0.15"/>
    </svg>
  );
}

function PaladinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2L4 6v5c0 5.5 3.4 10.3 8 12 4.6-1.7 8-6.5 8-12V6l-8-4z"/>
      <rect x="10.75" y="7" width="2.5" height="10" rx="0.5" opacity="0.25"/>
      <rect x="8" y="9.75" width="8" height="2.5" rx="0.5" opacity="0.25"/>
    </svg>
  );
}

function RangerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M4 20C4 12 8 4 16 2" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <line x1="3" y1="21" x2="19" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M19 5l2-3-4 1 2 2z"/>
      <path d="M3 21l1.5-.5-.5 1.5-1-1z"/>
    </svg>
  );
}

function RogueIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2l3 3-7.5 7.5 2 2L17 7l3 3 1-8-9 0z"/>
      <path d="M8 11l-3 5.5 5.5-2.5-2.5-3z" opacity="0.7"/>
      <path d="M5 16.5l-2 5 5-2-1.5-1.5L5 16.5z"/>
    </svg>
  );
}

function SorcererIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2C8 6 6 9 6 13a6 6 0 0 0 12 0c0-4-2-7-6-11z"/>
      <path d="M12 5c-2.5 3-4 5.5-4 8a4 4 0 0 0 8 0c0-2.5-1.5-5-4-8z" opacity="0.2"/>
      <path d="M12 9c-1.5 2-2.5 3.5-2.5 5.5a2.5 2.5 0 0 0 5 0c0-2-1-3.5-2.5-5.5z" opacity="0.3"/>
    </svg>
  );
}

function WarlockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 4C6 4 2 12 2 12s4 8 10 8 10-8 10-8-4-8-10-8z"/>
      <circle cx="12" cy="12" r="4.5" opacity="0.2"/>
      <circle cx="12" cy="12" r="2.5"/>
      <ellipse cx="12" cy="12" rx="0.75" ry="3.5" opacity="0.35"/>
    </svg>
  );
}

function WizardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M2 4c0-1 1-2 3-2 3 0 5 1 7 3 2-2 4-3 7-3 2 0 3 1 3 2v14c0 1-1 1.5-2 1.5-2.5 0-4.5 1-6 2.5h-4c-1.5-1.5-3.5-2.5-6-2.5-1 0-2-.5-2-1.5V4z"/>
      <path d="M12 5v16" stroke="currentColor" strokeWidth="0.5" opacity="0.2"/>
      <path d="M3 4.5c2.5 0 5 .8 7 2.5v13c-2-1.5-4.5-2.5-7-2.5V4.5z" opacity="0.15"/>
      <path d="M21 4.5c-2.5 0-5 .8-7 2.5v13c2-1.5 4.5-2.5 7-2.5V4.5z" opacity="0.15"/>
      <line x1="5" y1="8" x2="10" y2="8" stroke="currentColor" strokeWidth="0.6" opacity="0.15"/>
      <line x1="5" y1="10.5" x2="10" y2="10.5" stroke="currentColor" strokeWidth="0.6" opacity="0.15"/>
      <line x1="5" y1="13" x2="10" y2="13" stroke="currentColor" strokeWidth="0.6" opacity="0.15"/>
      <line x1="14" y1="8" x2="19" y2="8" stroke="currentColor" strokeWidth="0.6" opacity="0.15"/>
      <line x1="14" y1="10.5" x2="19" y2="10.5" stroke="currentColor" strokeWidth="0.6" opacity="0.15"/>
      <line x1="14" y1="13" x2="19" y2="13" stroke="currentColor" strokeWidth="0.6" opacity="0.15"/>
    </svg>
  );
}

// ─── Icon registry ───────────────────────────────────────────────────────────

const CLASS_ICONS: Record<string, React.FC<SVGProps<SVGSVGElement>>> = {
  barbarian: BarbarianIcon,
  bard: BardIcon,
  cleric: ClericIcon,
  druid: DruidIcon,
  fighter: FighterIcon,
  monk: MonkIcon,
  paladin: PaladinIcon,
  ranger: RangerIcon,
  rogue: RogueIcon,
  sorcerer: SorcererIcon,
  warlock: WarlockIcon,
  wizard: WizardIcon,
};

// ─── Aliases (PT-BR → EN key) ────────────────────────────────────────────────

const CLASS_NAME_ALIASES: Record<string, string> = {
  barbarian: "barbarian", bard: "bard", cleric: "cleric", druid: "druid",
  fighter: "fighter", monk: "monk", paladin: "paladin", ranger: "ranger",
  rogue: "rogue", sorcerer: "sorcerer", warlock: "warlock", wizard: "wizard",
  // PT-BR
  "bárbaro": "barbarian", barbaro: "barbarian", bardo: "bard",
  "clérigo": "cleric", clerigo: "cleric", druida: "druid",
  guerreiro: "fighter", monge: "monk", paladino: "paladin",
  patrulheiro: "ranger", ladino: "rogue", "feiticeiro": "sorcerer",
  bruxo: "warlock", mago: "wizard",
};

export function normalizeClassName(name: string | null | undefined): string | null {
  if (!name) return null;
  const key = name.toLowerCase().trim();
  return CLASS_NAME_ALIASES[key] ?? null;
}

export const ALL_CLASSES = Object.keys(CLASS_ICONS);

// ─── Display names (EN) ──────────────────────────────────────────────────────

export const CLASS_DISPLAY_NAMES: Record<string, string> = {
  barbarian: "Barbarian", bard: "Bard", cleric: "Cleric", druid: "Druid",
  fighter: "Fighter", monk: "Monk", paladin: "Paladin", ranger: "Ranger",
  rogue: "Rogue", sorcerer: "Sorcerer", warlock: "Warlock", wizard: "Wizard",
};

// ─── Public components ───────────────────────────────────────────────────────

interface ClassIconProps {
  /** Class name (English or Portuguese) */
  characterClass?: string | null;
  /** Icon size in px */
  size?: number;
  /** Extra Tailwind classes */
  className?: string;
}

/**
 * Renders an inline SVG class icon. Inherits text color from parent.
 * Wrap with `text-amber-400` for gold.
 */
export function ClassIcon({ characterClass, size = 24, className: cssClass }: ClassIconProps) {
  const normalized = normalizeClassName(characterClass);
  const IconComponent = normalized ? CLASS_ICONS[normalized] : null;

  if (!IconComponent) {
    return <Swords className={cn("opacity-50", cssClass)} style={{ width: size, height: size }} />;
  }

  return <IconComponent className={cssClass} style={{ width: size, height: size }} />;
}
