# PROMPT: Sprint 1 — Estabilização & Quick Wins

> Cole este prompt inteiro em uma nova conversa do Claude Code para executar o Sprint 1 completo.

---

## Contexto

Você vai implementar o Sprint 1 do Pocket DM — um combat tracker para D&D 5e (Next.js 15 + Supabase + Tailwind).

Leia estes docs ANTES de começar:
- `docs/sprint-plan-2026-03-30.md` — Sprint plan completo (leia a seção Sprint 1)
- `docs/bucket-future-ideas.md` — O que NÃO fazer (itens adiados)
- `docs/tech-stack-libraries.md` — Stack, libs disponíveis, regras de uso

Filosofia do produto: **simplicidade radical pro momento da mesa**. Não overengineer.

---

## Tasks (execute em ordem)

### Task 1: Fix Logo PocketDM na LP (30min)

**Arquivo:** `components/layout/Navbar.tsx`

O logo do PocketDM não é clicável em todos os momentos. 4 causas identificadas:

1. **Linha 54-62:** O `<Link>` do logo não tem z-index explícito. Adicione `relative z-50` na className do Link.

2. **Linha 59:** O `<img>` do logo com `drop-shadow` pode consumir clicks. Adicione `pointer-events-none` na className do img.

3. **Linha ~135-136:** O mobile drawer `fixed inset-x-0 top-[72px] z-40` pode interceptar clicks na área do logo quando FECHADO. Garanta que o drawer tenha `pointer-events-none` quando não está visível, e `pointer-events-auto` quando aberto.

4. **`app/globals.css` linhas 108-116:** CSS global aplica `position: relative; z-index: 1` em `header, section, main` — cria conflito com o z-50 do navbar fixo. Remova `header` dessa regra (o navbar já gerencia seu próprio z-index).

**AC:** Logo clicável em TODOS os estados — scroll, mobile, hover, glass-nav ativo.

**Teste manual:** Abrir LP, scrollar, clicar no logo em diferentes posições da página. No mobile, abrir/fechar menu e clicar no logo.

---

### Task 2: Undo System no Guest Combat (1-2 dias)

**Contexto:** O combate logado (`components/session/CombatSessionClient.tsx`) usa `useCombatStore` que tem `undoLastAction` com tracking de ações (ver `lib/stores/combat-store.ts` linhas 334-452). O combate guest (`components/guest/GuestCombatClient.tsx`) NÃO tem undo nenhum.

**O que fazer:**

1. Crie um hook `useGuestUndoStack` em `lib/hooks/useGuestUndoStack.ts` que gerencia uma pilha de ações reversíveis:
   ```ts
   type UndoableAction =
     | { type: "hp_change"; combatantId: string; previousHp: number; previousTempHp: number }
     | { type: "condition_add"; combatantId: string; condition: string }
     | { type: "condition_remove"; combatantId: string; condition: string }
     | { type: "turn_advance"; previousTurnIndex: number; previousRound: number }
     | { type: "defeat_change"; combatantId: string; previousState: boolean }
     | { type: "revive"; combatantId: string; previousHp: number; previousDefeated: boolean; previousDeathSaves: { successes: number; failures: number } };
   ```

2. A pilha é in-memory (useState), NÃO localStorage. Limite de 50 ações.

3. Antes de cada ação no `GuestCombatClient.tsx`, push o estado anterior na pilha:
   - Antes de `adjustHp` → push hp_change
   - Antes de add/remove condition → push condition_add/remove
   - Antes de `advanceTurn` → push turn_advance
   - Antes de toggle defeated → push defeat_change
   - Antes de revive → push revive

4. Adicione botão "Undo" no header do combate (ao lado do timer), com ícone `Undo2` do lucide-react. Disabled quando pilha vazia.

5. Bind `Ctrl+Z` / `Cmd+Z` ao undo (adicionar no hook de keyboard shortcuts existente `useCombatKeyboardShortcuts`).

6. Ao executar undo, restaure o estado anterior do combatant e remova a ação da pilha.

**Arquivos a modificar:**
- Criar: `lib/hooks/useGuestUndoStack.ts`
- Modificar: `components/guest/GuestCombatClient.tsx` — integrar o hook, wrap cada ação
- Modificar: `lib/hooks/useCombatKeyboardShortcuts.ts` — adicionar Ctrl+Z binding

**AC:** DM guest consegue desfazer última ação com botão Undo ou Ctrl+Z. Funciona para HP, conditions, turno, defeat, revive.

---

### Task 3: Hidden Combatants no Guest (2h)

**Contexto:** Em `GuestCombatClient.tsx`, quando combatants são criados, `is_hidden` é hardcoded para `false`. No combate logado, o DM tem `onToggleHidden` pra esconder monstros de emboscada.

**O que fazer:**

1. No `GuestCombatClient.tsx`, adicione a prop `onToggleHidden` no `CombatantRow` (deve ser o mesmo componente usado no logado).

2. Implemente a função toggle: encontre o combatant pelo id, flip `is_hidden`.

3. No guest, hidden combatants devem ter visual diferente (opacity reduzida, ícone de olho cortado) — o `CombatantRow` provavelmente já faz isso, já que o logado usa.

4. Como não há players no guest combat, não precisa de broadcast. É puramente visual/organizacional pro DM.

5. Adicione o undo pra hidden_change no stack da Task 2.

**AC:** DM guest consegue esconder/mostrar combatants. Visual de "escondido" consistente com o logado.

---

### Task 4: Keyboard Cheatsheet no Guest (1h)

**Arquivo existente:** `components/combat/KeyboardCheatsheet.tsx`

