# Spec: Monster Search Panel — UX Redesign

**Data**: 2026-04-11
**Origem**: Feedback de beta testers — "Contra-intuitivo adicionar monstro / grupo"
**Contexto**: Party Mode (Sally UX + Winston Arch + John PM)

---

## Problema

O layout atual do `MonsterSearchPanel` usa **duas linhas por resultado**:

```
Linha 1: [Token] [Nome + CR + badges]                    [📖 Ver Ficha]
Linha 2:              [- 1 +]  [Adicionar] ou [Adicionar ×3 Grupo]
```

**Feedback recebido:**
- Botões de adicionar estão **longe demais** do nome do monstro
- Não é **fácil de visualizar** pro Mestre
- **Contra-intuitivo** — DM precisa descer o olho pra segunda linha pra agir
- Uso real é **50/50** entre adicionar individual e grupo

---

## Solução: Layout Inline Único

Colapsar tudo numa **única linha por resultado**:

```
[Token 36px] [Nome + CR + tipo]  ···espaço···  [📖] [- 1 +] [Adicionar ▸]
```

### Mudanças visuais

| Elemento | Antes | Depois |
|----------|-------|--------|
| Token + Info | Linha 1 esquerda | Mesma posição |
| Ver Ficha | Linha 1 direita, texto "📖 Ver Ficha" | Ícone-only `📖` com tooltip |
| Stepper `[- 1 +]` | Linha 2, offset 48px | Inline direita, sempre visível |
| Botão Adicionar | Linha 2, após stepper | Inline direita, último elemento |
| Stats (HP, AC, tipo) | Sublinha dentro da info | Mantém sublinha dentro do bloco info |

### Ordem visual (esquerda → direita)

```
[Token] [Info block]  ···flex-1···  [📖] [Stepper] [Adicionar]
```

**Racional**: Segue F-pattern de leitura — info à esquerda, ações à direita. O 📖 fica antes do stepper porque é ação exploratória (olhar antes de decidir). Stepper + Adicionar ficam juntos porque são a ação principal.

### Botão Adicionar — comportamento contextual

| Quantidade | Cor | Label | Ação |
|-----------|-----|-------|------|
| 1 (default) | Verde (`emerald-600`) | "Adicionar" | `onSelectMonster(monster)` |
| >1 | Roxo (`purple-600`) + glow | "Adicionar ×N" | `onSelectMonsterGroup(monster, qty)` |

---

## Comportamento pós-adição: Setup vs Combat

### Pré-combate (Setup)

| Aspecto | Comportamento |
|---------|---------------|
| Lista de resultados | **Permanece aberta** |
| Campo de busca | **Mantém o texto** |
| Stepper da row adicionada | **Reseta para 1** |
| Feedback visual | **Toast via sonner**: `✓ Goblin ×3 adicionado` |

### In-combat

| Aspecto | Comportamento |
|---------|---------------|
| Lista de resultados | **Fecha** (comportamento atual) |
| Campo de busca | **Limpa** (comportamento atual) |
| Stepper | **Reseta** |
| Feedback | Monstro aparece na lista de combatentes |

### Implementação

Nova prop no `MonsterSearchPanel`:
```ts
keepOpenAfterAdd?: boolean  // default: false (combat behavior)
```

Quando `true` (setup):
- `handleSelect` / `handleSelectGroup` NÃO chamam `setQuery("")` nem `setResults([])`
- Apenas resetam `rowQuantities[monster.id]` para 1
- Disparam toast: `toast.success(t("monster_added_toast", { name, qty }))`

---

## Responsividade

| Viewport | Comportamento |
|----------|---------------|
| Desktop/Tablet (>640px) | Tudo inline numa linha |
| Mobile (<640px) | `flex-wrap` — stepper + botão quebram pra segunda linha naturalmente |

Usar `flex-wrap` com `gap-2` garante que em telas estreitas o layout degrada graciosamente sem CSS extra.

---

## Impacto no Onboarding Tour

### Steps afetados (tour-steps.ts)

