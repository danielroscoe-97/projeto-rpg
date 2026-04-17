import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicRulesReference } from "@/components/public/PublicRulesReference";
import { PublicCTA } from "@/components/public/PublicCTA";
import { PublicFooter } from "@/components/public/PublicFooter";

// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "D&D 5e Rules Reference — Combat, Resting, Spellcasting",
  description:
    "Complete D&D 5e rules reference: combat flow, attack rolls, damage & healing, cover, resting, conditions, and spellcasting basics. Free SRD 5.1 quick reference for your table.",
  openGraph: {
    title: "D&D 5e Rules Reference — Combat, Resting, Spellcasting",
    description:
      "Complete D&D 5e rules reference with visual diagrams, interactive death save tracker, and cover guide. Free SRD 5.1 content.",
    type: "website",
    url: "/rules",
  },
  twitter: {
    card: "summary_large_image",
    title: "D&D 5e Rules Reference — Combat, Resting, Spellcasting",
    description:
      "Complete D&D 5e rules reference with visual diagrams and interactive tools. Free SRD 5.1 content.",
  },
  alternates: {
    canonical: "/rules",
    languages: {
      en: "/rules",
      "pt-BR": "/regras",
    },
  },
};

export const revalidate = 86400;

// ── JSON-LD (FAQPage schema for rich snippets) ────────────────────
function RulesJsonLd() {
  const faqs = [
    {
      q: "How does combat flow work in D&D 5e?",
      a: "At the start of combat, each participant makes a Dexterity check (initiative) to determine turn order. On your turn, you can move up to your speed, take one action (Attack, Cast a Spell, Dash, Dodge, Disengage, Help, Hide, Ready, Search, or Use an Object), a bonus action if available, and one free object interaction. You also get one reaction per round.",
    },
    {
      q: "How do attack rolls work in D&D 5e?",
      a: "Roll a d20, add your ability modifier and proficiency bonus. If the total equals or exceeds the target's Armor Class (AC), the attack hits. A natural 20 is a critical hit (double damage dice), and a natural 1 is an automatic miss.",
    },
    {
      q: "How do death saving throws work in D&D 5e?",
      a: "When you drop to 0 HP, roll a d20 at the start of each turn with no modifiers. A 10 or higher is a success, 9 or lower is a failure. Three successes stabilize you, three failures mean death. A natural 20 means you regain 1 HP. A natural 1 counts as two failures. Instant death occurs if remaining damage equals or exceeds your HP maximum.",
    },
    {
      q: "What types of cover exist in D&D 5e?",
      a: "Half cover provides +2 to AC and DEX saves (low wall, furniture, another creature). Three-quarters cover provides +5 to AC and DEX saves (portcullis, arrow slit). Full cover means you can't be targeted directly by attacks or spells.",
    },
    {
      q: "What is the difference between a short rest and a long rest in D&D 5e?",
      a: "A short rest is 1+ hours where you can spend Hit Dice to regain HP (roll die + CON modifier per die spent). A long rest is 8+ hours (6 sleep + 2 light activity) where you regain all HP, recover spent Hit Dice (up to half your total), and restore spell slots. You can only benefit from one long rest per 24 hours.",
    },
    {
      q: "How does concentration work for spells in D&D 5e?",
      a: "You can only concentrate on one spell at a time. When you take damage while concentrating, make a CON save (DC is 10 or half the damage, whichever is higher). Failure means the spell ends. Being incapacitated or killed also ends concentration.",
    },
    {
      q: "What are spell components in D&D 5e?",
      a: "Spells may require Verbal (V) components (speaking words), Somatic (S) components (gestures with a free hand), or Material (M) components (specific items, which can often be replaced by an arcane focus or component pouch).",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name: "D&D 5e Rules Reference",
    description:
      "Complete rules reference for Dungeons & Dragons 5th Edition, covering combat, attacks, damage, cover, resting, conditions, and spellcasting.",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "/",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function RulesPage() {
  return (
    <>
      <RulesJsonLd />

      <div className="min-h-screen bg-background">
        <PublicNav breadcrumbs={[{ label: "Rules Reference" }]} />

        <main className="mx-auto max-w-5xl px-4 py-8">
          <PublicRulesReference locale="en" />

          <div className="mt-12">
            <PublicCTA entityName="D&D 5e Rules" locale="en" />
          </div>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
