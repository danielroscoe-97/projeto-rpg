# Bucket de Ideias Futuras — Pocket DM

> Repositório centralizado de features adiadas. Tudo aqui foi avaliado e decidido como "não agora".
> Consulte este arquivo antes de planejar sprints para evitar retrabalho.
> Sprint plan ativo: [sprint-plan-player-hq-2026-04-03.md](sprint-plan-player-hq-2026-04-03.md)
> PRD master: [prd-v2.md](prd-v2.md) | Epics master: [epics-and-sprints-spec.md](epics-and-sprints-spec.md)
> Decisões sem PRD formal: [decisoes-implementadas-2026-04-03.md](decisoes-implementadas-2026-04-03.md)
>
> **Party Mode 2026-04-03 — Decisões:**
> - F-05/F-06/F-07 → Absorvidos pelo PHQ Epic (Sprint 1-4)
> - F-29 → JÁ IMPLEMENTADO (TurnNotificationOverlay + Web Push)
> - B.21 → JÁ IMPLEMENTADO (PlayerInitiativeBoard grouping)
> - B.11, B.12 → COMPLETADOS (CombatActionLog wired + StatsEditor LA override)
> - F-35 → PROMOVIDO pra implementação pré-demo maio
> - F-25, F-27 → PROMOVIDOS pra implementação pré-demo maio
> - F-36 → MANTIDO no bucket (complexidade de character builder, fora de escopo)
> - F-43 → NOVO EPIC: Combat Time Analytics — tracking de tempo por combatente + leaderboard temporal. Epic completo: `docs/epic-combat-time-analytics.md`

---

## Personagem & Progressão

| # | Item | Origem | Notas |
|---|------|--------|-------|
| F-01 | Ficha de personagem completa (full character sheet) | Party Mode 2026-03-30 | Muito complexo agora. Só stats essenciais por enquanto |
| F-02 | XP tracking por combate | Party Mode 2026-03-30 | Registrar XP ganho em cada encontro |
| F-03 | Distribuição automática de XP | Party Mode 2026-03-30 | Dividir entre jogadores participantes |
| F-04 | Level up automático | Party Mode 2026-03-30 | Progressão de nível quando atinge threshold |
| F-05 | ~~Página "Meus Personagens" (F.1)~~ | epic-campaign-dual-role.md Sprint 5 | ➡️ Absorvido pelo PHQ Epic (Sprint 1) |
| F-06 | ~~Editar personagem (nome, classe, nível) (F.2)~~ | epic-campaign-dual-role.md Sprint 5 | ➡️ Absorvido pelo PHQ Epic (Sprint 1, PHQ-E2-F4) |
| F-07 | ~~Avatar/token do personagem (F.3)~~ | epic-campaign-dual-role.md Sprint 5 | ✅ DONE — MyCharactersPage avatar upload (player-avatars bucket, upsert). Absorvido pelo PHQ Epic |

## Combate & Visual

| # | Item | Origem | Notas |
|---|------|--------|-------|
| F-08 | Modo VTT (Virtual Table Top) | Party Mode 2026-03-30 / MasterApp análise | Grid com tokens movíveis, mapas, fog of war |
| F-09 | Cenários temáticos com presets (Epic 7.1) | prd-v2.md V3+ Backlog | 15h estimado |
| F-10 | Geração aleatória de cenários (Epic 7.2) | prd-v2.md V3+ Backlog | 20h estimado, AI + Visual |
| F-11 | Efeitos cinematográficos visuais (Epic 7.3) | prd-v2.md V3+ Backlog | 15h estimado |
| F-12 | Presets de cenário com música (Epic 7.4) | prd-v2.md V3+ Backlog | 10h estimado |
| F-37 | ~~Dice roller basico (inline, com historico)~~ | Gap Analysis G-07, 2026-03-30 | ✅ DONE (dcb57d8) — Implementado Wave 3 — 2026-04-02 |
| F-43 | Combat Time Analytics (tempo por combatente + Speedster/Slowpoke awards) | Party Mode 2026-04-03 | 🔧 EPIC CRIADO — `docs/epic-combat-time-analytics.md`. Feature diferenciadora, nenhum concorrente tem |

