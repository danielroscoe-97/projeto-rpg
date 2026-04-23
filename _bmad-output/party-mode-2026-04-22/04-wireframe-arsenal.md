# Wireframe — Arsenal (inventário + habilidades + attunement)

**Prereq:** [PRD §7.4](./PRD-EPICO-CONSOLIDADO.md)
**Escopo:** Desktop + mobile + fluxos específicos.

---

## 1. Wireframe — Arsenal · desktop 1280-1440px

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ HEADER (inalterado) · TAB BAR · RIBBON VIVO                                       │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ┌─ COL A (~560px) ────────────────────┐  ┌─ COL B (~560px) ──────────────────┐│
│ │                                     │  │                                   ││
│ │ HABILIDADES & FEATURES              │  │ SINTONIZAÇÃO (3 slots)            ││
│ │                                     │  │ 💎 Anel da Proteção    [×]        ││
│ │ [Todas] [Combate] [Passivas]        │  │ 💎 Amuleto da Saúde    [×]        ││
│ │                                     │  │ ⚪ Slot vazio          [+ Sint.] ││
│ │ ⚡ Canalizar Divindade (1/1)         │  │ ─────────────────────────────────││
│ │    Clérigo lv5 · Reset short rest   │  │ MOEDAS                            ││
│ │    [Detalhes ▾]                     │  │ CP 0 · SP 12 · EP 0 · GP 245 ·    ││
│ │                                     │  │ PP 3         [+ Ajustar]          ││
│ │ ✨ Font of Magic (7 pts)            │  │ ─────────────────────────────────││
│ │    Sorcerer lv2 · Reset long rest   │  │ MEUS ITENS                        ││
│ │    [Detalhes ▾]                     │  │ [🔍 Buscar item...]               ││
│ │                                     │  │ [Todos] [Mágicos] [Armas] [Consumí.]│
│ │ 🎯 Turn Undead                      │  │                                   ││
│ │    Passiva clérigo                  │  │ ⚔ Espada Longa +1   · 1x  [Sint.] ││
│ │    [Detalhes ▾]                     │  │ 🛡 Escudo            · 1x  [Equip]││
│ │                                     │  │ 🧪 Poção de Cura     · 3x  [Usar] ││
│ │ 🎭 Half-Elf Traits                  │  │ 🪙 Mochila           · 1x         ││
│ │    Racial                           │  │ [+ Adicionar Item]                ││
│ │    [Detalhes ▾]                     │  │ ─────────────────────────────────││
│ │                                     │  │ INVENTÁRIO COMPARTILHADO          ││
│ │ [+ Adicionar Habilidade]            │  │ (Bolsa do Grupo · read-only pra   ││
│ │                                     │  │  itens não-meus)                  ││
│ │                                     │  │ Essenciais:                       ││
│ │                                     │  │ Poções de Cura  ·  0/0/0/0        ││
│ │                                     │  │ Goodberries     ·  0              ││
│ │                                     │  │ Diamantes       ·  0              ││
│ │                                     │  │ Ouro/Prata/Plat ·  0/0/0          ││
│ └─────────────────────────────────────┘  └───────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Layout:**
- Col A (560px): Habilidades/Features (lista com detalhes colapsáveis)
- Col B (560px): Sintonização + Moedas + Meus Itens + Inv Compartilhado

---

## 2. Mobile · 390px

Single-column, ordem:
1. Sintonização (3 slots)
2. Moedas (row compacta)
3. Meus Itens (lista + busca)
4. Habilidades (accordion default fechado — menos critical em mobile)
5. Inventário Compartilhado (accordion)

---

## 3. Zonas detalhadas

### 3.1 Habilidades & Features (Col A)

**Tipos de habilidade:**
- **Combate ativo** (consome resource): Canalizar Divindade, Rage, Action Surge
- **Combate reativo**: Deflect Missiles, Cutting Words
- **Passivas**: Lucky, Mobile, Racial traits
- **Sorcery / Metamagic**: Font of Magic, Quickened Spell

**Row de habilidade (altura 64px default, 200px+ quando expandida):**

```
┌──────────────────────────────────────────────────┐
│ ⚡ {Ícone} {Nome em Cinzel 14 gold}  ({count})   │
│    {Origem: classe + nível · Reset type}         │
│    [Detalhes ▾]                                  │
├──────────────────────────────────────────────────┤  (expandido)
│ {Descrição markdown}                             │
│ [Usar] (se for ativa + disponível)               │
│ [Editar] [Remover]                               │
└──────────────────────────────────────────────────┘
```

**Tokens:** padding `px-3 py-2.5`, gap entre rows `space-y-2`.

### 3.2 Sintonização (Col B topo)

**Card com 3 slots fixos:**

```
┌─ SINTONIZAÇÃO · 2/3 slots ─────────────┐
│ 💎 Anel da Proteção             [×]    │
│ 💎 Amuleto da Saúde             [×]    │
│ ⚪ Slot vazio                  [+ Sint.] │
└────────────────────────────────────────┘
```

**Comportamento:**
- Click `[×]` → confirma "Des-sintonizar? (libera slot)"
- Click `[+ Sintonizar]` → modal/drawer com lista de items mágicos no inventário não sintonizados
- Tentar sintonizar com 3/3 → bloqueia + prompt "Slots cheios. Des-sintonize um primeiro."

### 3.3 Moedas (row compacta)

