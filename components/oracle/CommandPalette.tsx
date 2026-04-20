"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { trackEvent } from "@/lib/analytics/track";
import { Command } from "cmdk";
import { searchMonsters, searchSpells, searchItems, searchFeats, searchBackgrounds, searchAbilities, getAllConditions } from "@/lib/srd/srd-search";
import { usePinnedCardsStore } from "@/lib/stores/pinned-cards-store";
import { useSrdStore } from "@/lib/stores/srd-store";
import { SpellDescriptionModal } from "@/components/oracle/SpellDescriptionModal";
import { ConditionRulesModal } from "@/components/oracle/ConditionRulesModal";
import type { SrdMonster, SrdSpell } from "@/lib/srd/srd-loader";
import type { SrdCondition } from "@/lib/srd/srd-loader";
import { Skull, Sparkles, HeartPulse, X, Sword, Star, ScrollText, Zap, Zap as ActionIcon, Swords, UserCircle, MapPin, Flag, FileText, Plus, UserPlus, Settings, BookOpen, Users, Compass } from "lucide-react";
import { MonsterToken } from "@/components/srd/MonsterToken";
import { VersionBadge } from "@/components/ui/VersionBadge";
import { useQuickSwitcherData } from "@/lib/hooks/useQuickSwitcherData";
import { filterQuickActions, type QuickAction } from "@/lib/quick-switcher/actions";

const MAX_RESULTS_PER_GROUP = 5;
const MAX_QUICK_RESULTS = 5;
const DEBOUNCE_MS = 150;

type SearchFilter = "all" | "navigation" | "current_campaign" | "monster" | "spell" | "condition" | "item" | "feat" | "background" | "ability";

function fuzzyMatch(text: string, q: string) {
  return text.toLowerCase().includes(q.toLowerCase());
}

function actionIcon(name: QuickAction["icon"]) {
  switch (name) {
    case "Plus":
      return <Plus className="w-4 h-4" />;
    case "UserPlus":
      return <UserPlus className="w-4 h-4" />;
    case "Swords":
      return <Swords className="w-4 h-4" />;
    case "Settings":
      return <Settings className="w-4 h-4" />;
    case "BookOpen":
      return <BookOpen className="w-4 h-4" />;
    default:
      return <ActionIcon className="w-4 h-4" />;
  }
}

