# Tech Spec: Layout Responsivo Mobile para CombatantSetupRow

**Status:** Pronto para implementacao
**Componente:** `components/combat/CombatantSetupRow.tsx`
**Prioridade:** Alta (UX critico — DM view no celular e ipad esta ilegivel)

---

## 1. Declaracao do Problema

O componente `CombatantSetupRow` renderiza todos os campos de configuracao de um combatente (drag handle, iniciativa, token, nome/apelido, HP, CA, notas, acoes) em uma **unica linha flex horizontal**. Em telas menores que ~768px:

- Campos numericos (Init, HP, CA) ficam espremidos (~40-48px) e dificeis de distinguir
- Texto do nome e apelido sobrepoe os campos numericos
- Botoes de acao ("Ver Ficha", "Duplicar", "Remover") ficam compactados e dificeis de tocar
- Campo de notas ja esta `hidden md:block`, mas mesmo sem ele o layout nao cabe
- Touch targets ficam abaixo de 44px (violando WCAG 2.1 AA — regra do projeto)
- Token do monstro ja esta `hidden md:block`, mas o espaco restante continua insuficiente

O componente irmao `CombatantRow` (usado durante combate ativo) **nao tem este problema** porque usa um layout de card multi-linha (nome em uma linha, barra de HP embaixo, acoes em painel expansivel). O `CombatantSetupRow` precisa de abordagem similar.

---

## 2. Analise do Layout Atual

### Estrutura do container principal (linha 72-73):
```tsx
<div className="flex items-center gap-1.5 bg-card border border-white/[0.04] rounded-md px-2 py-1.5 hover:bg-white/[0.02] group">
```

**Problema central:** `flex items-center` em uma unica linha horizontal, sem `flex-wrap` ou breakpoint para reorganizar.

### Elementos na linha (da esquerda para direita):

| # | Elemento | Classes de largura | Visibilidade mobile |
|---|----------|-------------------|---------------------|
| 1 | Drag handle | `w-5 flex-shrink-0` | Visivel |
| 2 | Iniciativa + dado | `w-12 md:w-16 flex-shrink-0` | Visivel (apertado) |
| 3 | Token monstro | `w-8 flex-shrink-0` | `hidden md:block` |
| 4 | Nome + apelido + badge versao | `flex-1 min-w-0` | Visivel (esmaga) |
| 5 | HP | `w-12 md:w-16` | Visivel (apertado) |
| 6 | CA | `w-10 md:w-14` | Visivel (apertado) |
| 7 | Notas | `hidden md:block flex-1` | Oculto |
| 8 | Acoes (badge/ver ficha/role/duplicar/remover) | `w-auto md:w-[170px] flex-shrink-0` | Visivel (compactado) |

**Largura total consumida em mobile (viewport 375px):**
- Padding container: 16px (px-2 * 2)
- Gaps: ~12px (gap-1.5 * ~8 items)
- Drag: 20px + Init: 48px + Nome: flex + HP: 48px + CA: 40px + Acoes: ~80px
- **Espaco liquido para Nome:** ~110px (insuficiente para nome + apelido + badge)

### Responsividade existente (limitada):
- Token: oculto em mobile (`hidden md:block`)
- Notas: ocultas em mobile (`hidden md:block`)
- Labels de acoes: ocultos em mobile (`hidden md:inline` nos textos "Ver Ficha" e role label)
- Init/HP/AC: apenas reduzem largura (`w-12 md:w-16`)

**Conclusao:** As otimizacoes atuais sao insuficientes. O layout precisa quebrar em duas linhas no mobile.

---

## 3. Solucao Proposta: Layout de Duas Linhas no Mobile

### Conceito

Em telas `< md` (< 768px), o row muda de uma linha horizontal para um **card compacto de duas linhas**:

```
Linha 1: [Drag] [Init+🎲] [Nome / Apelido] [Badge Versao]
Linha 2: [HP] [CA]  ............  [Role/VerFicha] [Duplicar] [Remover]
```

Em telas `>= md`, mantem o layout atual de linha unica (ja funciona bem em desktop).

### Detalhamento visual (mobile):

**Linha 1 — Identificacao:**
- Drag handle (esquerda)
- Iniciativa com botao de dado
- Nome do combatente (flex-1, trunca se necessario)
- Apelido anti-metagame (truncado)
- Badge de versao (2014/2024)

**Linha 2 — Stats + Acoes:**
- HP input (com label "HP" visivel)
- CA input (com label "CA" visivel)
- Espaco flexivel
- Botoes de acao (icones maiores, sem texto, gap adequado)
- Badge "Jogador" (se aplicavel)

### Comparacao com CombatantRow

O `CombatantRow` (linhas 176-417 de CombatantRow.tsx) usa abordagem de card com:
- Linha de nome com HP inline
- Barra de HP visual abaixo
- Paineis expansiveis para acoes

Nossa abordagem para o Setup e mais simples (2 linhas fixas) porque nao precisamos de paineis expansiveis — sao apenas inputs editaveis.

