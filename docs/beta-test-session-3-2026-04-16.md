# Beta Test Session 3 — Análise Completa

> **Data:** 2026-04-16 (00:03–01:02 UTC)
> **Participante:** 1 DM (beta tester)
> **Duração:** ~1 hora
> **Requests no log:** 1.395
> **Campanhas testadas:** 4

---

## Sumário Executivo

O DM explorou extensivamente o dashboard, 4 campanhas, compêndio, sessões, personagens, combates, soundboard e presets. O feedback principal converge em 3 temas: (1) campanha é estática após criação — mestre não consegue fazer nada, (2) falta de conexões entre entidades (NPCs, locais, facções), (3) Player HQ precisa ser mais compacto e prático.

---

## Bloco 1 — Player HQ (Ficha do Jogador)

> **Contexto:** Experiência do jogador ao ver/editar sua ficha
> **Impacto:** Alto — afeta TODOS os jogadores
> **Dependência:** EPIC Player HQ Standalone já existe ([docs/EPIC-player-hq-standalone.md](EPIC-player-hq-standalone.md))

| # | Feedback | Tipo | Prioridade |
|---|---|---|---|
| F01 | Notas dos jogadores — mestre deve poder acessar também | Feature | P1 |
| F02 | Mestre pode colocar notas secretas para jogadores específicos (notas privadas mestre↔jogador) | Feature | P1 |
| F03 | Classe deve ser lista selecionável com TODAS as classes + opção de multiclasse | Enhancement | P1 |
| F04 | Raça deve ser lista selecionável com todas as raças | Enhancement | P1 |
| F05 | Tudo no Player HQ deve ser lista selecionável — precisa compêndio completo | Enhancement | P2 |
| F06 | Botão de "Salvar" visível no editor + editor como popup maior | UX | P2 |
| F07 | Proficiências e testes ocupam janela inteira — compactar | UX | P1 |
| F08 | Tudo muito espaçado — precisa ser prático e fácil de ver | UX | P1 |

### Ações recomendadas
- **F01 + F02:** Novo sistema de notas com visibilidade (jogador, mestre, privada mestre↔jogador). Tabela `player_notes` já existe — precisa de campo `visibility` e UI pro mestre ler/escrever.
- **F03 + F04 + F05:** Depende de compêndio completo de classes e raças. Wizard de criação (`CharacterWizard`) já existe com steps — precisa de dados completos + UI de seleção.
- **F06:** Popup do editor precisa crescer. Botão de salvar explícito (hoje é auto-save?).
- **F07 + F08:** Redesign de density no Player HQ. Reduzir padding, compactar seções, mostrar mais informação por viewport.

### Epic relacionado
- [EPIC-player-hq-standalone.md](EPIC-player-hq-standalone.md) — Fase 1 (rota standalone) é independente e pode ser executada agora.

---

## Bloco 2 — Campaign HQ (Dashboard da Campanha)

> **Contexto:** Experiência do mestre ao gerenciar a campanha
> **Impacto:** Crítico — é a "casa" do mestre no app
> **Status:** Vários itens são P0 (show-stoppers)

| # | Feedback | Tipo | Prioridade |
|---|---|---|---|
| F09 | "Só Iniciativa" ao invés de "Mod Iniciativa" | Label fix | P2 |
| F10 | Visão geral precisa ser dashboard mais informativo, fácil de navegar, estruturado pro mestre | Redesign | P1 |
| F11 | Deve ser mais fácil ver personagens e fichas dentro da Campaign Area + navegação mais fácil | UX | P1 |
| F12 | Na tela de sessões NÃO TEM botão de criar sessão e nenhum direcionamento | Bug/UX | P0 |
| F13 | Na página principal, menu está muito escondido na DIREITA — mover pra ESQUERDA | UX | P1 |
| F14 | Na visão de locais, board da cidade deveria ser quadrado arredondado | Visual | P3 |
| F15 | Nem mestre nem jogadores conseguem interagir com cartão dos locais — zero interação | Bug/UX | P0 |
| F29 | Todas as coisas atuais da campanha do mestre após criada NÃO PERMITE o mestre fazer mais nada | Bug/UX | P0 |

### Ações recomendadas
- **F12 + F29 + F15 — P0 (SHOW-STOPPERS):**
  - Cards de locais, NPCs, facções devem ser EDITÁVEIS e INTERATIVOS após criação
  - Botão de criar sessão deve existir na tela de sessões
  - Cada card deve ser clicável → abre painel de edição/visualização
  - Princípio UX: **"Every card is a door"** — zero cards decorativos
- **F10:** Dashboard da campanha deve mostrar: próxima sessão, últimos NPCs, locais com mais notas, resumo de último combate. Briefing do mestre, não grid de links.
- **F11:** Fichas dos jogadores acessíveis diretamente da campanha com 1 clique.
- **F13:** Menu principal → mover navegação pra esquerda (sidebar left).
- **F09:** Trocar label "Mod Iniciativa" → "Iniciativa".
- **F14:** Estilo visual dos cards de locais — quadrado arredondado.

