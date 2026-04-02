# A.8 — Group Ficha Click para Monstros Manuais + Event Propagation Fix

**Epic:** A — Estabilidade e UX do Combate Guest/DM  
**Prioridade:** Media-Alta  
**Estimativa:** 3 SP  
**Arquivos principais:** `components/combat/CombatantRow.tsx`, `components/combat/MonsterGroupHeader.tsx`

---

## Resumo

Monstros adicionados manualmente pelo DM (sem vir do compendio SRD) possuem `monster_id: null`. O click handler na `CombatantRow` exige `combatant.monster_id && combatant.ruleset_version` para determinar se o stat block pode ser expandido. Para monstros manuais, essa condicao e sempre `false` — o DM clica no nome do monstro e nada acontece, sem nenhum feedback visual de que o clique nao faz nada.

Alem disso, o `MonsterGroupHeader` tem um `onClick={onToggle}` no header bar sem `stopPropagation()`, permitindo que cliques em `CombatantRow` filhas borbulhem e colapsem/expandam o grupo involuntariamente. A animacao `AnimatePresence` com exit de 150ms pode desmontar children durante o bubble, causando comportamento erratico.

**Hipotese adicional (confirmada em beta test):** Monstros SRD dentro de grupos tambem apresentaram click inerte durante a sessao. O root cause primario e o `monster_id: null` para manuais, mas o bug de propagacao do `MonsterGroupHeader` (sem `stopPropagation`) pode estar silenciando o pinCard mesmo quando `canExpand === true`. O fix de propagacao desta story provavelmente resolve ambos os casos — validar explicitamente no QA com monstros SRD em grupo.

---

## Contexto

### Problema 1: `canExpand` sempre false para monstros manuais

Na `CombatantRow.tsx` (linhas 150-155), a logica atual:

```typescript
const fullMonster =
  combatant.monster_id && combatant.ruleset_version
    ? getMonsterById(combatant.monster_id, combatant.ruleset_version)
    : undefined;
const canExpand = fullMonster !== undefined;
```

Quando o DM adiciona um monstro via OmniBar manual (nome digitado, sem selecionar do SRD), o combatente tem:
- `monster_id: null`
- `ruleset_version: null`
- Mas possui: `name`, `current_hp`, `max_hp`, `ac`, `spell_save_dc`, `conditions`, `dm_notes`, `player_notes`

O `canExpand` retorna `false`, e toda a cadeia de UX e desativada:
- Cursor nao mostra `pointer` (linha 197: `canExpand ? "cursor-pointer" : ""`)
- Nome nao fica dourado no hover (linha 302-303: `canExpand ? "text-foreground hover:text-gold" : "text-foreground"`)
- Click handler nao faz nada (linha 198-201: `if (canExpand && fullMonster) { pinCard(...) }`)
- `role="button"` nao e aplicado (linha 203: `canExpand ? "button" : undefined`)

O DM perde a capacidade de ver rapidamente as stats do monstro que ele mesmo configurou.

### Problema 2: Event propagation no MonsterGroupHeader

Na `MonsterGroupHeader.tsx` (linha 95), o handler do header:

```typescript
onClick={onToggle}
```

Nao tem `e.stopPropagation()`. Quando o DM clica em uma `CombatantRow` filha dentro do grupo expandido, se o click da row nao previne propagacao (o que acontece no caso de monstros manuais onde `canExpand` e false e o handler e inerte), o evento borbulha ate o header e executa `onToggle`, colapsando o grupo inesperadamente.

### Problema 3: AnimatePresence race condition

Na `MonsterGroupHeader.tsx` (linhas 184-198), a animacao de exit:

```typescript
<AnimatePresence>
  {isExpanded && (
    <motion.div
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      {children}
    </motion.div>
  )}
</AnimatePresence>
```

Se o `onToggle` dispara durante um click na child, o `AnimatePresence` comeca a desmontar os children em 150ms. Isso cria uma janela onde o estado visual nao corresponde ao estado logico — o usuario ve o grupo colapsando enquanto tentava interagir com um membro.

