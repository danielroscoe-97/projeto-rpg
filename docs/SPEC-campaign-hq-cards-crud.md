# SPEC — Campaign HQ: Cards Interativos + CRUD Pós-Criação

> **Status:** Pronto para implementação
> **Origem:** Beta test session 3 (F29 + F15 + F12 — show-stoppers Onda 1)
> **Princípio UX:** Every card is a door — zero cards decorativos
> **Data:** 2026-04-19

## 1. Problema

Beta tester reportou três show-stoppers sequenciais na DM journey pós-criação de campanha:

- **F29** (P0): "Todas as coisas atuais da campanha do mestre após criada NÃO PERMITE o mestre fazer mais nada". DM vê cards de NPCs/Locais/Facções/Sessões e não sabe como editá-los — ações escondidas em hover, card body inerte.
- **F15** (P0): "Nem mestre nem jogadores conseguem interagir com cartão dos locais — zero interação". `LocationCard` e `FactionCard` escondem todas as ações atrás de `{isEditable && ...}` — para jogador, `isEditable=false` ⇒ zero botões. Card body não é `<button>`.
- **F12** (P0): "Na tela de sessões NÃO TEM botão de criar sessão e nenhum direcionamento". `SessionHistory` não tem CTA de criar nem edit/start/cancel em cards de sessão. `SessionPlanner` dialog já existe, mas só é disparado de `CampaignHero` (overview).

Evidência de código em §2.

## 2. Auditoria de cards (estado atual)

### 2.1 Cards já editáveis (funcionam, mas com limitações — hover-only)

| Arquivo:linha | Entidade | Ação existente | Observação |
|---|---|---|---|
| `components/campaign/NpcCard.tsx:115-150` | NPC | Eye / Pencil / Trash2 icon buttons | Só aparecem em `group-hover` / `focus-within` — descoberta ruim (sm:opacity-0) |
| `components/campaign/QuestCard.tsx:131-168` | Quest | Eye / Pencil / Trash2 | Apenas se `isEditable`; hover-only |
| `components/campaign/NoteCard.tsx:21-66` | Nota | Card inteiro é `<button onClick>` | **Padrão ouro — "a door"** |
| `components/campaign/NextSessionCard.tsx:164-208` | Sessão (próxima) | Start / Edit / Cancel explícitos | Bom — ações visíveis |
| `components/campaign/CampaignGridCard.tsx:74-107` | Navegação (seção) | `role="button"` + onClick → route | Padrão ouro — interativo |
| `app/app/campaigns/[id]/CampaignGrid.tsx:48-131` | Grid overview | Usa `CampaignGridCard` | OK |

### 2.2 Cards decorativos (PROBLEMA — precisam virar portas)

| Arquivo:linha | Entidade | Ação esperada | Prioridade |
|---|---|---|---|
| `components/campaign/LocationCard.tsx:68-201` | **Local** | Card body clicável → abre detalhe (view+edit). Para player (`isEditable=false`): atualmente **zero botões visíveis** → precisa pelo menos abrir detalhe read-only | **P0 (F15)** |
| `components/campaign/FactionCard.tsx:55-186` | **Facção** | Card body clicável → abre detalhe (view+edit). Player: idem locais — zero interação hoje | **P0 (F15)** |
| `components/campaign/SessionHistory.tsx:139-315` (SessionCard interno) | **Sessão/Histórico** | Edit/delete/start (quando planejada); hoje só expand/collapse | **P0 (F29)** |
| `components/campaign/NpcCard.tsx:46-150` | NPC | Card body deve abrir detalhe; actions devem ser sempre visíveis (não só hover) em mobile e permanecer hover-visible em desktop | **P1 (F29)** |
| `components/campaign/QuestCard.tsx:76-169` | Quest | Card body clicável → detalhe; mesmo ajuste de visibilidade | **P1 (F29)** |
| `components/campaign/MemberCard.tsx:69-153` | Membro | Clique deve navegar para ficha do personagem (quando `character_id != null`); hoje só botão "remover" | **P2 (F11 adjacente — fora do escopo crítico mas trivial de arrumar aqui)** |

Cards NÃO decorativos ignorados neste spec:
- `CampaignStatusCards.tsx`, `CampaignHealthBadge`, `CampaignActiveEffects`, `CampaignPlayerAvatars` — KPIs / passivos / já têm onClick onde aplicável.

### 2.3 Listas sem CTA de criar (PROBLEMA F12)

