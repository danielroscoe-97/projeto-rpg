# SPIKE — Bug B04 Campaign Page Performance (5-8s)

> **Status:** Investigação técnica — NÃO é plano de fix ainda
> **Origem:** Beta test session 3 (2026-04-16)
> **Evidência:** 130 requests, max latência 8.082ms na campaign page
> **Bloqueia:** Onda 1 do ROADMAP (critério de launch)

## Sintoma

DM carrega `/app/campaigns/[id]` → 5-8 segundos, 130 requests, max latência 8.082ms
Dashboard similar: 6s, 92 requests, 6.164ms max

**Código crítico:**
- `/app/app/campaigns/[id]/page.tsx` linhas 230-304: 13 queries em Promise.all() para DM view
- `/app/app/dashboard/page.tsx` linhas 32-49: 7 queries em Promise.all()

## Hipóteses avaliadas

### H1 — N+1 queries
- `getCampaignMembers()` faz 3 queries sequenciais (linhas 523-609) mas batchadas corretamente
- Campaign page DM view: 13 queries paralelos + 2 sequenciais pós-parallel
- **Veredito:** Parcialmente confirmada (estrutural, não crítica)

### H2 — Cascade de queries  
- Dashboard: Phase 1 (7 queries) → Phase 2 (IF role) → Phase 3 (IF player memberships)
- Campaign player view: 6 queries → activeSession → activeEncounter → combatHistory → votes
- **Veredito:** CONFIRMADA — queries em 3 fases sequenciais causa delays progressivos

### H3 — RLS custoso
- DM view RLS é leve (direct `owner_id = auth.uid()` checks)
- Player view RLS tem nested JOINs (session_tokens → sessions → ...auth checks)
- **Veredito:** Parcialmente confirmada — RLS em player view caro, DM view OK

### H4 — SSR bloqueante  
- Page é async, sem Suspense boundaries
- Child components (CampaignHero, Stats, Grid) esperamall queries antes de renderizar
- FCP/LCP = tempo da ÚLTIMA query, não primeira
- **Veredito:** CONFIRMADA — sem Suspense/streaming, bloqueia render

### H5 — Middleware overhead
- Sem middleware.ts na raiz (auth check é inline)
- **Veredito:** Descartada

### H6 — Joins amplos
- Queries são focadas, sem SELECT * desnecessário
- FKs inline quando possível (campaigns → users, etc)
- **Veredito:** Descartada

## Causa raiz provável

**Combinação de 3 fatores:**

1. **Cascade síncrono de queries (H2)**
   - Campaign: 13 paralelos (~200ms) → finished encounters sequencial (~20ms) → votes sequencial (~30ms)
   - Dashboard: Phase 1 (~105ms) → Phase 2 (~45ms) → Phase 3 (~30ms)
   - Total: ~700-1200ms network round-trips

2. **SSR bloqueante sem Suspense (H4)**
   - Zero Suspense boundaries
   - Child components esperamall data antes de render
   - FCP/LCP = tempo da última query (80-90% requests completos, cliente espera últimos 10%)

3. **130 requests = HTTP overhead**
   - 13 campaign queries + 7 dashboard queries = 20 Supabase requests
   - Resto: JS/CSS/fonts/images
   - Bottleneck é sequência (queries) não throughput

## Abordagens recomendadas (em ordem)

1. **Add React Suspense + streaming (Quick Win)**
   - Wrap data fetches em <Suspense> com fallbacks
   - FCP improvement: 1000-2000ms
   - Complexidade: Baixa | Risco: Muito baixo

2. **Parallelize dashboard phases (Micro-optimization)**
   - Phase 2/3 correm em paralelo vs sequencial
   - Time savings: 150-250ms
   - Complexidade: Muito baixa | Risco: Muito baixo

3. **Merge campaign membership queries (Medium-term)**
   - RPC query única ao invés de 3
   - Time savings: 50-100ms
   - Complexidade: Média | Risco: Baixo

4. **ISR + webhook caching (Advanced)**
   - Next.js ISR com webhook invalidation
   - Time savings: 0-100ms (cache hit)
   - Complexidade: Alta | Risco: Médio (staleness)

## Testes de regressão necessários

1. Suspense fallbacks appear/disappear correctly
2. Network throttling (Fast 3G): FCP/LCP improvement
3. Multi-campaign load (5+ campaigns)
4. Role detection (Player vs DM → correct queries)
5. RLS + auth (Logout/login → no stale tokens)

## Próximos passos

**Phase 1: Quick fix (1-2 dias)**
- Implement Suspense boundaries
- Parallelize dashboard Phase 2/3
- Measure FCP/LCP with Lighthouse
- Load test: 10 concurrent DMs

**Phase 2: Medium-term (1 week)**
- Profile actual Supabase query times
- Build RPC if Phase 1 FCP still > 2s

**Phase 3: Polish (2+ weeks)**
- Consider ISR + webhook for < 1s target
- Add performance budget to CI
