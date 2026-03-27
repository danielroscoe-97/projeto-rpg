---
classification:
  domain: consumer_app
  projectType: web_app
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/product-brief-projeto-rpg-2026-03-23.md
  - docs/monetization-strategy.md
  - docs/analytics-technical-spec.md
date: 2026-03-27
author: Dani_
version: '2.0'
status: Draft
---

# Product Requirements Document V2 — Pocket DM

**Autor:** Dani_
**Data:** 2026-03-27
**Versão:** 2.0
**Status:** Draft — Aguardando Revisão
**Baseado em:** PRD V1 (2026-03-24), Transcrições de Áudio (2026-03-26/27), Análise Técnica Completa

---

## Changelog V1 → V2

| Seção | Mudança |
|-------|---------|
| Executive Summary | Expandido com modelo freemium, 3 modos de uso, e visão de plataforma |
| Product Scope | Reescrito — MVP já entregue, foco agora em Phase 2 completa |
| User Journeys | +3 novos journeys (Guest, Late-Join Player, Paid DM with QR) |
| Functional Requirements | +22 novos FRs (FR42–FR63) cobrindo todas as novas features |
| Non-Functional Requirements | +6 novos NFRs (NFR29–NFR34) |
| Monetização | Seção nova — modelo freemium completo integrado ao PRD |
| Débitos Técnicos | Seção nova — 60+ issues mapeadas com prioridade |
| Epics & Roadmap | Seção nova — 8 Epics priorizados por esforço × impacto |
| Ideias Futuras (V3+) | Seção nova — cenários, áudio, kit físico |
| Fluxos de Usuário | Seção nova — 5 fluxos detalhados (Onboarding, Free, Paid, Logged, Ideias) |

---

## 1. Executive Summary

### O Problema

DMs e jogadores em mesas presenciais não têm uma ferramenta unificada para gerenciar combate. Rodar uma sessão exige alternar entre combat tracker, referências de monstros, fichas de personagens e lookup de regras — nenhum deles se comunica. A carga cognitiva recai sobre o DM, quebra a imersão, e é o principal ponto de fricção no jogo presencial.

### O Que É

Pocket DM é um **combat tracker gratuito para D&D 5e**, focado em jogo presencial. O DM gerencia combate no laptop; jogadores acompanham pelo celular em tempo real. Não é um VTT — é o cérebro do mestre: estado de combate + referência de regras + dados dos jogadores, tudo numa tela.

### Diferenciadores

1. **Visão unificada de combate** — monstros e jogadores na mesma tela, sem trocar de aba
2. **Oracle in-session** — referência de regras dentro da experiência de combate
3. **Presencial-first** — UX otimizada para tablet/laptop na mesa física
4. **Anti-metagaming** — jogadores NUNCA veem dados numéricos exatos de monstros (HP, AC, DC). Veem apenas labels de status (LIGHT/MODERATE/HEAVY/CRITICAL)
5. **Speed-to-play** — abrir app, iniciar sessão, zero fricção

### O Que Mudou Desde V1

O MVP foi **entregue e está em produção**. O app já tem:
- Combat tracker completo (initiative, HP, conditions, undo)
- Monster stat blocks + Spell Oracle + Conditions + Items (SRD 2014 + 2024)
- Player view via QR code/link (sem login)
- Guest mode (/try) com timer de 60 minutos
- Auth completa (email + PKCE), campanhas, presets
- i18n (pt-BR + en), dark mode, keyboard nav
- Admin panel (métricas, users, content editor)
- Analytics tracking

**O PRD V2 foca em:**
1. Resolver bugs e débitos técnicos críticos do MVP
2. Completar features de combate que faltam (mid-combat add, monster grouping, display names)
3. Melhorar a experiência do jogador (notificações, auto-join, late-join)
4. Implementar o modelo freemium (feature gating, trial, diferenciação free/paid)
5. Preparar a plataforma para crescimento (campanhas ricas, convites, notas do GM)
6. Catalogar ideias futuras (áudio, cenários, kit físico)

### Modelo de Negócio

**Freemium + Módulos Pro.** O combat tracker é o gancho gratuito. Módulos avançados são a receita. Zero anúncios. Nunca degradar a experiência gratuita.

