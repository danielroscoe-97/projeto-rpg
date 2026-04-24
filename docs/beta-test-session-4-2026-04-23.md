# Beta Test Session 4 — Análise Completa

> **Data:** 2026-04-23 (noite BRT) → 2026-04-24 (madrugada UTC)
> **DM (beta tester):** Lucas Galuppo ([lucasgaluppo17@gmail.com](mailto:lucasgaluppo17@gmail.com), UUID `414dd199-e6b8-4199-b23e-ebac11e7d1de`)
> **Players:** Lucca, Victor, Daniel ([docs/beta-testers.md](beta-testers.md))
> **Duração:** ~3h (setup + combate + análise)
> **Campanha:** Quick Encounter — `session_id` `3c43f5b7-4fdd-41fe-b236-56c6dc97e1de`
> **Estado final do combate:** Round 4, Turn 8, 19 combatants (Dao, Earth Elementals, Myrmidons, Giant Owls vs party de 5 PCs)
> **Feedbacks coletados:** 8 (F01–F08)

---

## Cross-references

- **Postmortem infra:** [docs/postmortem-supabase-cdc-pool-exhaustion-2026-04-24.md](postmortem-supabase-cdc-pool-exhaustion-2026-04-24.md)
- **Spec de resiliência de conexão:** [docs/spec-connection-resilience-2026-04-24.md](spec-connection-resilience-2026-04-24.md)
- **Memória da sessão:** [memory/project_beta_test_4.md](../memory/project_beta_test_4.md)
- **Beta anterior:** [docs/beta-test-session-3-2026-04-16.md](beta-test-session-3-2026-04-16.md)

---

## Sumário Executivo

O DM Lucas Galuppo rodou um combate de alta complexidade (19 combatants, round 4, inimigos lendários como Dao + Earth Elementals + Myrmidons + Giant Owls) com 3 players anônimos via `/join/[token]`. Em ~3h surgiram 8 feedbacks distribuídos em 4 temas: (1) **Player View durante combate** — bug crítico anti-metagaming que vaza nomes reais de monstros hidden no refresh + UX de spell browser + feature SOS resync + gate de magias full-data, (2) **Combate ativo DM view** — exibição incompleta do range de recharge + bound de iniciativa cortando BBEGs de nível alto, (3) **Setup de combate** — histórico de rolls sobrepondo botões de remover, (4) **Feature nova — mounts** — regra de montaria com decisão arquitetural já aprovada via party-mode reutilizando `monster_group_id`.

**Destaques:** F02 (nomes reais vazando) é **P0 crítico** — quebra o core do produto (confiança do Mestre na ocultação). F05 (cap de iniciativa) é **P0 trivial** — 1 linha de código bloqueando BBEGs de nível alto. F07 (mounts) é **P2** com escopo reduzido de >1 dia para ~6h graças à decisão de reuso do `monster_group_id`. F08 (full-data SRD) tem decisão arquitetural (Caminho B — campaign-level flag) que mantém SRD Content Compliance.

**Incidente infra:** Durante o combate, o pool CDC do Supabase saturou (00:06–00:42 UTC) causando cascata de 500s em `/api/combat/:id/state`. Resolvido com upgrade de plano Supabase no ar. Combate continuou íntegro no DB (nenhum dano persistente). Análise completa no postmortem referenciado acima.

---

## Bloco 1 — Player View durante Combate

> **Contexto:** Experiência do jogador via `/join/[token]` enquanto o Mestre roda o combate
> **Impacto:** Crítico — afeta confiança do Mestre (anti-metagaming) e fluidez do player
> **Status:** 1 bug P0 (F02), 2 quick-wins P1 (F01, F04 via Bloco 2), 1 feature nova P1 (F03), 1 feature com arquitetura aprovada (F08)

| # | Feedback | Tipo | Prioridade |
|---|---|---|---|
| F01 | X das magias na visão do player no livro está ruim (botão de fechar mal posicionado/difícil) | Bug UX | P1 |
| F02 | Refresh rápido na página do player mostra nomes reais dos monstros hidden | Bug CRÍTICO anti-metagaming | P0 |
| F03 | Botão SOS do player — força refresh total do combate via Mestre | Feature nova | P1 |
| F08 | Magias expandidas (Synaptic Static, non-SRD) não aparecem na visão do player | Feature | P1 |

### Ações recomendadas

