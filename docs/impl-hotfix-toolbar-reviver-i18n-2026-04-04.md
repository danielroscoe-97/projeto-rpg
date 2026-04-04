# Hotfix: Toolbar, Reviver e i18n — Resumo de Implementação

**Data:** 2026-04-04
**Arquivos alterados:** 4 | **+71 / -39**

## Resumo

Correção de 3 bugs visuais/UX detectados em QA: chaves de tradução cruas no `/try`, botão Reviver invisível em combatentes derrotados, e botão "Próximo Turno" empurrado para segunda linha quando toolbar tem muitos botões. Também inclui timer pause (pré-existente no diff).

## Alterações

| # | Problema | Arquivo | Solução |
|---|----------|---------|---------|
| 1 | Chaves de tradução cruas (`footer_pricing`, `footer_login`, `footer_signup`) aparecendo no header do `/try` | `app/try/layout.tsx` | Corrigido namespace: `getTranslations("common")` → `getTranslations("nav")` |
| 2 | Botão Reviver quase invisível em combatentes derrotados (herda `opacity-50 grayscale-[50%]` do parent) | `components/combat/CombatantRow.tsx` | Cores mais fortes (`bg-emerald-500/50`, `text-emerald-200`) + `brightness-150` para compensar opacity do parent |
| 3 | "Próximo Turno" empurrado para 2a linha quando toolbar tem 11+ botões | `components/guest/GuestCombatClient.tsx` + `components/combat/CombatSessionClient.tsx` | Toolbar dividida em 2 rows: Row 1 = round info + CTA (`shrink-0`), Row 2 = controles secundários com `overflow-x-auto scrollbar-hide` |

## Regra de Paridade Aplicada

Fix 3 (toolbar) implementado nos **2 clients** conforme Combat Parity Rule:
- **Guest** → `GuestCombatClient.tsx`
- **Auth** → `CombatSessionClient.tsx`

Fix 2 (Reviver) já é componente compartilhado (`CombatantRow.tsx`), cobre todos os modos.

## Notas de Teste

- [ ] `/try` — verificar que header mostra textos traduzidos (PT e EN), não chaves cruas
- [ ] Combate com combatente derrotado — botão Reviver deve ser claramente visível mesmo com row escurecida
- [ ] Toolbar com 8+ combatentes — "Próximo Turno" deve permanecer visível na 1a linha, sem quebra
- [ ] Controles secundários devem ter scroll horizontal em telas estreitas
- [ ] Testar em mobile (375px) e desktop (1280px+)
- [ ] Verificar paridade visual entre Guest (`/try`) e Auth (sessão logada)
