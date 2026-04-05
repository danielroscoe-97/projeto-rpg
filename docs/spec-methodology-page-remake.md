# Spec: Remake da Página /methodology

**Status:** Pronto para implementação  
**Data:** 2026-04-05  
**Sessão:** party-mode com Sally (UX), John (PM), Mary (Analyst), Winston (Architect), Amelia (Dev)

---

## Objetivo

Transformar `/methodology` na vitrine do moat comunitário do Pocket DM:
- Converter visitantes deslogados em contribuidores (criar conta / testar combat tracker)
- Fortalecer identidade e pertencimento de DMs já contribuindo
- Posicionar o Pocket DM como a única plataforma de RPG **construída pela comunidade de mestres**

---

## Posicionamento Estratégico

> "Somos a primeira plataforma de RPG construída pela comunidade de mestres, não por designers de produto."

Isso é diferenciação de **categoria**, não de feature. Roll20 e D&D Beyond não conseguem replicar porque são produtos maduros. Pocket DM pode dizer isso agora, enquanto é early.

---

## Decisões Finais

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Arquitetura de rota | **Mesma `/methodology`**, condicional SSR | SEO, padrão já validado na LP |
| Auth detection | **`getClaims()`** + `LandingLoggedInNav` | Mesma pattern da LP |
| Framing da página | **"Metodologia"** mantido + linguagem de comunidade no copy | Credibilidade + pertencimento |
| Counter de progresso | **`1/500` raw** com "founder effect" framing | Transparência = privilégio de early adopter |
| Spell Tiers | **Seção proeminente no meio** — 2º eixo de contribuição | Prepara lançamento iminente |
| Identidade do contribuidor | **Sistema de 4 títulos progressivos** | Retenção via identidade |

---

## Fixes Obrigatórios (bloqueadores — implementar primeiro)

1. **Navbar auth:** Trocar `getUser()` por `getClaims()`, passar `displayName`, usar `LandingLoggedInNav` no `rightSlot` quando logado
2. **Seção condicional:** Hero e card de contribuição personalizados quando logado
3. **Fetch de dados pessoais:** Chamar `/api/methodology/contribution` server-side quando logado

---

## Arquitetura do Componente

```
app/methodology/page.tsx  (Server Component)
  └── getClaims() → isLoggedIn, user, displayName
  └── se logado: fetch /api/methodology/contribution
  └── Navbar com rightSlot condicional
  └── isLoggedIn
        ├── true  → <MethodologyHero variant="logado" user={...} contrib={...} />
        └── false → <MethodologyHero variant="publico" />
  └── <MethodologyProgressBar />  (existente, manter)
  └── se logado → <ContributorCard contrib={...} />
  └── <HowItWorksSection />
  └── <WhyDmgIsWrong />
  └── <ContributionAxes />         (novo)
  └── <TitleProgressionDisplay />  (novo)
  └── <SpellTierVoting />          (existente, manter)
  └── <SimilarEncounterPreview />  (existente, manter)
  └── <MethodologyCta isLoggedIn={...} />
```

---

## Versão Deslogada — Estrutura de Seções

### 1. Hero (NOVO)
- Background: foto hero-figurines-map.jpg com overlay (igual LP)
- HeroParticles (componente existente da LP)
- Logo Crown d20 + "Pocket DM"
- Headline: **"[X] DMs estão construindo o D&D mais justo"**
- Subheadline: "Baseado em dados reais de combates, não tabelas estáticas"
- Radial glow gold (igual LP)

### 2. Progress Bar (existente — reposicionar)
- Manter `<MethodologyProgressBar />` como está
- Adicionar texto abaixo: *"Você está aqui no começo. Isso é raro."*
- Framing de founder effect — transparência é o diferencial

### 3. Por que o DMG erra
- Cards DMG vs Pocket DM (seção existente, melhorar visual)

### 4. Como você contribui (3 passos)
- ⚔️ Rode um combate → ⭐ Vote na dificuldade → 🧠 Modelo aprende
- Seção existente, melhorar visual para o nível da LP

### 5. Laboratório — 2 Eixos de Contribuição (NOVO)
```
┌──────────────────────┐  ┌──────────────────────────────┐
│  Dificuldade de      │  │  Tier de Magias        🔜    │
│  Combate      ✅     │  │  "Fireball é tier 3?"        │
│  Ativo               │  │  Vote e descubra             │
└──────────────────────┘  └──────────────────────────────┘
```
- Card de combate: ativo, com stats da comunidade
- Card de magias: teaser com lock visual + "em breve"

### 6. Títulos Progressivos — Aspiração (NOVO)
Visualização dos 4 títulos com critérios, visível para deslogados como aspiração:

| Título | Critério | Badge |
|--------|---------|-------|
| 🥉 Explorador | 1 combate contribuído | Bronze, simples |
| 🥈 Caçador de Dados | 10 combates com rating do DM | Prata, brilho sutil |
| 🥇 Pesquisador Pocket DM | 50 combates com rating | Gold, glow animado |
| ⚗️ Arquiteto do Meta | 100+ combates + 20+ spell votes | Especial, cor única |

### 7. CTA Final
- Copy: *"Cada combate que você roda contribui para um cálculo mais preciso para toda a comunidade."*
- Primary: **[Criar conta gratuita]**
- Secondary: **[Testar Combat Tracker]**

---

## Versão Logada — Estrutura de Seções

### 1. Hero Personalizado (NOVO)
- "Bem-vindo de volta, [Nome]"
- Título atual do DM: ex. *🥈 Caçador de Dados*
- Badge animado com glow gold
- Frase motivacional baseada no título

### 2. Card de Contribuições Pessoais (NOVO — `<ContributorCard />`)
```
┌─────────────────────────────────────────────────────────┐
│  Suas Contribuições                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │  X combates  │  │  Y avaliados │  │  Z spell votes│  │
│  │  total       │  │  com rating  │  │               │  │
│  └──────────────┘  └──────────────┘  └───────────────┘  │
│                                                          │
│  Próximo título: 🥇 Pesquisador Pocket DM               │
│  ████████████░░░░  [X/50 combates com rating]           │
└─────────────────────────────────────────────────────────┘
```

### 3. Progress Bar Global
- Mesma barra da versão pública
- Texto: *"Seus [X] combates fazem parte disso"*

### 4-7. Demais seções
- Igual versão deslogada, mas com interatividade ativa no SpellTierVoting

---

## Componentes Novos Necessários

| Componente | Descrição | Prioridade |
|-----------|-----------|-----------|
| `<MethodologyHero />` | Hero condicional com partículas, logado/deslogado | 🔴 Alta |
| `<ContributorCard />` | Stats pessoais + barra de progresso pro próximo título | 🔴 Alta |
| `<ContributionAxes />` | Cards dos 2 eixos (combate ✅ + magias 🔜) | 🟡 Média |
| `<TitleProgressionDisplay />` | Visualização aspiracional dos 4 títulos | 🟡 Média |

---

## Componentes Existentes — Manter

- `<MethodologyProgressBar />` — manter como está, reposicionar no arco narrativo
- `<SpellTierVoting />` — manter, já tem guard de auth
- `<SimilarEncounterPreview />` — manter no final
- `<QualityTierBreakdown />` — manter dentro da MethodologyProgressBar

---

## Referências de Estilo

- Background + overlay: `app/page.tsx` → `HeroSection`
- Partículas: `<HeroParticles />` de `components/marketing/HeroParticles.tsx`
- Nav logada: `<LandingLoggedInNav />` de `components/marketing/LandingLoggedInNav.tsx`
- Auth pattern: `app/page.tsx` → `getClaims()` + `displayName`
- Paleta: gold `#D4A853`, bg `#13131E`, fonte display Cinzel
- Cards de feature: `FeaturesSection` em `app/page.tsx` para referência de hover/glow

---

## APIs Utilizadas

| API | Quando chamar | Retorno |
|-----|--------------|---------|
| `/api/methodology/stats` | Sempre (client-side, no MethodologyProgressBar) | `valid_combats`, `unique_dms`, `phase_target`, tiers |
| `/api/methodology/contribution` | Server-side, só quando logado | `total_combats`, `rated_combats`, `is_researcher` |

---

## Ordem de Implementação Sugerida

1. **Fix navbar auth** — `getClaims()` + `LandingLoggedInNav` (5 min, alto impacto)
2. **Hero section** — visual + partículas + condicional logado/deslogado
3. **ContributorCard** — stats pessoais + barra de progresso pro próximo título
4. **ContributionAxes** — 2 eixos com teaser de spell tiers
5. **TitleProgressionDisplay** — visualização dos 4 títulos
6. **Visual polish** — melhorar seções existentes (DMG vs PDM, 3 passos, CTA)

---

## Copy Chave (PT-BR)

- Hero headline: **"[X] DMs estão construindo o D&D mais justo"**
- Founder effect: **"Você está aqui no começo. Isso é raro."**
- Subheadline: **"Baseado em dados reais de combates, não tabelas estáticas"**
- CTA comunidade: **"Entra pra comunidade"**
- Logado personalizado: **"Seus [X] combates fazem parte disso"**