## Áudio Avançado

| # | Item | Origem | Notas |
|---|------|--------|-------|
| F-13 | Efeitos sonoros por turno (Epic 6.1) | prd-v2.md V2+ Backlog | 8h estimado |
| F-14 | Lock: só jogador do turno toca som (Epic 6.2) | prd-v2.md V2+ Backlog | 4h estimado |
| F-15 | Áudio remoto no PC do mestre (Epic 6.3) | prd-v2.md V2+ Backlog | 10h estimado |
| F-16 | Biblioteca de sons pré-definidos (Epic 6.4) | prd-v2.md V2+ Backlog | 6h estimado |

## IA & Inteligência

| # | Item | Origem | Notas |
|---|------|--------|-------|
| F-17 | IA integrada (módulo premium) | Party Mode 2026-03-30 | NPC generator, encounter builder, narrative assistant |
| F-18 | Mind map com IA | Party Mode 2026-03-30 | IA sugere conexões, gera resumos, mapeia arcos |
| F-19 | AI session intelligence (F7) | prd-v2.md Ideias Futuras | Análise inteligente de sessões |

## Plataforma & Ecossistema

| # | Item | Origem | Notas |
|---|------|--------|-------|
| F-20 | Marketplace de conteúdo | Party Mode 2026-03-30 / prd-v2.md F6 | Vender/compartilhar campanhas, NPCs, mapas |
| F-21 | Biblioteca do mestre | Party Mode 2026-03-30 | Repositório de recursos, regras homebrew, templates |
| F-22 | Parcerias com influencers/lojas BR | Party Mode 2026-03-30 | Programa de afiliados, descontos, comunidade |
| F-23 | Multi-system support — Pathfinder 2e (F8) | prd-v2.md Ideias Futuras | Suporte a outros sistemas além de D&D 5e |
| F-24 | Public API para integrações (F9) | prd-v2.md Ideias Futuras | API aberta |
| F-25 | ~~Sistema de reportar bug (in-app)~~ | Party Mode 2026-03-30 / MasterApp análise | ✅ DONE — BugReportDialog + migration 073 + Settings integration |

## Hardware

| # | Item | Origem | Notas |
|---|------|--------|-------|
| F-26 | Kit físico: projetor + cabos + app (Epic 8) | prd-v2.md V5 — Venture Separada | ~R$2000, research phase |

## Nice-to-have (Campanha — Sprint 5 do epic dual-role)

| # | Item | Origem | Notas |
|---|------|--------|-------|
| F-27 | ~~Companheiros — ver outros PCs da campanha (C.5)~~ | epic-campaign-dual-role.md | ✅ DONE — PlayerCampaignView com avatares, badges "Você", HP bars |
| F-28 | Histórico de combates visão jogador (C.6) | epic-campaign-dual-role.md | 3h estimado |
| F-29 | ~~Notificação "é sua vez" para player logado (E.3)~~ | epic-campaign-dual-role.md | ✅ DONE — TurnNotificationOverlay + TurnPushNotification + haptic + Web Push |
| F-30 | Presence de membros online na campanha (E.4) | epic-campaign-dual-role.md | 3h estimado |

## Compendium & Referência

| # | Item | Origem | Notas |
|---|------|--------|-------|
| F-33 | Compendium expandido (spells, items, feats) | Party Mode 2026-03-30 | Além de rules, ter searchable database completa |
| F-34 | Wizard de personagem completo (multi-step visual) | Party Mode 2026-03-30 | MasterApp tem com cards bonitos. Nós faremos versão simplificada primeiro (Sprint 3) |

