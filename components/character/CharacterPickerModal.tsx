"use client";

/**
 * CharacterPickerModal — reusable picker for selecting or creating a character
 * within a campaign invite/join flow.
 *
 * Story 02-B prep: this is the REFACTOR-ONLY extraction of the 3-mode
 * state machine that previously lived inline in `InviteAcceptClient.tsx`.
 * Behavior is preserved 1:1. Deltas planned for Story 02-B full:
 *   - Infinite-scroll pagination via `listClaimableCharacters` (TODO below)
 *   - "Meus personagens" (auth) tab fetch against `player_characters`
 *   - Embed `CharacterWizard` in the Criar novo tab (replacing inline form)
 */

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { User, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Character the player already owns (standalone, outside this campaign). */
export interface PickerExistingCharacter {
  id: string;
  name: string;
  race: string | null;
  class: string | null;
  level: number | null;
  max_hp: number;
  ac: number;
  token_url: string | null;
}

/** Character created by the DM inside this campaign, still unlinked. */
export interface PickerUnlinkedCharacter {
  id: string;
  name: string;
  max_hp: number;
  ac: number;
}

/** Inline data for the "create new" fallback (legacy form path). */
export interface PickerCreateData {
  name: string;
  maxHp: number;
  currentHp: number;
  ac: number;
  spellSaveDc: number | null;
}

/** Union surfaced to the parent when the user confirms their selection. */
export type CharacterPickerResult =
  | { mode: "claimed"; characterId: string }
  | { mode: "picked"; characterId: string }
  | { mode: "created"; characterData: PickerCreateData };

export type CharacterPickerMode = "claim" | "pick" | "create";

export interface CharacterPickerModalProps {
  /** Campaign the picker is scoped to (used by TODO paginated fetchers). */
  campaignId: string;
  /**
   * Identity of the player opening the modal. Consumed by future paginated
   * endpoints (Story 02-B full) — kept in the API now so callers don't need
   * a second refactor pass.
   */
  playerIdentity: { sessionTokenId?: string; userId?: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the user confirms their selection. */
  onSelect: (result: CharacterPickerResult) => void | Promise<void>;
  /** Restrict which modes the modal offers. Defaults to all three. */
  allowModes?: CharacterPickerMode[];
  /** TODO (Story 02-B full): default 20, drives pagination fetcher. */
  pageSize?: number;
  /**
   * Existing characters the player already owns (standalone, no campaign).
   * TODO (Story 02-B full): replace with paginated hook fetching
   * `player_characters` where `user_id = auth.uid() AND campaign_id IS NULL`.
   */
  existingCharacters?: PickerExistingCharacter[];
  /**
   * DM-created characters in this campaign available for claim.
   * TODO (Story 02-B full): replace with `listClaimableCharacters(campaignId, identity, pagination)`.
   */
  unlinkedCharacters?: PickerUnlinkedCharacter[];
  /** Campaign name shown in the title (optional, translation-ready). */
  campaignName?: string;
  /** DM name shown in the subtitle (optional). */
  dmName?: string;
  /** Whether the parent is currently submitting (disables confirm). */
  isSubmitting?: boolean;
}

const INPUT_CLASS =
  "bg-surface-tertiary border-white/[0.15] text-foreground placeholder:text-muted-foreground/40 min-h-[44px] rounded-lg";

/**
 * Bottom-sheet responsive Dialog content.
 * On <640px (Tailwind `sm`), slide up from bottom + full width.
 * On >=640px, centered modal (default Dialog behavior).
 */
function pickInitialMode(
  allowed: CharacterPickerMode[],
  hasUnlinked: boolean,
  hasExisting: boolean,
): CharacterPickerMode {
  if (hasUnlinked && allowed.includes("claim")) return "claim";
  if (hasExisting && allowed.includes("pick")) return "pick";
  if (allowed.includes("create")) return "create";
  // Fallback: first allowed mode, or "create" as a safe default.
  return allowed[0] ?? "create";
}

export function CharacterPickerModal({
  campaignId: _campaignId,
  playerIdentity: _playerIdentity,
  open,
  onOpenChange,
  onSelect,
  allowModes = ["claim", "pick", "create"],
  pageSize: _pageSize = 20,
  existingCharacters = [],
  unlinkedCharacters = [],
  campaignName,
  dmName,
  isSubmitting = false,
}: CharacterPickerModalProps) {
  const t = useTranslations("campaign");
  const tc = useTranslations("player");

  const hasUnlinked =
    unlinkedCharacters.length > 0 && allowModes.includes("claim");
  const hasExisting =
    existingCharacters.length > 0 && allowModes.includes("pick");
  const canCreate = allowModes.includes("create");

  const [mode, setMode] = useState<CharacterPickerMode>(() =>
    pickInitialMode(allowModes, hasUnlinked, hasExisting),
  );
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [claimCharId, setClaimCharId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [hp, setHp] = useState("");
  const [ac, setAc] = useState("");
  const [spellSaveDc, setSpellSaveDc] = useState("");

  // Reset internal state when the modal transitions from closed -> open so
  // subsequent opens don't retain stale selections.
  useEffect(() => {
    if (open) {
      setMode(pickInitialMode(allowModes, hasUnlinked, hasExisting));
      setSelectedCharId(null);
      setClaimCharId(null);
      setName("");
      setHp("");
      setAc("");
      setSpellSaveDc("");
    }
    // `allowModes`, `hasUnlinked`, `hasExisting` are derived from props and are
    // stable across a given `open` cycle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (mode === "claim" && !claimCharId) return;
      if (mode === "pick" && !selectedCharId) return;
      if (mode === "create" && !name.trim()) return;

      if (mode === "claim" && claimCharId) {
        await onSelect({ mode: "claimed", characterId: claimCharId });
      } else if (mode === "pick" && selectedCharId) {
        await onSelect({ mode: "picked", characterId: selectedCharId });
      } else if (mode === "create") {
        const parsedHp = parseInt(hp) || 10;
        await onSelect({
          mode: "created",
          characterData: {
            name: name.trim(),
            maxHp: parsedHp,
            currentHp: parsedHp,
            ac: parseInt(ac) || 10,
            spellSaveDc: spellSaveDc ? parseInt(spellSaveDc) : null,
          },
        });
      }
    },
    [mode, claimCharId, selectedCharId, name, hp, ac, spellSaveDc, onSelect],
  );

  const subtitleKey =
    mode === "claim"
      ? "invite_claim_subtitle"
      : mode === "pick"
        ? "invite_pick_subtitle"
        : "invite_create_subtitle";

  const titleText =
    campaignName && dmName
      ? t("invite_welcome", { campaignName, dmName })
      : t("invite_picker_label");

  // Bottom-sheet on <640px (Tailwind `sm`), centered modal on >=640px.
  const contentResponsive =
    "sm:left-[50%] sm:top-[50%] sm:translate-x-[-50%] sm:translate-y-[-50%] sm:max-w-md sm:rounded-lg " +
    "left-0 right-0 bottom-0 top-auto translate-x-0 translate-y-0 " +
    "w-full max-w-none rounded-t-2xl rounded-b-none";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={contentResponsive}
        data-testid="character-picker-modal"
        aria-label={t("invite_picker_label")}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground tracking-wide">
            {titleText}
          </DialogTitle>
          <p className="text-muted-foreground text-sm">{t(subtitleKey)}</p>
        </DialogHeader>

        {/* Tabs — visible when >1 mode is available */}
        {allowModes.length > 1 && (
          <div
            role="tablist"
            aria-label={t("invite_picker_tabs_label")}
            className="flex border-b border-white/[0.08] mb-2 -mx-2 px-2 overflow-x-auto"
          >
            {hasUnlinked && (
              <button
                type="button"
                role="tab"
                aria-selected={mode === "claim"}
                data-testid="picker-tab-claim"
                onClick={() => {
                  setMode("claim");
                  setSelectedCharId(null);
                }}
                className={[
                  "px-3 py-2 text-xs uppercase tracking-widest font-medium transition-colors min-h-[44px]",
                  mode === "claim"
                    ? "text-gold border-b-2 border-gold"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {t("invite_tab_claim")}
              </button>
            )}
            {hasExisting && (
              <button
                type="button"
                role="tab"
                aria-selected={mode === "pick"}
                data-testid="picker-tab-pick"
                onClick={() => {
                  setMode("pick");
                  setClaimCharId(null);
                }}
                className={[
                  "px-3 py-2 text-xs uppercase tracking-widest font-medium transition-colors min-h-[44px]",
                  mode === "pick"
                    ? "text-gold border-b-2 border-gold"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {t("invite_tab_pick")}
              </button>
            )}
            {canCreate && (
              <button
                type="button"
                role="tab"
                aria-selected={mode === "create"}
                data-testid="picker-tab-create"
                onClick={() => {
                  setMode("create");
                  setClaimCharId(null);
                  setSelectedCharId(null);
                }}
                className={[
                  "px-3 py-2 text-xs uppercase tracking-widest font-medium transition-colors min-h-[44px]",
                  mode === "create"
                    ? "text-gold border-b-2 border-gold"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {t("invite_tab_create")}
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Claim DM-created characters */}
          {hasUnlinked && mode === "claim" && (
            <div
              role="tabpanel"
              data-testid="picker-panel-claim"
              className="space-y-2"
            >
              <p className="text-xs text-muted-foreground">
                {t("invite_claim_hint")}
              </p>
              {/* TODO (Story 02-B full): replace inline list with paginated
                  infinite-scroll backed by listClaimableCharacters(campaignId,
                  identity, { limit: pageSize, offset }). */}
              {unlinkedCharacters.map((char) => {
                const isSelected = claimCharId === char.id;
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => setClaimCharId(char.id)}
                    data-testid={`picker-claim-${char.id}`}
                    className={[
                      "w-full p-3 rounded-lg border text-left transition-colors flex items-center gap-3 min-h-[44px]",
                      isSelected
                        ? "border-gold/60 bg-gold/5"
                        : "border-white/[0.15] bg-surface-tertiary hover:border-white/30",
                    ].join(" ")}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-background border border-white/[0.04] flex items-center justify-center">
                      <User
                        className="w-5 h-5 text-muted-foreground/40"
                        aria-hidden="true"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-medium truncate">
                        {char.name}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {char.max_hp > 0 && (
                        <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-white/[0.04]">
                          HP {char.max_hp}
                        </span>
                      )}
                      {char.ac > 0 && (
                        <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-white/[0.04]">
                          AC {char.ac}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <CheckCircle2
                        className="w-5 h-5 text-gold flex-shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}

              {canCreate && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("create");
                    setClaimCharId(null);
                  }}
                  className="w-full p-3 rounded-lg border border-dashed border-white/20 text-muted-foreground text-sm hover:border-white/40 hover:text-foreground transition-colors min-h-[44px]"
                >
                  {t("invite_claim_not_listed")}
                </button>
              )}
            </div>
          )}

          {/* Existing character picker */}
          {hasExisting && mode === "pick" && (
            <div
              role="tabpanel"
              data-testid="picker-panel-pick"
              className="space-y-2"
            >
              {/* TODO (Story 02-B full): paginated fetch of player_characters
                  where user_id = auth.uid() AND campaign_id IS NULL. */}
              {existingCharacters.map((char) => {
                const subtitle = [char.race, char.class]
                  .filter(Boolean)
                  .join(" ");
                const isSelected = selectedCharId === char.id;
                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => setSelectedCharId(char.id)}
                    data-testid={`picker-pick-${char.id}`}
                    className={[
                      "w-full p-3 rounded-lg border text-left transition-colors flex items-center gap-3 min-h-[44px]",
                      isSelected
                        ? "border-gold/60 bg-gold/5"
                        : "border-white/[0.15] bg-surface-tertiary hover:border-white/30",
                    ].join(" ")}
                  >
                    <div className="flex-shrink-0">
                      {char.token_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={char.token_url}
                          alt={char.name}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-amber-400/40"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-background border border-white/[0.04] flex items-center justify-center">
                          <User
                            className="w-5 h-5 text-muted-foreground/40"
                            aria-hidden="true"
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground text-sm font-medium truncate">
                        {char.name}
                      </p>
                      {(subtitle || char.level) && (
                        <p className="text-muted-foreground text-xs truncate">
                          {[
                            subtitle,
                            char.level ? `Nível ${char.level}` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {char.max_hp > 0 && (
                        <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-white/[0.04]">
                          HP {char.max_hp}
                        </span>
                      )}
                      {char.ac > 0 && (
                        <span className="text-xs text-muted-foreground bg-background px-1.5 py-0.5 rounded border border-white/[0.04]">
                          AC {char.ac}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <CheckCircle2
                        className="w-5 h-5 text-gold flex-shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                );
              })}

              {canCreate && (
                <button
                  type="button"
                  onClick={() => {
                    setMode("create");
                    setSelectedCharId(null);
                  }}
                  className="w-full p-3 rounded-lg border border-dashed border-white/20 text-muted-foreground text-sm hover:border-white/40 hover:text-foreground transition-colors min-h-[44px]"
                >
                  + Criar personagem novo
                </button>
              )}
            </div>
          )}

          {/* New character form */}
          {canCreate && mode === "create" && (
            <div role="tabpanel" data-testid="picker-panel-create">
              {/* TODO (Story 02-B full): replace this inline form with
                  <CharacterWizard /> embed per Epic 02 Área 2. */}
              {(hasUnlinked || hasExisting) && (
                <button
                  type="button"
                  onClick={() => setMode(hasUnlinked ? "claim" : "pick")}
                  className="text-xs text-gold/70 hover:text-gold transition-colors mb-2"
                >
                  {t("invite_back_to_selection")}
                </button>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="char-name"
                  className="text-xs text-gold/80 uppercase tracking-widest font-medium"
                >
                  {tc("lobby_name_label")}
                </label>
                <Input
                  id="char-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={tc("lobby_name_placeholder")}
                  required
                  className={INPUT_CLASS}
                  data-testid="invite-char-name"
                />
              </div>

              <div className="grid grid-cols-3 gap-3 mt-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="char-hp"
                    className="text-xs text-gold/80 uppercase tracking-widest font-medium"
                  >
                    HP
                  </label>
                  <Input
                    id="char-hp"
                    type="number"
                    value={hp}
                    onChange={(e) => setHp(e.target.value)}
                    placeholder="45"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="char-ac"
                    className="text-xs text-gold/80 uppercase tracking-widest font-medium"
                  >
                    AC
                  </label>
                  <Input
                    id="char-ac"
                    type="number"
                    value={ac}
                    onChange={(e) => setAc(e.target.value)}
                    placeholder="16"
                    className={INPUT_CLASS}
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="char-dc"
                    className="text-xs text-gold/80 uppercase tracking-widest font-medium"
                  >
                    DC
                  </label>
                  <Input
                    id="char-dc"
                    type="number"
                    value={spellSaveDc}
                    onChange={(e) => setSpellSaveDc(e.target.value)}
                    placeholder="15"
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="gold"
            className="w-full min-h-[44px]"
            data-testid="picker-submit"
            disabled={
              isSubmitting ||
              (mode === "claim" && !claimCharId) ||
              (mode === "pick" && !selectedCharId) ||
              (mode === "create" && !name.trim())
            }
          >
            {isSubmitting
              ? "..."
              : mode === "claim"
                ? t("invite_claim_submit")
                : mode === "pick"
                  ? t("invite_pick_submit")
                  : t("create_character_and_join")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