---

## Criterios de Aceite

1. **Monstros manuais clicaveis** — Monstros com `monster_id: null` dentro de grupos podem ser clicados para exibir uma ficha parcial de stats.
2. **Ficha parcial mostra dados disponiveis** — A ficha exibe: nome, HP (atual/max), AC, spell_save_dc (se houver), condicoes ativas, notas do DM e notas do jogador — ou seja, tudo que o combatente tem no objeto `Combatant`, sem depender de dados do SRD.
3. **stopPropagation no MonsterGroupHeader** — O `onClick` do header bar tem `e.stopPropagation()` para prevenir que cliques em elementos internos do header propaguem indevidamente.
4. **stopPropagation nos CombatantRow filhos** — O click handler da row do nome (div na linha 196-211) tem `e.stopPropagation()` para prevenir que o clique borbulhe ate o `MonsterGroupHeader` e colapse o grupo.
5. **Debounce no group toggle** — O `onToggle` do `MonsterGroupHeader` tem um debounce de 200ms para prevenir expand/collapse rapido causado por double-click ou event bubbling residual.
6. **Cursor pointer condicional** — O cursor mostra `pointer` quando o clique vai efetivamente fazer algo: tanto para monstros SRD (`canExpand`) quanto para monstros manuais (`canShowPartialStats`). Monstros sem nenhum dado util (edge case improvavel) nao mostram pointer.
7. **HP button propagation** — O botao de HP dentro da `CombatantRow` (div na linha 318) ja tem `stopPropagation` — validar que continua funcionando apos as mudancas.

---

## Abordagem Tecnica

### 1. Nova flag `canShowPartialStats` na CombatantRow

Criar uma segunda condicao alem de `canExpand` que verifica se o combatente e um monstro manual com dados suficientes para exibir:

```typescript
// Monstro SRD — abre pinCard com stat block completo
const canExpand = fullMonster !== undefined;

// Monstro manual — abre ficha parcial com dados do Combatant
const isManualMonster = !combatant.monster_id && !combatant.is_player;
const canShowPartialStats = isManualMonster && (combatant.max_hp > 0 || combatant.ac > 0);

// Qualquer um dos dois habilita o click
const isClickable = canExpand || canShowPartialStats;
```

Usar `isClickable` em vez de `canExpand` para:
- Cursor pointer (linha 197)
- Hover dourado no nome (linhas 302-303)
- `role="button"` e `tabIndex` (linhas 203-204)
- `aria-label` (linha 205)

### 2. Ficha parcial para monstros manuais — inline expand

**Decisoes de UX (Party Mode 2026-04-02):**

| Decisao | Resolucao |
|---------|-----------|
| **Altura maxima** | `max-h-48` (192px), `overflow-y-auto` interno |
| **Colapso** | Toggle no clique do nome. Clique fora **NAO** fecha. Sem botao X |
| **ScrollIntoView** | Sim, `{ behavior: 'smooth', block: 'nearest' }` apos abertura |
| **Simultaneas** | **Uma por vez**. Abrir outra fecha a anterior automaticamente (`expandedMonsterId: string \| null`) |
| **Affordance clicavel** | Chevron `▸`/`▾` a direita do nome (Lucide `ChevronRight`/`ChevronDown`) |
| **Animacao** | Framer Motion `AnimatePresence`, height auto, ~200ms ease-out |

Para monstros manuais, **nao usar o sistema de pinCard** (que depende de `entityId` do SRD). Em vez disso, implementar um expand inline simples abaixo da row, similar ao pattern que ja existe com `isExpanded` + `AnimatePresence`:

```typescript
// No click handler (linhas 198-201):
onClick={(e) => {
  e.stopPropagation(); // FIX: previne bubble para MonsterGroupHeader
  if (canExpand && fullMonster) {
    pinCard("monster", fullMonster.id, combatant.ruleset_version ?? "2014");
  } else if (canShowPartialStats) {
    setIsExpanded((prev) => !prev);
  }
}}
```

