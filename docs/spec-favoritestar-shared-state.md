# Spec — FavoriteStar Shared State Refactor (P0 Beta 4)

**Data:** 2026-04-19
**Autor:** Claude (Plan agent)
**Status:** PRONTO PARA IMPLEMENTAÇÃO
**Origem:** Review adversarial beta 4 — P0 rate-limit storm
**Feature flag:** `ff_favorites_v2_shared_state` (novo, default OFF)
**Estimativa:** 2-3h implementation + 1h tests

---

## 1. Problema (factual)

Cada `<FavoriteStar>` chama `useFavorites(kind)` ([lib/favorites/use-favorites.ts:59](../lib/favorites/use-favorites.ts#L59)). Por instância executa:

- `supabase.auth.getUser()` no mount (`:74-91`) — um RTT por star
- `fetch("/api/favorites?kind=...")` no mount + em toda mudança de `reload` callback (`:94-120`)
- Listeners `window.focus` + `document.visibilitychange` (`:125-136`) — cada star registra os seus, com re-fetch no retorno à aba

[PlayerCompendiumBrowser.tsx:1263,1349,1759](../components/player/PlayerCompendiumBrowser.tsx) renderiza `<FavoriteStar>` dentro de cada row paginada. Com `PAGE_SIZE=50`, abrir o compêndio dispara até **150 hooks concorrentes**. O endpoint `/api/favorites` tem rate-limit 30/min por `user_id` ([app/api/favorites/route.ts:166-179](../app/api/favorites/route.ts#L166-L179)) ⇒ **429 imediato** + N listeners de focus disparando N re-fetches simultâneos ao voltar à aba.

`FavoritesTab.tsx` também chama `useFavorites` três vezes (`:45-47`) — soma 3 GETs mesmo quando abre só a aba Favoritos.

## 2. Estado atual do código

- **`lib/favorites/use-favorites.ts`** — hook unificado guest/anon/auth. API pública: `{ favorites, add, remove, isFavorite, loading, limitReached, clearLimitReached, max }`. Refactor deve preservar essa shape
- **`lib/favorites/local-store.ts`** — já é singleton module-scoped (`const listeners = new Set<Listener>()`) com pub/sub, `BroadcastChannel` cross-tab e fallback via `storage` event. **Modelo a replicar no caminho auth**
- **`lib/stores/favorites-store.ts`** — existe, mas é para `audio_favorites` (presets de ambiente), NÃO reutilizável. Útil como referência de padrão Zustand no repo
- **`components/favorites/FavoriteStar.tsx`** — thin wrapper; gate `ff_favorites_v1`
- **`components/favorites/FavoritesTab.tsx:45-47`** — três `useFavorites` calls em paralelo
- **`app/api/favorites/route.ts`** — rate-limit por `user:${user.id}`, 30/min. NÃO mexer; refactor é client-side

## 3. Três opções de design

### Opção A — Zustand store singleton por kind (RECOMENDADA)

Arquivo novo `lib/favorites/favorites-store.ts` (separado de `lib/stores/favorites-store.ts` para não colidir com audio).

Fluxo:
- **Mount da app / primeiro uso:** store resolve `auth` uma vez (`supabase.auth.getUser()`), hidrata de `local-store` ou faz `GET /api/favorites?kind=X` **uma vez por kind**. Subsequentes mounts de FavoriteStar fazem zero I/O
- **Subscription:** `<FavoriteStar>` usa seletor `useFavoritesStore((s) => s.isFavorite(kind, slug))` — re-render apenas quando o próprio slug muda
- **Listeners centralizados:** store registra **um único par** `focus`/`visibilitychange`. Refetch com debounce 500ms
- **Mutations:** `add(kind, slug)` e `remove(kind, slug)` mantêm semântica (optimistic + rollback + 409 already_favorite / limit_reached)

`useFavorites(kind)` vira wrapper fino sobre o store — API pública atual preservada. Zero churn.

**Prós:**
- Elimina storm (1 GET por kind × lifecycle, não 1 GET × star)
- Listener único — focus-storm gone
- Paridade com `local-store.ts` singleton
- Selectors finos ⇒ zero re-renders supérfluos
- Zustand já é dependência do repo (13 stores em `lib/stores/`)

**Contras:**
- Global state — testes precisam de `__resetForTests` (padrão já em `local-store.ts:188`)
- HMR pode preservar estado stale em dev; mitigável com store-reset export

### Opção B — React Context Provider

`<FavoritesProvider>` wrapping `<PlayerCompendiumBrowser>` e `<FavoritesTab>`. Provider faz 3 GETs no mount.

**Contras:**
- Precisa provider em múltiplos call-sites; armadilha para refactors futuros
- Provider-level state ⇒ re-render em todos consumers quando qualquer slug muda

### Opção C — Prop-drilling controlled components

`<PlayerCompendiumBrowser>` faz os 3 GETs, passa `Set<slug>` + callbacks.

**Contras:**
- Cada consumer replica a lógica; duplica o bug
- Quebra API pública de `useFavorites`

## 4. Recomendação

**Opção A (Zustand singleton).** Justificativa:
1. `local-store.ts` já é singleton — replica padrão no caminho auth, fecha paridade estrutural
2. Listener único elimina focus-storm
3. Selectors permitem 150 stars sem re-render cascade
4. API pública de `useFavorites` preservada
5. Reversível via feature flag

## 5. Implementação passo-a-passo

### Passo 1 — Criar `lib/favorites/favorites-store.ts` (NOVO, ~180 linhas)

```ts
type KindState = {
  slugs: Set<string>;              // O(1) lookup
  favorites: Favorite[];            // sorted newest-first
  loading: boolean;
  limitReached: boolean;
  hydrated: boolean;
};
type FavoritesState = {
  auth: { resolved: boolean; isAuth: boolean };
  byKind: Record<FavoriteKind, KindState>;
  ensureHydrated: (kind: FavoriteKind) => Promise<void>;
  reload: (kind: FavoriteKind) => Promise<void>;
  add: (kind: FavoriteKind, slug: string) => Promise<boolean>;
  remove: (kind: FavoriteKind, slug: string) => Promise<void>;
  isFavorite: (kind: FavoriteKind, slug: string) => boolean;
  clearLimitReached: (kind: FavoriteKind) => void;
  __resetForTests: () => void;
};
```

Internamente:
- `resolveAuthOnce()` — módulo-escoped `Promise<AuthState>` cached
- `registerGlobalFocusListener()` — idempotente via flag; handler com `debounce(500ms)`
- `subscribeToLocalStore()` — no modo guest/anon chama `localSubscribe` **uma vez**, invalida os 3 kinds

### Passo 2 — Refactor `lib/favorites/use-favorites.ts:59`

```ts
export function useFavorites(kind: FavoriteKind) {
  const useV2 = isFeatureFlagEnabled("ff_favorites_v2_shared_state");
  if (useV2) return useFavoritesV2(kind);
  return useFavoritesLegacy(kind);
}
```

`useFavoritesV2` seleciona do store via `useFavoritesStore((s) => s.byKind[kind])` e retorna mesma API pública. `useEffect` no mount chama `ensureHydrated(kind)`.

### Passo 3 — Zero-changes em callsites

`FavoriteStar.tsx`, `FavoritesTab.tsx:45-47`, `PlayerCompendiumBrowser.tsx:1263/1349/1770` permanecem intactos.

### Passo 4 — Registrar flag em `lib/flags.ts`

```ts
// :20-30 adicionar key
| "ff_favorites_v2_shared_state"
// :36-42 adicionar default
ff_favorites_v2_shared_state: false,
```

## 6. Parity Matrix

| Modo | Storage | Listeners | Cross-tab | Rate limit risk |
|---|---|---|---|---|
| **Guest** | localStorage via `local-store.ts` (singleton existente) | 1 BroadcastChannel + 1 storage event | Sim | N/A |
| **Anon** (`/join`) | Mesmo que Guest | Mesmo | Sim | N/A |
| **Auth** (`/invite`) | `/api/favorites` + cache no Zustand store | **1 par** focus+visibilitychange (antes: N) | N/A | **Eliminado** (1 GET por kind no lifecycle) |

Teste de paridade manual: abrir compêndio em cada modo, confirmar 3 GETs no Network (um por kind), não 150.

## 7. Testes

### Unit (`lib/favorites/__tests__/favorites-store.test.ts`)
- `ensureHydrated` chamada 2× para mesmo kind ⇒ 1 fetch
- `add`/`remove` atualizam `slugs` Set e `favorites` array
- 409 `already_favorite` ⇒ `add` returns true, sem limit flag
- 409 `limit_reached` ⇒ `add` returns false, `limitReached=true`
- Guest mode: `ensureHydrated` não dispara fetch; subscribe ao local-store
- `__resetForTests` limpa estado

### Integration (`components/favorites/__tests__/FavoriteStar.shared-state.test.tsx`)
- Render 150 `<FavoriteStar>` com flag ON ⇒ `fetch` mock chamado exatamente 3× (1 por kind)
- Focus event ⇒ 3 refetches (não 150)
- Toggle star ⇒ outros stars mesmo slug atualizam via selector

### Playwright (e2e smoke)
- Abrir compêndio, assert `request.url().includes("/api/favorites")` count ≤ 3

## 8. Rollback

Flag `ff_favorites_v2_shared_state` default OFF ⇒ branch legacy intacto. Rollback = flip env `NEXT_PUBLIC_FF_FAVORITES_V2_SHARED_STATE=false` ou remover override. Nenhuma migração de schema.

## 9. Feature flag rollout plan

1. Merge com flag OFF (default)
2. Staging: `__RPG_FLAGS__.ff_favorites_v2_shared_state = true` via init script, smoke tests
3. Prod 10% via env override em subset de deploys; monitorar `favorites:added`/`favorites:removed` + 429 rate na API
4. 48h soak sem regressão ⇒ flip default para `true` em `lib/flags.ts:40`
5. Após 2 semanas estável, remover código legacy (`useFavoritesLegacy`) em PR separado

## 10. Estimativa

- Store implementation: 1h
- Wrapper + flag wiring: 30min
- Unit tests: 45min
- Integration + Playwright: 45min
- **Total: ~2.5-3h**

---

## Critical Files

- `c:/Projetos Daniel/projeto-rpg/lib/favorites/favorites-store.ts` (NOVO)
- `c:/Projetos Daniel/projeto-rpg/lib/favorites/use-favorites.ts`
- `c:/Projetos Daniel/projeto-rpg/lib/favorites/local-store.ts`
- `c:/Projetos Daniel/projeto-rpg/lib/flags.ts`
- `c:/Projetos Daniel/projeto-rpg/components/favorites/FavoriteStar.tsx`
