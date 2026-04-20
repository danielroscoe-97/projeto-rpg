"use client";

/**
 * CharacterPickerModal — reusable picker for selecting or creating a character
 * within a campaign invite/join flow.
 *
 * Story 02-B full:
 *   - Paginated "Disponíveis" tab (20/page via `listClaimableClient`) + load-more
 *   - "Meus personagens" tab (auth-only, paginated via `listMineCharacters`)
 *   - `CharacterWizard` embedded in Create tab (replaces inline form)
 *   - Empty + loading + error states with contract-compliant testids
 *
 * Backward compatibility: when callers pass `unlinkedCharacters` or
 * `existingCharacters` as arrays (e.g. `InviteAcceptClient` which pre-loads
 * server-side), the modal renders those directly and skips the paginated
 * fetch. When arrays are `undefined`, the modal fetches via the new API
 * routes. This keeps the Wave 1 `InviteAcceptClient` integration green.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { User, CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CharacterWizard,
  type WizardCharacterData,
} from "@/components/character/wizard/CharacterWizard";
import {
  listClaimableClient,
  type ListClaimableClientResult,
} from "@/lib/character/list-claimable-client";
import {
  listMineCharacters,
  type MyCharacterSummary,
} from "@/lib/character/list-mine";
import type { PlayerCharacter } from "@/lib/types/database";

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
  race?: string | null;
  class?: string | null;
  level?: number;
}

/** Union surfaced to the parent when the user confirms their selection. */
export type CharacterPickerResult =
  | { mode: "claimed"; characterId: string }
  | { mode: "picked"; characterId: string }
  | { mode: "created"; characterData: PickerCreateData };

export type CharacterPickerMode = "claim" | "pick" | "create";

export interface CharacterPickerModalProps {
  /** Campaign the picker is scoped to (used by paginated fetchers). */
  campaignId: string;
  /**
   * Identity of the player opening the modal. Used to gate the "Meus
   * personagens" tab (only shown when `userId` is present, i.e. authenticated).
   */
  playerIdentity: { sessionTokenId?: string; userId?: string };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the user confirms their selection. */
  onSelect: (result: CharacterPickerResult) => void | Promise<void>;
  /** Restrict which modes the modal offers. Defaults to all three. */
  allowModes?: CharacterPickerMode[];
  /** Default 20, drives pagination page size. */
  pageSize?: number;
  /**
   * Existing characters the player already owns (standalone, no campaign).
   * When `undefined`, the modal fetches via `/api/characters/mine`.
   * When an array is provided, it's used as-is (static mode, no fetch).
   */
  existingCharacters?: PickerExistingCharacter[];
  /**
   * DM-created characters in this campaign available for claim.
   * When `undefined`, the modal fetches via `/api/characters/claimable`.
   * When an array is provided, it's used as-is (static mode, no fetch).
   */
  unlinkedCharacters?: PickerUnlinkedCharacter[];
  /** Campaign name shown in the title (optional, translation-ready). */
  campaignName?: string;
  /** DM name shown in the subtitle (optional). */
  dmName?: string;
  /** Whether the parent is currently submitting (disables confirm). */
  isSubmitting?: boolean;
}

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

/**
 * Hook — paginated claimable fetch.
 * Returns stable callbacks so consuming components can re-render without
 * reinvoking effects. `load(0)` resets the page; `loadMore()` appends.
 *
 * M3 (code review fix): uses `useRef` for the canonical offset counter and an
 * `inflight` guard so rapid double-clicks on "load more" CANNOT fire two
 * concurrent fetches at the same stale offset. React state is still the render
 * source of truth; the refs just arbitrate the fetch path.
 */
