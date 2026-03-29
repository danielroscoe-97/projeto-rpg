# Pesquisa: Freemium vs Trial por Tempo Limitado

**Data:** 2026-03-29
**Contexto:** Avaliar se o modelo freemium atual do Pocket DM e a melhor opcao ou se um trial por tempo limitado com acesso total seria superior.

---

## 1. Benchmarks de Conversao do Mercado

### Modelo Freemium (o que temos hoje)
| Metrica | Valor |
|---------|-------|
| Visitante -> Signup | ~13.3% (organico) |
| Signup -> Pago | **2-5%** (mediana) |
| Top performers | 6-8% (self-serve) |
| Outliers (Spotify, Slack) | 30%+ |

### Modelo Free Trial (acesso total por tempo limitado)
| Metrica | Valor |
|---------|-------|
| Visitante -> Signup | ~8.5% (organico) |
| Signup -> Pago (opt-in, sem cartao) | **18.2%** |
| Signup -> Pago (opt-out, com cartao) | **48.8%** |
| Mediana B2B SaaS | 18.5% |
| Top quartile | 35-45% |

### Modelo Hibrido: Reverse Trial (trial + fallback para free)
| Metrica | Valor |
|---------|-------|
| Conversao media | 7-21% |
| Melhoria vs freemium puro | +15% a +40% |
| Retencao total (pagos + free) | ~40% dos usuarios |

**Fonte:** First Page Sage 2026, OpenView Partners, ChartMogul, ProductLed, Lenny's Newsletter.

---

## 2. Analise dos 3 Modelos Para o Pocket DM

### Opcao A: Manter Freemium Puro (modelo atual)

**Pros:**
- Funil de entrada mais amplo (13.3% signup vs 8.5% no trial)
- Zero pressao temporal — o mestre experimenta no proprio ritmo
- Alinhado com o principio "valor antes do paywall"
- Mestres de RPG jogam quinzenalmente/mensalmente — trial de 14 dias pode expirar entre sessoes
- O mestre nunca perde nada — so ganha se pagar
- Comunidade free gera word-of-mouth e efeito de rede (Player View)

**Contras:**
- Conversao de apenas 2-5% (precisamos de volume MUITO alto)
- Com target de 5% free->pro, precisamos de ~20.000 usuarios free para 1.000 pagantes
- Muitos usuarios ficam "felizes o suficiente" no free para sempre
- O upsell contextual depende do mestre sentir a dor da falta de persistencia — mas alguns mestres simplesmente aceitam refazer

**Projecao para Pocket DM:**
- Com R$14.90/mes e 5% de conversao: precisa de 6.700+ usuarios free ativos para atingir R$5.000/mes
- Churn de 8%: LTV = R$186 (12.5 meses), acima do target de R$120

---

### Opcao B: Trial Puro (14 dias com tudo, depois paywall total)

**Pros:**
- Conversao dramaticamente maior: 18-25% (opt-in sem cartao)
- Usuario experimenta TUDO — sente o valor total do produto
- Urgencia temporal motiva acao
- Menos usuarios free "parasitas" (custo de infra menor)

**Contras:**
- **CRITICO para RPG:** O mestre joga 1x por semana ou a cada 2 semanas. Um trial de 14 dias = 1-2 sessoes de jogo real. Insuficiente para criar habito.
- Quem nao paga, PERDE TUDO. Nao existe "soft landing" — o usuario simplesmente sai
- Sem tier gratuito, perde-se o efeito de rede (Player View precisa que mestres usem o app)
- Menor volume de entrada (8.5% signup vs 13.3%)
- No mercado brasileiro, paywall duro afasta — renda disponivel para ferramentas de RPG e baixa
- Roll20, Owlbear Rodeo, Foundry VTT tem tiers gratuitos robustos — sem free, perdemos para eles

**Projecao para Pocket DM:**
- Com 18% de conversao e mesmo trafego: mais pagantes no curto prazo
- Mas base total de usuarios cai drasticamente
- Player View perde valor sem mestres free gerando sessoes

**Veredito: NAO RECOMENDADO para Pocket DM.** O ciclo de jogo de RPG (semanal/quinzenal) e incompativel com trial temporal curto.

