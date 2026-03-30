# Quick Spec: Guest Mode Hard Block (60 min)

> **Prioridade:** P0 — Funil de conversão depende disso
> **Estimativa:** ~4h
> **Data:** 2026-03-30
> **Referência:** Roadmap H1.2, GuestBanner.tsx, guest-combat-store.ts

---

## Contexto

O guest mode tem timer de 60 minutos no `GuestBanner`, mas é puramente visual — mostra um aviso, muda de cor nos últimos 10 min, mas NÃO bloqueia ações. Um visitante pode usar o app indefinidamente sem criar conta.

**Impacto:** Sem enforcement, o funil freemium não funciona. O guest mode é o gatilho de conversão principal — precisa de um hard block que force a decisão: criar conta ou perder o combate.

---

## Story 1: Enforcement no Guest Combat Store

**Problema:** `guest-combat-store.ts` não verifica se a sessão expirou.

**Implementação:**

1. Adicionar ao `guest-combat-store.ts`:
```typescript
// No topo do store
const SESSION_LIMIT_MS = 60 * 60 * 1000;

function isGuestExpired(): boolean {
  const startTime = localStorage.getItem("guest-session-start");
  if (!startTime) return false;
  return Date.now() - Number(startTime) > SESSION_LIMIT_MS;
}
```

2. Criar guard em cada action mutadora do store:
```typescript
// Em cada action que modifica estado (addCombatant, updateHp, advanceTurn, etc.)
if (isGuestExpired()) {
  set({ isExpired: true });
  return; // Bloqueia a ação
}
```

3. Adicionar estado `isExpired: boolean` ao store.

4. Subscriptions no store: quando `isExpired` muda para `true`, disparar evento para mostrar o modal.

**AC:**
- [ ] Após 60 min, NENHUMA ação de combate funciona (add, damage, heal, advance turn)
- [ ] O estado do combate é preservado (não apaga — incentiva signup para "salvar")
- [ ] `isExpired` persiste entre refreshes (baseia-se no `guest-session-start` do localStorage)

---

## Story 2: Modal de Conversão (Expiry)

**Problema:** `GuestUpsellModal.tsx` já existe mas não é triggered automaticamente na expiração.

**Implementação:**

1. No `GuestCombatClient.tsx`, observar o `isExpired` do store:
```typescript
const isExpired = useGuestCombatStore(s => s.isExpired);

useEffect(() => {
  if (isExpired) {
    setShowExpiryModal(true);
  }
}, [isExpired]);
```

2. Criar ou adaptar modal de expiração:
   - Headline: "Sessão expirada" / "Session expired"
   - Body: "Crie uma conta gratuita para salvar seu combate e continuar." / "Create a free account to save your combat and continue."
   - CTA primário: "Criar conta" → `/auth/sign-up?from=guest-expiry`
   - CTA secundário: "Novo combate" → resetar timer e estado
   - **NÃO** ter botão de fechar (modal é blocking)
   - Backdrop não-clicável (forçar decisão)

3. i18n keys:
```json
{
  "guest": {
    "expired_title": "Sessão expirada",
    "expired_body": "Crie uma conta gratuita para salvar seus combates e jogar sem limite de tempo.",
    "expired_cta_signup": "Criar conta grátis",
    "expired_cta_reset": "Começar novo combate"
  }
}
```

**AC:**
- [ ] Modal aparece automaticamente quando timer atinge 0
- [ ] Modal é blocking — não pode ser fechado sem ação
- [ ] CTA "Criar conta" leva para `/auth/sign-up` com query param de tracking
- [ ] CTA "Novo combate" reseta `guest-session-start` e estado do store
- [ ] Modal tem i18n (pt-BR + en)
- [ ] Touch target ≥ 44px nos CTAs

---

## Story 3: Preservação de Estado para Migração Pós-Signup

**Problema:** Se o guest cria conta, perde todo o estado do combate atual (está em memória/localStorage).

**Implementação:**

1. Antes de redirecionar para signup, serializar o estado do combate:
```typescript
const snapshot = useGuestCombatStore.getState();
localStorage.setItem("guest-combat-snapshot", JSON.stringify({
  combatants: snapshot.combatants,
  currentTurnIndex: snapshot.currentTurnIndex,
  roundNumber: snapshot.roundNumber,
  timestamp: Date.now()
}));
```

2. No onboarding pós-signup, verificar se há snapshot:
```typescript
const snapshot = localStorage.getItem("guest-combat-snapshot");
if (snapshot) {
  // Oferecer: "Você tem um combate em andamento. Deseja importar?"
  // Se sim: criar sessão + encounter + combatants a partir do snapshot
  // Limpar snapshot após import
}
```

3. Snapshot expira em 24h (verificar timestamp).

**AC:**
- [ ] Estado do combate guest é salvo antes de redirect para signup
- [ ] Após signup, opção de importar combate aparece no dashboard/onboarding
- [ ] Import cria sessão real com combatants preservados
- [ ] Snapshot expira após 24h (não importar dados antigos)
- [ ] Se não houver snapshot, fluxo normal de onboarding

---

## Story 4: Analytics de Conversão

**Implementação:**

Trackear eventos no ponto de expiração para medir funil:

```typescript
// Quando timer expira:
trackEvent("guest:session_expired", { minutes_used: 60 });

// Quando clica "Criar conta":
trackEvent("guest:expired_cta_signup");

// Quando clica "Novo combate":
trackEvent("guest:expired_cta_reset");

// Quando importa snapshot pós-signup:
trackEvent("guest:combat_imported", { combatants_count: N });
```

**AC:**
- [ ] 4 eventos trackados na tabela `analytics_events`
- [ ] Funil mensurável: expired → signup click → account created → combat imported
