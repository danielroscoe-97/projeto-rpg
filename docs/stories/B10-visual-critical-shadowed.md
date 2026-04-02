# B.10 — Visual Critico Sombreado

**Epic:** B — Melhorias Visuais de Combate  
**Prioridade:** Media  
**Estimativa:** 2 SP  
**Arquivos principais:** `components/combat/CombatantRow.tsx`, `components/player/PlayerInitiativeBoard.tsx`

---

## Resumo

Quando um combatente atinge o tier CRITICAL de HP (<=10%), ele deve receber um tratamento visual de sombreamento na lista de combate — `opacity-50` + filtro CSS `grayscale(50%)` — como indicador de urgencia visual. Atualmente, a unica diferenciacao visual do tier CRITICAL e a cor da barra de HP (`bg-red-900`). Esta story adiciona um efeito de overlay escuro/sombra sobre todo o card/row, com transicao suave ao entrar/sair do estado critico.

---

## Contexto

O arquivo `lib/utils/hp-status.ts` define os 4 tiers imutaveis de HP:

| Tier | Threshold | Cor |
|------|-----------|-----|
| LIGHT | > 70% | Verde |
| MODERATE | > 40% | Ambar |
| HEAVY | > 10% | Vermelho |
| CRITICAL | <= 10% | Vermelho escuro |

Na visao do DM (`CombatantRow.tsx`), o tier e calculado via `getHpBarColor(current_hp, max_hp)` na linha ~132 e afeta apenas a cor da barra de HP. Nao ha nenhum tratamento visual adicional no card inteiro.

Na visao do Player (`PlayerInitiativeBoard.tsx`), monstros recebem um `hp_status` label (LIGHT/MODERATE/HEAVY/CRITICAL) via `sanitizeCombatantsForPlayer()`. O componente `HpStatusBadge` ja usa um icone de caveira e cor cinza (`text-gray-300`, `bg-gray-900/40`) para CRITICAL, mas o card em si nao recebe tratamento visual.

### Estado atual do CombatantRow

A classe CSS do `<li>` na linha ~182-186 ja aplica condicionalmente:
- `opacity-50` quando `is_defeated` (combatente derrotado)
- `animate-flash-red` / `animate-flash-green` para flashes de dano/cura
- `border-dashed opacity-70` quando `is_hidden`

O efeito CRITICAL deve coexistir com essas classes sem conflito. Nota: quando `is_defeated === true`, o combatente ja esta em `opacity-50` — nao faz sentido empilhar o efeito CRITICAL sobre um combatente derrotado.

---

## Decisoes de UX (Party Mode 2026-04-02)

| Decisao | Resolucao |
|---------|-----------|
| **CRITICAL visual** | `opacity-70 grayscale(30%)` + `border-2 border-red-500 animate-pulse` — tudo junto na transicao de 500ms |
| **MORTO visual** | `opacity-40 grayscale(80%)` + `line-through` no nome + sem borda pulsando |
| **DM view** | Sem grayscale/opacity. **Apenas** `border-2 border-red-500 animate-pulse` (DM precisa ver claramente para gerenciar) |
| **Player view** | Tratamento completo (opacity + grayscale + borda) |
| **Timing** | Borda + grayscale aparecem juntos na mesma transicao, sem sequencia separada |

**Justificativa:** `opacity-50 + grayscale(50%)` original era visualmente identico a "item removido/inativo" em dark theme. Valores reduzidos (`opacity-70`, `grayscale-30%`) mantem legibilidade. Borda vermelha pulsando diferencia de "morto". DM view sem grayscale para gerenciamento efetivo.

---

## Criterios de Aceite

1. **Player view — CRITICAL:** Combatentes no tier CRITICAL (HP <= 10% do max) recebem `opacity-70` e filtro CSS `grayscale(30%)` + `border-2 border-red-500 animate-pulse` no card/row inteiro.

2. **DM view — CRITICAL:** Combatentes em CRITICAL recebem **apenas** `border-2 border-red-500 animate-pulse` — sem grayscale nem opacity. O DM precisa ver claramente para gerenciar monstros criticos.

3. **MORTO (0 HP) — visual distinto de CRITICAL:** Combatentes com `is_defeated === true` ou HP = 0 recebem `opacity-40 grayscale(80%)` + `line-through` no nome + **sem** borda pulsando. Isso diferencia "quase morto" (CRITICAL) de "morto" (defeated).

