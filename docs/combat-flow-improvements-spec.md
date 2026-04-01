# Spec: Combat Flow Improvements v1

**Projeto:** Pocket DM
**Data:** 2026-03-31
**Origem:** Party Mode — analise de fluxo de combate vs concorrentes (Shieldmaiden, Improved Initiative, MasterApp, VTTs)
**Status geral:** Aprovado para implementacao

---

## Contexto

O Pocket DM tem 7 vantagens exclusivas no combat tracking (turn timer, leaderboard, death saves completo, conditions com icones, keyboard shortcuts, undo/redo, realtime broadcast). Nenhum dos 9 concorrentes mapeados oferece esse conjunto.

Porem, a **friccao no setup e fluxo operacional** pode fazer o DM desistir antes de descobrir esses diferenciais. Esta spec endereca os pontos de friccao identificados pela equipe de produto.

### Premissa Central

> *"O DM quer: adicionar monstros, rolar init, GO. Tudo que atrasa isso e friccao."*

### Priorizacao

| # | Item | Esforco | Impacto | Tipo |
|---|------|---------|---------|------|
| CF-03 | Auto-scroll pro turno | Baixo | Alto | Quick win |
| CF-04 | Auto-defeat monstro 0 HP | Baixo | Medio | Quick win |
| CF-06 | Nome do encounter no final | Baixo-Medio | Alto | Quick win |
| CF-02 | Seletor de grupo inline | Medio | Medio | Sprint curto |
| CF-01 | OmniBar unificada | Alto | Alto | Sprint dedicado |

**CF-05 (MonsterActionBar inline) descartado** — DM prefere abrir ficha completa do monstro para planejar acoes.

---

## CF-01: OmniBar — Campo Unificado de Busca

### O que muda

Substituir `MonsterSearchPanel` + Add Row (bottom) + `CampaignLoader` por um unico campo de busca unificado que funciona tanto no setup quanto mid-combat.

### Comportamento

1. **Campo unico** com placeholder: "Buscar monstro, NPC ou player..."
2. **Ao digitar**, busca simultanea em 3 fontes (nesta ordem de prioridade):
   - **Monstros SRD** — sempre primeiro (uso primario do DM)
   - **Players da campanha** — aparecem se nome bater na busca, abaixo dos monstros
   - **Presets salvos** — por ultimo
3. **Botao `[+ Manual]`** ao lado do campo — expande form simplificado:
   - Nome: obrigatorio
   - HP, AC, Initiative: opcionais (consistente com setup atual)
4. **Enter sem selecao** → interpreta como manual add (nome = texto digitado)
5. **Filtros CR/tipo** mantidos em collapse (como hoje)
6. **Mesmo componente** funciona no EncounterSetup e mid-combat (AddCombatantForm atual e substituido)

### Por que players aparecem mas com prioridade menor

Players se auto-adicionam pelo link compartilhavel. Mas o DM pode precisar buscar um player especifico (chegou atrasado, precisa re-adicionar). Monstros sao o uso primario do search.

### Mockup

```
┌──────────────────────────────────────────────────┐
│ Buscar monstro, NPC ou player...      [+ Manual] │
│                                                    │
│  ── Monstros SRD ─────────────────────────────── │
│  🐉 Goblin (CR 1/4) — HP 7, AC 15               │
│     [Adicionar]        Grupo: [ - 1 + ] [Add]    │
│  🐉 Goblin Boss (CR 1) — HP 21, AC 17           │
│     [Adicionar]        Grupo: [ - 1 + ] [Add]    │
│  ── Players da campanha ─────────────────────── │
│  ⚔ Gobsworth (Fighter 5) — HP 45, AC 18         │
└──────────────────────────────────────────────────┘
```

### Arquivos impactados

- `components/combat/MonsterSearchPanel.tsx` — refactor principal
- `components/combat/EncounterSetup.tsx` — remover add-row, integrar OmniBar
- `components/combat/AddCombatantForm.tsx` — substituir por OmniBar mid-combat
- `components/session/CampaignLoader.tsx` — integrar como fonte de dados na OmniBar

### Consistencia mid-combat

O `AddCombatantForm` atual exige HP, AC e initiative como obrigatorios. No setup, a add-row aceita opcionais. **A OmniBar unifica:** HP/AC vem do SRD se for monstro, initiative e auto-rolada, tudo opcional se for manual.

---

## CF-02: Seletor de Grupo Inline por Row

### O que muda