- **F02 — P0 (SHOW-STOPPER de confiança):**
  - Hidden monsters aparecem com `name` real (ex: "Goblin Warchief") antes do sanitize aplicar no client
  - Hipótese: SSR hydration fallback renderiza nomes antes do sanitize client-side rodar
  - **Fix:** aplicar `sanitizeCombatant()` no server-side antes do primeiro render (em `app/join/[token]/page.tsx` ou loader equivalente), garantindo que o HTML inicial já chega sanitizado
  - **Teste obrigatório:** abrir `/join/[token]` em aba anônima, dar 10× F5 rápido e confirmar que nenhum nome real aparece mesmo por 1 frame
  - Escopo: quick-win < 2h

- **F01 — P1 (UX do spell browser):**
  - Botão X (`DialogPrimitive.Close`) do modal de spell detail mal posicionado em mobile
  - **Fix:** ajustar `right-2 top-2 h-11 w-11` em `components/player/PlayerSpellBrowser.tsx:103-114` para área de toque maior e posição mais visível (target ≥44×44 iOS/Android)
  - Considerar também adicionar botão "Fechar" inline no footer pro caso de scroll
  - Escopo: quick-win < 2h

- **F03 — P1 (SOS resync):**
  - Escape hatch quando player detecta staleness ("sem broadcast há 30s + tab visível")
  - Research agent validou pattern (Stellaris "Resync" / Photon / Syncthing)
  - **Requisito crítico:** botão invisível 99% do tempo — só aparece quando staleness signal ativo
  - Implementação:
    1. Novo action type realtime broadcast (`player:sos_resync_requested`)
    2. Handler no DM side que re-emite snapshot completo do combate
    3. Sinal de staleness no client (`last_broadcast_at` + `visibilityState === 'visible'` + gap > 30s)
    4. Respeitar Resilient Player Reconnection Rule (CLAUDE.md) — defense in depth
  - Escopo: medium 2-8h

- **F08 — P1 (full-data SRD para player):**
  - Player anon via `/join/[token]` recebe `<SrdInitializer fullData={false} />` → só magias SRD estáticas
  - DM pediu: "como saber se player naquele navegador está logado no Pocket DM pra liberar"
  - **Decisão arquitetural (aprovada em party-mode):** **Caminho B — Campaign-level full-data flag**
    - Mestre marca campanha como "SRD Full"
    - Players nessa campanha via `/join` automaticamente recebem `fullData={true}`
    - Respeita SRD Content Compliance (full-data via gate autenticado pelo DM, não via SEO público)
    - Zero friction pro player; Mestre é o portão
  - **Implementação:**
    1. Migration: adicionar coluna `sessions.srd_full_access boolean default false`
    2. Server-side: ler flag em `app/join/[token]/page.tsx` e propagar pro `SrdInitializer`
    3. UI: toggle no Mestre (Campaign HQ ou Combat Setup) para marcar a campanha
    4. Documentar em [docs/glossario-ubiquo.md](glossario-ubiquo.md) o conceito "SRD Full"
  - Escopo: medium ~4h

### Arquivos envolvidos

- `components/player/PlayerSpellBrowser.tsx:103-114` (F01 — DialogContent + DialogPrimitive.Close header)
- `components/ui/dialog.tsx:43-49` (F01 — primitive base)
- `lib/utils/sanitize-combatants.ts:38-59` (F02 — sanitize core)
- `components/player/PlayerJoinClient.tsx:195-211` (F02, F03 — client hydration e broadcast handlers)
- `app/join/[token]/page.tsx` (F02, F08 — SSR entry point)
- Novo: handler realtime SOS no DM side (F03)
- Novo: coluna `sessions.srd_full_access` + toggle UI (F08)

### Epic/PR relacionado

- F02 → Quick-win imediato (próximo sprint)
- F03 → Requer Quick Spec via Barry (F03 tem dimensão de research + realtime + UX)
- F08 → Quick Spec com decisão arquitetural já fechada

---

## Bloco 2 — Combate Ativo DM View

> **Contexto:** Experiência do Mestre durante o combate (storytelling e controles)
> **Impacto:** Alto — afeta fluidez e imersão narrativa do Mestre
> **Status:** 2 quick-wins triviais, ambos P0/P1

| # | Feedback | Tipo | Prioridade |
|---|---|---|---|
| F04 | Recharge precisa mostrar os números (4-6) não só "Recharge" | Enhancement | P1 |
| F05 | Iniciativa cap — precisa ser removido (30/50 corta BBEGs) | Bug | P0 |

### Ações recomendadas

