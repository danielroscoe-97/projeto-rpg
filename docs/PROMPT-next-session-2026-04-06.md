# Prompt — Proxima Sessao de Desenvolvimento (2026-04-06)

> Cole este prompt inteiro em uma nova conversa do Claude Code.
> Ele contem todo o contexto necessario para continuar o trabalho.

---

## CONTEXTO DO PROJETO

Pocket DM (projeto-rpg) — Rastreador de combate D&D 5e. Next.js + Supabase + Tailwind.

**Estado atual (2026-04-05):**
- Player HQ Sprint 1: componentes montados e deployados (CharacterEditSheet + NotificationFeed)
- Combat bugs fixados: log/recap mutex, sticky FAB auth, keyboard post-combat guard
- Combat Time Analytics Sprint 1: **CONFIRMADO COMPLETO** (CTA-01 a CTA-09, ~27 SP)
- SRD: spell slug collision fixado (319 spells 2024 com rotas unicas)
- Build limpo: TSC + next build = 0 errors, 0 warnings
- Vercel deploy automatico via push ao master

**O que foi descoberto na sessao anterior:**
- CTA Sprint 1 inteiro ja estava implementado — epic doc desatualizado
- Player HQ tinha 30+ componentes prontos, apenas 2 sem mount point (agora fixados)
- 5 patches do code review adversarial foram aplicados

**Docs de referencia da sessao anterior:**
- `docs/session-log-2026-04-05.md` — Log completo
- `docs/decisoes-implementadas-2026-04-05.md` — 6 decisoes documentadas

---

## FRENTE 1: Player HQ — Verificacao End-to-End (PRIORIDADE 1)

### O que ja esta montado no shell (`components/player-hq/PlayerHqShell.tsx`):
- 6 tabs: Map | Sheet | Resources | Inventory | Notes | Quests
- Todos os componentes wired com hooks e realtime
- CharacterEditSheet no header (pencil button)
- NotificationFeed na aba inventory

### O que precisa ser VERIFICADO (nao implementado — testado):

1. **Smoke test da rota** — Abrir `/app/campaigns/[id]/sheet` com um user real que tem `player_characters` row. Verificar que:
   - Todas as 6 tabs renderizam sem crash
   - HP tracker mostra valores corretos
   - Conditions toggleam e persistem
   - Resource trackers CRUD funciona
   - Spell slots renderizam e editam
   - Bag of Holding carrega itens
   - Player Notes salva/carrega
   - Quest Board renderiza quests da campanha

2. **Teste realtime** — DM aplica dano no combate → player ve HP atualizar em <2s no HQ

3. **Mobile (390x844)** — Testar todas as 6 tabs no viewport mobile:
   - Touch targets >= 44px
   - Tabs scrollam horizontalmente
   - CharacterEditSheet (Sheet lateral) funciona em mobile

4. **Verificar integracao F15 (NPC Journal)** — `NpcJournal.tsx` existe mas NAO esta em nenhuma tab do shell. Esta dentro de `PlayerNotesSection.tsx`? Se nao, decidir se adicionar como sub-tab de Notes ou deferir.

5. **Verificar F2 (Campaign Card com imagem)** — `PlayerCampaignCard.tsx` renderiza `cover_image_url`? Coluna existe na migration 056.

6. **Verificar F10 (DM Approval Flow)** — O DM consegue ver removal requests e aprovar/negar da view de campanha?

### Abordagem recomendada:
- Usar as credenciais de teste (ver memoria `reference_test_credentials.md`)
- Se algo nao funcionar, o componente/hook provavelmente precisa de um ajuste pontual
- NAO reescrever componentes — sao assembly fixes, nao rewrite

---

## FRENTE 2: Combat Time Analytics — Sprint 2 (Opcional, ~6 SP)

### Sprint 1: COMPLETO (CTA-01 a CTA-09, ~27 SP)

### Sprint 2 — Itens opcionais (se sobrar tempo):
1. **CTA-10** (2 SP) — Persistir tempo no DB (`encounters` table). Atualmente so localStorage.
2. **CTA-11** (2 SP) — Comparacao session-to-session (trend). Depende de CTA-10.
3. **CTA-12** (2 SP) — Botao de pausa no timer.

**Doc de referencia:** `docs/epic-combat-time-analytics.md`

---

## FRENTE 3: Nice-to-haves Restantes

| Item | Descricao | Esforco | Status |
|---|---|---|---|
| **F-44** | Email invite via Novu — TODO em `app/api/campaign/[id]/invites/route.ts:75` | ~2h | Precisa setup Novu |
| **F-07** | SRD Autocomplete para AddResourceTrackerDialog — unico item Sprint 4 nao iniciado | ~4h | Nao iniciado |
| **BUG-T3-05** | Spells/monsters detail pages usam og:image generico (nao per-page) | ~2h | Baixa prioridade |

---

## FRENTE 4: Demo Preparation (BH Events — Mid-May 2026)

### Contexto:
- Demo em bares de RPG em BH (Taverna de Ferro, Pixel Bar) planejado para meados de maio
- Demo readiness: ~99% (todos os bugs criticos resolvidos)

### O que faria a demo mais impactante:
1. **Player HQ funcionando end-to-end** — Jogadores reais usando na mesa
2. **Combat Time Analytics visivel no recap** — Diferenciador, nenhum concorrente tem
3. **Invite flow completo** — DM convida, player clica link, entra na campanha
4. **Reel/video atualizado** — `public/video/pocket-dm-demo.html` existe, pode precisar update

---

## REGRAS IMUTAVEIS (do CLAUDE.md)

1. **Combat Parity Rule** — Toda mudanca de combate DEVE verificar Guest/Anon/Auth (3 modos)
2. **Resilient Reconnection** — Conexao do jogador NUNCA pode ser perdida
3. **SRD Compliance** — NUNCA expor conteudo nao-SRD em paginas publicas
4. **HP Tiers** — LIGHT/MODERATE/HEAVY/CRITICAL (70/40/10%) — imutavel
5. **RTK** — Sempre prefixar comandos com `rtk`

---

## COMO COMECAR

Recomendacao de prioridade:
1. **Player HQ Verificacao** — Abrir a rota, testar cada tab, corrigir o que quebrar. Isso e o maior valor pro beta e demo.
2. **NPC Journal wiring** — Se F15 nao esta no shell, adicionar.
3. **CTA Sprint 2** — Se PHQ estiver estavel, avancar DB persistence.
4. **Nice-to-haves** — Se sobrar tempo.

Para cada frente, comecar lendo o doc de referencia completo antes de implementar.