## Geração & IA (Feedback André — 2026-03-30)

| # | Item | Origem | Notas |
|---|------|--------|-------|
| F-35 | ~~Gerador de encontro aleatório por ambiente~~ | Feedback André 2026-03-30 | ✅ DONE — EncounterGeneratorDialog + 13 ambientes + CR balancing + Guest parity. Espólio automático adiado (V3+) |
| F-36 | Gerar PCs prontos por classe e nível | Feedback André 2026-03-30 | ❌ MANTIDO — complexidade de character builder (stats, features, spells por nível). Esforço real ~2-3 semanas, não 2-3 dias. Reavaliar V3+ |

## Social & Player Features (Beta Test #1 — 2026-04-02)

| # | Item | Origem | Status | Notas |
|---|------|--------|--------|-------|
| F-38 | Chat privado dos players no combate (DM não vê) + post-its DM | Beta Test #1, 2026-04-02 | ✅ DONE (dcb57d8) | Implementado Wave 3 — 2026-04-02 |
| F-39 | Quest/objectives board compartilhado | Beta Test #1, 2026-04-02 | ✅ DONE (dcb57d8) | Implementado Wave 3 — 2026-04-02 |
| F-40 | Notas dos players durante combate | Beta Test #1, 2026-04-02 | ✅ DONE (fbddc9d) | Implementado Wave 1 — 2026-04-02 |
| F-41 | Spell slots tracker (bolinhas marcáveis) | Beta Test #1, 2026-04-02 | ✅ DONE (fd564b9) | Implementado Wave 3 — 2026-04-02 |
| F-42 | Difficulty vote (enquete pós-combate) | Beta Test #1, 2026-04-02 | ✅ DONE (d15ed6e) | Implementado Wave 3 — fix de broadcast 2026-04-03 |
| F-44 | Email invite via Novu (workflow campaign-invite) | Party Mode Audit 2026-04-03 | PENDENTE | TODO em `app/api/campaign/[id]/invites/route.ts:75`. Atualmente DM recebe link pra compartilhar manualmente |
| F-45 | Quick Add Character Mode — create character with 3 clicks (class + level = auto HP/AC) | User decision 2026-04-04 | DEFERRED | User preference: manual mode is sufficient for now. Reavaliar pré-demo |
| F-46 | Avatar Storage Cleanup — delete old avatars when uploading new ones | Code review 2026-04-04 | DEFERRED | Low priority. `player-avatars` bucket uses upsert but orphaned files from deleted characters remain |

## Tech Debt (Baixa prioridade)

| # | Item | Origem | Notas |
|---|------|--------|-------|
| F-31 | Hardcoded colors cleanup (TD10) | prd-v2.md Backlog | Severidade baixa |
| F-32 | E2E tests coverage (TD11) | prd-v2.md Backlog | Severidade baixa |

---

## Combate — Parcialmente Implementados (Beta Backlog Trilha B)

| # | Item | Origem | Status | Notas |
|---|------|--------|--------|-------|
| B.11 | ~~Log de danos separado~~ | Beta Test #1, Trilha B | ✅ DONE | CombatActionLog no DM + Player view + Guest. Tabs all/damage, filtro por playerId |
| B.12 | ~~Legendary Actions counter~~ | Beta Test #1, Trilha B | ✅ DONE | Dots UI + auto-detect SRD + manual override StatsEditor + reset por rodada + Guest parity |
| B.21 | Monster groups na player view | Beta Test #1, Trilha B | ✅ DONE | Grouping + expand/collapse + anti-metagaming no PlayerInitiativeBoard |

---

> **Última atualização:** 2026-04-04 (F-07 avatar upload DONE via PHQ, F-45 Quick Add deferred, F-46 orphaned avatar cleanup added)
> **Revisado por:** Dani_ + BMAD Party Mode (John, Winston, Mary, Bob, Quinn, Sally, Amelia)
