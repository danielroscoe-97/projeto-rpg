# Quick Spec: Bundle Size Optimization

> **Horizonte:** 2.4 — Robustez Arquitetural
> **Prioridade:** P2 — Preparar para 5x mais conteúdo sem degradar TTI
> **Estimativa:** ~6h
> **Data:** 2026-03-30

---

## Contexto

SRD bundles (monsters + spells, 2014 + 2024) são carregados integralmente no app load via `SrdInitializer`. À medida que adicionamos items, equipment, feats, e races, o bundle vai crescer significativamente. O TTI target é ≤3s — precisa ser mantido mesmo com 5x mais conteúdo.

Além disso, o JS bundle do app inclui tudo (combat, oracle, admin, billing, tour) mesmo que o usuário só acesse uma feature.

---

## Story 1: Audit de Bundle Atual

**Implementação:**

1. Rodar análise de bundle:
```bash
ANALYZE=true next build
# ou
npx @next/bundle-analyzer
```

2. Mapear:
   - Tamanho total do JS bundle (First Load JS)
   - Top 10 módulos por tamanho
   - Tamanho de cada SRD bundle (monsters-2014.json, etc.)
   - Tamanho das dependências pesadas (framer-motion, @sentry/nextjs, etc.)

3. Documentar baseline em `docs/bundle-audit-baseline.md`:
```
Total JS: XXX KB (gzipped)
SRD Monsters 2014: XXX KB
SRD Monsters 2024: XXX KB
SRD Spells 2014: XXX KB
SRD Spells 2024: XXX KB
Top deps: framer-motion (XX KB), @sentry/nextjs (XX KB), ...
```

**AC:**
- [ ] Bundle analyzer configurado
- [ ] Baseline documentado
- [ ] Top 5 oportunidades de otimização identificadas

---

## Story 2: Lazy Loading de SRD por Versão

**Problema:** `SrdInitializer` carrega TODOS os bundles (2014 + 2024) no app load. A maioria dos DMs usa só uma versão.

**Implementação:**

1. Modificar `SrdInitializer` para carregar apenas a versão preferida do DM:
```typescript
// Ler preferência do DM (default: 2024)
const preferredVersion = user?.preferred_ruleset ?? '2024';

// Carregar apenas a versão preferida no init
await loadBundle(`monsters-${preferredVersion}.json`);
await loadBundle(`spells-${preferredVersion}.json`);

// Carregar a outra versão em background (idle callback)
requestIdleCallback(() => {
  loadBundle(`monsters-${otherVersion}.json`);
  loadBundle(`spells-${otherVersion}.json`);
});
```

2. No guest mode, carregar 2024 por default (versão mais recente).

3. Se DM troca versão mid-session, carregar on-demand:
```typescript
// Ao trocar versão de um combatant
if (!isBundleLoaded(newVersion)) {
  await loadBundle(`monsters-${newVersion}.json`);
  // Mostrar loading indicator breve
}
```

**Impacto estimado:** Reduzir Initial Load em ~40% (metade do SRD).

**AC:**
- [ ] Versão preferida carrega no init
- [ ] Outra versão carrega em background (não bloqueia)
- [ ] Troca de versão mid-combat funciona (on-demand load)
- [ ] TTI reduzido mensurável (antes/depois)

---

## Story 3: Code Splitting por Feature

**Problema:** Admin panel, billing UI, homebrew creator, e tour são carregados mesmo quando não necessários.

**Implementação:**

1. Dynamic imports para rotas pesadas:
```typescript
// app/admin/page.tsx
const AdminDashboard = dynamic(() => import('@/components/admin/MetricsDashboard'), {
  loading: () => <Skeleton />,
});

// components/billing/SubscriptionPanel.tsx
const StripeElements = dynamic(() => import('@stripe/react-stripe-js'), {
  ssr: false,
});
```

2. Lazy load de componentes opcionais:
```typescript
// Tour — só carrega no /try
const TourProvider = dynamic(() => import('@/components/tour/TourProvider'));

// Homebrew — só carrega quando DM abre creator
const HomebrewCreator = dynamic(() => import('@/components/homebrew/HomebrewCreator'));

// Audio — só carrega quando DM abre soundboard
const DmSoundboard = dynamic(() => import('@/components/audio/DmSoundboard'));
```

3. Verificar que `framer-motion` usa tree-shaking:
```typescript
// BOM: import específico
import { motion, AnimatePresence } from 'framer-motion';
// EVITAR: import de tudo
import * as framer from 'framer-motion';
```

**AC:**
- [ ] Admin, billing, homebrew, tour são lazy-loaded
- [ ] JS bundle da rota principal (combat) é menor
- [ ] Skeleton/loading states aparecem durante lazy load
- [ ] Zero regressão funcional

---

## Story 4: SRD Streaming Search (Futuro)

**Problema futuro:** Quando adicionarmos items, equipment, feats, races — o bundle total pode ultrapassar 5MB. Fuse.js index em memória ficará pesado.

**Arquitetura proposta (não implementar agora, apenas preparar):**

```
Fase 1 (atual): Tudo em memória via Fuse.js ✅
Fase 2: SRD split em chunks menores (monsters A-M, N-Z)
        Fuse.js index parcial + fetch rest on demand
Fase 3: Search via Supabase full-text search (pg_trgm)
        Client-side Fuse.js apenas para cache hits
        Server-side para cold queries
```

**Preparação agora:**
1. Abstrair busca atrás de interface:
```typescript
// lib/srd/search-provider.ts
interface SrdSearchProvider {
  search(query: string, options: SearchOptions): Promise<SearchResult[]>;
  isReady(): boolean;
}

// Implementação atual:
class FuseSearchProvider implements SrdSearchProvider { ... }

// Futura:
class HybridSearchProvider implements SrdSearchProvider {
  // Tenta Fuse.js local, fallback para Supabase
}
```

2. `srd-store.ts` usa o provider ao invés de Fuse.js direto.

**AC:**
- [ ] Interface `SrdSearchProvider` criada
- [ ] `FuseSearchProvider` implementa a interface (adapter do código atual)
- [ ] `srd-store.ts` usa o provider
- [ ] Zero mudança funcional (refactor only)
- [ ] Documentar que `HybridSearchProvider` é o plano para quando bundles > 5MB
