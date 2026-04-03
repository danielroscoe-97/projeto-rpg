# Prompt de Implementação — Wave 1 (Quick Wins)

> Copie este prompt inteiro e envie para o agente de implementação em uma nova janela de contexto.

---

## CONTEXTO DO PROJETO

Você está trabalhando no **Pocket DM** — app de combate para D&D 5e, focado em simplicidade na mesa. Stack: Next.js 15, Supabase (Postgres + Realtime), Tailwind CSS, Zustand, TypeScript.

**Antes de qualquer implementação**, leia obrigatoriamente:
- `CLAUDE.md` — contém a **Combat Parity Rule** (Guest vs Auth) que é obrigatória em todo change
- `docs/tech-stack-libraries.md` — libs disponíveis e regras de uso

---

## REGRA DE PARITY (IMUTÁVEL)

Toda alteração em combat experience DEVE verificar os 3 modos:

| Modo | Client | Entry Point |
|------|--------|-------------|
| Guest (DM) | `components/guest/GuestCombatClient.tsx` | `/app/try/page.tsx` |
| Anônimo (Player) | `components/player/PlayerJoinClient.tsx` | `/app/join/[token]/page.tsx` |
| Autenticado (Player) | `components/player/PlayerJoinClient.tsx` | `/app/invite/[token]/page.tsx` |

**Ambas as stories desta wave são Auth-only — sem impacto em Guest ou Anon.**

---

## ITEMS DESTA WAVE (2 stories + 2 verificações)

### Ordem de implementação:

```
1. F-40 (Notas dos players no combate) — 3 SP
2. F-05 (Meus Personagens cross-campaign) — 3 SP
3. Verificar C13 end-to-end (Player HP Self-Management)
4. Verificar C15 end-to-end (Enquete pós-combate)
```

---

## 1. F-40 — Notas dos Players Durante Combate (3 SP)

**Story completa:** `docs/stories/F40-player-combat-notes.md` — **LEIA INTEIRA antes de codar.**

### Resumo

Players precisam anotar coisas durante combate. Hoje `PlayerSharedNotes.tsx` é read-only (só mostra notas compartilhadas pelo DM). Precisa permitir que o player CRIE suas próprias notas com auto-save.

### O que fazer:

1. **Nova migration RLS** (`supabase/migrations/053_player_notes_rls.sql`):
   - Players podem INSERT/UPDATE/DELETE suas próprias notas (`user_id = auth.uid() AND is_campaign_member(campaign_id)`)
   - Adicionar index em `campaign_notes.user_id`
   - NÃO alterar policies existentes do DM

2. **Estender `PlayerSharedNotes.tsx`**:
   - Nova prop `userId?: string` — se presente, habilita seção "Minhas Notas"
   - Seção "Minhas Notas" abaixo das notas compartilhadas do DM
   - Botão "+" cria nota vazia com textarea focado
   - Auto-save debounced (1.5s) — mesmo pattern do `PlayerCharacterManager.tsx` (dm_notes)
   - Indicador "Salvando..." / "Salvo"
   - Botão delete com confirm dialog
   - Soft limit: 10 notas/player
   - `beforeunload` handler para flush de saves pendentes

3. **Atualizar `PlayerJoinClient.tsx`**:
   - Passar `userId` (do auth) para `PlayerSharedNotes`

4. **Atualizar `CampaignNotes.tsx`** (DM side):
   - Nova seção "Notas dos Jogadores" — lista notas onde `user_id != owner_id`
   - Badge com nome do player
   - Read-only para o DM

5. **i18n** em `messages/pt-BR.json` e `messages/en.json`:
   - `player.my_notes`, `my_notes_add`, `my_notes_empty`, `my_notes_saving`, `my_notes_saved`, `my_notes_delete_confirm`, `my_notes_limit`, `my_notes_placeholder`
   - `dashboard.player_notes_section`, `player_notes_empty`, `player_notes_by`

### ACs críticos:
- [ ] Player autenticado consegue criar nota durante combate
- [ ] Auto-save funciona (digitar → 2s → "Salvo")
- [ ] DM vê notas dos players em CampaignNotes (read-only)
- [ ] Player NÃO pode editar notas de outro player
- [ ] Notas compartilhadas do DM continuam funcionando (backward compat)
- [ ] Build passa (`next build`)

---

## 2. F-05 — Página "Meus Personagens" Cross-Campaign (3 SP)

**Story completa:** `docs/stories/F05-my-characters-page.md` — **LEIA INTEIRA antes de codar.**

### Resumo

Player que participa de múltiplas campanhas precisa de um hub central para ver todos os personagens. Hoje só vê dentro de cada campanha. Criar `/app/dashboard/characters`.

