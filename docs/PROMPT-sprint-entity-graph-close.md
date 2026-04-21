# Prompt — Sprint N+1: fechar Fase A + rodar E2E + chip navigation

> **Para:** Nova sessão Claude Code em `c:\Projetos Daniel\projeto-rpg`
> **Modelo sugerido:** Opus 4.7 (1M context) — cruza 3 áreas (undo-hook, E2E runner, navegação)
> **Pré-requisito:** Sprint pós-Entity Graph já em prod (migrações 155–158 aplicadas, Fase B + C shipadas em 2026-04-21, deploy `dpl_CLdswTyKKcBAxhG2aUiMAyTUD9jx`)

---

## 🎯 COPY-PASTE: cole o bloco abaixo como PRIMEIRO prompt

```
Tres tarefas independentes pra fechar a sprint pós-Entity Graph que ficou
~90% shipada em 2026-04-21. Ordem recomendada: 1 → 2 → 3, mas qualquer
ordem serve (nenhuma bloqueia a outra). Cada uma vira um commit separado.

## CONTEXTO

- PocketDM (pocketdm.com.br) — Next.js App Router + TS + Supabase
- Sprint pós-Entity Graph entregou: `useEntityUnlinkUndo` hook (Fase A),
  EntityMentionEditor + parser + syncTextMentions (Fase B), migração 156 +
  useSessionBootstrap + CTA "Iniciar sessão de hoje" em BriefingToday (Fase C)
- Regras imutáveis em `CLAUDE.md`: Combat Parity, Resilient Reconnection,
  SRD Compliance, SEO Canonical, RTK prefix em todos os comandos bash
- NUNCA tocar: `lib/realtime/*`, `lib/player-identity-storage.ts`,
  `useCombatResilience` (Resilient Reconnection Rule)
- Push direto pra `origin/master` autorizado (Daniel); commits granulares

## DOCS DE REFERÊNCIA (ler antes de codar)

1. `docs/PROMPT-sprint-pos-entity-graph.md` — sprint original (A/B/C)
2. `docs/SPEC-entity-graph-implementation.md` — ACs numerados (AC-3c-04
   é o principal objetivo da Tarefa 1)
3. `docs/QA-REPORT-entity-graph-2026-04-20.md` — 9 ACs ⚪ não verificados
4. `lib/hooks/use-entity-unlink-undo.ts` — hook pronto, comentário top
   documenta a API + invariantes
5. `components/ui/EntityMentionEditor/MentionChipRenderer.tsx` — prop
   `onChipClick` aceita handler mas nenhum caller passa hoje

---

## TAREFA 1 — Fechar Fase A (AC-3c-04 finalmente) [PRIORIDADE ALTA]

Wire do `useEntityUnlinkUndo` nos per-chip unlinks do CampaignNotes + do
EntityTagSelector genérico. O hook tá deployado há dias sem ser chamado
por nada. AC-3c-04 (5s undo depois de unlink) está tecnicamente deferido.

### Call sites a instrumentar

1. **`components/campaign/CampaignNotes.tsx`** — `handleUnlinkNpc`
   (linha ~446). Hoje:
   ```ts
   await unlinkEntities(edgeId);                    // edge
   setCampaignEdges((prev) => prev.filter(...));    // UI optimistic
   await unlinkNoteFromNpc(noteId, npcId);          // legacy dual-write
   setNpcLinks((prev) => prev.filter(...));         // UI
   ```
   Alvo:
   ```ts
   // Optimistic remove UI
   setCampaignEdges((prev) => prev.filter(...));
   setNpcLinks((prev) => prev.filter(...));
   // Schedule com onUndo que restaura ambos
   schedule({
     edgeId,
     onUndo: () => {
       setCampaignEdges((prev) => [...prev, originalEdge]);
       setNpcLinks((prev) => [...prev, originalLink]);
     },
   });
   // Hook commita unlinkEntities em 5s.
   // Legacy note_npc_links commit: faça um wrapper que chama ambos;
   // OU use um commit-hook separado no hook (ver nota abaixo).
   ```

2. **`components/campaign/EntityTagSelector.tsx`** — função `unlink`
   (linha 191) hoje só chama `onChange(selectedIds.filter(...))`. O
   parent (NpcForm, LocationForm, etc) materializa a delete via sync.
   Aqui NÃO é onde o undo deve ficar — o parent é quem sabe sobre edges.
   PULE este arquivo; o trabalho real é nos parents que chamam
   `syncNoteMentions` / parents de Npc/Location/Faction Form que diff-sync.

### Dual-write com legacy `note_npc_links`

O hook só comita `unlinkEntities(edgeId)`. O legacy row em
`note_npc_links` precisa ser deletado separadamente.

Opção A (mais simples): após `schedule()` retornar, faça o delete do
legacy IMEDIATAMENTE — o "undo" só restaura o edge, o legacy row fica
removido. Trade-off: se undo for clicado, ficamos com 1 edge + 0
legacy row até próximo save. Aceitável.

Opção B (mais correto): estender o hook pra aceitar `onCommit` custom:
```ts
schedule({
  edgeId,
  onUndo: () => { /* ... */ },
  onCommit: async () => {
    await unlinkNoteFromNpc(noteId, npcId);
  },
});
```
Modifique `use-entity-unlink-undo.ts` flush() pra chamar `onCommit()`
depois de `unlinkEntities()`. Mantenha o TTL + consolidação.

**Recomendação: Opção B.** Mais código (10 LOC no hook) mas invariante
limpa: "at TTL, ambos os writes acontecem juntos".

### Toast copy já existe

i18n keys em `messages/{en,pt-BR}.json` sob `entity_graph.*`:
- `undo_unlink`, `undo_unlink_batch` (com `{count}`)
- `undo_action_single`, `undo_action_batch`
- `undo_commit_failed_single`, `undo_commit_failed_batch`

### Aceitação

- Click no X de chip de NPC numa nota: chip some imediatamente,
  toast aparece "Vínculo removido · Desfazer"
- Click "Desfazer" antes de 5s: chip volta, edge preservada, legacy
  preservada, zero round-trip pro servidor
- Esperar 5s: edge + legacy são deletados; toast some
- Remover 3 chips rápido: 1 toast consolidado "3 vínculos removidos ·
  Desfazer tudo"; "Desfazer tudo" restaura todos
- Fechar aba com pending: `pagehide` + `visibilitychange` commitam
  best-effort (hook já cuida)

### Tests

Adicionar `lib/hooks/use-entity-unlink-undo.test.tsx` (vitest + rtl):
- schedule → toast visible → click undo → pending vazio, onUndo chamado
- schedule → 5s → unlinkEntities chamado
- schedule × 3 → toast consolidado → undoAll restaura todos
- schedule durante flushInFlight → guarded (warn)

Run: `npx vitest run lib/hooks/use-entity-unlink-undo.test.tsx`

### Commit

`feat(entity-graph): close AC-3c-04 — wire undo-toast on per-chip unlinks`

---

## TAREFA 2 — Rodar suite E2E contra staging + atualizar QA report

Os 6 specs `e2e/features/entity-graph-*.spec.ts` nunca foram rodados
contra staging real. Vamos fechar isso e atualizar o QA report.

### Comando

```bash
# Exporta creds (ou usa .env.e2e)
export BASE_URL=https://staging.pocketdm.com.br  # confirmar URL real com Daniel
export E2E_DM_EMAIL=<prod-DM-account>
export E2E_DM_PASSWORD=<prod-DM-password>
export SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-key>
# ↑ precisa da service-role da STAGING DB pra o seed helper funcionar

