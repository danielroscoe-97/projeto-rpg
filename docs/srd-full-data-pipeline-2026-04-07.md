# SRD Full Data Pipeline — Arquitetura e Bugfixes (2026-04-07)

Data: 2026-04-07
Status: concluido
Commits: 0ee66e1, 5a2ec3a, 3f1543b

## Contexto

Admins e beta testers devem ver o compendio COMPLETO (2517 monstros 2014 + 520 monstros 2024 + spells/items completos). Usuarios normais e guests veem apenas conteudo SRD-safe (419+346 monstros publicos). O pipeline tinha 4 bugs independentes que impediam o conteudo completo de chegar ao usuario autenticado.

## Arquitetura do Pipeline SRD (Dual-Mode)

```
SERVIDOR (Vercel Serverless)
  data/srd/*.json          → Dados COMPLETOS (tracked no git, 19 arquivos)
  public/srd/*.json        → Dados SRD-ONLY (filtrados, estaticos)
  /api/srd/full/[...path]  → Auth-gated: 401 sem login, 403 sem whitelist/admin

CLIENTE (Browser)
  SrdInitializer           → setFullDataMode(true/false) baseado em isBetaTester
  srd-loader.ts            → fetch() com URL baseada no modo (srdDataUrl)
  srd-cache.ts             → IndexedDB com keys mode-aware (cacheSuffix)
  srd-store.ts             → Zustand store com loadedMode tracking
  srd-search.ts            → Fuse.js singleton para busca
  MonsterSearchPanel.tsx   → Fuse.js LOCAL + filtro de source
```

### Fluxo por tipo de usuario