- **F05 — P0 (trivial mas bloqueante):**
  - BBEG de nível alto rola +12 num d20 = 32 → cap atual corta
  - **O bug que o Lucas viu (player dando join pelo link do Mestre):** `components/player/PlayerLobby.tsx:375` (validação `initVal > 30`) + `:589` + `:628` (inputs `max={30}` — nota: `:628` é o campo AC; decisão de 2026-04-24 abaixo remove cap dele também)
  - **Outros locais com cap desalinhado encontrados via grep em 2026-04-24:**
    - `components/combat/CombatantRow.tsx:414` — `Math.min(50, Math.max(-5, val))` (cap 50, inline edit do DM)
    - `components/combat/MonsterGroupHeader.tsx:199`, `components/combat/EncounterSetup.tsx:461`, `components/combat/CombatantSetupRow.tsx:131` — **adicionados ao escopo via code review 2026-04-24** (cap 50 idêntico, encontrados pelo Edge Case Hunter quando auditaram paridade)
    - `components/guest/GuestCombatClient.tsx:411, 1293` — **paridade Guest obrigatória** (Combat Parity Rule do CLAUDE.md)
    - `lib/supabase/player-registration.ts:120, 126` — **cap server-side descoberto via code review 2026-04-24** (`> 99` em init/AC; precisa alinhar com client)
  - **Falsos positivos reconfirmados em 2026-04-24:**
    - `components/combat/MonsterSearchPanel.tsx:678, 689` — **NÃO é F05**: são filtros min/max de **CR** (Challenge Rating); CR cap 30 é correto em D&D 5e (CR oficial vai de 0 a 30). Originalmente classificado aqui por grep indiferenciado; reclassificado após verificação do contexto do input.
    - `CharacterForm.tsx:369-372`, `WizardStepStats.tsx:81, 101`, `PublicAbilityScoresGrid.tsx:115` — ability scores (D&D 5e cap 30 em Strength está correto)
  - **Decisão de fix (revisada 2026-04-24 com o Dani — "ac input e iniciativa input não precisa ter máximo"):**
    - Remover cap por completo em TODOS os inputs de iniciativa/AC (client + server)
    - Floor preservado: 1 para inputs de lobby de player (representa d20 roll — sempre ≥ 1); `-5` nos inline edits do DM (permite atrasos narrativos tipo readied actions negativas)
    - **PRs:** `PlayerLobby` × 3 inputs + validation, `CombatantRow` × 1, `GuestCombatClient` × 2 (parity), `MonsterGroupHeader`/`EncounterSetup`/`CombatantSetupRow` × 3 (descobertos no review), `player-registration` server × 2
  - **Nota de QA (Piper):** produto foi testado com encontros de nível baixo. Adicionar ao próximo ciclo de QA: encontro com CR 15+ para caçar outros caps/assumptions invisíveis de "baixo nível"
  - Escopo: quick-win < 1h (alterações óbvias, sem lógica adicional)

- **F04 — P1 (storytelling):**
  - DM diz "monstro recarrega em 5-6" na narrativa; info precisa tá na UI
  - `threshold` já vem no dado (parse em `lib/combat/parse-recharge.ts:19-23`); é só exibir range
  - **Fix:** em `components/combat/RechargeButton.tsx:108-110`, trocar label de "Recharge 6" para "Recharge 5-6" (formato `${threshold}-6` quando `threshold < 6`, senão apenas `6`)
  - Tooltip complementar: "Recarrega em 5 ou 6 no d6 do início do turno"
  - Escopo: quick-win < 2h

### Arquivos envolvidos

- `components/player/PlayerLobby.tsx:375, 589, 628` (F05 — cap 30 no form de join do player/AC, o que o Lucas viu)
- `components/combat/CombatantRow.tsx:414` (F05 — cap 50 no inline edit do DM)
- `components/combat/MonsterGroupHeader.tsx:199`, `components/combat/EncounterSetup.tsx:461`, `components/combat/CombatantSetupRow.tsx:131` (F05 — cap 50 adicional, descobertos em code review 2026-04-24)
- `components/guest/GuestCombatClient.tsx:411, 1293` (F05 — paridade Guest obrigatória)
- `lib/supabase/player-registration.ts:120, 126` (F05 — cap server-side, alinhar com client)
- ~~`components/combat/MonsterSearchPanel.tsx:678, 689`~~ (reclassificado 2026-04-24 — são filtros de CR, não iniciativa; CR cap 30 correto em D&D 5e)
- `components/combat/RechargeButton.tsx:108-110` (F04 — label do botão)
- `lib/combat/parse-recharge.ts:19-23` (F04 — parse do threshold)

### Epic/PR relacionado

- Ambos são quick-wins independentes — próximo sprint, PR único ou PRs atômicos

