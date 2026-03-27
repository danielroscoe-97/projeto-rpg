# PROMPT: QA Completo com Playwright MCP — Pocket DM

> Cole este prompt inteiro em uma nova conversa do Claude Code com o MCP do Playwright carregado.

---

## Sua Missão

Você é um **QA Engineer sênior** especializado em testes E2E para aplicações web RPG/D&D. Sua missão é executar uma bateria completa de testes manuais assistidos por Playwright MCP contra a aplicação **Pocket DM** em produção, documentando cada passo com screenshots e gerando um relatório executivo ao final.

## Aplicação Sob Teste

- **URL Produção**: `https://tavernadomestre.vercel.app/`
- **Stack**: Next.js 16 (App Router), React 19, TypeScript, Supabase, Zustand, Tailwind, shadcn/ui, next-intl
- **Tipo**: Combat Tracker para D&D 5e — mesa presencial com player view em tempo real

## Credenciais de Teste

### Conta DM (Mestre Logado)
- **Email**: `danielroscoe97@gmail.com`
- **Senha**: `Eusei123*`

### Fluxos Deslogados (Visitante)
- **Modo visitante**: `https://tavernadomestre.vercel.app/try`
- **Signup**: `https://tavernadomestre.vercel.app/auth/sign-up`
- **Login**: `https://tavernadomestre.vercel.app/auth/login`

### Dados Existentes na Conta
- Campanha **"Krynn"** com 5 jogadores: Torin (HP 86, AC 22), Noknik (HP 76, AC 23), Askelad (HP 67, AC 18), Satori (HP 83, AC 23), Kai (HP 71, AC 14)
- Campanha **"Aventura Epica"** com 1 jogador
- Campanha **"teste"** com 0 jogadores

---

## FASE 0 — Leitura Obrigatória (ANTES de testar)

Leia TODOS os documentos abaixo para entender a proposta de valor, requisitos funcionais, premissas e mapa de QA do produto. Faça anotações sobre o que precisa ser validado.

### Proposta de Valor & Visão do Produto
1. `_bmad-output/planning-artifacts/product-brief-projeto-rpg-2026-03-23.md` — Product Brief com problema, visão, público-alvo
2. `_bmad-output/planning-artifacts/prd.md` — PRD original com requisitos funcionais (FR1-FR41, NFR1-NFR28)
3. `docs/prd-v2.md` — PRD V2 com freemium, 3 modos de uso, FRs 42-63

### Requisitos Funcionais Detalhados (Feature Specs)
4. `_bmad-output/planning-artifacts/epics.md` — Épicos com stories e acceptance criteria
5. `_bmad-output/planning-artifacts/epics-v2-stories.md` — Épicos V2 (Epic 3, 4, 5)

### Premissas & Regras Imutáveis
6. `docs/hp-status-tiers-rule.md` — HP tiers LIGHT/MODERATE/HEAVY/CRITICAL (70/40/10%) — IMUTÁVEL
7. `docs/monster-token-fallback-rules.md` — Regras de fallback de tokens de monstros
8. `_bmad-output/planning-artifacts/ux-design-specification.md` — Especificação UX completa

### Mapas de QA Existentes
9. `_bmad-output/implementation-artifacts/tests/qa-e2e-scenarios.md` — Cenários E2E em formato Given-When-Then (GWT)
10. `_bmad-output/implementation-artifacts/tests/qa-audit-report.md` — Relatório de auditoria QA com 43 findings (P0-P3)
11. `scripts/audiosv2/qa-plan-playwright.md` — Plano de QA anterior (61 checks, 3 jornadas)
12. `qa-screenshots/QA-REPORT.md` — Relatório do último QA executado (7 bugs confirmados)

### Estabilização & Bugs Conhecidos
13. `docs/prd-stabilization-simplification.md` — PRD de estabilização com bugs críticos conhecidos
14. `docs/epics-stabilization-simplification.md` — Épicos de estabilização (E1: Critical Unblock, E2: Interface Simplification, E3: Feature Completion)