Remover stepper global de quantidade do `MonsterSearchPanel` (linhas 392-427). Adicionar stepper `[ - N + ]` dentro de **cada resultado de busca**.

### Comportamento

- Cada row de monstro no resultado tem:
  - **[Adicionar]** — adiciona 1x (clique rapido)
  - **Stepper `[ - N + ]`** — contador proprio da row, comeca em 1
  - **[Add]** ao lado do stepper — adiciona grupo de N com initiative compartilhada
- Stepper reseta pra 1 apos adicionar
- Checkbox "Adicionar como oculto" permanece **global** (acima da lista de resultados)
- Initiative compartilhada pro grupo (comportamento existente em `handleSelectMonsterGroup`)

### Mockup

```
┌───────────────────────────────────────────────────────┐
│  🐉 Goblin (CR 1/4) — HP 7, AC 15          📖 Ficha │
│  [Adicionar]              Grupo: [ - ]  2  [ + ] [Add]│
├───────────────────────────────────────────────────────┤
│  🐉 Goblin Boss (CR 1) — HP 21, AC 17      📖 Ficha │
│  [Adicionar]              Grupo: [ - ]  1  [ + ] [Add]│
└───────────────────────────────────────────────────────┘
```

### Por que inline e nao global

O DM usa desktop. Espaco sobra. Com stepper inline, zero ida-e-volta: ve o monstro, decide quantos, adiciona — tudo no mesmo lugar. Elimina o modelo de "ajustar quantidade global → clicar monstro" que exige memoria de curto prazo.

### Arquivos impactados

- `components/combat/MonsterSearchPanel.tsx` — mover state `quantity` pra dentro de cada row de resultado

---

## CF-03: Auto-Scroll pro Turno Atual

### O que muda

Quando `current_turn_index` muda (advance turn), scroll suave automatico para a `CombatantRow` do combatente ativo.

### Comportamento

```
DM aperta Space (advance turn)
  → Store atualiza current_turn_index
  → useEffect detecta mudanca
  → Checa se ha painel aberto (HpAdjuster, Conditions, Edit, etc.)
    → Se sim: NAO scrolla (DM esta interagindo)
    → Se nao: scrollIntoView({ behavior: "smooth", block: "center" })
```

### Deteccao de painel aberto

Cada `CombatantRow` marca `data-panel-open="true"` no container quando `openPanel !== null`. Antes de scrollar, checar via DOM:

```tsx
const hasOpenPanel = document.querySelector('[data-panel-open="true"]');
if (hasOpenPanel) return;
```

Abordagem via DOM evita levantar state pra cima (refactor pesado desnecessario).

### Edge cases

- Se todos os combatentes cabem na tela → scroll nao faz nada visivel (ok)
- 15+ combatentes em tela grande → scroll essencial
- Player view pode ter comportamento similar (verificar `PlayerInitiativeBoard`)

### Arquivos impactados

- `components/session/CombatSessionClient.tsx` — adicionar useEffect com scroll
- `components/combat/CombatantRow.tsx` — adicionar `data-panel-open` e `data-combatant-index`

---

## CF-04: Auto-Defeat Monstro a 0 HP

### O que muda

Monstro que chega a 0 HP e automaticamente marcado como derrotado (`is_defeated = true`). Player continua com death saves (sem mudanca).

### Comportamento

```
HP chega a 0:
├── E player?  → Death save mode (como hoje, sem mudanca)
├── E monstro? → Auto-defeat
│   ├── is_defeated = true
│   ├── Broadcast "combat:defeated" para player view
│   ├── Toast: "Goblin 2 foi derrotado!"
│   └── Log entry no combat log
└── E NPC aliado/neutro? → Mesmo que monstro (auto-defeat)
```

### Escape hatch: Undead Fortitude e similares

Alguns monstros SRD tem traits que permitem sobreviver a 0 HP (Zombies com "Undead Fortitude", Orcs com "Relentless Endurance", etc.).

**Deteccao:** Verificar se o monstro tem traits cujo texto contem "Fortitude", "Relentless", ou "drop to 0 hit points" no SRD data.

**Comportamento especial:** Se detectado, em vez de auto-defeat, mostrar toast de confirmacao:
```
"Zombie tem Undead Fortitude. Derrotar automaticamente?"
[Sim]  [Nao — manter a 0 HP]
```

Se "Nao", monstro fica a 0 HP sem is_defeated, DM decide manualmente apos rolar o save.

### Onde implementar

Em `lib/hooks/useCombatActions.ts`, funcao `handleApplyDamage`, apos linha 188 (depois do `persistHpChange`):