- **Free:** Combat tracker completo, player view, compendium SRD, spell oracle, guest mode
- **Pro (R$ 14,90/mês):** Campanhas persistentes, encounter builder avançado, player view premium, export, homebrew, analytics de sessão
- **Modelo "Mesa":** Uma assinatura do mestre → features Pro para toda a mesa conectada

---

## 2. Três Modos de Uso

### 2.1. Guest Mode (Visitante — /try)

**Público:** Qualquer pessoa que quer testar sem compromisso.

| Aspecto | Detalhe |
|---------|---------|
| Auth | Nenhuma — dados em localStorage |
| Duração | 60 minutos (timer visível) |
| Persistência | Zero — dados perdidos ao fechar |
| Features | Combat tracker completo, compendium, spell oracle |
| Player view | Não disponível (solo only) |
| Upsell | GuestUpsellModal no fim do timer → criar conta |
| Import | GuestDataImportModal — importar dados do guest para conta |

**Regra de paridade:** Toda feature que funciona no Guest Mode DEVE funcionar de maneira idêntica na área logada. O comportamento não pode ter surpresas ao migrar.

### 2.2. Free Combat (Logado, Tier Gratuito)

**Público:** DM que criou conta mas não assina.

| Aspecto | Detalhe |
|---------|---------|
| Auth | Email + senha (PKCE) |
| Campanhas | Efêmeras — não persiste entre sessões |
| Encounter presets | Pode criar, não persiste entre sessões |
| Player view | Disponível via QR/link (jogadores sem login) |
| Compendium | Completo (SRD 2014 + 2024) |
| Realtime | Sim — broadcast para jogadores |
| Export | Não disponível |
| Limite de sessões | Ilimitado |

**Sinalização Pro:** Features pagas são visíveis mas bloqueadas, com indicador visual discreto (ícone de cadeado + tooltip "Pro"). Nunca pop-up intrusivo.

### 2.3. Paid Combat (Logado, Tier Pro)

**Público:** DM que assina o plano Pro.

| Aspecto | Detalhe |
|---------|---------|
| Auth | Email + senha (PKCE) |
| Campanhas | Persistentes — jogadores pré-salvos, histórico de sessões |
| Player join | QR code → jogador entra sem cadastro |
| Player linking | Mestre pode atribuir um player da campanha ao jogador temporário |
| Convite | Solicita que jogador se cadastre + se diferencie (jogador vs mestre) |
| Dual role | Usuário pode ser jogador E mestre ao mesmo tempo |
| Encounter presets | Salvos e reutilizáveis |
| Export | PDF + JSON |
| Homebrew | Criar monstros, magias, itens customizados |
| Analytics | Duração de combates, frequência de jogadores, magias mais usadas |

**Modelo "Mesa":** Uma assinatura do mestre = features Pro para toda a mesa conectada na sessão. Trial grátis disponível.

---

## 3. Fluxos de Usuário (Detalhados)

### 3.1. Fluxo de Onboarding

```
Landing Page (/)
├─→ [Testar Grátis] → /try (Guest Mode, 60min)
│   └─→ Timer acaba → GuestUpsellModal → /auth/sign-up
│       └─→ GuestDataImportModal (importa combate para conta)
│
├─→ [Criar Conta] → /auth/sign-up
│   └─→ Email confirmation → /app/dashboard
│       └─→ OnboardingWizard (primeira vez)
│           ├─→ Criar campanha
│           ├─→ Adicionar jogadores
│           └─→ Criar primeiro encontro
│
├─→ [Entrar] → /auth/login
│   └─→ /app/dashboard
│
└─→ [Scan QR / Link] → /join/[token] (Player)
    └─→ Anon sign-in → PlayerLobby
        └─→ Registrar nome + iniciativa
            └─→ PlayerInitiativeBoard (combate ativo) + capacidade de linkar players anon com monstros no combate ou na campanha naquela sessão
```

### 3.2. Fluxo de Free Combat

