# Quick Spec: Security Hardening Sprint

> **Prioridade:** P0 — ANTES de qualquer launch público
> **Estimativa:** ~6h
> **Data:** 2026-03-30
> **Referência:** Checklist de pre-launch + auditoria documental

---

## Contexto

Rate limiting cobre apenas 2/15 API endpoints. ErrorBoundary só existe no layout autenticado. Indexes faltam nas tabelas V2 (campaign_members, campaign_invites, homebrew). Esses gaps precisam ser fechados antes de qualquer tração real.

---

## Story 1: Rate Limiting em TODOS os API Endpoints

**Problema:** 13 de 15 API routes não têm rate limiting. `lib/rate-limit.ts` existe mas só é usado em `oracle-ai` e `track`.

**Endpoints sem rate limit (por criticidade):**

| Endpoint | Risco | Limite sugerido |
|----------|-------|-----------------|
| `/api/account/delete` | Destrutivo | 3 req/15min |
| `/api/checkout` | Abuso de sessões Stripe | 5 req/15min |
| `/api/billing-portal` | Sessões Stripe | 5 req/15min |
| `/api/trial` | Trial abuse | 5 req/15min |
| `/api/campaign/[id]/invites` | Spam de convites | 20 req/15min |
| `/api/player-audio` | Upload abuse (storage) | 10 req/15min |
| `/api/session/[id]/files` | Upload abuse (storage) | 10 req/15min |
| `/api/session/[id]/state` | Polling fallback (legítimo alto volume) | 60 req/min |
| `/api/user/language` | Baixo risco | 10 req/15min |
| `/api/admin/content` | Admin only (já protegido) | 30 req/15min |
| `/api/admin/metrics` | Admin only | 30 req/15min |
| `/api/admin/users` | Admin only | 30 req/15min |
| `/api/webhooks/stripe` | NÃO aplicar rate limit (Stripe controla) | skip |

**Implementação:**

1. Criar helper em `lib/rate-limit.ts`:
```typescript
export async function withRateLimit(
  req: Request,
  maxRequests: number = 10,
  window: string = "15 m"
): Promise<RateLimitResult>
```

2. Adicionar no início de cada route handler:
```typescript
const ip = req.headers.get("x-forwarded-for") ?? "unknown";
const { limited } = await checkRateLimit(`${ip}:endpoint-name`);
if (limited) return new Response("Too Many Requests", { status: 429 });
```

3. **Exceção:** `/api/webhooks/stripe` NÃO deve ter rate limit (Stripe retries on failure).

**AC:**
- [ ] Todos os 12 endpoints (exceto webhook) têm rate limiting
- [ ] Resposta 429 com header `Retry-After`
- [ ] Teste unitário para `checkRateLimit` com diferentes identifiers
- [ ] Fail-open continua funcionando (Redis indisponível = permite)

---

## Story 2: ErrorBoundary em TODAS as Rotas

**Problema:** Apenas `app/app/layout.tsx` e `app/join/[token]/error.tsx` têm error boundaries. Se `/try/`, `/pricing/`, `/monsters/`, `/auth/*`, ou `/admin/` crashar, o usuário vê tela branca.

**Rotas que faltam error.tsx:**

| Rota | Impacto se crashar |
|------|-------------------|
| `app/try/` | Guest perde combate — péssima primeira impressão |
| `app/auth/*` | Usuário não consegue logar/registrar |
| `app/pricing/` | Funil de conversão quebrado |
| `app/monsters/` + `app/spells/` | SEO pages — Google indexa erro |
| `app/admin/` | Admin fica cego |
| `app/invite/[token]/` | Convite de campanha falha |
| `app/app/` (nested) | Dashboard, session, compendium, etc. |

**Implementação:**

1. Criar `app/try/error.tsx` — Mostra mensagem amigável + botão "Tentar novamente" + link para signup
2. Criar `app/auth/error.tsx` — Já existe `app/auth/error/page.tsx`, mas precisa de `error.tsx` como boundary
3. Criar `app/monsters/error.tsx` + `app/spells/error.tsx` — Fallback com link para home
4. Criar `app/admin/error.tsx` — Log de erro + botão retry
5. Criar `app/invite/[token]/error.tsx` — Mensagem "convite inválido" + link para home
6. Criar `app/pricing/error.tsx` — Fallback com link para contato
7. Criar `app/app/error.tsx` — Catch-all para rotas autenticadas (se não existir nested)

