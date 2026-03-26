# UX Audit Sprint — 2026-03-26

**Objetivo:** Corrigir todos os problemas de usabilidade identificados na auditoria UX completa do app.
**Método:** 3 épicos sequenciais, quick specs por story, implementação imediata.
**Complementa:** `quality-sprint-2026-03-26.md` (sprint anterior focada em funcionalidade)

---

## Contexto

Auditoria UX completa avaliou TODAS as superfícies do app:
- Landing page, Auth, Dashboard, Combat (DM + Player + Guest)
- Oracle (CommandPalette, AI Modal, Search), Compendium
- Presets, Settings, Navbar, Dice History
- Mobile responsiveness, Acessibilidade WCAG 2.1 AA

**Referências de design:** Liberty RO (UI), Kastark + 5e.tools (combat UX)

---

## Épico 1 — Integridade & Acessibilidade (Crítico)

> Problemas que quebram funcionalidade, confiança do usuário ou acessibilidade.

| Story | Descrição | Arquivos Afetados | Status |
|-------|-----------|-------------------|--------|
| 1.1 | Extrair textos hardcoded PT para i18n | `GuestCombatClient`, `GuestBanner`, `DiceHistoryPanel`, `sign-up-form` | ⬜ Pending |
| 1.2 | Corrigir botões "Save"/"Share" no Guest mode (transparência) | `GuestCombatClient` | ⬜ Pending |
| 1.3 | ConditionBadge — adicionar ícones para acessibilidade | `ConditionBadge`, `ConditionSelector` | ⬜ Pending |
| 1.4 | GuestBanner — timer visível SEMPRE (especialmente urgente) | `GuestBanner` | ⬜ Pending |
| 1.5 | Aumentar contraste de inputs (bordas + focus ring) | `globals.css`, componentes de input | ⬜ Pending |
| 1.6 | Guest mode — adicionar focus ring gold no turno atual | `GuestCombatClient` | ⬜ Pending |

---

## Épico 2 — Consistência Visual

> Padronizar componentes para experiência coesa em todas as superfícies.

| Story | Descrição | Arquivos Afetados | Status |
|-------|-----------|-------------------|--------|
| 2.1 | Padronizar botões para `<Button>` component | `CampaignManager`, `ShareSessionButton`, `RulesetSelector`, `PresetEditor` | ⬜ Pending |
| 2.2 | Unificar empty states (ícone + texto + ação) | `PresetsManager`, `PresetLoader`, `SavedEncounters` | ⬜ Pending |
| 2.3 | CommandPalette — converter acentos para gold | `CommandPalette` | ⬜ Pending |
| 2.4 | Consolidar ConditionCard (eliminar duplicata) | `oracle/ConditionCard`, `compendium/ConditionReference` | ⬜ Pending |
| 2.5 | Padronizar loading states (spinner consistente) | `PlayerCharacterManager`, `OnboardingWizard`, `PresetEditor` | ⬜ Pending |
| 2.6 | Unificar modals (migrar custom → Radix Dialog) | `CommandPalette`, `OracleAIModal` | ⬜ Pending |

---

## Épico 3 — Polish & Conversão

> Melhorar conversão guest→auth e experiência power-user.

| Story | Descrição | Arquivos Afetados | Status |
|-------|-----------|-------------------|--------|
| 3.1 | Migração Guest → Auth (importar localStorage) | `sign-up flow`, `GuestCombatClient`, novo hook | ⬜ Pending |
| 3.2 | Keyboard nav em MonsterSearch/SpellSearch | `MonsterSearch`, `SpellSearch` | ⬜ Pending |
| 3.3 | CTA na seção "Como Funciona" da landing | `app/page.tsx` | ⬜ Pending |
| 3.4 | Unificar texto dos CTAs de signup | `app/page.tsx`, `Navbar` | ⬜ Pending |
| 3.5 | `prefers-reduced-motion` nos dados CSS flutuantes | `globals.css` | ⬜ Pending |
| 3.6 | LinkedText em SpellCard e OracleAICard | `SpellCard`, `OracleAICard`, `LinkedText` | ⬜ Pending |

---

## Ordem de Execução

1. **Épico 1** primeiro — impacto direto em usuários reais
2. **Épico 2** segundo — coesão visual
3. **Épico 3** terceiro — polish e conversão

Dentro de cada épico: stories em ordem numérica (já priorizadas por impacto).

### Quick Specs
- [Epic 1 — Integridade & Acessibilidade](quick-specs/epic-1-integridade-acessibilidade.md)
- [Epic 2 — Consistência Visual](quick-specs/epic-2-consistencia-visual.md)
- [Epic 3 — Polish & Conversão](quick-specs/epic-3-polish-conversao.md)

### Execução Detalhada

**Dia 1 — Épico 1 (Crítico):**
1. Story 1.1 — i18n (11 strings em 3 arquivos) ← COMEÇAR AQUI
2. Story 1.4 — GuestBanner timer (1 arquivo, cirúrgico)
3. Story 1.5 — Contraste de inputs (CSS/componente UI)
4. Story 1.6 — Focus ring guest (1 arquivo, 1 linha)
5. Story 1.2 — Botões guest save/share (refatoração + upsell modal)
6. Story 1.3 — ConditionBadge ícones (design + 2 componentes)

**Dia 2 — Épico 2 (Consistência):**
7. Story 2.1 — Padronizar botões (17 instâncias, 5 arquivos)
8. Story 2.2 — Empty states (3 componentes)
9. Story 2.3 — CommandPalette gold (1 arquivo)
10. Story 2.5 — Loading states spinner (4 componentes)
11. Story 2.4 — Consolidar ConditionCard (refatoração)
12. Story 2.6 — Unificar modals (risco maior, fazer por último)

**Dia 3 — Épico 3 (Polish):**
13. Story 3.5 — prefers-reduced-motion (CSS puro)
14. Story 3.3 — CTA "Como Funciona" (1 arquivo)
15. Story 3.4 — Unificar CTAs texto (2 arquivos)
16. Story 3.2 — Keyboard nav buscas (2 componentes)
17. Story 3.6 — LinkedText expansão (2 componentes)
18. Story 3.1 — Migração Guest→Auth (novo componente + fluxo, mais complexa)

---

## Relação com Quality Sprint

O `quality-sprint-2026-03-26.md` foca em **funcionalidade** (undo stack, keyboard shortcuts, skeleton loaders).
Este sprint foca em **usabilidade e consistência visual**.

Stories que se sobrepõem:
- Quality 1.4 (persistir guest localStorage) → complementa UX 3.1 (migração guest→auth)
- Quality 1.6 (empty states com CTAs) → equivale a UX 2.2 (unificar empty states)
- Quality 5.2 (aria-labels condições) → complementa UX 1.3 (ConditionBadge ícones)

**Regra:** Se uma story já está Done no quality sprint, pular aqui. Se está Pending em ambos, priorizar a versão mais abrangente (geralmente a deste sprint UX).