---

## 4. Mudancas Especificas no Codigo

### Arquivo: `components/combat/CombatantSetupRow.tsx`

#### 4.1. Container principal — trocar de flex-row para flex-wrap responsivo

**De:**
```tsx
<div className="flex items-center gap-1.5 bg-card border border-white/[0.04] rounded-md px-2 py-1.5 hover:bg-white/[0.02] group">
```

**Para:**
```tsx
<div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 md:flex-nowrap bg-card border border-white/[0.04] rounded-md px-2 py-1.5 hover:bg-white/[0.02] group">
```

**Justificativa:** `flex-wrap` no mobile permite que os elementos quebrem para a segunda linha. `md:flex-nowrap` restaura o comportamento de linha unica no desktop. `gap-y-1` da espaco vertical entre as duas linhas.

#### 4.2. Bloco de Nome — forcar quebra de linha apos ele no mobile

**De:**
```tsx
<div className="flex items-center gap-1 flex-1 min-w-0">
```

**Para:**
```tsx
<div className="flex items-center gap-1 flex-1 min-w-0 md:flex-initial md:flex-1">
```

E adicionar apos o bloco de Nome (antes do HP), um **line break forcer** visivel apenas no mobile:

```tsx
{/* Quebra de linha no mobile */}
<div className="w-full h-0 md:hidden" aria-hidden="true" />
```

**Nota:** O `w-full` dentro de um flex-wrap forca a proxima linha.

#### 4.3. Bloco de Stats (HP + CA) — grupo com labels no mobile

Envolver HP e CA em um grupo para alinhar na segunda linha:

```tsx
<div className="flex items-center gap-1.5 md:contents">
  {/* Label visivel apenas no mobile */}
  <span className="text-[10px] text-muted-foreground/50 uppercase md:hidden">HP</span>
  <input ... /> {/* HP existente */}

  <span className="text-[10px] text-muted-foreground/50 uppercase md:hidden">CA</span>
  <input ... /> {/* AC existente */}
</div>
```

**Nota:** `md:contents` faz o wrapper "desaparecer" no desktop, mantendo os inputs como filhos diretos do flex principal. Isso preserva o layout desktop intacto.

#### 4.4. Acoes — touch targets maiores no mobile

**De (botao remover, linha 307-315):**
```tsx
className="text-muted-foreground/40 hover:text-red-400 transition-colors text-xs flex-1 text-center min-h-[32px]"
```

**Para:**
```tsx
className="text-muted-foreground/40 hover:text-red-400 transition-colors text-xs text-center min-h-[44px] min-w-[44px] md:min-h-[32px] md:min-w-0 flex items-center justify-center"
```

**Aplicar min-h-[44px] e min-w-[44px] em mobile para TODOS os botoes de acao** (Ver Ficha, Duplicar, Remover, Role). Isso atende a regra de touch target >= 44px do projeto.

**De (botao duplicar, linha 298-305):**
```tsx
className="text-muted-foreground/40 hover:text-gold transition-colors text-xs min-h-[32px] px-1"
```

**Para:**
```tsx
className="text-muted-foreground/40 hover:text-gold transition-colors text-xs min-h-[44px] min-w-[44px] md:min-h-[32px] md:min-w-0 px-1 flex items-center justify-center"
```

#### 4.5. Container de Acoes — empurrar para a direita na segunda linha

**De:**
```tsx
<div className="w-auto md:w-[170px] flex-shrink-0 flex items-center justify-end gap-1">
```

**Para:**
```tsx
<div className="flex-shrink-0 flex items-center justify-end gap-1 ml-auto md:w-[170px]">
```

**Justificativa:** `ml-auto` empurra as acoes para a extrema direita na segunda linha. Remove `w-auto` que nao contribui.

#### 4.6. Notas — mover para segunda linha com acoes no desktop, manter oculto no mobile

Sem mudanca necessaria — `hidden md:block` ja esta correto. As notas aparecem no desktop entre CA e Acoes.

---

## 5. Traducoes Necessarias

Nenhuma nova traducao e necessaria. Os labels "HP" e "CA" do mobile podem usar as chaves existentes:
- `combat.setup_hp_placeholder` = "HP"
- `combat.setup_ac_placeholder` = "CA"

Ou usar texto literal ("HP", "CA") ja que sao siglas universais em D&D.

---

## 6. Criterios de Aceitacao

### AC-1: Layout de duas linhas no mobile
**Dado** que o viewport e menor que 768px
**Quando** o DM visualiza a lista de combatentes no setup
**Entao** cada `CombatantSetupRow` exibe em duas linhas:
  - Linha 1: drag handle, iniciativa, nome/apelido, badge versao
  - Linha 2: HP (com label), CA (com label), botoes de acao alinhados a direita

### AC-2: Layout de linha unica no desktop
**Dado** que o viewport e >= 768px
**Quando** o DM visualiza a lista de combatentes no setup
**Entao** o layout permanece identico ao atual (linha unica horizontal)

