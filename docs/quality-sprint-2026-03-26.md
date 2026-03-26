# Quality Sprint — 2026-03-26

**Objetivo:** Otimizar e polir todas as funcionalidades existentes antes de avançar para novos PRDs.
**Abordagem:** 5 streams paralelos sem dependência de arquivos, merge sequencial.

---

## Visão Geral

O sprint foi definido a partir de um audit completo de UX/produto cobrindo:
- Combat flow (DM + Player)
- Funil de conversão (Guest → Signup → Onboarding → First Combat)
- Oracle AI & Compêndio
- Acessibilidade (WCAG 2.1 AA)
- Mobile responsiveness

**Proposta de valor reforçada:** Combat tracker gratuito, real-time, sem fricção — DM no laptop, players no celular.

---

## Stream 1 — Auth & Funil de Conversão

**Escopo de arquivos:**
- `app/auth/error/page.tsx`
- `app/auth/sign-up-success/page.tsx`
- `app/auth/login/page.tsx`, `app/auth/sign-up/page.tsx`
- `app/page.tsx`
- `components/guest/GuestBanner.tsx`
- `components/guest/GuestCombatClient.tsx`
- `components/guest/GuestUpsellModal.tsx`
- `components/dashboard/OnboardingWizard.tsx`
- `components/dashboard/SavedEncounters.tsx`
- `components/dashboard/CampaignManager.tsx`

### Tasks

| # | Task | Status | Notas |
|---|------|--------|-------|
| 1.1 | Auth error page com botão "Voltar ao login" + i18n | ✅ Done | Convertida para client component com useSearchParams |
| 1.2 | Sign-up success com checklist visual (email/spam/link) + botão gold | ✅ Done | Checklist 3 passos, resend button gold, link back to login |
| 1.3 | Estender guest mode de 30min → 60min, urgência de 5min → 10min | ✅ Done | |
| 1.4 | Persistir estado guest em localStorage + menção no upsell modal | ⬜ Pending | |
| 1.5 | Quick Combat como caminho padrão no onboarding | ⬜ Pending | |
| 1.6 | Empty states com CTAs acionáveis (SavedEncounters, CampaignManager) | ⬜ Pending | |
| 1.7 | Login/signup tab switcher em mobile | ⬜ Pending | |
| 1.8 | Prova social na landing page | ⬜ Pending | |

---

## Stream 2 — Oracle & Compêndio

**Escopo de arquivos:**
- `components/oracle/OracleAIModal.tsx`
- `components/oracle/MonsterSearch.tsx`
- `components/oracle/CommandPalette.tsx`
- `app/api/oracle-ai/route.ts`

### Tasks

| # | Task | Status | Notas |
|---|------|--------|-------|
| 2.1 | Botão "Tentar novamente" no Oracle AI Modal | ✅ Done | RefreshCw icon, re-executa handleAsk |
| 2.2 | Fallback link pro compêndio quando Oracle falha | ✅ Done | Link com query param ?q= |
| 2.3 | Subir rate limit de 10 → 20/min | ⬜ Pending | |
| 2.4 | Ativar prop onAddToCombat no MonsterSearch + plumbing no CommandPalette | ⬜ Pending | |

---

## Stream 3 — Combate DM (Core Loop)

**Escopo de arquivos:**
- `components/combat/HpAdjuster.tsx`
- `components/combat/ConditionSelector.tsx`
- `components/combat/CombatantRow.tsx`
- `components/combat/StatsEditor.tsx`
- `components/session/EncounterSetup.tsx` (ou `components/combat/EncounterSetup.tsx`)
- `lib/hooks/useCombatKeyboardShortcuts.ts`
- `lib/stores/combat-store.ts`

### Tasks

| # | Task | Status | Notas |
|---|------|--------|-------|
| 3.1 | HP Adjuster lembrar último modo (module-level var) | ✅ Done | lastUsedMode + setLastHpMode export |
| 3.2 | Condition Selector remover auto-close 300ms (batch-apply) | ✅ Done | Removido setTimeout, mantido botão "Pronto" |
| 3.3 | Atalhos de teclado D (dano) e H (cura) | ⬜ Pending | |
| 3.4 | Flash visual de confirmação ao aplicar dano/cura | ⬜ Pending | |
| 3.5 | Undo stack para ações de HP (Ctrl+Z) | ⬜ Pending | |
| 3.6 | Nome obrigatório para encounters | ⬜ Pending | |
| 3.7 | Duplicar combatente no setup | ⬜ Pending | |
| 3.8 | Preset loader proeminente no setup | ⬜ Pending | |

---

## Stream 4 — Player View (Motor Viral)

**Escopo de arquivos:**
- `components/player/PlayerInitiativeBoard.tsx`
- `components/player/PlayerJoinClient.tsx`
- `components/player/SyncIndicator.tsx`
- `lib/realtime/broadcast.ts`
- `lib/realtime/use-realtime-channel.ts`

