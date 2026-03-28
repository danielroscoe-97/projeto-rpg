# Discovery Report — Feedback de Áudio (2026-03-28)

**Projeto:** Pocket DM
**Autores:** John (PM), Sally (UX), Winston (Architect)
**Data:** 2026-03-28
**Fonte:** Transcrições de áudio do Dani_
**Status:** Aprovado para Sprint Planning

---

## Sumário Executivo

Análise de 14 itens identificados nas transcrições de áudio do product owner.
Classificados em 3 categorias: **Bugs (3)**, **Melhorias de UX (5)**, **Features Novas (6)**.

Tema central: **Paridade entre combate logado e deslogado (/try)** — a experiência guest está incompleta, prejudicando conversão.
Tema secundário: **Fluidez do combate** — auto-scroll, histórico de dados, e feedback visual precisam de polish.

---

## Inventário Completo

### 🐛 BUGS

#### B1: Golden glow ausente no card de grupo na iniciativa ativa
- **Severidade:** Alta
- **Onde:** Combate logado, grupos de monstros
- **Problema:** Quando chega a vez de um grupo na iniciativa, o `MonsterGroupHeader` não recebe o indicador visual dourado (border-gold + ring-gold). Apenas os CombatantRow internos recebem `isCurrentTurn`, mas o container do grupo não propaga esse estado visual.
- **Arquivo:** `components/combat/MonsterGroupHeader.tsx` — não recebe prop `isCurrentTurn`
- **Impacto:** DM não sabe que é a vez do grupo, especialmente quando colapsado

#### B2: Áudios de efeitos climáticos não funcionam
- **Severidade:** Alta
- **Onde:** Tela de combate (botões de efeito climático)
- **Problema:** Sons não tocam ou estão muito baixos. Os presets de áudio em `lib/utils/audio-presets.ts` apontam para `/sounds/sfx/*.mp3` — precisamos verificar se os arquivos existem e se o volume default (0.7) é adequado. O `audio-store.ts` silencia quando `isMuted` é true e ignora erros de `audio.play()`.
- **Arquivo:** `lib/stores/audio-store.ts`, `lib/utils/audio-presets.ts`, `public/sounds/sfx/`
- **Root Cause Confirmada:** Todos os 10 arquivos MP3 em `public/sounds/sfx/` são **idênticos** (mesmo MD5: `ba7d399748dabfb1c5b0d43867b2d6e0`, 4387 bytes cada). São placeholders genéricos. O código está correto — o problema são os assets.
- **Impacto:** Feature de imersão sonora inútil

#### B3: Landing page diz "sem conta necessária" no passo 3
- **Severidade:** Média
- **Onde:** `app/page.tsx:454`
- **Problema:** Passo 3 do "Como Funciona" diz: _"Gere o link da sessão. Jogadores abrem no celular — sem conta necessária."_ Mas compartilhar o link de sessão **requer conta** (é feature logada). Texto enganoso.
- **Correção:** Remover "sem conta necessária" ou reformular para "Jogadores entram pelo celular — sem cadastro para eles."
- **Impacto:** Expectativa quebrada → frustração na primeira experiência

---

### 🔧 MELHORIAS DE UX

#### U1: Histórico de dados — colapsado por padrão, newest-on-top, sem auto-scroll
- **Prioridade:** Alta
- **Onde:** `components/dice/DiceHistoryPanel.tsx`, `lib/stores/dice-history-store.ts`
- **Problemas identificados:**
  1. Painel abre expandido — deveria estar colapsado por padrão (pill mode)
  2. Entradas são adicionadas no final da lista (oldest-first) — deveria ser newest-first
  3. Auto-scroll para baixo em cada nova entrada (linha 31-33) — não deveria scrollar
- **Comportamento desejado:**
  - Painel sempre colapsado (pill) por padrão
  - Ao abrir, última rolagem no topo
  - Nova rolagem aparece no topo (prepend, não append)
  - Sem auto-scroll forçado
  - Mostrar último dado rolado + peek do penúltimo no pill

#### U2: Vantagem/Desvantagem no histórico de dados
- **Prioridade:** Alta
- **Onde:** `components/dice/DiceHistoryPanel.tsx` — `EntryBreakdown` e `HistoryEntryRow`
- **Problema:** O histórico já mostra badge ADV/DIS e mostra os dois valores com o descartado riscado, MAS:
  1. O **nome do ataque** não inclui "— Advantage" ou "— Disadvantage" no label
  2. Na versão colapsada (pill), não mostra informação de advantage/disadvantage
- **Solução:** Concatenar o modo ao label: `"{label} — Advantage"` ou `"{label} — Disadvantage"`

#### U3: Auto-scroll para combatente ativo ao avançar turno
- **Prioridade:** Alta
- **Onde:** Combate logado (`CombatSessionClient.tsx`) e deslogado (`GuestCombatClient.tsx`)
- **Problema:** Com 6+ combatentes, ao clicar "Próximo Turno", o card do combatente ativo pode estar fora da tela. O mestre precisa scrollar manualmente.
- **Comportamento existente:** `CombatSessionClient.tsx:378` já faz scroll para o combatante focado via keyboard, mas NÃO ao avançar turno.
- **Solução:** Após `advanceTurn()`, chamar `scrollIntoView({ behavior: 'smooth', block: 'center' })` no card ativo.

#### U4: Tooltip/descrição no campo de alias (display_name)
- **Prioridade:** Média
- **Onde:** Tela pré-combate (setup), campo display_name/playerName
- **Problema:** O campo de alias gerado automaticamente não tem descrição clara. DM não entende que "Combatente Desconhecido T" é o nome que jogadores veem.
- **Solução:** Adicionar tooltip: _"🛡️ Barreira Anti-Metagame — Nome que seus jogadores verão na iniciativa"_
- **Feature name:** "Barreira Anti-Metagame"