Criar um componente `ManualMonsterPartialStats` (ou inline JSX) que renderiza:

```
+---------------------------------------+
| Nome do Monstro                       |
| HP: 45/45  |  AC: 15  |  DC: 13      |
| Condicoes: Frightened, Poisoned       |
| Notas DM: "Guarda da torre norte"     |
| Notas Player: "Parece forte"          |
+---------------------------------------+
```

Estilo: background `bg-white/[0.03]`, bordas sutis, mesma paleta do `StatsEditor`. Compacto — nao precisa de scroll.

### 3. stopPropagation no MonsterGroupHeader

```typescript
// MonsterGroupHeader.tsx, linha 95:
onClick={(e) => {
  e.stopPropagation();
  onToggle();
}}
```

### 4. stopPropagation no click handler da CombatantRow

Adicionar `e.stopPropagation()` no onClick do div do nome (linha 198), conforme mostrado na secao 2 acima. Isso previne que o clique suba ate o `MonsterGroupHeader`.

### 5. Debounce no onToggle do MonsterGroupHeader

Usar um `useRef` com timestamp para implementar debounce simples sem dependencia externa:

```typescript
const lastToggleRef = useRef(0);

const debouncedToggle = () => {
  const now = Date.now();
  if (now - lastToggleRef.current < 200) return;
  lastToggleRef.current = now;
  onToggle();
};
```

Aplicar `debouncedToggle` no `onClick` e no `handleKeyDown` do header.

### 6. Decisao: pinCard vs inline expand para monstros manuais

**Decisao: inline expand.** Justificativa:
- O `pinCard` requer `entityId` que mapeia para um monstro SRD em `public/srd/*.json`. Monstros manuais nao tem entrada no SRD.
- Criar um tipo "manual-monster" no `pinCard` exigiria mudar a interface da store, o `PinnedCardRenderer`, e adicionar um novo tipo de card — escopo grande demais para este fix.
- Um inline expand e consistente com o UX atual da row (ja existe `isExpanded` / `AnimatePresence` no componente, embora hoje so dispare para monstros SRD via `handleToggle`).
- Monstros manuais tem poucos dados (sem actions, spells, traits) — uma ficha compacta inline e mais adequada que um floating card.

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `components/combat/CombatantRow.tsx` | Adicionar `canShowPartialStats` e `isClickable`; mudar condicoes de cursor/hover/role para usar `isClickable`; adicionar `e.stopPropagation()` no click do nome; renderizar ficha parcial inline quando `isExpanded && canShowPartialStats` |
| `components/combat/MonsterGroupHeader.tsx` | Adicionar `e.stopPropagation()` no onClick do header (linha 95); implementar debounce de 200ms no toggle; aplicar debounce tambem no `handleKeyDown` |
| `components/combat/ManualMonsterStats.tsx` (novo) | Componente apresentacional para ficha parcial — recebe `combatant: Combatant`, renderiza stats disponiveis em layout compacto |
| `lib/types/combat.ts` | Nenhuma mudanca — o tipo `Combatant` ja tem todos os campos necessarios (`ac`, `spell_save_dc`, `conditions`, `dm_notes`, `player_notes`) |
| `messages/pt-BR.json` / `messages/en.json` | Adicionar chaves i18n: `manual_monster_stats_title`, `manual_monster_no_data`, `manual_monster_view_stats_aria` |

---

## Plano de Testes

### Testes Unitarios

1. **canShowPartialStats — monstro manual com HP e AC** — Flag retorna `true` quando `monster_id === null`, `is_player === false`, `max_hp > 0`.
2. **canShowPartialStats — player** — Flag retorna `false` quando `is_player === true` (player nao e monstro manual).
3. **canShowPartialStats — monstro SRD** — Flag retorna `false` quando `monster_id !== null` (usa `canExpand` em vez disso).
4. **Debounce no toggle** — Dois cliques em < 200ms resultam em apenas um toggle. Dois cliques com > 200ms de intervalo resultam em dois toggles.
5. **ManualMonsterStats renderiza campos presentes** — Componente exibe HP, AC, spell_save_dc quando presentes. Omite spell_save_dc quando null. Exibe condicoes quando array nao e vazio.

