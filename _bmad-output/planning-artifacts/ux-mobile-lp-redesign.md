---
status: approved
createdDate: 2026-03-29
author: Sally (UX Designer)
requestedBy: Dani_
scope: Landing Page — Mobile-only redesign
impactOnDesktop: Nenhum. Todas as mudanças usam breakpoints Tailwind (md:/lg:). Desktop permanece inalterado.
targetFile: app/page.tsx, components/marketing/LpPricingSection.tsx
---

# UX Spec: Redesign Mobile da Landing Page

## 1. Contexto e Problema

A landing page do Pocket DM foi desenhada com visual e ritmo excelentes para desktop, onde o usuário tem espaço horizontal, atenção relaxada e mouse para interações hover. No mobile, a mesma estrutura é empilhada verticalmente, resultando em **~12-15 telas de scroll** — excessivo para o contexto de uso mobile (atenção curta, polegar impaciente, geralmente chegando via link compartilhado em grupo de Discord/WhatsApp).

**Perfil do visitante mobile:** Mestre de RPG que viu o link num grupo, abriu no celular entre uma atividade e outra. Tem 30-60 segundos de atenção antes de decidir se volta depois no desktop ou abandona.

**Meta:** Reduzir para **~5-6 telas de scroll** no mobile mantendo os mesmos pontos de conversão e a mesma identidade visual RPG.

---

## 2. Inventário Atual — O que existe hoje

| # | Seção | Componente | Telas mobile (~) | Problema |
|---|-------|-----------|:-:|----------|
| 1 | Navbar | `<Navbar>` | 0.1 | OK — hamburger menu funciona |
| 2 | Hero | `<HeroSection>` | 1.0 | `min-h-dvh` ocupa tela inteira. OK mas define o ritmo. |
| 3 | Divider | `<SectionDivider>` | 0.2 | Espaço morto decorativo, sem valor informacional |
| 4 | Features | `<FeaturesSection>` — 6 cards | 3.0 | **Pior ofensor.** 6 cards empilhados com ícone 56px + título + parágrafo + padding cada |
| 5 | Divider | `<SectionDivider>` | 0.2 | Espaço morto |
| 6 | How It Works | `<HowItWorksSection>` — 4 steps | 2.0 | 4 cards com ícone RuneCircle + título + descrição. Redundante com Features |
| 7 | Divider | `<SectionDivider>` | 0.2 | Espaço morto |
| 8 | Comparison | `<ComparisonSection>` — 5 cards | 3.5 | **Segundo pior.** 5 cards expandidos × 3 sub-rows (Roll20/Beyond/PDM) cada |
| 9 | Social Proof | `<SocialProofSection>` — 3 cards | 1.5 | 3 testimonials empilhados |
| 10 | Pricing | `<LpPricingSection>` — 2 cards | 2.5 | Free + Pro (dimmed) + beta banner |
| 11 | Final CTA | `<FinalCtaSection>` | 1.0 | Redundante — pricing já tem CTA |
| 12 | Footer | `<Footer>` | 0.5 | OK |
| | **TOTAL** | | **~15.7** | |

---

## 3. Decisões de Design — Mobile vs Desktop

### Princípio geral

> **Desktop:** experiência imersiva e exploratória — o usuário navega com calma, hovers revelam detalhes, animações criam atmosfera.
> **Mobile:** experiência de convencimento rápido — hero → valor → prova social → ação. Cada pixel deve justificar o scroll.

Todas as mudanças usam classes condicionais Tailwind (`hidden md:block` / `md:hidden`). **Zero impacto no desktop.**

---

### 3.1 Section Dividers — Ocultar no mobile

| | Desktop | Mobile |
|---|---------|--------|
| **Visibilidade** | Visível — ornamento SVG com gradientes gold | **Oculto** (`hidden md:flex`) |
| **Justificativa** | No desktop criam ritmo visual entre seções widescreen | No mobile adicionam ~60px de espaço morto × 3 = 180px sem valor |

**Economia:** ~0.6 telas

---

### 3.2 Features Section — Grid compacto 2×3

