# Code Review — Trilhas C+D (Wave C) — Sprint Beta Test #1

> Cole este prompt inteiro em uma nova janela de contexto para o agente de code review.

---

## CONTEXTO

Você é um **code reviewer adversarial** para o projeto **Pocket DM** — app de combate D&D 5e. Stack: Next.js 15, Supabase (Postgres + Realtime), Tailwind CSS, Zustand, TypeScript.

Este review cobre a **Wave C** do sprint pós-beta test, que implementou 4 stories (A.3 já existia, B.11 já existia):

| Story | SP | Descrição |
|-------|----|-----------|
| **C.15** | 8 | Enquete pós-combate (difficulty poll) — leaderboard → poll → result → session:ended |
| **B.07** | 3 | AC + Spell Save DC na player view com animação flash mid-combat |
| **C.13** | 8 | Player HP self-management — dano, cura, temp HP via broadcast |

### Commits a revisar

```
b1ff26b Merge branch 'worktree-agent-ad7c6541'
16d3e34 feat(combat): B.07 AC/DC flash + C.13 player HP self-management
d22867b fix(campaign): Sprint -1 validation hotfixes — 7 fixes across 5 files
370153c feat(combat): C.15 post-combat difficulty poll
```

Base: `8d9eb1c` (C.14 spell browser)
HEAD: `b1ff26b` (merge)

Diff total: **22 arquivos, +1038 / -32 linhas**

---

## ARQUIVOS PARA REVISAR

### Novos componentes (ler inteiro)
- `components/combat/DifficultyPoll.tsx` — Poll UI com 5 opções (Coffee/Smile/Swords/Flame/Skull)
- `components/combat/PollResult.tsx` — Resultado DM-only com média + barras por opção
- `components/player/PlayerHpActions.tsx` — 3 botões HP (dano/cura/temp) + popover numérico

### Core changes (ler com atenção)
- `lib/types/realtime.ts` — 2 novos event types: `player:poll_vote`, `player:hp_action`
- `lib/realtime/broadcast.ts` — 2 novas suppressions (poll_vote + hp_action)
- `lib/realtime/sanitize.ts` — suppression server-side matching
- `lib/hooks/useCombatActions.ts` — `handleApplyHealing` agora aceita `source?: string`

### Componentes modificados (ler diffs)
- `components/player/PlayerJoinClient.tsx` — handler de `session:combat_stats`, poll, HP actions, optimistic update
- `components/session/CombatSessionClient.tsx` — PostCombatPhase state machine, poll_vote handler, hp_action handler
- `components/guest/GuestCombatClient.tsx` — GuestPostCombatPhase (poll local sem DB)
- `components/player/PlayerInitiativeBoard.tsx` — AC/DC flash animation, HP actions props
- `components/player/PlayerBottomBar.tsx` — DC chip, flash animation, HP actions props

### Infra
- `supabase/migrations/051_add_difficulty_poll.sql` — `difficulty_rating NUMERIC(2,1)` + `difficulty_votes INTEGER`
- `lib/realtime/__tests__/broadcast-sanitization.test.ts` — test para suppression de poll_vote
- `messages/pt-BR.json` / `messages/en.json` — ~20 novas chaves i18n

### Não-sprint (veio no merge, revisar superficialmente)
- `docs/sprint-minus1-validation-report.md` — documento de validação
- `components/campaign/PlayerCampaignView.tsx` — hotfixes de campanha
- `components/session/PlayersOnlinePanel.tsx` — hotfix
- `components/character/TokenUpload.tsx` — hotfix
- `components/dashboard/PlayerCharacterManager.tsx` — hotfix

---

## REGRAS OBRIGATÓRIAS DO PROJETO

### Combat Parity Rule (IMUTÁVEL)
Toda alteração em combat experience DEVE funcionar nos 3 modos:

| Modo | Client | Entry Point |
|------|--------|-------------|
| Guest (DM) | `GuestCombatClient.tsx` | `/app/try/page.tsx` |
| Anônimo (Player) | `PlayerJoinClient.tsx` | `/app/join/[token]/page.tsx` |
| Autenticado (Player) | `PlayerJoinClient.tsx` | `/app/invite/[token]/page.tsx` |

**Verificar:** Cada story respeita a parity correta?

### HP Tiers (IMUTÁVEL)
HP bars DEVEM usar `FULL/LIGHT/MODERATE/HEAVY/CRITICAL` em inglês (70/40/10%).

---

## CHECKLIST DE REVIEW

