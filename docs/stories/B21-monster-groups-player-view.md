# B.21 — Monster Groups na Visao do Player

**Epic:** B — Melhorias Visuais de Combate  
**Prioridade:** Alta  
**Estimativa:** 8 SP  
**Arquivos principais:** `components/player/PlayerInitiativeBoard.tsx`, `lib/utils/sanitize-combatants.ts`, `lib/realtime/broadcast.ts`

---

## Resumo

Na visao do DM (Guest combat), monstros sao agrupados via `MonsterGroupHeader` — colapsavel, com stats agregados do grupo e membros individuais expandiveis. Na visao do Player (`PlayerInitiativeBoard`), **todos** os combatentes aparecem em lista plana sem nenhum conceito de agrupamento. Esta lacuna de paridade foi identificada na revisao de arquitetura.

Players devem ver grupos de monstros como o DM pretendeu: headers colapsados com informacao agregada, expandiveis para ver membros individuais. Regras de anti-metagaming continuam aplicaveis (labels de status de HP, nunca HP exato).

---

## Contexto

### Estado atual — DM view

O `GuestCombatClient` e o `EncounterSetup` (DM logado) agrupam monstros por `monster_group_id`. O componente `MonsterGroupHeader` (em `components/combat/MonsterGroupHeader.tsx`) recebe:

```typescript
interface MonsterGroupHeaderProps {
  groupName: string;
  members: Combatant[];
  isExpanded: boolean;
  onToggle: () => void;
  groupInitiative: number | null;
  onSetGroupInitiative?: (value: number) => void;
  isCurrentTurn?: boolean;
  children: React.ReactNode; // Member rows expandidos
}
```

O header mostra:
- Nome do grupo (ex: "Goblin") com icone de chevron expand/collapse
- Contagem: "3/4 ativos" (activeMembers / totalMembers)
- Barra de HP agregada (soma dos HPs de todos os membros ativos)
- Resumo de condicoes (contagem por tipo)
- Iniciativa do grupo (editavel pelo DM)

O estado de expand/collapse e gerenciado via `expandedGroups: Record<string, boolean>` na store.

### Estado atual — Player view

O `PlayerInitiativeBoard` recebe um array plano de `PlayerCombatant[]`:

```typescript
interface PlayerCombatant {
  id: string;
  name: string;
  current_hp?: number;  // Apenas para is_player=true
  max_hp?: number;      // Apenas para is_player=true
  initiative_order: number | null;
  conditions: string[];
  is_defeated: boolean;
  is_player: boolean;
  monster_id: string | null;
  hp_status?: string;   // LIGHT/MODERATE/HEAVY/CRITICAL (para monstros)
  // ...
}
```

**Campos ausentes:** `monster_group_id` e `group_order` nao sao enviados na sanitizacao atual.

### Sanitizacao atual (`sanitize-combatants.ts`)

A funcao `sanitizeCombatantsForPlayer()` filtra combatentes hidden e, para monstros, remove `current_hp`, `max_hp`, `temp_hp`, `ac`, e aplica `display_name`. Os campos `monster_group_id` e `group_order` **nao sao explicitamente removidos** — mas tambem nao estao na interface `RawCombatantRow` de entrada, entao nao passam para a saida.

### Broadcast

O `broadcast.ts` usa `sanitizeCombatantsForPlayer()` para eventos `session:state_sync` e `combat:combatant_add`. Eventos individuais como `combat:hp_update` nao incluem grouping info — sao por combatente.

---

## Criterios de Aceite

1. A visao do Player mostra grupos de monstros com um header colapsado (similar a visao do DM).

2. O header do grupo mostra: nome do grupo, contagem de membros (ex: "Goblin (3)"), status de HP agregado do grupo (tier baseado na soma dos HPs dos membros).

3. Players podem expandir grupos para ver membros individuais.

4. Membros individuais mostram: nome, tier de status de HP (LIGHT/MODERATE/HEAVY/CRITICAL — nunca HP exato), condicoes ativas.

5. Anti-metagaming preservado: nenhum HP exato, nenhum AC, nenhum `spell_save_dc` para monstros. O tier agregado do grupo e derivado dos tiers individuais (nao de HP numerico).

