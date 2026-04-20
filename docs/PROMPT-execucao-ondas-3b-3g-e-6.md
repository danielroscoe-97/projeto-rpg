# Prompt de Execução — Ondas 3b-3g (Entity Graph UI) + Onda 6 (Polish)

> **Para:** Agente executor (sessão fresca de Claude Code)
> **Origem:** Continuação do release 2026-04-20 (8 ondas já em prod)
> **Repositório:** `c:\Projetos Daniel\projeto-rpg` (branch base: `master`)

---

## COPY-PASTE: Prompt completo para o agente

```
Você vai continuar a implementação do PocketDM a partir do release 2026-04-20.
8 ondas já estão em produção (ver docs/DELIVERY-RELEASE-2026-04-20.md). Agora
você vai executar Ondas 3b-3g (Entity Graph UI) + Onda 6 (polish).

## CONTEXTO DO PROJETO

PocketDM é ferramenta web de gerenciamento de campanhas e combates D&D 5e
(pocketdm.com.br). Stack: Next.js App Router + TypeScript + Supabase + Tailwind.
PT-BR primary (83% tráfego BR), EN secondary. Dark mode default.

## O QUE JÁ ESTÁ EM PRODUÇÃO

- Linguagem Ubíqua (83 chaves i18n + 65 rotas migradas)
- Performance Suspense streaming em campaign + dashboard
- Cards interativos (LocationCard/FactionCard/NpcCard/QuestCard clickable)
- Campaign Dashboard Briefing ("Hoje na sua mesa")
- Sidebar + Quick Switcher behind feature flag NEXT_PUBLIC_FEATURE_NEW_SIDEBAR
- Entity Graph foundation: migrações 146/147/148 + lib/supabase/entity-links.ts
  + lib/hooks/useEntityLinks.ts + 14 tests passing
- Player Notes Visibility: migrações 149/150 + Player HQ inbox tab + visibility
  toggle em QuickNotes/Journal + DM Inspector + DmPrivateNoteForm
- Auto-invite Combat: canal campaign:{id}:invites + toast + banner + fallback

## DOCS DE REFERÊNCIA (LEIA PRIMEIRO, NA ORDEM)

1. docs/DELIVERY-RELEASE-2026-04-20.md — resumo do que já foi feito
2. docs/PRD-entity-graph.md — PRD completo do Entity Graph (700 linhas)
   → Foco nas §8 Fases 3b-3g para esta sessão
3. docs/UX-benchmarks-modern-ludic.md — diretrizes visuais cross-cutting
4. docs/SPEC-navigation-redesign.md §10 Fase 3 — polish da sidebar

## REGRAS IMUTÁVEIS (CLAUDE.md)

1. **Combat Parity** — Toda feature verifica 3 modos (Guest /try, Anônimo /join,
   Autenticado /invite). Features de campaign são Auth-only.

2. **Resilient Reconnection** — Zero mudança em:
   - lib/player-identity-storage.ts
   - lib/realtime/* (canais session:{id} intocados)
   - useCombatResilience hook interno
   - Cadeia de fallbacks L1-L5

3. **SRD Compliance** — Entity Graph NÃO entra SRD monsters/spells (eles são
   read-only do lore público, não edges do mestre).

4. **SEO Canonical** — Sem mudanças em rotas públicas indexadas.

5. **RTK** — Use `rtk` prefix: `rtk tsc`, `rtk vitest`, `rtk git`, `rtk npm test`.

## ORDEM DE EXECUÇÃO

### FASE 3b — Hierarquia de locais (1 sessão)

Destravado pela foundation (mig 146 anti-cycle trigger + parent_location_id
já existe desde mig 081).

**Criar:**
- components/campaign/LocationParentSelect.tsx — dropdown que filtra descendentes
  (evita ciclo client-side antes de bater no trigger)

**Modificar:**
- components/campaign/LocationForm.tsx — adicionar campo "Local pai" (opcional)
  com LocationParentSelect
- components/campaign/LocationList.tsx — renderizar como árvore expansível
  (accordion mobile) usando parent_location_id. Breadcrumb no detalhe.
- messages/pt-BR.json + en.json — adicionar chaves
  campaign.locations.parent_label, tree_view_toggle, breadcrumb_root, etc.

**Critério de pronto:**
- Mestre cria Porto Azul (root), depois Taverna do Pêndulo com parent=Porto Azul
- UI mostra árvore com chevron expand/collapse
- Breadcrumb no detalhe: "Porto Azul > Taverna do Pêndulo"
- Tentar ciclo: app bloqueia client-side + banco rejeita se passar
- Build limpo, testes passam

**Commits focados:**
- feat(locations): parent selector + anti-cycle client guard
- feat(locations): tree view rendering with accordion
- feat(locations): breadcrumb + i18n

### FASE 3c — Links NPC ↔ Local (1 sessão)

Destravado por entity-links lib + scope guard.

**Criar:**
- components/campaign/EntityTagSelector.tsx — generalização de NpcTagSelector
  com prop `type`: 'location' | 'npc' | 'faction'

**Modificar:**
- components/campaign/NpcForm.tsx — adicionar seção "Morada" (1 local)
- components/campaign/LocationCard.tsx — adicionar seção "Habitantes" (N NPCs)
- Usar useEntityLinks + linkEntities/unlinkEntities de lib/supabase/entity-links.ts

**Critério de pronto:**
- DM edita NPC Viktor, seleciona local "Taverna do Pêndulo" como morada
- DM abre detalhe do local Taverna: vê Viktor na lista de Habitantes
- Remover link é reversível com undo de 5s
- Optimistic UI + rollback em erro

**Commits:**
- feat(entity-graph): EntityTagSelector generic component
- feat(npc): "Mora em" section in NpcForm
- feat(location): "Habitantes" section in LocationCard

### FASE 3d — Facções (1 sessão)

**Modificar:**
- components/campaign/FactionForm.tsx — seção "Sede" (1 local) + "Membros" (N NPCs)
- components/campaign/FactionCard.tsx — mostra contagem de membros + sede
- components/campaign/NpcForm.tsx — seção "Facções" (N facções, member_of)

**Critério de pronto:**
- DM cria Círculo da Rosa Negra, adiciona 5 NPCs como membros, 1 local como sede
- Ficha do NPC mostra "Membro de: Círculo da Rosa Negra"
- Ficha do Local mostra "Facções sediadas: Círculo da Rosa Negra"

### FASE 3e — Notas linkadas + migração note_npc_links (1 sessão)

Mais delicada porque migra dados. Fazer com cuidado.

**Criar migração 151:**
- supabase/migrations/151_migrate_note_npc_links_to_edges.sql
- INSERT ... SELECT de note_npc_links → campaign_mind_map_edges
  (source_type='note', target_type='npc', relationship='mentions')
- ON CONFLICT DO NOTHING (idempotente)

**Modificar:**
- components/campaign/CampaignNotes.tsx — linkNoteToNpc → linkEntity genérico
- Adicionar seletores de Local/Facção/Quest dentro da nota
- Painel "Notas sobre isto" em cada ficha de entidade (RF-12 do PRD)

**IMPORTANTE:** NÃO criar migração de DROP de note_npc_links ainda. Isso é
migração 152 e fica pra próxima sprint, com 1 sprint de co-existência.

**Critério de pronto:**
- Nota antiga linkada a NPC continua aparecendo no NPC (lê via edges agora)
- Nova nota pode ser linkada a NPC + Local + Facção + Quest simultaneamente
- Ao abrir NPC, painel "Notas sobre isto" lista todas as menções

### FASE 3f — Agrupamento e filtros (1 sessão)

**Modificar:**
- components/campaign/LocationList.tsx — switch "Lista flat / Árvore / Por tipo"
- components/campaign/NpcList.tsx — filtro por facção + por local
- Persistir preferência em localStorage

**Critério de pronto:**
- Tab Locais tem 3 modos visuais
- Tab NPCs filtra dinamicamente
- Preferência persist por campanha (key: pocketdm:list-view:{campaignId})

### FASE 3g — Mapa visual focus + busca universal (1 sessão — opcional)

Esta fase é opcional. Pode ser adiada pra Onda 6 se tempo apertar.

**Modificar:**
- components/campaign/CampaignMindMap.tsx — aceita prop focusNodeId, destaca nó
  selecionado + 1° grau de vizinhança
- Adiciona "Abrir no Mapa de Conexões" em cada ficha de entidade

**Criar:**
- components/campaign/UniversalSearch.tsx — input de busca universal na
  Campaign HQ (RF-14 do PRD, F27 do beta test)

### FASE 6 — Polish (1-2 sessões)

Limpeza e melhorias pós-release.

**6a. Deleção de components legados (Onda 2b Fase 3):**
Apenas APÓS confirmar via Vercel analytics que a flag NEW_SIDEBAR está em 100%
production + 2 semanas sem rollback:

- Deletar components/dashboard/DashboardSidebar.tsx
- Deletar components/dashboard/DashboardLayout.tsx (ou simplificar)
- Deletar components/campaign/CampaignSidebarIndex.tsx
- Remover feature flag NEXT_PUBLIC_FEATURE_NEW_SIDEBAR do código
- Remover branch OFF em app/app/layout.tsx (sidebar vira default)
- Atualizar testes afetados

**6b. Mini Mind-Map real na sidebar:**
Substitui o SidebarMiniMap placeholder. Reusa RPC get_player_visible_nodes.
Mostra 6-8 últimas entidades visitadas (Obsidian-inspired).

**6c. RLS SQL rewrite:**
- Arquivo: tests/rls/player-notes-visibility.sql
- Problema: PERFORM fora de DO $$ block — SQL não compila em psql
- Fix: wrap cada PERFORM em DO $$ BEGIN PERFORM ...; END $$;
- Alternativa: converter em função plpgsql única de orquestração

**6d. Test coverage gaps:**
Features novas sem test coverage:
- CampaignBriefing + sub-componentes (Onda 2a)
- AppSidebar + hooks (Onda 2b)
- PlayerNotesInspector + DmPrivateNoteForm (Onda 4 UI)
- CombatInviteListener + dispatch (Onda 5)

Criar testes unit + integration com jest. Supabase mock ou test DB.

**6e. Copy cleanup:**
- i18n chaves reservadas em briefing.* ainda órfãs (welcome_back, last_visit_*,
  pulse_streak) — conectar em Hero subtitle OU remover chaves
- Revisar privacy_notice após feature — considerar copy dinâmico por visibility

**6f. Daily Notes automáticas (PRD §7.10):**
Quando mestre inicia sessão → cria automaticamente nota diária linkada.
Depende do Entity Graph UI estar completo.

## CHECKLIST DE SEGURANÇA (após cada fase)

- [ ] Build limpo (`rtk tsc --noEmit`)
- [ ] Testes passando (`rtk npm test` — comparar com baseline master)
- [ ] Zero regressões em Combat/Realtime/Reconnection
- [ ] i18n PT-BR + EN em paridade (zero MISSING_MESSAGE)
- [ ] RLS validada se migração nova
- [ ] Push direto pra origin/master (autorizado) OU branch + PR dependendo do risk

## REGRAS DE COMUNICAÇÃO

- Reporte progresso ao final de cada FASE
- Se encontrar AMBIGUIDADE no PRD: PARE e pergunte
- Se migração tiver risco de data loss: PARE e peça review humana
- Use TodoWrite para tracking

## CRITÉRIO DE SUCESSO (release Entity Graph completo)

Release Entity Graph está completo quando:
1. ✅ Mestre cria hierarquia 3 níveis de locais e navega
2. ✅ NPC linka a Local (2 direções funcionam)
3. ✅ Facção com 5 NPCs + 1 sede funciona
4. ✅ Nota linkada a múltiplas entidades aparece nas 3 fichas
5. ✅ Painel "Conexões" em cada ficha mostra vizinhança
6. ✅ Tab Locais alterna entre lista flat e árvore
7. ✅ RLS testada com player vendo só entidades visíveis
8. ✅ Zero regressão em Mind Map existente
9. ✅ `rtk tsc --noEmit` + tests passam
10. ✅ Performance mantida (RNF-01 a RNF-04 do PRD)

## PROCESSO PARA PR/MERGE

Usuário autorizou push direto em origin/master (com rebase antes se necessário).
Se conflito em push: PARE, reporte, NÃO force-push.

Para cada fase:
1. Rebase em origin/master mais recente
2. Implementar fase
3. Validar (tsc + tests)
4. Commits focados (1-3 por fase)
5. Push origin/master
6. Reportar estado

## ORDEM DE PRIORIDADE (se rate limit)

Se não der pra fazer tudo, priorize nessa ordem:
1. Fase 3b (hierarquia) — maior valor UX imediato
2. Fase 3c (NPC↔Local) — segundo maior
3. Fase 3d (Facções)
4. Fase 6c (RLS SQL rewrite — pequeno, importante)
5. Fase 3e (Notas linkadas + migração 151)
6. Fase 3f (Filtros)
7. Fase 6b (Mini Mind-Map)
8. Fase 3g (Mapa visual focus)
9. Fase 6a (deletion — só depois de validar flag)
10. Fase 6d (test coverage)
11. Fase 6e (copy cleanup)
12. Fase 6f (daily notes)

## START

Comece lendo docs/DELIVERY-RELEASE-2026-04-20.md, depois
docs/PRD-entity-graph.md §8 (Fases 3b-3g), depois use TodoWrite pra
criar o plano. Primeira fase: 3b (hierarquia de locais).
```

