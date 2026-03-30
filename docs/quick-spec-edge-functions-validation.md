# Quick Spec: Edge Functions para Realtime Validation

> **Horizonte:** 2.2 — Robustez Arquitetural
> **Prioridade:** P1 — Segurança server-side (anti-metagaming real)
> **Estimativa:** ~10h
> **Data:** 2026-03-30

---

## Contexto

Toda sanitização de broadcast é client-side em `lib/realtime/broadcast.ts`. O DM envia dados brutos para o Supabase Realtime channel, e a sanitização acontece ANTES do `channel.send()` no browser do DM. Se alguém modificar o JavaScript do client (DevTools, extensão), pode enviar dados não-sanitizados diretamente para o channel — quebrando a regra anti-metagaming.

**Solução:** Mover a sanitização para uma Supabase Edge Function (server-side). O DM envia para a Edge Function, que sanitiza e rebroadcast para o player channel.

---

## Story 1: Arquitetura de Channels Duplos

**Problema atual:**
```
DM browser → sanitizePayload() → channel.send("session:{id}") → Players
```

**Arquitetura proposta:**
```
DM browser → Edge Function (POST /realtime/broadcast)
                ↓
          sanitizePayload() [SERVER-SIDE]
                ↓
          channel.send("session:{id}:player") → Players

DM browser → channel "session:{id}:dm" → DM apenas (self-sync, multiple tabs)
```

**Implementação:**

1. Criar Edge Function `supabase/functions/broadcast/index.ts`:
```typescript
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  const { sessionId, event } = await req.json();

  // 1. Validar auth (JWT do DM)
  // 2. Validar que DM é owner da session
  // 3. Sanitizar payload (mesma lógica de broadcast.ts)
  // 4. Broadcast no channel "session:{sessionId}" para players
  // 5. Retornar 200

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
```

2. Mover lógica de `sanitizePayload()` e `sanitizeCombatant()` para a Edge Function:
   - Manter a mesma lógica (HP status tiers, strip DM fields, hidden filtering)
   - Importar `getHpStatus()` como código inline (Edge Functions não importam do app)

3. No client (`broadcast.ts`), mudar `broadcastEvent()`:
```typescript
export async function broadcastEvent(sessionId: string, event: RealtimeEvent): void {
  // Ao invés de channel.send() direto:
  await fetch(`${SUPABASE_URL}/functions/v1/broadcast`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId, event }),
  });
}
```

**Trade-off:**
- Latência: +50-80ms por ação (Edge Function roundtrip)
- Benefício: Segurança real — impossível bypassar sanitização
- Fallback: Se Edge Function falhar, fallback para client-side (degradação graciosa)

**AC:**
- [ ] Edge Function deployed e funcional
- [ ] Sanitização idêntica ao client-side (mesmos testes passam)
- [ ] Latência total DM→Player < 200ms (verificar com analytics)
- [ ] Auth validada — só o owner da session pode broadcast
- [ ] Fallback para client-side se Edge Function timeout

---

## Story 2: Validação de Regras Server-Side

**Problema:** Hoje, nada impede que um client envie valores inválidos (HP negativo, initiative impossível, etc.).

**Implementação na Edge Function:**

```typescript
function validateEvent(event: RealtimeEvent, session: Session): ValidationResult {
  switch (event.type) {
    case "combat:hp_update":
      // HP não pode ser < 0
      // HP não pode ser > max_hp + temp_hp
      // combatant_id deve existir no encounter
      break;

    case "combat:turn_advance":
      // current_turn_index deve estar no range [0, combatants.length)
      // round_number deve ser >= 1
      break;

    case "combat:condition_change":
      // conditions deve ser array de strings válidas
      // combatant_id deve existir
      break;

    case "combat:combatant_add":
      // name é obrigatório
      // is_player deve ser boolean
      break;
  }
}
```

**AC:**
- [ ] Eventos com dados inválidos são rejeitados com erro descritivo
- [ ] Validação não bloqueia eventos válidos (zero false positives)
- [ ] Logs de rejeição para detectar abuse patterns

---

## Story 3: Rate Limiting por Channel

**Problema:** Um client malicioso poderia fazer flooding de eventos no channel (DoS para outros players).

**Implementação:**

Na Edge Function, adicionar rate limiting por session:
```typescript
// Max 60 events/minuto por session (1/segundo = mais que suficiente)
const key = `broadcast:${sessionId}`;
const { limited } = await checkRateLimit(key, 60, "1 m");
if (limited) {
  return new Response("Rate limited", { status: 429 });
}
```

**AC:**
- [ ] > 60 broadcasts/min por session = 429
- [ ] Rate limit não afeta uso normal (combate ativo raramente excede 20 eventos/min)
- [ ] Logging de rate limit hits para monitoramento

---

## Story 4: Migration Path (Client → Server)

**Problema:** Não pode quebrar o app durante a migração. Precisa de rollout gradual.

**Implementação:**

1. **Fase 1 — Dual mode:** Client envia via Edge Function, mas mantém fallback:
```typescript
async function broadcastEvent(sessionId: string, event: RealtimeEvent): void {
  try {
    await broadcastViaEdgeFunction(sessionId, event);
  } catch {
    // Fallback: broadcast direto (client-side sanitization)
    broadcastDirectly(sessionId, event);
  }
}
```

2. **Fase 2 — Feature flag:** Usar `feature_flags` table para controlar:
```typescript
const useServerBroadcast = await getFeatureFlag('server_broadcast');
```

3. **Fase 3 — Full migration:** Remover fallback, Edge Function é o único path.

4. **Fase 4 — Cleanup:** Remover `sanitizePayload()` do client (código morto).

**AC:**
- [ ] Fase 1 deployed sem breaking change
- [ ] Feature flag controla rollout (0% → 10% → 50% → 100%)
- [ ] Monitoramento de latência em cada fase
- [ ] Zero downtime durante migration