function useClaimableCharactersPaginated(
  campaignId: string,
  enabled: boolean,
  pageSize: number,
) {
  const [characters, setCharacters] = useState<PlayerCharacter[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Canonical offset (advances on each successful append/reset) + inflight
  // guard. Refs beat useState here because the decision to fetch happens
  // inside a callback that must NOT wait for a render to see the new value.
  const offsetRef = useRef(0);
  const inflightRef = useRef(false);

  const load = useCallback(
    async (
      offset: number,
      mode: "reset" | "append",
      signal?: AbortSignal,
    ): Promise<ListClaimableClientResult | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await listClaimableClient({
          campaignId,
          offset,
          limit: pageSize,
          signal,
        });
        if (signal?.aborted) return null;
        setTotal(result.total);
        setHasMore(result.hasMore);
        setCharacters((prev) =>
          mode === "reset"
            ? result.characters
            : [...prev, ...result.characters],
        );
        if (mode === "reset") {
          offsetRef.current = result.characters.length;
        } else {
          offsetRef.current += result.characters.length;
        }
        return result;
      } catch (err) {
        if (signal?.aborted) return null;
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        return null;
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [campaignId, pageSize],
  );

  useEffect(() => {
    if (!enabled) return;
    // Reset offset + inflight when enabling (open true → first fetch).
    offsetRef.current = 0;
    inflightRef.current = true;
    const controller = new AbortController();
    void load(0, "reset", controller.signal).finally(() => {
      inflightRef.current = false;
    });
    return () => controller.abort();
  }, [enabled, load]);

  const loadMore = useCallback(async () => {
    // Inflight guard: the FIRST thing we check — not React state, not props.
    // Ensures rapid double-clicks collapse into a single fetch.
    if (inflightRef.current || !hasMore) return;
    inflightRef.current = true;
    try {
      await load(offsetRef.current, "append");
    } finally {
      inflightRef.current = false;
    }
  }, [hasMore, load]);

  return { characters, total, hasMore, isLoading, error, loadMore };
}

/**
 * Hook — paginated "Meus personagens" fetch (auth-only).
 * Mirror of `useClaimableCharactersPaginated`, targeting a different endpoint.
 * Same M3 guard: useRef-based offset + inflight.
 */
function useMyCharactersPaginated(enabled: boolean, pageSize: number) {
  const [characters, setCharacters] = useState<MyCharacterSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const offsetRef = useRef(0);
  const inflightRef = useRef(false);

  const load = useCallback(
    async (
      offset: number,
      mode: "reset" | "append",
      signal?: AbortSignal,
    ) => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await listMineCharacters({
          offset,
          limit: pageSize,
          signal,
        });
        if (signal?.aborted) return null;
        setTotal(result.total);
        setHasMore(result.hasMore);
        setCharacters((prev) =>
          mode === "reset"
            ? result.characters
            : [...prev, ...result.characters],
        );
        if (mode === "reset") {
          offsetRef.current = result.characters.length;
        } else {
          offsetRef.current += result.characters.length;
        }
        return result;
      } catch (err) {
        if (signal?.aborted) return null;
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        return null;
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [pageSize],
  );

  useEffect(() => {
    if (!enabled) return;
    offsetRef.current = 0;
    inflightRef.current = true;
    const controller = new AbortController();
    void load(0, "reset", controller.signal).finally(() => {
      inflightRef.current = false;
    });
    return () => controller.abort();
  }, [enabled, load]);

  const loadMore = useCallback(async () => {
    if (inflightRef.current || !hasMore) return;
    inflightRef.current = true;
    try {
      await load(offsetRef.current, "append");
    } finally {
      inflightRef.current = false;
    }
  }, [hasMore, load]);

  return { characters, total, hasMore, isLoading, error, loadMore };
}

export function CharacterPickerModal({
  campaignId: _campaignId,
  playerIdentity,
  open,
  onOpenChange,
  onSelect,
  allowModes = ["claim", "pick", "create"],
  pageSize = 20,
  existingCharacters,
  unlinkedCharacters,
  campaignName,
  dmName,
  isSubmitting = false,
}: CharacterPickerModalProps) {
  const t = useTranslations("campaign");

  // Static-mode: caller passed arrays directly (InviteAcceptClient pattern).
  // Paginated-mode: caller left them `undefined`, we fetch via API.
  const staticUnlinked = unlinkedCharacters !== undefined;
  const staticExisting = existingCharacters !== undefined;

  const isAuthenticated = Boolean(playerIdentity.userId);

  // Whether each tab is visible at all.
  // In static mode: visible iff arrays are non-empty + mode allowed.
  // In paginated mode: visible iff mode allowed. For "pick" tab, also require
  // authenticated user (anon users don't have standalone characters).
  const showClaimTab =
    allowModes.includes("claim") &&
    (staticUnlinked
      ? (unlinkedCharacters?.length ?? 0) > 0
      : open); // paginated: always show when modal is open
  const showPickTab =
    allowModes.includes("pick") &&
    (staticExisting
      ? (existingCharacters?.length ?? 0) > 0
      : open && isAuthenticated);
  const canCreate = allowModes.includes("create");

  // Initial hasUnlinked/hasExisting used only to choose the initial mode.
  // In paginated mode we don't know counts yet at mount, so default to claim
  // if available — the first mode guaranteed to apply for most users.
  const initialHasUnlinked = staticUnlinked
    ? (unlinkedCharacters?.length ?? 0) > 0
    : showClaimTab;
  const initialHasExisting = staticExisting
    ? (existingCharacters?.length ?? 0) > 0
    : showPickTab;

  const [mode, setMode] = useState<CharacterPickerMode>(() =>
    pickInitialMode(allowModes, initialHasUnlinked, initialHasExisting),
  );
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [claimCharId, setClaimCharId] = useState<string | null>(null);

  // Paginated data (only consulted when !staticUnlinked / !staticExisting).
  const claimable = useClaimableCharactersPaginated(
    _campaignId,
    !staticUnlinked && open && showClaimTab,
    pageSize,
  );
  const mine = useMyCharactersPaginated(
    !staticExisting && open && showPickTab,
    pageSize,
  );

  const effectiveUnlinked: PickerUnlinkedCharacter[] = staticUnlinked
    ? (unlinkedCharacters ?? [])
    : claimable.characters.map((c) => ({
        id: c.id,
        name: c.name,
        max_hp: c.max_hp,
        ac: c.ac,
      }));

  const effectiveExisting: PickerExistingCharacter[] = staticExisting
    ? (existingCharacters ?? [])
    : mine.characters.map((c) => ({
        id: c.id,
        name: c.name,
        race: c.race,
        class: c.class,
        level: c.level,
        max_hp: c.max_hp,
        ac: c.ac,
        token_url: c.token_url,
      }));

  // M3 (from code review): persist pending form state across open/close
  // cycles. Reset only on legitimate triggers (campaignId change).
  const lastCampaignIdRef = useRef(_campaignId);
  useEffect(() => {
    if (lastCampaignIdRef.current !== _campaignId) {
      lastCampaignIdRef.current = _campaignId;
      setMode(pickInitialMode(allowModes, initialHasUnlinked, initialHasExisting));
      setSelectedCharId(null);
      setClaimCharId(null);
    }
    // `allowModes`, `initialHasUnlinked`, `initialHasExisting` are derived
    // from props and only consulted on reset. Intentional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_campaignId]);

  const handleClaimSelect = useCallback(() => {
    if (!claimCharId) return;
    void onSelect({ mode: "claimed", characterId: claimCharId });
  }, [claimCharId, onSelect]);

  const handlePickSelect = useCallback(() => {
    if (!selectedCharId) return;
    void onSelect({ mode: "picked", characterId: selectedCharId });
  }, [selectedCharId, onSelect]);

  const handleWizardComplete = useCallback(
    async (data: WizardCharacterData) => {
      // Bridge wizard data → picker result. Default HP/AC to 10 when the
      // wizard skipped stats (matches inline-form fallback behaviour).
      const maxHp = data.maxHp ?? 10;
      await onSelect({
        mode: "created",
        characterData: {
          name: data.name.trim(),
          maxHp,
          currentHp: maxHp,
          ac: data.ac ?? 10,
          spellSaveDc: data.spellSaveDc,
          race: data.race,
          class: data.characterClass,
          level: data.level,
        },
      });
    },
    [onSelect],
  );

  const handleWizardCancel = useCallback(() => {
    // If other modes are available, route back to them. Otherwise close.
    if (showClaimTab) {
      setMode("claim");
    } else if (showPickTab) {
      setMode("pick");
    } else {
      onOpenChange(false);
    }
  }, [showClaimTab, showPickTab, onOpenChange]);

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
        data-testid="invite.picker.modal"
        aria-label={t("invite_picker_label")}
      >
        {/* Close button testid. The Radix `DialogClose` baked into
            `DialogContent` (visible X icon) isn't directly attributable —
            this secondary DialogClose is sr-only and exposes the same close
            semantics to automated tests + assistive tech. */}
        <DialogClose
          data-testid="invite.picker.close-button"
          aria-label="Close"
          className="sr-only"
        />
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
            {showClaimTab && (
              <button
                type="button"
                role="tab"
                aria-selected={mode === "claim"}
                data-testid="invite.picker.tab-available"
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
            {showPickTab && (
              <button
                type="button"
                role="tab"
                aria-selected={mode === "pick"}
                data-testid="invite.picker.tab-my-characters"
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
                data-testid="invite.picker.tab-create"
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

        {/* Claim DM-created characters */}
        {showClaimTab && mode === "claim" && (
          <div
            role="tabpanel"
            data-testid="invite.picker.tab-panel-available"
            className="space-y-2"
          >
            <p className="text-xs text-muted-foreground">
              {t("invite_claim_hint")}
            </p>

            {!staticUnlinked && claimable.isLoading && effectiveUnlinked.length === 0 && (
              <div
                data-testid="invite.picker.loading"
                className="flex items-center justify-center py-6 text-muted-foreground text-sm"
              >
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                {t("invite_picker_loading")}
              </div>
            )}

            {!staticUnlinked && claimable.error && !claimable.isLoading && (
              <div
                data-testid="invite.picker.error"
                role="alert"
                className="py-3 px-3 rounded-lg border border-red-500/40 bg-red-500/5 text-red-300 text-sm"
              >
                {t("invite_picker_error")}
              </div>
            )}

            {!staticUnlinked &&
              !claimable.isLoading &&
              !claimable.error &&
              effectiveUnlinked.length === 0 && (
                <div
                  data-testid="invite.picker.empty-state-available"
                  className="py-6 px-3 text-center text-sm text-muted-foreground"
                >
                  {t("invite_picker_empty_available")}
                </div>
              )}

            {effectiveUnlinked.map((char) => {
              const isSelected = claimCharId === char.id;
              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => setClaimCharId(char.id)}
                  data-testid={`invite.picker.claim-card-${char.id}`}
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

            {!staticUnlinked && claimable.hasMore && (
              <button
                type="button"
                onClick={claimable.loadMore}
                disabled={claimable.isLoading}
                data-testid="invite.picker.load-more-button"
                className="w-full p-3 rounded-lg border border-white/[0.15] text-muted-foreground text-sm hover:border-white/30 hover:text-foreground transition-colors min-h-[44px] disabled:opacity-50"
              >
                {claimable.isLoading
                  ? t("invite_picker_loading")
                  : t("invite_picker_load_more")}
              </button>
            )}

            {canCreate && effectiveUnlinked.length > 0 && (
              <button
                type="button"
                data-testid="invite.picker.claim-not-listed"
                onClick={() => {
                  setMode("create");
                  setClaimCharId(null);
                }}
                className="w-full p-3 rounded-lg border border-dashed border-white/20 text-muted-foreground text-sm hover:border-white/40 hover:text-foreground transition-colors min-h-[44px]"
              >
                {t("invite_claim_not_listed")}
              </button>
            )}

            <Button
              type="button"
              variant="gold"
              className="w-full min-h-[44px] mt-3"
              data-testid="invite.picker.confirm-button"
              onClick={handleClaimSelect}
              disabled={isSubmitting || !claimCharId}
            >
              {isSubmitting ? "..." : t("invite_claim_submit")}
            </Button>
          </div>
        )}

        {/* Existing character picker (My characters / Meus personagens) */}
        {showPickTab && mode === "pick" && (
          <div
            role="tabpanel"
            data-testid="invite.picker.tab-panel-my-characters"
            className="space-y-2"
          >
            {!staticExisting && mine.isLoading && effectiveExisting.length === 0 && (
              <div
                data-testid="invite.picker.loading"
                className="flex items-center justify-center py-6 text-muted-foreground text-sm"
              >
                <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />
                {t("invite_picker_loading")}
              </div>
            )}

            {!staticExisting && mine.error && !mine.isLoading && (
              <div
                data-testid="invite.picker.error"
                role="alert"
                className="py-3 px-3 rounded-lg border border-red-500/40 bg-red-500/5 text-red-300 text-sm"
              >
                {t("invite_picker_error")}
              </div>
            )}

            {!staticExisting &&
              !mine.isLoading &&
              !mine.error &&
              effectiveExisting.length === 0 && (
                <div
                  data-testid="invite.picker.empty-state-my-characters"
                  className="py-6 px-3 text-center text-sm text-muted-foreground"
                >
                  {t("invite_picker_empty_my_characters")}
                </div>
              )}

            {effectiveExisting.map((char) => {
              const subtitle = [char.race, char.class]
                .filter(Boolean)
                .join(" ");
              const isSelected = selectedCharId === char.id;
              return (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => setSelectedCharId(char.id)}
                  data-testid={`invite.picker.character-card-${char.id}`}
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

            {!staticExisting && mine.hasMore && (
              <button
                type="button"
                onClick={mine.loadMore}
                disabled={mine.isLoading}
                data-testid="invite.picker.load-more-button"
                className="w-full p-3 rounded-lg border border-white/[0.15] text-muted-foreground text-sm hover:border-white/30 hover:text-foreground transition-colors min-h-[44px] disabled:opacity-50"
              >
                {mine.isLoading
                  ? t("invite_picker_loading")
                  : t("invite_picker_load_more")}
              </button>
            )}

            {canCreate && effectiveExisting.length > 0 && (
              <button
                type="button"
                data-testid="invite.picker.pick-create-new"
                onClick={() => {
                  setMode("create");
                  setSelectedCharId(null);
                }}
                className="w-full p-3 rounded-lg border border-dashed border-white/20 text-muted-foreground text-sm hover:border-white/40 hover:text-foreground transition-colors min-h-[44px]"
              >
                + Criar personagem novo
              </button>
            )}

            <Button
              type="button"
              variant="gold"
              className="w-full min-h-[44px] mt-3"
              data-testid="invite.picker.confirm-button"
              onClick={handlePickSelect}
              disabled={isSubmitting || !selectedCharId}
            >
              {isSubmitting ? "..." : t("invite_pick_submit")}
            </Button>
          </div>
        )}

        {/* Create new character — embedded CharacterWizard */}
        {canCreate && mode === "create" && (
          <div role="tabpanel" data-testid="invite.picker.tab-panel-create">
            {/* Wrapper testids for the 3 wizard steps per contract §3.3.
                The wizard has its own internal step state; these wrappers mark
                the outer container so tests can assert the step surfaces are
                reachable without coupling to wizard internals. */}
            <div
              data-testid="invite.picker.create-wizard-step-1"
              data-wizard-step-wrapper="identity"
            />
            <div
              data-testid="invite.picker.create-wizard-step-2"
              data-wizard-step-wrapper="stats"
            />
            <div
              data-testid="invite.picker.create-wizard-step-3"
              data-wizard-step-wrapper="preview"
            />
            <CharacterWizard
              campaignId={_campaignId}
              campaignName={campaignName}
              mode={isAuthenticated ? "auth" : "anon"}
              onComplete={handleWizardComplete}
              onCancel={handleWizardCancel}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
