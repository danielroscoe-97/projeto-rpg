# Prompt: E2E Full Validation Agent

Você é um agente QA especializado. Sua missão é rodar uma validação E2E completa do projeto **Taverna do Mestre** (D&D 5e Combat Tracker) após o deploy do Sprint 3.

## Contexto do Projeto

- **Stack**: Next.js 16 (App Router), React 19, TypeScript strict, Supabase, Zustand, Tailwind, shadcn/ui
- **Repo**: c:/Users/dani_/Downloads/projeto-rpg
- **Branch**: master (acabou de receber merge com +1.857 linhas)

## O Que Foi Deployado (Sprint 3)

### Mudanças Críticas que PRECISAM ser validadas:

1. **Mesa Model Wiring (c1-5)** — Players herdam plano Pro do DM
   - `app/join/[token]/page.tsx` — busca `dm_plan` da sessão
   - `components/player/PlayerJoinClient.tsx` — useEffect chama `setSessionDmPlan()` + cleanup no unmount
   - `app/api/session/[id]/state/route.ts` — retorna `dm_plan` para reconexão
   - **VALIDAR**: tipo `Plan` runtime-checked, cleanup previne plano stale

2. **Novu Email Invites (c2-1)** — Trigger de email para convites de campanha
   - `lib/notifications/campaign-invite.ts` — fail-open se NOVU_API_KEY não setado
   - `app/api/campaign/[id]/invites/route.ts` — email regex validation, NEXT_PUBLIC_APP_URL

3. **Session State API** — `dm_plan` adicionado à resposta
   - `app/api/session/[id]/state/route.ts` — query adicional na tabela sessions

4. **PII Fix** — Email removido do Sentry extra field
   - `lib/notifications/campaign-invite.ts` linha 64

## Seus Passos

### Fase 1: Validação de Testes Unitários (RODAR PRIMEIRO)

```bash
# Rodar TODOS os testes novos do sprint
npx jest \
  lib/stores/combat-store.test.ts \
  lib/realtime/__tests__/reconnect.test.ts \
  lib/realtime/__tests__/use-realtime-channel.test.ts \
  components/player/PlayerJoinClient.test.tsx \
  components/guest/GuestCombatClient.test.tsx \
  lib/feature-flags.test.ts \
  lib/hooks/use-feature-gate.test.ts \
  lib/stores/subscription-store.test.ts \
  lib/realtime/broadcast.test.ts \
  --forceExit
```

**Expectativa**: 172 testes, 0 falhas.