### 1. Segurança & Validação
- [ ] `player:hp_action` handler no DM valida: `amount > 0 && <= 9999 && isInteger`?
- [ ] `player:hp_action` verifica `is_player` antes de aplicar? (previne manipulação de monsters)
- [ ] `player:poll_vote` valida `vote >= 1 && vote <= 5`?
- [ ] Ambos os novos event types são suprimidos em `sanitizePayload` (broadcast.ts)?
- [ ] Ambos são suprimidos em `sanitize.ts` (server-side)?
- [ ] `session:ended` guard no PlayerJoinClient checa `!combatStatsData` pra não cobrir leaderboard?

### 2. Optimistic Updates
- [ ] `hpActionOptimisticRef` tem protection window de 5s no `fetchFullState`/`state_sync`?
- [ ] Damage absorve `temp_hp` antes de `current_hp`?
- [ ] Heal é capped em `max_hp`?
- [ ] `temp_hp` usa `Math.max(current, new)` (D&D 5e rule: temp HP doesn't stack)?

### 3. State Machine Pós-Combate
- [ ] DM: `leaderboard → poll → result → dismiss`? Cada transição está correta?
- [ ] Player: `combat_stats → leaderboard → poll → session:ended overlay`?
- [ ] Guest: `leaderboard → poll → dismiss (local, sem DB persist)`?
- [ ] `handleDismissAll` persiste `difficulty_rating` e `difficulty_votes` no DB (auth only)?
- [ ] `handleDismissAll` chama `doEndEncounter()` (que faz `session:ended` broadcast)?

### 4. Parity
- [ ] C.15: Guest tem poll local, Player tem poll via broadcast, DM persiste no DB
- [ ] C.13: Guest sem mudança (DM aplica direto), Player tem HP actions, DM recebe via broadcast
- [ ] B.07: Guest sem mudança, Player vê AC/DC com flash animation em ambos boards

### 5. UX & Design
- [ ] DifficultyPoll: 5 opções com ícones corretos (Coffee/Smile/Swords/Flame/Skull)?
- [ ] DifficultyPoll: botão "Pular" discreto abaixo das opções?
- [ ] DifficultyPoll: feedback visual após voto (botões desabilitam, "Voto registrado!")?
- [ ] PlayerHpActions: botões usam `text-xs` (NÃO `text-[10px]`)?
- [ ] PlayerHpActions: desabilitado quando `connectionStatus !== "connected"`?
- [ ] AC/DC flash: `transition-colors duration-[1500ms]` com `text-amber-400`?
- [ ] PollResult: média em `text-2xl text-gold` com barras por opção?

### 6. i18n
- [ ] Todas as strings user-facing usam `t()` com chaves em pt-BR e en?
- [ ] Nenhuma string hardcoded em componentes novos?
- [ ] Badge "Nova entrada ↓" no log de danos usa i18n?

### 7. TypeScript & Code Quality
- [ ] Interfaces `RealtimePlayerPollVote` e `RealtimePlayerHpAction` estão no union `RealtimeEvent` mas NÃO em `SanitizedEvent`?
- [ ] `handleApplyHealing` aceita `source?: string` sem quebrar call sites existentes?
- [ ] Refs (`handleApplyDamageRef`, `handleApplyHealingRef`, `handleSetTempHpRef`) são atualizados corretamente?
- [ ] Sem `any` types desnecessários?
- [ ] Migration SQL usa `IF NOT EXISTS` para idempotência?

### 8. Testes
- [ ] Test de broadcast sanitization cobre `player:poll_vote` suppression?
- [ ] Falta test para `player:hp_action` suppression?
- [ ] Falta test para `calculateAverage` em PollResult?

---

## FORMATO DO REPORT

Classificar cada finding como:

| Severity | Descrição |
|----------|-----------|
| **P0-BLOCKER** | Bug que impede funcionalidade core ou causa crash |
| **P1-MUST-FIX** | Bug de lógica, segurança, ou violação de parity |
| **P2-SHOULD-FIX** | Code smell, UX issue menor, edge case não coberto |
| **P3-NIT** | Style, naming, oportunidade de refactor |

Para cada finding:
```
### [SEVERITY] Título curto
**Arquivo:** `path/to/file.tsx:LINE`
**Problema:** Descrição concisa
**Fix sugerido:** Código ou instrução
```

Ao final, incluir:
1. Contagem total por severidade
2. Resumo: APROVADO / APROVADO COM RESSALVAS / REQUER CHANGES
3. Lista de arquivos que precisam de mudança

---

## COMANDOS ÚTEIS

```bash
# Ver diff completo
rtk git diff 8d9eb1c..b1ff26b

# Ver diff de arquivo específico
rtk git diff 8d9eb1c..b1ff26b -- components/player/PlayerJoinClient.tsx

# Ver arquivo atual
rtk git show HEAD:components/combat/DifficultyPoll.tsx

# Build check
rtk npx next build

# Run tests
rtk vitest run lib/realtime/__tests__/broadcast-sanitization.test.ts
```
