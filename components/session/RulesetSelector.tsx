"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
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
  label,
  disabled = false,
}: RulesetSelectorProps) {
  const t = useTranslations("session");
  const resolvedLabel = label ?? t("ruleset_label");
  return (
    <div className="flex items-center gap-3">
      {resolvedLabel && (
        <span className="text-muted-foreground text-sm shrink-0">{resolvedLabel}</span>
      )}
      <div className="flex gap-1" role="group" aria-label="Ruleset version">
        {VERSIONS.map((v) => (
          <Button
            key={v}
            variant={value === v ? "gold" : "ghost"}
            size="sm"
            onClick={() => onChange(v)}
            disabled={disabled}
            aria-pressed={value === v}
            className={value !== v ? "bg-white/[0.06] text-muted-foreground hover:bg-white/[0.1]" : undefined}
            data-testid={`ruleset-btn-${v}`}
          >
            {v}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** Small inline version badge for use in search results and combatant rows. */
export function VersionBadge({ version }: { version: RulesetVersion }) {
  return (
    <span
      className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-white/[0.06] text-muted-foreground"
      aria-label={`Ruleset ${version}`}
    >
      {version}
    </span>
  );
}
