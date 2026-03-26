# Epic 13: Aquisição, Conversão & Assinatura Pro

## Epic Overview

Implementar o funil completo de aquisição → ativação → conversão → retenção para o modelo freemium da Taverna do Mestre. Isso inclui: discovery e integração de plataforma de pagamento (Stripe), sistema de tiers (Free/Pro), gates de features Pro, momentos de upsell contextual ("aha moments"), página de pricing, gerenciamento de assinatura, e webhooks de billing.

O mestre Free usa o combat tracker efêmero. Quando tenta salvar campanha, exportar, ou usar features avançadas, encontra nudges contextuais que o levam à assinatura Pro (R$ 14,90/mês ou R$ 119,90/ano).

## Business Value

- **Receita recorrente**: primeira fonte de revenue do produto — assinatura Pro
- **Conversão orgânica**: upsells aparecem nos momentos de maior engajamento, não como interrupção
- **Retenção por valor**: campanha persistente cria lock-in natural — o mestre não cancela porque seu histórico está ali
- **Escalabilidade do negócio**: infraestrutura de billing pronta para módulos futuros (marketplace, add-ons)

## Referências

- [Estratégia de Monetização](../../docs/monetization-strategy.md)
- [Epic 10: Freemium Combat Tracker](./10-0-epic-freemium-combat-tracker.md) — guest mode + upsell modal (pré-requisito)
- Pricing da concorrência: D&D Beyond ($2.99–$5.99), Roll20 ($5.99–$10.99), Owlbear ($3.99–$7.99)

## Scope Definition

### In Scope

- Discovery e integração Stripe (Checkout + Customer Portal + Webhooks)
- Tabela `subscriptions` no Supabase com status, período, tier
- Middleware de feature gating (Free vs Pro)
- Página pública de pricing (`/pricing`)
- Momentos de upsell contextual em 5 pontos da jornada
- Gerenciamento de assinatura (upgrade, cancel, billing history)
- Webhook handler para eventos Stripe (checkout.completed, subscription.updated, etc.)
- Row Level Security (RLS) policies para features Pro

### Explicitly Out of Scope

- Módulos Pro individuais (encounter builder avançado, analytics, homebrew) — serão épicos separados
- Marketplace de conteúdo (V2+)
- Múltiplas campanhas simultâneas (V2+ — por ora, Pro = 1 campanha ativa)
- Pagamento via PIX ou boleto (V2 — Stripe BR suporta, mas simplifica MVP)
- Trial gratuito com prazo (o free é permanente, não é trial)

## Pricing Definido

| Plano | Preço | Stripe Price ID |
|-------|-------|----------------|
| **Free** | R$ 0 | — (sem subscription) |
| **Pro Mensal** | R$ 14,90/mês | Configurar no Stripe Dashboard |
| **Pro Anual** | R$ 119,90/ano (~R$ 9,99/mês) | Configurar no Stripe Dashboard |

## Arquitetura Técnica

### Stack de Pagamento

- **Stripe Checkout** — hosted payment page (sem form de cartão no nosso código)
- **Stripe Customer Portal** — gerenciamento de assinatura (cancel, trocar plano, atualizar cartão)
- **Stripe Webhooks** — source of truth para status da assinatura
- **Supabase** — tabela `subscriptions` sincronizada via webhook

### Data Model

```sql
-- Nova tabela
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  stripe_customer_id text not null,
  stripe_subscription_id text unique,
  status text not null default 'free', -- 'free' | 'active' | 'canceled' | 'past_due' | 'trialing'
  tier text not null default 'free',   -- 'free' | 'pro'
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  constraint unique_user_subscription unique (user_id)
);

-- RLS
alter table public.subscriptions enable row level security;

-- Usuário lê apenas sua própria subscription
create policy "Users can read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Apenas service_role pode inserir/atualizar (via webhook)
create policy "Service role manages subscriptions"
  on public.subscriptions for all
  using (auth.role() = 'service_role');

-- Index
create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_stripe_customer on public.subscriptions(stripe_customer_id);
```

