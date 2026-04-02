# B.12 — Contador de Legendary Actions por Rodada

**Epic:** B — Melhorias Visuais de Combate  
**Prioridade:** Media-Baixa  
**Estimativa:** 5 SP  
**Arquivos principais:** `components/combat/CombatantRow.tsx`, `lib/stores/guest-combat-store.ts`

---

## Resumo

Monstros de D&D com Legendary Actions podem tomar um numero limitado de acoes extras por rodada (tipicamente 3). O DM precisa de um contador visual para rastrear quantas foram usadas, que reseta automaticamente no inicio de cada rodada. Atualmente nenhum rastreamento existe no Pocket DM. O contador deve ser visivel **apenas** para o DM (anti-metagaming — jogadores nao devem saber quantas legendary actions restam).

---

## Contexto

### Regra de D&D 5e

> A Legendary creature can take a certain number of special actions — called legendary actions — outside its turn. Only one legendary action option can be used at a time and only at the end of another creature's turn. Legendary action uses are refreshed at the start of the creature's turn.

Tipicamente: 3 legendary actions por rodada. Alguns monstros (ex: Tiamat) podem ter mais. O numero esta documentado no stat block do monstro.

### Dados SRD

O arquivo `lib/srd/srd-loader.ts` define a interface `SrdMonster` com campo:

```typescript
legendary_actions?: MonsterAction[] | null;
```

Este campo contem o **array de acoes legendarias disponiveis** (ex: "Detect", "Tail Attack", "Wing Attack (Costs 2 Actions)"). O numero de acoes por rodada **nao esta explicitamente no campo** — e tipicamente inferido do texto introdutorio do stat block ou assume-se 3 como padrao.

### Estrategia para obter o limite

1. **Verificar se o JSON SRD inclui um campo `legendary_actions_count`** — a maioria dos datasets do 5e.tools inclui isso. Se sim, usar diretamente.
2. **Fallback:** Parsear o texto introdutorio das legendary actions (geralmente "The [monster] can take 3 legendary actions..."). Regex: `/can take (\d+) legendary action/i`.
3. **Fallback final:** Se nenhuma das acima funcionar, assumir 3 (padrao D&D 5e) e permitir que o DM edite manualmente.

### Estado atual do CombatantRow

O `CombatantRow.tsx` (linha 62+) e um componente `memo` que recebe `CombatantRowProps` incluindo callbacks para dano, cura, condicoes, etc. O componente renderiza paineis expandiveis (HP, conditions, edit, actions) via `openPanel` state.

O componente `MonsterActionBar` (referenciado no import mas comentado como "not yet implemented — CP.1.3") seria o local natural para o contador de LA, mas como ainda nao existe, o contador pode ser adicionado diretamente ao header do `CombatantRow` como UI inline.

---

## Criterios de Aceite

1. Monstros que possuem legendary actions (campo `legendary_actions` nao-nulo e nao-vazio no SRD) mostram um contador na visao do DM (ex: "LA: 2/3").

2. O DM pode clicar para incrementar o uso (cada clique marca +1 acao usada). Alternativa aceita: dots clicaveis (preenchido = usado, vazio = disponivel).

3. O contador reseta automaticamente para 0 usos no inicio de cada rodada (quando `advanceTurn` volta ao combatente ou quando `roundNumber` incrementa).

4. Indicador visual de dots preenchidos/vazios (similar a spell slots) — ex: `[●●○]` para 2 de 3 usadas. Usar circulos pequenos com cor dourada/cinza.

5. O contador e visivel **apenas** para o DM. A visao do Player (`PlayerInitiativeBoard`) NAO deve mostrar este contador em nenhuma circunstancia. O dado NAO deve ser incluido no broadcast para players.

6. **Fonte de dados do limite:**
   - Preferencia 1: Campo do SRD se disponivel
   - Preferencia 2: Parse do texto introdutorio ("can take N legendary actions")
   - Preferencia 3: DM configura manualmente (input editavel)
   - O DM sempre pode sobrescrever o valor auto-detectado

7. Para monstros adicionados manualmente (sem `monster_id`), o DM pode habilitar legendary actions e definir o limite via campo no StatsEditor.

---

## Abordagem Tecnica

### 1. Estender o tipo `Combatant`

Adicionar campos opcionais ao `Combatant` em `lib/types/combat.ts`:

```typescript
export interface Combatant {
  // ... campos existentes ...
  
  /** Total legendary actions available per round. Null = no legendary actions. */
  legendary_actions_total: number | null;
  /** Legendary actions used this round. Resets to 0 at start of creature's turn. */
  legendary_actions_used: number;
}
```

### 2. Auto-deteccao do limite a partir do SRD

Criar funcao em `lib/srd/legendary-actions.ts`:

