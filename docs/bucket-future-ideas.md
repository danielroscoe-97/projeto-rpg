# Bucket de Ideias Futuras — Pocket DM

> Repositorio centralizado de features. Tudo aqui foi avaliado e categorizado.
> Consulte este arquivo antes de planejar sprints para evitar retrabalho.
> PRD master: [prd-v2.md](prd-v2.md) | Epics master: [epics-and-sprints-spec.md](epics-and-sprints-spec.md)
>
> **Ultima atualizacao:** 2026-04-11 (F-31 colors + F-45b demo + F-01 proficiencies/spells/equipment/PDF)

---

## Legenda de Status

| Icone | Significado |
|-------|-------------|
| ✅ | DONE — implementado e deployado |
| 🔧 | PARCIAL — infraestrutura existe, falta completar |
| ❌ | NAO FEITO — sem implementacao no codebase |
| 🗄️ | DEFERRED — decidido como "nao agora" |
| 📋 | BACKLOG — scoped mas sem previsao |

---

## Personagem & Progressao

| # | Item | Status | Notas |
|---|------|--------|-------|
| F-01 | ~~Ficha de personagem completa~~ | 🔧 | Proficiencies (saves+skills+tools+languages+armor+weapons), spell filters (level/school/concentration), equipment weight tracking, PDF export. Falta: features cross-ref, spell prepared slots integration |
| F-02 | XP tracking por combate | ❌ | Nenhum sistema de XP existe |
| F-03 | Distribuicao automatica de XP | ❌ | Depende de F-02 |
| F-04 | Level up automatico | ❌ | Depende de F-02 |
| F-05 | ~~Pagina "Meus Personagens"~~ | ✅ | Absorvido pelo PHQ Epic — MyCharactersPage implementada |
| F-06 | ~~Editar personagem~~ | ✅ | Absorvido pelo PHQ Epic — CharacterEditSheet implementado |
| F-07 | ~~Avatar/token do personagem~~ | ✅ | MyCharactersPage avatar upload (player-avatars bucket, upsert) |

## Combate & Visual

| # | Item | Status | Notas |
|---|------|--------|-------|
| F-08 | Modo VTT (Virtual Table Top) | ❌ | Grid, tokens, fog of war — V3+ |
| F-09 | Cenarios tematicos com presets | ❌ | 15h estimado — V3+ |
| F-10 | Geracao aleatoria de cenarios | ❌ | 20h estimado — V3+ |
| F-11 | Efeitos cinematograficos visuais | ❌ | 15h estimado — V3+ |
| F-12 | Presets de cenario com musica | ❌ | 10h estimado — V3+ |
| F-37 | ~~Dice roller basico~~ | ✅ | DiceRoller.tsx + PublicDiceRoller.tsx — dcb57d8 (2026-04-02) |
| F-43 | ~~Combat Time Analytics~~ | ✅ | Epic completo: CTA-01 a CTA-12. `turnTimeAccumulated`, Speedster/Slowpoke awards, timer pause, share text com tempo, player broadcast. Migration 103 |

## Audio

| # | Item | Status | Notas |
|---|------|--------|-------|
| F-13 | ~~Efeitos sonoros por turno~~ | ✅ | DmSoundboard + PlayerSoundboard + DmAtmospherePanel integrados no combate. Turn SFX via `playTurnSfx()` em useCombatActions, toggleavel. Notification sound no TurnNotificationOverlay |
| F-14 | ~~Lock: so jogador do turno toca som~~ | ✅ | PlayerSoundboard so ativa quando `isPlayerTurn=true`. Cooldown 2s anti-spam |
| F-15 | ~~Audio remoto no PC do mestre~~ | ✅ | DmAtmospherePanel broadcasts `audio:play_sound`, `audio:ambient_start/stop` para players via Supabase Realtime |
| F-16 | ~~Biblioteca de sons pre-definidos~~ | ✅ | 151 presets em 9 categorias (Magic 60, Dramatic 23, Interaction 20, Attack 19, Music 14, Ambient 9, Defense 4, Monster 2). 159 MP3s em disco. Expansao futura e so assets, zero mudanca de codigo |

## IA & Inteligencia

| # | Item | Status | Notas |
|---|------|--------|-------|
| F-17 | IA integrada (modulo premium) | ❌ | Sem integracao AI |
| F-18 | Mind map com IA | ❌ | Sem integracao AI |
| F-19 | AI session intelligence | ❌ | Sem integracao AI |