6. Progressive reveal continua funcionando: monstros marcados como `is_hidden` nao aparecem (nem no header do grupo — se todos os membros estao hidden, o grupo inteiro nao aparece).

7. Indicador de turno atual funciona corretamente para monstros agrupados — se qualquer membro do grupo esta no turno atual, o header do grupo recebe destaque visual.

---

## Abordagem Tecnica

### 1. Incluir `monster_group_id` e `group_order` na sanitizacao

Estes campos nao revelam informacao sensivel (nao sao HP, AC ou stats). Adicionar a `RawCombatantRow` e incluir na saida sanitizada:

**`lib/utils/sanitize-combatants.ts`:**

```typescript
export interface RawCombatantRow {
  // ... campos existentes ...
  monster_group_id: string | null;
  group_order: number | null;
}

export function sanitizeCombatantsForPlayer(combatants: RawCombatantRow[]) {
  return combatants
    .filter((c) => !c.is_hidden)
    .map((c) => {
      if (c.is_player) {
        const { display_name: _dn, is_hidden: _h, ...rest } = c;
        return rest;
      }
      const { current_hp, max_hp, temp_hp: _tp, ac: _ac, display_name, is_hidden: _h, ...rest } = c;
      return {
        ...rest,
        name: display_name || rest.name,
        hp_status: getHpStatus(current_hp, max_hp),
        // monster_group_id e group_order passam via ...rest
      };
    });
}
```

### 2. Atualizar interface `PlayerCombatant`

Em `PlayerInitiativeBoard.tsx`, adicionar:

```typescript
interface PlayerCombatant {
  // ... campos existentes ...
  monster_group_id?: string | null;
  group_order?: number | null;
}
```

### 3. Logica de agrupamento no Player view

Criar funcao utilitaria para agrupar combatentes no lado do cliente:

```typescript
interface PlayerMonsterGroup {
  groupId: string;
  groupName: string;
  members: PlayerCombatant[];
  /** Aggregate HP status based on worst tier among active members */
  aggregateHpStatus: string;
  /** Initiative order of the first member */
  groupInitiative: number | null;
  /** Whether any member is the current turn */
  hasCurrentTurn: boolean;
}

function groupCombatantsForPlayer(
  combatants: PlayerCombatant[],
  currentTurnIndex: number
): (PlayerCombatant | PlayerMonsterGroup)[] {
  const result: (PlayerCombatant | PlayerMonsterGroup)[] = [];
  const groupMap = new Map<string, PlayerCombatant[]>();
  const groupFirstIndex = new Map<string, number>();
  
  // Separate grouped and ungrouped combatants while preserving initiative order
  combatants.forEach((c, idx) => {
    if (c.monster_group_id) {
      if (!groupMap.has(c.monster_group_id)) {
        groupMap.set(c.monster_group_id, []);
        groupFirstIndex.set(c.monster_group_id, idx);
      }
      groupMap.get(c.monster_group_id)!.push(c);
    }
  });
  
  // Build ordered result
  const processedGroups = new Set<string>();
  combatants.forEach((c, idx) => {
    if (c.monster_group_id) {
      if (!processedGroups.has(c.monster_group_id)) {
        processedGroups.add(c.monster_group_id);
        const members = groupMap.get(c.monster_group_id)!;
        // Sort members by group_order within group
        members.sort((a, b) => (a.group_order ?? 0) - (b.group_order ?? 0));
        
        result.push({
          groupId: c.monster_group_id,
          groupName: extractGroupName(members),
          members,
          aggregateHpStatus: computeAggregateHpStatus(members),
          groupInitiative: members[0]?.initiative_order ?? null,
          hasCurrentTurn: members.some((m) => 
            combatants.indexOf(m) === currentTurnIndex
          ),
        });
      }
    } else {
      result.push(c);
    }
  });
  
  return result;
}
```

### 4. Derivar nome do grupo

O campo `display_name` ja substitui o nome real via anti-metagaming. O nome do grupo e o nome base compartilhado (sem numero/sufixo):