### Feature Gating Pattern

```typescript
// lib/subscription/tier-gate.ts
export type Tier = 'free' | 'pro'

export const PRO_FEATURES = [
  'campaign_persistent',
  'encounter_presets',
  'export_pdf',
  'export_json',
  'player_view_premium',
  'homebrew',
  'analytics',
] as const

export type ProFeature = typeof PRO_FEATURES[number]

export function requiresPro(feature: ProFeature): boolean {
  return PRO_FEATURES.includes(feature)
}
```

```typescript
// lib/hooks/useSubscription.ts
export function useSubscription() {
  // Reads from subscriptions table via Supabase
  // Returns { tier, isActive, isPro, isLoading }
}
```

---

## Aha Moments — Pontos de Upsell Contextual

Estes são os 5 momentos onde o mestre Free sente mais valor e está mais propenso a converter. Cada um tem um nudge específico, não-intrusivo.

| # | Momento | Trigger | Nudge |
|---|---------|---------|-------|
| 1 | **Fim do primeiro combate** | Combat termina (todos derrotados ou mestre encerra) | Toast sutil: "Combate épico! Salve sua campanha pra continuar semana que vem →" |
| 2 | **Tentativa de salvar campanha** | Click em "Salvar Campanha" ou "Salvar Jogadores" | Modal: "Campanhas persistentes são Pro. Seus jogadores ficam salvos, seu histórico preservado." |
| 3 | **Segundo uso em 7 dias** | Mestre Free volta e cria outro combate na mesma semana | Banner inline: "Você mestra toda semana? Pro salva tudo automaticamente." |
| 4 | **Tentativa de exportar** | Click em Export (PDF/JSON) | Modal: "Exporte combat logs e dados da campanha com Pro." |
| 5 | **3+ combates na mesma sessão** | Terceiro combate iniciado sem campanha salva | Toast: "Sessão intensa! Com Pro seus encontros ficam organizados por sessão." |

### Princípios dos Nudges
- **Nunca bloqueia** — o mestre sempre pode continuar usando o free
- **Contextual** — aparece no momento de valor, não aleatoriamente
- **Dismissível** — fecha com um click, não volta por 24h (localStorage cooldown)
- **Sem dark patterns** — botão de fechar é visível, sem countdown, sem urgência falsa

---

## Stories

---

## Story 13.1: Discovery — Plataforma de Assinatura (Stripe)

**Priority**: P0 (Foundation)
**Estimate**: 2 SP

### Description

Configurar conta Stripe, criar produtos e preços, obter API keys e configurar variáveis de ambiente. Documentar decisões de setup.

### Acceptance Criteria

