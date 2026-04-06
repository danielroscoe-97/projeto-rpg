# Bugfix — Dashboard Crash on Login (2026-04-06)

## Sintoma

Ao logar pela Landing Page (email/password ou Google OAuth), o dashboard mostrava **"Algo Deu Errado"** (error boundary). Erro consistente — acontecia em toda tentativa de login via LP.

## Causa Raiz

```
Error: Route /app/dashboard used `cookies()` inside a function cached with
`unstable_cache()`. Accessing Dynamic data sources inside a cache scope is
not supported.
Digest: 3807770716@E846
```

**Arquivo:** `app/app/dashboard/layout.tsx`

O layout do dashboard usava `unstable_cache()` para cachear a verificacao de "DM access" (sidebar presets). Dentro da funcao cacheada, chamava `createClient()` que internamente chama `cookies()` do Next.js. Isso e **proibido** — Next.js nao permite acessar dados dinamicos (`cookies()`, `headers()`) dentro de `unstable_cache()`.

### Codigo que crashava

```typescript
// ❌ ERRADO — cookies() dentro de unstable_cache() crasha em producao
unstable_cache(
  async (userId: string) => {
    const freshSupabase = await createClient(); // ← chama cookies()
    const [{ count: dmMembershipCount }, ...] = await Promise.all([
      freshSupabase.from("campaign_members")...
    ]);
    return (dmMembershipCount ?? 0) > 0 || ...;
  },
  [`dm-access-sidebar-${user.id}`],
  { revalidate: 60 }
)(user.id);
```

### Historico do bug

1. Originalmente, o layout usava o `supabase` client do escopo externo dentro do `unstable_cache` — funcionava por acaso, mas era instavel
2. Um fix anterior (commit E1) tentou resolver cookies stale criando um `freshSupabase` dentro da funcao cacheada
3. Esse "fix" introduziu a chamada a `cookies()` dentro do cache scope, que Next.js rejeita em producao
4. O erro era silencioso em dev (Next.js so loga warning) mas **crashava em producao**

## Fix Aplicado

Removido `unstable_cache` inteiramente. As queries sao leves (`count` com `head: true`, ~5ms cada) e nao precisam de cache. Movidas para `Promise.all` direto no escopo do layout.

```typescript
// ✅ CERTO — queries diretas no escopo do layout, sem cache
const [
  { data: onboarding },
  { count: dmMembershipCount },
  { count: ownedCampaignCount },
  { data: userRoleData },
  { count: playerMembershipCount },
] = await Promise.all([
  supabase.from("user_onboarding")...,
  supabase.from("campaign_members")...,
  supabase.from("campaigns")...,
  supabase.from("users")...,
  supabase.from("campaign_members")...,
]);

const dmAccess =
  (dmMembershipCount ?? 0) > 0 ||
  (ownedCampaignCount ?? 0) > 0 ||
  userDbRole === "dm" ||
  userDbRole === "both";
```

**Commit:** `fix(dashboard): remove unstable_cache — cookies() inside cache scope crashes`

## Fixes Colaterais (mesmo incidente)

### FIX-2 — ServiceWorker servia RSC stale apos deploy

**Arquivo:** `public/sw.js`

O ServiceWorker usava **Stale-While-Revalidate** para requests RSC (`dashboard?_rsc=XXX`). Apos deploy, o cache servia RSC payload antigo (9ms) enquanto o fresh levava 1.4s. RSC payload antigo + JS chunks novos = crash de hydration.

**Fix:**
- RSC requests (`?_rsc` ou header `Rsc`) → Network-First
- Supabase REST API → bypass completo do SW (skip caching)
- Cache version bumped v1 → v2

### FIX-3 — Loading screen pos-login (feature nova)

**Arquivo:** `components/dashboard/DashboardLoadingScreen.tsx`

Adicionada tela de loading RPG apos login (~2.4s) com:
- 8 icones SVG ciclando (d20, wizard hat, sword, spellbook, potion, shield, scroll, dragon)
- 8 frases aleatorias em PT-BR/EN
- Barra de progresso dourada
- Triggered por `?welcome=1` no redirect pos-login

**Nota:** A primeira versao usava `useSearchParams()` sem Suspense boundary, o que tambem crashava o layout. Corrigido para ler `window.location.search` no mount.

---

## Regras Derivadas — NUNCA FAZER

### 1. `cookies()` / `headers()` dentro de `unstable_cache()`

```typescript
// ❌ PROIBIDO — crasha em producao, silencioso em dev
unstable_cache(async () => {
  const supabase = await createClient(); // chama cookies()
  // ...
})();

// ✅ CERTO — queries fora do cache, ou passar dados como argumento
const supabase = await createClient();
const result = await supabase.from("table").select("*");
```

**Regra:** Se precisar de cache em Server Component, use:
- `React.cache()` para deduplicar dentro do mesmo request
- `revalidatePath()` / `revalidateTag()` com fetch cache
- NUNCA `unstable_cache` com dados dinamicos (cookies, headers, searchParams)

### 2. `useSearchParams()` sem Suspense em client component dentro de layout

```typescript
// ❌ PROIBIDO — pode crashar sem Suspense boundary
export function MyComponent() {
  const params = useSearchParams(); // requer Suspense
}

// ✅ CERTO — ler do window no mount
export function MyComponent() {
  const [param, setParam] = useState<string | null>(null);
  useEffect(() => {
    setParam(new URLSearchParams(window.location.search).get("key"));
  }, []);
}
```

### 3. ServiceWorker cacheando RSC ou Supabase API

```javascript
// ❌ PROIBIDO — RSC payloads sao version-specific
event.respondWith(staleWhileRevalidate(rscRequest)); // crash pos-deploy

// ✅ CERTO — RSC sempre network-first
if (url.searchParams.has("_rsc")) {
  event.respondWith(networkFirst(request));
}

// ✅ CERTO — Supabase API nunca cachear
if (url.hostname.includes("supabase")) return; // skip SW entirely
```

## Checklist — Antes de Usar Cache em Server Components

1. [ ] A funcao cacheada acessa `cookies()`, `headers()`, ou `searchParams`?
   - **SIM** → NAO use `unstable_cache`. Use `React.cache()` ou queries diretas
   - **NAO** → OK usar cache
2. [ ] O resultado depende do usuario logado?
   - **SIM** → Cache key DEVE incluir user ID
   - **NAO** → Cache global OK
3. [ ] As queries sao leves (count, head, limit 1)?
   - **SIM** → Provavelmente nao precisa de cache
   - **NAO** → Considerar cache, mas sem dados dinamicos dentro