## Plataforma & Ecossistema

| # | Item | Status | Notas |
|---|------|--------|-------|
| F-20 | Marketplace de conteudo | ❌ | V3+ |
| F-21 | Biblioteca do mestre | ❌ | V3+ |
| F-22 | Parcerias influencers/lojas BR | ❌ | V3+ |
| F-23 | Multi-system support (Pathfinder 2e) | ❌ | V3+ |
| F-24 | Public API para integracoes | ❌ | V3+ |
| F-25 | ~~Bug report in-app~~ | ✅ | BugReportDialog + migration 073 + Settings integration |

## Hardware

| # | Item | Status | Notas |
|---|------|--------|-------|
| F-26 | Kit fisico: projetor + cabos | ❌ | V5 — Venture Separada |

## Campanha (Sprint 5 do epic dual-role)

| # | Item | Status | Notas |
|---|------|--------|-------|
| F-27 | ~~Companheiros — ver outros PCs~~ | ✅ | PlayerCampaignView com avatares, badges, HP bars |
| F-28 | ~~Historico de combates visao jogador~~ | ✅ | EncounterHistory (379 linhas) + SessionHistory (477 linhas) + CombatHistoryCard. Combatants, HP, outcomes, paginacao |
| F-29 | ~~Notificacao "e sua vez"~~ | ✅ | TurnNotificationOverlay + TurnPushNotification + haptic + Web Push |
| F-30 | ~~Presence de membros online~~ | ✅ | PlayersOnlinePanel (Supabase Realtime presence) + DM heartbeat polling + online/idle/offline states |

## Compendium & Referencia

| # | Item | Status | Notas |
|---|------|--------|-------|
| F-33 | ~~Compendium expandido~~ | ✅ | 8 tabs: Monsters, Spells, Classes, Items, Feats, Backgrounds, Races, Conditions. Browsers com busca full-text, filtros, cross-links wiki-style, LinkedText. CommandPalette busca global |
| F-34 | ~~Wizard de personagem~~ | ✅ | CharacterWizard.tsx — multi-step (Identity, Stats, Preview). 12 golden class icons |

## Geracao (Feedback Andre — 2026-03-30)

| # | Item | Status | Notas |
|---|------|--------|-------|
| F-35 | ~~Gerador de encontro aleatorio~~ | ✅ | EncounterGeneratorDialog + 13 ambientes + CR balancing + Guest parity |
| F-36 | Gerar PCs prontos por classe/nivel | 🗄️ | Complexidade ~2-3 semanas. Reavaliar V3+ |

## Social & Player Features (Beta Test #1 — 2026-04-02)

| # | Item | Status | Notas |
|---|------|--------|-------|
| F-38 | ~~Chat privado players~~ | ✅ | PlayerChat.tsx — Supabase Realtime, rate limit, 50 msgs max |
| F-39 | ~~Quest board compartilhado~~ | ✅ | PlayerQuestBoard.tsx + usePlayerQuestBoard.ts — favoritos, notas, status tracking |
| F-40 | ~~Notas dos players~~ | ✅ | PlayerNotesSection.tsx — Quick Notes, Journal, NPC Journal. Debounced save |
| F-41 | ~~Spell slots tracker~~ | ✅ | SpellSlotsHq.tsx — dots por nivel, toggle, haptic feedback |
| F-42 | ~~Difficulty vote~~ | ✅ | DifficultyPoll.tsx — 5 niveis, broadcast, motion animations |
| F-44 | ~~Email invite~~ | ✅ | Resend API auto-envia no invite do DM (`/api/campaign/[id]/invites`). Rate-limited 20/dia. Fail-open |
| F-45 | Quick Add Character Mode | 🗄️ | User preference: modo manual suficiente por agora |
| F-46 | Avatar Storage Cleanup | 🗄️ | Low priority. Orphaned files de personagens deletados permanecem |

## Analytics & Monetizacao

| # | Item | Status | Notas |
|---|------|--------|-------|
| F-47 | ~~Analytics Dashboard expandido~~ | ✅ | MetricsDashboard com: core metrics, combat stats, event funnel, guest conversion funnel, top events ranking. 4 RPCs (migration 127). Sessao 2026-04-11 |
| F-48 | ~~Instrumentar eventos analytics~~ | ✅ | 23 eventos adicionados ao allowlist + 7 instrumentados no codigo = 30 fixes. Sessao 2026-04-11 |
| F-49 | Stripe integration + freemium | 📋 | Stripe client inicializado (`lib/stripe.ts`), feature flags scaffolded. Falta: Products, Prices, Webhooks, Portal. Depende de 50+ usuarios ativos |