### O que fazer:

1. **Criar server component** (`app/app/dashboard/characters/page.tsx`):
   - Fetch `player_characters` com join em `campaigns(id, name)` filtrado por `user_id`
   - Redirect se não autenticado

2. **Criar client component** (`components/dashboard/MyCharactersPage.tsx`):
   - Agrupar personagens por campanha
   - Renderizar com `CharacterCard` existente (já integrado via W32)
   - Click no card → navegar para `/app/campaigns/[campaign_id]`
   - Estado vazio: mensagem + CTA "Ver Campanhas"
   - Skeleton loading (3 cards placeholder)

3. **Atualizar sidebar** (`components/dashboard/DashboardSidebar.tsx`):
   - Novo item "Personagens" com ícone `Users` do Lucide
   - Posição: entre "Combates" e "Soundboard" no desktop
   - Mobile: substituir Soundboard por Characters (4 itens max)

4. **Atualizar tipos** em `DashboardSidebar.tsx` e `DashboardLayout.tsx`:
   - Adicionar `characters` ao tipo `SidebarTranslations`

5. **Atualizar layout** (`app/app/dashboard/layout.tsx`):
   - Adicionar `characters: t("characters")` ao objeto translations

6. **i18n** em `messages/pt-BR.json` e `messages/en.json`:
   - `sidebar.characters`
   - `characters_page.title`, `empty`, `view_campaigns`, `loading`

### ACs críticos:
- [ ] Link "Personagens" na sidebar desktop e mobile
- [ ] Página lista personagens agrupados por campanha com CharacterCard
- [ ] Click no card navega para a campanha
- [ ] Estado vazio funcional
- [ ] Build passa (`next build`)

---

## 3. Verificar C13 — Player HP Self-Management (end-to-end)

**Contexto:** O backend do C13 está DONE (`CombatSessionClient.tsx:822-874` tem handler para `player:hp_action`). A UI (`PlayerHpActions.tsx`) também parece existir. Verificar se funciona end-to-end.

### O que verificar:

1. Ler `components/player/PlayerHpActions.tsx` — confirmar que existe e está completo
2. Verificar se `PlayerHpActions` é renderizado no `PlayerBottomBar` e no `PlayerInitiativeBoard`
3. Verificar se `handleHpAction` callback existe no `PlayerJoinClient.tsx`
4. Verificar se `hpActionOptimisticRef` existe para protection window
5. Verificar se as chaves i18n `hp_damage`, `hp_heal`, `hp_temp` existem em ambos locales
6. Se TUDO existe → marcar C13 como DONE e reportar
7. Se algo falta → implementar o que falta seguindo `docs/stories/C13-player-damage-report.md`

---

## 4. Verificar C15 — Enquete Pós-Combate (end-to-end)

**Contexto:** O backend do C15 está DONE (`CombatSessionClient.tsx:808-820` tem handler para `player:poll_vote`). UI components `DifficultyPoll.tsx` e `CombatLeaderboard.tsx` existem. Verificar se funciona end-to-end.

### O que verificar:

1. Verificar se `CombatLeaderboard` é renderizado no `PlayerJoinClient` quando recebe `session:combat_stats`
2. Verificar se `DifficultyPoll` é mostrado ao player após o leaderboard
3. Verificar se o vote do player é broadcast via `player:poll_vote`
4. Verificar se o DM recebe os votes e mostra resultado agregado
5. Verificar se há migration para `difficulty_rating` na tabela `encounters`
6. Se TUDO existe → marcar C15 como DONE e reportar
7. Se algo falta → implementar o que falta seguindo `docs/stories/C15-post-combat-poll.md`

---

## REGRAS DE IMPLEMENTAÇÃO

1. **Ler a story completa antes de codar** — cada story tem root cause, ACs numerados, abordagem técnica e plano de testes
2. **Marcar ACs como feitos** conforme completa (`- [x]`)
3. **Verificar parity** em cada change antes de considerar pronto
4. **Screenshots de QA** em `qa-evidence/` — nunca na raiz do projeto
5. **Não criar arquivos desnecessários** — prefira editar existentes
6. **Rodar `next build`** ao final para garantir zero erros

---

## ENTREGÁVEIS

Ao concluir, reportar:

```
WAVE 1 — STATUS:
- F-40 Notas player: [DONE/PARCIAL] — [detalhes]
- F-05 Meus Personagens: [DONE/PARCIAL] — [detalhes]
- C13 HP Self-Mgmt: [DONE/FALTA X] — [detalhes]
- C15 Poll: [DONE/FALTA X] — [detalhes]
- Build: [PASSA/FALHA] — [detalhes]
```