```typescript
import type { SrdMonster } from "@/lib/srd/srd-loader";

/**
 * Detect the number of legendary actions per round from SRD monster data.
 * Returns null if the monster has no legendary actions.
 */
export function getLegendaryActionCount(monster: SrdMonster): number | null {
  if (!monster.legendary_actions?.length) return null;
  
  // Check if there's a legendary_actions_count field (some SRD datasets include this)
  if ("legendary_actions_count" in monster && typeof (monster as any).legendary_actions_count === "number") {
    return (monster as any).legendary_actions_count;
  }
  
  // Try to parse from the first legendary action entry (often a descriptive text)
  // Format: "The [name] can take 3 legendary actions, choosing from..."
  const firstEntry = monster.legendary_actions[0];
  if (firstEntry?.desc) {
    const match = firstEntry.desc.match(/can take (\d+) legendary action/i);
    if (match) return parseInt(match[1], 10);
  }
  
  // Default: 3 (standard D&D 5e default)
  return 3;
}
```

### 3. Inicializacao ao adicionar monstro

No `addCombatant` / `addMonsterGroup` dos stores (`guest-combat-store.ts` e `encounter-store`), ao adicionar monstro com `monster_id`:

```typescript
// Ao criar combatant a partir de SRD monster:
const laCount = getLegendaryActionCount(srdMonster);
const combatant: Combatant = {
  // ... campos existentes ...
  legendary_actions_total: laCount,
  legendary_actions_used: 0,
};
```

### 4. Reset automatico por rodada

**Guest combat store:** No `advanceTurn`, ao incrementar `roundNumber`, resetar `legendary_actions_used` para 0 em todos os combatentes que possuem `legendary_actions_total`:

```typescript
advanceTurn: () => {
  set((state) => {
    // ... logica existente de avanco de turno ...
    
    // Se a rodada mudou, resetar LA de todos os monstros com legendary actions
    if (newRoundNumber > state.roundNumber) {
      updatedCombatants = updatedCombatants.map((c) =>
        c.legendary_actions_total ? { ...c, legendary_actions_used: 0 } : c
      );
    }
    
    return { /* ... */ };
  });
},
```

**Nota sobre timing:** Pela regra do D&D, as legendary actions resetam no inicio do **turno do monstro**, nao no inicio da rodada. Porem, para simplificar a implementacao inicial, resetar no inicio de cada rodada e aceitavel. Uma melhoria futura pode resetar apenas quando o turno do monstro especifico comeca.

### 5. Componente visual: `LegendaryActionDots`

Criar componente inline (pode ficar dentro de `CombatantRow.tsx` ou extrair para arquivo proprio):

```typescript
function LegendaryActionDots({
  total,
  used,
  onIncrement,
}: {
  total: number;
  used: number;
  onIncrement: () => void;
}) {
  return (
    <div className="flex items-center gap-1" aria-label={`Legendary Actions: ${used}/${total} used`}>
      <span className="text-xs text-muted-foreground font-medium">LA</span>
      <div className="flex gap-0.5">
        {Array.from({ length: total }).map((_, i) => (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              if (i >= used) onIncrement(); // Only allow marking next unused
            }}
            className={`w-2.5 h-2.5 rounded-full border transition-colors ${
              i < used
                ? "bg-gold border-gold/60"      // Used — filled gold
                : "bg-transparent border-zinc-500 hover:border-gold/40"  // Available — empty
            }`}
            aria-label={i < used ? "Used" : "Available"}
          />
        ))}
      </div>
    </div>
  );
}
```

### 6. Integracao no CombatantRow

No header do `CombatantRow`, apos o nome e antes dos botoes de acao, renderizar condicionalmente:

```typescript
{combatant.legendary_actions_total && showActions && (
  <LegendaryActionDots
    total={combatant.legendary_actions_total}
    used={combatant.legendary_actions_used}
    onIncrement={() => onIncrementLegendaryAction?.(combatant.id)}
  />
)}
```

### 7. Novo callback na interface

Adicionar a `CombatantRowProps`:

```typescript
onIncrementLegendaryAction?: (id: string) => void;
```

E a action correspondente no store:

```typescript
incrementLegendaryAction: (id: string) => {
  set((state) => ({
    combatants: state.combatants.map((c) =>
      c.id === id && c.legendary_actions_total && c.legendary_actions_used < c.legendary_actions_total
        ? { ...c, legendary_actions_used: c.legendary_actions_used + 1 }
        : c
    ),
  }));
},
```

### 8. Anti-metagaming: excluir do broadcast

Na funcao `sanitizeCombatantsForPlayer()` em `lib/utils/sanitize-combatants.ts`, garantir que os campos `legendary_actions_total` e `legendary_actions_used` sao removidos para monstros:

