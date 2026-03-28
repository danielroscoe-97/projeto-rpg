---
stepsCompleted: [1, 2]
inputDocuments: []
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'Sistema de Cupons de Influenciadores para SaaS (Stripe + Supabase + Next.js)'
research_goals: 'Pesquisar APIs do Stripe para cupons/promoções, padrões de referral/affiliate, arquitetura de banco de dados, cálculo de comissões, UX de checkout com cupom, e considerações legais no Brasil'
user_name: 'Dani_'
date: '2026-03-28'
web_research_enabled: true
source_verification: true
---

# Research Report: technical

**Date:** 2026-03-28
**Author:** Dani_
**Research Type:** technical

---

## Research Overview

Pesquisa técnica sobre implementação de um sistema de cupons de influenciadores/afiliados para o Pocket DM, um SaaS de RPG combat tracker. Foco em integração com Stripe, modelagem de dados no Supabase (PostgreSQL), padrões de mercado para referral/affiliate programs, e considerações legais no Brasil.

**Metodologia:** Pesquisa web com verificação de múltiplas fontes, análise de documentação oficial do Stripe, estudo de plataformas de referência (Rewardful, FirstPromoter, Refferq), e análise de cases reais (Fathom Analytics, Kinsta).

---

## Confirmação de Escopo da Pesquisa Técnica

**Tópico:** Sistema de Cupons de Influenciadores para SaaS (Stripe + Supabase + Next.js)
**Objetivos:** Pesquisar APIs do Stripe para cupons/promoções, padrões de referral/affiliate, arquitetura de banco de dados, cálculo de comissões, UX de checkout com cupom, e considerações legais no Brasil

**Escopo Técnico:**

- Análise de Arquitetura — design patterns, APIs do Stripe, modelagem de dados
- Abordagens de Implementação — checkout com cupom, tracking de comissões, webhooks
- Stack Tecnológica — Stripe Coupons/Promotion Codes, Supabase RLS, Next.js API Routes
- Padrões de Integração — webhooks, metadata, attribution tracking
- Considerações de Performance — caching, cálculo de comissões, escalabilidade

**Escopo Confirmado:** 2026-03-28

---

## Análise de Stack Tecnológica

### Stripe: Coupons vs Promotion Codes

O Stripe oferece duas camadas complementares para descontos:

**Coupons (camada interna):**
- Objeto que define o desconto (percentual ou valor fixo)
- Pode ter `duration`: `once`, `repeating` (N meses), ou `forever`
- **ATENÇÃO (mudança 2025):** Stripe removeu a possibilidade de criar cupons com `amount_off` + `duration: 'forever'`. Cupons indefinidos com valor fixo não são mais permitidos
- Pode restringir a produtos específicos via `applies_to`
- Aplicado programaticamente via API (server-side)

**Promotion Codes (camada customer-facing):**
- Códigos que o cliente digita no checkout (ex: `JOAO20`, `MARI_RPG`)
- Cada código aponta para um Coupon subjacente
- Múltiplos códigos podem apontar pro mesmo Coupon (ex: `INFLUENCER_A` e `INFLUENCER_B` → mesmo cupom de R$2,00 off)
- Restrições adicionais: limite de uso, data de expiração, cliente específico
- Clientes podem auto-resgatar no Customer Portal

**Limitação crítica no Checkout Session:**
- `allow_promotion_codes: true` **OU** `discounts: [{ coupon: 'ID' }]` — NÃO ambos simultaneamente
- Para o caso de influenciadores, `allow_promotion_codes: true` é o caminho, permitindo que o usuário digite o código do influenciador no checkout

