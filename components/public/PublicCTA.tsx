import Link from "next/link";

interface LoreSection {
  overview: string;
  combat: string[];
  world: string[];
  dmTips: string[];
}

interface PublicCTAProps {
  /** Monster/spell name for the lore box title */
  entityName?: string;
  /** Optional lore content — if not provided, only the Pocket DM box shows */
  lore?: LoreSection;
}

export function PublicCTA({ entityName, lore }: PublicCTAProps) {
  return (
    <div className={`mt-8 grid gap-6 ${lore ? "md:grid-cols-2" : "md:grid-cols-1 max-w-xl mx-auto"}`}>
      {/* Box 1: About this creature/spell */}
      {lore && entityName && (
        <div className="rounded-xl bg-gray-800/50 border border-white/[0.06] p-6">
          <h2 className="text-lg font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-3">
            About {entityName}
          </h2>
          <p className="text-gray-300 text-sm mb-4">{lore.overview}</p>

          {lore.combat.length > 0 && (
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-orange-400 mb-1">In Combat</h3>
              <ul className="space-y-1">
                {lore.combat.map((tip, i) => (
                  <li key={i} className="text-gray-400 text-sm flex gap-2">
                    <span className="text-orange-500/60 mt-0.5">&#x2022;</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lore.world.length > 0 && (
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-orange-400 mb-1">In the World</h3>
              <ul className="space-y-1">
                {lore.world.map((tip, i) => (
                  <li key={i} className="text-gray-400 text-sm flex gap-2">
                    <span className="text-orange-500/60 mt-0.5">&#x2022;</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {lore.dmTips.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-orange-400 mb-1">DM Tips</h3>
              <ul className="space-y-1">
                {lore.dmTips.map((tip, i) => (
                  <li key={i} className="text-gray-400 text-sm flex gap-2">
                    <span className="text-orange-500/60 mt-0.5">&#x2022;</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Box 2: What is Pocket DM */}
      <div className="rounded-xl bg-gradient-to-br from-orange-950/30 to-gray-800/50 border border-orange-500/10 p-6 flex flex-col justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-100 font-[family-name:var(--font-cinzel)] mb-3">
            What is Pocket DM?
          </h2>
          <p className="text-gray-300 text-sm mb-2">
            A free D&D 5e combat tracker with real-time initiative, HP tracking,
            conditions, spell management, and more. Run encounters faster — no
            signup required.
          </p>
          <ul className="space-y-1 mb-4">
            <li className="text-gray-400 text-sm flex gap-2">
              <span className="text-orange-500/60">&#x2694;</span>
              <span>Drag-and-drop initiative with auto-roll</span>
            </li>
            <li className="text-gray-400 text-sm flex gap-2">
              <span className="text-orange-500/60">&#x2764;</span>
              <span>HP tracking with damage tiers</span>
            </li>
            <li className="text-gray-400 text-sm flex gap-2">
              <span className="text-orange-500/60">&#x1F4D6;</span>
              <span>Full SRD bestiary and spell compendium</span>
            </li>
            <li className="text-gray-400 text-sm flex gap-2">
              <span className="text-orange-500/60">&#x1F4F1;</span>
              <span>Real-time player connections</span>
            </li>
          </ul>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/try"
            className="flex-1 text-center rounded-lg bg-orange-600 px-4 py-2.5 text-white font-semibold hover:bg-orange-500 transition-colors text-sm"
          >
            Try Combat Tracker
          </Link>
          <Link
            href="/auth/sign-up"
            className="flex-1 text-center rounded-lg border border-orange-500/30 px-4 py-2.5 text-orange-400 font-semibold hover:bg-orange-500/10 transition-colors text-sm"
          >
            Create Free Account
          </Link>
        </div>
      </div>
    </div>
  );
}