| | Desktop | Mobile (atual) | Mobile (novo) |
|---|---------|----------------|---------------|
| **Layout** | Grid 3 colunas, cards com ícone 56px + título + parágrafo | Grid 1 coluna, 6 cards full-width empilhados | **Grid 2 colunas, cards compactos** |
| **Conteúdo do card** | Emoji box 56px + tag badge + título + descrição | Mesmo que desktop | **Emoji 32px + título apenas.** Sem descrição, sem tag badge |
| **Ícone decorativo (dados flutuantes)** | Visíveis — d20, d4, d6, d8, d10, sparkles | Visíveis (mesmos) | **Ocultos** (`hidden md:block`) |
| **Heading da seção** | h2 + subtítulo | h2 + subtítulo | **h2 apenas**, sem subtítulo |
| **Padding da seção** | `py-24 px-6` | `py-24 px-6` | **`py-12 px-4`** (mobile only) |

**Lógica:** No mobile, os títulos das features são auto-explicativos ("Combat Tracker Completo", "Player View em Tempo Real"). A descrição detalhada é luxo de desktop. O grid 2×3 mostra tudo em ~1 tela vs 3 telas atuais.

**Economia:** ~2.0 telas

---

### 3.3 How It Works — Timeline inline compacta

| | Desktop | Mobile (atual) | Mobile (novo) |
|---|---------|----------------|---------------|
| **Layout** | Horizontal flow com FireTrail + QuestPath + RuneCircle por step | Vertical, 4 cards com RuneCircle + título + descrição | **Timeline vertical compacta:** ícone/número inline + título + tempo. Sem descrição. |
| **Descrição dos passos** | Visível sob cada step | Visível | **Oculta** |
| **RuneCircle / TorchGlow** | Visível | Visível | **Substituído por número simples com borda gold** |
| **CTA "Testar Combat Tracker"** | Visível após steps | Visível | **Mantido** |
| **Padding da seção** | `py-24` | `py-24` | **`py-12`** |

**Formato mobile novo — cada step em 1 linha:**
```
① Crie o Encontro .............. ~1 min
② Role Iniciativa .............. ~30 seg
③ Compartilhe o Link ........... ~10 seg
④ Mestre o Combate ............. ao vivo
```

**Economia:** ~1.5 telas

---

### 3.4 Comparison Section — Resumo de diferenciais

| | Desktop | Mobile (atual) | Mobile (novo) |
|---|---------|----------------|---------------|
| **Layout** | Tabela 4 colunas com header, 5 rows, hover effects | 5 cards expandidos, cada um com 3 sub-rows (Roll20/Beyond/PDM) | **3 "killer bullets"** — os 3 diferenciais mais impactantes em formato badge/pill |
| **Heading** | h2 + subtítulo | h2 + subtítulo | **h2 compacto** |
| **Conteúdo** | 5 features × 3 competidores | Mesmo (expandido em cards) | **3 bullets de impacto direto** |
| **Padding** | `py-24` | `py-24` | **`py-12`** |

**Os 3 killer bullets selecionados** (dos 5 rows atuais, priorizados por impacto de conversão):

1. **💰 "Comece grátis"** — vs Roll20 $5-50/mês, D&D Beyond $6/mês ← elimina objeção de preço
2. **📱 "Player view sem conta"** — link direto, zero fricção ← diferencial único
3. **📚 "Regras 2014 + 2024 grátis"** — vs módulos pagos dos concorrentes ← valor percebido

Formato visual: cada bullet é um mini-card horizontal com ícone + frase de impacto + badge "vs concorrência" sutil.

**Economia:** ~2.5 telas

---

### 3.5 Social Proof — Testimonial único com indicadores

| | Desktop | Mobile (atual) | Mobile (novo) |
|---|---------|----------------|---------------|
| **Layout** | Grid 3 colunas, 3 cards lado a lado | 3 cards empilhados full-width | **1 testimonial visível** + 2 dots indicadores (swipe ou auto-rotate) |
| **Quote mark SVG** | Visível | Visível | **Mantido** mas menor |
| **Heading da seção** | h2 + subtítulo | h2 + subtítulo | **Sem heading** — a quote fala por si |
| **Implementação** | Estático | Estático | **CSS scroll-snap horizontal** (nativo, sem JS library) |

**Nota técnica:** Usar `overflow-x: auto` + `scroll-snap-type: x mandatory` + `scroll-snap-align: center`. Leve, acessível, sem dependência de biblioteca de carrossel.

**Economia:** ~1.0 tela

---