| Página/Seção | Arquivo:linha | Entidade | CTA faltante |
|---|---|---|---|
| Sessions section (`?section=sessions`) | `components/campaign/SessionHistory.tsx:460-476` | Sessão | **Botão "Planejar Sessão"** no header + na empty state. i18n key `sessionHistory.plan_session` já existe e está sem uso. |
| (NPCs, Locais, Facções, Quests, Notas) | — | — | **OK** — já têm CTA header + empty state CTA (ver `NpcList.tsx:198-227`, `LocationList.tsx:181-213`, `FactionList.tsx:185-214`, `QuestBoard.tsx:189-195`, `CampaignNotes.tsx:497`). |

## 3. Especificação do fix

### 3.1 Padrão "Every card is a door"

Regra universal para cards de entidades (NPC, Local, Facção, Sessão, Quest, Membro):

1. **Card body clicável** → abre `EntityDetailSheet` (side sheet / dialog) com modo view por padrão; DM (ou dono) vê botão "Editar" que alterna para form inline.
2. Wrapper do card: `<button type="button">` ou `<div role="button" tabIndex={0} onKeyDown=...>`. Hover state + `cursor-pointer`.
3. Ações rápidas (edit/delete/visibility) no corner **sempre visíveis em mobile** (`opacity-100`) e **hover-visible em desktop** (`sm:opacity-0 group-hover:opacity-100`). Hoje está `opacity-60 sm:opacity-0` — inverter.
4. Clique em action button deve chamar `event.stopPropagation()` para não disparar o onClick do card body.
5. Player (`isEditable=false`): card continua clicável para abrir **detalhe read-only** (visão do mundo). Nada de buttons de edição.

Affordances visuais já presentes (hover border amber, shadow) são suficientes — o que falta é o `onClick` no wrapper.

### 3.2 CRUD pós-criação por entidade

#### NPCs (`components/campaign/NpcCard.tsx` + `NpcForm.tsx`)
- **Campos editáveis (já existem no form):** `name`, `description`, `stats.hp`, `stats.ac`, `stats.cr`, `stats.initiative_mod`, `stats.notes`, `avatar_url`, `is_visible_to_players`.
- **Ação:** card body click → `NpcDetailSheet` (novo) em modo view → botão "Editar" abre `NpcForm` existente.
- **Delete:** confirm modal já existe em `NpcList.tsx:273-295` — reutilizar.
- **Inline edit opcional (P2):** tornar `name` editável inline via duplo-clique. Nesta entrega, escopo é só "card vira porta".

#### Locais (`components/campaign/LocationCard.tsx` + `LocationForm.tsx`)
- **Campos editáveis:** `name`, `description`, `location_type` (city/dungeon/wilderness/building/region), `is_discovered`, `image_url`, `is_visible_to_players`.
- **Ação:** card body click → `LocationDetailSheet` (novo).
- **Player view:** detalhe read-only com nome, tipo, descrição (apenas se `is_visible_to_players && is_discovered`).

#### Facções (`components/campaign/FactionCard.tsx` + `FactionForm.tsx`)
- **Campos editáveis:** `name`, `description`, `alignment` (ally/neutral/hostile), `image_url`, `is_visible_to_players`.
- **Ação:** card body click → `FactionDetailSheet` (novo). Mesmo padrão.

#### Sessões / Histórico (`components/campaign/SessionHistory.tsx`)
- **Campos editáveis (via `updateSession` em `lib/supabase/campaign-sessions.ts:100-137`):** `name`, `description`, `scheduled_for`, `prep_notes`.
- **Novo: adicionar action row no `SessionCard` interno (linhas 139-315)** — quando DM + `status === "planned"`:
  - **Start** (chama `startSession` + navega para `/app/session/{id}`)
  - **Edit** (abre `SessionPlanner` em modo edit — aceitar `initialData` como prop nova)
  - **Cancel** (`updateSession({ status: 'cancelled' })`)
- Para `status === "active"`: botão **Entrar** + **Finalizar**.
- Para `status === "completed"`: botão **Editar recap** (abre `SessionRecapDialog` existente).

#### Notas (`components/campaign/NoteCard.tsx`)
- **Já é porta.** Nenhuma mudança.

#### Quests (`components/campaign/QuestCard.tsx`)
- Mesmo padrão: card body click → abre `QuestDetailSheet` ou `QuestForm` em modo view. Reaproveitar `QuestForm` existente.

### 3.3 Botões "Criar" faltantes (F12)

**Único fix obrigatório:** adicionar CTA "Planejar Sessão" em `components/campaign/SessionHistory.tsx`.