### AC-3: Touch targets adequados
**Dado** que o viewport e menor que 768px
**Quando** o DM interage com botoes de acao (Remover, Duplicar, Ver Ficha, Role)
**Entao** cada botao tem area tocavel minima de 44x44px

### AC-4: Inputs legíveis
**Dado** que o viewport e 375px (iPhone SE, menor target)
**Quando** o DM ve campos de Init, HP e CA
**Entao** nenhum texto sobrepoe outro e os numeros sao claramente distinguiveis

### AC-5: Drag-and-drop funcional
**Dado** o novo layout de duas linhas no mobile
**Quando** o DM arrasta o handle para reordenar
**Entao** o drag-and-drop funciona corretamente (DragOverlay renderiza o card completo)

### AC-6: Funcionalidade preservada
**Dado** qualquer tamanho de viewport
**Quando** o DM interage com qualquer campo ou botao do setup row
**Entao** todas as funcionalidades existentes continuam operando:
  - Editar iniciativa, nome, HP, CA
  - Rolar iniciativa (dado)
  - Ver ficha (pin card)
  - Duplicar combatente
  - Remover combatente
  - Editar apelido anti-metagame
  - Ciclar role (player/npc/summon/monster)

### AC-7: Guest mode compativel
**Dado** que o componente e usado tanto em `EncounterSetup.tsx` quanto em `GuestCombatClient.tsx`
**Quando** o layout responsivo e aplicado
**Entao** ambos os contextos renderizam corretamente

---

## 7. Estrategia de Testes

### 7.1. Testes unitarios existentes (atualizar)

**Arquivo:** `components/combat/CombatantSetupRow.test.tsx`

Os testes existentes (9 testes) verificam valores de campos e callbacks de eventos. **Nenhum deles quebra** com as mudancas de CSS propostas, pois:
- Nao verificam classes CSS
- Verificam por `data-testid` que nao mudam
- Verificam chamadas de callback que nao mudam

**Novos testes a adicionar:**

```typescript
describe("CombatantSetupRow - Mobile Layout", () => {
  it("renders line break element for mobile", () => {
    renderRow();
    const lineBreak = document.querySelector('[aria-hidden="true"].w-full');
    expect(lineBreak).toBeInTheDocument();
  });

  it("renders HP and AC labels visible on mobile", () => {
    renderRow();
    // Labels com classe md:hidden existem no DOM
    const labels = document.querySelectorAll('.md\\:hidden');
    expect(labels.length).toBeGreaterThanOrEqual(2);
  });
});
```

### 7.2. Testes visuais/manuais

Como o projeto nao tem E2E automatizado (gap conhecido documentado em `project-context.md`), validar manualmente:

1. **iPhone SE (375px):** Verificar que 2 linhas nao sobrepoem, todos inputs acessiveis
2. **iPhone 14 (390px):** Mesmo check
3. **iPad Mini (768px):** Verificar transicao para layout de linha unica
4. **Desktop (1280px):** Verificar que nada mudou
5. **Drag-and-drop mobile:** Testar reordenacao por toque no guest mode (`/try`)
6. **Guest mode vs Auth mode:** Testar ambos os caminhos

### 7.3. Testes de integracao (existentes)

**Arquivos afetados indiretamente:**
- `components/combat/EncounterSetup.test.tsx` — Renderiza `CombatantSetupRow` via `SortableCombatantList`
- `components/guest/GuestCombatClient.test.tsx` — Renderiza `CombatantSetupRow` no guest mode

Esses testes nao devem quebrar pois testam comportamento, nao layout.

---

## 8. Arquivos Modificados

| Arquivo | Tipo de mudanca |
|---------|----------------|
| `components/combat/CombatantSetupRow.tsx` | Mudancas de classes Tailwind + adicao de elementos de layout |
| `components/combat/CombatantSetupRow.test.tsx` | Novos testes para elementos mobile |

**Nenhum arquivo novo criado.**

---

## 9. Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|----------|
| `md:contents` nao funciona como esperado em alguns browsers | Testar em Chrome, Safari, Firefox. Fallback: usar `md:flex md:flex-row` no wrapper |
| `flex-wrap` pode causar layout estranho com DragOverlay | O `DragOverlay` em `SortableCombatantList.tsx` (linha 126-133) renderiza o mesmo `renderItem` — verificar que o overlay tambem respeita flex-wrap |
| Touch sensor do dnd-kit conflita com scroll | Ja configurado com `delay: 250, tolerance: 5` no `SortableCombatantList` (linha 81-82) — adequado |
| Inputs numericos ficam muito pequenos no mobile | Manter `w-12` (48px) como minimo — suficiente para 2-3 digitos com font-mono |

---

## 10. Fora de Escopo

- Reescrever o componente com CSS Grid (over-engineering para a mudanca necessaria)
- Adicionar campo de notas no mobile (pode ser feature futura com toggle)
- Mudar o layout desktop
- Adicionar animacoes de transicao entre layouts
- Responsividade do `AddCombatantForm` (componente separado, spec separada)