```typescript
function extractGroupName(members: PlayerCombatant[]): string {
  // Group members share the base name: "Goblin 1", "Goblin 2" → "Goblin"
  // Try to extract the common prefix
  if (members.length === 0) return "";
  const firstName = members[0].name;
  // Remove trailing number/letter suffix pattern: "Goblin 1" → "Goblin", "Goblin A" → "Goblin"
  const baseName = firstName.replace(/\s+[\dA-Z]+$/i, "").trim();
  return baseName || firstName;
}
```

### 5. Status de HP agregado do grupo (sem revelar HP numerico)

Os players nao recebem HP numerico dos monstros — apenas `hp_status` (LIGHT/MODERATE/HEAVY/CRITICAL). O status agregado do grupo deve ser derivado dos tiers individuais:

```typescript
const HP_TIER_SEVERITY: Record<string, number> = {
  LIGHT: 0,
  MODERATE: 1,
  HEAVY: 2,
  CRITICAL: 3,
};

function computeAggregateHpStatus(members: PlayerCombatant[]): string {
  const activeMembers = members.filter((m) => !m.is_defeated);
  if (activeMembers.length === 0) return "CRITICAL";
  
  // Aggregate = average tier severity (rounded to nearest tier)
  const avgSeverity = activeMembers.reduce(
    (sum, m) => sum + (HP_TIER_SEVERITY[m.hp_status ?? "LIGHT"] ?? 0),
    0
  ) / activeMembers.length;
  
  if (avgSeverity >= 2.5) return "CRITICAL";
  if (avgSeverity >= 1.5) return "HEAVY";
  if (avgSeverity >= 0.5) return "MODERATE";
  return "LIGHT";
}
```

### 6. Componente PlayerMonsterGroupHeader

Criar componente reutilizavel inspirado no `MonsterGroupHeader` do DM, mas sem funcionalidades de edicao:

```typescript
function PlayerMonsterGroupHeader({
  group,
  isExpanded,
  onToggle,
}: {
  group: PlayerMonsterGroup;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const activeCount = group.members.filter((m) => !m.is_defeated).length;
  
  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 bg-card border rounded-md cursor-pointer
        ${group.hasCurrentTurn ? "border-gold ring-1 ring-gold/30" : "border-border"}`}
      onClick={onToggle}
      role="button"
      aria-expanded={isExpanded}
    >
      {isExpanded ? <ChevronDown /> : <ChevronRight />}
      <span className="font-medium">{group.groupName}</span>
      <span className="text-muted-foreground text-sm">({activeCount}/{group.members.length})</span>
      <HpStatusBadge status={group.aggregateHpStatus} />
    </div>
  );
}
```

### 7. Estado de expand/collapse no Player view

Gerenciar localmente com `useState`:

```typescript
const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