- **Onde (header):** inserir no header junto a `<h2>{t("title")}</h2>` (linha 462). Padrão copiado de `NpcList.tsx:198-208`:
  ```
  <Button variant="goldOutline" size="sm" onClick={() => setPlannerOpen(true)} data-testid="session-add-button">
    <Plus className="w-4 h-4" /> {t("plan_session")}
  </Button>
  ```
- **Onde (empty state):** adicionar dentro de `session-history-empty` (linha 441-456) o mesmo botão abaixo do texto.
- **Dialog:** importar `SessionPlanner` e renderizar condicional em `plannerOpen`. `SessionPlanner` já recebe `campaignId`, `userId`, `open`, `onOpenChange`, `onSessionCreated` — passar esses. `userId` precisa ser prop nova em `SessionHistory` (server component já tem user via page.tsx).
- **Texto (i18n — usar `glossario-ubiquo.md`):**
  - Label: `sessionHistory.plan_session` = "Planejar Sessão" (já existe em pt-BR e en)
  - Por coerência com o glossário: título da seção `sessionHistory.title` hoje é "Sessões" — considerar renomear para "Histórico de Sessões" ou manter — decisão de copy, fora do escopo de código desta SPEC.

## 4. Componentes a criar / modificar

### Criar

- **`components/campaign/EntityDetailSheet.tsx`** (novo componente compartilhado, genérico): side sheet (`@/components/ui/sheet` se existir, senão `Dialog`) com slots `header`, `body`, `actions`. Recebe props `open`, `onOpenChange`, `entity`, `mode: "view" | "edit"`, `onEdit`, `onDelete`, `isEditable`, `children`. Base reutilizável para todas as entidades.
  - **Alternativa mais simples e lean:** ao invés de `EntityDetailSheet`, promover o `NpcForm`/`LocationForm`/`FactionForm`/`QuestForm` existentes para terem um modo `readOnly`. É menos código, menos risco. **Recomendação:** adotar esta alternativa.

### Modificar

1. **`components/campaign/SessionHistory.tsx`**
   - Adicionar prop `userId: string`.
   - Adicionar estado `plannerOpen` e `editingSession`.
   - Importar + renderizar `SessionPlanner` com `open={plannerOpen}` e — para edit — passar `initialData` (mudança em `SessionPlanner`).
   - Adicionar `Button` de "Planejar Sessão" no header + empty state.
   - No `SessionCard`: adicionar action row com Start/Edit/Cancel conforme `status` e `isOwner`.
   - `app/app/campaigns/[id]/CampaignFocusView.tsx:109` — passar `userId` a `SessionHistory`.

2. **`components/campaign/SessionPlanner.tsx`**
   - Aceitar `initialData?: { sessionId: string; name: string; description: string | null; scheduled_for: string | null; prep_notes: string | null; }` para modo edit.
   - Ao salvar em modo edit: chamar `updateSession(initialData.sessionId, data)` ao invés de `createSession`.
   - Ajustar `DialogTitle` conforme modo.

3. **`components/campaign/LocationCard.tsx`**
   - Envolver wrapper root (linha 68-72) em `<div role="button" tabIndex={0} onClick={() => onCardClick(location)} onKeyDown=...>`.
   - Nova prop `onCardClick?: (location: CampaignLocation) => void`.
   - Actions div (linha 128-165): adicionar `onClick={(e) => { e.stopPropagation(); ... }}` em cada button.
   - Ajustar opacity: `opacity-100 sm:opacity-0 group-hover:opacity-100` (atualmente `opacity-60 sm:opacity-0`).
   - Para `!isEditable` (player): card continua clicável, mas `onCardClick` abre detalhe em modo read-only (sem botões de edit).

4. **`components/campaign/FactionCard.tsx`**
   - Idem LocationCard (linhas 56-186).

5. **`components/campaign/NpcCard.tsx`**
   - Idem: wrapper (linha 45-49) vira clickable; `onCardClick` prop; opacity ajustada; stopPropagation em actions.

6. **`components/campaign/QuestCard.tsx`**
   - Idem (linha 76-81).

7. **`components/campaign/LocationList.tsx`**
   - Adicionar estado `viewingLocation`. Passar `onCardClick={setViewingLocation}` para `LocationCard`.
   - Renderizar `LocationForm` com prop nova `readOnly={!isEditable || mode === 'view'}` — ou reusar o form com valores pré-preenchidos e botões disabled.

8. **`components/campaign/FactionList.tsx`** — idem.

9. **`components/campaign/NpcList.tsx`** — idem (adicionar clique no card que abre o NpcForm já em uso).

