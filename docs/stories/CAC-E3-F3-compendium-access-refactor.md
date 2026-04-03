# CAC-E3-F3 — Compendium Access Refactor: Hook + Bloqueio Guest/Anon

**Epic:** Content Access Control (`docs/epic-content-access-control.md`)
**Prioridade:** Alta
**Estimativa:** 5 SP
**Dependencia:** CAC-E1-F1 (whitelist table), CAC-E2-F2 (agreements table)
**Arquivos principais:** `lib/hooks/use-extended-compendium.ts` (refatorar), `lib/hooks/use-content-access.ts` (novo), `components/compendium/MonsterBrowser.tsx` (modificar), `components/compendium/SpellBrowser.tsx` (modificar), `components/compendium/ContentLockedOverlay.tsx` (novo)

---

## Resumo

Refatora o sistema de acesso ao compendio Completo. O `useExtendedCompendium` (hoje baseado em localStorage) e substituido por um novo hook `useContentAccess` que consulta Supabase (whitelist + agreements) com cache local. O filtro "Completo" e bloqueado para guest e anonimo com indicador visual de lock.

Esta story amarra F1 e F2 no compendio, completando o fluxo end-to-end.

---

## Decisoes de UX

**D1: Filtro "Completo" visivel mas locked pra nao-logados.** O chip "Completo" aparece no filtro de source do MonsterBrowser e SpellBrowser, mas com icone de cadeado (🔒). Ao clicar, guest ve tooltip/toast: "Faca login para acessar o compendio completo". Nao redireciona automaticamente — apenas informa.

**D2: User logado sem aceite ve o gate.** Ao clicar "Completo", se o user nao tem agreement nem whitelist, abre o `ExternalContentGate` modal (ja refatorado na F2).

**D3: Whitelisted tem acesso transparente.** Beta tester clica "Completo" e funciona imediatamente. Sem modal, sem delay perceptivel. O hook retorna `canAccess: true` direto do cache.

**D4: Cache com TTL de 5 minutos.** O hook cacheia o resultado da query (whitelist + agreement) por 5 minutos, mesmo padrao dos feature flags. Evita queries repetidas em cada navegacao.

**D5: Fallback pra SRD+MAD durante loading.** Enquanto o hook valida acesso (primeiro load, cache expirado), o filtro "Completo" fica disabled com skeleton. O conteudo SRD+MAD funciona normalmente.

**D6: SpellBrowser segue mesma logica.** O `useSrdContentFilter` ja filtra spells por `is_srd`. A mudanca e: o filtro de spells nao-SRD tambem requer o mesmo gate. Spells e monsters compartilham o mesmo mecanismo de acesso.

---

## Contexto Tecnico

### Novo hook: `lib/hooks/use-content-access.ts`

```typescript
interface ContentAccess {
  /** User pode ver conteudo Completo (whitelisted OU accepted) */
  canAccess: boolean;
  /** User esta na whitelist (bypass total) */
  isWhitelisted: boolean;
  /** User aceitou os termos */
  hasAgreed: boolean;
  /** User esta autenticado */
  isAuthenticated: boolean;
  /** Ainda carregando estado do Supabase */
  isLoading: boolean;
  /** Abre o gate modal (pra users sem aceite) */
  openGate: () => void;
}

export function useContentAccess(): ContentAccess {
  // 1. Checa auth state
  // 2. Se nao auth → canAccess: false imediato
  // 3. Se auth → checa cache local (5min TTL)
  // 4. Se cache miss → query Supabase:
  //    a. content_whitelist WHERE user_id = uid AND revoked_at IS NULL
  //    b. content_agreements WHERE user_id = uid AND agreement_version = CURRENT
  // 5. Cacheia resultado
  // 6. Retorna estado
}
```

**Estrategia de cache:**
- Usar `useSyncExternalStore` (mesmo padrao do hook atual)
- Cache key: `content_access_${userId}`
- TTL: 5 minutos
- Invalidar on: agreement criado, whitelist change

### Refatoracao do useExtendedCompendium

O hook `useExtendedCompendium` sera **depreciado** e substituido por `useContentAccess`. Para manter backward compatibility durante a transicao:

```typescript
// lib/hooks/use-extended-compendium.ts
/** @deprecated Use useContentAccess instead */
export function useExtendedCompendium() {
  const { canAccess, openGate, isLoading } = useContentAccess();
  return {
    isActive: canAccess,
    activate: openGate, // Agora abre gate em vez de setar localStorage
    deactivate: () => {}, // No-op, revogacao e via admin
    flagEnabled: true, // Feature flag ainda existe como kill switch
  };
}
```

### MonsterBrowser: bloqueio do filtro "Completo"