---

## Bloco 3 — Sistema de Conexões (Entidades Interconectadas)

> **Contexto:** Mestre quer que NPCs, locais, facções e notas se conectem
> **Impacto:** Transformacional — muda o modelo mental do app
> **Status:** Precisa de PRD/Epic dedicado (maior mudança arquitetural)

| # | Feedback | Tipo | Prioridade |
|---|---|---|---|
| F16 | Pasta de cartões por tipo ou agrupar cartões por tipo/região | Feature | P2 |
| F17 | Mestre deve construir HIERARQUIA de locais (cidade > taverna, igreja, casa do barão; cidade dentro de região) | Feature | P1 |
| F18 | Validar melhor maneira de montar experiência de hierarquia de locais | Research | P1 |
| F20 | Linkar NPCs com locais (ex: NPC dono da taverna linkado à taverna) | Feature | P1 |
| F21 | Montar MAPA DE CONEXÕES entre as coisas | Feature | P2 |
| F22 | Facções — interconectar NPCs dentro de facções | Feature | P1 |
| F23 | Revisitar tudo e montar PRD/épico para evoluir/refatorar estrutura de campanha | Meta | P1 |
| F24 | Notas linkadas a lugares, NPCs ou facções | Feature | P1 |
| F25 | Manter notas e pastas de forma separada também | Feature | P2 |
| F26 | Ex: clicar no NPC Viktor, ver notas que conectam com determinado local | Feature | P1 |
| F27 | Notas como pesquisa dos artefatos da campanha | Feature | P2 |
| F28 | Facções com listas de NPCs dentro e local | Feature | P1 |

### Proposta de arquitetura (do Party Mode)

**Modelo de dados recomendado:**

1. **Hierarquia de locais:** `parent_location_id` na tabela `campaign_locations` (nativo)
2. **Cross-entity links:** Tabela de junção genérica:
   ```sql
   campaign_entity_links (
     id, campaign_id,
     source_type, source_id,    -- "npc", "uuid-xxx"
     target_type, target_id,    -- "location", "uuid-yyy"
     relationship_type           -- "located_at", "member_of", "owns"
   )
   ```
3. **Notas linkadas:** Tabela `note_entity_links` (já existe `note_npc_links` — expandir)

### Ações recomendadas
- **F23:** Criar PRD dedicado: "Campaign Entity Graph" — refatoração da estrutura de campanha
- **F17 + F18:** Spike de UX para hierarquia de locais (árvore? breadcrumbs? mapa?)
- **F20 + F22 + F28:** Implementar tabela de junção genérica
- **F24 + F26:** Notas com contexto de entidade
- **F16:** Agrupamento/filtro de cards por tipo

---

## Bloco 4 — Combate & Realtime

> **Contexto:** Integração combate ↔ campanha
> **Impacto:** Alto — diferencial do produto
> **Status:** Combate funciona; integração com campanha precisa melhorar

| # | Feedback | Tipo | Prioridade |
|---|---|---|---|
| F19 | Quando mestre inicia combate em campanha, link de convite deveria chegar AUTOMATICAMENTE na área logada dos players | Feature | P1 |

### Ações recomendadas
- **F19:** Push notification ou realtime broadcast para jogadores logados quando DM inicia combate. Usar canal Supabase Realtime da campanha para notificar players conectados. Mostrar banner/toast: *"Seu mestre iniciou um combate! [Entrar]"*.
- Respeitar Combat Parity Rule (CLAUDE.md) — feature é Auth-only (jogadores logados em campanha).

---

## Bloco 5 — Linguagem Ubíqua

> **Contexto:** Terminologia inconsistente confunde o DM
> **Impacto:** Fundacional — afeta toda a UI
> **Status:** Glossário definido e aprovado

| # | Feedback | Tipo | Prioridade |
|---|---|---|---|
| F30 | Cuidar da linguagem ubíqua do app (sessão x encontro x combate) | Foundation | P0 |

### Docs criados
- [docs/glossario-ubiquo.md](glossario-ubiquo.md) — Glossário oficial
- [docs/migration-i18n-linguagem-ubiqua.md](migration-i18n-linguagem-ubiqua.md) — 16 chaves i18n a alterar
- [docs/migration-rotas-session-to-combat.md](migration-rotas-session-to-combat.md) — Migração de rotas /session → /combat

---

## Bloco 6 — Bugs Técnicos (dos Logs)

> **Contexto:** Problemas encontrados na análise de 1.395 requests
> **Impacto:** Direto na experiência e primeira impressão

| # | Bug | Severidade | Evidência no log | Fix estimado |
|---|---|---|---|---|
| B01 | `/api/broadcast` retorna 404 (4 ocorrências) | Alta | 4× status 404 | Verificar se rota existe; pode ser rename/deploy issue |
| B02 | i18n `MISSING_MESSAGE: sheet (pt-BR)` em `/app/dashboard/campaigns` | Média | 1× error level | Adicionar chave `sheet` no `messages/pt-BR.json` |
| B03 | `/opengraph-image.png` retorna 404 (6 ocorrências) | Média | 6× status 404 | OG image não está sendo gerada/exportada |
| B04 | Campaign page leva 5-8 segundos para carregar | Crítica | 130 requests, max 8.082ms | Investigar queries SSR — provável N+1 ou cascade |
| B05 | Dashboard leva 6 segundos no first load | Alta | 92 requests, max 6.164ms | Provavelmente mesmo problema de B04 |
| B06 | `/api/broadcast` leva 3-5 segundos quando funciona | Média | 4.736ms max | Otimizar ou investigar timeout |