- [ ] Conta Stripe criada (ou existente configurada) com modo test ativo
- [ ] Produto "Taverna Pro" criado no Stripe Dashboard
- [ ] Dois Price IDs criados: mensal (R$ 14,90 BRL) e anual (R$ 119,90 BRL)
- [ ] Variáveis de ambiente configuradas no `.env.local`:
  - `STRIPE_SECRET_KEY` (test key)
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (test key)
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRO_MONTHLY_PRICE_ID`
  - `STRIPE_PRO_YEARLY_PRICE_ID`
- [ ] `.env.example` atualizado com as novas variáveis (sem valores)
- [ ] `stripe` package adicionado ao `package.json`
- [ ] Arquivo `lib/stripe/client.ts` criado com instância Stripe inicializada
- [ ] Documentação em `docs/stripe-setup.md` com passos de configuração para outro dev

### Technical Notes

```bash
npm install stripe
```

```typescript
// lib/stripe/client.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})
```

---

## Story 13.2: Database — Tabela de Subscriptions

**Priority**: P0 (Foundation)
**Estimate**: 3 SP

### Description

Criar a tabela `subscriptions` no Supabase, com RLS policies, índices, e a migration correspondente. Criar o hook `useSubscription` que expõe o tier do usuário logado.

### Acceptance Criteria

- [ ] Migration SQL criada em `supabase/migrations/` com tabela `subscriptions` conforme schema do épico
- [ ] RLS habilitado: usuário lê apenas sua própria subscription; apenas `service_role` insere/atualiza
- [ ] Índices em `user_id` e `stripe_customer_id`
- [ ] Ao criar conta (sign-up), um row é inserido automaticamente com `tier: 'free'`, `status: 'free'` (via trigger ou na API de sign-up)
- [ ] `lib/hooks/useSubscription.ts` criado — retorna `{ tier, status, isPro, isLoading, currentPeriodEnd, cancelAtPeriodEnd }`
- [ ] Hook usa Supabase realtime subscription para atualizar UI instantaneamente quando webhook atualiza a tabela
- [ ] Tipos TypeScript gerados/atualizados para a nova tabela
- [ ] Testes unitários para o hook (mock Supabase)

### Technical Notes

```typescript
// lib/hooks/useSubscription.ts
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useSubscription() {
  // 1. Query initial subscription state
  // 2. Subscribe to realtime changes on own row
  // 3. Return { tier, status, isPro, isLoading, ... }
}
```

Trigger para auto-criar subscription row no sign-up:
```sql
create or replace function public.handle_new_user_subscription()
returns trigger as $$
begin
  insert into public.subscriptions (user_id, stripe_customer_id, status, tier)
  values (new.id, '', 'free', 'free');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute function public.handle_new_user_subscription();