```tsx
// Auto-defeat non-player combatants at 0 HP
if (newCurrentHp === 0 && !before.is_player) {
  // Check for Undead Fortitude / Relentless traits
  const hasZeroHpTrait = checkZeroHpTraits(before);
  if (hasZeroHpTrait) {
    // Show confirmation toast
    showZeroHpTraitConfirmation(before, id);
  } else {
    handleSetDefeated(id, true);
  }
}
```

### Arquivos impactados

- `lib/hooks/useCombatActions.ts` — logica de auto-defeat no handleApplyDamage
- `lib/combat/zero-hp-traits.ts` — novo util para deteccao de traits (Fortitude, Relentless)
- `lib/stores/combat-store.ts` — sem mudanca (setDefeated ja existe)

---

## CF-06: Nome do Encounter no Final

### O que muda

Remover campo obrigatorio de nome no `EncounterSetup`. Perguntar nome ao encerrar combate, com sugestao auto-gerada.

### Fluxo atual (4 passos com friccao)

```
1. Digitar nome do encounter* ← FRICCAO (bloqueante)
2. Buscar/adicionar monstros
3. Rolar iniciativa
4. Start Combat
```

### Fluxo proposto (3 passos + 1 opcional no fim)

```
1. Buscar/adicionar monstros
2. Rolar iniciativa (ou auto-roll NPCs)
3. Start Combat
... combate rola ...
4. Encerrar → Modal de nome (opcional, com sugestao)
```

### Auto-geracao de nome

Baseada nos monstros no encounter:
- `"Goblins & Goblin Boss"` — nomes unicos dos monstros
- `"Encounter #N"` — fallback se nao houver monstros nomeados
- Formato: ate 3 nomes unicos. Se mais, `"Goblins, Wolves & 2 outros"`

### Modal de encerramento

```
┌─────────────────────────────────────────────┐
│  ⚔ Encounter encerrado!                     │
│                                              │
│  Nome: [Emboscada Goblin________________]   │
│  Sugestao: "Goblins & Goblin Boss"          │
│                                              │
│  [Pular]              [Salvar e ver stats]  │
└─────────────────────────────────────────────┘
```

- **[Pular]** → usa nome auto-gerado, vai direto pro Leaderboard
- **[Salvar e ver stats]** → salva nome digitado, vai pro Leaderboard
- Nome alimenta: Leaderboard, historico de sessoes, combat log

### Edge cases

- DM fecha browser sem nomear → `combatResilience` persiste nome temporario (auto-gerado) no backup local
- Guest mode (sem campanha) → `createEncounterWithCombatants` recebe nome auto-gerado como default
- Campo de nome no setup: **removido como obrigatorio**. Pode manter como opcional se o DM quiser pre-nomear, mas nao bloqueia Start Combat.

### Arquivos impactados

- `components/combat/EncounterSetup.tsx` — remover validacao obrigatoria de nome (linhas 621-625), tornar opcional
- `components/session/CombatSessionClient.tsx` — adicionar modal de nome no handleEndEncounter (antes do Leaderboard)
- `lib/utils/encounter-name.ts` — novo util para auto-geracao de nome baseado nos combatentes
- `lib/stores/combat-persist.ts` — persistir nome temporario no backup

---

## Decisoes Registradas

| Decisao | Justificativa |
|---------|--------------|
| Monstros antes de players na busca | Players se auto-adicionam pelo link; DM usa search pra monstros |
| Seletor de grupo inline (nao global) | DM usa desktop, espaco sobra, zero ida-e-volta |
| Nao scrollar se painel aberto | DM esta interagindo, scroll atrapalharia |
| MonsterActionBar inline descartado | DM prefere ficha completa pra planejar acoes do monstro |
| Nome no final, nao no setup | Reduz time-to-combat, nome vem em momento mais natural |
| Checkbox hidden permanece global | E decisao de contexto do encounter, nao individual por monstro |

---

## Concorrentes Referenciados

| Concorrente | O que inspirou |
|-------------|---------------|
| **Improved Initiative** | Campo unico de busca (monstro ou player), monster stats inline no turno |
| **Shieldmaiden** | Campo unico de busca, simplicidade do setup |
| **MasterApp RPG** | Comparativo geral — eles NAO tem realtime sync, death saves, leaderboard |

---

> **Documento gerado em:** 2026-03-31
> **Participantes:** Dani_ + BMAD Party Mode (John PM, Sally UX, Mary Analyst, Quinn QA)