_Fonte: [Stripe Docs — Coupons and Promotion Codes](https://docs.stripe.com/billing/subscriptions/coupons), [Stripe API — Promotion Codes](https://docs.stripe.com/api/promotion_codes), [Stripe Docs — Add Discounts](https://docs.stripe.com/payments/checkout/discounts)_

### Tracking de Afiliados via Stripe Webhooks

O Stripe permite rastrear qual Promotion Code foi usado em cada transação:

**Fluxo de tracking:**
1. Cada influenciador recebe um Promotion Code único (ex: `JOAO_RPG`)
2. Cliente usa o código no Stripe Checkout
3. No webhook `checkout.session.completed`, o desconto aplicado contém referência ao Promotion Code usado
4. No webhook `invoice.payment_succeeded`, a subscription tem o discount com o coupon/promotion code associado
5. Comissão é calculada e creditada ao influenciador automaticamente

**Metadata como reforço:**
- `client_reference_id` ou `session.metadata.referral_code` podem complementar o tracking
- Metadata é propagada para todos os webhooks subsequentes
- Promotion Codes são imunes a ad blockers (não dependem de cookies/JS tracking)

_Fonte: [Stripe Metadata Use Cases](https://docs.stripe.com/metadata/use-cases), [Stripe — Using Metadata with Checkout Sessions](https://support.stripe.com/questions/using-metadata-with-checkout-sessions)_

### Plataformas de Referência do Mercado

**Rewardful** (a partir de $49/mês):
- Integração nativa com Stripe, setup em 15min
- Tracking por coupon code (ideal para influenciadores em podcasts/YouTube)
- Ajusta comissões automaticamente: trial conversions, upgrades, downgrades, refunds, cancelamentos
- 0% de taxa sobre transações
- Coupon-based attribution captura word-of-mouth offline

**FirstPromoter** (7+ anos, 2000+ clientes):
- "Stripe Instant Flow" — setup de coupon tracking em <5min sem dev
- Affiliates podem gerar seus próprios códigos
- Payouts automatizados via PayPal e Wise com coleta de tax forms
- Detecção de fraude com algoritmos anti-abuse

**Refferq** (open-source, Next.js + PostgreSQL):
- Self-hosted, gratuito
- Rotas `/r/[code]` ou `?ref=CODE` para tracking
- 38+ endpoints de API
- Schema PostgreSQL production-ready com migrations automáticas
- Admin panel para review e aprovação de payouts

**Decisão para o Pocket DM:** Construir in-house é viável dado que:
- Já temos Stripe integrado
- O volume de influenciadores será pequeno (micro-influenciadores de nicho RPG)
- Evita custo mensal de plataforma terceira ($49+/mês)
- Controle total sobre a experiência e dados

_Fonte: [Rewardful](https://www.rewardful.com/stripe), [FirstPromoter](https://firstpromoter.com/), [Refferq](https://www.refferq.com/), [Cello — Best Referral Platforms 2025](https://cello.so/best-referral-marketing-platform-2025/)_

### Modelagem de Banco de Dados (PostgreSQL/Supabase)

Padrões encontrados no mercado para schema de afiliados:

**Abordagem Fathom Analytics (simples, 2 tabelas):**
- `affiliate_payments`: parent_user_id, child_user_id, invoice_amount_paid, amount_to_payout, available_at (30 dias após pagamento)
- `referral_code_performance`: analytics de cada código

**Abordagem Kinsta (event/ledger-based):**
- Sistema de ledger para registrar eventos de comissão
- One-time commission: registra, vincula ao referral, marca como processado
- Recurring commission: calcula por período, "esquece" períodos já processados
- Agregações = soma simples de rows do DB

**Abordagem Refferq (Next.js + PostgreSQL, mais completa):**
- Tabelas: affiliates, referral_codes, conversions, commissions, payouts
- Type-safe queries com migrations automáticas
- Admin panel para aprovação de payouts

**Recomendação para o Pocket DM:** Abordagem híbrida simples:
- `influencers` (perfil do influenciador, vinculado a user)
- `coupons` (referência ao Stripe Promotion Code, vinculado ao influenciador)
- `referrals` (cada conversão: quem indicou, quem assinou, valor, comissão)
- `commission_payouts` (ledger de pagamentos de comissão)

_Fonte: [Fathom Analytics — How We Built Our Referral Program](https://usefathom.com/blog/how-we-built-our-referral-program), [Kinsta — Affiliate System](https://kinsta.com/blog/affiliate-system/), [Refferq](https://www.refferq.com/)_

### Considerações Legais no Brasil

**Afiliado digital NÃO pode ser MEI:**
- CNAE 7490-1/04 (Intermediação e agenciamento de serviços) não é permitido no MEI
- Receita Federal está fiscalizando uso indevido de CNAEs no MEI
- Multas podem incluir recolhimento retroativo de 5 anos + 80% sobre impostos devidos

**Caminho legal correto para influenciadores:**
- Abrir Microempresa (ME) no Simples Nacional
- CNAE de intermediação se enquadra no Anexo V (15,5% inicial)
- Com Fator R, pode migrar para Anexo III (6% inicial)
- Lucro Presumido: alíquotas de 11,33% a 16,33%
- Obrigatório emitir Nota Fiscal com certificado digital

**Implicações para o Pocket DM:**
- Influenciadores PF podem receber comissão, mas precisam declarar como renda tributável
- Para simplificar, o sistema pode funcionar com valores baixos (R$1,50/venda) sem exigir NF inicialmente
- À medida que escalar, exigir CNPJ e NF para pagamentos de comissão
- Manter registro (ledger) de todas as comissões para compliance fiscal
- Considerar termos de uso claros sobre responsabilidade fiscal do influenciador

**Mudanças da Reforma Tributária (2026):**
- MEI será obrigado a emitir NF para pessoas físicas (CPF)
- Nova categoria: Nanoempreendedor (até R$40,5 mil/ano), isento de IBS e CBS
- CBS substituirá PIS/Cofins/IPI; IBS substituirá ICMS/ISS

_Fonte: [Contabilidade.com — Afiliado pode ser MEI 2026](https://contabilidade.com/blog/afiliado-pode-ser-mei-em-2026-veja-como-abrir-seu-cnpj-corretamente-pagar-menos-impostos-e-emitir-nota-fiscal/), [Mizza Contabilidade](https://mizzacontabilidade.com.br/afiliado-pode-ser-mei/), [FENACON — Reforma Tributária MEIs 2026](https://fenacon.org.br/reforma-tributaria/reforma-tributaria-traz-mudancas-para-os-meis-a-partir-de-2026/)_

### Tendências de Adoção

- **Build vs Buy:** SaaS pequenos/médios (como Pocket DM) tendem a construir in-house quando o volume de afiliados é baixo e a stack já tem Stripe
- **Coupon-based attribution** está crescendo vs link-based tracking, especialmente para influenciadores de conteúdo (YouTube, podcasts, streams)
- **Server-side tracking** (via webhooks Stripe) é mais confiável que client-side (cookies/JS), dado aumento de ad blockers
- **Ledger-based commission tracking** (padrão Kinsta) é mais robusto que cálculo on-the-fly para auditoria e compliance
- **Plataformas open-source** como Refferq validam que Next.js + PostgreSQL é uma stack madura para affiliate systems

_Fonte: [Kinsta — Affiliate System](https://kinsta.com/blog/affiliate-system/), [Refferq](https://www.refferq.com/), [Rewardful — Influencer Coupon Codes](https://www.rewardful.com/articles/influencer-coupon-codes)_

---

## Análise de Padrões de Integração

### Fluxo de Checkout com Cupom — Integração Stripe

**Estado atual do checkout (`/api/checkout/route.ts`):**
- Cria `checkout.sessions.create()` com `mode: "subscription"`
- Passa `metadata: { user_id }` tanto no session quanto no `subscription_data`
- NÃO tem `allow_promotion_codes` nem `discounts` — é a mudança mínima necessária

**Integração proposta — 1 linha de mudança no checkout:**
```typescript
// Adicionar ao checkout.sessions.create():
allow_promotion_codes: true,
```
Isso habilita o campo de código promocional nativo do Stripe Checkout. O cliente digita o código do influenciador (ex: `JOAO_RPG`) e o desconto é aplicado automaticamente.

**Limitação importante:** `allow_promotion_codes` e `discounts` são mutuamente exclusivos. Não é possível pre-aplicar um cupom E permitir que o cliente digite outro. Para o caso de influenciadores, `allow_promotion_codes: true` é o correto.

**Fluxo completo proposto:**
1. Influenciador divulga código (ex: `JOAO_RPG`) em stream/YouTube/redes
2. Usuário acessa Pocket DM e decide assinar
3. POST `/api/checkout` cria session com `allow_promotion_codes: true`
4. No Stripe Checkout, usuário digita `JOAO_RPG`
5. Stripe valida o Promotion Code, aplica desconto (R$14,90 → R$12,90)
6. Usuário completa pagamento
7. Webhook `checkout.session.completed` dispara
8. Handler identifica o Promotion Code usado, busca influenciador vinculado
9. Sistema registra referral e calcula comissão

_Fonte: [Stripe Docs — Add Discounts](https://docs.stripe.com/payments/checkout/discounts), [Stripe API — Checkout Session](https://docs.stripe.com/api/checkout/sessions/object)_

### Webhook — Captura do Promotion Code Usado

**Estado atual do webhook (`/api/webhooks/stripe/route.ts`):**
- Trata `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Usa `session.metadata?.user_id` para vincular ao usuário
- NÃO captura informações de desconto/promotion code

**Integração proposta no webhook:**

No evento `checkout.session.completed`:
1. Recuperar o Checkout Session com `expand: ['total_details.breakdown']` ou buscar o subscription com `expand: ['discount']`
2. Extrair o `promotion_code` do discount aplicado
3. Lookup no Supabase: qual influenciador é dono desse promotion code?
4. Criar registro na tabela `referrals`
5. Calcular e registrar comissão na tabela `commission_ledger`

**Evento adicional a escutar — `invoice.payment_succeeded`:**
- Para comissões recorrentes (se o influenciador ganhar em cada renovação)
- O invoice tem o discount/promotion code vinculado à subscription
- Permite creditar comissão a cada pagamento, não só no primeiro

**Dados disponíveis no Discount Object (webhook response):**
- `id` — ID do desconto aplicado
- `source` — contém o coupon e promotion code
- `customer` — ID do cliente Stripe
- `checkout_session` — ID da session
- `subscription` — ID da subscription vinculada
- **ATENÇÃO:** Precisa usar `expand[]=discounts` ao recuperar o session, pois por padrão os discounts vêm apenas como IDs

_Fonte: [Stripe API — Discount Object](https://docs.stripe.com/api/discounts/object), [Stripe — Metadata Use Cases](https://docs.stripe.com/metadata/use-cases), [Stripe — Promotion Codes](https://support.stripe.com/questions/promotion-codes)_

### Estrutura de Cupom: Plano Mensal vs Anual

**Decisão de design para os dois planos:**

| | Mensal (R$14,90) | Anual (R$119,90) |
|---|---|---|
| **Desconto com cupom** | R$2,00 off → R$12,90/mês | ~13% off → ~R$104,90/ano |
| **Tipo de cupom Stripe** | `amount_off: 200` (centavos) | `percent_off: 13` |
| **Duration** | `repeating` (enquanto ativo) | `once` (só no 1º ano) |
| **Comissão influenciador** | ~R$1,50/mês (recorrente) | ~R$5,00 one-time |

**Recomendação:** Usar **valor fixo (amount_off)** para o mensal e **percentual (percent_off)** para o anual. Razão:
- Mensal: R$2,00 de desconto é fácil de comunicar ("de 14,90 por 12,90")
- Anual: percentual se adapta se o preço mudar e comunica melhor em marketing

**Alternativa simplificada:** Um único Coupon com `percent_off: 13` funciona para ambos:
- Mensal: 13% de R$14,90 = ~R$1,94 off → R$12,96/mês (arredonda pra R$12,97)
- Anual: 13% de R$119,90 = ~R$15,59 off → R$104,31/ano

**Problema:** O percentual não dá o valor exato de R$12,90 no mensal. Se a comunicação precisa ser "R$12,90/mês", valor fixo é mais preciso.

**Solução ideal — 2 Coupons, múltiplos Promotion Codes:**
1. Coupon "influencer-monthly": `amount_off: 200, currency: 'brl', duration: 'repeating'`
2. Coupon "influencer-yearly": `amount_off: 1500, currency: 'brl', duration: 'once'`
3. Promotion Codes: `JOAO_RPG` → coupon "influencer-monthly" para checkout mensal

**Limitação:** Um Promotion Code aponta para UM coupon. Se o mesmo influenciador divulga para mensal e anual, pode ter 2 códigos (`JOAO_MENSAL`, `JOAO_ANUAL`) ou 1 código com coupon percentual.

**Decisão pragmática recomendada:** Começar com **1 Coupon percentual (~13%)** e **1 Promotion Code por influenciador**. Funciona para ambos os planos sem complexidade extra. Ajustar depois se necessário.

_Fonte: [Stripe Docs — Coupons and Promotion Codes](https://docs.stripe.com/billing/subscriptions/coupons), [Stripe — Custom Coupons](https://docs.stripe.com/billing/subscriptions/script-coupons), [Stripe — Impact on MRR](https://support.stripe.com/questions/impact-of-discounts-and-coupons-on-monthly-recurring-revenue-(mrr)-in-billing)_

### Supabase RLS — Políticas de Segurança para Afiliados

**Modelo de acesso proposto:**

| Tabela | Influenciador (SELECT) | Influenciador (INSERT/UPDATE) | Admin | Service Role (webhooks) |
|---|---|---|---|---|
| `influencers` | Próprio perfil | Próprio perfil (campos limitados) | Tudo | Tudo |
| `coupons` | Próprios cupons | Não (admin cria) | Tudo | Tudo |
| `referrals` | Próprios referrals | Não (webhook cria) | Tudo | Tudo |
| `commission_ledger` | Próprias comissões | Não (sistema cria) | Tudo | Tudo |

**Políticas RLS chave:**
```sql
-- Influenciador vê apenas seus próprios dados
CREATE POLICY "influencers_own_data" ON influencers
  FOR SELECT USING (user_id = auth.uid());

-- Referrals: influenciador vê apenas os seus
CREATE POLICY "referrals_own_data" ON referrals
  FOR SELECT USING (influencer_id IN (
    SELECT id FROM influencers WHERE user_id = auth.uid()
  ));

-- Commission ledger: influenciador vê apenas suas comissões
CREATE POLICY "commissions_own_data" ON commission_ledger
  FOR SELECT USING (influencer_id IN (
    SELECT id FROM influencers WHERE user_id = auth.uid()
  ));
```

**Padrão de performance:** Indexar `user_id` em `influencers` e `influencer_id` em `referrals`/`commission_ledger` — colunas usadas em RLS policies devem sempre ter index.

**Escritas:** Apenas via service role (webhooks Stripe) ou admin. Influenciador nunca insere/atualiza dados de referral ou comissão diretamente.

_Fonte: [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase RLS Guide](https://designrevision.com/blog/supabase-row-level-security)_

### UX do Campo de Cupom no Checkout

**Contexto do Pocket DM:** O checkout é feito via Stripe Hosted Checkout (redirect), então o campo de cupom é nativo do Stripe quando `allow_promotion_codes: true`. Não precisamos construir UI customizada para o campo.

**Porém, a experiência PRÉ-checkout importa:**

**Padrão recomendado — Link de campanha (campaign URL):**
- Influenciador compartilha link: `pocketdm.com.br/pricing?ref=JOAO_RPG`
- Na página de pricing, exibir banner: "Cupom JOAO_RPG aplicado! Assine por R$12,90/mês"
- Salvar o código em cookie/sessionStorage
- No POST `/api/checkout`, passar o código como metadata ou pre-apply via `discounts`

**Alternativa — Apenas código no Stripe Checkout:**
- Mais simples de implementar (apenas `allow_promotion_codes: true`)
- Influenciador orienta: "na hora de pagar, digita JOAO_RPG"
- Desvantagem: conversão menor (cliente pode esquecer o código)

**Dados de mercado sobre UX de cupom:**
- 70% dos sites de e-commerce têm campo de promo code (Baymard)
- Campos de cupom visíveis podem causar "abandono de busca" — usuário sai pra procurar cupom
- Para Pocket DM, como os cupons são exclusivos de influenciadores (não públicos), usar link colapsável "Tem um cupom?" é seguro
- Taxa média de abandono de checkout: 70,22%. Simplificar o fluxo pode aumentar conversão em até 35% (Baymard)

**Recomendação para fase beta:**
1. **MVP:** Apenas `allow_promotion_codes: true` no Stripe Checkout (esforço zero de UI)
2. **V2:** Adicionar suporte a `?ref=CODE` na URL de pricing com banner visual e pre-apply

_Fonte: [Voucherify — Coupon UX Best Practices](https://www.voucherify.io/blog/coupon-promotions-ui-ux-best-practices-inspirations), [Baymard — Checkout Optimization](https://baymard.com/blog/checkout-flow-average-form-fields), [Kinde — SaaS Checkout Flow](https://www.kinde.com/learn/billing/conversions/the-anatomy-of-a-high-converting-saas-checkout-flow/)_

### Cálculo de Comissão do Influenciador

**Modelo de comissão proposto:**

Taxa Stripe por transação: ~3,67% + R$0,39 (Stripe Brasil para cartão doméstico)

| Plano | Preço com cupom | Taxa Stripe aprox. | Líquido Pocket DM | Comissão influenciador | Líquido PD final |
|---|---|---|---|---|---|
| Mensal | R$12,90 | ~R$0,86 | ~R$12,04 | R$1,50 | ~R$10,54 |
| Anual | ~R$104,90 | ~R$4,24 | ~R$100,66 | R$5,00 | ~R$95,66 |

**Modelo de comissão recomendado:**
- **Valor fixo** (não percentual): R$1,50/mês para mensal, R$5,00 one-time para anual
- **Recorrente para mensal:** Influenciador ganha R$1,50 a cada renovação enquanto o assinante mantiver o plano com o cupom ativo
- **One-time para anual:** R$5,00 no primeiro pagamento apenas
- **Window de elegibilidade:** Comissão só é creditada se o pagamento for confirmado (não em trial, não em chargeback)
- **Holdback period:** 30 dias antes de liberar pra saque (padrão do mercado, previne fraude/refund)

**Implementação via webhooks:**
- `invoice.payment_succeeded` → verificar se subscription tem discount de influenciador → calcular e registrar comissão
- `charge.refunded` → reverter comissão se dentro do holdback period
- `customer.subscription.deleted` → parar comissões recorrentes

_Fonte: [Fathom Analytics — Referral Program](https://usefathom.com/blog/how-we-built-our-referral-program), [Kinsta — Affiliate System](https://kinsta.com/blog/affiliate-system/)_

### Segurança e Anti-Fraude

**Vetores de risco identificados:**
1. **Self-referral:** Influenciador usa próprio cupom pra assinar com desconto
2. **Referral farming:** Criar contas fake pra gerar comissões
3. **Chargeback abuse:** Assinar, gerar comissão, pedir chargeback

**Mitigações:**
- **Self-referral:** Validar que `user_id` do assinante ≠ `user_id` do influenciador
- **Referral farming:** Holdback de 30 dias; comissão só credita após 1º pagamento confirmado; monitorar padrões suspeitos (múltiplas assinaturas do mesmo IP/email pattern)
- **Chargeback:** Webhook `charge.refunded` / `charge.dispute.created` reverte comissão pendente
- **Rate limiting:** Max de N referrals por influenciador por dia (configurável no admin)

_Fonte: [FirstPromoter](https://firstpromoter.com/), [Rewardful — Influencer Coupon Codes](https://www.rewardful.com/articles/influencer-coupon-codes)_