---

### Opcao C: Reverse Trial (RECOMENDACAO)

**Como funciona:**
1. Novo usuario cria conta -> recebe **14 dias de Pro completo** automaticamente
2. Apos 14 dias -> **cai para Free** (nao para paywall total)
3. O mestre continua usando o combat tracker normalmente
4. Perde campanhas persistentes, export, homebrew, analytics
5. Upsell contextual: "Voce tinha X, quer de volta?"

**Pros:**
- Combina o melhor dos dois mundos: alcance do freemium + conversao do trial
- **Efeito de perda (loss aversion):** Perder algo que voce ja usou doi 2x mais do que nunca ter tido
- Dados mostram +15-40% de conversao vs freemium puro
- Slack viu **+20% de times pagos** ao adotar reverse trial
- Dropbox reportou +10-40% de melhoria na conversao
- Toggl migrou para reverse trial apos usuarios burlarem o freemium com multiplos emails
- Canva usa 30 dias de reverse trial com sucesso (6%+ conversao)
- O mestre nao perde tudo — continua no free, preservando o efeito de rede
- Retencao total ~40% (15% pagos + 25% free) vs perda quase total no trial puro

**Contras:**
- Mais complexo de implementar (transicao automatica trial -> free)
- Risco de frustrar usuarios que se acostumaram com features Pro
- Comunicacao precisa ser cristalina ("Seus 14 dias de Pro gratis acabaram, mas voce ainda pode usar o combat tracker!")
- Requer onboarding que destaque features Pro para o usuario perceber o valor

**Projecao para Pocket DM:**
- Conversao estimada: 7-10% (vs 5% target atual) — quase dobra
- Mesma base free de longo prazo (quem nao paga vira free, nao sai)
- Player View continua funcionando para todos
- LTV potencialmente maior pois usuarios que convertem ja experimentaram e valorizam o Pro

---

## 3. Dados do Mercado de RPG/VTT

| Plataforma | Modelo | Free Tier |
|------------|--------|-----------|
| Roll20 | Freemium + Marketplace | Sim, robusto |
| D&D Beyond | Freemium + Content Store | Sim, com trial de 1 mes |
| Owlbear Rodeo | Freemium | Sim, generoso |
| Foundry VTT | Compra unica ($50) | Nao |
| Alchemy RPG | Freemium | Sim |

**Insight:** A maioria dos concorrentes usa freemium. D&D Beyond oferece 1 mes gratis no tier Hero/Master — efetivamente um reverse trial. Nenhum dos grandes VTTs usa trial puro sem fallback gratuito.

---

## 4. Fator Brasil

- Renda disponivel para hobbies e menor — paywall duro elimina usuarios
- Cultura de "testar antes de pagar" e muito forte
- PIX facilita micropagamentos, mas a decisao de assinar precisa ser convincente
- O modelo freemium com upgrade contextual respeita o ritmo economico brasileiro
- Reverse trial funciona bem aqui: da o gostinho do premium sem barreira de entrada

---

## 5. Recomendacao Final

### Reverse Trial de 14 dias + Freemium (modelo hibrido)

```
Novo usuario -> Cria conta -> 14 dias Pro automatico
  -> Onboarding destaca: "Voce tem Pro por 14 dias!"
    -> Durante o trial: badges "Pro" nas features premium
      -> Dia 12: "Seu Pro acaba em 2 dias. Assine para continuar."
        -> Dia 14 (nao assinou): Downgrade para Free
          -> Upsell contextual: "Voce usou Campanha Persistente 8 vezes. Quer de volta?"
```

### Por que 14 dias e nao 30?

- O mestre tipico joga 1-2x por semana = 2-4 sessoes no trial
- 14 dias cria urgencia sem ser agressivo
- 30 dias e muito — o usuario esquece que esta em trial
- **Alternativa:** Considerar 21 dias (3 semanas = 3 sessoes garantidas)

### O que JA temos pronto na infra

A boa noticia: **a infraestrutura do reverse trial ja esta construida!**