```
DM (logado, free) → /app/session/new
├─→ Quick Combat (sem campanha)
│   ├─→ Adicionar jogadores manualmente
│   ├─→ Buscar monstros no compendium
│   ├─→ Rolar iniciativa
│   ├─→ Iniciar combate
│   ├─→ ShareSessionButton → gerar QR/link
│   │   └─→ Jogadores entram via /join/[token]
│   ├─→ Gerenciar combate (HP, conditions, turns)
│   ├─→ [NOVO] Adicionar monstro mid-combat ←── P0
│   ├─→ [NOVO] Esconder nome real do monstro ←── P0
│   ├─→ [NOVO] Agrupar monstros por iniciativa ←── P1
│   └─→ Encerrar → dados não persistem
│
├─→ Features sinalizadas como Pro (cadeado):
│   ├─→ Salvar campanha
│   ├─→ Salvar preset de encontro
│   ├─→ Exportar sessão
│   └─→ Tooltip: "Disponível no plano Pro"
│
└─→ [NOVO] Trial grátis:
    └─→ Uma assinatura → features Pro para toda a mesa conectada
```

### 3.3. Fluxo de Paid Combat (Pro)

```
DM (logado, Pro) → /app/session/new
├─→ Selecionar campanha existente
│   └─→ CampaignLoader pré-carrega jogadores
│
├─→ ShareSessionButton → QR code
│   └─→ Jogadores entram via /join/[token]
│       ├─→ Sem cadastro necessário
│       ├─→ [NOVO] Mestre atribui player da campanha ao jogador temporário
│       └─→ [NOVO] Convite solicita cadastro:
│           ├─→ Diferenciação: Jogador vs Mestre
│           └─→ Pode ser ambos ao mesmo tempo
│
├─→ [NOVO] Player auto-join: jogador loga → aparece na tela do mestre
├─→ [NOVO] Late-join: player entra tarde → consegue inputar iniciativa
├─→ [NOVO] Notificação "é sua vez" / "você é o próximo"
│
├─→ Combate completo:
│   ├─→ Tudo do Free Combat +
│   ├─→ [NOVO] Notas privadas do GM
│   ├─→ [NOVO] Compartilhar arquivos na sessão
│   └─→ Histórico salvo → retomar semana que vem
│
└─→ Pós-sessão:
    ├─→ Analytics (duração, magias, frequência)
    └─→ Export PDF/JSON
```

### 3.4. Fluxo da Área Logada (Dashboard)

```
/app/dashboard
├─→ Campanhas
│   ├─→ Criar/editar campanha
│   ├─→ Gerenciar jogadores
│   │   └─→ [NOVO] Convidar jogador via email
│   │       └─→ Jogador cria conta → personagem linkado à campanha
│   ├─→ Histórico de sessões
│   └─→ [NOVO] Notas da campanha (privadas do GM)
│
├─→ Encontros
│   ├─→ Presets salvos
│   ├─→ Criar novo encontro
│   └─→ [NOVO] CR calculator automático
│
├─→ Compendium
│   ├─→ Monstros (SRD 2014 + 2024)
│   ├─→ Magias
│   ├─→ Itens
│   ├─→ Condições
│   └─→ [NOVO] Homebrew (Pro)
│
├─→ Settings
│   ├─→ Idioma (pt-BR / en)
│   ├─→ Conta
│   └─→ Deletar conta (GDPR/LGPD)
│
└─→ [NOVO] Analytics de Sessão (Pro)
    ├─→ Duração média de combates
    ├─→ Frequência de jogadores
    └─→ Magias/habilidades mais usadas
```

### 3.5. Fluxo do Jogador (Player Journey Completa)

```
Jogador recebe link/QR do mestre
├─→ /join/[token]
│   ├─→ Anon sign-in automático
│   ├─→ Claim token
│   └─→ PlayerLobby
│       ├─→ Registrar nome + iniciativa + HP/AC
│       ├─→ [NOVO] Se entrar tarde → still can input initiative
│       └─→ Aguardar combate iniciar
│
├─→ Combate ativo → PlayerInitiativeBoard
│   ├─→ Ver ordem de iniciativa (turno atual highlighted)
│   ├─→ Ver HP dos aliados (números reais)
│   ├─→ Ver HP dos monstros (LIGHT/MODERATE/HEAVY/CRITICAL only)
│   ├─→ Ver condições ativas
│   ├─→ [NOVO] Notificação visual "você é o próximo"
│   ├─→ [NOVO] Notificação visual "é sua vez!"
│   ├─→ Oracle (buscar magias, condições)
│   └─→ [NOVO] Nome do monstro pode ser falso (display name do mestre)
│
└─→ [NOVO] Convite para criar conta
    ├─→ /auth/sign-up
    ├─→ Diferenciar: Jogador vs Mestre (pode ser ambos)
    └─→ Personagem linkado à campanha do mestre
```