| Usuario | SrdInitializer | isFullDataMode | URL de fetch | Filtro default |
|---------|---------------|----------------|--------------|----------------|
| Guest /try | nenhum | false | /srd/*.json | "all" (SRD+MAD) |
| Anonimo /join | fullData=false | false | /srd/*.json | "all" (SRD+MAD) |
| Logado normal | fullData=false | false | /srd/*.json | "all" (SRD+MAD) |
| Admin/Beta | fullData=true | true | /api/srd/full/*.json | "complete" (tudo) |

### 5 camadas de protecao contra vazamento non-SRD

1. **API Server**: /api/srd/full/ retorna 401/403 sem auth+whitelist
2. **Dados publicos**: public/srd/ contem 0 monstros non-SRD
3. **URL routing**: srdDataUrl() roteia publico→/srd/ e full→/api/srd/full/
4. **Client filter**: sourceFilter "all" aplica `is_srd !== false` (defense-in-depth)
5. **Mode gate**: isFullDataMode() so retorna true se SrdInitializer recebeu fullData=true

## Bug 1: Loader caches sem modo (0ee66e1)

### Problema
Os caches module-level em `srd-loader.ts` (monsterCache, madMonsterCache, featCache, itemCache) eram chaveados apenas por versao ("2014", "2024"), nao por modo (public/full). Se dados publicos fossem carregados primeiro (ex: via /join), a troca pra full mode retornava dados stale do cache publico.

Pior: os dados publicos eram salvos no IndexedDB sob a key "2024-full", contaminando permanentemente.

### Causa raiz
```js
// ANTES (bugado):
const monsterCache = new Map<RulesetVersion, Promise<SrdMonster[]>>();
// key "2024" servia tanto public quanto full

// DEPOIS (corrigido):
function loaderCacheKey(version: string): string {
  return `${version}-${isFullDataMode() ? "full" : "public"}`;
}
// key "2024-public" e "2024-full" nunca colidem
```

### Arquivos alterados
- `lib/srd/srd-loader.ts` — loaderCacheKey() mode-aware em todos os caches + clearAllLoaderCaches()
- `lib/stores/srd-store.ts` — chama clearAllLoaderCaches() no mode switch
- `lib/srd/srd-cache.ts` — cacheSuffix() adicionado em getCached/setCached para conditions/items/feats (antes usavam key fixa "all")
- `next.config.ts` — outputFileTracingIncludes para garantir data/srd/ no bundle serverless Vercel

## Bug 2: Fuse.js singleton race condition (5a2ec3a)

### Problema
MonsterSearchPanel e SrdStore escreviam no MESMO singleton Fuse.js em srd-search.ts. Quando MonsterSearchPanel carregava 2014 (2517 monstros, instantaneo do disk cache) e depois SrdStore Phase 1 carregava 2024 (520 monstros, da rede), o index era sobrescrito com apenas 2024 monstros. Buscar "Strahd" (2014) falhava.

### Causa raiz
```
Timeline:
1. MonsterSearchPanel → loadMonsters("2014") → 200 OK disk cache → buildMonsterIndex(2517) ✓
2. SrdStore Phase 1 → loadMonsters("2024") → 200 OK rede → srdSearchProvider.buildMonsterIndex(520) ✗ SOBRESCREVE
3. Usuario busca "strahd" → index so tem 2024 → "nenhum monstro encontrado"
```

Ambos fuse-search-provider.ts e srd-search.ts compartilham o mesmo singleton monsterIndex.

### Fix
MonsterSearchPanel agora cria um Fuse LOCAL via useRef, isolado do rebuild global do SrdStore:
```js
// ANTES: buildMonsterIndex(monsters); // global singleton
// DEPOIS: fuseRef.current = new Fuse(monsters, FUSE_OPTIONS); // local
```

### Arquivos alterados
- `components/combat/MonsterSearchPanel.tsx` — Fuse local via useRef

## Bug 3: Filtro "all" descartava non-SRD (3f1543b)

### Problema
O sourceFilter default "all" aplicava `base.filter((m) => m.is_srd !== false)`, descartando Strahd (is_srd: false, source: CoS). O auto-switch pra "complete" dependia do hook useExtendedCompendium que verifica content_whitelist + feature flag + localStorage agreement — condicoes que falhavam em aba anonima ou quando o check assincrono nao resolvia a tempo.

### Causa raiz
```js
// ANTES: dependia de hook assincrono
useEffect(() => {
  if (extendedActive && !sourceManuallyChanged.current && isFullDataMode()) {
    setSourceFilter("complete");
  }
}, [extendedActive]); // extendedActive pode demorar ou nunca virar true

// DEPOIS: checa modo diretamente no mount
useEffect(() => {
  if (!sourceManuallyChanged.current && isFullDataMode()) {
    setSourceFilter("complete");
  }
}, []);
```

### Arquivos alterados
- `components/combat/MonsterSearchPanel.tsx` — auto-switch baseado em isFullDataMode() direto

## Regras para agentes

### Ao alterar qualquer coisa em SRD/compendium:

1. **Nunca usar singletons compartilhados para busca local** — componentes que carregam versoes especificas devem ter seu proprio Fuse instance
2. **Caches module-level DEVEM incluir o modo na key** — usar loaderCacheKey() ou equivalente
3. **IndexedDB keys DEVEM incluir cacheSuffix()** — separar "all" de "all-full"
4. **Filtros client-side sao defense-in-depth**, nao a unica barreira — a API e os dados publicos sao a barreira primaria
5. **isFullDataMode() e a fonte de verdade no client** para decidir se o usuario tem acesso a dados completos
6. **Nunca depender de hooks assincronos para gating de UI** quando uma flag sincrona (isFullDataMode) esta disponivel
7. **Testar sempre em aba anonima** — localStorage vazio, IndexedDB vazio, zero cache

### Ao fazer deploy de mudancas em data/srd/:

1. Verificar que outputFileTracingIncludes em next.config.ts inclui data/srd/
2. Rodar `npx tsx scripts/filter-srd-public.ts` para atualizar public/srd/
3. Confirmar: public/srd/ tem 0 monstros non-SRD
4. Confirmar: data/srd/ nao esta no .gitignore

### Contagens de referencia (2026-04-07)

| Bundle | Public (SRD-only) | Full (admin/beta) |
|--------|-------------------|-------------------|
| monsters-2014.json | 419 | 2517 |
| monsters-2024.json | 346 | 520 |
| monsters-mad.json | (mesmo) | (mesmo) |
| spells-2014.json | ~302 | ~319+ |
| spells-2024.json | ~302 | ~319+ |
