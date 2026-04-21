---
status: 'ready-for-epics'
createdAt: '2026-04-21'
updatedAt: '2026-04-21'
version: '1.0'
epic: 12
title: 'Campaign Workspace — IA, Persistência & Histórico de Combates'
author: 'John (PM) — via Party Mode'
contributors:
  - 'Mary (Analyst)'
  - 'Winston (Architect)'
  - 'Sally (UX Designer)'
  - 'Bob (SM)'
inputArtifacts:
  - 'Screenshot dashboard atual 2026-04-21'
  - 'Logs JSON últimas 12h (projeto-rpg-log-export-2026-04-21T15-34-44.json)'
  - 'Party Mode transcript 2026-04-21'
competitiveReferences:
  - 'Roll20 (Session Log, sidebar contextual)'
  - 'Foundry VTT (World as portal)'
  - 'D&D Beyond (Campaign tabs: Overview/Logs/Encounters)'
  - 'Notion (workspace por contexto, sidebar que muda)'
  - 'Obsidian (linking, timeline, graph)'
---

# PRD — Campaign Workspace

## 1. Resumo executivo

O PocketDM hoje trata "combate" e "campanha" como domínios desconectados. O DM inicia um combate avulso e, no final, é empurrado de volta pro dashboard com um banner pedindo que escolha uma campanha — uma interação que quebra o fluxo e descarta contexto que já deveria existir. A tela de Campanhas é um grid plano sem hierarquia de navegação; a tela de detalhe da campanha existe, mas está escondida. Não há timeline de combates, não há modo "estou dentro desta campanha", e retomar um combate interrompido é impossível.

Este PRD propõe três ondas de entrega que, juntas, transformam Campanha em **workspace de primeira classe** (à la Notion/Foundry), matam o banner odioso, introduzem timeline de combates com replay/storytelling (Roll20 Session Log), e permitem continuar combate em andamento com zero friction.

## 2. Job-to-be-Done (confirmado pelo usuário)

> "Como DM, eu quero **reabrir combate antigo pra continuar** (se ainda está em andamento), **revisitar combate passado pra montar storytelling**, e **avaliar a campanha como um todo** — sem ter que escolher campanha toda vez nem perder contexto entre sessões."

**Três modos de uso, três affordances distintas:**

| Modo | JTBD | Feature | Wave |
|------|------|---------|------|
| Continuar | Retomar combate pausado/crashed | 'Continuar Combate' card no Overview | 3 |
| Revisitar | Storytelling, recap pros jogadores | Modal cinematográfico 'Revisitar' | 3 |
| Avaliar | Stats da campanha, dificuldade, XP | Dashboard de stats + Timeline | 2+3 |

## 3. Personas

### P1 — Dani (DM primário)
- Gerencia 3+ campanhas simultâneas como mestre (Krynn, Aventura Épica, Teste).
- Também é **jogador** em 1+ campanhas (Curse of Strahd via lucasgaluppo17).
- Alta frequência de uso, exige navegação rápida entre contextos.
- Valoriza storytelling e continuidade narrativa entre sessões.
- Dores atuais: perde combates quando fecha aba, não consegue ver histórico, dashboard de campanha está vazio.

### P2 — Jogador autenticado
- Entra em campanhas via invite.
- Usa `/app/campaigns/[id]` em modo read-only (sem NPCs, Settings, etc).
- JTBD secundário: ver resumo do último combate, notas do DM públicas, próxima sessão.

### P3 — Jogador anônimo (out-of-scope desta epic)
- Usa `/join/[token]` para combate pontual.
- Não tem campaign workspace (não faz sentido).
- Documentado apenas para garantir que mudanças NÃO quebram esse fluxo.

## 4. Goals & Non-goals

### Goals
- G1. **Matar o banner "Selecione uma campanha pra salvar o combate"** — combate nunca mais deve exigir escolha retroativa.
- G2. **Workspace Mode** — entrar numa campanha muda o contexto visual (sidebar, breadcrumb, ações rápidas).
- G3. **Campaign Overview rico** — substitui tela vazia atual com Hero, Combate Ativo, Timeline, Jogadores, Notas.
- G4. **Timeline de combates** com 3 affordances: Continuar, Revisitar, Avaliar.
- G5. **Persistência resiliente** — combate persiste ao entrar na setup, não ao clicar Start; retomar combate interrompido vira possível.
- G6. **Paridade DM/Player** — mesma IA e hierarquia, diferenciador visual sutil por role.

### Non-goals (V1)
- NG1. Replay turn-by-turn real (precisaria de log de ações por turno — grande migration).
- NG2. Guest (`/try`) ganhar workspace (guest é pontual por design).
- NG3. Compartilhar workspace com outros DMs (colaboração multi-DM).
- NG4. Importar campanhas de Roll20/Foundry.
- NG5. Mindmap como tab principal (fica em Settings/avançado por enquanto).

## 5. Escopo em 3 Ondas

### Wave 1 — KILL THE BANNER (3–5 dias)
**Objetivo:** eliminar o banner, persistir combate desde o setup, resolver GAP-1 e GAP-2 do schema.

- Migration: `sessions.campaign_id` → NULLABLE; adicionar `sessions.quick_mode BOOLEAN`.
- Persistir `session + encounter` (status `draft`) quando DM entra na tela de setup, não ao clicar Start.
- Quick combat (`?quick=true`) passa a persistir com `campaign_id = null, quick_mode = true`.
- `RecapActions.handleSaveCombat` remove prompt — combate já está salvo, recap só muda status para `completed`.
- Se quick combat, UI no recap oferece **"Vincular a uma campanha"** (opcional, não bloqueante).