---

## 4. Functional Requirements (Novos — FR42 a FR63)

### Combat Core Improvements

- **FR42:** DM pode adicionar novos monstros ou jogadores a um encontro que já está em andamento (mid-combat add), sem interromper o turno atual
- **FR43:** DM pode definir um "display name" para cada monstro, que é o nome visível para jogadores. O nome real do monstro (do SRD) fica visível apenas para o DM
- **FR44:** DM pode agrupar múltiplos monstros sob uma única entrada de iniciativa (ex: "3 Goblins" rolam juntos)
- **FR45:** DM pode gerenciar grupos de monstros que compartilham a mesma iniciativa mas mantêm HP individual
- **FR46:** DM pode expandir/colapsar grupos de monstros na lista de combate

### Player Experience

- **FR47:** Jogador que entra em uma sessão já iniciada (late-join) pode registrar seu nome, HP, AC e iniciativa — o mestre recebe notificação e pode aceitar a inserção na ordem de iniciativa
- **FR48:** Jogador recebe uma notificação visual "Você é o próximo" quando falta 1 turno para sua vez
- **FR49:** Jogador recebe uma notificação visual "É sua vez!" com animação de destaque, mudança de cor de fundo, e som opcional configurável
- **FR50:** Jogador que se cadastra pode se identificar como "Jogador", "Mestre" ou "Ambos" durante o signup
- **FR51:** Jogador cadastrado pode ter seu personagem vinculado a uma campanha do mestre ao aceitar convite ou entrar via QR code
- **FR51b:** Jogador cadastrado que entra em uma sessão ativa aparece automaticamente na tela do DM sem necessidade de ação manual do mestre (auto-join)

### Session & Campaign Management

- **FR52:** DM pode criar, editar e visualizar notas privadas dentro de uma sessão ativa (visíveis apenas para o DM, nunca broadcast)
- **FR53:** DM pode compartilhar arquivos (imagens, PDFs) com jogadores conectados na sessão
- **FR54:** DM pode convidar jogadores para uma campanha via email — o convite inclui link para criar conta
- **FR55:** Jogador que aceita o convite e cria conta tem seu personagem vinculado à campanha do mestre automaticamente
- **FR56:** DM Pro pode atribuir um player character da campanha a um jogador que entrou via QR code (jogador temporário → personagem persistente)

### Feature Gating (Freemium)

- **FR57:** Usuário Free pode ver features exclusivas Pro com ícone de cadeado e tooltip "Disponível no plano Pro" em cada feature bloqueada
- **FR58:** Usuário Free que tenta usar uma feature Pro recebe um upsell contextual inline (nunca pop-up aleatório ou não-solicitado)
- **FR59:** DM pode ativar um trial grátis com duração configurável (default: 14 dias) que desbloqueia todas as features Pro
- **FR60:** DM Pro pode desbloquear features Pro para todos os jogadores conectados à sessão ativa com uma única assinatura (modelo "Mesa")
- **FR61:** Usuário Free pode distinguir features Pro de features Free por meio de ícones de cadeado, tooltips, e labels "Pro" consistentes em toda a interface

### Encounter Builder (Pro)

- **FR62:** DM Pro pode calcular automaticamente a dificuldade de um encontro (CR calculator) baseado no party level e número de jogadores, para SRD 2014 e 2024
- **FR63:** DM Pro pode criar monstros, magias e itens customizados (homebrew) e salvá-los para uso em futuras sessões

---

## 5. Non-Functional Requirements (Novos — NFR29 a NFR38)