```
┌─ MOEDAS ──────────────────────────────────────────────┐
│ 🟠CP 0 · ⚪SP 12 · 🟡EP 0 · 🟡GP 245 · ⚪PP 3  [Ajustar] │
└───────────────────────────────────────────────────────┘
```

**Altura:** 40px
**Click em valor:** abre input inline pra editar
**Tokens de cor:** CP marrom, SP prata, EP dourado-claro, GP dourado, PP platina

### 3.4 Meus Itens (inventário pessoal)

**Header:** busca + filtros
**Row de item (altura 44px):**

```
⚔ Espada Longa +1                    · 1x   [Sint.]
🛡 Escudo                              · 1x   [Equip]
🧪 Poção de Cura                      · 3x   [Usar]
🪙 Mochila                             · 1x
```

**Colunas:**
- Ícone por categoria (arma / armadura / consumível / mochila)
- Nome (Inter 13)
- Quantidade (muted right-aligned)
- Ação rápida contextual (sintonizar, equipar, usar)

**Interações:**
- Click nome → drawer de detalhes (descrição SRD + campos custom)
- Click `[Usar]` em consumível → decrementa quantidade + optimistic
- Swipe-left em mobile → revela `[Editar]` `[Remover]`

### 3.5 Inventário Compartilhado

**Seção "Essenciais" (hardcoded padrão RPG):**
- Poções de Cura (Pequena/Maior/Superior/Suprema)
- Consumíveis (Goodberries, componentes)
- Moedas de grupo (distintas das pessoais)

**Seção "Outros Itens":** lista livre (similar a Meus Itens mas read-only pra outros jogadores).

**Regra de produto:** items do grupo são propostos por qualquer membro, aprovados pelo Mestre, removidos via fluxo de aprovação (já existe em [supabase/migrations/067_inventory_removal_requests.sql](../../supabase/migrations/067_inventory_removal_requests.sql)).

---

## 4. Fluxos específicos do Arsenal

### 4.1 Adicionar item mágico + sintonizar

```
1. [+ Adicionar Item] → AddItemForm
2. Search "espada longa" → auto-complete SRD
3. Seleciona → campos preenchidos
4. Marca "Item mágico" → appears prompt "Sintonizar?"
5. Se sim + slot disponível → sintoniza automaticamente
6. Toast: "Espada Longa +1 adicionada e sintonizada"
7. Badge ⚡ aparece no ribbon (stat change pending)
```

### 4.2 Usar poção em combate

```
1. Jogador está em Herói (modo combate ativo)
2. Click tab Arsenal
3. Find "Poção de Cura" · 3x
4. Click [Usar]
5. Optimistic: 3 → 2
6. Opcional: prompt "Quanto cura? Rolar 2d4+2?"
7. Se aceita roll → broadcast roll event → Mestre vê
8. HP atualiza no ribbon
9. Toast: "Bebeu poção. +8 HP"
10. Voltar para Herói (tab switcher ou botão back)
```

---

## 5. Empty states

### 5.1 Sem items
```
┌──────────────────────────────────┐
│      🧳                          │
│                                  │
│   "A bolsa está vazia"           │
│                                  │
│   Mestre dá loot no combate —    │
│   aparecerá aqui automaticamente │
│                                  │
│   [+ Adicionar Item manualmente] │
└──────────────────────────────────┘
```

### 5.2 Sem habilidades
```
┌──────────────────────────────────┐
│      ⚡                          │
│                                  │
│   "Nenhuma habilidade registrada"│
│                                  │
│   [+ Adicionar Habilidade]       │
└──────────────────────────────────┘
```

### 5.3 Sem sintonização disponível (não-caster sem item mágico)
Card esconde completamente em vez de mostrar "0/0 slots".

---

## 6. Referências código

- [components/player-hq/AbilitiesSection.tsx](../../components/player-hq/AbilitiesSection.tsx) — move pra ArsenalTab
- [components/player-hq/AttunementSection.tsx](../../components/player-hq/AttunementSection.tsx) — move pra ArsenalTab Col B top
- [components/player-hq/BagOfHolding.tsx](../../components/player-hq/BagOfHolding.tsx) — Inv Compartilhado
- [components/player-hq/PersonalInventory.tsx](../../components/player-hq/PersonalInventory.tsx) — Meus Itens
- [components/player-hq/AddItemForm.tsx](../../components/player-hq/AddItemForm.tsx) — mantém
- [components/player-hq/AddAbilityDialog.tsx](../../components/player-hq/AddAbilityDialog.tsx) — mantém
- **Novo:** `components/player-hq/arsenal/ArsenalTab.tsx` — compositor

---

## 7. A11y

- Filtros (Todos/Mágicos/Armas) são `role="tab"` dentro de tablist "Filtros de inventário"
- Rows de item são `<article>` com heading do nome
- Botões contextuais (`[Usar]`, `[Sint.]`) têm aria-label completo ("Usar Poção de Cura, quantidade 3")
- Tab order: header → busca → filtros → lista → col esquerda (habilidades)

---

## 8. Decisões pendentes (ver PRD §A5 Q-NEW-2)

- **Sub-abas internas?** Alternativa: separar Arsenal em [Habilidades] [Inventário] [Sintonização] como sub-tabs. Sally não recomenda — perde o layout 2-col desktop. Mas mobile pode se beneficiar.
- **Ordenação dos items:** por data de adição? por categoria? por alfabeto? MVP: data de adição desc; v1.5: config.
