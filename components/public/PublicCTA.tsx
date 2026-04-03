import Link from "next/link";

interface LoreSection {
  overview: string;
  combat: string[];
  world: string[];
  dmTips: string[];
}

interface PublicCTAProps {
  entityName?: string;
  lore?: LoreSection;
  locale?: "en" | "pt-BR";
}

const CTA_LABELS = {
  "en": {
    about: (name: string) => `About ${name}`,
    inCombat: "In Combat",
    inTheWorld: "In the World",
    dmTips: "DM Tips",
    whatIs: "What is Pocket DM?",
    desc: "A free D&D 5e combat tracker with real-time initiative, HP tracking, conditions, spell management, and more. Run encounters faster — no signup required.",
    features: [
      { icon: "⚔", text: "Drag-and-drop initiative with auto-roll" },
      { icon: "❤", text: "HP tracking with damage tiers" },
      { icon: "📖", text: "Full SRD bestiary and spell compendium" },
      { icon: "📱", text: "Real-time player connections" },
    ],
    tryBtn: "Try Combat Tracker",
    signUpBtn: "Create Free Account",
  },
  "pt-BR": {
    about: (name: string) => `Sobre ${name}`,
    inCombat: "Em Combate",
    inTheWorld: "No Mundo",
    dmTips: "Dicas para o Mestre",
    whatIs: "O que é o Pocket DM?",
    desc: "Um rastreador de combate gratuito para D&D 5e com iniciativa em tempo real, controle de PV, condições, gerenciamento de magias e muito mais. Conduza encontros mais rápido — sem cadastro.",
    features: [
      { icon: "⚔", text: "Iniciativa com arrastar e soltar e rolagem automática" },
      { icon: "❤", text: "Controle de PV com indicadores de dano" },
      { icon: "📖", text: "Bestiário e compêndio de magias SRD completos" },
      { icon: "📱", text: "Conexões de jogadores em tempo real" },
    ],
    tryBtn: "Testar o Rastreador",
    signUpBtn: "Criar Conta Gratuita",
  },
} as const;

export function PublicCTA({ entityName, lore, locale = "en" }: PublicCTAProps) {
  const L = CTA_LABELS[locale];

  return (
    <div className={`mt-8 grid gap-6 ${lore ? "md:grid-cols-2" : "md:grid-cols-1 max-w-xl mx-auto"}`}>
      {/* Box 1: About this creature/spell */}
      {lore && entityName && (
        <div className="rounded-xl bg-gray-800/50 border border-white/[0.06] p-6">
          <h2 className="text-lg font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-3">
            {L.about(entityName)}
          </h2>
          <p className="text-gray-300 text-sm mb-4">{lore.overview}</p>

          {lore.combat.length > 0 && (
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-[#D4A853] mb-1">{L.inCombat}</h3>
              <ul className="space-y-1">
                {lore.combat.map((tip, i) => (
                  <li key={i} className="text-gray-400 text-sm flex gap-2">
                    <span className="text-[#D4A853]/60 mt-0.5">&#x2022;</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lore.world.length > 0 && (
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-[#D4A853] mb-1">{L.inTheWorld}</h3>
              <ul className="space-y-1">
                {lore.world.map((tip, i) => (
                  <li key={i} className="text-gray-400 text-sm flex gap-2">
                    <span className="text-[#D4A853]/60 mt-0.5">&#x2022;</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lore.dmTips.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#D4A853] mb-1">{L.dmTips}</h3>
              <ul className="space-y-1">
                {lore.dmTips.map((tip, i) => (
                  <li key={i} className="text-gray-400 text-sm flex gap-2">
                    <span className="text-[#D4A853]/60 mt-0.5">&#x2022;</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Box 2: What is Pocket DM */}
      <div className="rounded-xl bg-gradient-to-br from-[#D4A853]/[0.06] to-gray-800/50 border border-[#D4A853]/10 p-6 flex flex-col justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-3">
            {L.whatIs}
          </h2>
          <p className="text-gray-300 text-sm mb-2">{L.desc}</p>
          <ul className="space-y-1 mb-4">
            {L.features.map((f, i) => (
              <li key={i} className="text-gray-400 text-sm flex gap-2">
                <span className="text-[#D4A853]/60">{f.icon}</span>
                <span>{f.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/try"
            className="flex-1 text-center rounded-lg bg-[#D4A853] px-4 py-2.5 text-white font-semibold hover:bg-[#D4A853]/90 transition-colors text-sm"
          >
            {L.tryBtn}
          </Link>
          <Link
            href="/auth/sign-up"
            className="flex-1 text-center rounded-lg border border-[#D4A853]/30 px-4 py-2.5 text-[#D4A853] font-semibold hover:bg-[#D4A853]/10 transition-colors text-sm"
          >
            {L.signUpBtn}
          </Link>
        </div>
      </div>
    </div>
  );
}