4. Transicao suave (`transition-all duration-500`) ao entrar e sair do estado CRITICAL — borda e grayscale aparecem juntos na mesma transicao, sem sequencia separada.

5. O efeito funciona tanto na lista de iniciativa (card principal) quanto em quaisquer stat views expandidos do combatente.

6. O efeito CRITICAL NAO e aplicado quando `is_defeated === true` (usa visual de MORTO em vez disso).

7. Funciona em ambas as views: DM (CombatantRow) e Player (PlayerInitiativeBoard), com visual diferenciado conforme decisoes acima.

---

## Abordagem Tecnica

### 1. Calculo do estado CRITICAL

**DM view (`CombatantRow.tsx`):**

O componente ja calcula `hpBarColor` e `hpThresholdKey` usando `getHpBarColor()` e `getHpThresholdKey()`. Adicionar uma variavel derivada:

```typescript
const isCritical = combatant.max_hp > 0 && combatant.current_hp / combatant.max_hp <= 0.1;
```

**Player view (`PlayerInitiativeBoard.tsx`):**

Para monstros, o campo `hp_status` ja vem sanitizado como string. Para players, `current_hp` e `max_hp` estao disponiveis. Logica:

```typescript
const isCritical = c.is_player
  ? (c.max_hp && c.max_hp > 0 && (c.current_hp ?? 0) / c.max_hp <= 0.1)
  : c.hp_status === "CRITICAL";
```

### 2. Classes CSS condicionais

**No `<li>` do CombatantRow (DM view), linha ~182:**

DM view usa apenas borda — sem grayscale/opacity (DM precisa ver claramente para gerenciar):

```typescript
${isCritical && !combatant.is_defeated ? "border-2 border-red-500 animate-pulse" : ""}
${combatant.is_defeated ? "opacity-40 grayscale-[80%]" : ""}
```

Adicionar `[&_span.combatant-name]:line-through` ou aplicar `line-through` no span do nome quando `is_defeated`.

E garantir que `transition-all duration-500` esta presente no `<li>`. O componente ja usa `transition-colors` — trocar para `transition-all` para cobrir `opacity` e `filter`.

**No card do PlayerInitiativeBoard (Player view):**

Player view usa tratamento completo (opacity + grayscale + borda):

```typescript
${isCritical && !isDefeated ? "opacity-70 grayscale-[30%] border-2 border-red-500 animate-pulse" : ""}
${isDefeated ? "opacity-40 grayscale-[80%]" : ""}
```

Aplicar no `<li>` ou `<div>` que envolve cada combatente na lista de iniciativa.

### 3. Classe Tailwind para grayscale

O Tailwind v3+ suporta `grayscale` (100%) nativamente. Para 50%, usar uma classe utilitaria customizada ou inline style:

**Opcao A — Classe customizada no `tailwind.config.ts`:**

```typescript
// Nao necessario: Tailwind v4+ com JIT compila grayscale-[50%] automaticamente
// Se necessario, adicionar a global.css:
// .grayscale-50 { filter: grayscale(50%); }
```

**Opcao B — Inline style (mais simples):**

```typescript
style={isCritical && !combatant.is_defeated ? { filter: "grayscale(50%)" } : undefined}
```

**Recomendacao:** Usar `className` com `grayscale-[50%]` (Tailwind JIT arbitrary value) para manter consistencia com o restante do projeto que nao usa inline styles.

### 4. Transicao suave

Trocar `transition-colors` por `transition-all duration-500` no `<li>` para que a mudanca de `opacity` e `filter` seja animada. A duracao de 500ms e suficiente para uma transicao perceptivel sem ser lenta.