- **NFR29:** Feature flags devem resolver em ≤500ms, sem downtime para alterar configuração de funcionalidades Pro vs Free. Rollback de uma flag em ≤1 minuto. Medido via logs de deploy e latência de feature resolution.
- **NFR30:** Sistema de convite por email com rate limiting (máximo 20 convites por DM por dia) para prevenir spam. Medido via contagem de convites por DM no período de 24h.
- **NFR31:** Notificações visuais de turno (FR48, FR49) devem aparecer em ≤200ms após a ação do DM, via canal de comunicação existente sem requests adicionais do cliente. Medido via timestamp delta entre ação do DM e renderização no cliente.
- **NFR32:** Upload de arquivos em sessão (FR53) limitado a 10MB por arquivo, com validação de tipo (imagens + PDF apenas) e verificação de conteúdo malicioso antes de disponibilizar para download. Medido via testes de upload com arquivos acima do limite e tipos inválidos.
- **NFR33:** 100% dos display names de monstros (FR43) são sanitizados contra OWASP XSS Top 10 antes de serem visíveis para outros usuários. Verificado via testes automatizados com payloads XSS conhecidos.
- **NFR34:** O modelo "Mesa" (FR60) valida a assinatura do DM em real-time via row-level security policies. Se a assinatura expirar mid-session, features Pro continuam até o fim da sessão ativa (graceful degradation). Verificado via integration test com expiração de assinatura simulada.

### Platform & Quality Requirements

- **NFR35:** Browsers suportados: Chrome ≥120, Firefox ≥120, Safari ≥17, Edge ≥120. Funcionalidade core (combat tracker, player view) deve funcionar sem degradação nesses browsers.
- **NFR36:** Performance targets (Core Web Vitals): LCP ≤2.5s, FID ≤100ms, CLS ≤0.1 para páginas principais (dashboard, combat view, player view). Medido via Lighthouse CI em cada deploy.
- **NFR37:** Acessibilidade: WCAG 2.1 AA como target mínimo. Todos os controles de combate devem ser operáveis via teclado. Aria-live regions para updates realtime. Medido via axe-core em CI.
- **NFR38:** Responsive breakpoints: mobile (≤768px), tablet (769–1024px), desktop (≥1025px). Player view otimizada para mobile; DM view otimizada para desktop/tablet.

---

## 6. Débitos Técnicos Mapeados

### Severidade Alta (Resolver antes de novas features)

| # | Débito | Arquivos Afetados | Impacto |
|---|--------|-------------------|---------|
| TD1 | Empty catch blocks — falhas silenciosas sem feedback ao usuário | `PlayerLobby.tsx:64`, `OracleAIModal.tsx:150` | UX: jogador não sabe o que deu errado |
| TD2 | useEffect com dependências faltando (eslint-disable exhaustive-deps) | `GuestCombatClient.tsx:76`, `DiceHistoryPanel.tsx:41`, `EncounterSetup.tsx:89`, `MonsterSearchPanel.tsx:140` | Bugs: stale closures, comportamento imprevisível |
| TD3 | Rate limit in-memory (Oracle AI) — não funciona em serverless multi-instance | `api/oracle-ai/route.ts:5` | Segurança: rate limit bypass em produção |
| TD4 | 15+ eslint-disable comments suprimindo type safety | 8 arquivos (broadcast.ts, join/page.tsx, OracleAI, etc.) | Qualidade: bugs em runtime escondidos |

### Severidade Média (Resolver no próximo sprint)

| # | Débito | Arquivos Afetados | Impacto |
|---|--------|-------------------|---------|
| TD5 | setTimeout sem cleanup em useEffect | `OracleAIModal.tsx:46`, `PlayerLobby.tsx`, `code-block.tsx:45` | Memory leaks potenciais |
| TD6 | Math.random() para dice rolls (inseguro cripto) | `lib/utils/dice.ts:28` | Baixo impacto real para RPG, mas inseguro |
| TD7 | Padrão error/loading duplicado em 5+ componentes | OracleAIModal, MonsterSearchPanel, CampaignManager, PlayerCharacterManager | DRY violation — extrair hook useAsyncState |
| TD8 | `any` type em Oracle AI response parsing | `api/oracle-ai/route.ts:141,151,152` | Type safety reduzida em código crítico |
| TD9 | Mutable global state (broadcast channel, player counter) | `broadcast.ts:6-7`, `OnboardingWizard.tsx:30` | Frágil para scaling |

### Severidade Baixa (Backlog)

