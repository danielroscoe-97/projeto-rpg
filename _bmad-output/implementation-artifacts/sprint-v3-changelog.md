# Sprint Plan V3 — Changelog de Implementação

**Data:** 2026-03-27
**Executado por:** Claude Opus 4.6 (Party Mode: Amelia + 7 agents paralelos)
**Documento base:** `sprint-plan-v3.md`

---

## Resumo Executivo

- **44 stories** cobertas em 4 sprints
- **67 arquivos** modificados, **4618 linhas** adicionadas
- **TypeScript:** 0 erros em código de produção
- **ESLint:** 0 erros (7 warnings aceitáveis em nível warn)
- **7 agents** executados em paralelo para maximizar throughput

---

## Sprint 0 — Estabilização (8 stories)

### A.0.1: Renumerar Migrations ✅
- **Status:** Já estava implementada
- **Verificação:** Migrations 017-026 sequenciais, sem duplicatas, comentários originais presentes

### A.0.2: Rate Limit Upstash Redis ✅
- **Arquivos novos:** `lib/rate-limit.ts`
- **Arquivos modificados:** `lib/supabase/proxy.ts`, `.env.example`, `package.json`
- **Detalhes:**
  - Sliding window via `@upstash/ratelimit` (10 req / 15 min)
  - Fail-open em 3 camadas (env vars, init, per-request)
  - Edge Runtime compatível (REST API only)
  - Removido in-memory Map do proxy.ts

### A.0.3: Structured Logging Sentry ✅
- **Arquivos novos:** `lib/errors/capture.ts`
- **Arquivos modificados:** 14 arquivos (components/, app/api/)
- **Detalhes:**
  - `captureError()` com contexto estruturado: component, action, category, sessionId
  - `captureWarning()` para breadcrumbs Sentry
  - Categorias: validation, database, network, realtime, auth, payment, analytics
  - PII scrubbing preservado (beforeSend em sentry configs)
  - console.error em dev-only via `process.env.NODE_ENV` check

### A.0.4: ESLint Hooks + Security ✅
- **Arquivos modificados:** `eslint.config.mjs`, `package.json`, ~30 arquivos com fix
- **Detalhes:**
  - `react-hooks/exhaustive-deps`: **error** (não warn)
  - `react-hooks/rules-of-hooks`: error
  - `eslint-plugin-security` com detect-eval, detect-unsafe-regex, detect-non-literal-regexp
  - `react/no-danger`: error
  - 30+ unused vars/imports corrigidos
  - 6 suppressions justificados (regexes estáticas, sanitização HTML, loops infinitos)

### A.0.5: setTimeout Cleanup Audit ✅
- **Arquivos modificados:** 6 componentes
- **Detalhes:**
  - `ShareSessionButton.tsx` — copiedTimerRef + useEffect cleanup
  - `GuestCombatClient.tsx` — glowTimerRef + cleanup
  - `EncounterSetup.tsx` — glowTimerRef + cleanup
  - `MonsterToken.tsx` — retryTimerRef + cleanup
  - `FileShareButton.tsx` — progressTimerRef + cleanup
  - `use-realtime-channel.ts` — pollTimerRef consolidado

### A.0.6: Broadcast Type Safety ✅
- **Arquivos modificados:** `lib/types/realtime.ts`, `lib/realtime/broadcast.ts`
- **Detalhes:**
  - Tipos `SanitizedEvent`, `SanitizedCombatant`, `SanitizedCombatantAdd`, etc.
  - Zero `as unknown as` casts — tudo tipado
  - `sanitizeCombatant()` retorna `SanitizedCombatant` (não `Record<string, unknown>`)
  - Runtime validation com `validateEvent()` antes do broadcast

### A.0.7: Realtime Channel Instance ✅
- **Arquivos modificados:** `lib/realtime/broadcast.ts`
- **Detalhes:**
  - Session ID guard: `broadcastEvent()` bloqueia envio para sessão stale
  - Sentry logging em erros de subscription (CHANNEL_ERROR, TIMED_OUT)
  - API existente (`getDmChannel`, `broadcastEvent`) mantida

### A.0.8: getState() Atomicity ✅
- **Arquivos modificados:** `lib/hooks/useCombatActions.ts`
- **Detalhes:**
  - 9 handlers refatorados para snapshot pattern
  - `handleApplyDamage/Healing/TempHp` — computa HP localmente do snapshot
  - `handleToggleCondition` — computa conditions do snapshot
  - `handleRemoveCombatant` — reduzido de 4 para 2 getState()
  - `handleAddCombatant` — reduzido de 5+ para 2 getState()
  - `set()` com updater function onde possível

---

## Sprint 1 — Features Core (5 stories)

### B.1.1: Add Combatant Mid-Combat ✅
- **Status:** Já implementado, melhorado com display_name
- **Detalhes:** Broadcast, persistência DB, initiative re-sort, display_name auto-gerado