### Ações recomendadas
- **B04 + B05 (CRÍTICO):** Profile das queries SSR na campaign page. Provavelmente múltiplas queries Supabase em cascata. Considerar: parallel queries, caching, ou eager loading.
- **B01:** Debug da rota `/api/broadcast` — pode ser rota removida ou renomeada.
- **B02:** Fix de 2 minutos — adicionar chave faltante.
- **B03:** Verificar geração de OG image (pode ser config de Vercel ou Next.js `opengraph-image.tsx`).

---

## Matriz de Prioridades Consolidada

### P0 — Show-stoppers (fazer AGORA)

| ID | Item | Bloco |
|---|---|---|
| F29 | Campanha não permite mestre fazer nada após criação | Campaign HQ |
| F15 | Cards sem interação — mestre e jogador não conseguem fazer nada | Campaign HQ |
| F12 | Sem botão de criar sessão | Campaign HQ |
| F30 | Linguagem ubíqua (já em execução) | Linguagem |
| B04 | Campaign page 5-8 segundos | Bugs |

### P1 — Core Experience (próximo sprint)

| ID | Item | Bloco |
|---|---|---|
| F01 | Notas do jogador acessíveis pelo mestre | Player HQ |
| F02 | Notas secretas mestre↔jogador | Player HQ |
| F03 | Classes como lista selecionável + multiclasse | Player HQ |
| F04 | Raças como lista selecionável | Player HQ |
| F07 | Compactar proficiências/testes | Player HQ |
| F08 | Reduzir espaçamento geral | Player HQ |
| F10 | Dashboard mais informativo | Campaign HQ |
| F11 | Navegação mais fácil a fichas na campanha | Campaign HQ |
| F13 | Menu na esquerda | Campaign HQ |
| F17 | Hierarquia de locais | Conexões |
| F19 | Convite automático pro combate | Combate |
| F20 | Linkar NPCs com locais | Conexões |
| F22 | Facções com NPCs | Conexões |
| F23 | PRD do Entity Graph | Conexões |
| F24 | Notas linkadas a entidades | Conexões |
| F26 | Clique no NPC → notas + conexões | Conexões |
| F28 | Facções com listas de NPCs e local | Conexões |
| B05 | Dashboard 6 segundos | Bugs |

### P2 — Enhancement (backlog)

| ID | Item | Bloco |
|---|---|---|
| F05 | Tudo selecionável (compêndio completo) | Player HQ |
| F06 | Botão salvar + popup maior | Player HQ |
| F09 | "Iniciativa" ao invés de "Mod Iniciativa" | Campaign HQ |
| F16 | Agrupar cards por tipo/região | Conexões |
| F21 | Mapa de conexões visual | Conexões |
| F25 | Notas e pastas separadas | Conexões |
| F27 | Notas como pesquisa de artefatos | Conexões |
| B01 | `/api/broadcast` 404 | Bugs |
| B02 | i18n missing key | Bugs |
| B03 | OG image 404 | Bugs |
| B06 | Broadcast lento | Bugs |

### P3 — Polish

| ID | Item | Bloco |
|---|---|---|
| F14 | Board de locais como quadrado arredondado | Campaign HQ |
| F18 | Validar UX de hierarquia de locais | Conexões |

---

## Ordem de Execução Recomendada

```
Sprint N (atual):
  ├── [LINGUAGEM] Migração i18n (16 chaves) — 1 sessão
  ├── [LINGUAGEM] Migração de rotas /session → /combat — 1 sessão
  ├── [BUGS] B02 i18n fix + B01 broadcast 404 — quick fixes
  └── [PLAYER HQ] EPIC Standalone Fase 1 — 1 sessão (independente)

Sprint N+1:
  ├── [CAMPAIGN P0] Cards interativos + botão criar sessão + CRUD pós-criação
  ├── [BUGS] B04/B05 Performance campaign/dashboard
  └── [CAMPAIGN P1] Dashboard informativo + menu esquerda

Sprint N+2:
  ├── [CONEXÕES] PRD Entity Graph (F23)
  ├── [CONEXÕES] Hierarquia de locais (F17) + Links NPC↔Local (F20)
  └── [PLAYER HQ] Classes/raças selecionáveis (F03/F04)

Sprint N+3:
  ├── [CONEXÕES] Facções com NPCs (F22/F28) + Notas linkadas (F24/F26)
  ├── [COMBATE] Convite automático (F19)
  └── [PLAYER HQ] Compactar layout (F07/F08) + Notas mestre↔jogador (F01/F02)
```
