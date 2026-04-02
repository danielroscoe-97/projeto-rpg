# A.7 — Group Rename Durante Fase de Combate

**Epic:** A — Estabilidade do Combate  
**Prioridade:** Alta  
**Estimativa:** 3 SP  
**Arquivo principal:** `components/guest/GuestCombatClient.tsx`

---

## Resumo

A logica de rename de grupo (`handleDisplayNameChange` com propagacao para todos os membros) existe APENAS na fase de setup (`GuestEncounterSetup`). Durante combate ativo, o handler utilizado e `handleUpdateStats` (linhas 1062-1066), cuja type signature nao inclui `display_name`. Isso faz com que renames de grupo falhem silenciosamente durante combate — o usuario edita o display_name no StatsEditor, salva, mas a propagacao para os demais membros do grupo nao acontece.

Bug reportado durante sessao de beta test ao vivo — DM renomeou uma criatura agrupada e o rename nao propagou para o grupo.

---

## Contexto

### O que funciona (fase de setup)

Na fase de setup, `handleDisplayNameChange` (linhas 346-380 do `GuestCombatClient.tsx`) recebe `(id, displayName)` e executa a seguinte logica:

1. Encontra o combatente pelo ID
2. Se pertence a um grupo (`monster_group_id`), identifica todos os membros
3. Detecta intencao: se o trailing number no novo nome corresponde ao `group_order` do combatente, e um rename de grupo
4. Se for rename de grupo, extrai a base do nome e reaplica `"${newBase} ${idx + 1}"` em todos os membros
5. Se nao for rename de grupo, salva apenas no combatente individual

### O que falha (fase de combate)

Na fase de combate, o `CombatantRow` usa `onUpdateStats` que aponta para `handleUpdateStats` (linhas 1062-1066):

```typescript
const handleUpdateStats = useCallback(
  (id: string, stats: { name?: string; max_hp?: number; ac?: number; spell_save_dc?: number | null }) =>
    updateCombatantStats(id, stats),
  [updateCombatantStats]
);
```

A type signature **nao inclui `display_name`**. Porem, o `StatsEditor` (linha 11 do `StatsEditor.tsx`) envia `display_name` no objeto `stats` quando o usuario edita o campo. O TypeScript nao reclama porque o `CombatantRow.tsx` (linha 40) ja define a prop com `display_name` na type signature:

```typescript
onUpdateStats?: (id: string, stats: { name?: string; display_name?: string | null; max_hp?: number; ac?: number; spell_save_dc?: number | null }) => void;
```

Mas o handler concreto no `GuestCombatClient` ignora o `display_name` — o TypeScript permite porque a funcao passada e uma versao mais restritiva do tipo esperado. O `updateCombatantStats` do store aceita `display_name`, entao a atualizacao individual funciona acidentalmente. **O que nao funciona e a propagacao para o grupo**, porque a logica de detecao de grupo rename nunca e executada durante combate.

### Bugs adicionais encontrados na auditoria

| # | Bug | Local | Impacto |
|---|-----|-------|---------|
| B1 | Inconsistencia de `group_order` entre setup e mid-combat | Setup (linha 184): `for (let i = 1; ...)` com `group_order: i`. EncounterSetup (linha 274-296): `for (let i = 1; ...)` com `group_order: i`. Ambos 1-indexed. Porem a logica de rename (linha 360) compara trailing number com `combatant.group_order ?? 0`. Se `group_order` for `null` (combatente manual adicionado a um grupo), o fallback `0` nunca bate com nenhum trailing number >= 1, impedindo rename de grupo. | Medio |
| B2 | `hydrateCombatants` substitui array inteiro (nao atomico) | Linhas 311, 329, 370 | Se um HP update concorrente (ex: jogador toma dano) chegar entre o `getState()` e o `hydrateCombatants()`, o array inteiro e sobrescrito com o snapshot antigo, revertendo o HP update. Race condition em cenarios de rede lenta. |
| B3 | Regex `/\s+(\d+)$/` pode ter false positive | Linha 358 | Nomes como "Zombie 13" tem trailing number 13. Se `group_order` for 13, a logica de rename de grupo e ativada inadvertidamente. Improvavel com grupos pequenos, mas possivel com nomes importados que ja contem numeros. |

---

## Criterios de Aceite

1. `handleUpdateStats` na fase de combate aceita e processa `display_name` corretamente.
2. Logica de propagacao de rename de grupo funciona em AMBAS as fases (setup e combate).
3. Rename via modal StatsEditor durante combate propaga para todos os membros do grupo.
4. `group_order` normalizado para sempre 1-indexed em todos os fluxos: setup (Guest + Session), mid-combat add, e duplicate.
5. Protecao contra race condition: usar functional state update (`set((state) => ...)`) em vez de `hydrateCombatants` com full replace quando o rename de grupo acontece.
6. Edge case tratado: nomes de monstros que ja contem trailing numbers ("Zombie 13") nao disparam false positive na deteccao de group rename.

---

## Abordagem Tecnica

### 1. Extrair logica de group rename para funcao reutilizavel

Criar uma funcao pura `applyGroupRename` em `lib/utils/group-rename.ts`:

```typescript
interface GroupRenameResult {
  type: "group_rename";
  updates: Map<string, { display_name: string }>;
} | {
  type: "individual_rename";
  id: string;
  display_name: string;
}

function applyGroupRename(
  combatants: Combatant[],
  targetId: string,
  newDisplayName: string
): GroupRenameResult {
  const combatant = combatants.find((c) => c.id === targetId);
  if (!combatant?.monster_group_id) {
    return { type: "individual_rename", id: targetId, display_name: newDisplayName };
  }

  const groupMembers = combatants
    .filter((c) => c.monster_group_id === combatant.monster_group_id)
    .sort((a, b) => (a.group_order ?? 0) - (b.group_order ?? 0));

  // Deteccao de intencao melhorada:
  // 1. Extrair trailing number
  // 2. Verificar se bate com a POSICAO do combatente no grupo (nao group_order raw)
  const trailingMatch = newDisplayName.match(/\s+(\d+)$/);
  const memberIndex = groupMembers.findIndex((m) => m.id === targetId);
  const expectedNumber = memberIndex + 1; // sempre 1-indexed baseado na posicao
  
  const isGroupRename = trailingMatch
    ? Number(trailingMatch[1]) === expectedNumber
    : false;

  if (isGroupRename) {
    const newBase = newDisplayName.replace(/\s+\d+$/, "");
    const updates = new Map<string, { display_name: string }>();
    groupMembers.forEach((m, idx) => {
      updates.set(m.id, { display_name: `${newBase} ${idx + 1}` });
    });
    return { type: "group_rename", updates };
  }

  return { type: "individual_rename", id: targetId, display_name: newDisplayName };
}
```

### 2. Corrigir `handleUpdateStats` no GuestCombatClient

Adicionar `display_name` na type signature e integrar a logica de group rename:

```typescript
const handleUpdateStats = useCallback(
  (id: string, stats: { name?: string; display_name?: string | null; max_hp?: number; ac?: number; spell_save_dc?: number | null }) => {
    if (stats.display_name !== undefined) {
      const result = applyGroupRename(
        useGuestCombatStore.getState().combatants,
        id,
        stats.display_name ?? ""
      );
      if (result.type === "group_rename") {
        // Functional update para evitar race condition
        useGuestCombatStore.setState((state) => ({
          combatants: state.combatants.map((c) => {
            const update = result.updates.get(c.id);
            return update ? { ...c, ...update } : c;
          }),
        }));
      } else {
        updateCombatantStats(id, { display_name: stats.display_name });
      }
      // Processar demais stats (name, max_hp, ac, spell_save_dc) separadamente
      const { display_name, ...restStats } = stats;
      if (Object.keys(restStats).length > 0) {
        updateCombatantStats(id, restStats);
      }
    } else {
      updateCombatantStats(id, stats);
    }
  },
  [updateCombatantStats]
);
```

### 3. Refatorar `handleDisplayNameChange` no setup

Substituir a implementacao inline pela mesma funcao `applyGroupRename`, eliminando duplicacao de logica.

### 4. Normalizar `group_order`

Auditar todos os pontos que atribuem `group_order` e garantir 1-indexed consistente:

| Local | Atual | Correcao |
|-------|-------|----------|
| `GuestCombatClient.tsx` linha 184-206 | `i` (loop `i=1..qty`) = 1-indexed | OK, ja correto |
| `GuestCombatClient.tsx` linha 910-919 (mid-combat) | `i + 1` (loop `i=0..qty-1`) = 1-indexed | OK, ja correto |
| `EncounterSetup.tsx` linha 274-296 | `i` (loop `i=1..qty`) = 1-indexed | OK, ja correto |
| `GuestCombatClient.tsx` `handleDuplicate` linha 392 | `groupMembers.length + 1` | OK, ja correto |
| Deteccao de rename (linha 360) | Compara com `group_order ?? 0` | CORRIGIR: usar posicao no array, nao `group_order` raw |

### 5. Proteger contra false positive na regex

Mudar a deteccao de intencao para comparar com a posicao do combatente no grupo (index-based) em vez de `group_order` raw. Isso evita o problema de nomes com trailing numbers que coincidem com `group_order` alto.

### 6. Functional state update em vez de `hydrateCombatants`

Substituir:
```typescript
store.hydrateCombatants(updated); // snapshot inteiro — race condition
```

Por:
```typescript
useGuestCombatStore.setState((state) => ({
  combatants: state.combatants.map((c) => {
    const update = updates.get(c.id);
    return update ? { ...c, ...update } : c;
  }),
}));
```

Isso garante que apenas os campos de `display_name` sejam alterados, preservando qualquer HP update concorrente.

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `lib/utils/group-rename.ts` (novo) | Funcao pura `applyGroupRename` com logica de deteccao de intencao e propagacao |
| `components/guest/GuestCombatClient.tsx` | Refatorar `handleUpdateStats` (linhas 1062-1066) para aceitar `display_name` e usar `applyGroupRename`. Refatorar `handleDisplayNameChange` (linhas 346-380) para usar a mesma funcao. Substituir `hydrateCombatants` por functional state update nos renames de grupo. |
| `components/combat/EncounterSetup.tsx` | Refatorar `handleDisplayNameChange` (linhas 513-547) para usar `applyGroupRename` |
| `lib/utils/__tests__/group-rename.test.ts` (novo) | Testes unitarios da funcao `applyGroupRename` |