**Template base:**
```tsx
"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h2 className="text-lg font-semibold">{/* i18n error message */}</h2>
      <button onClick={reset} className="px-4 py-2 bg-gold text-black rounded">
        {/* i18n retry */}
      </button>
    </div>
  );
}
```

**AC:**
- [ ] Toda rota de página tem `error.tsx` no mesmo diretório ou em parent layout
- [ ] Nenhuma rota mostra stack trace raw para o usuário
- [ ] Sentry captura o erro automaticamente (já integrado via `@sentry/nextjs`)
- [ ] Todas as mensagens de erro são i18n (pt-BR + en)
- [ ] Teste manual: causar crash deliberado em cada rota e verificar boundary

---

## Story 3: Database Indexes para Tabelas V2

**Problema:** Tabelas adicionadas nas migrations 025-039 não têm indexes além de PKs. Queries comuns vão ficar lentas com crescimento.

**Indexes faltantes:**

```sql
-- campaign_members: query principal é "membros de uma campanha" + "campanhas de um user"
CREATE INDEX idx_campaign_members_campaign_id ON campaign_members(campaign_id);
CREATE INDEX idx_campaign_members_user_id ON campaign_members(user_id);
CREATE UNIQUE INDEX idx_campaign_members_unique ON campaign_members(campaign_id, user_id);

-- campaign_invites: lookup por token + listagem por campanha
CREATE INDEX idx_campaign_invites_campaign_id ON campaign_invites(campaign_id);
CREATE INDEX idx_campaign_invites_token ON campaign_invites(token);
CREATE INDEX idx_campaign_invites_email ON campaign_invites(email);

-- homebrew: listagem por owner
CREATE INDEX idx_homebrew_user_id ON homebrew(user_id);

-- feature_flags: lookup por flag name
CREATE INDEX idx_feature_flags_name ON feature_flags(name);

-- player_characters: lookup por user_id (V2 field)
CREATE INDEX idx_player_characters_user_id ON player_characters(user_id)
  WHERE user_id IS NOT NULL;

-- combatants: filtering por is_hidden (broadcast filtering)
CREATE INDEX idx_combatants_hidden ON combatants(encounter_id, is_hidden)
  WHERE is_hidden = true;
```

**Implementação:**
1. Criar migration `040_v2_indexes.sql` com todos os indexes acima
2. Rodar `supabase migration new v2_indexes` → editar o arquivo
3. Testar localmente com `supabase db reset`
4. Verificar que nenhum index já existe (evitar duplicatas)

**AC:**
- [ ] Migration 040 criada e aplicada sem erro
- [ ] `EXPLAIN ANALYZE` nas queries principais mostra Index Scan (não Seq Scan)
- [ ] Nenhuma regressão em testes existentes

---

## Story 4: Security Headers Audit

**Problema:** `next.config.ts` já tem security headers, mas validar que estão completos e corretos.

**Checklist:**
- [ ] `Strict-Transport-Security: max-age=31536000; includeSubDomains` (HSTS)
- [ ] `X-Frame-Options: DENY` (clickjacking)
- [ ] `X-Content-Type-Options: nosniff` (MIME sniffing)
- [ ] `Referrer-Policy: strict-origin-when-cross-origin`
- [ ] `Content-Security-Policy` permite: Supabase, Sentry, Vercel, Stripe.js
- [ ] CSP bloqueia inline scripts (exceto Next.js nonce)
- [ ] `Permissions-Policy: camera=(), microphone=(), geolocation=()`

**Implementação:**
1. Ler `next.config.ts` e validar cada header
2. Adicionar headers faltantes
3. Adicionar Stripe.js ao CSP se não estiver (necessário para checkout)
4. Testar com https://securityheaders.com após deploy

**AC:**
- [ ] Nota A ou A+ no securityheaders.com
- [ ] Stripe checkout funciona sem CSP violation
- [ ] Sentry reporting funciona sem CSP violation
