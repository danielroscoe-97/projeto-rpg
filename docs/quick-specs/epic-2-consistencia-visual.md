# Quick Specs — Épico 2: Consistência Visual

**Sprint:** UX Audit Sprint 2026-03-26
**Prioridade:** ALTA — Padronizar componentes para experiência coesa

---

## Story 2.1 — Padronizar botões para `<Button>` component

**Objetivo:** Zero inline button styles. Todos os botões usam o componente `<Button>`.

### Instâncias a corrigir

**`components/dashboard/CampaignManager.tsx` (1 instância):**
| Linha | Atual | Substituir por |
|-------|-------|---------------|
| ~299 | `className="...text-gold hover:bg-gold/10..."` | `<Button variant="ghost" size="sm">` com `className="text-gold"` |

**`components/session/ShareSessionButton.tsx` (4 instâncias):**
| Linha | Atual | Substituir por |
|-------|-------|---------------|
| ~65 | `className="...bg-gold text-foreground..."` | `<Button variant="gold" size="sm">` |
| ~77 | `className="...bg-gold text-foreground..."` | `<Button variant="gold" size="sm">` |
| ~86 | `className="...bg-white/[0.06]..."` | `<Button variant="ghost" size="sm">` |
| ~106 | Close icon inline | `<Button variant="ghost" size="icon">` |

**`components/session/RulesetSelector.tsx` (2 instâncias):**
| Linha | Atual | Substituir por |
|-------|-------|---------------|
| ~30-44 | Toggle buttons com ternário | `<Button variant={selected ? "gold" : "ghost"} size="sm">` |

**`components/presets/PresetEditor.tsx` (4 instâncias):**
| Linha | Atual | Substituir por |
|-------|-------|---------------|
| ~86 | Back link inline | `<Button variant="link" size="sm">` |
| ~158 | Remove icon inline | `<Button variant="ghost" size="icon">` |
| ~178 | Cancel inline | `<Button variant="ghost">` |
| ~185 | Save gold inline | `<Button variant="gold">` |

**`components/presets/PresetsManager.tsx` (6 instâncias):**
| Linha | Atual | Substituir por |
|-------|-------|---------------|
| ~98 | Create gold inline | `<Button variant="gold">` |
| ~131 | Edit icon | `<Button variant="ghost" size="icon">` |
| ~139 | Duplicate icon | `<Button variant="ghost" size="icon">` |
| ~147 | Delete icon | `<Button variant="ghost" size="icon">` com hover red |
| ~181 | Confirm delete | `<Button variant="destructive" size="sm">` |
| ~188 | Cancel delete | `<Button variant="ghost" size="sm">` |

### Implementação
1. Importar `Button` de `@/components/ui/button` em cada arquivo
2. Substituir `<button>` por `<Button>` com variant/size corretos
3. Manter props existentes (onClick, disabled, aria-label, etc.)
4. Se algum estilo não tem variant, usar `className` adicional (não criar variant novo)

### Critérios de Aceite
- [ ] 17 instâncias corrigidas nos 5 arquivos
- [ ] Zero `<button className="...">` inline nos arquivos listados
- [ ] Aparência visual preservada (mesmas cores, tamanhos, hover states)
- [ ] Todos os botões mantêm `min-h-[44px]` para touch targets

---

## Story 2.2 — Unificar empty states

**Objetivo:** Todas as seções vazias seguem o mesmo padrão visual: ícone + texto + ação.

### Padrão a seguir (baseado no CampaignManager que já está bom):
```tsx
<div className="text-center py-12">
  <IconComponent className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
  <p className="text-muted-foreground text-sm mb-4">{t("empty_message")}</p>
  <Button variant="gold" size="sm" onClick={action}>
    {t("empty_cta")}
  </Button>
</div>
```

### Componentes a corrigir

**`components/presets/PresetsManager.tsx`:**
- Atual: Só texto centralizado
- Corrigir: Adicionar ícone `Package` + botão "Criar primeiro preset"

**`components/presets/PresetLoader.tsx`:**
- Atual: Só texto centralizado
- Corrigir: Adicionar ícone `Package` + mensagem "Nenhum preset encontrado"

**`components/dashboard/SavedEncounters.tsx`:**
- Atual: Ícone + texto + link-botão (quase certo, mas link ao invés de Button)
- Corrigir: Substituir link por `<Button variant="gold" size="sm">`

### Critérios de Aceite
- [ ] 3 componentes atualizados
- [ ] Todos seguem padrão: ícone (h-10 w-10) + texto (text-sm) + Button (gold, sm)
- [ ] i18n para todas as mensagens de empty state

---

## Story 2.3 — CommandPalette — Converter acentos para gold

**Objetivo:** CommandPalette segue o design system gold ao invés de acentos brancos.

### Mudanças em `components/oracle/CommandPalette.tsx`

