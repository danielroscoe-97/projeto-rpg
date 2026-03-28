---
stepsCompleted: [1]
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