const toggleGroup = (groupId: string) => {
  setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
};
```

Default: grupos colapsados (consistente com a DM view).

### 8. Renderizacao na lista de iniciativa

```typescript
{groupedCombatants.map((item) => {
  if ("groupId" in item) {
    // Monster group
    const group = item as PlayerMonsterGroup;
    return (
      <div key={group.groupId}>
        <PlayerMonsterGroupHeader
          group={group}
          isExpanded={expandedGroups[group.groupId] ?? false}
          onToggle={() => toggleGroup(group.groupId)}
        />
        <AnimatePresence>
          {expandedGroups[group.groupId] && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="ml-4 border-l-2 border-border/50 pl-2 space-y-1"
            >
              {group.members.map((member) => (
                <PlayerCombatantCard key={member.id} combatant={member} /* ... */ />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
  // Regular combatant (player, NPC, ungrouped)
  return <PlayerCombatantCard key={item.id} combatant={item} /* ... */ />;
})}
```

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `lib/utils/sanitize-combatants.ts` | Adicionar `monster_group_id` e `group_order` a `RawCombatantRow`; garantir que passam para a saida sanitizada |
| `lib/utils/sanitize-combatants.test.ts` | Atualizar testes para validar presenca de `monster_group_id` e `group_order` na saida |
| `components/player/PlayerInitiativeBoard.tsx` | Adicionar `monster_group_id`/`group_order` a `PlayerCombatant`; implementar logica de agrupamento; criar `PlayerMonsterGroupHeader`; renderizar grupos expand/collapse |
| `components/player/PlayerJoinClient.tsx` | Garantir que os novos campos sao passados do state para o `PlayerInitiativeBoard` |
| `lib/realtime/broadcast.ts` | Verificar que `session:state_sync` e `combat:combatant_add` incluem `monster_group_id` e `group_order` nos dados sanitizados (deve funcionar automaticamente se `sanitizeCombatantsForPlayer` os inclui) |
| `app/api/sessions/[id]/state/route.ts` (ou equivalente) | Garantir que o endpoint de estado inclui `monster_group_id` e `group_order` na query ao banco |

---

## Plano de Testes

### Testes Manuais (obrigatorios)

1. **Grupo colapsado — visualizacao basica**
   - [ ] DM adiciona grupo de 3 Goblins, inicia combate com player conectado
   - [ ] Player ve header "Goblin (3)" colapsado com status de HP agregado
   - [ ] Player clica para expandir — ve os 3 membros individuais

2. **Status de HP agregado**
   - [ ] DM da dano no Goblin 1 ate HEAVY, Goblin 2 e 3 permanecem LIGHT
   - [ ] Player ve status agregado do grupo como MODERATE (media dos tiers)
   - [ ] DM derrota Goblin 1 — contagem muda para "Goblin (2/3)"

3. **Anti-metagaming**
   - [ ] Player expande grupo — cada membro mostra nome + tier de HP, NAO HP numerico
   - [ ] Inspecionar dados no DevTools — nenhum `current_hp`, `max_hp`, `ac` presente para monstros

4. **Turno atual em grupo**
   - [ ] Turno chega no Goblin 2 — header do grupo mostra destaque dourado
   - [ ] Player expande grupo — Goblin 2 tem indicador de turno, outros nao

5. **Progressive reveal (hidden)**
   - [ ] DM esconde 2 de 3 Goblins — Player ve "Goblin (1)" (apenas o visivel)
   - [ ] DM revela mais 1 — Player ve "Goblin (2)" sem refresh

6. **Combatentes nao-agrupados**
   - [ ] Players e NPCs manuais continuam aparecendo na lista plana normalmente
   - [ ] Monstro individual (sem grupo) aparece na lista plana

7. **Multiplos grupos**
   - [ ] DM adiciona grupo de 3 Goblins + grupo de 2 Orcs
   - [ ] Player ve 2 headers de grupo distintos na lista de iniciativa

8. **Expand/collapse persiste durante combate**
   - [ ] Player expande grupo, DM avanca varios turnos
   - [ ] Grupo permanece expandido (estado local preservado)

9. **Grupo totalmente derrotado**
   - [ ] DM derrota todos os membros de um grupo
   - [ ] Header mostra "(0/3)" com styling de derrotado (opacity reduzida)

### Testes Unitarios (recomendados)

- `groupCombatantsForPlayer()`: dado array misto, retorna grupos e individuais na ordem correta
- `extractGroupName()`: "Goblin 1" → "Goblin", "Ancient Red Dragon" → "Ancient Red Dragon" (sem sufixo numerico)
- `computeAggregateHpStatus()`: testa todos os cenarios de media de tiers
- `sanitizeCombatantsForPlayer()`: valida que `monster_group_id` e `group_order` estao presentes na saida

### Teste de Integracao (recomendado)

- E2E: DM cria grupo de monstros → Player ve grupo colapsado → Expande → Ve membros individuais com tiers corretos

---

## Notas de Paridade

- **Guest Combat (DM offline):** Ja tem agrupamento completo via `MonsterGroupHeader`. Nenhuma mudanca necessaria no Guest.
- **DM Combat (logado):** Ja tem agrupamento via `MonsterGroupHeader`. Nenhuma mudanca necessaria no DM logado.
- **Player Combat (realtime):** Esta e a unica view que precisa de mudanca. O objetivo e atingir paridade visual com a DM view, respeitando as restricoes de anti-metagaming.
- **MonsterGroupHeader reutilizacao:** O componente existente do DM usa props especificos do DM (edicao de iniciativa, dados de HP numerico). A versao do Player sera um componente **separado** (`PlayerMonsterGroupHeader`) que usa apenas dados sanitizados. Reutilizar o componente do DM exigiria condicionalizar muita logica internamente, o que prejudicaria a manutencao.

---

## Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|-----------|
| `monster_group_id` pode nao estar sendo persistido no banco (campo pode ser apenas client-side) | Verificar a tabela `combatants` no Supabase. Se nao existir a coluna, adicionar migration. Se for client-side only, o grouping para logged DM nao funciona — escopo separado. |
| Agrupamento client-side por nome pode gerar falsos positivos (2 monstros diferentes com mesmo nome) | Usar `monster_group_id` como criterio primario. Fallback por nome **nao** e recomendado — melhor mostrar lista plana do que agrupar incorretamente. |
| Performance de re-render ao expandir grupo grande | Memoizar o `groupCombatantsForPlayer()` com `useMemo` e o `PlayerMonsterGroupHeader` com `memo()`. Grupos raramente excedem 10 membros. |
| Mudanca no broadcast pode quebrar players em versoes antigas do frontend | Os campos `monster_group_id`/`group_order` sao **adicionais** (nao substituem campos existentes). Players com frontend antigo simplesmente ignoram os campos e continuam vendo lista plana. Backward-compatible. |
| Status agregado pode ser confuso para players (ex: grupo "MODERATE" quando 1 monstro esta CRITICAL e 2 estao LIGHT) | Documentar na HpLegendOverlay que o status do grupo e uma media. Alternativa: mostrar o **pior** tier do grupo em vez de media (mais conservador). |

---

## Decisao de Design: Status Agregado

**DECISAO FINAL (2026-04-02):** Mostrar AMBOS — worst-case como badge principal + average como label secundario.

**Implementacao atual (`PlayerInitiativeBoard.tsx:724-729`):** usa worst-case (tier mais alto entre membros ativos). **Correto e aprovado.**

**Display a adicionar:** label de media como texto secundario no header do grupo:

```
[CRITICAL] Goblin (2/3)   ← badge = pior tier
avg: MODERATE             ← label = media dos ativos
```

**Racional:**
- Worst-case como badge: evita falsa seguranca (se 1 membro esta CRITICAL, o DM e players precisam saber)
- Average como label: contexto do estado geral do grupo — 1 CRITICAL + 2 LIGHT = avg MODERATE

**Default de grupos: COLAPSADOS** — mantido como esta. Consistente com DM view, evita poluicao visual em combates com muitos grupos.

---

## Status de Implementacao (2026-04-02)

**IMPLEMENTADO** — `PlayerInitiativeBoard.tsx` ja tem:
- `expandedPlayerGroups` state com expand/collapse
- `groupMap` computed por `monster_group_id`
- Group header: nome, contagem ativa/total, badge worst-case HP, turn highlight
- `sanitize-combatants.ts`: `monster_group_id` + `group_order` ja passam via `...rest`

**Pendente (delta vs spec):**
- [ ] Adicionar label de average HP status ao lado do badge worst-case no header do grupo
- [ ] Testes unitarios para logica de agrupamento (`computeAggregateHpStatus`, `extractGroupName`)

---

## Definicao de Pronto

- [x] `monster_group_id` e `group_order` incluidos na sanitizacao para players
- [x] `PlayerInitiativeBoard` renderiza grupos colapsaveis (colapsado por default)
- [x] Header mostra nome, contagem e status worst-case de HP
- [x] Expand revela membros individuais com tier de HP e condicoes
- [x] Anti-metagaming preservado (sem HP numerico, AC, spell DC)
- [x] Indicador de turno atual funciona para monstros agrupados (border-gold)
- [x] Lista plana preservada para combatentes nao-agrupados
- [x] Backward-compatible (players com frontend antigo veem lista plana)
- [ ] **DELTA:** Header do grupo exibe AMBOS: badge worst-case + label average HP status
- [ ] Testes unitarios para logica de agrupamento
- [ ] Testes manuais 1-9 passando (QA sign-off)