- `subscriptions.trial_ends_at` ja existe no schema
- `activate_trial()` RPC ja existe
- `status = 'trialing'` ja e suportado
- `SubscriptionPanel` ja mostra badge de dias restantes + progress bar
- `UpsellCard` ja diferencia "trial usado" vs "trial disponivel"
- Feature flags permitem toggle granular

### O que falta para ativar o Reverse Trial

1. **Ativar trial automaticamente no signup** (hoje e manual via settings)
2. **Cron/webhook para downgrade automatico** quando `trial_ends_at` expira
3. **Sequencia de emails** (dia 1, dia 10, dia 13, dia 14, dia 21 pos-trial)
4. **Atualizar feature flags** de `plan_required = 'free'` para `plan_required = 'pro'`
5. **Onboarding tour** destacando features Pro durante o trial
6. **Metricas especificas:** trial_started, trial_expired, trial_converted, trial_to_free

---

## 6. Metricas de Sucesso Revisadas (com Reverse Trial)

| Metrica | Target Freemium Puro | Target Reverse Trial |
|---------|---------------------|---------------------|
| Free -> Conta criada | > 30% | > 30% |
| Trial -> Pro (14 dias) | n/a | > 10% |
| Free (pos-trial) -> Pro (90 dias) | > 5% | > 7% |
| Conversao total (30 dias) | > 5% | > 12% |
| Churn mensal Pro | < 8% | < 6% (usuarios ja testaram) |
| LTV por assinante | > R$ 120 | > R$ 150 |
| NPS assinantes | > 50 | > 55 |

---

## 7. Psicologia e Ativacao

### Loss Aversion (Aversao a Perda)
- Pessoas sentem perdas **2x mais forte** do que ganhos (Kahneman & Tversky)
- Mensagens com framing de perda aumentam conversao em **21%** vs abordagem de ganho (McKinsey)
- Enquadrar preco como "o que voce perde sem isso" pode aumentar conversao em ate **32%**
- **Reverse trial maximiza isso:** o mestre ja usou campanha persistente, ja exportou PDF — perder doi

### Ativacao
- Freemium: taxa de ativacao mediana **20%**
- Free trial: taxa de ativacao mediana **40%** (OpenView, 150+ empresas)
- Usuarios que engajam com features core na primeira semana sao **5x mais provaveis de converter** (Mixpanel)
- Usuarios ativos por 3+ dias sao **4x mais provaveis de converter**
- Onboarding completo: **67% conversao** vs 18% para onboarding incompleto

### Efeito Ancora
- Freemium cria ancora perigosa de **R$0** — pular de gratis para qualquer preco gera friccao
- Reverse trial ancora o usuario na experiencia COMPLETA — o "normal" e o Pro, nao o Free

### Churn Pos-Conversao
- Clientes que convertem do free tem **~30% menor CAC** que clientes cold-start (ProfitWell)
- Retencao e **~15% maior** para quem converte do free vs cold start
- Produtos com >25% conversao de trial tem **38% menos churn** no primeiro ano

---

## 8. Mercado Brasileiro — Dados Especificos

### Conversao no Brasil
- Conversao de trial no Brasil e ~**2x maior** que freemium (alinhado com dados globais)
- **Maioria dos micro-SaaS brasileiros usam free trial, NAO freemium** (Bruno Okamoto, Comunidade Micro-SaaS)
- Tintim (tracking tool) foi de 0 a quase **R$1 milhao/mes** em ~2 anos com modelo de trial

### Exemplos Brasileiros
| Produto | Modelo | Trial |
|---------|--------|-------|
| RD Station | Free trial | 10 dias |
| Agendor | Free trial | 7 dias Pro |
| Pipedrive (BR) | Free trial | 14 dias |

### Alertas do Bruno Okamoto (Micro-SaaS BR)
- Plano free gera demanda de suporte, trabalho pos-venda e volume de feedback que cria **ilusao de crescimento** — perigoso para solodevs
- Founders investem demais no tier free, entregando tanto valor que usuarios nunca fazem upgrade
- **Pergunta-chave:** "Seus usuarios free criam loop viral? Se a resposta e incerta, freemium nao e para voce."
- **No caso do Pocket DM:** SIM, Player View cria loop viral (mestre free convida jogadores) — freemium faz sentido como base