10. **`components/campaign/{Location,Faction,Npc,Quest}Form.tsx`** — adicionar prop opcional `readOnly: boolean` que:
    - Desabilita inputs.
    - Esconde botão "Salvar".
    - Mostra botão "Editar" (se `isEditable`) que flipa `readOnly` → `false`.

11. **`components/campaign/MemberCard.tsx`** (P2, opcional neste spec)
    - Se `member.character_id != null`, envolver card em `<Link href={\`/app/characters/${member.character_id}\`}>`. Se `null`, deixar decorativo com mensagem "Jogador sem ficha ainda".

## 5. Impacto em dados (migração?)

**Nenhuma migração de schema.** Todas as tabelas, RLS e server actions necessárias já existem:

- `updateSession`, `createSession`, `startSession` em `lib/supabase/campaign-sessions.ts`.
- Hooks `use-campaign-npcs`, `use-campaign-locations`, `use-campaign-factions`, `use-campaign-quests` já expõem CRUD.
- RLS: locations/factions/npcs já permitem update pelo owner (DM). Validar com teste manual em staging antes de deploy (ver §7).

## 6. Critérios de aceitação

- [ ] Todo card em Campaign HQ (NPC, Local, Facção, Sessão, Quest, Nota) tem `onClick` no body wrapper OU é claramente um display-only (KPI, badge).
- [ ] `LocationCard` e `FactionCard` com `isEditable=false` abrem detalhe read-only quando clicados (player não vê buttons de edit, mas vê informações).
- [ ] `SessionHistory` tem botão "Planejar Sessão" visível no header e na empty state.
- [ ] `SessionHistory` permite DM: edit (planned/active), start (planned), cancel (planned/active), edit-recap (completed).
- [ ] Actions em cards (edit/delete/visibility) não propagam clique para o body (`stopPropagation`).
- [ ] Mobile: action icons têm `opacity-100` por padrão (não hover-only).
- [ ] Keyboard: todos os cards são focáveis (`tabIndex={0}`) e Enter/Space ativa `onClick`.
- [ ] Build limpo: `rtk tsc --noEmit` passa.
- [ ] Testes: `rtk vitest` passa; adicionar teste para SessionHistory "Plan session button exists".

## 7. Riscos

- **Regressão de interação em combate (Combat Parity Rule):** mudanças em `SessionCard` interno de `SessionHistory.tsx` afetam só a view de histórico, não o combate ao vivo (`app/app/session/[id]/page.tsx` + `CombatSessionClient.tsx`). Confirmar que nenhuma mudança toca `components/combat/*` ou `components/session/*`.
- **Resilient Reconnection Rule:** este spec não toca storage keys (`sb-*`, `pwa:*`) nem canais realtime (`combat:*`, `session:*`). Verificação: busca por `BroadcastChannel`, `channel(`, `localStorage.setItem` nos diffs.
- **RLS:** `campaign_locations`, `campaign_factions`, `campaign_npcs`, `sessions` já permitem update pelo dono. Fluxos read-only para player já funcionam via `is_visible_to_players` flag — nada muda no backend.
- **Propagação de clique:** risco de double-open (modal abre e subpainel abre). Mitigação: `e.stopPropagation()` em cada action button + teste E2E.
- **Players em `?section=locations` clicando em card decorativo:** hoje é "zero interação" (F15). Abrir detalhe read-only pode quebrar expectativa se o local tem `is_visible_to_players=false` — já filtrado server-side pela RLS.

## 8. Fora de escopo

- **Entity Graph / Links entre entidades** (Onda 3 — PRD dedicado — F23).
- **Redesign visual dos cards** (F14 "board da cidade quadrado arredondado" — P3 polish).
- **Dashboard informativo** (F10 — Onda 2).
- **Sidebar esquerda** (F13 — Onda 2).
- **Navegação 1-clique a fichas de jogadores** (F11 — adjacente; apenas o mini-fix em `MemberCard` é P2 opcional aqui).
- **Inline edit de campos** (fluxo "click name to rename") — incremento futuro.

---

## 9. Implementação sugerida (ordem)

1. Modificar `SessionHistory.tsx` + `SessionPlanner.tsx` (F12 — menor risco, entrega isolada).
2. Adicionar `readOnly` prop em `{Location,Faction,Npc,Quest}Form.tsx`.
3. Modificar `{Location,Faction,Npc,Quest}Card.tsx` (card body clickable + stopPropagation).
4. Modificar `{Location,Faction,Npc,Quest}List.tsx` para abrir form em modo view on card click.
5. (P2) MemberCard → link para ficha quando `character_id`.
6. Atualizar tests em `components/campaign/__tests__/`.