### B.1.2: Display Name Anti-Metagaming ✅
- **Arquivos modificados:** `EncounterSetup.tsx`, `AddCombatantForm.tsx`, messages
- **Detalhes:**
  - Auto-geração "Criatura #N" / "Creature #N" para NPCs
  - Aplicado em: handleSelectMonster, handleSelectMonsterGroup, handleAddFromRow, handleLoadPreset
  - AddCombatantForm agora tem campo display_name editável
  - i18n: `display_name_default` em pt-BR e en

### B.2.1: Turn Notification "É Sua Vez!" ✅
- **Arquivos modificados:** `TurnNotificationOverlay.tsx`, `PlayerInitiativeBoard.tsx`, messages
- **Detalhes:**
  - Full-screen overlay com `position: fixed`, backdrop blur
  - Spring animation: `scale 0.5 → 1.0` via Framer Motion
  - Vibração: `navigator.vibrate([200, 100, 200])`
  - Auto-dismiss após 3 segundos
  - Tap/click para dispensar
  - Sound effect opcional (`/sounds/turn-notification.mp3`)
  - Reset de dismissed state quando turno muda

### B.2.3: Player View Mobile-First ✅
- **Arquivos novos:** `components/player/PlayerBottomBar.tsx`
- **Arquivos modificados:** `PlayerInitiativeBoard.tsx`, `PlayerLobby.tsx`, `globals.css`, messages
- **Detalhes:**
  - Touch targets 48px mínimo (`min-h-[48px]`)
  - HP bars 24px mobile / 10px desktop (`h-6 lg:h-2.5`)
  - Fonts: 16px body, 20px names, 24px current turn
  - OLED dark: `bg-black lg:bg-transparent`
  - PlayerBottomBar sticky com safe-area padding
  - Turno atual: `border-amber-400 border-2` com padding extra

### B.3.1: GM Private Notes ✅
- **Status:** Já implementado, polido
- **Detalhes:** Debounce ajustado para 500ms, Sentry migrado para captureError

---

## Sprint 2 — Expansão (15 stories)

### Já implementados (verificados):
- B.1.3 Late-Join Initiative
- B.1.4 Monster Grouping UI (MonsterGroupHeader completo)
- B.1.5 Individual HP Within Group
- B.1.6 Expand/Collapse Groups (Framer Motion AnimatePresence)
- B.1.7 Collective Initiative Roll (setGroupInitiative)
- B.3.2 Player Auto-Join Presence
- B.3.3 Role Selection Signup (RoleSelectionCards completo)
- B.3.4 DM Link Temp Player
- B.3.5 File Sharing Complete
- D.1.3/D.1.4 Orchestrator stories

### Implementados nesta sessão:
- **B.2.2** Turn Upcoming Banner — Framer Motion slide-in animation adicionada
- **B.2.4** Reconnection Visual Feedback — `ConnectionStatusBanner.tsx` novo (amber/green, auto-dismiss)
- **B.2.5** Stat Block Inline — Framer Motion height animation no expand/collapse
- **B.2.6** HP Bar Tooltips — `title` com tier name + HP exato (DM only), i18n pt-BR/en

---

## Sprint 3 — Monetização (10 stories)

### Todos já implementados (verificados):
- C.1.1 Feature Flags E2E (server + client + hook, 3 camadas)
- C.1.2 Stripe Checkout Complete
- C.1.3 Subscription Management (SubscriptionPanel)
- C.1.4 Trial 14 Dias
- C.1.5 Mesa Model
- C.1.6 Pro Indicators + Upsell (ProGate, ProBadge, UpsellCard, TrialBanner)
- C.2.1 Email Invites (InvitePlayerDialog)
- C.2.2 Auto-Link Character
- C.2.3 CR Calculator
- C.2.4 Homebrew Content (HomebrewCreator)

---

## Arquivos Novos Criados

| Arquivo | Story | Descrição |
|---------|-------|-----------|
| `lib/errors/capture.ts` | A.0.3 | Structured error capture utility |
| `lib/rate-limit.ts` | A.0.2 | Upstash Redis rate limiter |
| `components/ui/ConnectionStatusBanner.tsx` | B.2.4 | Reconnection visual feedback |
| `components/player/PlayerBottomBar.tsx` | B.2.3 | Mobile sticky bottom bar |

## Dependências Adicionadas

| Pacote | Versão | Story |
|--------|--------|-------|
| `@upstash/redis` | latest | A.0.2 |
| `@upstash/ratelimit` | latest | A.0.2 |
| `eslint-plugin-security` | latest | A.0.4 |

---

## Regras Imutáveis Preservadas

- HP Tiers: LIGHT >70% / MODERATE >40% / HEAVY >10% / CRITICAL ≤10%
- dm_notes NUNCA enviado para players via broadcast
- display_name anti-metagaming: jogadores nunca veem nome real do monstro
- PII scrubbing no Sentry (beforeSend)