| # | Débito | Arquivos Afetados | Impacto |
|---|--------|-------------------|---------|
| TD10 | Hardcoded color strings para creature types | `MonsterSearchPanel.tsx:13-28` | Deveria ser design tokens |
| TD11 | Falta testes E2E (gap conhecido) | Projeto inteiro | Confiança de deploy |
| TD12 | Aria-live regions inconsistentes para updates realtime | Vários componentes de combate | Acessibilidade |

---

## 7. Epics & Roadmap

### Visão Geral dos Epics

| Epic | Prioridade | Esforço | Sprint Sugerido |
|------|-----------|---------|-----------------|
| Epic 0: Tech Debt Cleanup | P0 | 2-3 dias | Sprint 1 (semana 1) |
| Epic 1: Combat Core Improvements | P0 | 3-4 dias | Sprint 1 (semana 1) |
| Epic 2: Monster Grouping | P1 | 3-4 dias | Sprint 2 (semana 2) |
| Epic 3: Player Experience Upgrade | P1 | 4-5 dias | Sprint 2 (semana 2) |
| Epic 4: Session & Campaign Management | P2 | 5-7 dias | Sprint 3 (semana 3-4) |
| Epic 5: Freemium Feature Gating | P1-P2 | 5-7 dias | Sprint 3 (semana 3-4) |
| Epic 6: Audio & Ambiance | P3 | 7-10 dias | Backlog V2+ |
| Epic 7: Battle Scenes & Maps | P3-P4 | 15-20 dias | Backlog V3+ |
| Epic 8: Hardware Kit | P5 | — | Venture separada |

### Epic 0: Tech Debt Cleanup

**Objetivo:** Resolver débitos técnicos que causam bugs ou UX ruim antes de adicionar features.

| Story | Descrição | FRs/NFRs | Esforço |
|-------|-----------|----------|---------|
| 0.1 | Fix catch blocks vazios — adicionar error feedback ao usuário | TD1 | 2h |
| 0.2 | Fix useEffect dependency arrays (4 componentes) | TD2 | 3h |
| 0.3 | Migrar rate limit para Upstash Redis (Oracle AI) | TD3, NFR14 | 4h |
| 0.4 | Cleanup setTimeout leaks — add cleanup em useEffect | TD5 | 2h |
| 0.5 | Remover eslint-disable desnecessários + tipar properly | TD4, TD8 | 4h |

**Critério de conclusão:** Zero eslint-disable para type safety, zero catch blocks vazios, rate limit persistente.

### Epic 1: Combat Core Improvements

**Objetivo:** Resolver os 3 problemas mais críticos reportados pelos usuários em sessão real.

| Story | Descrição | FRs | Esforço |
|-------|-----------|-----|---------|
| 1.1 | Adicionar monstro/jogador mid-combat | FR42, FR12 | 4h |
| 1.2 | Display name customizável para monstros (anti-metagaming) | FR43, NFR33 | 4h |
| 1.3 | Late-join: jogador entra tarde e inputa iniciativa | FR47 | 6h |

**Critério de conclusão:** DM pode improvisar livremente mid-combat. Jogadores nunca veem nome real do monstro. Jogadores atrasados entram sem travar.

### Epic 2: Monster Grouping & Initiative

**Objetivo:** Facilitar combates com muitos monstros (5+ do mesmo tipo).

| Story | Descrição | FRs | Esforço |
|-------|-----------|-----|---------|
| 2.1 | UI de agrupamento — criar grupo de monstros | FR44 | 6h |
| 2.2 | HP individual dentro do grupo | FR45 | 4h |
| 2.3 | Expand/collapse de grupos na lista | FR46 | 3h |
| 2.4 | Roll coletivo de iniciativa para grupo | FR44 | 2h |

**Critério de conclusão:** DM pode adicionar "5 Goblins" como grupo, rolar 1 iniciativa, gerenciar HP individual.

### Epic 3: Player Experience Upgrade

**Objetivo:** Tornar a experiência do jogador conectado engajadora e fluida.