**Resultado:** banner some, combate não se perde ao fechar aba, quick combat e campanha convivem sem fricção.

### Wave 2 — CAMPAIGN WORKSPACE MODE (5–8 dias)
**Objetivo:** transformar campanha em workspace. Dashboard rico. Sidebar contextual.

- `AppSidebar` recebe prop `mode: 'global' | 'campaign'` — rail 56px + contextual 240px.
- `/app/campaigns/[id]` vira Overview completo: Hero + Combate Ativo + Timeline dos 5 últimos + Jogadores + Notas recentes + Quick Actions.
- Breadcrumb sticky: `🏰 Krynn / Overview`.
- DM vs Player: badge no header + tabs diferenciadas.
- CampaignCard (lista) ganha ribbon de role e chip discreto.

**Resultado:** entrar numa campanha vira uma experiência distinta. Usuário sente que "está dentro".

### Wave 3 — TIMELINE, REVISITAR, AVALIAR (5–8 dias)
**Objetivo:** histórico como first-class feature. 3 modos de uso do JTBD.

- **Continuar** — card destacado no Overview quando `encounters.ended_at IS NULL AND is_active = true`. Click → hydrate do `party_snapshot`/`creatures_snapshot` na sala de combate.
- **Revisitar** — modal cinematográfico por encounter: party + creatures + resultado + DM notes + duração + XP. Shareable via `combat_reports` existente.
- **Avaliar** — painel de stats da campanha: win rate, média de rounds, dificuldade percebida vs real, dano por jogador (derivado de snapshots).

**Resultado:** DM tem visibilidade completa da história da mesa, pode retomar, recapitular e avaliar.

## 6. Métricas de sucesso

| Métrica | Baseline atual | Alvo pós-V1 |
|---------|---------------|-------------|
| Taxa de combates salvos com sucesso | Bloqueado por banner (estimativa baixa) | 100% dos combates com campanha |
| Tempo até iniciar combate dentro de uma campanha | 4+ cliques (dashboard → campanha → botão → picker) | 2 cliques (dentro do workspace) |
| Combates perdidos por fechamento de aba | 100% dos drafts | 0% (persistência desde setup) |
| DMs que abrem detalhe de campanha após combate | Baixo (feature escondida) | ≥ 70% em 30 dias |
| Uso de 'Revisitar' em 30 dias | N/A (não existe) | ≥ 20% dos combates concluídos |

## 7. Riscos e mitigações

| Risco | Severidade | Mitigação |
|-------|-----------|-----------|
| Migration quebra RLS existente | Alta | Testar em branch com dados de Beta Test 3; validar policies antes do merge |
| Draft encounters poluindo a listagem de combates | Média | Filtro `ended_at IS NOT NULL OR is_active = true` na Timeline; sweeper de drafts abandonados (>72h) |
| Sidebar contextual quebra em mobile | Alta | Rail 56px vira bottom tab bar em breakpoint `md`; Sally aprovou pattern |
| Usuários confundem 'Combates Rápidos' sem campanha | Média | Filtro global 'Mostrar quick combats?' no Timeline + seção dedicada no dashboard |
| Regressão no combate atual (Zustand + broadcast) | Crítica | Wave 1 mantém Zustand como single-source-of-truth durante combate ao vivo; DB é só snapshot |

## 8. Dependências arquiteturais (Winston)

- **Preservar:** Zustand + broadcast channel como single-source-of-truth durante combate ao vivo.
- **Preservar:** Guarantee de Resilient Player Reconnection (CLAUDE.md).
- **Preservar:** Combat Parity Rule — toda mudança UX deve considerar Guest/Anônimo/Auth.
- **Novo:** `sessions` persiste em `draft` logo no setup; `encounters.ended_at IS NULL` == "em andamento".
- **Reusar:** `combat_reports` para o fluxo 'Revisitar' (compartilhável).
- **Reusar:** `encounters.party_snapshot`, `creatures_snapshot`, `combat_result`, `dm_difficulty_rating`, `dm_notes` (já existem).

## 9. Fora do escopo (backlog futuro)

- Replay turn-by-turn real com log de ações.
- Colaboração multi-DM numa mesma campanha.
- Importador de Roll20/Foundry.
- Stats agregados cross-campanha ("suas 50 últimas sessões").
- Export PDF de campanha inteira.
- Integração com calendário (próxima sessão em Google Calendar).

## 10. Referências competitivas (Mary)

| Padrão extraído | Fonte | Aplicação no PocketDM |
|-----------------|-------|----------------------|
| Sidebar contextual por workspace | Notion | `AppSidebar mode='campaign'` |
| Session Log como timeline | Roll20 | Timeline no Campaign Overview |
| World as portal | Foundry VTT | Campaign Workspace Mode (entrar → contexto muda) |
| Campaign tabs (Overview/Logs/Encounters) | D&D Beyond | Tabs do rail contextual |
| Linking entre entidades | Obsidian | NPCs/Locais/Quests linkáveis nas notas (V2) |
| Daily note / continuous journal | Obsidian | Notes tab com timeline cronológica |

---

**Próximo artefato:** `epic-12-campaign-workspace.md` — stories de cada Wave com AC testáveis, UX specs e Tech decisions.