```diff
// components/compendium/MonsterBrowser.tsx

+ const { canAccess, isAuthenticated, openGate, isLoading } = useContentAccess();

  // No filterBar, chip "complete":
- <Chip active={sourceFilter === "complete"} onClick={() => setSourceFilter("complete")}>
+ <Chip
+   active={sourceFilter === "complete"}
+   onClick={() => {
+     if (!isAuthenticated) {
+       toast.info(t("login_required_complete"));
+       return;
+     }
+     if (!canAccess) {
+       openGate();
+       return;
+     }
+     setSourceFilter("complete");
+   }}
+   locked={!canAccess}
+ >
    {t("filter_source_complete")}
+ {!canAccess && <LockIcon />}
  </Chip>
```

### SpellBrowser: mesma logica

O `useSrdContentFilter` hoje filtra por feature flag. Refatorar para tambem checar `useContentAccess`:

```diff
// lib/hooks/use-srd-content-filter.ts

+ const { canAccess } = useContentAccess();

  // Antes: showNonSrd dependia apenas do feature flag
  // Depois: showNonSrd = flagEnabled && canAccess
- const showNonSrd = allowed;
+ const showNonSrd = allowed && canAccess;
```

### ContentLockedOverlay (novo componente)

```typescript
// components/compendium/ContentLockedOverlay.tsx
// Overlay leve que aparece sobre o chip de filtro locked
// Icone de cadeado + tooltip com mensagem contextual
// Guest: "Faca login para acessar"
// Auth sem aceite: "Aceite os termos para desbloquear"
```

### Guest combat parity check

Verificar conforme regra do CLAUDE.md:
- **Guest (`/try`):** Compendio no guest nao existe (guest so tem combate). NAO APLICAVEL.
- **Anonimo (`/join`):** Player view nao tem acesso ao compendio. NAO APLICAVEL.
- **Autenticado (`/app/compendium`):** UNICO ponto de aplicacao. Correto.

O compendio so existe em `/app/compendium` (rota autenticada), entao a parity check e satisfeita naturalmente. O guest combat usa dados SRD carregados diretamente, sem filtro de source.

---

## Acceptance Criteria

### AC-1: Hook useContentAccess funciona
- [ ] Retorna `canAccess: true` se user esta na whitelist (revoked_at IS NULL)
- [ ] Retorna `canAccess: true` se user tem agreement na versao atual
- [ ] Retorna `canAccess: false` se user nao esta auth
- [ ] Retorna `canAccess: false` se user auth mas sem whitelist nem agreement
- [ ] Cache de 5min funciona (nao query a cada render)
- [ ] `isLoading: true` durante primeira validacao

### AC-2: MonsterBrowser bloqueia "Completo" pra nao-autorizados
- [ ] Guest/anon: chip "Completo" mostra lock icon
- [ ] Guest/anon clica: toast "Faca login para acessar"
- [ ] Auth sem aceite clica: abre ExternalContentGate
- [ ] Auth com aceite/whitelist clica: funciona normalmente
- [ ] Whitelisted: zero friction, acesso imediato

### AC-3: SpellBrowser segue mesma logica
- [ ] `useSrdContentFilter` integrado com `useContentAccess`
- [ ] Spells nao-SRD so aparecem pra users com acesso
- [ ] Mesma UX de lock/gate do MonsterBrowser

### AC-4: useExtendedCompendium depreciado
- [ ] Hook antigo ainda funciona (backward compat)
- [ ] Internamente delega pra `useContentAccess`
- [ ] localStorage usado apenas como cache, nao source of truth

### AC-5: Performance aceitavel
- [ ] Primeira carga: < 200ms overhead (query simples com index)
- [ ] Cargas subsequentes: cache hit, zero overhead
- [ ] Fallback durante loading: SRD+MAD funciona, "Completo" disabled

### AC-6: Guest combat parity
- [ ] Verificado que guest combat nao e afetado (nao usa compendium filters)
- [ ] Verificado que player join view nao e afetada (nao tem compendium)

---

## Testes

### Manuais — Fluxo Guest
- Abrir compendio como guest (se acessivel) → "Completo" locked
- Clicar → toast informativo, nao quebra

### Manuais — Fluxo Auth sem aceite
- Login → compendio → clicar "Completo" → gate modal abre
- Aceitar → filtro funciona
- Fechar e reabrir → cache valido, sem modal

### Manuais — Fluxo Whitelisted
- Admin adiciona user a whitelist (F1)
- User faz login → compendio → "Completo" funciona direto
- Sem modal, sem delay

### Manuais — Fluxo Revogacao
- Admin revoga whitelist do user (F1)
- User recarrega compendio → "Completo" bloqueado novamente (apos TTL do cache)
- User pode re-acessar via gate modal (aceitar termos)

### Manuais — Cache
- Limpar localStorage → reload → hook re-valida no Supabase → acesso mantido
- Esperar 5min → reload → cache expired → re-valida silenciosamente

### Automatizados (se aplicavel)
- Hook retorna `canAccess: false` sem auth
- Hook retorna `canAccess: true` com whitelist ativa
- Hook retorna `canAccess: true` com agreement valido
- Hook retorna `canAccess: false` com whitelist revogada
- Hook retorna `canAccess: false` com agreement de versao antiga
