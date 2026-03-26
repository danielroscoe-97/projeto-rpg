# Quick Specs — Épico 1: Integridade & Acessibilidade

**Sprint:** UX Audit Sprint 2026-03-26
**Prioridade:** CRÍTICA — Impacto direto em funcionalidade e confiança do usuário

---

## Story 1.1 — Extrair textos hardcoded PT para i18n

**Objetivo:** Zero strings em português fora dos arquivos `messages/*.json`.

### Strings a extrair

**`components/guest/GuestCombatClient.tsx`:**
| Linha | Texto Hardcoded | Key i18n |
|-------|----------------|----------|
| ~687 | "Curtiu a Taverna?" | `guest.footer_enjoyed` |
| ~693 | "Crie sua conta e salve suas campanhas →" | `guest.footer_create_account` |

**`components/dice/DiceHistoryPanel.tsx`:**
| Linha | Texto Hardcoded | Key i18n |
|-------|----------------|----------|
| ~47 | "Histórico de rolls" (title) | `dice.history_title` |
| ~48 | "Histórico de rolls" (aria-label) | `dice.history_title` |
| ~48 | "(novos)" | `dice.history_new` |
| ~78 | "Histórico de Rolls" (header) | `dice.history_title` |
| ~85 | "Limpar histórico" (title) | `dice.clear_tooltip` |
| ~87 | "Limpar" (button) | `dice.clear_button` |
| ~94 | "Fechar histórico" (title) | `dice.close_tooltip` |
| ~104 | "Nenhum roll ainda." | `dice.empty_message` |

**`components/sign-up-form.tsx`:**
| Linha | Texto Hardcoded | Key i18n |
|-------|----------------|----------|
| ~115 | "Min. 6 caracteres" (placeholder) | `auth.password_min_chars` |
| ~135 | "Repita" (placeholder) | `auth.repeat_password` |

### Implementação

1. Adicionar chaves em `messages/pt-BR.json` e `messages/en.json`
2. Em cada componente, importar `useTranslations` com o namespace correto
3. Substituir strings hardcoded por `t("key")`
4. DiceHistoryPanel: também corrigir locale hardcoded `"pt-BR"` no `toLocaleTimeString` — usar locale do next-intl

### Critérios de Aceite
- [ ] Zero strings PT fora de `messages/`
- [ ] Versões EN existem para todas as chaves
- [ ] `DiceHistoryPanel` usa locale dinâmico

---

## Story 1.2 — Corrigir botões "Save"/"Share" no Guest mode

**Objetivo:** Botões não mentem mais. Transparência total sobre o que requer conta.

### Problema Atual
- Botão "Save" abre upsell modal ao invés de salvar
- Botão "Share" abre upsell modal ao invés de compartilhar
- Usuário sente que foi enganado

### Implementação

**`components/guest/GuestCombatClient.tsx`:**

1. **Botão Save** → Mudar texto para incluir indicador:
   - Ícone de cadeado (Lock do lucide-react) + texto `t("guest.save_requires_account")`
   - OU desabilitar visualmente com tooltip: "Crie uma conta para salvar"
   - Estilo: `variant="ghost"` com `opacity-60` + ícone Lock

2. **Botão Share** → Mesmo tratamento:
   - Ícone Lock + `t("guest.share_requires_account")`
   - Tooltip explicativo

3. **GuestUpsellModal** — usar prop `trigger` que já existe mas é ignorada:
   - `trigger="save"` → Copy focada em persistência
   - `trigger="player-link"` → Copy focada em multiplayer
   - Personalizar título e mensagem por trigger

### Critérios de Aceite
- [ ] Botões indicam visualmente que requerem conta (ícone Lock)
- [ ] Tooltip explica o motivo
- [ ] Modal de upsell tem copy personalizada por trigger
- [ ] Zero sensação de "bait and switch"

---

## Story 1.3 — ConditionBadge — Adicionar ícones para acessibilidade

**Objetivo:** Condições distinguíveis SEM depender de cor (WCAG 2.1 AA 1.4.1).

### Mapeamento de Ícones (lucide-react)