#### U5: Alias editável na tela pré-combate (não só no edit)
- **Prioridade:** Média
- **Onde:** `CombatantSetupRow` (pré-combate)
- **Problema:** O display_name só é editável via modal de "Editar" em combate ativo. Na tela de setup, o DM deveria poder clicar no alias para editá-lo.
- **Solução:** Adicionar um botão/ícone (seta, +) ao lado do nome na setup row para expandir campo de alias

---

### ✨ FEATURES NOVAS

#### F1: Iniciativa de grupo auto-rolada ao inserir monstros
- **Prioridade:** Alta
- **Onde:** `GuestCombatClient.tsx:134-169` — `handleSelectMonsterGroup`
- **Problema:** Ao inserir grupo de monstros, a iniciativa fica `null` para todos os membros. Deveria vir já rolada (1d20 + DEX modifier), como já acontece para monstros individuais (linha 99: `rollInitiativeForCombatant`).
- **Nota:** No combate logado (`EncounterSetup.tsx`), mesma lógica se aplica.
- **Solução:** No `handleSelectMonsterGroup`, chamar `rollInitiativeForCombatant` uma vez e atribuir o resultado a todos os membros do grupo.

#### F2: Dano em grupo no combate deslogado (/try)
- **Prioridade:** Alta
- **Onde:** `GuestCombatClient.tsx:843-859`
- **Problema:** O `CombatantRow` no combate guest não recebe `allCombatants` nem `onApplyToMultiple`, portanto a seção multi-target do `HpAdjuster` nunca aparece.
- **Solução:** Passar `allCombatants={combatants}` e implementar `onApplyToMultiple` callback no guest.

#### F3: "Aplicar em mais alvos" no combate deslogado (/try)
- **Prioridade:** Alta
- **Nota:** Mesmo issue que F2 — são o mesmo componente (`HpAdjuster` com multi-target). A solução de F2 resolve F3.

#### F4: Barra visual de HP temporário (roxa)
- **Prioridade:** Alta
- **Onde:** `CombatantRow.tsx:117-122` — cálculo de HP bar
- **Problema:** `hasTempHp` já é calculado (linha 122), mas não há representação visual na barra. O temp_hp existe no model mas é invisível na UI.
- **Solução:** Overlay roxo na barra de HP. Cálculo: `tempHpPct = temp_hp / (max_hp + temp_hp)`. Barra roxa fica **à direita** da barra de HP normal, expandindo o total visual. Respeita os tiers (LIGHT/MODERATE/HEAVY/CRITICAL) — eles calculam sobre HP normal, não sobre temp_hp.

#### F5: Analytics/Leaderboard ao finalizar combate no /try + CTA
- **Prioridade:** Muito Alta (conversão)
- **Onde:** `GuestCombatClient.tsx:746-748` — `handleEndEncounter` atualmente só reseta
- **Problema:** Ao finalizar combate no /try, não há nenhum feedback. O DM jogou 30-40 min e vê... nada. Oportunidade perdida de conversão.
- **Solução:**
  1. **Tracker client-side:** Durante combate, acumular stats: dano total por combatente, kills, crits, rounds
  2. **Tela de leaderboard:** Ao clicar "Fim", mostrar leaderboard com rankings
  3. **CTA:** "Quer estatísticas completas na sua campanha? Crie sua conta grátis"
  4. **Timer:** Mostrar duração do combate na tela ativa (F6)
- **Zero dependência de backend** — tudo client-side via Zustand

#### F6: Timer de combate na tela
- **Prioridade:** Média
- **Onde:** Tela de combate ativa (logado e deslogado)
- **Problema:** Não há indicação de quanto tempo o combate está durando. Útil para DMs e para o leaderboard (F5).
- **Solução:** Iniciar timer no `startCombat()`, exibir no header como `⏱ 12:34`, persistir no state.

---

## Matriz de Impacto vs Esforço

| Item | Impacto | Esforço | Score | Sprint |
|------|---------|---------|-------|--------|
| F5 | 10 (conversão) | 8h | Muito Alto | 3 |
| F2/F3 | 9 (paridade /try) | 2h | Muito Alto | 1 |
| B1 | 8 (bug visual) | 1h | Alto | 1 |
| U3 | 8 (fluidez) | 2h | Alto | 1 |
| U1 | 8 (fluidez) | 3h | Alto | 1 |
| F1 | 7 (UX setup) | 1h | Alto | 1 |
| F4 | 7 (visual) | 3h | Alto | 2 |
| U2 | 7 (info) | 2h | Alto | 2 |
| B2 | 7 (imersão) | 3h | Alto | 2 |
| B3 | 6 (texto) | 0.5h | Médio | 1 |
| U4 | 5 (tooltip) | 1h | Médio | 2 |
| U5 | 5 (conveniência) | 2h | Médio | 2 |
| F6 | 5 (auxiliar) | 2h | Médio | 3 |

---

## Dependências Identificadas

- **F5 depende de F6** — O leaderboard precisa do timer para mostrar duração
- **F2 = F3** — São o mesmo fix (multi-target props no guest)
- **U1 e U2** podem ser implementados juntos (mesmo componente)
- **B1** é independente e rápido (1h)
- **F1** é independente e rápido (1h)

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| B2: Arquivos de áudio podem não existir em `/public/sounds/sfx/` | Verificar e criar/baixar se necessário |
| F5: Leaderboard pode ficar complexo | MVP mínimo: top 3 + dano total + CTA |
| U3: Auto-scroll pode ser disruptivo | Usar `block: 'center'` + `behavior: 'smooth'` + threshold de 6+ combatentes |
