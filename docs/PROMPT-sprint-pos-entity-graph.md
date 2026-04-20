# Prompt — Sprint pós-Entity Graph (toast + @mentions + daily notes)

> **Para:** Nova sessão Claude Code no repositório `c:\Projetos Daniel\projeto-rpg`
> **Modelo sugerido:** Opus 4.7 (1M context)
> **Pré-requisito:** Entity Graph Fases 3b–3f + Onda 6a em prod (commits `9468285e..da6a1b10`), QA Playwright entregue (ver `docs/PROMPT-qa-entity-graph-playwright.md`)

---

## 🎯 COPY-PASTE: cole o bloco abaixo como PRIMEIRO prompt

```
Você vai implementar a sprint pós-Entity Graph. Três features interconectadas
que fecham o loop "mestre escreve livre → app linka automaticamente":

1. Toast subsystem + undo (fecha AC-3c-04 deferido)
2. `@entidade` inline mentions no editor de notas (PRD §7.8)
3. Daily notes auto-create por sessão (PRD §7.10)

Ordem importa: toast → @mentions → daily notes. Cada um é pré-requisito do
próximo.

## CONTEXTO

- PocketDM — Next.js App Router + TypeScript + Supabase
- Entity Graph foundation pronta: `lib/supabase/entity-links.ts`,
  `useCampaignEdges`, `selectCounterpartyIds`, migrations 146-154
- NotesEditor existe em `components/campaign/CampaignNotes.tsx` com textarea
  simples (não-rich-text ainda)
- Regras imutáveis em `CLAUDE.md` — Combat Parity, Resilient Reconnection,
  SRD Compliance, SEO Canonical, RTK

## DOCS DE REFERÊNCIA (ler primeiro)

1. `docs/PRD-entity-graph.md` §7.8 (inline mentions) + §7.10 (daily notes)
2. `docs/SPEC-entity-graph-implementation.md` §0 (decisões) + §3 (ACs)
3. `docs/UX-benchmarks-modern-ludic.md` §5.1 (Obsidian/Notion patterns)
4. `docs/glossario-ubiquo.md` — terminologia PT-BR

## FASE A — TOAST SUBSYSTEM + UNDO (1 sessão)

### Criar

- `components/ui/toast/Toast.tsx` — componente de toast individual com
  variantes (info, success, error, warning), auto-dismiss, action button
- `components/ui/toast/ToastProvider.tsx` — contexto React que gerencia
  stack de toasts, portal no root, queue com max 3 simultâneos
- `lib/hooks/useToast.ts` — hook com API `toast({ title, description,
  variant, action, duration })`
- Integração: montar ToastProvider em `app/app/layout.tsx`

### Design

- Posição: bottom-right (desktop) / bottom-full-width (mobile)
- Stack vertical com gap 8px, reverse-chronological
- Animação slide-in-from-bottom + fade; auto-dismiss 5s
- Respeitar `prefers-reduced-motion` (fade simples)
- Dark theme amber accent (tavern aesthetic)
- ARIA live region `role="status"` / `aria-live="polite"`

### Integrar com undo do Entity Graph (AC-3c-04)

Quando DM remove uma chip no EntityTagSelector:
1. Não chamar `unlinkEntities` imediatamente
2. Fazer update otimista local (chip some)
3. Mostrar toast "Vínculo removido — Desfazer" com 5s de auto-dismiss
4. Se timer expirar: chamar `unlinkEntities` definitivamente
5. Se usuário clicar Desfazer: reverter estado local, toast desaparece,
   nenhum write no banco

Arquivos a modificar:
- `components/campaign/EntityTagSelector.tsx` — adicionar onUnlinkDeferred
- `components/campaign/NpcList.tsx`, `LocationList.tsx`, `FactionList.tsx`,
  `CampaignNotes.tsx` — consumir o pattern via hook

### i18n

Adicionar em `messages/pt-BR.json` + `messages/en.json`:
- `toast.undo` = "Desfazer" / "Undo"
- `toast.dismiss` = "Fechar" / "Dismiss"
- `entity_graph.link_removed` = "Vínculo removido"
- `entity_graph.link_restored` = "Vínculo restaurado"

### Critério de pronto (Fase A)

- ✅ Toast funciona em 3 variantes + action
- ✅ Queue de max 3 toasts, FIFO
- ✅ prefers-reduced-motion respeitado
- ✅ Entity Graph unlink usa undo em vez de delete imediato
- ✅ Zero regressão em flows existentes
- ✅ `rtk tsc --noEmit` clean, `rtk npm test` sem regressões

### Commits (Fase A)

1. `feat(toast): Toast primitive + ToastProvider + useToast hook`
2. `feat(entity-graph): defer unlinks behind undo toast`

## FASE B — `@entidade` INLINE MENTIONS (1-2 sessões)

### Decisão prévia

PRD §7.8 menciona Tiptap como opção. Avaliar:
- **Tiptap**: rich text, ~120kb, plugin-based mention
- **Textarea + regex parser**: 0kb, sem WYSIWYG, mas suficiente
- **Markdown editor custom**: meio-termo

Recomendação: começar com **textarea + regex** pra manter simplicidade.
Se beta-tester pedir formatação rica, migrar pra Tiptap em sprint
posterior.

### Criar

- `components/ui/EntityMentionEditor.tsx` — wrapper sobre `<textarea>` com:
  - Detecta `@` digitado, abre popover abaixo do cursor
  - Autocomplete com fuzzy search sobre NPCs + Locais + Facções + Quests
  - ↑/↓ navega, Enter confirma, Esc cancela, clique fora fecha
  - Top 8 resultados com ícone + cor por tipo
  - Ao confirmar, insere token canônico `@[npc:uuid]` no textarea
  - Renderiza tokens como chips coloridos via regex no display
- `lib/utils/mention-parser.ts`:
  - `parseMentions(content: string): Array<{ type, id, start, end }>`
  - `diffMentions(before, after): { added: [], removed: [] }`
  - `renderMentionsAsHTML(content: string, entityMap): ReactNode[]`

### Integração

- `components/campaign/CampaignNotes.tsx` — substituir `<textarea>` por
  `<EntityMentionEditor>` nos campos `content` de cada nota
- Ao salvar nota:
  1. Parser extrai todos tokens `@[type:id]`
  2. Diff contra mentions atuais (via `selectCounterpartyIds`)
  3. Upsert edges novas, unlink edges removidas (reusar `syncNoteMentions`)
- `components/campaign/NpcForm.tsx`, `LocationForm.tsx`, `FactionForm.tsx` —
  mesmo tratamento no campo `description`

### Migração SQL (mig 155 — apenas se necessário)

Provavelmente NENHUMA migration nova. Edges `mentions` já existem. Avaliar
se precisa de índice em `campaign_mind_map_edges.source_id` pra performance
(já tem `idx_mind_map_edges_source` de mig 080 — suficiente).

### i18n

- `mentions.popover_placeholder` = "Digite para buscar entidade..." / "Type to search entity..."
- `mentions.no_results` = "Nenhuma entidade encontrada" / "No entity found"
- `mentions.chip_npc` / `_location` / `_faction` / `_quest` / `_note` — type labels

### Critério de pronto (Fase B)

- ✅ Digitar `@` em qualquer textarea de campanha abre popover
- ✅ Seleção cria edge `mentions` automaticamente no save
- ✅ Remover token → edge removida no save
- ✅ Chips coloridos no display read-only
- ✅ Click em chip navega pra ficha da entidade (respeita visibility RLS)
- ✅ Fuzzy search < 100ms em campanhas com 500+ entidades
- ✅ Keyboard-only usável (Tab, ↑/↓, Enter, Esc)
- ✅ Screen reader anuncia popover + seleção
- ✅ Combat Parity: funcionar só em Auth (guest/anon não têm entidades)
- ✅ `rtk tsc --noEmit` clean

### Commits (Fase B)

3. `feat(mentions): EntityMentionEditor primitive + parser`
4. `feat(notes): @mentions in CampaignNotes content editor`
5. `feat(forms): @mentions in NPC/Location/Faction descriptions`

## FASE C — DAILY NOTES AUTO-CREATE (1 sessão)

### Criar

- `lib/hooks/useSessionBootstrap.ts` — detecta entrada em sessão e dispara
  criação de nota diária se ainda não existir
- `components/campaign/DailyNoteAutoCreate.tsx` — orchestrator sem UI que
  monta `useSessionBootstrap` e mostra toast quando cria a nota

### Migração SQL (mig 155 ou 156 dependendo do que chegou antes)

Adicionar tipo `session_note` ao enum de note types (ou usar tag se texto
livre). Verificar schema atual de `campaign_notes.note_type`.

Se `note_type` for text livre sem CHECK, nenhuma migration. Se tiver CHECK,
expandir via `ALTER CONSTRAINT`.

### Trigger de criação

Criar nota quando:
- DM cria `campaign_sessions` via UI de agendamento
- DM inicia combate novo E não existe sessão pra data de hoje
- DM clica botão "Iniciar sessão de hoje" (CTA novo no Campaign HQ)

### Estrutura da nota

```ts
{
  note_type: 'session_note',
  title: `Notas da sessão — ${format(date, 'd MMM yyyy', { locale: ptBR })}`,
  content: '',
  is_shared: false,
  campaign_id: currentCampaignId,
  user_id: dmUserId,
}
```

+ edge automático em `campaign_mind_map_edges`:
- `source_type='note'`, `target_type='session'`, `relationship='happened_at'`

### Requer

- Adicionar `session` ao `entity_belongs_to_campaign` case list (mig 156)
- Criar RPC `create_or_get_session_note(campaign_id, session_date)` idempotente

### UX

- Ao criar, redirecionar DM pro editor da nota em modo focus
- Toast "Nota da sessão de {data} criada — pronta para suas anotações"
- Placeholder no editor: "Descreva o que aconteceu… use @ para linkar NPCs, locais, facções."
- Ao abrir sessão antiga, aba "Notas da sessão" lista daily note + outras
  notas linkadas via `happened_at`

### Critério de pronto (Fase C)

- ✅ Criar sessão cria nota daily
- ✅ Iniciar combate sem sessão pré-existente cria sessão + nota
- ✅ Nota daily tem `@`-mentions funcionais (depende de Fase B)
- ✅ Sessões antigas podem ser retro-populadas via "Criar nota para esta sessão"
- ✅ Daily note é `is_shared=false` por padrão
- ✅ Mig 156 aditiva, idempotente, testada

### Commits (Fase C)

6. `feat(sessions): mig 156 session edge type + create_or_get_session_note RPC`
7. `feat(sessions): auto-create daily note on session bootstrap`
8. `feat(campaign-hq): "Iniciar sessão de hoje" CTA + redirect to note`

## ORDEM DE PRIORIDADE (se prazo apertar)

1. **Fase A (toast + undo)** — essencial, destrava polish do Entity Graph
2. **Fase B (@mentions)** — maior valor percebido, fecha §7.8 do PRD
3. **Fase C (daily notes)** — bom mas não bloqueia; pode virar Onda 7

## REGRAS IMUTÁVEIS

1. Combat Parity — todas as features são Auth-only campaign-scoped.
   Guest `/try` e anônimo `/join` NÃO têm acesso. Verificar 3 modos.
2. Resilient Reconnection — ZERO mudança em `lib/realtime/*`,
   `lib/player-identity-storage.ts`, `useCombatResilience`.
3. SRD Compliance — @mentions não podem referenciar monsters/spells SRD
   (out of scope — fora de `campaign_mind_map_edges`).
4. RTK prefix em todos os comandos.
5. Commit messages em inglês. Specs/i18n em PT-BR + EN.

## CHECKLIST DE SEGURANÇA (APÓS CADA FASE)

- [ ] `rtk tsc --noEmit` clean
- [ ] `rtk npm test` — zero regressões vs baseline (130 failing / 1439
       passing em 2026-04-21)
- [ ] i18n PT-BR + EN paridade
- [ ] Combat Parity manual check nos 3 modos
- [ ] Resilient Reconnection arquivos intactos (`git diff --name-only`)
- [ ] Playwright specs novos em `e2e/features/` se Fase envolve UI nova

## REGRAS DE PUSH

- **Autorizado push direto em `origin/master`** após validação da fase
- SEMPRE `git fetch origin master` antes de push
- Se conflito: PARE e reporte
- Commits focados (1-3 por fase)

## CRITÉRIO DE SUCESSO (release completo)

1. ✅ Toast subsystem funcional, usado em 5+ call sites
2. ✅ Undo toast pro unlink (AC-3c-04 fechado)
3. ✅ `@entidade` em notas de campanha + descrições de NPC/Local/Facção
4. ✅ Chips coloridos no display read-only
5. ✅ Daily note auto-criada ao iniciar sessão
6. ✅ `@` mentions dentro de daily notes criam edges
7. ✅ `rtk tsc` + `rtk npm test` verdes
8. ✅ Playwright specs cobrindo os 3 fluxos principais
9. ✅ Performance: popover de mentions < 100ms em 500 entidades
10. ✅ A11y: keyboard-only usável em tudo

## ESTIMATIVA

Conservadora: **4-6 sessões** (1-2 por fase + 1 de polish/tests)
Agressiva (paralelismo via worktrees para A+B+C independentes): **3 sessões**

## START

1. Leia os 4 docs de referência
2. Use TodoWrite com 1 task por Fase + 1 sub-task por commit
3. Comece pela Fase A (toast) — todos dependem
4. Commit+push após cada critério de pronto validado
5. Entregue relatório no final linkando commits, migrations, specs
```

---

## Como usar

1. Abra NOVA janela Claude Code em `c:\Projetos Daniel\projeto-rpg`
2. Cole o bloco entre as aspas triplas
3. O agente vai:
   - Ler docs
   - Implementar Fases A/B/C em ordem
   - Commit+push por fase
   - Entregar relatório final

## Tempo estimado

- Fase A (toast + undo): 1 sessão
- Fase B (@mentions): 1-2 sessões
- Fase C (daily notes): 1 sessão
- Polish + Playwright: 1 sessão

Total: **4-5 sessões**

## Dependências externas

- Beta tester disponível para validar `@mentions` UX
- Toast subsystem pode ser adaptado de Radix `@radix-ui/react-toast` ou
  `sonner` se preferir (ambos mantidos, bem documentados)
- Tiptap NÃO é obrigatório — textarea+regex é suficiente para MVP
