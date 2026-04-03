"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Dices } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useSrdStore } from "@/lib/stores/srd-store";
import { generateEncounter, type GeneratedEncounter, type EncounterGeneratorInput } from "@/lib/encounter-generator/generate-encounter";
import { ALL_ENVIRONMENTS, ENVIRONMENT_ICONS, type EncounterEnvironment } from "@/lib/encounter-generator/environment-map";
import type { DifficultyLevel, FormulaVersion } from "@/lib/utils/cr-calculator";
import type { RulesetVersion } from "@/lib/types/database";
import type { SrdMonster } from "@/lib/srd/srd-loader";

interface EncounterGeneratorDialogProps {
  rulesetVersion: RulesetVersion;
  onUseEncounter: (monsters: Array<{ monster: SrdMonster; count: number }>) => void;
}

const DIFFICULTIES: { key: DifficultyLevel; color: string }[] = [
  { key: "easy", color: "bg-green-600/80 hover:bg-green-600" },
  { key: "medium", color: "bg-yellow-600/80 hover:bg-yellow-600" },
  { key: "hard", color: "bg-orange-600/80 hover:bg-orange-600" },
  { key: "deadly", color: "bg-red-600/80 hover:bg-red-600" },
];

const DIFFICULTY_BADGE_COLORS: Record<DifficultyLevel, string> = {
  easy: "bg-green-600/20 text-green-400 border-green-600/30",
  medium: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
  hard: "bg-orange-600/20 text-orange-400 border-orange-600/30",
  deadly: "bg-red-600/20 text-red-400 border-red-600/30",
};

export function EncounterGeneratorDialog({ rulesetVersion, onUseEncounter }: EncounterGeneratorDialogProps) {
  const t = useTranslations("encounter_generator");
  const monsters = useSrdStore((s) => s.monsters);

  const [open, setOpen] = useState(false);
  const [environment, setEnvironment] = useState<EncounterEnvironment>("dungeon");
  const [partyLevel, setPartyLevel] = useState(3);
  const [partySize, setPartySize] = useState(4);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>("medium");
  const [result, setResult] = useState<GeneratedEncounter | null>(null);
  const [noResults, setNoResults] = useState(false);

  const formula: FormulaVersion = rulesetVersion;

  const handleGenerate = useCallback(() => {
    const input: EncounterGeneratorInput = {
      environment,
      partyLevel,
      partySize,
      difficulty,
      formula,
      rulesetVersion,
    };
    const encounter = generateEncounter(input, monsters);
    if (encounter) {
      setResult(encounter);
      setNoResults(false);
    } else {
      setResult(null);
      setNoResults(true);
    }
  }, [environment, partyLevel, partySize, difficulty, formula, rulesetVersion, monsters]);

  const handleUse = useCallback(() => {
    if (!result) return;
    onUseEncounter(result.monsters);
    setOpen(false);
    setResult(null);
  }, [result, onUseEncounter]);

  const inputClass =
    "bg-card border border-border rounded px-2 py-1.5 text-foreground text-sm focus:outline-none focus:ring-1 focus:ring-ring min-h-[32px] w-full";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="px-3 py-1.5 text-sm font-medium rounded border border-border text-muted-foreground hover:text-foreground hover:border-gold/60 transition-colors flex items-center gap-1.5"
          data-testid="encounter-generator-btn"
        >
          <Dices className="w-4 h-4" />
          {t("title")}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Environment selector */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              {t("environment_label")}
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
              {ALL_ENVIRONMENTS.map((env) => (
                <button
                  key={env}
                  type="button"
                  onClick={() => setEnvironment(env)}
                  className={`flex flex-col items-center gap-0.5 px-1.5 py-2 rounded border text-xs transition-colors ${
                    environment === env
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-border text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  <span className="text-lg">{ENVIRONMENT_ICONS[env]}</span>
                  <span className="truncate w-full text-center leading-tight">{t(`env_${env}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Party Level + Size */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                {t("party_level_label")}
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={partyLevel}
                onChange={(e) => setPartyLevel(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                {t("party_size_label")}
              </label>
              <input
                type="number"
                min={1}
                max={8}
                value={partySize}
                onChange={(e) => setPartySize(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
                className={inputClass}
              />
            </div>
          </div>

          {/* Difficulty selector */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
              {t("difficulty_label")}
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {DIFFICULTIES.map(({ key, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDifficulty(key)}
                  className={`px-2 py-1.5 rounded text-sm font-medium transition-colors ${
                    difficulty === key
                      ? `${color} text-white ring-1 ring-white/20`
                      : "bg-card border border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t(`diff_${key}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={monsters.length === 0}
            className="w-full px-4 py-2.5 bg-gold text-surface-primary font-semibold rounded-md hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center gap-2"
            data-testid="generate-encounter-btn"
          >
            <Dices className="w-4 h-4" />
            {result ? t("regenerate_btn") : t("generate_btn")}
          </button>

          {/* No results */}
          {noResults && (
            <p className="text-sm text-muted-foreground text-center py-2">
              {t("no_monsters_found")}
            </p>
          )}

          {/* Results */}
          {result && (
            <div className="border border-border rounded-lg p-3 space-y-3 bg-card/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">{t("result_title")}</h3>
                <span className={`text-xs px-2 py-0.5 rounded border ${DIFFICULTY_BADGE_COLORS[result.difficulty]}`}>
                  {t(`diff_${result.difficulty}`)}
                </span>
              </div>

              <div className="space-y-1.5">
                {result.monsters.map((group) => (
                  <div
                    key={group.monster.id}
                    className="flex items-center justify-between text-sm py-1 px-2 rounded bg-card/80"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-foreground font-medium truncate">
                        {group.count > 1 ? `${group.count}x ` : ""}{group.monster.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                      <span>CR {group.monster.cr}</span>
                      <span>HP {group.monster.hit_points}</span>
                      <span>AC {group.monster.armor_class}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border">
                <span>{t("total_xp")}: {result.totalXP.toLocaleString()}</span>
              </div>

              <button
                type="button"
                onClick={handleUse}
                className="w-full px-4 py-2 bg-gold/90 text-surface-primary font-semibold rounded-md hover:bg-gold transition-colors min-h-[44px]"
                data-testid="use-encounter-btn"
              >
                {t("use_encounter_btn")}
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