| Step | ID | Target | Impacto |
|------|----|--------|---------|
| 1 | `monster-search` | `[data-tour-id="monster-search"]` | Nenhum — é o container do input |
| 2 | `monster-result` | `[data-tour-id="monster-search"]` | **Baixo** — tooltip position="bottom" continua válido |
| 3 | `monster-added` | `[data-tour-id="combatant-list"]` | Nenhum — target é a lista de combatentes |
| 4 | `add-row` | `[data-tour-id="add-row"]` | Nenhum — é o form de manual add |
| 5 | `import-hint` | `[data-tour-id="import-content"]` | Nenhum — é o CTA de import |

### Auto-actions no TourProvider.tsx

| Auto-action | Impacto | Ajuste necessário |
|-------------|---------|-------------------|
| Auto-search "goblin" (step 2) | Nenhum — busca pelo input via `[data-tour-id="monster-search"] input` | Nenhum |
| Auto-click add (step 3) | **Verificar** — busca `[data-tour-id="add-monster-btn"]` | `data-tour-id="add-monster-btn"` precisa estar no botão Adicionar (já está, apenas muda de posição no DOM) |
| Undo auto-add (back step) | Nenhum — usa store, não DOM | Nenhum |

### Conclusão Tour

**Impacto: MÍNIMO**. Os `data-tour-id` existentes continuam nos mesmos elementos semânticos, apenas mudam de posição no layout. O auto-click no `add-monster-btn` continua funcionando pois o seletor é por atributo, não por posição.

**Única verificação necessária**: Após implementação, rodar o tour completo manualmente pra confirmar que os tooltips apontam pra posição correta visualmente.

---

## Checklist de Implementação

### Fase 1 — Layout inline
- [ ] Refatorar `<li>` de cada resultado: colapsar 2 divs em 1 div `flex items-center`
- [ ] Mover stepper + botão Adicionar para dentro da linha principal
- [ ] Converter "Ver Ficha" de texto+ícone para ícone-only com Tooltip
- [ ] Adicionar `flex-wrap` para responsividade mobile
- [ ] Manter todos os `data-tour-id` e `data-testid` nos mesmos elementos

### Fase 2 — Comportamento pós-adição
- [ ] Adicionar prop `keepOpenAfterAdd?: boolean` ao `MonsterSearchPanel`
- [ ] Condicionar `setQuery("")` e `setResults([])` ao valor dessa prop
- [ ] Adicionar toast de confirmação via sonner no modo setup
- [ ] Resetar apenas `rowQuantities[monster.id]` (não toda a row)
- [ ] Passar `keepOpenAfterAdd={true}` nos pontos de setup, `false` no combat

### Fase 3 — Verificação
- [ ] Testar tour completo (5 steps do setup) — tooltips posicionados corretamente
- [ ] Testar auto-click do goblin no tour
- [ ] Verificar responsividade mobile (< 640px)
- [ ] Rodar e2e tests existentes: `lair-actions.spec.ts` e outros combat specs
- [ ] Verificar parity: Guest (`/try`) usa MonsterSearchPanel? Se sim, testar lá também

### Guest Parity Check
O `GuestCombatClient` usa `MonsterSearchPanel` — a mudança de layout se propaga automaticamente.
O comportamento `keepOpenAfterAdd` precisa ser passado corretamente no contexto guest setup.

---

## Arquivos afetados

| Arquivo | Tipo de mudança |
|---------|----------------|
| `components/combat/MonsterSearchPanel.tsx` | Layout + nova prop + toast |
| Componente pai (setup) | Passar `keepOpenAfterAdd={true}` |
| Componente pai (combat) | Default `false`, sem mudança |
| `messages/pt.json` | Nova chave `combat.monster_added_toast` |
| `messages/en.json` | Nova chave `combat.monster_added_toast` |

---

## Não incluso (fora do escopo)

- Animação/flash ao adicionar (bucket future)
- Drag-and-drop de resultados pra lista
- Reordenação de resultados por relevância