### 3.6 Pricing — Manter, ajustar padding

| | Desktop | Mobile (atual) | Mobile (novo) |
|---|---------|----------------|---------------|
| **Layout** | Grid 2 colunas | 2 cards empilhados | **Igual**, mas com padding reduzido |
| **Beta banner** | Flex row | Flex column | **Igual** |
| **Card Pro (dimmed)** | Visível | Visível | **Colapsado** — mostrar apenas título + "Em breve" + 1 linha resumo. Sem lista de features. |
| **Padding** | `py-24 p-8` (cards) | Mesmo | **`py-14 p-5`** (cards mobile) |

**Lógica:** O card Pro está `opacity-60` e sem CTA. No mobile, listar 10 features de algo que não pode ser comprado ainda é desperdício de scroll.

**Economia:** ~0.8 tela

---

### 3.7 Final CTA — Ocultar no mobile

| | Desktop | Mobile (atual) | Mobile (novo) |
|---|---------|----------------|---------------|
| **Visibilidade** | Visível — CTA emocional de fechamento | Visível | **Oculto** (`hidden md:block`) |
| **Justificativa** | No desktop, cria closure emocional após longa jornada | No mobile, o CTA do Pricing já faz esse papel. Seção redundante. |

**Economia:** ~1.0 tela

---

## 4. Resumo Comparativo do Fluxo

### Desktop (inalterado)
```
Hero → Divider → Features (6 cards) → Divider → How It Works (4 steps + fire trail)
→ Divider → Comparison (tabela 4 colunas) → Social Proof (3 cards) → Divider
→ Pricing (2 cards) → Final CTA → Footer
```

### Mobile (redesign)
```
Hero (1 tela)
  ↓
Features — grid 2×3 compacto, só emoji+título (1 tela)
  ↓
How It Works — timeline inline, sem descrição (0.7 tela)
  ↓
Diferenciais — 3 killer bullets (0.5 tela)
  ↓
Social Proof — 1 testimonial com scroll-snap (0.5 tela)
  ↓
Pricing — Free card + Pro colapsado (1.5 tela)
  ↓
Footer (0.5 tela)
```

**Total mobile: ~5.7 telas** (vs ~15.7 atuais = **redução de ~64%**)

---

## 5. Regras de Implementação

1. **Breakpoint:** Todas as mudanças se aplicam abaixo de `md:` (< 768px). Acima disso, zero alteração.
2. **Approach:** Classes condicionais Tailwind — `hidden md:block`, `md:hidden`, padding responsivo (`py-12 md:py-24`).
3. **Sem novas dependências:** Scroll-snap do Social Proof usa CSS nativo. Nenhuma lib de carrossel.
4. **Sem novo componente:** Tudo é variação condicional dentro dos componentes existentes.
5. **Animações mobile:** Manter `animate-fade-in-up` mas remover delays longos (> 0.2s) para sensação de carregamento rápido.
6. **Touch targets:** Manter `min-h-[44px]` em todos os elementos interativos (WCAG compliance já existente).

---

## 6. Checklist de Implementação

- [ ] `SectionDivider`: adicionar `hidden md:flex` no wrapper
- [ ] `FeaturesSection`: criar variante mobile grid 2×3 com cards compactos (emoji 32px + título)
- [ ] `FeaturesSection`: ocultar dados decorativos flutuantes no mobile
- [ ] `FeaturesSection`: reduzir padding mobile para `py-12 px-4`
- [ ] `HowItWorksSection`: criar variante mobile timeline compacta (número + título + tempo, sem descrição)
- [ ] `HowItWorksSection`: reduzir padding mobile
- [ ] `ComparisonSection`: criar variante mobile "3 killer bullets" substituindo os 5 cards
- [ ] `ComparisonSection`: reduzir padding mobile
- [ ] `SocialProofSection`: criar variante mobile scroll-snap horizontal com 1 testimonial visível
- [ ] `SocialProofSection`: remover heading da seção no mobile
- [ ] `LpPricingSection`: colapsar card Pro no mobile (título + "Em breve" + resumo)
- [ ] `LpPricingSection`: reduzir padding mobile
- [ ] `FinalCtaSection`: ocultar no mobile (`hidden md:block`)
- [ ] Teste visual em viewports 375px (iPhone SE), 390px (iPhone 14), 412px (Pixel 7)