## Tech Debt

| # | Item | Status | Notas |
|---|------|--------|-------|
| F-31 | ~~Hardcoded colors cleanup~~ | ✅ | 49 files: hex→theme tokens (text-foreground, text-gold, bg-gold, var(--accent-gold)). Remaining: opengraph(satori), QR libs, canvas API, SVG gradients |
| F-32 | ~~E2E tests coverage~~ | ✅ | 584 testes em 40 specs. Desktop Chrome + Mobile Safari. 90%+ cobertura em guest/player/DM/campaign/audio/i18n. Gaps restantes: character creation (0 testes), preset CRUD (1 teste) |
| BUG-T3-05 | ~~og:image per-page~~ | ✅ | 7 routes opengraph-image: landing, blog, monsters EN/PT, spells EN/PT, shortlinks |
| F-45b | ~~Demo video update~~ | ✅ | pocket-dm-demo-v2.html: 8 scenes, 72s, CSS animations. Landing→Combat→Soundboard→Recap→QR Join→Player View→Campaign→Compendium |

## Combate — Beta Backlog Trilha B

| # | Item | Status | Notas |
|---|------|--------|-------|
| B.11 | ~~Log de danos separado~~ | ✅ | CombatActionLog — DM + Player + Guest. Tabs all/damage, filtro por player |
| B.12 | ~~Legendary Actions counter~~ | ✅ | Dots UI + auto-detect SRD + manual override + reset por rodada + Guest parity |
| B.21 | ~~Monster groups player view~~ | ✅ | Grouping + expand/collapse + anti-metagaming no PlayerInitiativeBoard |

## Epics em Andamento / Planejados

| Epic | Status | Notas |
|------|--------|-------|
| DM Campaign Journey v2 | ✅ 3 sprints + code review | Completo e deployado |
| User Journey & Onboarding | ✅ Sprint 1 completo | JO-01 a JO-16 deployados |
| Character Abilities & Attunement | ✅ | AB-01 a AT-04 implementados, migration 123-126 |
| Content Access Control | ✅ | Whitelist admin, Agreements DB + API, ExternalContentGate com Accept UI + digital signature, useContentAccess (whitelist OR agreement). Completado 2026-04-11 |
| Encounter Builder Logado | ✅ | CampaignEncounterBuilder dentro de CampaignFocusView (`?section=encounters`). DM-only |
| ~~Combat Recap (Spotify Wrapped)~~ | ✅ | CombatRecap.tsx + RecapAwardsCarousel + RecapNarratives + RecapSummary + RecapActions. 8 awards, 4 narrativas, share links, email, broadcast, public pages `/r/[code]` |
| SEO Supremo | ✅ Waves 1-3 | Monsters, spells, conditions, classes, races, backgrounds, feats, items. 3500+ paginas |
| SEO Initiative Tracker | ✅ | "initiative tracker" keyword targeting: metadata (6 pages), i18n copy (EN+PT hero/features/CTA/nav/footer), blog post #20 (best-initiative-tracker-dnd-5e, 1300 words, 3 screenshots), FAQ +3 questions, JSON-LD enriched. 2026-04-12 |

---

## Infraestrutura & Planos

| # | Item | Status | Notas |
|---|------|--------|-------|
| I-01 | Supabase Pro ($25/mes) | 📋 | CPU dedicado (latencia consistente), connection pooling (Supavisor), sem pause por inatividade, backups diarios. Prioridade alta — impacta diretamente velocidade das queries. Migrar antes das demos em BH (maio 2026) |
| I-02 | Vercel Pro ($20/mes) | 📋 | Serverless 60s timeout (vs 10s hobby), mais bandwidth, analytics Web Vitals. Menor prioridade que Supabase Pro — so quando trafego crescer |

---

## Resumo Quantitativo

| Status | Quantidade | % |
|--------|-----------|---|
| ✅ DONE | 38 | 76% |
| ❌ NAO FEITO | 9 | 18% |
| 🗄️ DEFERRED | 3 | 6% |

> **Ultima atualizacao:** 2026-04-11 — varredura completa do codebase por agente automatizado
> **Revisado por:** Agente 2 (sessao continuacao 2026-04-11)
