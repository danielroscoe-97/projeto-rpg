"use client";

import type { RulesetVersion } from "@/lib/types/database";

interface RulesetSelectorProps {
  value: RulesetVersion;
  onChange: (version: RulesetVersion) => void;
  label?: string;
  disabled?: boolean;
}

const VERSIONS: RulesetVersion[] = ["2014", "2024"];

export function RulesetSelector({
  value,
  onChange,
  label = "Ruleset:",
  disabled = false,
}: RulesetSelectorProps) {
  return (
    <div className="flex items-center gap-3">
      {label && (
        <span className="text-white/60 text-sm shrink-0">{label}</span>
      )}
      <div className="flex gap-1" role="group" aria-label="Ruleset version">
        {VERSIONS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            disabled={disabled}
            aria-pressed={value === v}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              value === v
                ? "bg-[#e94560] text-white"
                : "bg-white/10 text-white/60 hover:bg-white/20"
            }`}
            data-testid={`ruleset-btn-${v}`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Small inline version badge for use in search results and combatant rows. */
export function VersionBadge({ version }: { version: RulesetVersion }) {
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-white/10 text-white/50"
      aria-label={`Ruleset ${version}`}
    >
      {version}
    </span>
  );
}
