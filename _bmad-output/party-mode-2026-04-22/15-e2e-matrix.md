# 15 — E2E Test Matrix · Player HQ Redesign

**Owner:** QA lead (gerado 2026-04-23)
**Escopo:** Plano de cobertura Playwright obrigatória por wave (Fases A–E) do redesign 4-tabs.
**Estado atual:** read-only audit + planning doc — nenhum teste foi escrito aqui.
**Inputs:**
- [09-implementation-plan.md](./09-implementation-plan.md) — 35 stories (A1–A6, B1–B6, C1–C7, D1–D9, E1–E7)
- [PRD-EPICO-CONSOLIDADO.md §2](./PRD-EPICO-CONSOLIDADO.md) — 47 decisões canônicas (#27–#47 são as UI-testáveis deste redesign)
- [07-spec-funcional.md](./07-spec-funcional.md) — estados × ações × erros × a11y
- [CLAUDE.md](../../CLAUDE.md) — Combat Parity Rule + Resilient Reconnection Rule

**Convenção de célula nas tabelas:**
| Símbolo | Significado |
|---|---|
| ✅ | Já existe cobertura hoje (ou reusável com ajuste trivial) |
| 🆕 | Teste novo precisa ser escrito |
| ⛔ | N/A para este modo (com razão curta) |
| ❓ | Precisa verificação antes de declarar coberto |

---

## 1. Executive summary

- **E2E atual:** 91 spec files em [e2e/](../../e2e/). Cobrem bem combate (J11/J19/J21/J22), player-join, realtime, recap/upsell, mind-map (1012+ linhas), compendium, guest-qa.
- **Cobertura Player HQ (`/sheet`) hoje:** quase inexistente — apenas [e2e/features/active-effects.spec.ts](../../e2e/features/active-effects.spec.ts) e [e2e/features/active-effects-player.spec.ts](../../e2e/features/active-effects-player.spec.ts) tocam a rota `/app/campaigns/[id]/sheet`. Tudo mais que é "player" testa o modo combate em `/app/combat/[id]` ou `/join/[token]`, não o HQ.
- **Maior parity gap:** nada testa a **topologia 4-tabs nova** (Herói/Arsenal/Diário/Mapa) porque ela ainda não existe. Nenhum teste dos 3 modos verifica switching de tab via deep-link `?tab=` ou atalhos `1-4`.
- **Maior área untested de alto risco:** Fase D (player_notes + player_favorites + parser `@` backlinks) e Fase E (level_up_invitations wizard). Zero cobertura prévia, feature nova + schema novo + RLS nova + realtime novo.
- **Testes novos necessários (conservador):** **~48 testes** distribuídos em 5 waves (A: 4, B: 9, C: 13, D: 14, E: 8). Estimativa efforts: 14–20 dev-days só de QA.
- **Combat Parity vs. Player HQ:** muitas features (Diário editor, Biblioteca favoritos, Wizard Level Up) são **Auth-only** por design (exigem persistência). Guest/Anon ficam ⛔ com razão documentada — isso reduz o fan-out em ~40%.
- **Resilient Reconnection:** já bem coberto por J22 e adversarial-reconnect suites — novos tabs (Diário, Arsenal, Mapa) só precisam "fumaça" rápida, não suite própria.
- **Testes existentes com risco de regressão na refactor:** [e2e/features/active-effects.spec.ts:104](../../e2e/features/active-effects.spec.ts#L104) (`goto /sheet`), [e2e/journeys/j21-player-ui-panels.spec.ts](../../e2e/journeys/j21-player-ui-panels.spec.ts) (spell slots + bottom bar), [e2e/features/active-effects-player.spec.ts](../../e2e/features/active-effects-player.spec.ts), [e2e/campaign/mind-map.spec.ts](../../e2e/campaign/mind-map.spec.ts) (mind-map como Jogador em §10). Qualquer renomeação de seletor ou move de DOM dentro do shell pode quebrar esses.
- **Visual regression:** [e2e/visual/visual-regression.spec.ts](../../e2e/visual/visual-regression.spec.ts) hoje NÃO cobre `/sheet` — precisa ser estendido na Fase A (baseline pré-densificação) e na Fase B (baseline pós-topologia).
- **A11y:** [e2e/a11y/accessibility.spec.ts](../../e2e/a11y/accessibility.spec.ts) não toca `/sheet` hoje (só landing, try, monsters, spells, login, signup). É gap P1 em Fase B.

---

## 2. Current coverage inventory

Linhas em **negrito** = diretamente impacta a refactor de Player HQ ou está em risco de regressão.

| Spec file | Purpose | Modes (G/A/Auth) | Features cobertas | Status |
|---|---|---|---|---|
| [e2e/visitor/try-mode.spec.ts](../../e2e/visitor/try-mode.spec.ts) | Guest `/try` smoke | G | Encounter setup, add combatant, start combat, no-login | passing |
| [e2e/visitor/landing-page.spec.ts](../../e2e/visitor/landing-page.spec.ts) | Landing SEO/CTAs | G | Hero, nav, CTAs | passing |
| [e2e/visitor/guided-tour.spec.ts](../../e2e/visitor/guided-tour.spec.ts) | Onboarding tour | G | Tour steps, skip | passing |
| [e2e/journeys/guest-try-mode.spec.ts](../../e2e/journeys/guest-try-mode.spec.ts) | Guest end-to-end combat | G | Full combat sem auth | passing |
| [e2e/journeys/j8-try-full-funnel.spec.ts](../../e2e/journeys/j8-try-full-funnel.spec.ts) | Guest → signup funnel | G→Auth | Upsell surfaces | passing |
| [e2e/journeys/j17-sprint-audio-feedback.spec.ts](../../e2e/journeys/j17-sprint-audio-feedback.spec.ts) | Guest UX (dice history, HP tiers, leaderboard) | G | HP tier bars, dice history, ambient | passing |
| [e2e/guest-qa/guest-desktop-journey.spec.ts](../../e2e/guest-qa/guest-desktop-journey.spec.ts) | 16 guest desktop E2Es | G | Upsell, recap, session expiry, combat toolbar | passing |
| [e2e/guest-qa/guest-mobile-journey.spec.ts](../../e2e/guest-qa/guest-mobile-journey.spec.ts) | Guest mobile full suite | G (mobile) | idem mobile | passing |
| [e2e/auth/login.spec.ts](../../e2e/auth/login.spec.ts) | Login form | - | Auth only | passing |
| [e2e/dashboard/player-continuity.spec.ts](../../e2e/dashboard/player-continuity.spec.ts) | Dashboard 4-sections + default char | Auth | Dashboard, default badge | passing |
| [e2e/combat/session-create.spec.ts](../../e2e/combat/session-create.spec.ts) | DM cria sessão | Auth | Session creation | passing |
| [e2e/combat/turn-advance.spec.ts](../../e2e/combat/turn-advance.spec.ts) | Turn advance core | Auth + A | Next turn, broadcast | passing |
| [e2e/combat/rapid-add.spec.ts](../../e2e/combat/rapid-add.spec.ts) | Rapid add combatants | Auth | Mid-combat add | passing |
| [e2e/combat/lair-actions.spec.ts](../../e2e/combat/lair-actions.spec.ts) | Lair initiative ordering | Auth + A | Lair action entries | passing |
| [e2e/combat/load-test-concurrent-players.spec.ts](../../e2e/combat/load-test-concurrent-players.spec.ts) | 5+ concurrent players | Auth + A | Realtime scale | unknown (CI-gated) |
| [e2e/combat/multi-player-stress.spec.ts](../../e2e/combat/multi-player-stress.spec.ts) | Stress multi-player | Auth + A | Realtime throughput | unknown |
| [e2e/combat/player-join.spec.ts](../../e2e/combat/player-join.spec.ts) | /join flows (anon + auth) | A + Auth | Late-join, anon no-login | passing |
| [e2e/combat/player-view.spec.ts](../../e2e/combat/player-view.spec.ts) | Player combat view core | A + Auth | Turn banner, init board, bottom bar, note input, combat log | passing |
| **[e2e/combat/adversarial-rapid-dm-actions.spec.ts](../../e2e/combat/adversarial-rapid-dm-actions.spec.ts)** | Rapid DM events → player state | Auth + A | Broadcast ordering | passing |
| [e2e/combat/adversarial-visibility-sleep.spec.ts](../../e2e/combat/adversarial-visibility-sleep.spec.ts) | visibilitychange | A + Auth | Resilient reconnect | passing |
| [e2e/combat/adversarial-wifi-bounce.spec.ts](../../e2e/combat/adversarial-wifi-bounce.spec.ts) | Network drop + resume | A + Auth | Reconnect | passing |
| [e2e/combat/adversarial-dm-crash-recovery.spec.ts](../../e2e/combat/adversarial-dm-crash-recovery.spec.ts) | DM tab crash | Auth + A | DM reconnect | passing |
| [e2e/combat/adversarial-late-join-deep.spec.ts](../../e2e/combat/adversarial-late-join-deep.spec.ts) | Late join mid-combat | A + Auth | Late-join state | passing |
| [e2e/combat/adversarial-network-failure.spec.ts](../../e2e/combat/adversarial-network-failure.spec.ts) | Long offline | A + Auth | Reconnect with stale state | passing |
| [e2e/combat/adversarial-concurrent-reconnections.spec.ts](../../e2e/combat/adversarial-concurrent-reconnections.spec.ts) | N players reconnect | A + Auth | Concurrent reconnect | passing |
| [e2e/combat/adversarial-delayed-reconnection.spec.ts](../../e2e/combat/adversarial-delayed-reconnection.spec.ts) | Long-gap reconnect | A + Auth | DM timer stale detection | passing |
| [e2e/combat/adversarial-long-session.spec.ts](../../e2e/combat/adversarial-long-session.spec.ts) | Multi-hour combat | Auth + A | Stability | unknown |
| [e2e/combat/adversarial-large-battle.spec.ts](../../e2e/combat/adversarial-large-battle.spec.ts) | 20+ combatants | Auth + A | Perf | unknown |
| [e2e/invite/anon-to-auth-via-join.spec.ts](../../e2e/invite/anon-to-auth-via-join.spec.ts) | Anon → Auth upgrade CTA | A→Auth | Signup banner, session preserve | passing |
| [e2e/features/anon-claim-upgrade-ownership.spec.ts](../../e2e/features/anon-claim-upgrade-ownership.spec.ts) | Anon claim char | A→Auth | Ownership preservation | passing |
| [e2e/features/identity-upgrade-mid-combat.spec.ts](../../e2e/features/identity-upgrade-mid-combat.spec.ts) | Mid-combat upgrade | A→Auth | Turn preserve | passing |
| [e2e/features/guest-signup-character-portable.spec.ts](../../e2e/features/guest-signup-character-portable.spec.ts) | Guest → Auth portable | G→Auth | Character migration | passing |
| **[e2e/features/active-effects.spec.ts](../../e2e/features/active-effects.spec.ts)** | Active effects lifecycle no Player HQ + DM view | Auth | Active Effects full, `/sheet` route | passing (only 2 tests) |
| **[e2e/features/active-effects-player.spec.ts](../../e2e/features/active-effects-player.spec.ts)** | DM adds effects → aparece pro player | Auth | Active Effects DM→Player | passing |
| [e2e/features/audio-broadcast.spec.ts](../../e2e/features/audio-broadcast.spec.ts) | Audio broadcast | Auth + A | DM controls | passing |
| [e2e/features/recap-persistence.spec.ts](../../e2e/features/recap-persistence.spec.ts) | Recap persiste | Auth + A | Latest-recap endpoint | passing |
| [e2e/features/feedback-retroactive.spec.ts](../../e2e/features/feedback-retroactive.spec.ts) | /feedback/[token] voting | G | Anon feedback | passing |
| [e2e/features/qa-login-check.spec.ts](../../e2e/features/qa-login-check.spec.ts) | QA smoke login | Auth | Auth sanity | passing |
| [e2e/features/entity-graph-mindmap-focus.spec.ts](../../e2e/features/entity-graph-mindmap-focus.spec.ts) | Mind map focus route | Auth | Focus deep link | passing |
| [e2e/features/entity-graph-combat-parity.spec.ts](../../e2e/features/entity-graph-combat-parity.spec.ts) | Entity graph NOT leaking to Guest/Anon | G + A | Auth gate | passing |
| [e2e/features/entity-graph-note-mentions.spec.ts](../../e2e/features/entity-graph-note-mentions.spec.ts) | Note linking NPC/Loc/Faction | Auth | Backlinks (DM-side) | passing |
| [e2e/features/entity-graph-faction-members.spec.ts](../../e2e/features/entity-graph-faction-members.spec.ts) | Faction membership edges | Auth | Graph edges | passing |
| [e2e/features/entity-graph-location-hierarchy.spec.ts](../../e2e/features/entity-graph-location-hierarchy.spec.ts) | Location tree | Auth | Graph hierarchy | passing |
| [e2e/features/entity-graph-location-cycle-guard.spec.ts](../../e2e/features/entity-graph-location-cycle-guard.spec.ts) | Cycle guard | Auth | Constraint | passing |
| [e2e/features/entity-graph-npc-location-link.spec.ts](../../e2e/features/entity-graph-npc-location-link.spec.ts) | NPC ↔ Location | Auth | Graph edges | passing |
| [e2e/features/entity-graph-rls-invisible-npc.spec.ts](../../e2e/features/entity-graph-rls-invisible-npc.spec.ts) | RLS hiding NPCs | Auth + A | RLS + hidden NPC | passing |
| [e2e/features/entity-graph-chip-navigation.spec.ts](../../e2e/features/entity-graph-chip-navigation.spec.ts) | Chip navigation | Auth | Cross-nav via chips | passing |
| [e2e/features/entity-graph-i18n-parity.spec.ts](../../e2e/features/entity-graph-i18n-parity.spec.ts) | i18n labels | Auth | i18n | passing |
| **[e2e/campaign/mind-map.spec.ts](../../e2e/campaign/mind-map.spec.ts)** | Mind map full suite (1012+ lines, 10 describe blocks) | Auth + limited A | Nodes, filters, layout, drag, scroll, note types, Location/Faction CRUD, i18n, player role restrictions | passing |
| [e2e/compendium-anon-gating.spec.ts](../../e2e/compendium-anon-gating.spec.ts) | Compendium anon gate | A | Anon gating | passing |
| [e2e/compendium-edition-filter.spec.ts](../../e2e/compendium-edition-filter.spec.ts) | SRD 2014/2024 filter | G + Auth | Edition filter | passing |
| **[e2e/compendium-favorites-throttle.spec.ts](../../e2e/compendium-favorites-throttle.spec.ts)** | Favorites API throttle | Auth | /api/favorites request budget | passing |
| [e2e/audio/soundboard.spec.ts](../../e2e/audio/soundboard.spec.ts) | Soundboard | Auth | Audio | passing |
| [e2e/audio/dm-controls.spec.ts](../../e2e/audio/dm-controls.spec.ts) | DM audio controls | Auth | Audio | passing |
| [e2e/audio/audio-favorites.spec.ts](../../e2e/audio/audio-favorites.spec.ts) | Audio favorites | Auth | Audio | passing |
| [e2e/audio/audio-upload.spec.ts](../../e2e/audio/audio-upload.spec.ts) | Upload | Auth | Audio | passing |
| [e2e/i18n/language.spec.ts](../../e2e/i18n/language.spec.ts) | i18n EN vs PT-BR | Auth + A | Locale switch + reconnect | passing |
| [e2e/player-throttle.spec.ts](../../e2e/player-throttle.spec.ts) | Player API throttle | A | Throttle | passing |
| [e2e/release/release-2026-04-20.spec.ts](../../e2e/release/release-2026-04-20.spec.ts) | Release smoke | G + Auth | Release sanity | passing |
| [e2e/onboarding/dashboard-tour.spec.ts](../../e2e/onboarding/dashboard-tour.spec.ts) | Dashboard tour | Auth | Tour | passing |
| [e2e/onboarding/sprint1-token-survival.spec.ts](../../e2e/onboarding/sprint1-token-survival.spec.ts) | JO-01..JO-04 invite/join banners | G→Auth | Onboarding | passing |
| [e2e/conversion/dismissal-memory.spec.ts](../../e2e/conversion/dismissal-memory.spec.ts) | Dismissal cap | G + A | Upsell cap | passing |
| **[e2e/conversion/recap-anon-signup.spec.ts](../../e2e/conversion/recap-anon-signup.spec.ts)** | Anon recap → signup → dashboard | A→Auth | Post-combat redirect (dashboard, NOT /sheet) | passing |
| **[e2e/conversion/recap-guest-signup-migrate.spec.ts](../../e2e/conversion/recap-guest-signup-migrate.spec.ts)** | Guest recap picker → signup → dashboard | G→Auth | Character migration (dashboard, NOT /sheet) | passing |
| [e2e/conversion/waiting-room-signup.spec.ts](../../e2e/conversion/waiting-room-signup.spec.ts) | Waiting room signup | A→Auth | Pre-combat signup | passing |
| [e2e/conversion/waiting-room-signup-race.spec.ts](../../e2e/conversion/waiting-room-signup-race.spec.ts) | Race conditions | A→Auth | Race | passing |
| [e2e/conversion/turn-safety.spec.ts](../../e2e/conversion/turn-safety.spec.ts) | Turn safety in upgrade | A→Auth | Turn preserve | passing |
| [e2e/upsell/upsell-surface.spec.ts](../../e2e/upsell/upsell-surface.spec.ts) | DM upsell funnel | Auth | become-dm route | passing |
| [e2e/a11y/accessibility.spec.ts](../../e2e/a11y/accessibility.spec.ts) | axe on 6 pages | G | WCAG AA on landing/try/monsters/spells/auth — **NÃO cobre /sheet** | passing |
| [e2e/visual/visual-regression.spec.ts](../../e2e/visual/visual-regression.spec.ts) | Visual baselines (7 screenshots) | G | Landing/Try/Compendium/Auth — **NÃO cobre /sheet** | passing |
| [e2e/journeys/j1-first-combat.spec.ts](../../e2e/journeys/j1-first-combat.spec.ts) | First combat happy path | Auth | DM first-time | passing |
| [e2e/journeys/j2-player-join.spec.ts](../../e2e/journeys/j2-player-join.spec.ts) | Player join realtime | A + Auth | HP realtime, notification, mobile | passing |
| [e2e/journeys/j3-dm-returns.spec.ts](../../e2e/journeys/j3-dm-returns.spec.ts) | Returning DM retention | Auth | Dashboard, resume, presets | passing |
| [e2e/journeys/j5-share-link.spec.ts](../../e2e/journeys/j5-share-link.spec.ts) | Share link multi-player | A + Auth | Share | passing |
| [e2e/journeys/j6-combat-core-loop.spec.ts](../../e2e/journeys/j6-combat-core-loop.spec.ts) | DM core loop (damage, condition, heal, turns) | Auth + A | HP, conditions, turn order | passing |
| [e2e/journeys/j7-compendium-oracle.spec.ts](../../e2e/journeys/j7-compendium-oracle.spec.ts) | Compendium oracle | Auth | Compendium | passing |
| [e2e/journeys/j9-dm-vs-player-visibility.spec.ts](../../e2e/journeys/j9-dm-vs-player-visibility.spec.ts) | DM vs player visibility | Auth + A | Anti-metagaming, HP tiers visible to player | passing |
| [e2e/journeys/j10-free-all-features.spec.ts](../../e2e/journeys/j10-free-all-features.spec.ts) | Free tier feature access | Auth | Dashboard, compendium, settings | passing |
| **[e2e/journeys/j11-player-view-complete.spec.ts](../../e2e/journeys/j11-player-view-complete.spec.ts)** | Player view UI completa | A + Auth | HP tiers, turn highlight, mobile, realtime HP | passing |
| [e2e/journeys/j12-combat-resilience.spec.ts](../../e2e/journeys/j12-combat-resilience.spec.ts) | Resilience (DM + Player refresh/reopen) | Auth + A | Refresh recovery | passing |
| [e2e/journeys/j13-mobile-all-journeys.spec.ts](../../e2e/journeys/j13-mobile-all-journeys.spec.ts) | Mobile (Pixel 5) full | G + Auth + A | Mobile journeys | passing |
| [e2e/journeys/j14-i18n-journeys.spec.ts](../../e2e/journeys/j14-i18n-journeys.spec.ts) | i18n journeys | G + Auth + A | Locale labels | passing |
| [e2e/journeys/j15-comprehensive-qa-sweep.spec.ts](../../e2e/journeys/j15-comprehensive-qa-sweep.spec.ts) | QA sweep A-Q (landing, auth, dashboard, campaign, encounter, combat, HP adjuster, share, settings, a11y) | G + Auth | Big coverage | passing |
| [e2e/journeys/j16-full-platform-walkthrough.spec.ts](../../e2e/journeys/j16-full-platform-walkthrough.spec.ts) | Full platform walk | Auth | Platform | passing |
| [e2e/journeys/j18-compendium-full-coverage.spec.ts](../../e2e/journeys/j18-compendium-full-coverage.spec.ts) | Compendium deep | G + Auth | Compendium | passing |
| **[e2e/journeys/j19-player-combat-actions.spec.ts](../../e2e/journeys/j19-player-combat-actions.spec.ts)** | Player actions: End Turn, HP self, Death saves, Reaction, Turn notif | A + Auth | HP buttons (Dano/Cura), death saves, reaction toggle | passing |
| **[e2e/journeys/j20-player-communication.spec.ts](../../e2e/journeys/j20-player-communication.spec.ts)** | Chat, postits, inline notes, shared notes | A + Auth | Player inline note, DM postit, shared notes panel | passing |
| **[e2e/journeys/j21-player-ui-panels.spec.ts](../../e2e/journeys/j21-player-ui-panels.spec.ts)** | Compendium panel, spell slots, bottom bar, sync, HP colors | A + Auth | **Spell slot tracker + dot toggle + long rest + persist reload**; mobile bottom bar; sync indicator; HP tiers | passing (several skips if seed missing) |
| **[e2e/journeys/j22-player-resilience.spec.ts](../../e2e/journeys/j22-player-resilience.spec.ts)** | Reconnect / refresh / tab close / network / late-join / visibility | A + Auth | Full resilient reconnection | passing |
| [e2e/journeys/dm-happy-path.spec.ts](../../e2e/journeys/dm-happy-path.spec.ts) | DM happy path | Auth | E2E DM | passing |
| [e2e/journeys/dm-reconnect.spec.ts](../../e2e/journeys/dm-reconnect.spec.ts) | DM reconnect | Auth | Reconnect | passing |
| [e2e/journeys/player-mobile.spec.ts](../../e2e/journeys/player-mobile.spec.ts) | Player mobile | A + Auth | Mobile | passing |

**Total specs:** 91. **Player-HQ-route (`/sheet`) relevantes hoje:** 2 (active-effects family). **Risk-of-regression na refactor:** ~15 arquivos listados em negrito acima.

---

## 3. Story → E2E Matrix (35 rows)

### Fase A — Quick Wins (densificação sem topologia nova)

| Story ID | Title | Fase | Guest | Anon | Auth | Min merge gate (1 linha) |
|---|---|---|---|---|---|---|
| A1 | Aplicar spacing tokens novos na ficha | A | ⛔ (sem `/sheet`) | ⛔ (anon não usa Player HQ full) | 🆕 + visual-reg | Visual regression baseline (Auth desktop+mobile) no `/sheet` não exibe overflow |
| A2 | Remover accordion de atributos (ability chips sempre visíveis) | A | ⛔ | ⛔ | ✅ ajustar | [j19-player-combat-actions.spec.ts](../../e2e/journeys/j19-player-combat-actions.spec.ts) não testa sheet ability chips — adicionar assertion "6 ability chips visíveis sem click" |
| A3 | Densificar perícias (grid 3-col desktop) | A | ⛔ | ⛔ | 🆕 | 18 perícias visíveis em ≤240px (desktop 1280+) via screenshot regression |
| A4 | Header em 2 linhas (era 4) | A | ⛔ | ⛔ | 🆕 | Header ≤56px altura (DOM assertion) |
| A5 | HP controls inline no HpDisplay | A | ⛔ | ⛔ | 🆕 refactor de [j21.B](../../e2e/journeys/j21-player-ui-panels.spec.ts) | HP +/- buttons permanecem funcionais no `/sheet` (tap target ≥44px mobile); HP Temp row aparece só se >0 |
| A6 | Pós-combate redireciona pro Herói | A | 🆕 (Guest `/try`: comportamento existente mantido) | 🆕 | 🆕 (auto-redirect 5s) | 3 cenários: (1) Auth member: combat:ended → toast CTA → /sheet?tab=heroi; (2) Anon: recap CTA + OAuth claim redirect; (3) Banner "Combate vencido!" some em 30s |

**Nota A6:** spec já exige "E2E: cobre 3 cenários (auth member, anon via /join, guest via /try)" — essa é a story com **maior fan-out de teste da Fase A**.

### Fase B — Topologia 7→4 (Herói/Arsenal/Diário/Mapa)

| Story ID | Title | Fase | Guest | Anon | Auth | Min merge gate |
|---|---|---|---|---|---|---|
| B1 | Novo PlayerHqShell com 4 tabs | B | ⛔ | ⛔ | 🆕 | Todas 4 tabs renderizam content distinto; ícones Heart/Package/BookOpen/Network presentes |
| B2 | Composição dos componentes existentes nos tabs novos | B | ⛔ | ⛔ | 🆕 (smoke) | Cada tab tem componentes esperados (CharacterStatusPanel em Herói; AbilitiesSection em Arsenal; etc.) |
| B3 | Back-compat de deep links (?tab=ficha → ?tab=heroi) | B | ⛔ | ⛔ | 🆕 | 7 mappings validados (ficha/recursos/habilidades/inventario/notas/quests/map → novos) |
| B4 | Default tab = Herói + persistência 24h | B | ⛔ | ⛔ | 🆕 | (1) 1ª visita: Herói default; (2) switch Arsenal + reload <24h = Arsenal; (3) simular timestamp >24h = volta pra Herói |
| B5 | Atalhos teclado 1-4 + `?` | B | ⛔ | ⛔ | 🆕 | Key press `1`/`2`/`3`/`4` troca tab; `?` abre overlay; atalhos ignorados em input |
| B6 | E2E Playwright: topologia basic (JÁ prevista na own story) | B | ⛔ | ⛔ | 🆕 (5 cenários) | O que a própria story B6 exige (Fase B DoD) |
| — (extra QA) | Visual regression baseline 4 tabs (3 breakpoints) | B | ⛔ | ⛔ | 🆕 | Screenshot cada tab em 390/1024/1440; baseline salvo pós-merge |
| — (extra QA) | a11y axe em `/sheet?tab=heroi` | B | ⛔ | ⛔ | 🆕 | axe WCAG AA pass (extensão de [e2e/a11y/accessibility.spec.ts](../../e2e/a11y/accessibility.spec.ts)) |
| — (extra QA) | Regressão: J21 + active-effects continuam passando | B | — | ✅ | ✅ | Executar J21 + active-effects contra sheet novo; zero skip novo |

### Fase C — Ribbon Vivo + Modo Combate Auto

| Story ID | Title | Fase | Guest | Anon | Auth | Min merge gate |
|---|---|---|---|---|---|---|
| C1 | Componente `<RibbonVivo />` sticky 2 linhas | C | ⛔ | 🆕 (parcial) | 🆕 | Ribbon sticky top:0; HP bar full-width; pulse gold ao mudar HP; mobile compacto funciona |
| C2 | Resumo de slots no ribbon | C | ⛔ | ⛔ (anon não tem caster state persistido) | 🆕 | Caster: slots aparecem; non-caster: ribbon esconde slot summary |
| C3 | Layout 2-col desktop (≥1280px) | C | ⛔ | ⛔ | 🆕 | Responsive: 1280+ grid 2-col, <1280 single-col |
| C4 | Hook `useCampaignCombatState` | C | ⛔ | ✅ parcial ([j11](../../e2e/journeys/j11-player-view-complete.spec.ts)) | 🆕 | Subscribe channel; broadcast `combat:started` flips `active=true` em <2s; cleanup em unmount (zero channel leak) |
| C5 | Modo Combate Auto (banner + badge + re-layout) | C | ⛔ | 🆕 | 🆕 | 3 cenários: (1) broadcast combat:started → badge pulsante em <2s; (2) jogador em Diário + combat → banner em Herói mas Diário permanece ativo; (3) combat:ended → banner fade em <400ms |
| C6 | E2E Playwright: Modo Combate Auto (JÁ previsto) | C | ⛔ | 🆕 (incluído C6) | 🆕 | O que a story C6 exige (5 cenários) |
| C7 | Ability chip rolável (CHECK + SAVE zones) | C | ⛔ | ⛔ (anon sem `roll_history` persistido) | 🆕 | (1) Click zona CHECK → toast `STR check: N (mod+roll)`; (2) Click zona SAVE com prof → `+mod +PB`; (3) long-press abre Advantage menu; (4) Broadcast pro Mestre em <500ms |
| — (extra QA) | Dots refactor (decisão #37 — spell slot invertido) | C | ⛔ | ✅ parcial via J21.B | 🆕 | Slot dot: `○ = disponível`, `●= gasto`; reaction preserva padrão; regressão de J21.B atualizada |
| — (extra QA) | Badge "conc" = azul #7DD3FC (decisão #45) | C | ⛔ | ⛔ | 🆕 | Effect com concentration exibe badge `conc` com cor `--concentration` (visual-reg) |

### Fase D — Mini-wiki + Backlinks + Biblioteca

**Combat Parity baseline:** toda Fase D é Auth-primária (player_notes + player_favorites exigem persistência). Anon cai em "empty + prompt crie conta". Guest ⛔ total.

| Story ID | Title | Fase | Guest | Anon | Auth | Min merge gate |
|---|---|---|---|---|---|---|
| D1 | Migration `player_notes` + RLS + hooks | D | ⛔ | 🆕 (negative: anon não vê notas de outro user) | 🆕 | RLS: usuário A não lê notas do user B; dual-auth (user_id XOR session_token_id) funciona |
| D2 | Editor markdown (Diário > Minhas Notas) | D | ⛔ | 🆕 (CTA "crie conta pra salvar" aparece) | 🆕 | CRUD: create → edit → search → delete; auto-save 30s; mobile usável |
| D3 | Parser `@` frontend + edges batch | D | ⛔ | ⛔ | 🆕 | `@Grolda` → chip; autocomplete ao digitar `@`; edges inseridas em `campaign_mind_map_edges` com rel='mentions'; edges removidas ao apagar menção |
| D4 | Cross-nav Diário ↔ Mapa | D | ⛔ | 🆕 (limited: pode navegar mas não persiste) | 🆕 | (1) Click "Ver no Mapa" em NPC card → `?tab=mapa&drawer=npc:{id}`; (2) Click "Ver no Diário" no drawer do Mapa → `?tab=diario&section=npcs&id={id}`; (3) URL compartilhável abre estado correto |
| D5 | Notificações in-app (notas do Mestre + quests) | D | ⛔ | 🆕 | 🆕 | (1) Broadcast `note:received` → badge em Diário aparece em <2s; (2) `quest:assigned` → badge; (3) badge some ao marcar lida |
| D6 | Migration `player_favorites` + RLS + hook | D | ⛔ | 🆕 (anon via RPC session_token) | 🆕 | RLS ownership; anon pode favoritar via session_token (padrão mig 069); unique constraint OK |
| D7 | Botão ⭐ Favoritar em fichas do compêndio | D | ⛔ | 🆕 (prompt "crie conta" no 1º click) | 🆕 | 3 cenários: (1) Auth: click favorita, persiste cross-session, pulse gold; (2) Anon: 1º click mostra prompt; (3) Atalho `F` funciona em drawer |
| D8 | Sub-aba Biblioteca em Diário | D | ⛔ | 🆕 (empty + prompt) | 🆕 | (1) Lista favoritos agrupada por tipo; (2) filtros combinados com search; (3) empty state amigável; (4) click card → drawer completo; (5) cross-nav pro Mapa em monstros/NPCs |
| D9 | Ctrl+K busca favoritos junto com compêndio | D | ⛔ | 🆕 (só compêndio — sem favoritos pessoais) | 🆕 | Ctrl+K abre palette; favoritos aparecem com badge ⭐ e ranqueados primeiro |
| — (extra QA) | Regressão compendium-favorites-throttle | D | — | — | ✅ | [compendium-favorites-throttle.spec.ts](../../e2e/compendium-favorites-throttle.spec.ts) ainda passa com API expandida |
| — (extra QA) | RLS negative: anon A não vê favoritos de anon B | D | ⛔ | 🆕 | ⛔ | Spec negativo de segurança (player_favorites isolamento por session_token) |

### Fase E — Wizard de Level Up

**Combat Parity baseline:** Fase E é **Auth-only**. Level up exige personagem persistente com classe/nível; Mestre é sempre Auth; `level_up_invitations` tem RLS por `user_id`. Guest + Anon ⛔ com razão "no persistent character".

| Story ID | Title | Fase | Guest | Anon | Auth | Min merge gate |
|---|---|---|---|---|---|---|
| E1 | Migration `level_up_invitations` + RLS | E | ⛔ | ⛔ | 🆕 | RLS: Mestre full CRUD, Player read/update próprio; TTL 7 dias default; INSERT batch funciona |
| E2 | UI do Mestre — botão "Liberar Level Up" | E | ⛔ | ⛔ | 🆕 | (1) Modal abre com lista characters + nível atual; (2) multi-select; (3) confirm → INSERT + broadcast `levelup:offered` |
| E3 | Chip dourado no ribbon (sinal pro Jogador) | E | ⛔ | ⛔ | 🆕 | (1) Após `levelup:offered`, chip "🎉 Subir de Nível →" aparece no ribbon em <2s; (2) persiste pós-reload (estado servidor); (3) some após completed/declined/expired |
| E4 | Wizard esqueleto + steps 1-2 (Class + HP) | E | ⛔ | ⛔ | 🆕 | (1) Abre wizard; stepper ●○○○○○; (2) single-class auto-skip step 1; (3) step 2 "Rolar" ou "Média" + HP mínimo validado; (4) choices jsonb salvo em cada step |
| E5 | Steps 3-4 (ASI/Feat + Spells) | E | ⛔ | ⛔ | 🆕 | (1) ASI em níveis canônicos (4/8/12/16/19); (2) Feat autocomplete + half-feat; (3) Spells filtradas por classe e atualizadas; (4) slots recalculados auto |
| E6 | Steps 5-6 (Features + Subclass + Review) | E | ⛔ | ⛔ | 🆕 | (1) Features com descrição SRD; (2) subclass aparece só em nível canônico por classe; (3) Final Review mostra tudo; (4) confirm → UPDATE character + broadcast `levelup:completed` |
| E7 | UI Mestre — toast completion + cancel + auto-expire | E | ⛔ | ⛔ | 🆕 | (1) Toast pro Mestre ao `levelup:completed`; (2) botão Cancel → status='cancelled' + broadcast; (3) cron/trigger marca expired |
| — (extra QA) | Negative: Player B não pode aceitar invitation do Player A | E | ⛔ | ⛔ | 🆕 | RLS test: UPDATE com wrong user_id retorna 0 rows |
| — (extra QA) | Regressão: wizard cancel preserva invitation pending | E | ⛔ | ⛔ | 🆕 | Cancelar no meio do wizard → invitation fica pending, reabrir no ribbon volta pro step salvo |

---

## 4. Wave merge gates

Cada gate é o conjunto mínimo de specs que DEVE estar verde antes de mergear a wave.

### Gate Fase A — "Densificação sem regressão"
1. [e2e/features/active-effects.spec.ts](../../e2e/features/active-effects.spec.ts) + [e2e/features/active-effects-player.spec.ts](../../e2e/features/active-effects-player.spec.ts) — **zero regressão**
2. [e2e/journeys/j21-player-ui-panels.spec.ts](../../e2e/journeys/j21-player-ui-panels.spec.ts) — spell slots, bottom bar, sync indicator, HP tiers (B1-E2) continuam passando
3. [e2e/journeys/j19-player-combat-actions.spec.ts](../../e2e/journeys/j19-player-combat-actions.spec.ts) — HP actions, end-turn, death saves (A-E) continuam passando
4. NOVO: **`sheet-visual-baseline.spec.ts`** — 3 screenshots (mobile 390 / tablet 1024 / desktop 1440) sem overflow
5. NOVO: **`sheet-ability-chips-always-visible.spec.ts`** — 6 chips STR/DEX/CON/INT/WIS/CHA sem click prévio
6. NOVO: **`sheet-hp-controls-inline.spec.ts`** — HP buttons inline, HP Temp row conditional
7. NOVO (A6, 3 cenários): **`post-combat-redirect-heroi.spec.ts`** — Guest+Anon+Auth cobertos (essa é obrigatória por Combat Parity Rule)

### Gate Fase B — "Topologia 4 tabs funcional"
1. Gate A (todos)
2. NOVO (B6): **`player-hq-topology.spec.ts`** — 5 cenários de B6 exigidos pela própria story
3. NOVO: **`player-hq-deep-links.spec.ts`** — 7 mappings de back-compat (?tab=ficha/recursos/habilidades/inventario/notas/quests/map)
4. NOVO: **`player-hq-keyboard-shortcuts.spec.ts`** — 1/2/3/4 + `?` + ignore em input
5. NOVO: **`player-hq-tab-persistence.spec.ts`** — default Herói + 24h localStorage TTL
6. NOVO: **`sheet-a11y.spec.ts`** — extensão de [a11y](../../e2e/a11y/accessibility.spec.ts) para `/sheet?tab=heroi` e demais
7. [e2e/campaign/mind-map.spec.ts](../../e2e/campaign/mind-map.spec.ts) — mind map como Jogador (§10) continua passando dentro da aba Mapa nova

### Gate Fase C — "Ribbon Vivo + Modo Combate Auto"
1. Gate B (todos)
2. NOVO (C6): **`player-hq-combat-auto.spec.ts`** — 5 cenários da story C6
3. NOVO: **`ribbon-vivo-sticky.spec.ts`** — sticky, 2 linhas, mobile compacto, CLS <0.1
4. NOVO: **`ability-chip-roller.spec.ts`** — CHECK vs SAVE zones + broadcast + long-press advantage
5. NOVO: **`spell-slot-dots-inverted.spec.ts`** — decisão #37 (○=disponível, ●=gasto) + J21.B atualizado
6. NOVO: **`concentration-badge-color.spec.ts`** — cor sky #7DD3FC visual regression
7. **Combat Parity obrigatória:** Anon (`/join`) também recebe ribbon quando aplicável — cenário C1+C4+C5 em anon
8. Regressão de [adversarial-visibility-sleep](../../e2e/combat/adversarial-visibility-sleep.spec.ts) + [adversarial-wifi-bounce](../../e2e/combat/adversarial-wifi-bounce.spec.ts) (Resilient Reconnection preservado)

### Gate Fase D — "Wiki + Backlinks + Biblioteca"
1. Gate C (todos)
2. NOVO: **`player-notes-crud.spec.ts`** — create/edit/search/delete + auto-save
3. NOVO: **`player-notes-rls.spec.ts`** — RLS negative (anon A ≠ anon B ≠ user B)
4. NOVO: **`backlinks-parser-at-mention.spec.ts`** — `@Grolda` autocomplete + edge insert + edge remove on delete
5. NOVO: **`diario-mapa-crossnav.spec.ts`** — URL compartilhável bidirecional
6. NOVO: **`player-favorites-toggle.spec.ts`** — Auth + Anon prompt + atalho `F`
7. NOVO: **`biblioteca-sub-tab.spec.ts`** — lista + filtros + search + drawer + cross-nav
8. NOVO: **`ctrl-k-favorites-boost.spec.ts`** — favoritos ranqueados primeiro com badge ⭐
9. NOVO: **`dm-notes-inbox-realtime.spec.ts`** — badge em <2s para `note:received` / `quest:assigned`
10. Regressão: [compendium-favorites-throttle](../../e2e/compendium-favorites-throttle.spec.ts) continua passando

### Gate Fase E — "Wizard de Level Up"
1. Gate D (todos)
2. NOVO: **`levelup-dm-release.spec.ts`** — modal Mestre + multi-select + INSERT batch + broadcast
3. NOVO: **`levelup-chip-in-ribbon.spec.ts`** — chip aparece <2s, persiste pós-reload, some após completed
4. NOVO: **`levelup-wizard-full-flow.spec.ts`** — 6 steps end-to-end (rogue single-class sem spells)
5. NOVO: **`levelup-wizard-caster.spec.ts`** — 6 steps para caster (bard/wizard) cobrindo step 4 spells
6. NOVO: **`levelup-wizard-resume-mid.spec.ts`** — fechar no step 3 e reabrir retoma no step 3
7. NOVO: **`levelup-rls-isolation.spec.ts`** — Player B não aceita invitation de Player A
8. NOVO: **`levelup-dm-feedback-cancel.spec.ts`** — toast + cancel broadcast + auto-expire
9. Regressão: criar personagem + `✎ Editar` manual continua funcionando (fallback)

---

## 5. Parity gaps em testes atuais

Listados em ordem de prioridade para resolver durante a refactor.

| # | Gap | Evidência | Prioridade | Resolução proposta |
|---|---|---|---|---|
| 1 | `/sheet` (Player HQ) tem **apenas 2 spec files** tocando a rota; zero coverage da estrutura/shell/tabs | Grep acima | P0 | Criar suite `e2e/features/player-hq-*.spec.ts` na Fase B |
| 2 | Spell slots testados apenas via `/join` (J21.B), não via `/sheet` no fluxo Auth full | [j21-player-ui-panels.spec.ts:261-561](../../e2e/journeys/j21-player-ui-panels.spec.ts#L261) | P0 | Estender J21.B ou criar `sheet-spell-slots.spec.ts` para Auth full |
| 3 | HP controls: testados via `/combat` buttons (J19.B) e `/join` bottom bar (J21.C) mas NÃO no HpDisplay de `/sheet` | [j19](../../e2e/journeys/j19-player-combat-actions.spec.ts), [j21](../../e2e/journeys/j21-player-ui-panels.spec.ts) | P0 | Story A5 cria essa cobertura |
| 4 | Ability scores / modifiers: zero cobertura E2E do "chip visível sem click" | — | P0 | Story A2 cria cobertura |
| 5 | Proficiências (skills/saves) grid: zero cobertura de layout desktop | — | P1 | Story A3 cria |
| 6 | Active Effects: `/sheet` tem cobertura mas SÓ em Auth. Anon via `/join` testado em [active-effects-player](../../e2e/features/active-effects-player.spec.ts) mas não em Player HQ (que anon não acessa full) | grep | P2 | Documentar como Auth-only no matrix |
| 7 | `/sheet` não está em **a11y axe suite** nem em **visual regression suite** | [a11y](../../e2e/a11y/accessibility.spec.ts), [visual](../../e2e/visual/visual-regression.spec.ts) | P0 | Estender ambas no Gate Fase B |
| 8 | Resilient Reconnection **não testa** Player HQ tabs — só `/combat` e `/join` | J22 | P1 | Smoke rápido em Fase B (refresh `/sheet?tab=arsenal` preserva tab) |
| 9 | Pós-combate redirect: **dashboard** hoje ([recap-anon-signup](../../e2e/conversion/recap-anon-signup.spec.ts), [recap-guest-signup-migrate](../../e2e/conversion/recap-guest-signup-migrate.spec.ts)) mas decisão #43 pede `/sheet?tab=heroi` | evidências | P0 | Story A6 ajusta os 2 specs existentes + adiciona novos cenários |
| 10 | Mind Map (atual) é testado só pelo **DM**; jogador em `§10 Player Role Restrictions` mas via `/app/campaigns/[id]` não via `/sheet?tab=mapa` | [mind-map.spec.ts:983-1035](../../e2e/campaign/mind-map.spec.ts#L983) | P1 | Na Fase B adicionar "Mapa tab within `/sheet` preserves player restrictions" |
| 11 | Quests player view: zero coverage E2E (PlayerQuestBoard) | — | P1 | Gate Fase B incluir smoke de quests tab |
| 12 | NpcJournal (player): zero coverage E2E | — | P2 | Gate Fase D (story D4) |
| 13 | Ability check/save roller: zero coverage (feature nova em C7) | — | P0 | Criado via C7 |
| 14 | Realtime `combat_active` → Player HQ badge: hoje testamos broadcast em `/combat`, NÃO o handoff pro Player HQ shell | — | P0 | Criado via C4+C5+C6 |
| 15 | Level up broadcast `levelup:offered` → UI: não existe ainda | — | P0 (para Fase E) | Criado via E3 |
| 16 | RLS negatives: player_favorites + player_notes + level_up_invitations | — | P0 | 3 negatives specs em D + E |
| 17 | Mobile 390px: testado bem em `/combat` e `/try`; NÃO testado em `/sheet` | [j13](../../e2e/journeys/j13-mobile-all-journeys.spec.ts) | P0 | Estender J13 com /sheet mobile smoke na Fase B |

---

## 6. New tests to author — Prioritized backlog

Priority: **P0** = bloqueia merge da wave · **P1** = deve entrar na wave mas pode ser corrigido pós-merge · **P2** = nice-to-have durante a wave, obrigatório antes de feature flag rollout

Effort: **S** = ≤2h · **M** = 2–6h · **L** = 6–12h

| # | Test name | Priority | Mode | Fase unbloqueia | Effort |
|---|---|---|---|---|---|
| 1 | `sheet-visual-baseline.spec.ts` | P0 | Auth | A | M |
| 2 | `sheet-ability-chips-always-visible.spec.ts` | P0 | Auth | A (story A2) | S |
| 3 | `sheet-header-density.spec.ts` (header ≤56px, perícias grid) | P1 | Auth | A (A3+A4) | M |
| 4 | `sheet-hp-controls-inline.spec.ts` | P0 | Auth | A (A5) | M |
| 5 | `post-combat-redirect-heroi-auth.spec.ts` | P0 | Auth | A (A6) | M |
| 6 | `post-combat-redirect-heroi-anon.spec.ts` | P0 | Anon | A (A6) | M |
| 7 | `post-combat-redirect-heroi-guest.spec.ts` | P0 | Guest | A (A6) | M |
| 8 | `player-hq-topology.spec.ts` (5 cenários story B6) | P0 | Auth | B | M |
| 9 | `player-hq-deep-links.spec.ts` (7 mappings) | P0 | Auth | B (B3) | M |
| 10 | `player-hq-keyboard-shortcuts.spec.ts` | P0 | Auth | B (B5) | S |
| 11 | `player-hq-tab-persistence.spec.ts` (localStorage 24h) | P1 | Auth | B (B4) | M |
| 12 | `sheet-a11y-axe.spec.ts` (estender a11y suite) | P0 | Auth + Anon | B | S |
| 13 | `sheet-mobile-390.spec.ts` (estender J13) | P0 | Auth | B | M |
| 14 | `sheet-resilient-reconnection-smoke.spec.ts` | P1 | Auth + Anon | B | M |
| 15 | `sheet-mind-map-player-restrictions.spec.ts` | P1 | Auth | B | M |
| 16 | `sheet-quests-player-view.spec.ts` | P1 | Auth + Anon | B | M |
| 17 | `player-hq-combat-auto.spec.ts` (5 cenários C6) | P0 | Auth + Anon | C | L |
| 18 | `ribbon-vivo-sticky.spec.ts` | P0 | Auth | C (C1) | M |
| 19 | `ribbon-vivo-slot-summary.spec.ts` | P1 | Auth | C (C2) | M |
| 20 | `ribbon-vivo-mobile-expand.spec.ts` | P1 | Auth | C | M |
| 21 | `two-col-desktop-layout.spec.ts` | P1 | Auth | C (C3) | S |
| 22 | `useCampaignCombatState-subscribe.spec.ts` (channel leak check) | P1 | Auth | C (C4) | M |
| 23 | `ability-chip-roller-check.spec.ts` | P0 | Auth | C (C7) | L |
| 24 | `ability-chip-roller-save.spec.ts` | P0 | Auth | C (C7) | L |
| 25 | `ability-chip-longpress-advantage.spec.ts` | P1 | Auth | C (C7) | M |
| 26 | `spell-slot-dots-inverted.spec.ts` (decisão #37) | P0 | Auth + Anon | C | M |
| 27 | `concentration-badge-sky.spec.ts` (visual reg) | P1 | Auth | C (decisão #45) | S |
| 28 | `ribbon-combat-parity-anon.spec.ts` (Combat Parity C1+C5) | P0 | Anon | C | L |
| 29 | `player-notes-crud.spec.ts` | P0 | Auth | D (D1+D2) | L |
| 30 | `player-notes-rls-negative.spec.ts` | P0 | Auth + Anon | D (D1) | M |
| 31 | `player-notes-auto-save.spec.ts` | P1 | Auth | D (D2) | M |
| 32 | `backlinks-parser-at-mention.spec.ts` | P0 | Auth | D (D3) | L |
| 33 | `backlinks-edge-insert-remove.spec.ts` | P1 | Auth | D (D3) | M |
| 34 | `diario-mapa-crossnav.spec.ts` | P0 | Auth | D (D4) | M |
| 35 | `dm-notes-inbox-realtime.spec.ts` | P0 | Auth + Anon | D (D5) | M |
| 36 | `player-favorites-toggle-auth.spec.ts` | P0 | Auth | D (D6+D7) | M |
| 37 | `player-favorites-toggle-anon-prompt.spec.ts` | P0 | Anon | D (D7) | M |
| 38 | `player-favorites-rls-negative.spec.ts` | P0 | Auth + Anon | D (D6) | M |
| 39 | `biblioteca-sub-tab.spec.ts` | P0 | Auth | D (D8) | L |
| 40 | `biblioteca-anon-empty-prompt.spec.ts` | P1 | Anon | D (D8) | M |
| 41 | `ctrl-k-favorites-boost.spec.ts` | P0 | Auth | D (D9) | M |
| 42 | `levelup-dm-release.spec.ts` | P0 | Auth | E (E1+E2) | L |
| 43 | `levelup-chip-ribbon.spec.ts` | P0 | Auth | E (E3) | M |
| 44 | `levelup-wizard-single-class-rogue.spec.ts` | P0 | Auth | E (E4-E6) | L |
| 45 | `levelup-wizard-caster-bard.spec.ts` | P0 | Auth | E (E4-E6) | L |
| 46 | `levelup-wizard-resume.spec.ts` | P1 | Auth | E | M |
| 47 | `levelup-rls-negative.spec.ts` | P0 | Auth | E | M |
| 48 | `levelup-dm-cancel-broadcast.spec.ts` | P0 | Auth | E (E7) | M |

**Total:** 48 tests. **P0 count:** 31 (bloqueadores de merge). **P1:** 15. **P2:** 2.

**Effort estimate:** ~17 L + ~25 M + ~6 S ≈ **200 dev-hours (~25 dev-days)**. Realista: 2 devs dedicados em QA por ~3 semanas, paralelo com as waves (dev pode usar prev-wave gate como smoke).

---

## 7. Testability risks — flag para PM/Dev

Features que vão ser caras/difíceis de cobrir E2E puro. Recomendação: **unit + integration** onde marcado.

| Área | Story | Risco de testar E2E | Recomendação |
|---|---|---|---|
| **Parser `@` backlinks** | D3 | Autocomplete async + debounce + seleção fuzzy → E2E flaky | Unit em `lib/parser/backlinks-parser.ts` (puro); E2E só happy-path do "@N → chip" |
| **Level up 5e rules** | E4-E6 | Validações de spells-known / ASI cap / half-feat / subclass por classe → combinatória enorme | Unit em helper de validação (tabular); E2E só 2-3 fluxos canônicos (rogue single + bard caster) |
| **Realtime channel leak** | C4 | "Zero channel leak em unmount" é difícil de observar em E2E | Instrumentar hook com `__debugChannelCount` em dev mode; unit + manual smoke |
| **Cross-browser Ctrl+K vs ⌘K** | D9 | Playwright Safari-like é limitado | Playwright em chromium + firefox; manual QA em Safari pré-release |
| **`prefers-reduced-motion`** | Spec §12.4 | Playwright não media-query override trivial em desktop | Usar `page.emulateMedia({ reducedMotion })` — viable mas lento; escolher 1-2 specs representativas |
| **Audit trail `choices jsonb`** | E6 | Snapshot do JSON é frágil | Unit test na função de build do jsonb; E2E só valida `status='completed'` |
| **Concurrency: Mestre libera + Jogador cancel simultâneo** | E7 | Race condition E2E é caríssimo | Integration test via API direct; E2E skip |
| **PWA push** | (out of MVP) | Playwright não tem SW push harness simples | Manual QA apenas; documentado na §12 do plan como roadmap |
| **`localStorage` TTL 24h** | B4 | Mock do clock em Playwright é verboso | Usar `page.addInitScript` para override Date.now OR unit test do hook `usePlayerHqTabState` |
| **Visual regression (pulse gold 1.5s)** | A5, C1 | Timing-sensitive — capture durante pulse pode ser flaky | Desabilitar animações via `reducedMotion` em specs de screenshot; unit valida a classe CSS é aplicada |
| **30s auto-save** | D2 | Esperar 30s por spec é proibitivo | Injetar `DEBUG_AUTOSAVE_INTERVAL=2s` em test env |
| **Auto-redirect 5s pós-combate (A6)** | A6 | 5s de espera por spec x3 modos | Usar `DEBUG_POST_COMBAT_REDIRECT_MS=500` ou testar apenas que o `setTimeout` foi registrado |
| **Combinação heavy: 20 combatants + realtime Ribbon Vivo** | C1+C4 | Já coberto em [adversarial-large-battle](../../e2e/combat/adversarial-large-battle.spec.ts) parcialmente | Ampliar esse spec ao invés de criar novo |
| **Resilient reconnection em 4 tabs** | B2, C5 | Cartesian product (4 tabs × 5 cenários de reconnect) | Smoke de 1-2 tabs (Herói + Arsenal); resto coberto por suite J22 no `/combat` |

---

## 8. Como rodar (referência rápida)

```bash
# Full suite
rtk playwright test

# Por fase (assumindo tags @fase-a, @fase-b, etc. serão adicionadas)
rtk playwright test --grep @fase-a

# Gate Fase A (exemplo)
rtk playwright test \
  e2e/features/active-effects.spec.ts \
  e2e/features/active-effects-player.spec.ts \
  e2e/journeys/j21-player-ui-panels.spec.ts \
  e2e/journeys/j19-player-combat-actions.spec.ts \
  e2e/features/sheet-visual-baseline.spec.ts \
  e2e/features/sheet-ability-chips-always-visible.spec.ts \
  e2e/features/sheet-hp-controls-inline.spec.ts \
  e2e/features/post-combat-redirect-heroi-*.spec.ts

# Resilient Reconnection smoke (obrigatório em todas as waves)
rtk playwright test e2e/combat/adversarial-*.spec.ts e2e/journeys/j22-player-resilience.spec.ts
```

---

## 9. Definition of Ready para abrir PR de wave

Antes de abrir PR de qualquer wave (A-E):

- [ ] Todos os testes do **Gate da wave anterior** ainda passam (regressão)
- [ ] Todos os testes P0 da wave atual implementados e passando localmente
- [ ] `rtk tsc --noEmit` limpo
- [ ] `rtk lint` limpo
- [ ] Visual regression baselines atualizados no PR (screenshots antes/depois anexados)
- [ ] Manual QA: desktop 1440 + mobile 390 em 3 modos (Guest/Anon/Auth) quando aplicável
- [ ] a11y axe: zero critical/serious violations nas páginas modificadas
- [ ] Combat Parity Rule validada: features tocadas verificadas nos 3 modos ou marcadas ⛔ com razão

---

**Próximo passo sugerido:** revisar este matrix com Amelia (dev) + Winston (arch) e decidir:
1. Quais P1s podem ser rebaixados pra P2 (pós-feature-flag rollout)
2. Se a gente tagiza os specs com `@fase-a` etc. pra facilitar gates no CI
3. Quem escreve os 7 testes P0 da Fase A primeiro (são os bloqueadores imediatos)