| Story | Descrição | FRs | Esforço |
|-------|-----------|-----|---------|
| 3.1 | Notificação visual "você é o próximo" | FR48, NFR31 | 3h |
| 3.2 | Notificação visual "é sua vez!" | FR49, NFR31 | 3h |
| 3.3 | Player auto-join (loga → aparece na tela do mestre) | FR51b | 6h |
| 3.4 | Diferenciação de cadastro jogador vs mestre | FR50 | 4h |
| 3.5 | Mestre atribui player da campanha ao jogador temporário | FR56 | 5h |

**Critério de conclusão:** Jogadores recebem notificações visuais de turno. Cadastro diferencia roles. Mestre pode vincular jogador temporário a personagem da campanha.

### Epic 4: Session & Campaign Management

**Objetivo:** Experiência completa e rica para o mestre Pro.

| Story | Descrição | FRs | Esforço |
|-------|-----------|-----|---------|
| 4.1 | Notas privadas do GM na sessão | FR52 | 4h |
| 4.2 | Compartilhar arquivos na sessão (imagens, PDFs) | FR53, NFR32 | 8h |
| 4.3 | Convite de jogador via email | FR54, NFR30 | 6h |
| 4.4 | Auto-link personagem ao aceitar convite | FR55 | 4h |
| 4.5 | CR calculator automático (2014 + 2024) | FR62 | 6h |
| 4.6 | Homebrew: criar monstros/magias/itens customizados | FR63 | 10h |

**Critério de conclusão:** Mestre tem notas privadas, pode compartilhar materiais, convidar jogadores, e criar conteúdo homebrew.

### Epic 5: Freemium Feature Gating

**Objetivo:** Implementar o modelo de monetização sem degradar o tier gratuito.

| Story | Descrição | FRs/NFRs | Esforço |
|-------|-----------|----------|---------|
| 5.1 | Sistema de feature flags com rollback rápido | NFR29 | 6h |
| 5.2 | Indicadores visuais Pro no tier Free (cadeado + tooltip) | FR57 | 4h |
| 5.3 | Upsell contextual ao tentar usar feature Pro | FR58 | 4h |
| 5.4 | Trial grátis (14 dias configurável) | FR59 | 6h |
| 5.5 | Modelo "Mesa" — assinatura do mestre → Pro para todos | FR60, NFR34 | 8h |
| 5.6 | Integração de pagamento (Stripe ou similar) | — | 10h |
| 5.7 | Painel de assinatura no settings | — | 4h |

**Critério de conclusão:** Mestre free vê features Pro com cadeado. Upsell é contextual. Trial funciona. Uma assinatura desbloqueia para a mesa toda.

### Epic 6: Audio & Ambiance (V2+ — Backlog)

**Objetivo:** Efeitos sonoros controlados pelos jogadores durante seus turnos.

| Story | Descrição | FRs | Esforço |
|-------|-----------|-----|---------|
| 6.1 | Sistema de efeitos sonoros disponíveis por turno | — | 8h |
| 6.2 | Lock: apenas o jogador do turno pode tocar som | — | 4h |
| 6.3 | Som toca no PC do mestre (áudio remoto) | — | 10h |
| 6.4 | Biblioteca de efeitos sonoros pré-definidos | — | 6h |

### Epic 7: Battle Scenes & Maps (V3+ — Backlog)

**Objetivo:** Cenários visuais temáticos para combate.

| Story | Descrição | FRs | Esforço |
|-------|-----------|-----|---------|
| 7.1 | Compendium de cenários temáticos (neve, arena, floresta) | — | 15h |
| 7.2 | Geração aleatória de cenários baseada no contexto | — | 20h |
| 7.3 | Efeitos visuais/cinematográficos nos cenários | — | 15h |
| 7.4 | Presets de cenário com música e efeitos | — | 10h |

### Epic 8: Hardware Kit (V5 — Venture Separada)

**Objetivo:** Kit físico + digital para RPG de mesa.

| Story | Descrição | Esforço |
|-------|-----------|---------|
| 8.1 | Spec do kit: projetor + cabos + app (~R$2000) | Research |
| 8.2 | Integração app ↔ projetor (cenário projetado na mesa) | Enorme |
| 8.3 | Modelo de negócio: assinatura ou compra única | Research |

---

## 8. Monetização (Integrada)

### Tiers