rtk npm run test:e2e -- entity-graph
```

### Se o seed falhar

`e2e/helpers/campaign-seed.ts` e os specs usam `getServiceClient()`
apontando pra `SUPABASE_URL` do .env.local. Verificar se `.env.local`
aponta pra staging ou prod. NÃO rodar seed contra prod.

### Atualizar o QA report

`docs/QA-REPORT-entity-graph-2026-04-20.md` — adicionar uma nova
seção "Execution Results — <data>":
- Per-spec pass/fail/skip
- Screenshots de falhas via `e2e/results/` (Playwright gera tudo)
- Se algum teste que hoje é `⚪` (ex: AC-3f-02 filter combinator) foi
  coberto por um spec existente ou um teste novo, atualiza o status
  pra ✅

Os 9 ⚪ ACs pra mirar: `AC-3b-04/06/09/10`, `AC-3c-05`, `AC-3e-05`,
`AC-3f-02/04`, `REG-03`. Alguns podem precisar de specs novos; outros
são manual-QA. Seja honesto na atualização.

### Commit

`chore(entity-graph): E2E suite execution results + QA report update`

---

## TAREFA 3 — Chip navigation via MentionChipRenderer.onChipClick

`MentionChipRenderer` tem prop `onChipClick?: (entity) => void` mas
nenhum caller passa. Chips em read-only notes não navegam. Hoje em
`CampaignNotes.tsx` (linha ~1256, player-notes block) o renderer roda
sem handler.

### Implementação

1. Em `components/campaign/CampaignNotes.tsx`, adicione um handler
   `handleChipNavigate(entity)` que faz:
   ```ts
   const urlMap = {
     npc: `?section=npcs&npcId=${entity.id}`,
     location: `?section=locations&locationId=${entity.id}`,
     faction: `?section=factions&factionId=${entity.id}`,
     quest: `?section=quests&questId=${entity.id}`,
   };
   router.push(`/app/campaigns/${campaignId}${urlMap[entity.type]}`);
   ```

2. Passe `onChipClick={handleChipNavigate}` pro `MentionChipRenderer`
   nos 2 call sites (preview truncado + player-notes panel).

3. **Receivers** — cada aba precisa reagir ao searchParam como o
   CampaignNotes já faz com `noteId`:
   - `components/campaign/NpcList.tsx` — auto-expand + scrollIntoView
     do npc cujo id === searchParams.get("npcId")
   - `components/campaign/LocationList.tsx` — idem com `locationId`
   - `components/campaign/FactionList.tsx` — idem com `factionId`
   - Quests: confirmar qual componente renderiza a lista (grep
     `campaign_quests` em components/campaign)

   Use o mesmo pattern do CampaignNotes:
   - `useRef<URLSearchParams | null>(null)` como handled-ref
   - Effect keyed em `[focusedId, items, searchParams]`
   - Double-RAF antes do `scrollIntoView`
   - `CSS.escape(id)` no querySelector

### Aceitação

- Clicar num chip NPC dentro de uma nota navega pra aba NPCs e
  auto-expand o card do NPC clicado, com scroll smooth
- Clicar chip Location → aba Locais, card expandido, scroll
- Repeat click funciona (searchParams identity key)
- Idem pra Faction + Quest

### Tests

Acrescentar specs:
- `e2e/features/entity-graph-chip-navigation.spec.ts` — 4 flows, 1 por
  tipo. Create seed: nota com @mention de cada tipo. Abre a nota,
  clica no chip, asserta URL + expanded state.

### Commit

`feat(entity-graph): wire MentionChipRenderer.onChipClick → scroll-focus per type`

---

## REGRAS

- Push direto em `origin/master` autorizado — commits granulares,
  mensagens descritivas como as recentes (`fix(entity-graph):` /
  `feat(entity-graph):` / `chore(...)` — ver `git log --oneline -20`)
- Combat Parity: as 3 tarefas são Auth-only. Verificar que nenhum
  componente modificado vaza em Guest (`/try`) ou anon (`/join/<token>`)
- Resilient Reconnection: zero modificação em `lib/realtime/*` ou
  `useCombatResilience` — se a tarefa parecer precisar disso,
  STOP e reporte ao Daniel
- RTK prefix: `rtk npm run test:e2e`, `rtk git add`, etc
- Commit messages em inglês
- Se encontrar bug em código pré-existente: commit separado, NÃO
  embuta num commit de feature

## CRITÉRIO DE SUCESSO

- **Tarefa 1**: AC-3c-04 fecha ✅. Nova spec `e2e/features/entity-graph-
  undo-toast.spec.ts` passa em CI. Unit test do hook passa. `rtk tsc
  --noEmit` limpo.
- **Tarefa 2**: 6 specs entity-graph rodados em staging; resultados
  documentados no QA report. 9 ⚪ ACs repriorizados (✅ / 🟡 / ⛔).
- **Tarefa 3**: 4 fluxos de chip-click navegam corretamente; E2E spec
  passa; receivers em NpcList/LocationList/FactionList + quests têm
  auto-focus via searchParams

## START

1. Leia os 5 docs de referência
2. TodoWrite com 1 task por tarefa (1, 2, 3) + 1 task por subitem
   mencionado (hook refactor, E2E exec, receiver wiring × 4)
3. **Comece pela Tarefa 1** — é a que mais fecha loop de entrega
   (AC-3c-04 está aberto há semanas)
4. Commits granulares, push por tarefa
5. QA report atualizado como deliverable final
```

---

## Como usar

1. Abra NOVA janela Claude Code em `c:\Projetos Daniel\projeto-rpg`
2. Cole o bloco entre as aspas triplas
3. O agente vai:
   - Ler os docs
   - Fazer TodoWrite com 3 tarefas + subitens
   - Codar Tarefa 1 → commit → Tarefa 2 → commit → Tarefa 3 → commit
   - Atualizar QA report

## Tempo estimado

- Tarefa 1 (Fase A close): 1-2h
- Tarefa 2 (E2E run + report): 1h (depende de staging creds)
- Tarefa 3 (chip navigation): 2h (4 receivers)

Total: **~4-5h** numa única sessão focada.

## Contexto extra (se o agente perguntar)

- Último deploy antes deste sprint: `dpl_CLdswTyKKcBAxhG2aUiMAyTUD9jx`
- Último commit antes de abrir nova sessão: `ea1a1d88` (review findings polish wave)
- Fase A hook já tem testes unit-placeholder? Não, criar é parte da Tarefa 1
- Staging URL e creds: pedir ao Daniel se `.env.e2e` não resolver