```

---

## Story 13.3: Stripe Webhook Handler

**Priority**: P0 (Core)
**Estimate**: 5 SP

### Description

Criar endpoint de webhook (`/api/webhooks/stripe`) que recebe eventos do Stripe e sincroniza a tabela `subscriptions`. Este é o source of truth para o estado de billing.

### Acceptance Criteria

- [ ] `app/api/webhooks/stripe/route.ts` criado
- [ ] Verificação de assinatura do webhook (`stripe.webhooks.constructEvent`) com `STRIPE_WEBHOOK_SECRET`
- [ ] Eventos tratados:
  - `checkout.session.completed` → cria/atualiza subscription com `status: 'active'`, `tier: 'pro'`
  - `customer.subscription.updated` → atualiza status, período, `cancel_at_period_end`
  - `customer.subscription.deleted` → atualiza para `status: 'canceled'`, `tier: 'free'`
  - `invoice.payment_failed` → atualiza para `status: 'past_due'`
- [ ] Usa `supabaseAdmin` (service_role) para escrever na tabela — não depende de auth do usuário
- [ ] Responde 200 para eventos desconhecidos (não quebra se Stripe manda evento novo)
- [ ] Idempotente — processar o mesmo evento duas vezes não causa efeito duplicado
- [ ] Logs estruturados para cada evento processado (tipo, customer, subscription_id)
- [ ] Testes unitários com payloads mock do Stripe

### Technical Notes

```typescript
// app/api/webhooks/stripe/route.ts
import { stripe } from '@/lib/stripe/client'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)

  switch (event.type) {
    case 'checkout.session.completed': { /* ... */ break }
    case 'customer.subscription.updated': { /* ... */ break }
    case 'customer.subscription.deleted': { /* ... */ break }
    case 'invoice.payment_failed': { /* ... */ break }
  }

  return new Response('ok', { status: 200 })
}
```

**Importante**: O endpoint deve ser excluído do CSRF protection e do body parser do Next.js (raw body necessário para verificação de assinatura).

---

## Story 13.4: Checkout Flow — Criar Sessão de Pagamento

**Priority**: P0 (Core)
**Estimate**: 3 SP

### Description

Criar API route que gera uma Stripe Checkout Session e redireciona o mestre para a página de pagamento hospedada pelo Stripe.

### Acceptance Criteria

- [ ] `app/api/stripe/checkout/route.ts` criado
- [ ] Aceita `POST` com body `{ priceId: string }` (mensal ou anual)
- [ ] Valida que o usuário está autenticado (rejeita 401 se não)
- [ ] Cria ou reutiliza `stripe_customer_id` vinculado ao `user_id`
- [ ] Cria Checkout Session com:
  - `mode: 'subscription'`
  - `line_items: [{ price: priceId, quantity: 1 }]`
  - `success_url: '/app/dashboard?checkout=success'`
  - `cancel_url: '/pricing?checkout=canceled'`
  - `customer` com o Stripe Customer ID
  - `metadata: { user_id, supabase_user_id }` — para correlação no webhook
  - `allow_promotion_codes: true` — prepara para cupons futuros
- [ ] Retorna `{ url: session.url }` para redirect client-side
- [ ] Se o usuário já é Pro (`tier: 'pro'`, `status: 'active'`), retorna 400 com mensagem
- [ ] Testes unitários

### Technical Notes

```typescript
// Criar Stripe Customer se não existe
async function getOrCreateStripeCustomer(userId: string, email: string) {
  const { data: sub } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .single()

  if (sub?.stripe_customer_id) return sub.stripe_customer_id

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  })

  await supabaseAdmin
    .from('subscriptions')
    .update({ stripe_customer_id: customer.id })
    .eq('user_id', userId)

  return customer.id
}
```

---

## Story 13.5: Página de Pricing (`/pricing`)

**Priority**: P1 (Conversion)
**Estimate**: 3 SP

### Description

Criar página pública de pricing que apresenta os dois tiers (Free vs Pro) com comparação visual clara e CTAs para checkout.

### Acceptance Criteria

- [ ] `app/pricing/page.tsx` criado — rota pública (sem auth guard)
- [ ] Layout com dois cards lado a lado:
  - **Free**: lista de features incluídas, CTA "Criar Conta Grátis" → `/auth/sign-up`
  - **Pro**: lista de features Pro, preço mensal/anual com toggle, CTA "Assinar Pro" → cria checkout session
- [ ] Toggle mensal/anual com destaque no desconto anual ("~2 meses grátis")
- [ ] Preço em Reais (R$ 14,90/mês ou R$ 119,90/ano)
- [ ] Se usuário logado e já Pro: CTA muda para "Gerenciar Assinatura" → Customer Portal
- [ ] Se usuário logado e Free: CTA "Assinar Pro" faz POST para `/api/stripe/checkout`
- [ ] Se não logado: CTA "Assinar Pro" → `/auth/sign-up?redirect=/pricing`
- [ ] Página segue design system existente (bg escuro, gold accents, font-display)
- [ ] Mobile responsive
- [ ] Link para `/pricing` adicionado no Navbar
- [ ] SEO: title, description, og:image

### Technical Notes

Design inspiração: cards similares ao comparativo da LP, mas focado em Free vs Pro.

```tsx
// Toggle mensal/anual
const [isAnnual, setIsAnnual] = useState(false)
const priceId = isAnnual
  ? process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID
  : process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID
```

---

## Story 13.6: Customer Portal — Gerenciamento de Assinatura

**Priority**: P1 (Retention)
**Estimate**: 2 SP

### Description

Integrar o Stripe Customer Portal para que assinantes Pro possam gerenciar sua assinatura (cancelar, trocar plano, atualizar cartão) sem que precisemos construir UI de billing.

### Acceptance Criteria

- [ ] `app/api/stripe/portal/route.ts` criado
- [ ] Aceita `POST`, valida auth, obtém `stripe_customer_id` do usuário
- [ ] Cria `stripe.billingPortal.sessions.create` com `return_url: '/app/settings'`
- [ ] Retorna `{ url }` para redirect client-side
- [ ] Stripe Customer Portal configurado no Dashboard:
  - Cancelamento habilitado (com survey opcional)
  - Troca de plano (mensal ↔ anual) habilitada
  - Atualização de método de pagamento habilitada
- [ ] Botão "Gerenciar Assinatura" adicionado na página `/app/settings`
- [ ] Botão só aparece para usuários com `tier: 'pro'` ou `status: 'canceled'` (pra reativar)
- [ ] Cancelamento via portal dispara webhook `customer.subscription.deleted` → handled em 13.3

### Technical Notes

O Customer Portal do Stripe é uma página hospedada — zero UI de billing do nosso lado. Precisa ser configurado no Stripe Dashboard (Settings > Customer Portal).

---

## Story 13.7: Feature Gating Middleware

**Priority**: P0 (Core)
**Estimate**: 3 SP

### Description

Criar o sistema de feature gating que verifica o tier do usuário antes de permitir acesso a features Pro. Inclui componente de UI para gates visuais e server-side check para API routes.

### Acceptance Criteria

- [ ] `lib/subscription/tier-gate.ts` criado com lista de features Pro e helper `requiresPro(feature)`
- [ ] `components/subscription/ProGate.tsx` — wrapper component:
  - Se `isPro`: renderiza `children` normalmente
  - Se não: renderiza `children` com overlay + badge "Pro" + click abre upsell
- [ ] `components/subscription/ProBadge.tsx` — badge visual "PRO" em gold, usado em menus e botões
- [ ] Server-side helper `assertPro(userId)` para API routes — throws 403 se free
- [ ] Gate aplicado nos seguintes pontos (mas sem implementar os módulos em si):
  - Salvar campanha → gate
  - Export PDF/JSON → gate
  - Encounter presets → gate
- [ ] `ProGate` é acessível (aria-label, keyboard navigable)
- [ ] Testes unitários para `requiresPro`, `assertPro`, e render do `ProGate`

### Technical Notes

```tsx
// components/subscription/ProGate.tsx
interface ProGateProps {
  feature: ProFeature
  children: React.ReactNode
  fallback?: React.ReactNode // custom upsell content
}

export function ProGate({ feature, children, fallback }: ProGateProps) {
  const { isPro } = useSubscription()

  if (isPro) return <>{children}</>

  return (
    <div className="relative group cursor-pointer" onClick={() => openUpsell(feature)}>
      <div className="opacity-50 pointer-events-none">{children}</div>
      <ProBadge className="absolute top-2 right-2" />
      {fallback}
    </div>
  )
}
```

---

## Story 13.8: Upsell Contextual — Aha Moments

**Priority**: P1 (Conversion)
**Estimate**: 5 SP

### Description

Implementar os 5 momentos de upsell contextual definidos na estratégia de monetização. Cada momento aparece no contexto certo, é dismissível, e tem cooldown de 24h.

### Acceptance Criteria

- [ ] `lib/hooks/useUpsellTrigger.ts` criado — gerencia estado dos nudges com cooldown (localStorage)
- [ ] `components/subscription/UpsellToast.tsx` — toast sutil com CTA para pricing
- [ ] `components/subscription/UpsellModal.tsx` — modal para ações bloqueadas (salvar, exportar)
- [ ] `components/subscription/UpsellBanner.tsx` — banner inline para retorno recorrente
- [ ] 5 triggers implementados:
  1. **Fim do primeiro combate**: toast após combat end → "Salve sua campanha →"
  2. **Salvar campanha**: modal ao clicar salvar → "Campanhas persistentes são Pro"
  3. **Retorno em 7 dias**: banner inline se `lastVisit` < 7 dias → "Você mestra toda semana?"
  4. **Exportar**: modal ao clicar export → "Exporte com Pro"
  5. **3+ combates na sessão**: toast no terceiro combat start → "Sessão intensa!"
- [ ] Cooldown de 24h por tipo de nudge (localStorage key `upsell-cooldown-{type}`)
- [ ] Todos os nudges são dismissíveis com 1 click
- [ ] Nudges NÃO aparecem para usuários Pro
- [ ] Nudges NÃO aparecem para usuários não-logados (guest mode tem seu próprio upsell no Epic 10)
- [ ] CTAs levam para `/pricing`
- [ ] Testes unitários para lógica de cooldown e trigger conditions

### Technical Notes

```typescript
// lib/hooks/useUpsellTrigger.ts
type UpsellType = 'combat_end' | 'save_campaign' | 'return_visit' | 'export' | 'multi_combat'