| Condição | Cor Atual | Ícone Sugerido | Lucide Icon |
|----------|-----------|---------------|-------------|
| Blinded | bg-gray-600 | Olho riscado | `EyeOff` |
| Charmed | bg-pink-700 | Coração | `Heart` |
| Frightened | bg-orange-700 | Fantasma/Alerta | `Ghost` ou `AlertTriangle` |
| Grappled | bg-yellow-700 | Mão/Corrente | `Grip` |
| Incapacitated | bg-red-800 | X circular | `CircleX` |
| Invisible | bg-blue-800 | Olho | `Eye` |
| Paralyzed | bg-purple-700 | Raio | `Zap` |
| Petrified | bg-stone-600 | Montanha/Pedra | `Mountain` |
| Poisoned | bg-green-800 | Gota/Caveira | `Droplet` |
| Prone | bg-amber-800 | Seta baixo | `ArrowDown` |
| Restrained | bg-cyan-800 | Corrente | `Link` |
| Stunned | bg-violet-700 | Estrela | `Star` |
| Unconscious | bg-slate-700 | Lua/Sono | `Moon` |

### Implementação

**`components/oracle/ConditionBadge.tsx`:**
1. Criar mapa `CONDITION_ICONS: Record<string, LucideIcon>`
2. Renderizar ícone de 12px ao lado do texto dentro do badge
3. Manter cores existentes (ícone é aditivo, não substitutivo)
4. Exportar `CONDITION_ICONS` para reuso

**`components/combat/ConditionSelector.tsx`:**
1. Importar `CONDITION_ICONS` do ConditionBadge
2. Renderizar ícone ao lado do nome na grid de seleção

### Critérios de Aceite
- [ ] Cada condição tem ícone único visível no badge
- [ ] Ícones aparecem tanto no badge quanto no selector
- [ ] Funciona em tamanho `text-xs` sem quebrar layout
- [ ] Distinguível sem cor por pessoa daltônica

---

## Story 1.4 — GuestBanner — Timer visível SEMPRE

**Objetivo:** Mestre sempre sabe quanto tempo resta na sessão guest.

### Problema Atual
Quando `isUrgent = true` (≤10min), o timer desaparece. Justamente quando é mais importante.

### Implementação

**`components/guest/GuestBanner.tsx`:**
1. Timer SEMPRE visível, independente do estado urgent
2. Quando urgente: timer em `text-red-300 font-bold` + ícone de relógio animado
3. Quando normal: timer em `font-mono text-sm`
4. Adicionar `aria-live="polite"` no elemento do timer

### Critérios de Aceite
- [ ] Timer visível em TODOS os estados (normal, urgente, quase expirando)
- [ ] Timer tem `aria-live="polite"` para screen readers
- [ ] Visual urgente é mais proeminente, não menos

---

## Story 1.5 — Aumentar contraste de inputs

**Objetivo:** Bordas e focus rings atingem ratio 3:1 (WCAG AA).

### Mudanças

**`app/globals.css` ou `tailwind.config.ts`:**
1. Input borders: `white/[0.06]` → `white/[0.15]` (de ~1.3:1 para ~3.2:1)
2. Focus ring: `gold/30` → `gold/60` (de ~2:1 para ~4:1)
3. Focus border: `gold/40` → `gold/70`

**Componentes afetados (todos que usam inputs):**
- `components/sign-up-form.tsx`
- `components/login-form.tsx`
- `components/forgot-password-form.tsx`
- `components/combat/AddCombatantForm.tsx`
- `components/combat/StatsEditor.tsx`
- `components/dashboard/CampaignManager.tsx`
- `components/dashboard/PlayerCharacterManager.tsx`
- `components/presets/PresetEditor.tsx`

### Implementação
1. Verificar se inputs usam classes Tailwind diretas ou o componente `<Input>` do UI
2. Se usam `<Input>`, alterar apenas `components/ui/input.tsx`
3. Se usam classes diretas, criar token CSS e substituir
4. Testar com Chrome DevTools contrast checker

### Critérios de Aceite
- [ ] Bordas de input visíveis em fundo escuro (ratio ≥ 3:1)
- [ ] Focus ring claramente visível (ratio ≥ 3:1)
- [ ] Testado com DevTools contrast checker
- [ ] Nenhum input fica "sumindo" no background

---

## Story 1.6 — Guest mode — Focus ring no turno atual

**Objetivo:** Combatente do turno atual tem destaque visual no guest mode (paridade com auth).

### Problema Atual
- Auth mode: `ring-1 ring-gold/40` no combatente ativo
- Guest mode: zero indicação visual

### Implementação

**`components/guest/GuestCombatClient.tsx`:**
1. Encontrar onde `CombatantRow` é renderizado no loop de combatentes
2. Adicionar prop ou className condicional: se `index === currentTurn` → `ring-1 ring-gold/40`
3. Mesmo estilo do `CombatSessionClient.tsx`

### Critérios de Aceite
- [ ] Combatente ativo tem ring gold no guest mode
- [ ] Visual idêntico ao auth mode
- [ ] Funciona ao avançar turno