---

## Como usar este prompt

1. Abra uma sessão fresca de Claude Code no mesmo repositório
2. Cole o conteúdo dentro do bloco de código acima como primeiro prompt
3. O agente vai ler os docs e criar plano com TodoWrite
4. Execute fase a fase, commit após cada, push direto em origin/master
5. Se quiser paralelismo via worktrees, adicione: "Trabalhe com worktrees
   isolados por fase quando fizer sentido"

---

## Variações úteis

### Só Entity Graph UI (mais focado)
> Remover Fase 6 do prompt. Executa só 3b-3g.

### Só Onda 6 (polish pós-release)
> Remover Fases 3b-3g. Começar direto pela 6a (se flag já em prod +2 semanas),
> ou 6c (RLS SQL rewrite) se quiser dívida técnica primeiro.

### Priorizar retenção (feedbacks do beta test)
> Fazer 3b + 3c + 3d + 3e = maior cobertura de feedbacks F16-F28 em 4 sessões.
> Mapa visual (3g) fica pra depois.

### Dry-run (PR só, sem merge)
> "NÃO faça push direto. Crie PR para cada fase e me avise. Eu vou revisar
> manualmente antes de merge."

---

## Estimativa de esforço

| Fase | Complexidade | Sessões | Valor UX |
|---|---|---|---|
| 3b Hierarquia locais | Média | 1 | Alto |
| 3c NPC↔Local | Baixa | 1 | Alto |
| 3d Facções | Baixa | 1 | Médio |
| 3e Notas linkadas | **Alta** (migração) | 1-2 | Alto |
| 3f Filtros | Baixa | 0.5 | Médio |
| 3g Mapa focus + busca | Média | 1 | Médio |
| 6a Deletion legacy | Baixa | 0.5 | Baixo (dívida técnica) |
| 6b Mini Mind-Map real | Média | 1 | Médio |
| 6c RLS SQL rewrite | Baixa | 0.25 | Baixo (mas importante) |
| 6d Test coverage | Alta | 2 | Médio (confiabilidade) |
| 6e Copy cleanup | Baixa | 0.5 | Baixo |
| 6f Daily Notes | Média | 1 | Alto |

**Total estimado:** 10-12 sessões pra fechar tudo.

---

## Pré-requisitos antes de iniciar

- [ ] Onda 2b ativada em Vercel (flag em Production) — destrava Fase 6a eventualmente
- [ ] Smoke tests das 8 ondas do release passaram (§3 do VERCEL-ACTIONS.md)
- [ ] Beta tester validou Onda 4 (player/DM notes funcionam E2E)
- [ ] Métricas de performance confirmaram LCP <2.5s em campaign page

Se qualquer pré-requisito falhar, PARAR e corrigir antes de avançar.