```typescript
// Na destructuring de monstros:
const { legendary_actions_total: _la, legendary_actions_used: _lau, ...rest } = c;
```

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `lib/types/combat.ts` | Adicionar `legendary_actions_total` e `legendary_actions_used` ao `Combatant` |
| `lib/srd/legendary-actions.ts` (novo) | Funcao `getLegendaryActionCount()` para detectar o limite do SRD |
| `components/combat/CombatantRow.tsx` | Renderizar `LegendaryActionDots` quando monstro tem LA, adicionar prop `onIncrementLegendaryAction` |
| `lib/stores/guest-combat-store.ts` | Adicionar action `incrementLegendaryAction`, reset de LA no `advanceTurn` |
| `lib/stores/encounter-store.ts` | Mesma logica do guest store para combate logado (se existir) |
| `lib/utils/sanitize-combatants.ts` | Remover campos `legendary_actions_*` da resposta sanitizada para players |
| `components/combat/StatsEditor.tsx` | (Opcional) Adicionar campo editavel para DM sobrescrever o limite de LA |
| `components/combat/MonsterSearchPanel.tsx` ou `AddCombatantForm.tsx` | Inicializar `legendary_actions_total` ao adicionar monstro do SRD |

---

## Plano de Testes

### Testes Manuais (obrigatorios)

1. **Monstro com LA do SRD**
   - [ ] Adicionar monstro que tem legendary actions (ex: Adult Red Dragon) ao combate
   - [ ] Verificar que dots aparecem (ex: 3 circulos vazios)
   - [ ] Verificar que o limite foi auto-detectado corretamente

2. **Incremento de uso**
   - [ ] Clicar em um dot — verificar que preenche (1/3)
   - [ ] Clicar novamente — verificar que preenche o proximo (2/3)
   - [ ] Clicar no terceiro — verificar (3/3)
   - [ ] Tentar clicar alem do limite — nao deve fazer nada

3. **Reset por rodada**
   - [ ] Usar 2/3 LA, avancar turno ate completar a rodada
   - [ ] Verificar que o contador resetou para 0/3

4. **Monstro sem LA**
   - [ ] Adicionar monstro sem legendary actions (ex: Goblin)
   - [ ] Verificar que nenhum contador aparece

5. **Anti-metagaming — player view**
   - [ ] Como player, verificar que o contador de LA NAO aparece para nenhum monstro
   - [ ] Inspecionar dados recebidos via broadcast — confirmar que `legendary_actions_*` nao esta presente

6. **Manual override**
   - [ ] Adicionar combatente manual, ir ao StatsEditor
   - [ ] Definir LA = 2, verificar que dots aparecem
   - [ ] Alterar para LA = 5, verificar que dots atualizam

7. **Monstro agrupado**
   - [ ] Adicionar grupo de 3 monstros com LA (ex: 3 Adult Red Dragons)
   - [ ] Verificar que cada membro do grupo tem seu proprio contador independente

### Testes Unitarios (recomendados)

- `getLegendaryActionCount()`: monstro com LA retorna numero correto, monstro sem LA retorna null
- `incrementLegendaryAction`: incrementa ate o limite, nao passa do limite
- Reset no `advanceTurn`: todos os monstros com LA voltam para 0 apos nova rodada
- `sanitizeCombatantsForPlayer`: campos `legendary_actions_*` removidos

---

## Notas de Paridade

- **DM-only feature:** Este contador e exclusivo da visao do DM. A visao do Player **nunca** deve mostrar informacoes sobre legendary actions restantes.
- **Guest Combat (DM offline):** Funcionalidade completa via `guest-combat-store`.
- **DM Combat (logado):** Funcionalidade via `encounter-store` (requer mesma logica de increment + reset).
- **Broadcast:** Os campos `legendary_actions_total` e `legendary_actions_used` devem ser **excluidos** da sanitizacao em `sanitizeCombatantsForPlayer()`. O DM nao envia esse dado para players.

---

## Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| Campo `legendary_actions_count` pode nao existir no JSON SRD usado pelo projeto | Implementar os 3 fallbacks em cascata: campo direto → parse de texto → default 3 + DM override |
| Reset por rodada vs por turno do monstro (regra RAW) | Implementar reset por rodada primeiro (simples). Documentar como melhoria futura o reset por turno especifico. DMs avancados podem resetar manualmente se necessario. |
| Adicionar campos ao `Combatant` pode quebrar persistencia (Zustand persist) | Usar valores default (`null` / `0`) para campos novos. O `persist` do Zustand faz merge automatico com novos campos. |
| Dots muito pequenos em telas mobile | Usar `w-3 h-3` em mobile com media query, ou touch target minimo de 44x44px via padding. |

---

## Definicao de Pronto

- [ ] Monstros com LA mostram contador visual (dots) na DM view
- [ ] Clique incrementa uso corretamente
- [ ] Reset automatico ao iniciar nova rodada
- [ ] Auto-deteccao do limite a partir do SRD
- [ ] DM pode sobrescrever o limite manualmente
- [ ] Player view nao mostra nenhuma informacao de LA
- [ ] Campos removidos do `sanitizeCombatantsForPlayer()`
- [ ] Testes manuais 1-7 passando
- [ ] Nenhuma regressao no CombatantRow ou no avanco de turno