| Elemento | Atual | Novo |
|----------|-------|------|
| Search input focus | `ring-white/20` | `ring-gold/40` |
| Filter pills active | `bg-white/[0.12] text-white` | `bg-gold/20 text-gold` |
| Filter pills inactive | `bg-white/[0.06] text-white/60` | `bg-white/[0.06] text-muted-foreground` |
| Selected result bg | `bg-white/[0.08]` | `bg-gold/10` |
| Result hover | `hover:bg-white/[0.04]` | `hover:bg-gold/5` |
| Group headers | `text-white/40` | `text-gold/60` |
| Shortcut kbd | `bg-white/[0.06]` | `bg-gold/10 text-gold/70` |

### Implementação
1. Abrir CommandPalette.tsx
2. Substituir cada classe `white/[...]` relevante pela versão gold
3. Testar visualmente que o contraste se mantém
4. Manter backdrop e estrutura inalterados

### Critérios de Aceite
- [ ] Acentos gold no CommandPalette
- [ ] Contraste mínimo mantido (legibilidade)
- [ ] Visualmente alinhado com OracleFAB e OracleSearchTrigger

---

## Story 2.4 — Consolidar ConditionCard

**Objetivo:** Um único ConditionCard usado em oracle E compendium.

### Problema Atual
- `components/oracle/ConditionCard.tsx` — versão floating card (stat-card-5e.css)
- `components/compendium/ConditionReference.tsx` — ConditionCard local aninhado

### Estratégia
1. O `oracle/ConditionCard.tsx` já é o componente canônico
2. Adicionar prop `variant="reference"` para o estilo do compendium (borda colorida, expansível)
3. Em `ConditionReference.tsx`, substituir o componente local pelo import do oracle

### Implementação

**`components/oracle/ConditionCard.tsx`:**
1. Adicionar variante `"reference"` além de `"inline"` e `"card"`
2. Variante reference: borda colorida esquerda, texto preview, expansível
3. Alinhar mapa de cores com `CONDITION_COLORS` do ConditionBadge

**`components/compendium/ConditionReference.tsx`:**
1. Remover componente ConditionCard local
2. Importar de `@/components/oracle/ConditionCard`
3. Usar `variant="reference"` com props de expand/pin

### Nota sobre escopo de condições
- Combat: 13 condições
- Compendium: 15 condições (inclui Deafened, Exhaustion)
- O ConditionCard consolidado deve suportar TODAS 15

### Critérios de Aceite
- [ ] Um único ConditionCard em `components/oracle/`
- [ ] 3 variantes: inline, card, reference
- [ ] Compendium usa o componente importado
- [ ] 15 condições suportadas (13 combat + Deafened + Exhaustion)
- [ ] Cores alinhadas entre badge e card

---

## Story 2.5 — Padronizar loading states

**Objetivo:** Padrão único de loading em todos os forms: spinner + texto.

### Padrão a seguir
```tsx
<Button variant="gold" disabled={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {t("saving")}
    </>
  ) : (
    t("save")
  )}
</Button>
```

### Componentes a padronizar

| Componente | Atual | Corrigir |
|------------|-------|---------|
| `PlayerCharacterManager` | Texto muda para "saving" | Adicionar `Loader2` spinner |
| `OnboardingWizard` | Texto muda para "creating" | Adicionar `Loader2` spinner |
| `PresetEditor` | Texto muda para "saving" | Adicionar `Loader2` spinner |
| `CampaignManager` | Texto muda | Adicionar `Loader2` spinner |

### Critérios de Aceite
- [ ] Todos os botões de ação mostram spinner durante loading
- [ ] Ícone `Loader2` do lucide-react com `animate-spin`
- [ ] Texto de loading preservado ao lado do spinner
- [ ] Botão desabilitado durante loading

---

## Story 2.6 — Unificar modals (custom → Radix Dialog)

**Objetivo:** Todos os modals usam Radix Dialog para comportamento consistente.

### Modals Custom Atuais

| Modal | Arquivo | Pattern Atual |
|-------|---------|---------------|
| CommandPalette | `oracle/CommandPalette.tsx` | Custom backdrop + cmdk |
| OracleAIModal | `oracle/OracleAIModal.tsx` | Custom backdrop + custom dialog |

### Modals Radix Existentes (referência)
- `SpellDescriptionModal` → Radix Dialog
- `ConditionRulesModal` → Radix Dialog
- `KeyboardCheatsheet` → Radix Dialog
- `VersionSwitchConfirm` → Radix AlertDialog

### Implementação

**`OracleAIModal.tsx`:**
1. Substituir backdrop custom por `<Dialog>` do Radix
2. Manter conteúdo interno intacto
3. Backdrop: `bg-black/60 backdrop-blur-sm` (já padrão Radix)

**`CommandPalette.tsx`:**
1. Manter cmdk library (é especializada para command menus)
2. Apenas padronizar o backdrop para usar mesmo estilo dos Radix dialogs
3. NÃO migrar para Radix Dialog — cmdk tem comportamento específico necessário

### Critérios de Aceite
- [ ] OracleAIModal usa Radix Dialog
- [ ] CommandPalette mantém cmdk mas com backdrop padronizado
- [ ] Comportamento de fechar (Esc, click fora) consistente
- [ ] Transições de entrada/saída padronizadas