### Tasks

| # | Task | Status | Notas |
|---|------|--------|-------|
| 4.1 | Combat log no player view (últimos 5 entries, cores por tipo) | ✅ Done | CombatLogEntry interface exportada, formatRelativeTime |
| 4.2 | Notificação de turno com vibração + banner "É a sua vez!" | ✅ Done | navigator.vibrate(200), banner 3s, pulse animation |
| 4.3 | Audit mobile touch targets (min-h-[44px]) | ⬜ Pending | |
| 4.4 | Mensagem clara de token/sessão expirada | ⬜ Pending | |
| 4.5 | Canal DM → Players (broadcast dm:message) | ⬜ Pending | |

---

## Stream 5 — Acessibilidade & Polish

**Escopo de arquivos:**
- `lib/hooks/useCombatKeyboardShortcuts.ts` (conflito potencial com Stream 3)
- `components/combat/ConditionSelector.tsx` (aria-labels — já parcialmente feito)
- `components/compendium/MonsterBrowser.tsx`
- `components/compendium/SpellBrowser.tsx`
- `components/ui/skeletons/` (NOVOS arquivos)
- `app/app/dashboard/page.tsx`
- `app/app/compendium/page.tsx`

### Tasks

| # | Task | Status | Notas |
|---|------|--------|-------|
| 5.1 | Keyboard reorder (Ctrl+↑/↓) no combat | ⬜ Pending | |
| 5.2 | Aria-labels nos badges de condição (remover/toggle) | ✅ Partial | ConditionSelector done (condition_remove_aria, condition_add_aria), falta CombatantRow badges |
| 5.3 | Skeleton loaders (Dashboard, Combat, Compendium) | ⬜ Pending | Diretório components/ui/skeletons/ já existe |
| 5.4 | Aria-live regions nos resultados de busca do compêndio | ⬜ Pending | |

---

## Ordem de Merge

1. **Stream 1** (Auth/Funil) — zero conflito com outros
2. **Stream 2** (Oracle) — zero conflito com outros
3. **Stream 3** (Combate) — conflito possível em i18n files
4. **Stream 4** (Player) — conflito possível em i18n files
5. **Stream 5** (A11y) — merge por último, resolve conflitos pontuais

**Único ponto de conflito real:** `messages/pt-BR.json` e `messages/en.json` — cada stream adiciona chaves em namespaces diferentes, não colidem em chaves específicas.

---

## i18n Keys Adicionadas

### auth namespace
- `error_title` — "Algo deu errado"
- `error_code` — "Código de erro: {code}"
- `error_unspecified` — "Um erro não especificado ocorreu."
- `error_help` — "Se o problema persistir, tente criar uma nova conta."
- `error_back_to_login` — "Voltar ao login"
- `checklist_open_email` — "Abra seu email"
- `checklist_check_spam` — "Verifique a pasta de spam"
- `checklist_click_link` — "Clique no link de confirmação"
- `email_delay_notice` — "O email pode levar até 2 minutos para chegar"

### oracle_ai namespace
- `retry` — "Tentar novamente"
- `compendium_fallback` — "Ou tente buscar no Compêndio →"

### combat namespace
- `condition_remove_aria` — "Remover condição {name}"
- `condition_add_aria` — "Aplicar condição {name}"

### player namespace
- `combat_log_title` — "Log de Combate"
- `log_time_now` — "agora"
- `log_time_minutes` — "{min}min atrás"
- `your_turn_banner` — "É a sua vez!"

---

## Decisões de Design

1. **Guest mode 60min (era 30min)** — 30 minutos era agressivo demais para uma sessão real de combate
2. **HP Adjuster remember mode** — Implementado via module-level variable (não localStorage) porque só precisa persistir dentro da sessão do tab
3. **Condition Selector sem auto-close** — DMs precisam aplicar múltiplas condições de uma vez; botão "Pronto" é suficiente
4. **Combat log no player view** — Diferenças de HP detectadas via comparação de state anterior vs novo (diff-based)
5. **Vibração no turno do player** — navigator.vibrate com try-catch (não disponível em todos os browsers, fallback silencioso)
6. **Auth error page client component** — Convertida de server component para client component para usar useTranslations + useSearchParams

---

## Backlog (Pós-Sprint)

Itens identificados no audit mas não incluídos neste sprint:

- [ ] Social auth (Google/Discord) — reduz fricção de signup drasticamente
- [ ] Import de D&D Beyond character sheets
- [ ] Guest session resume após signup (import localStorage → DB)
- [ ] Encounter templates / duplicate encounter completo
- [ ] Combat undo/redo completo (beyond HP — incluir conditions, initiative, etc.)
- [ ] PWA / mobile app wrapper
- [ ] Analytics funnel tracking
- [ ] DM → Player messaging bidirectional
- [ ] Spell restriction by character class/level na player view
- [ ] Keyboard-only drag reorder (beyond Ctrl+Arrow)