---

## Bloco 3 — Setup de Combate (Pré-Combate)

> **Contexto:** Tela de montar combate onde DM adiciona combatants e rola iniciativa
> **Impacto:** Médio — bloqueia remoção de jogadores; workaround possível (scroll/fechar painel)
> **Status:** 1 quick-win CSS P1

| # | Feedback | Tipo | Prioridade |
|---|---|---|---|
| F06 | Histórico de rolls na tela de montar combate tampa botões de remover | Bug UX | P1 |

### Ações recomendadas

- **F06 — P1 (z-index/positioning):**
  - Screenshot anexa (Lucas 23:11): 4 linhas "JOGADOR" com botão "Remover" cobertos por gradient/overlay do botão laranja "Histórico de Rolls"
  - Hipótese: conflito de z-index ou positioning `fixed` sem `z-50` apropriado
  - **Fix:**
    1. Auditar z-index da stack: `DiceRoller` (painel expansível) vs lista de combatants
    2. Garantir que painel de histórico respeita stacking context da coluna
    3. Alternativa: mover painel de rolls para drawer lateral ou modal (não sobrepõe conteúdo da lista)
  - **Teste:** rolar 10+ dados no setup e tentar remover um jogador; ambos devem ser simultaneamente clicáveis
  - Escopo: quick-win < 2h

### Arquivos envolvidos

- `components/dice/DiceRoller.tsx:40-160`
- `components/combat/EncounterSetup.tsx:65-100`
- `app/app/(with-sidebar)/combat/new/page.tsx`

### Epic/PR relacionado

- Quick-win CSS — próximo sprint

---

## Bloco 4 — Sistema de Combate — Features Novas (Mounts)

> **Contexto:** D&D 5e mount rules — montaria é combatant separado, pode ser desmontado
> **Impacto:** Alto para DMs que rodam encontros com cavalaria/dragões montados/lobos de guerra
> **Status:** Decisão arquitetural aprovada via party-mode — escopo reduzido

| # | Feedback | Tipo | Prioridade |
|---|---|---|---|
| F07 | Regra de montaria (adicionar montaria a um monstro) | Feature nova | P2 |

### Ações recomendadas

- **F07 — P2 (feature com arquitetura fechada):**
  - **Semântica D&D 5e:**
    - Controlled mount (domado): age no turno do rider, compartilha iniciativa
    - Independent mount (selvagem): age no próprio turno
    - Pode ser desmontado (voluntário ou forçado) — mount vira combatant autônomo
    - Dano ao rider NÃO afeta mount e vice-versa (HP separado)
  - **Decisão arquitetural (aprovada em party-mode):**
    - Reutilizar `monster_group_id` existente com **semântica estendida**
    - Novo campo: `group_role: 'rider' | 'mount' | null`
    - HP/damage permanece separado (mount é combatant próprio)
    - Escopo baixou de "larger > 1 dia" para **"medium ~6h"**
  - **Implementação:**
    1. Migration: adicionar coluna `combatants.group_role`
    2. UI setup: ao adicionar monstro A, opção "adicionar montaria" → cria monstro B vinculado via `monster_group_id` com `group_role='mount'`, A recebe `group_role='rider'`
    3. UI combate: na CombatantRow, mostrar ícone de vínculo rider↔mount + ação "Desmontar" (rompe vínculo, ambos ficam independentes)
    4. Iniciativa: controlled mount herda iniciativa do rider; independent mount rola a sua
    5. Respeitar Combat Parity Rule (CLAUDE.md) — aplicar em Guest + Auth (Mestre)
  - Epic dedicado será criado via Barry (Quick Spec)

### Arquivos envolvidos

- Migration nova: `combatants.group_role`
- `components/combat/EncounterSetup.tsx` (UI de setup com opção de montaria)
- `components/combat/CombatantRow.tsx` (UI de combate com vínculo + ação "Desmontar")
- `lib/combat/*` (lógica de iniciativa herdada para controlled mount)
- Paridade Guest: `components/guest/GuestCombatClient.tsx`

### Epic/PR relacionado

- Quick Spec via Barry — arquitetura já fechada, pronto pra executar

---

## Bloco 5 — Incidente de Infraestrutura (Durante a Sessão)

> **Contexto:** Pool CDC do Supabase saturou durante o combate, causando cascata de 500s
> **Impacto:** Alto durante o incidente; zero dano persistente após resolução
> **Status:** Resolvido no ar via upgrade de plano Supabase. Análise técnica completa no postmortem.