**O que fazer:**

1. No `GuestCombatClient.tsx`, importe e renderize `<KeyboardCheatsheet />` — provavelmente precisa ser posicionado no mesmo lugar que no `CombatSessionClient.tsx`.

2. Verifique se o componente mostra shortcuts relevantes pro guest (alguns podem não aplicar, como os de audio). Se necessário, passe uma prop pra filtrar shortcuts não disponíveis no guest.

3. Garanta que `?` abre o cheatsheet (deve funcionar se o hook de keyboard shortcuts já escuta esse key).

**AC:** Guest vê cheatsheet ao pressionar `?`. Mostra apenas shortcuts funcionais no guest.

---

### Task 5: Google Login no Fluxo "Compartilhar com Jogador" (1 dia)

**Contexto:** O componente `components/guest/GuestUpsellModal.tsx` é mostrado quando o guest clica em "Compartilhar com jogador". Hoje ele só mostra texto de upsell. Precisamos adicionar Google OAuth.

**O que fazer:**

1. No Supabase Dashboard, Google OAuth já deve estar configurado. Verifique em `lib/supabase/client.ts` como o client é inicializado.

2. No `GuestUpsellModal.tsx`, adicione um botão "Continuar com Google" que chama:
   ```ts
   const { data, error } = await supabase.auth.signInWithOAuth({
     provider: 'google',
     options: {
       redirectTo: `${window.location.origin}/try?restore=true`,
       queryParams: {
         access_type: 'offline',
         prompt: 'consent',
       },
     },
   });
   ```

3. O redirect vai pra `/try?restore=true`. Na page `/app/try/page.tsx` (ou `GuestCombatClient`), detecte o param `restore=true` e:
   - Verifique se o user está agora logado (Supabase session)
   - Carregue os dados do guest combat do localStorage
   - Migre pro combate logado (crie session no Supabase, copie combatants)
   - Redirecione pra `/session/[id]`

4. Se a migração for muito complexa agora, uma alternativa mais simples:
   - Após login Google, redirecione pra dashboard
   - Mostre toast "Conta criada! Agora crie um novo combate na sua campanha."
   - Essa versão é MVP aceitável — a migração pode vir depois.

5. Adicione também o botão "Continuar com e-mail" que leva pra `/login`.

6. Estilize o botão Google com ícone SVG do Google e cores padrão (branco com borda, texto escuro).

**Arquivo a modificar:**
- `components/guest/GuestUpsellModal.tsx` — adicionar botões Google + Email
- `components/auth/AuthPageContent.tsx` — adicionar Google OAuth se não tiver
- Verificar: `lib/supabase/client.ts` — confirmar que Google provider está disponível

**IMPORTANTE:** Verifique se o Google OAuth está de fato habilitado no projeto Supabase antes de implementar. Se não estiver, documente o que precisa ser configurado no dashboard do Supabase (não é código, é config).

**AC:** Guest vê botão "Continuar com Google" no modal de share. Ao clicar, faz OAuth e volta logado.

---

### Task 6: Weather/Background como Teaser Upsell no Guest (4h)

**Componentes existentes:**
- `components/player/WeatherOverlay.tsx` — efeitos visuais (rain, snow, fog, storm, ash)
- `components/combat/BackgroundSelector.tsx` — troca de background do combate

**O que fazer:**

1. No `GuestCombatClient.tsx`, adicione botões na toolbar do combate para Weather e Background.

2. Use os mesmos ícones do combate logado (verifique em `CombatSessionClient.tsx` quais ícones são usados).

3. Ao clicar em qualquer um dos botões, ao invés de abrir o seletor, abra o `GuestUpsellModal` com mensagem contextual:
   - Weather: "Adicione efeitos climáticos épicos ao seu combate! Crie uma conta gratuita."
   - Background: "Personalize o cenário do combate! Crie uma conta gratuita."

4. O `GuestUpsellModal` já vai ter o botão Google da Task 5, então o fluxo de conversão fica completo.

**AC:** Botões de Weather e Background visíveis no guest. Click abre upsell com Google login.

---

## Regras Gerais de Implementação

1. **i18n:** Toda string nova deve ir em `messages/pt-BR.json` E `messages/en.json`. Use `useTranslations()`.
2. **Testes:** Crie testes unitários para o `useGuestUndoStack` hook.
3. **HP Tiers:** NUNCA altere os tiers de HP (70/40/10% = LIGHT/MODERATE/HEAVY/CRITICAL). Regra imutável.
4. **Estilo:** Dark theme com gold accent (`text-gold`, `border-gold/20`, `bg-gold/10`). Sem emojis em UI.
5. **Componentes:** Reutilize componentes existentes (CombatantRow, KeyboardCheatsheet, GuestUpsellModal). NÃO duplique.
6. **Commits:** Faça um commit por task completada. Formato: `feat(guest): add undo system to guest combat`

## Ordem de Execução

```
Task 1 (logo fix)     → 30min   → commit
Task 4 (cheatsheet)   → 1h     → commit
Task 3 (hidden)       → 2h     → commit
Task 2 (undo system)  → 1-2d   → commit
Task 6 (weather teaser) → 4h   → commit
Task 5 (google login) → 1d     → commit
```

A ordem está otimizada: quick wins primeiro, depois features mais complexas. Task 3 (hidden) antes de Task 2 (undo) porque o undo precisa incluir hidden_change.

---

## Validação Final

Após todas as tasks, rode:
```bash
npm run build && npm run test
```

Se passar, o Sprint 1 está completo. Faça push para origin/master.