export function useUpsellTrigger() {
  const { isPro } = useSubscription()

  function shouldShow(type: UpsellType): boolean {
    if (isPro) return false
    const lastShown = localStorage.getItem(`upsell-cooldown-${type}`)
    if (lastShown && Date.now() - Number(lastShown) < 24 * 60 * 60 * 1000) return false
    return true
  }

  function markShown(type: UpsellType) {
    localStorage.setItem(`upsell-cooldown-${type}`, String(Date.now()))
  }

  return { shouldShow, markShown }
}
```

---

## Story 13.9: Checkout Success — Ativação + Onboarding Pro

**Priority**: P1 (UX)
**Estimate**: 2 SP

### Description

Quando o mestre completa o checkout com sucesso e retorna ao app, mostrar confirmação visual, ativar features Pro imediatamente, e guiar para criação da primeira campanha.

### Acceptance Criteria

- [ ] `/app/dashboard` detecta query param `?checkout=success`
- [ ] Mostra toast/banner de celebração: "Bem-vindo ao Pro! Sua Taverna ficou mais poderosa."
- [ ] Aguarda até `useSubscription` retornar `isPro: true` (webhook pode levar alguns segundos)
- [ ] Mostra loading state enquanto aguarda: "Ativando sua assinatura..."
- [ ] Após confirmação, CTA proeminente: "Criar sua primeira campanha →"
- [ ] Remove `?checkout=success` da URL após exibição (history.replaceState)
- [ ] Se checkout cancelado (`/pricing?checkout=canceled`): toast neutro "Checkout cancelado. Sem problemas — o free é pra sempre."

### Technical Notes

O webhook do Stripe pode levar 1-5 segundos após o redirect. Usar polling no `useSubscription` ou Supabase realtime para detectar a mudança de tier.

```typescript
// Polling fallback
useEffect(() => {
  if (searchParams.get('checkout') !== 'success') return
  const interval = setInterval(async () => {
    const { data } = await supabase.from('subscriptions').select('tier').eq('user_id', userId).single()
    if (data?.tier === 'pro') {
      clearInterval(interval)
      setActivated(true)
    }
  }, 2000)
  return () => clearInterval(interval)
}, [])
```

---

## Story 13.10: Settings — Subscription Status & Management

**Priority**: P2 (Polish)
**Estimate**: 2 SP

### Description

Adicionar seção de assinatura na página de settings existente, mostrando status atual, próxima cobrança, e link para Customer Portal.

### Acceptance Criteria

- [ ] Seção "Assinatura" adicionada em `/app/settings`
- [ ] Exibe:
  - Tier atual (Free / Pro) com badge visual
  - Se Pro: data da próxima cobrança, valor, plano (mensal/anual)
  - Se Pro + cancelando: "Sua assinatura termina em {data}. Você pode reativar a qualquer momento."
  - Se Free: "Você está no plano gratuito." + CTA "Ver planos Pro →"
- [ ] Botão "Gerenciar Assinatura" → Customer Portal (via 13.6)
- [ ] Botão "Upgrade para Pro" → `/pricing` (apenas para Free)
- [ ] Responsive — funciona em mobile
- [ ] Usa `useSubscription` hook (de 13.2)

---

## Story 13.11: LP & Navbar — Links para Pricing

**Priority**: P2 (Discovery)
**Estimate**: 1 SP

### Description

Adicionar links estratégicos para a página de pricing no Navbar e na Landing Page.

### Acceptance Criteria

- [ ] Navbar: link "Preços" adicionado (visível para todos, logados ou não)
- [ ] LP: link "Ver preços →" adicionado na `FinalCtaSection`
- [ ] LP: tabela comparativa (ComparisonSection) ganha link sutil abaixo: "Compare os planos →" → `/pricing`
- [ ] Footer: link "Preços" na lista de links
- [ ] Todos os links apontam para `/pricing`
- [ ] Não altera CTAs existentes (sign-up, login, testar grátis)

---

## Story 13.12: Proteção contra Downgrade — Grace Period

**Priority**: P2 (Retention)
**Estimate**: 2 SP

### Description

Quando um assinante Pro cancela, manter acesso Pro até o fim do período pago. Após expirar, fazer downgrade graceful para Free sem perder dados.

### Acceptance Criteria

- [ ] Cancelamento via Customer Portal seta `cancel_at_period_end: true` (webhook já trata em 13.3)
- [ ] Enquanto `cancel_at_period_end: true` e `current_period_end > now()`: acesso Pro mantido
- [ ] Banner sutil no dashboard: "Sua assinatura Pro encerra em {dias restantes} dias. [Reativar]"
- [ ] Após `current_period_end` passar: tier cai para `free` automaticamente (webhook `customer.subscription.deleted`)
- [ ] Dados de campanha do mestre NÃO são deletados — ficam read-only
- [ ] Mestre pode ver histórico de sessões mas não criar novos combates na campanha
- [ ] CTA para reativar: "Reative o Pro e continue sua campanha →" → Customer Portal ou `/pricing`
- [ ] Testes para lógica de grace period

### Technical Notes

A lógica é toda server-side via webhook. O `useSubscription` hook precisa considerar:
```typescript
const isPro = tier === 'pro' && status === 'active'
  || (status === 'canceled' && currentPeriodEnd && new Date(currentPeriodEnd) > new Date())