---

## Plano de Testes

### Testes Unitarios (`group-rename.test.ts`)

1. **Rename individual (sem grupo)** — Combatente sem `monster_group_id` retorna `individual_rename`.
2. **Rename de grupo (trailing number bate)** — "Dragao Vermelho 2" no membro 2 de 3 retorna `group_rename` com 3 updates.
3. **Rename individual (trailing number nao bate)** — "Dragao Vermelho 5" no membro 2 retorna `individual_rename`.
4. **Edge case: nome com trailing number pre-existente** — "Zombie 13 2" no membro 2 detecta corretamente como group rename (trailing "2" bate com posicao 2).
5. **Edge case: nome original com numero** — "Zombie 13" renomeado para "Zombie 13" no membro 13 NAO dispara group rename (posicao no array != 13, a menos que tenha 13+ membros).
6. **Edge case: `display_name` null** — Retorna `individual_rename` com string vazia.
7. **Edge case: grupo com membro removido** — Grupo tinha 3, agora tem 2. Rename funciona corretamente baseado em posicao (1, 2), nao em `group_order` original.

### Teste Manual (QA)

1. **Setup: rename de grupo** — Adicionar grupo de 3 goblins. Renomear "Sombra 1" para "Fantasma 1". Todos viram "Fantasma 1", "Fantasma 2", "Fantasma 3".
2. **Combate: rename de grupo via StatsEditor** — Iniciar combate. Abrir StatsEditor de um membro do grupo. Alterar display_name de "Sombra 2" para "Espectro 2". Fechar. Todos os membros devem mostrar "Espectro 1", "Espectro 2", "Espectro 3".
3. **Combate: rename individual via StatsEditor** — Alterar display_name de "Sombra 2" para "Chefao". Apenas aquele membro muda. Os demais permanecem "Sombra 1" e "Sombra 3".
4. **Race condition: rename + dano simultaneo** — Abrir StatsEditor em membro 1. Em outra aba, aplicar dano ao membro 2. Salvar rename. HP do membro 2 deve estar correto (nao revertido).
5. **Mid-combat add: grupo novo** — Durante combate, adicionar grupo de 2 monstros. Verificar que `group_order` e 1-indexed. Renomear o grupo via StatsEditor — deve propagar.
6. **Nome com numero: "Zombie 13"** — Adicionar monstro cujo nome base ja contem numero. Agrupar. Renomear. Verificar que nao ha false positive na deteccao de grupo.
7. **Paridade DM flow:** Repetir testes 1-3 usando fluxo de sessao logada (`CombatSessionClient` + `EncounterSetup`).

### Teste de Paridade Player View

8. **Broadcast para players** — Iniciar sessao com player conectado. DM renomeia grupo durante combate. Player deve ver os novos `display_name` corretamente via `combat:stats_update`. Verificar que `sanitizePayload` continua destruindo `display_name` bruto e enviando como `name` para players (anti-metagaming).

---

## Notas de Paridade

- **Guest Combat (`GuestCombatClient`):** Afetado diretamente — e o arquivo principal desta story.
- **Session Combat (`CombatSessionClient` + `useCombatActions`):** O `handleUpdateStats` em `useCombatActions.ts` (linha 401) JA aceita `display_name` na type signature e faz `updateCombatantStats(id, stats)` + broadcast. Porem, nao tem logica de propagacao de grupo. Precisa integrar `applyGroupRename` tambem.
- **Player View (`PlayerJoinClient`):** Nao tem capacidade de rename — recebe apenas broadcasts. O `display_name` renomeado chega via `combat:stats_update` e e sanitizado por `sanitizePayload` (remove `display_name` bruto, envia como `name`). Nenhuma mudanca necessaria na player view.
- **EncounterSetup.tsx:** Tem sua propria copia de `handleDisplayNameChange` (linhas 513-547). Deve ser refatorada para usar `applyGroupRename` tambem, eliminando duplicacao.

---

## Definicao de Pronto

- [ ] Funcao `applyGroupRename` extraida em `lib/utils/group-rename.ts`
- [ ] `handleUpdateStats` no `GuestCombatClient` aceita e processa `display_name` com propagacao de grupo
- [ ] `handleDisplayNameChange` no setup (Guest + Session) refatorado para usar `applyGroupRename`
- [ ] `handleUpdateStats` em `useCombatActions.ts` integra propagacao de grupo (session flow)
- [ ] Functional state update substitui `hydrateCombatants` full replace nos renames de grupo
- [ ] Deteccao de rename baseada em posicao no array (nao `group_order` raw)
- [ ] Testes unitarios passando (7 cenarios)
- [ ] QA manual: rename de grupo funciona em setup E combate (Guest + Session)
- [ ] QA manual: broadcast para player view exibe rename corretamente
- [ ] Code review aprovado