| Tier | Preço | Inclui |
|------|-------|--------|
| **Guest** | Grátis | /try — 60min, sem conta, localStorage |
| **Free** | Grátis | Conta + combat tracker + compendium + player view |
| **Pro** | R$ 14,90/mês ou R$ 119,90/ano | Campanhas persistentes + presets + export + homebrew + analytics + CR calc |
| **Mesa** (futuro) | R$ 24,90/mês | 1 mestre + até 6 jogadores, todos com Pro |

### Funil de Conversão

```
Landing Page → "Testar Grátis" (sem conta)
  → /try — combate efêmero
    → Gostou? → Cria conta (Free)
      → Quer salvar e continuar? → Upsell contextual → Pro
        → Trial 14 dias
          → Assina ou volta para Free (sem degradação)
```

### Princípios (Inalterados)

1. Nunca degradar o gratuito — o free de hoje nunca vira pago
2. Sem anúncios — premium feel, sempre
3. Transparência — preços visíveis, sem dark patterns
4. Valor antes do paywall — mestre experimenta e decide
5. Freemium como funil, não isca — Free é produto completo

---

## 9. Ideias Futuras (V3+) — Catalogadas

Estas ideias vieram das transcrições de áudio e ficam no backlog de longo prazo:

| # | Ideia | Categoria | Notas |
|---|-------|-----------|-------|
| F1 | Efeitos sonoros do jogador (no turno, toca no PC do mestre) | Audio | Requer WebRTC ou sistema de áudio remoto |
| F2 | Cenários temáticos com presets (neve, arena, floresta) | Visual | Requer pipeline de assets + sistema de renderização |
| F3 | Geração aleatória de cenários baseada no contexto da mesa | AI + Visual | Requer AI generativa + sistema de composição |
| F4 | Efeitos cinematográficos visuais nos cenários | Visual | Animações complexas, potencialmente WebGL |
| F5 | Kit físico: projetor + cabos + app (~R$2000) | Hardware | Venture separada — logística, manufacturing |
| F6 | Marketplace de conteúdo (mestres vendem encounters, mapas) | Platform | Requer massa crítica de usuários |
| F7 | AI session intelligence (recaps, NPC dialogue, suggestions) | AI | Gemini já integrado — expandir |
| F8 | Multi-system support (Pathfinder 2e, etc.) | Platform | Requer abstração do data model |
| F9 | Public API para integrações de terceiros | Platform | Requer documentação + auth para devs |

---

## 10. Métricas de Sucesso (Atualizadas)

| Métrica | Target V1 | Target V2 |
|---------|-----------|-----------|
| Week-2 DM retention | ≥40% | ≥50% |
| Players per DM (30d) | ≥3 | ≥4 |
| Session setup time | ≤3 min | ≤2 min |
| Free → Conta (de /try) | ≥30% | ≥35% |
| Free → Pro (30d) | — | ≥5% |
| Churn mensal Pro | — | <8% |
| LTV por assinante | — | >R$120 (8+ meses) |
| NPS assinantes Pro | — | >50 |
| Late-join success rate | — | ≥95% |
| Notificação de turno → ação em ≤30s | — | ≥80% |

---

## 11. Referências

- PRD V1: `_bmad-output/planning-artifacts/prd.md`
- Product Brief: `_bmad-output/planning-artifacts/product-brief-projeto-rpg-2026-03-23.md`
- Monetização: `docs/monetization-strategy.md`
- Analytics: `docs/analytics-technical-spec.md`
- Brainstorming: `brainstorming.md`
- Transcrições: `scripts/transcriptions/`
- Project Context: `_bmad-output/project-context.md`

---

## 12. Functional Requirements Completos (V1 Mantidos)

Todos os FRs do PRD V1 (FR1–FR41) continuam válidos e implementados. Os novos FRs (FR42–FR63, FR51b) foram adicionados na Seção 4 acima.

## 13. Non-Functional Requirements Completos (V1 Mantidos)

Todos os NFRs do PRD V1 (NFR1–NFR28) continuam válidos. Os novos NFRs (NFR29–NFR38) foram adicionados na Seção 5 acima.

---

_Este documento foi gerado colaborativamente pelos agentes BMAD: John (PM), Mary (Analyst), Winston (Architect), Sally (UX Designer), Bob (SM), e revisado por Dani_._
