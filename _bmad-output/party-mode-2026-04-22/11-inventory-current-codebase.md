# Player HQ Codebase Inventory — Pocket DM
**Date:** 2026-04-23  
**Scope:** Complete mapping of components, routes, hooks, stores, types, i18n, tests, and DB touchpoints.

## Executive Summary

- **92 total components** across player-hq (47), player (22), guest (5), combat (45+)
- **8,400 LOC in player-hq** (main 7.7K + drawers 707)
- **Tab-based architecture:** Map, Sheet, Resources, Abilities, Inventory, Notes, Quests
- **3 auth modes:** Guest (localStorage), Anónimo (session_tokens), Autenticado (campaign_members)
- **Reuse opportunities:** HpDisplay, ConditionBadges, ResourceDots, RechargeButton can extract
- **Duplication:** HP status in 3 places, spell slot UI in 2 variants, resource tracker logic

## Key Components

### Player HQ Panels (42 files, 8.1K LOC)

**Largest (refactor candidates):**
- PersonalInventory.tsx (490 LOC) — Personal gear inventory
- ProficienciesSection.tsx (486 LOC) — Skills, saves, tools
- BagOfHolding.tsx (460 LOC) — Party-shared inventory
- PlayerMindMap.tsx (412 LOC) — Campaign graph visualization

**Most critical (well-designed):**
- PlayerHqShell.tsx (393 LOC) — Root tab orchestrator
- SpellListSection.tsx (325 LOC) — Spell browser
- AbilitiesSection.tsx (226 LOC) — Class features/racial traits
- PlayerQuestBoard.tsx (234 LOC) — Campaign quests

**Reusable modules:**
- HpDisplay.tsx (150 LOC) — HP bar + tier label
- ConditionBadges.tsx (166 LOC) — Condition pills
- ResourceDots.tsx (163 LOC) — Dot visualization

**Drawers (707 LOC, 7 files):** PlayerPinDrawer, PlayerNpcDrawer, PlayerQuestDrawer, PlayerLocationDrawer, PlayerFactionDrawer, PlayerSessionDrawer sharing DrawerShell pattern

### Routes

- `/app/campaigns/[id]/sheet` (legacy → /journey) — Authenticated HQ
- `/app/join/[token]` — Anonymous session join via token
- `/app/try` — Guest combat tracker (4h limit, localStorage)

### Data Layer

**15 custom hooks (HQ-specific in lib/hooks/):**
- useCharacterStatus — Character CRUD (HP, conditions, spell slots)
- useResourceTrackers — Resource tracking (action surge, bardic inspiration, etc.)
- useCharacterAbilities — Class features, racial traits, feats + usage
- useActiveEffects — Active spells/potions, concentration detection
- useCharacterSpells — Known/prepared/favorite spells
- useNotifications, usePersonalInventory, useBagOfHolding
- usePlayerNotes, useNpcJournal, usePlayerQuestBoard
- usePlayerMindMap, useNodeViews, useEntityLinks

**30+ Zustand stores:**
- guest-combat-store (localStorage) — Guest combat state
- combat-store (realtime) — Authenticated combat state
- audio-store, favorites-store, subscription-store, player-hq-tour-store

### Database Tables

**20+ tables touched by HQ:**
- player_characters (HP, conditions, spell_slots, proficiencies, attributes)
- character_resource_trackers (resource dots)
- character_abilities (class features, racial traits, feats)
- character_spells (known/prepared/favorite)
- character_inventory_items (personal gear, attunement)
- character_active_effects (active spells, potions)
- player_journal_entries (quick notes, journal, lore)
- player_npc_notes (NPC relationships)
- party_inventory_items (shared inventory)
- campaign_notes (visibility-filtered)
- player_notifications, user_onboarding, session_tokens
- campaign_npcs, campaign_quests, campaign_locations, campaign_factions, entity_links

### i18n

Namespaces: player_hq, character, sheet, inventory, player, combat, player_notes  
Status: PT-BR + EN both present, sync status unclear  
Issues: No build-time type checking, duplicate keys across namespaces

### Tests

**E2E (25+ tests):** player-join.spec.ts, player-view.spec.ts, combat adversarial tests  
**Unit (12+ tests):** GuestCombatClient.test.tsx, PlayerJoinClient.test.tsx, CombatantRow.test.tsx  
**Coverage:** ~40-50% (combat > HQ)

## Refactor Recommendations

### Extract (Trivial)
- HpDisplay.tsx (150L) — Used in combat + HQ; modular
- ConditionBadges.tsx (166L), ResourceDots.tsx (163L), RechargeButton.tsx
- DrawerShell pattern — Generalize for future drawers

### Refactor (Duplication, Size)
- HP status calculated in 3 places → Centralize deriveHpStatus() (Medium)
- PersonalInventory (490L) → Extract ItemEditor, ItemFilter subcomponents (Medium)
- ProficienciesSection (486L) → Extract SkillEditor, ProficiencySummary (Medium)
- PlayerMindMap (412L) → Separate logic into usePlayerMindMapGraph hook (Medium)
- Spell slot UI duplicated → Extract SpellSlotGrid component (Low)
- Rest reset logic scattered → Extract ResetTypeGrouper utility (Low)

### Build New (Greenfield)
- Shared component library (no current structure)
- i18n orchestration (missing type safety)
- Realtime sync abstraction (divergent patterns)
- Tour orchestrator (3 tour stores should unify)

## Statistics

| Metric | Value |
|--------|-------|
| Total components | 92 |
| Total LOC (HQ) | ~8,400 |
| Average component | ~110 LOC |
| Largest 4 components | 490, 486, 460, 412 LOC |
| Custom hooks | 52 (15+ HQ-specific) |
| Zustand stores | 30+ |
| Database tables | 20+ |
| Routes | 3 |
| Auth modes | 3 |
| i18n namespaces | 7+ |
| E2E tests | 25+ |
| Unit tests | ~12 |
| Test coverage | ~40-50% |

---
Generated 2026-04-23 | Next: Atividade 2 (reuse matrix) + Atividade 3 (refactor/build decisions)