export function CommandPalette() {
  const t = useTranslations("command_palette");
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<SearchFilter>("all");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const campaignMatch = pathname.match(/^\/app\/campaigns\/([0-9a-f-]{36})/i);
  const currentCampaignId = campaignMatch ? campaignMatch[1] : null;

  // Quick switcher data (campaigns, characters, entities, notes) — loaded
  // lazily the first time the palette opens.
  const { campaigns, characters, entities, notes } = useQuickSwitcherData(open, currentCampaignId);

  // TODO wire hasDmAccess from server via a provider/context; default false here.
  const quickActions = useMemo(
    () => filterQuickActions({ hasDmAccess: true, currentCampaignId }),
    [currentCampaignId],
  );

  // Modal state for detail views
  const [selectedSpell, setSelectedSpell] = useState<SrdSpell | null>(null);
  const [selectedCondition, setSelectedCondition] = useState<SrdCondition | null>(null);

  const pinCard = usePinnedCardsStore((s) => s.pinCard);
  const isLoading = useSrdStore((s) => s.is_loading);

  // Debounce query
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  // Search results (filtered by category)
  const showSrd = filter === "all" || !["navigation", "current_campaign"].includes(filter);
  const showNav = filter === "all" || filter === "navigation";
  const showCampaignScope = filter === "all" || filter === "current_campaign";
  const showMonsters = showSrd && (filter === "all" || filter === "monster");
  const showSpells = showSrd && (filter === "all" || filter === "spell");
  const showConditions = showSrd && (filter === "all" || filter === "condition");
  const showItems = showSrd && (filter === "all" || filter === "item");
  const showFeats = showSrd && (filter === "all" || filter === "feat");
  const showBackgrounds = showSrd && (filter === "all" || filter === "background");
  const showAbilities = showSrd && (filter === "all" || filter === "ability");

  const monsterResults = debouncedQuery && showMonsters
    ? searchMonsters(debouncedQuery).slice(0, MAX_RESULTS_PER_GROUP)
    : [];
  const spellResults = debouncedQuery && showSpells
    ? searchSpells(debouncedQuery).slice(0, MAX_RESULTS_PER_GROUP)
    : [];
  const conditionResults = debouncedQuery && showConditions
    ? getAllConditions().filter((c) =>
        c.name.toLowerCase().includes(debouncedQuery.toLowerCase()),
      ).slice(0, MAX_RESULTS_PER_GROUP)
    : [];
  const itemResults = debouncedQuery && showItems
    ? searchItems(debouncedQuery).slice(0, MAX_RESULTS_PER_GROUP)
    : [];
  const featResults = debouncedQuery && showFeats
    ? searchFeats(debouncedQuery).slice(0, MAX_RESULTS_PER_GROUP)
    : [];
  const backgroundResults = debouncedQuery && showBackgrounds
    ? searchBackgrounds(debouncedQuery).slice(0, MAX_RESULTS_PER_GROUP)
    : [];
  const abilityResults = debouncedQuery && showAbilities
    ? searchAbilities(debouncedQuery).slice(0, MAX_RESULTS_PER_GROUP)
    : [];

  // Quick switcher groups (navigation scope).
  // Empty query → show actions + campaigns as a starter menu.
  // With query → filter by substring match.
  const actionResults = useMemo(() => {
    if (!showNav) return [];
    if (!debouncedQuery) return quickActions;
    return quickActions.filter((a) => fuzzyMatch(t(a.labelKey), debouncedQuery));
  }, [showNav, debouncedQuery, quickActions, t]);

  const campaignResults = useMemo(() => {
    if (!showNav) return [];
    const q = debouncedQuery.trim();
    const list = q ? campaigns.filter((c) => fuzzyMatch(c.name, q)) : campaigns;
    return list.slice(0, MAX_QUICK_RESULTS);
  }, [showNav, debouncedQuery, campaigns]);

  const characterResults = useMemo(() => {
    if (!showNav) return [];
    const q = debouncedQuery.trim();
    const list = q ? characters.filter((c) => fuzzyMatch(c.name, q)) : characters;
    return list.slice(0, MAX_QUICK_RESULTS);
  }, [showNav, debouncedQuery, characters]);

  const entityResults = useMemo(() => {
    if (!showCampaignScope || !currentCampaignId) return [];
    const q = debouncedQuery.trim();
    const list = q ? entities.filter((e) => fuzzyMatch(e.name, q)) : entities;
    return list.slice(0, MAX_QUICK_RESULTS);
  }, [showCampaignScope, currentCampaignId, debouncedQuery, entities]);

  const noteResults = useMemo(() => {
    if (!showCampaignScope || !currentCampaignId) return [];
    const q = debouncedQuery.trim();
    const list = q ? notes.filter((n) => fuzzyMatch(n.title, q)) : notes;
    return list.slice(0, MAX_QUICK_RESULTS);
  }, [showCampaignScope, currentCampaignId, debouncedQuery, notes]);

  const totalResults = monsterResults.length + spellResults.length + conditionResults.length
    + itemResults.length + featResults.length + backgroundResults.length + abilityResults.length
    + actionResults.length + campaignResults.length + characterResults.length + entityResults.length + noteResults.length;
  const hasResults = totalResults > 0;

  // Track search queries (debounced — fires once per final query, not per keystroke)
  const lastTrackedQuery = useRef("");
  useEffect(() => {
    if (debouncedQuery && debouncedQuery !== lastTrackedQuery.current) {
      lastTrackedQuery.current = debouncedQuery;
      trackEvent("oracle:search", {
        query_length: debouncedQuery.length,
        filter,
        result_count: totalResults,
      });
    }
  }, [debouncedQuery, filter, totalResults]);

  // ESC = full close (clears query + filter)
  const handleClose = useCallback(() => {
    setOpen(false);
    setQuery("");
    setDebouncedQuery("");
    setFilter("all");
  }, []);

  // Backdrop click = soft dismiss (preserves query + filter for reopen)
  const handleDismiss = useCallback(() => {
    setOpen(false);
  }, []);

  // Global keyboard shortcuts (Ctrl+K to toggle, ESC to close)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        e.stopImmediatePropagation();
        handleClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleClose]);

  // Programmatic open with optional pre-filled query (used by AbilityCard, etc.)
  useEffect(() => {
    function handleOpenEvent(e: Event) {
      const detail = (e as CustomEvent<{ query?: string }>).detail;
      if (detail?.query) {
        setQuery(detail.query);
        setDebouncedQuery(detail.query);
      }
      setOpen(true);
    }
    window.addEventListener("command-palette:open", handleOpenEvent);
    return () => window.removeEventListener("command-palette:open", handleOpenEvent);
  }, []);

  const handlePinMonster = useCallback((monster: SrdMonster) => {
    trackEvent("oracle:result_click", { type: "monster", id: monster.id });
    pinCard("monster", monster.id, monster.ruleset_version);
    handleClose();
  }, [pinCard, handleClose]);

  const handleViewSpell = useCallback((spell: SrdSpell) => {
    trackEvent("oracle:result_click", { type: "spell", id: spell.id });
    setSelectedSpell(spell);
    handleClose();
  }, [handleClose]);

  const handleViewCondition = useCallback((condition: SrdCondition) => {
    trackEvent("oracle:result_click", { type: "condition", id: condition.id });
    setSelectedCondition(condition);
    handleClose();
  }, [handleClose]);

  const handlePinItem = useCallback((id: string) => {
    trackEvent("oracle:result_click", { type: "item", id });
    pinCard("item", id, "2014");
    handleClose();
  }, [pinCard, handleClose]);

  const handlePinFeat = useCallback((id: string, version?: string) => {
    trackEvent("oracle:result_click", { type: "feat", id });
    pinCard("feat", id, (version ?? "2014") as "2014" | "2024");
    handleClose();
  }, [pinCard, handleClose]);

  const handleNavigate = useCallback((href: string, kind: string) => {
    trackEvent("quick_switcher:navigate", { kind });
    handleClose();
    router.push(href);
  }, [router, handleClose]);

  const handleAction = useCallback((action: QuickAction) => {
    trackEvent("quick_switcher:action", { id: action.id });
    handleClose();
    if (action.href) router.push(action.href);
  }, [router, handleClose]);

  function formatCR(cr: string) {
    return cr === "0.125" ? "1/8" : cr === "0.25" ? "1/4" : cr === "0.5" ? "1/2" : cr;
  }

  function formatSpellLevel(level: number) {
    if (level === 0) return t("cantrip");
    return t("level_n", { level });
  }

  if (!open) return (
    <>
      <SpellDescriptionModal
        spell={selectedSpell}
        open={!!selectedSpell}
        onOpenChange={(v) => !v && setSelectedSpell(null)}
        onPin={selectedSpell ? () => {
          pinCard("spell", selectedSpell.id, selectedSpell.ruleset_version);
          setSelectedSpell(null);
        } : undefined}
      />
      <ConditionRulesModal
        condition={selectedCondition}
        open={!!selectedCondition}
        onOpenChange={(v) => !v && setSelectedCondition(null)}
      />
    </>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[10060] bg-black/60 backdrop-blur-sm animate-in fade-in-0 duration-150"
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Command Palette */}
      <div className="fixed inset-0 z-[10061] flex items-start justify-center pt-[15vh] md:pt-[20vh] px-4 pointer-events-none">
        <Command
          className="w-full max-w-[640px] rounded-xl border border-white/10 bg-surface-secondary shadow-2xl shadow-black/40 overflow-hidden animate-in zoom-in-95 fade-in-0 duration-150 pointer-events-auto"
          label={t("label")}
          shouldFilter={false}
          onKeyDown={(e) => {
            // Guard against cmdk calling .closest() on non-Element targets (BUG-4)
            if (e.target && !(e.target instanceof HTMLElement)) {
              e.preventDefault();
            }
          }}
        >
          <div className="flex items-center border-b border-white/[0.08] px-4">
            <svg
              className="w-4 h-4 text-muted-foreground shrink-0 mr-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder={t("placeholder")}
              className="flex-1 h-12 bg-transparent text-foreground text-base placeholder:text-muted-foreground outline-none"
            />
            <button
              type="button"
              onClick={handleClose}
              className="hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-white/[0.06] rounded border border-white/[0.08] hover:bg-white/[0.12] hover:text-foreground transition-colors cursor-pointer"
              aria-label={t("hint_close")}
            >
              ESC
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="md:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              aria-label={t("hint_close")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter pills */}
          <div className="flex items-center gap-1.5 px-4 py-2 border-b border-white/[0.08] overflow-x-auto scrollbar-hide">
            {([
              { key: "all" as SearchFilter, label: t("filter_all"), icon: null },
              { key: "navigation" as SearchFilter, label: t("filter_navigation"), icon: <Compass className="w-3 h-3" /> },
              ...(currentCampaignId ? [{ key: "current_campaign" as SearchFilter, label: t("filter_current_campaign"), icon: <MapPin className="w-3 h-3" /> }] : []),
              { key: "monster" as SearchFilter, label: t("group_monsters"), icon: <Skull className="w-3 h-3" /> },
              { key: "spell" as SearchFilter, label: t("group_spells"), icon: <Sparkles className="w-3 h-3" /> },
              { key: "item" as SearchFilter, label: t("group_items"), icon: <Sword className="w-3 h-3" /> },
              { key: "feat" as SearchFilter, label: t("group_feats"), icon: <Star className="w-3 h-3" /> },
              { key: "background" as SearchFilter, label: t("group_backgrounds"), icon: <ScrollText className="w-3 h-3" /> },
              { key: "ability" as SearchFilter, label: t("group_abilities"), icon: <Zap className="w-3 h-3" /> },
              { key: "condition" as SearchFilter, label: t("group_conditions"), icon: <HeartPulse className="w-3 h-3" /> },
            ]).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  filter === f.key
                    ? "bg-gold/20 text-gold border border-gold/30"
                    : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground border border-transparent"
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>

          <Command.List className="max-h-[min(400px,50vh)] overflow-y-auto p-2">
            {isLoading && (
              <Command.Loading>
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {t("loading")}
                </div>
              </Command.Loading>
            )}

            {!isLoading && debouncedQuery && !hasResults && (
              <Command.Empty className="px-4 py-8 text-center text-sm text-muted-foreground">
                {t("no_results")}
              </Command.Empty>
            )}

            {!debouncedQuery && !isLoading && !hasResults && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                {t("hint")}
              </div>
            )}

            {/* Quick Actions */}
            {actionResults.length > 0 && (
              <Command.Group heading={t("group_actions")}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gold/60 uppercase tracking-wider">
                  <ActionIcon className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {t("group_actions")}
                </div>
                {actionResults.map((a) => (
                  <Command.Item
                    key={`qa:${a.id}`}
                    value={`action:${a.id}`}
                    onSelect={() => handleAction(a)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-gold/5 aria-selected:bg-gold/10 transition-colors min-h-[44px]"
                  >
                    <span className="text-amber-400 shrink-0">{actionIcon(a.icon)}</span>
                    <span className="flex-1 font-medium">{t(a.labelKey)}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Campaigns */}
            {campaignResults.length > 0 && (
              <Command.Group heading={t("group_campaigns")}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gold/60 uppercase tracking-wider">
                  <Swords className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {t("group_campaigns")}
                </div>
                {campaignResults.map((c) => (
                  <Command.Item
                    key={`camp:${c.id}`}
                    value={`campaign:${c.id}`}
                    onSelect={() => handleNavigate(`/app/campaigns/${c.id}`, "campaign")}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-gold/5 aria-selected:bg-gold/10 transition-colors min-h-[44px]"
                  >
                    <Swords className="w-4 h-4 text-amber-400/70 shrink-0" aria-hidden="true" />
                    <span className="flex-1 font-medium truncate">{c.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Characters */}
            {characterResults.length > 0 && (
              <Command.Group heading={t("group_characters")}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gold/60 uppercase tracking-wider">
                  <Users className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {t("group_characters")}
                </div>
                {characterResults.map((c) => (
                  <Command.Item
                    key={`char:${c.id}`}
                    value={`character:${c.id}`}
                    onSelect={() => handleNavigate(`/app/characters/${c.id}`, "character")}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-gold/5 aria-selected:bg-gold/10 transition-colors min-h-[44px]"
                  >
                    <UserCircle className="w-4 h-4 text-emerald-400/70 shrink-0" aria-hidden="true" />
                    <span className="flex-1 font-medium truncate">{c.name}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Entities (NPCs, Locations, Factions, Quests) — scoped to current campaign */}
            {entityResults.length > 0 && (
              <Command.Group heading={t("group_entities")}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gold/60 uppercase tracking-wider">
                  <MapPin className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {t("group_entities")}
                </div>
                {entityResults.map((e) => {
                  const Icon = e.kind === "npc" ? UserCircle
                    : e.kind === "location" ? MapPin
                    : e.kind === "faction" ? Flag
                    : ScrollText;
                  const color = e.kind === "npc" ? "text-purple-400/70"
                    : e.kind === "location" ? "text-green-400/70"
                    : e.kind === "faction" ? "text-rose-400/70"
                    : "text-amber-400/70";
                  const section = e.kind === "npc" ? "npcs"
                    : e.kind === "location" ? "locations"
                    : e.kind === "faction" ? "factions"
                    : "quests";
                  return (
                    <Command.Item
                      key={`ent:${e.kind}:${e.id}`}
                      value={`entity:${e.kind}:${e.id}`}
                      onSelect={() => currentCampaignId && handleNavigate(`/app/campaigns/${currentCampaignId}?section=${section}`, `entity_${e.kind}`)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-gold/5 aria-selected:bg-gold/10 transition-colors min-h-[44px]"
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${color}`} aria-hidden="true" />
                      <span className="flex-1 font-medium truncate">{e.name}</span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                        {t(`entity_kind_${e.kind}`)}
                      </span>
                    </Command.Item>
                  );
                })}
              </Command.Group>
            )}

            {/* Recent notes (scoped to current campaign) */}
            {noteResults.length > 0 && (
              <Command.Group heading={t("group_notes")}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gold/60 uppercase tracking-wider">
                  <FileText className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {t("group_notes")}
                </div>
                {noteResults.map((n) => (
                  <Command.Item
                    key={`note:${n.id}`}
                    value={`note:${n.id}`}
                    onSelect={() => currentCampaignId && handleNavigate(`/app/campaigns/${currentCampaignId}?section=notes`, "note")}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-gold/5 aria-selected:bg-gold/10 transition-colors min-h-[44px]"
                  >
                    <FileText className="w-4 h-4 text-blue-400/70 shrink-0" aria-hidden="true" />
                    <span className="flex-1 font-medium truncate">{n.title || "—"}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Monsters */}
            {monsterResults.length > 0 && (
              <Command.Group heading={t("group_monsters")}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gold/60 uppercase tracking-wider">
                  <Skull className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {t("group_monsters")}
                </div>
                {monsterResults.map((r) => (
                  <Command.Item
                    key={`m:${r.item.id}:${r.item.ruleset_version}`}
                    value={`monster:${r.item.id}:${r.item.ruleset_version}`}
                    onSelect={() => handlePinMonster(r.item)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-gold/5 aria-selected:bg-gold/10 transition-colors min-h-[44px]"
                  >
                    <MonsterToken
                      tokenUrl={r.item.token_url}
                      fallbackTokenUrl={r.item.fallback_token_url}
                      creatureType={r.item.type}
                      name={r.item.name}
                      size={32}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{r.item.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        CR {formatCR(r.item.cr)} · {r.item.type}
                      </span>
                    </div>
                    <VersionBadge version={r.item.ruleset_version} isSrd={r.item.is_srd} size="md" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Spells */}
            {spellResults.length > 0 && (
              <Command.Group heading={t("group_spells")}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gold/60 uppercase tracking-wider">
                  <Sparkles className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {t("group_spells")}
                </div>
                {spellResults.map((r) => (
                  <Command.Item
                    key={`s:${r.item.id}:${r.item.ruleset_version}`}
                    value={`spell:${r.item.id}:${r.item.ruleset_version}`}
                    onSelect={() => handleViewSpell(r.item)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-gold/5 aria-selected:bg-gold/10 transition-colors min-h-[44px]"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{r.item.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatSpellLevel(r.item.level)} · {r.item.school}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {r.item.concentration && (
                        <span className="text-[10px] text-amber-400" title="Concentration">◉</span>
                      )}
                      {r.item.ritual && (
                        <span className="text-[10px] text-teal-400" title="Ritual">®</span>
                      )}
                      <VersionBadge version={r.item.ruleset_version} isSrd={r.item.is_srd} size="md" />
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Conditions */}
            {conditionResults.length > 0 && (
              <Command.Group heading={t("group_conditions")}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gold/60 uppercase tracking-wider">
                  <HeartPulse className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {t("group_conditions")}
                </div>
                {conditionResults.map((c) => (
                  <Command.Item
                    key={`c:${c.id}`}
                    value={`condition:${c.id}`}
                    onSelect={() => handleViewCondition(c)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-gold/5 aria-selected:bg-gold/10 transition-colors min-h-[44px]"
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-xs text-muted-foreground truncate flex-1">
                      {c.description.split("\n")[0].slice(0, 60)}…
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Items */}
            {itemResults.length > 0 && (
              <Command.Group heading={t("group_items")}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gold/60 uppercase tracking-wider">
                  <Sword className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {t("group_items")}
                </div>
                {itemResults.map((r) => (
                  <Command.Item
                    key={`i:${r.item.id}`}
                    value={`item:${r.item.id}`}
                    onSelect={() => handlePinItem(r.item.id)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-gold/5 aria-selected:bg-gold/10 transition-colors min-h-[44px]"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{r.item.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {r.item.type}{r.item.rarity ? ` · ${r.item.rarity}` : ""}
                      </span>
                    </div>
                    {r.item.reqAttune && (
                      <span className="text-[10px] text-purple-400 bg-purple-400/10 px-1.5 py-0.5 rounded">ATT</span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Feats */}
            {featResults.length > 0 && (
              <Command.Group heading={t("group_feats")}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gold/60 uppercase tracking-wider">
                  <Star className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {t("group_feats")}
                </div>
                {featResults.map((r) => (
                  <Command.Item
                    key={`f:${r.item.id}`}
                    value={`feat:${r.item.id}`}
                    onSelect={() => handlePinFeat(r.item.id, r.item.ruleset_version)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-gold/5 aria-selected:bg-gold/10 transition-colors min-h-[44px]"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{r.item.name}</span>
                      {r.item.prerequisite && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {r.item.prerequisite}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-muted-foreground">
                      {r.item.source}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Backgrounds */}
            {backgroundResults.length > 0 && (
              <Command.Group heading={t("group_backgrounds")}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gold/60 uppercase tracking-wider">
                  <ScrollText className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {t("group_backgrounds")}
                </div>
                {backgroundResults.map((r) => (
                  <Command.Item
                    key={`bg:${r.item.id}`}
                    value={`background:${r.item.id}`}
                    onSelect={handleClose}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-gold/5 aria-selected:bg-gold/10 transition-colors min-h-[44px]"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{r.item.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {r.item.skill_proficiencies.join(", ")}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-muted-foreground">
                      {r.item.source}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Abilities (class features, racial traits, subclass features) */}
            {abilityResults.length > 0 && (
              <Command.Group heading={t("group_abilities")}>
                <div className="px-2 py-1.5 text-xs font-semibold text-gold/60 uppercase tracking-wider">
                  <Zap className="inline-block w-3.5 h-3.5 -mt-0.5" aria-hidden="true" /> {t("group_abilities")}
                </div>
                {abilityResults.map((r) => (
                  <Command.Item
                    key={`ab:${r.item.id}`}
                    value={`ability:${r.item.id}`}
                    onSelect={handleClose}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-sm text-foreground hover:bg-gold/5 aria-selected:bg-gold/10 transition-colors min-h-[44px]"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium">{r.item.name}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {r.item.source_class || r.item.source_race || "Feat"}
                        {r.item.level_acquired ? ` · Lv${r.item.level_acquired}` : ""}
                      </span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      r.item.ability_type === "class_feature" ? "bg-amber-400/10 text-amber-400"
                      : r.item.ability_type === "racial_trait" ? "bg-emerald-400/10 text-emerald-400"
                      : r.item.ability_type === "subclass_feature" ? "bg-cyan-400/10 text-cyan-400"
                      : "bg-purple-400/10 text-purple-400"
                    }`}>
                      {r.item.ability_type === "class_feature" ? "Class"
                      : r.item.ability_type === "racial_trait" ? "Racial"
                      : r.item.ability_type === "subclass_feature" ? "Subclass"
                      : "Feat"}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer hints */}
          <div className="border-t border-white/[0.08] px-4 py-2 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gold/10 text-gold/70 rounded text-[10px] font-mono">↑↓</kbd>
              {t("hint_navigate")}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gold/10 text-gold/70 rounded text-[10px] font-mono">↵</kbd>
              {t("hint_select")}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-gold/10 text-gold/70 rounded text-[10px] font-mono">esc</kbd>
              {t("hint_close")}
            </span>
          </div>
        </Command>
      </div>

      {/* Detail modals (rendered when palette is open too, in case user navigates back) */}
      <SpellDescriptionModal
        spell={selectedSpell}
        open={!!selectedSpell}
        onOpenChange={(v) => !v && setSelectedSpell(null)}
        onPin={selectedSpell ? () => {
          pinCard("spell", selectedSpell.id, selectedSpell.ruleset_version);
          setSelectedSpell(null);
        } : undefined}
      />
      <ConditionRulesModal
        condition={selectedCondition}
        open={!!selectedCondition}
        onOpenChange={(v) => !v && setSelectedCondition(null)}
      />
    </>
  );
}