```

---

## Story Dependency Map

```
13.1 (Stripe Setup)
  └→ 13.2 (DB + Hook)
       └→ 13.3 (Webhooks)
       └→ 13.7 (Feature Gating)
            └→ 13.8 (Upsell Moments)
       └→ 13.4 (Checkout Flow)
            └→ 13.5 (Pricing Page)
            └→ 13.9 (Checkout Success)
       └→ 13.6 (Customer Portal)
            └→ 13.10 (Settings)
            └→ 13.12 (Grace Period)
13.11 (LP/Navbar Links) ← independent, can ship in parallel
```

**Recommended Implementation Order**:
13.1 → 13.2 → 13.3 → 13.4 → 13.7 → 13.5 → 13.6 → 13.8 → 13.9 → 13.10 → 13.11 → 13.12

---

## Story Summary

| # | Story | Priority | Estimate | Fase |
|---|-------|----------|----------|------|
| 13.1 | Stripe setup & discovery | P0 | 2 SP | Foundation |
| 13.2 | DB — tabela subscriptions + hook | P0 | 3 SP | Foundation |
| 13.3 | Stripe webhook handler | P0 | 5 SP | Foundation |
| 13.4 | Checkout flow (criar sessão) | P0 | 3 SP | Core |
| 13.5 | Página de pricing | P1 | 3 SP | Conversion |
| 13.6 | Customer Portal integration | P1 | 2 SP | Retention |
| 13.7 | Feature gating middleware | P0 | 3 SP | Core |
| 13.8 | Upsell contextual — aha moments | P1 | 5 SP | Conversion |
| 13.9 | Checkout success + onboarding Pro | P1 | 2 SP | UX |
| 13.10 | Settings — subscription status | P2 | 2 SP | Polish |
| 13.11 | LP & Navbar — links pricing | P2 | 1 SP | Discovery |
| 13.12 | Grace period no downgrade | P2 | 2 SP | Retention |
| | **Total** | | **33 SP** | |

---

## Definition of Done

- Todas as AC de todas as stories checked
- Stripe test mode funcional end-to-end: signup → free → checkout → pro → manage → cancel → grace → free
- Webhooks verificados e idempotentes
- Feature gates bloqueiam corretamente features Pro para free
- Upsells aparecem nos 5 momentos corretos e respeitam cooldown
- Pricing page responsiva e funcional
- Customer Portal acessível via settings
- RLS impede acesso cross-user a subscriptions
- Nenhuma regressão em features existentes (combat tracker, oracle, player view)
- Todos os testes passam (`npm test`)
- Manual smoke test: fluxo completo de free → pro → cancel → grace period → reativação