```diff
- className={`bg-card border rounded-md overflow-hidden transition-colors ${
+ className={`bg-card border rounded-md overflow-hidden transition-all duration-500 ${
```

### 5. Coexistencia com defeated — visual distinto

CRITICAL e MORTO tem visuais distintos:

```typescript
// DM view — apenas borda para CRITICAL
const criticalStyles = isCritical && !combatant.is_defeated
  ? "border-2 border-red-500 animate-pulse"
  : "";
const defeatedStyles = combatant.is_defeated
  ? "opacity-40 grayscale-[80%]"
  : "";

// Player view — tratamento completo para CRITICAL
const criticalStylesPlayer = isCritical && !isDefeated
  ? "opacity-70 grayscale-[30%] border-2 border-red-500 animate-pulse"
  : "";
const defeatedStylesPlayer = isDefeated
  ? "opacity-40 grayscale-[80%]"
  : "";
```

Quando `is_defeated === true`, o combatente recebe `opacity-40 grayscale(80%)` + `line-through` no nome, **sem** borda pulsando. Isso diferencia claramente "quase morto" (borda pulsa, card legivel) de "morto" (card esmaecido, nome riscado).

---

## Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `components/combat/CombatantRow.tsx` | Adicionar variavel `isCritical`, classes condicionais no `<li>`, trocar `transition-colors` por `transition-all duration-500` |
| `components/player/PlayerInitiativeBoard.tsx` | Adicionar logica `isCritical` (baseada em `hp_status` para monstros, `current_hp/max_hp` para players), classes condicionais no card de cada combatente |
| `app/globals.css` (opcional) | Adicionar classe `.grayscale-50` caso `grayscale-[50%]` do Tailwind JIT nao funcione no setup atual |

---

## Plano de Testes

### Testes Manuais (obrigatorios)

1. **DM view — monstro em CRITICAL**
   - [ ] Adicionar monstro com 100 HP, reduzir para 10 HP (10%) — verificar que o card recebe sombreamento
   - [ ] Reduzir para 5 HP (5%) — verificar que o efeito permanece
   - [ ] Curar para 15 HP (15%) — verificar que o efeito desaparece com transicao suave

2. **DM view — player em CRITICAL**
   - [ ] Adicionar player com 50 HP, reduzir para 5 HP (10%) — verificar sombreamento
   - [ ] Curar acima de 10% — verificar transicao suave de saida

3. **DM view — combatente derrotado em CRITICAL**
   - [ ] Combatente em CRITICAL + marcar como derrotado — verificar que nao empilha `opacity-50` (deve ficar com o `opacity-50` do defeated, nao 25% de opacidade)

4. **Player view — monstro CRITICAL**
   - [ ] Na visao do player, monstro com `hp_status: "CRITICAL"` deve mostrar sombreamento no card

5. **Player view — player proprio em CRITICAL**
   - [ ] Player com HP <= 10% deve ver seu proprio card sombreado

6. **Transicao suave**
   - [ ] Usar DevTools para observar que a transicao dura ~500ms ao entrar/sair do CRITICAL
   - [ ] Nao deve haver "flash" instantaneo

7. **Stat view expandido**
   - [ ] Expandir stat block de monstro em CRITICAL — verificar que o efeito se estende ao conteudo expandido

### Teste Visual (recomendado)

- Capturar screenshot antes/depois para comparacao visual (salvar em `qa-evidence/`)

---

## Notas de Paridade

- **Guest Combat (DM offline):** `GuestCombatClient` usa o mesmo `CombatantRow` — o efeito sera automaticamente aplicado sem mudancas adicionais.
- **Player Combat (realtime):** Requer mudanca especifica em `PlayerInitiativeBoard.tsx` porque esta view tem seu proprio rendering de cards (nao reutiliza `CombatantRow`).
- **Ambas as views** devem ter o mesmo comportamento visual. A unica diferenca e a fonte de dados: DM usa `current_hp/max_hp` direto, Player usa `hp_status` label para monstros.

---

## Definicao de Pronto

- [ ] Variavel `isCritical` calculada corretamente em ambos os componentes
- [ ] **DM view:** CRITICAL aplica `border-2 border-red-500 animate-pulse` (sem grayscale/opacity)
- [ ] **Player view:** CRITICAL aplica `opacity-70 grayscale-[30%] border-2 border-red-500 animate-pulse`
- [ ] **MORTO (defeated):** Aplica `opacity-40 grayscale-[80%]` + `line-through` no nome (sem borda pulsando)
- [ ] Transicao suave com `transition-all duration-500`
- [ ] Guard contra empilhamento CRITICAL + defeated
- [ ] Testes manuais 1-7 passando
- [ ] DM view vs Player view com visuais diferenciados conforme spec
- [ ] Nenhuma regressao nos efeitos de flash (damage/heal) ou hidden