### Fase 2: Validação TypeScript

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | grep -v "scripts/orchestrator\|CombatantRow.test\|CombatantSetupRow.test\|EncounterSetup.test\|CampaignManager.test\|PlayerCharacterManager.test\|LinkedText.test\|initiative.test\|CombatSessionClient.test"
```

**Expectativa**: 0 erros novos (os pré-existentes são do tipo `player_character_id` missing em testes antigos e do orchestrator).

### Fase 3: Validação de Segurança

1. **PII no Sentry**: Grep por `email` dentro de `captureError` ou `extra`:
   ```bash
   grep -rn "extra.*email\|captureError.*email" lib/ app/ --include="*.ts" --include="*.tsx" | grep -v "test\|node_modules\|\.d\.ts"
   ```
   **Expectativa**: 0 resultados (email nunca deve ir pro Sentry)

2. **Origin header**: Verificar que invite link NÃO usa `request.headers.get("origin")`:
   ```bash
   grep -n "origin" app/api/campaign/\[id\]/invites/route.ts
   ```
   **Expectativa**: 0 resultados

3. **Anti-metagaming**: Verificar sanitização de broadcast:
   ```bash
   npx jest lib/realtime/broadcast.test.ts --forceExit
   ```
   **Expectativa**: Todos os testes de sanitização passam (HP exato nunca enviado para players)

### Fase 4: Validação de Integridade do Mesa Model

1. **Prop drilling**: Verificar que `dm_plan` flui de ponta a ponta:
   ```bash
   grep -n "dm_plan" app/join/\[token\]/page.tsx app/api/session/\[id\]/state/route.ts
   grep -n "dmPlan\|setSessionDmPlan" components/player/PlayerJoinClient.tsx
   ```

2. **Cleanup**: Verificar que useEffect tem cleanup function:
   ```bash
   grep -A 3 "setSessionDmPlan(dmPlan)" components/player/PlayerJoinClient.tsx
   ```
   **Expectativa**: Deve ter `return () => { ... setSessionDmPlan(null) }`

3. **Runtime validation**: Verificar que dm_plan é validado antes de cast:
   ```bash
   grep "includes.*dm_plan" app/join/\[token\]/page.tsx components/player/PlayerJoinClient.tsx
   ```
   **Expectativa**: `["free","pro","mesa"].includes(...)` em ambos os arquivos

### Fase 5: Validação de Feature Flags + Monetização

```bash
npx jest lib/feature-flags.test.ts lib/hooks/use-feature-gate.test.ts lib/stores/subscription-store.test.ts --forceExit --verbose
```

Verificar especificamente:
- `effectivePlan()` retorna max(individual, sessionDmPlan)
- Trial detection funciona (14 dias)
- Cache TTL de 5 minutos respeita stale-while-revalidate

### Fase 6: Validação de Combat Store Completa

```bash
npx jest lib/stores/combat-store.test.ts --forceExit --verbose
```

Verificar especificamente:
- Undo stack: push on damage, pop restores HP + temp_hp
- Monster grouping: addMonsterGroup, setGroupInitiative, toggleGroupExpanded
- Defeated combatants skipped no advanceTurn

### Fase 7: Validação de Realtime

```bash
npx jest lib/realtime/ --forceExit --verbose
```

Verificar:
- Broadcast sanitization (anti-metagaming)
- Reconnect state recovery
- Channel hook: subscribe on mount, unsubscribe on unmount
- Polling fallback ativa após 3s de disconnect

### Fase 8: Validação de Player Flow

```bash
npx jest components/player/ components/guest/ --forceExit --verbose
```

Verificar:
- PlayerJoinClient: auth anônimo, lobby, combat view, erro
- GuestCombatClient: setup, combat, upsell
- PlayerInitiativeBoard: HP tiers (LIGHT/MODERATE/HEAVY/CRITICAL)

### Fase 9: Build Check

```bash
npm run build 2>&1 | tail -20
```

**Expectativa**: Build sucesso (ou apenas warnings, não errors).

### Fase 10: Lint

```bash
npm run lint 2>&1 | tail -20
```

**Expectativa**: 0 errors (warnings ok).

## Relatório Final

Ao terminar, gere um relatório com:

| Fase | Status | Detalhes |
|------|--------|----------|
| 1. Testes unitários | PASS/FAIL | X/172 passaram |
| 2. TypeScript | PASS/FAIL | X novos erros |
| 3. Segurança | PASS/FAIL | PII, origin, anti-metagaming |
| 4. Mesa model | PASS/FAIL | prop drilling, cleanup, validation |
| 5. Feature flags | PASS/FAIL | cache, plan gating, trial |
| 6. Combat store | PASS/FAIL | undo, grouping, defeated |
| 7. Realtime | PASS/FAIL | broadcast, reconnect, polling |
| 8. Player flow | PASS/FAIL | join, guest, HP tiers |
| 9. Build | PASS/FAIL | next build |
| 10. Lint | PASS/FAIL | eslint |

Se qualquer fase FALHAR, detalhe o erro e tente corrigir (max 3 tentativas por fase).

## Regras Imutáveis

- HP bars: LIGHT (>70%), MODERATE (>40%), HEAVY (>10%), CRITICAL (≤10%)
- Anti-metagaming: NUNCA enviar HP/AC/DC exatos de monstros para players
- i18n: toda UI string em messages/pt-BR.json E messages/en.json
- Error pattern: try/catch → toast.error() + Sentry.captureException()
- snake_case para campos de dados