### Specs de Features Críticas (ler conforme necessário)
15. `_bmad-output/implementation-artifacts/3-10-save-and-resume-encounter.md` — Persistência de sessão
16. `_bmad-output/implementation-artifacts/5-1-session-link-generation-and-player-anonymous-auth.md` — Link de sessão + join
17. `_bmad-output/implementation-artifacts/5-2-player-view-live-initiative-board-and-turn-indicator.md` — Player view
18. `_bmad-output/implementation-artifacts/5-5-realtime-dual-write-and-channel-subscription.md` — Realtime architecture
19. `_bmad-output/implementation-artifacts/b1-2-display-name-anti-metagaming.md` — Display names (anti-metagaming)
20. `_bmad-output/implementation-artifacts/3-5-hp-management-damage-healing-and-temporary-hp.md` — HP system
21. `_bmad-output/implementation-artifacts/3-6-conditions-apply-display-and-remove.md` — Conditions system
22. `_bmad-output/implementation-artifacts/c2-3-cr-calculator.md` — CR Calculator
23. `_bmad-output/implementation-artifacts/tech-spec-dice-history-advantage.md` — Dice history

### Tech Stack & Convenções
24. `docs/tech-stack-libraries.md` — Stack completa com regras para agentes

---

## FASE 1 — Montar Plano de Testes

Após ler TODOS os documentos acima, monte um plano de testes extensivo e documentado que cubra:

### Estrutura do Plano

Salve o plano em `qa-screenshots/QA-PLAN-FULL.md` com esta estrutura:

```markdown
# Plano de Testes E2E — Pocket DM
> Gerado em [DATA] após leitura de [N] documentos de requisitos

## Cobertura de FRs
[Tabela mapeando cada FR do PRD → check(s) do plano]

## Módulos de Teste

### M1: Landing Page & Aquisição
### M2: Autenticação (Signup, Login, Forgot Password)
### M3: Dashboard & Gestão de Campanhas
### M4: Setup de Encontro (Busca SRD, Filtros, Adicionar Combatentes)
### M5: Combate Ativo (Turnos, HP, Condições, Derrotar, Editar)
### M6: Stat Block & Rolagem de Dados
### M7: Player View & Realtime (Join, Presença, Sync)
### M8: Compartilhamento de Sessão (QR, Link, Late Join)
### M9: Persistência & Resiliência (Save, Resume, F5, Reconexão)
### M10: Anti-Metagaming (Aliases, Sanitização, Player View)
### M11: CR Calculator & Dificuldade
### M12: Compêndio (Monstros, Magias, Condições, Items)
### M13: Configurações & Conta (Perfil, Deleção)
### M14: Modo Visitante (Timer, Limitações, Import ao Logar)
### M15: Responsividade & Mobile
### M16: i18n (pt-BR, en)
### M17: Acessibilidade (ARIA, Keyboard Nav, Screen Reader)
### M18: Performance (Load Times, LCP, Bundle Size)
### M19: Regressão de Bugs Conhecidos (do QA anterior)

Para cada check, incluir:
- ID único (ex: M5-C03)
- Descrição do passo
- Validação esperada (baseada no FR/spec)
- Severidade se falhar (P0/P1/P2/P3)
- Referência ao FR/spec de origem
```

### Regras para Montagem do Plano

1. **Todo FR do PRD deve ter pelo menos 1 check** — mapear FR → check
2. **Todo bug do QA anterior deve ter check de regressão** — verificar se foi corrigido
3. **Todo P0/P1 do qa-audit-report deve ser verificado** — 15 findings críticos
4. **Cenários GWT do qa-e2e-scenarios.md devem ser incorporados** — não duplicar, referenciar
5. **Fluxos deslogados E logados** — testar ambos para cada feature aplicável
6. **HP tiers são IMUTÁVEIS** — LIGHT >70%, MODERATE >40%, HEAVY >10%, CRITICAL ≤10%
7. **Anti-metagaming é CRÍTICO** — monstros NUNCA devem expor HP/AC/DC numérico para players
8. **Persistência é CRÍTICA** — F5 não pode perder dados em nenhum cenário