### Testes de Integracao (Manual / Playwright)

1. **Fluxo completo — monstro manual em grupo:**
   - DM cria encontro via OmniBar, adicionando monstro manual ("Dragao Homebrew", HP 200, AC 18).
   - DM agrupa monstros manuais.
   - Expandir grupo > clicar no nome do monstro > ficha parcial abre inline.
   - Clicar novamente > ficha fecha.
   - Verificar que o grupo **nao colapsou** durante o clique.

2. **Fluxo — monstro SRD em grupo (regressao + hipotese beta):**
   - DM adiciona Goblin do SRD ao encontro e o agrupa.
   - Expandir grupo > clicar no nome > pinCard abre normalmente.
   - Verificar que o grupo **nao colapsou** durante o clique.
   - **Nota:** Este caso foi reportado como quebrado no beta test (click inerte em monstros SRD em grupo). Confirmar que o fix de `stopPropagation` resolve o caso SRD tambem. Se o problema persistir apos o fix de propagacao, investigar se ha outro bloqueio especifico para monstros SRD agrupados.

3. **Fluxo — double-click rapido no header:**
   - DM faz double-click no header do grupo.
   - Grupo expande (primeiro clique) e o segundo clique e ignorado pelo debounce.
   - Nao ha flickering de expand/collapse.

4. **Fluxo — cursor pointer:**
   - Monstro SRD: cursor pointer no nome.
   - Monstro manual com HP > 0: cursor pointer no nome.
   - Player: sem cursor pointer no nome.

5. **Fluxo — mobile (touch):**
   - Tap no nome do monstro manual dentro de grupo expandido.
   - Ficha parcial abre sem colapsar o grupo.
   - Segundo tap fecha a ficha.

---

## Notas de Paridade

- **Escopo: Guest/DM apenas.** O `CombatantRow` e usado exclusivamente na view de combate guest (`GuestCombatClient`). A view do Player usa `PlayerInitiativeBoard` que renderiza combatentes de forma completamente diferente — nao tem conceito de "expandir ficha" nem monster groups. Portanto, esta story nao afeta a experiencia do Player.
- **GuestCombatClient vs PlayerJoinClient:** O `GuestCombatClient` (modo offline/guest) usa `CombatantRow` diretamente com Zustand store local. O `PlayerJoinClient` (modo online) usa `PlayerInitiativeBoard`. Nenhuma mudanca necessaria no lado Player.
- **MonsterGroupHeader** e usado tanto em `GuestCombatClient` quanto em qualquer futuro uso de grupos — o fix de propagation e debounce beneficia todos os consumidores.
- **pinCard system inalterado** — O sistema de floating cards (`pinned-cards-store.ts`, `PinnedCardRenderer`) nao precisa de mudancas. Monstros SRD continuam usando pinCard normalmente. Apenas monstros manuais usam o novo inline expand.

---

## Definicao de Pronto

- [ ] Monstros manuais em grupos mostram cursor pointer e hover dourado no nome
- [ ] Clique no nome de monstro manual abre ficha parcial inline
- [ ] Ficha parcial exibe: nome, HP, AC, spell_save_dc, condicoes, notas
- [ ] Clique no nome de monstro SRD continua abrindo pinCard (regressao ok)
- [ ] `stopPropagation` no click do nome impede colapso do grupo
- [ ] `stopPropagation` no onClick do header do MonsterGroupHeader
- [ ] Debounce de 200ms no toggle do MonsterGroupHeader
- [ ] Testes unitarios passando (5 cenarios)
- [ ] QA manual em desktop e mobile
- [ ] Code review aprovado