**Este bloco NÃO é feedback do Lucas** — é um incidente infra que aconteceu durante a sessão e deve ser referenciado aqui por completude.

### Resumo

- **Janela:** 00:06–00:42 UTC (2026-04-24)
- **Sintoma:** Cascata de 500s em `/api/combat/:id/state` (o endpoint crítico do combate)
- **Causa-raiz:** Pool CDC (Change Data Capture) do Supabase saturou sob carga de realtime + queries combinadas
- **Resolução:** Upgrade do plano Supabase durante a sessão
- **Dano persistente:** **Zero** — combate continuou íntegro no DB; players reconectaram via mecanismos de resiliência existentes
- **Análise completa:** [docs/postmortem-supabase-cdc-pool-exhaustion-2026-04-24.md](postmortem-supabase-cdc-pool-exhaustion-2026-04-24.md)

### Ações recomendadas (infra/ops)

- Postmortem cobre: guardrails, alertas, plano contínuo de capacity
- Spec de resiliência: [docs/spec-connection-resilience-2026-04-24.md](spec-connection-resilience-2026-04-24.md) — reforço da cadeia de fallbacks no client
- Lição: combate real (19 combatants, 3h) é bom load test — considerar smoke test de carga no próximo ciclo

---

## Matriz de Prioridades Consolidada

### P0 — Show-stoppers (fazer AGORA)

| ID | Item | Bloco | Escopo |
|---|---|---|---|
| F02 | Nomes reais de monstros hidden vazando no refresh | Player View | quick-win <2h |
| F05 | Iniciativa cap 50 corta BBEGs de nível alto | Combate DM | quick-win <1h |

### P1 — Core Experience (próximo sprint)

| ID | Item | Bloco | Escopo |
|---|---|---|---|
| F01 | X do spell browser mal posicionado | Player View | quick-win <2h |
| F03 | Botão SOS de resync (com gate de staleness) | Player View | medium 2-8h |
| F04 | Recharge mostrar range "5-6" | Combate DM | quick-win <2h |
| F06 | Histórico de rolls tampa botão remover | Setup | quick-win <2h |
| F08 | Magias full-data para player via campaign flag | Player View | medium ~4h |

### P2 — Enhancement (backlog curto)

| ID | Item | Bloco | Escopo |
|---|---|---|---|
| F07 | Regra de montaria (rider/mount via monster_group_id) | Features Novas | medium ~6h |

### P3 — Polish

_(sem itens neste beta)_

---

## Ordem de Execução Recomendada

```
Sprint N (atual — quick-wins P0/P1):
  ├── [P0 CRÍTICO] F02 Sanitize SSR-side hidden monsters (<2h)
  ├── [P0 TRIVIAL] F05 Iniciativa cap 50→99 (<1h)
  ├── [P1 UX] F01 Spell browser X maior + footer close (<2h)
  ├── [P1 UX] F04 Recharge range "5-6" + tooltip (<2h)
  └── [P1 UX] F06 Z-index histórico de rolls vs remove (<2h)

Sprint N+1:
  ├── [P1 FEATURE] F08 Campaign-level SRD full-access flag (~4h)
  └── [P1 FEATURE] F03 Botão SOS com staleness gate (2-8h)

Sprint N+2:
  └── [P2 FEATURE] F07 Mounts via monster_group_id + group_role (~6h)

Infra contínuo:
  ├── Seguir postmortem Supabase CDC (guardrails, alertas, capacity)
  └── Reforço resiliência de conexão (spec-connection-resilience-2026-04-24.md)
```

---

## Notas do Beta (observações qualitativas)

- **Perfil do DM:** Lucas Galuppo rodou combate de alta complexidade confortavelmente (19 combatants, 4 rounds, monstros lendários). O app segurou a experiência apesar do incidente infra no meio — sinal positivo de resiliência.
- **Anti-metagaming é o core:** F02 (nomes vazando) é o feedback mais grave deste beta porque quebra a promessa central do produto. Priorização absoluta.
- **Quick-wins dominam:** 6 dos 8 feedbacks são escopo <4h. Próximo sprint pode fechar a maioria.
- **Decisões arquiteturais salvaram escopo:** F07 (mounts) e F08 (full-data SRD) tiveram decisões fechadas via party-mode que reduziram dias de trabalho para horas.
- **Piper (persona QA):** apontou que "produto testado com encontros de nível baixo" — sugerir QA com CR 15+ no próximo ciclo para caçar assumptions invisíveis.
- **Paridade Guest:** F04, F05, F07 exigem aplicação em `GuestCombatClient.tsx` também (Combat Parity Rule do CLAUDE.md).