---

## FASE 2 — Executar Testes com Playwright MCP

### Setup

```
Criar pasta: qa-screenshots/full-run-[DATA]/
Salvar screenshots em cada passo com nome: [MODULE]-[CHECK_ID].png
```

### Convenções de Execução

1. **Screenshot em CADA passo** — evidência visual obrigatória
2. **Capturar console errors** — anotar MISSING_MESSAGE, erros 4xx/5xx, warnings
3. **Testar em ordem**: M1 → M19 (priorizar fluxos deslogados primeiro)
4. **Marcar status de cada check**: ✅ PASS | ❌ FAIL | ⚠️ PARCIAL | ⏭️ SKIP (com motivo)
5. **Para cada FAIL**: anotar severidade, descrição do bug, screenshot, steps to reproduce
6. **Testar em viewport desktop (1280x720)** e anotar se precisa teste mobile separado

### Fluxo de Execução

```
1. DESLOGADO: M1 (LP) → M2 (Auth) → M14 (Visitante) → M4 (Setup) → M5 (Combate) → M6 (Stat Block)
2. LOGIN: M2 (Login) → M3 (Dashboard) → M4 (Setup logado) → M5 (Combate logado) → M8 (Share)
3. PLAYER VIEW: Abrir link de join → M7 (Player View) → M10 (Anti-Metagaming)
4. PERSISTÊNCIA: M9 (F5, reconexão, resume)
5. COMPÊNDIO: M12 (busca, filtros, todas as seções)
6. SETTINGS: M13 (perfil, deleção)
7. REGRESSÃO: M19 (bugs do QA anterior)
```

---

## FASE 3 — Relatório Final

Salve o relatório em `qa-screenshots/full-run-[DATA]/QA-REPORT-FULL.md` com:

```markdown
# Relatório Completo de QA — Pocket DM
> Executado em [DATA] via Playwright MCP
> Duração: [TEMPO]
> Checks executados: [N] de [TOTAL]

## Resumo Executivo
[Tabela: Severidade × Total × Confirmados × Não Reproduzidos × Novos]

## Cobertura de FRs
[Tabela: FR → Status (Testado/Não Testado/Parcial)]

## Bugs Confirmados (por severidade)
### P0 — Críticos
### P1 — Altos
### P2 — Médios
### P3 — Baixos

## Bugs Novos Encontrados

## Regressão de Bugs Anteriores
[Tabela: Bug anterior → Corrigido? → Evidência]

## Console Errors Persistentes
[Lista de erros recorrentes no console]

## Screenshots Index
[Tabela: Arquivo → Descrição → Check ID]

## Recomendações de Priorização
[Top 5 ações recomendadas]

## Métricas de Qualidade
- % de FRs cobertos
- % de checks PASS
- Tempo médio por módulo
- Áreas sem cobertura
```

---

## Regras Gerais

- **NÃO modifique código** — este é um ciclo de QA puro, apenas teste e documente
- **NÃO pule checks** — se não conseguir executar, marque como SKIP com motivo
- **Seja cético** — teste edge cases, inputs inválidos, sequências inesperadas
- **Priorize P0/P1** — se o tempo for limitado, foque nos checks de maior severidade
- **Documente TUDO** — um bug sem evidência é um bug que não existe
- **Compare com specs** — o comportamento deve bater com o FR/spec, não com "parece OK"
- **Use a TodoWrite tool** para trackear progresso módulo a módulo

---

## Início

Comece pela FASE 0: leia todos os documentos listados. Depois apresente um resumo do que entendeu sobre:
1. A proposta de valor do produto
2. Os 3 modos de uso (visitante, logado free, logado pro)
3. Os FRs mais críticos
4. Os bugs conhecidos que precisam de regressão
5. As regras imutáveis do sistema

Só então prossiga para a FASE 1 (montagem do plano).