### Caracteristicas do Mercado BR
- Modelo de assinatura ainda funciona bem no Brasil (EUA ja esta saturando)
- Modelos emergentes: pay-per-task, pacotes por uso, sistema de creditos
- Ferramentas verticalizadas vencem no BR — Pocket DM e nicho (RPG/D&D) e isso e bom
- PIX facilita micropagamentos, mas a decisao de assinar precisa ser convincente

---

## 9. Riscos e Mitigacoes

| Risco | Mitigacao |
|-------|----------|
| Usuario frustra com downgrade | Comunicacao clara desde o dia 1; nunca esconder que e trial |
| Trial de 14 dias curto para RPG | Considerar 21 dias; ou trial baseado em sessoes (3 sessoes) |
| Complexidade tecnica | Infra ja existe — e ativacao, nao construcao |
| Abuso (criar contas multiplas) | Rate limiting por IP + verificacao de email |
| Mestre para de usar apos downgrade | Email de reengajamento dia 7 e 30 pos-trial; upsell contextual no app |

---

## 10. Experimento Academico (680K usuarios)

Um **experimento randomizado de 2 anos com 680.588 usuarios em 190 paises** (Frontiers in Psychology, 2025) descobriu:
- Em modelos freemium, trials mais curtos aumentam conversao imediata
- O tier free retido cria uma populacao grande de usuarios ativos de longo prazo
- O modelo freemium requer avaliar conversao **imediata E tardia** (usuarios que convertem meses depois)
- Duracao do trial e uma "alavanca estrategica critica" — duracoes diferentes afetam estagios diferentes do funil

**Implicacao para Pocket DM:** Um reverse trial de 14 dias com fallback para free captura AMBOS os efeitos — conversao imediata pela urgencia do trial E conversao tardia pelo tier free que mantem o usuario no ecossistema.

---

## Fontes

- [First Page Sage - SaaS Freemium Conversion Rates 2026](https://firstpagesage.com/seo-blog/saas-freemium-conversion-rates/)
- [First Page Sage - Free Trial Conversion Benchmarks](https://firstpagesage.com/seo-blog/saas-free-trial-conversion-rate-benchmarks/)
- [Userpilot - Reverse Trial Method](https://userpilot.com/blog/saas-reverse-trial/)
- [ProductLed - 6 Free Models in SaaS](https://productled.com/blog/6-free-models-in-saas)
- [Orb - Reverse Trial for SaaS](https://www.withorb.com/blog/reverse-trial-saas)
- [Thoughtlytics - Reverse Trial Model Guide](https://www.thoughtlytics.com/blog/reverse-trial-model-saas)
- [ChartMogul - SaaS Conversion Report](https://chartmogul.com/reports/saas-conversion-report/)
- [Lenny's Newsletter - Free-to-Paid Conversion](https://www.lennysnewsletter.com/p/what-is-a-good-free-to-paid-conversion)
- [The Growth Mind - Freemium vs Trial vs Reverse Trial](https://thegrowthmind.substack.com/p/freemium-free-trial-reverse-trial)
- [Medium - Monetization Strategies Spotify Slack Tinder](https://medium.com/@nicobottaro/monetization-strategies-how-spotify-slack-and-tinder-achieve-5x-premium-users-20-free-paid-801448e86576)
- [Frontiers in Psychology - Large-Scale Randomized Field Experiment](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2025.1568868/full)
- [MicroSaaS BR - Seu SaaS deve ter plano gratis?](https://microsaas.substack.com/p/seu-saas-deve-ter-plano-gratis-ou)
- [OpenView Partners - Freemium vs Free Trial](https://openviewpartners.com/blog/freemium-vs-free-trial/)
- [ProfitWell/Paddle - Churn & Retention Data](https://www.paddle.com/resources/churn-rate)
- [Elena Verna - Reverse Trial Examples](https://www.elenaverna.com/p/reverse-trials-examples)
- [CXL - Reverse Trial Strategy](https://cxl.com/blog/reverse-trial-strategy/)
- [Konvoy VC - Freemium Conversion in Gaming](https://www.konvoy.vc/newsletters/freemium-conversion-2-4-in-gaming)
