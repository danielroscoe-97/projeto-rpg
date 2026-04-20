# SPEC — Campaign Dashboard como Briefing (F10)

> **Status:** Pronto para implementação
> **Origem:** Beta test F10 (Onda 2) + `docs/UX-benchmarks-modern-ludic.md` §5.2 + `docs/PRD-entity-graph.md` §7.9
> **Princípio:** "Hoje na sua mesa" — briefing acionável, não grid de links
> **Data:** 2026-04-19

---

## 1. Problema

Hoje `app/app/campaigns/[id]/page.tsx` renderiza, quando não há `?section=`, um layout que já avançou além de "grid decorativo puro" — tem `CampaignHero` (rico, com NextSessionCard + CTAs contextuais), `CampaignStatsBar` (métricas de combate) e, **depois do onboarding completo**, `CampaignGrid.tsx` (componente 100% decorativo, apenas 3 seções × 2–4 `CampaignGridCard` cada, com contadores e ícones, sem informação acionável).

O problema real é:

1. **O grid posterior ao hero esvazia a "overview":** uma vez onboardado, o briefing termina em `CampaignStatsBar` + grid de contadores. Mestre não vê "o que aconteceu desde a última vez na mesa", não vê NPCs recém-criados, não vê notas recentes, não vê uma preview do mind map. Tudo é navegação.
2. **Não há narrativa de "hoje":** ausência total de timeline / atividade recente / daily note. Beta tester disse "visão geral precisa ser dashboard mais informativo, estruturado pro mestre" (F10).
3. **`CampaignHero` já está fazendo dupla função** (hero + KPI + ações + health) e não tem espaço arquitetural para crescer. Precisa virar **o briefing**, e o resto do conteúdo precisa ser reorganizado em um container novo (`CampaignBriefing`) que encapsula hero + todas as seções abaixo, preservando o path atual e o onboarding.
4. **Discoverability da teia:** `CampaignMindMap` só existe como rota `?section=mindmap` — sem preview no briefing, a feature hero da Onda 3 fica invisível no dia-a-dia.

---

## 2. Visão (desejado)

Mestre abre `/app/campaigns/[id]` e, em < 2s (após fix B04):

- **Em 1s (first paint):** vê o nome da campanha, badge de status ("em combate" / "planejando próxima" / "pausada há N dias"), e halo dourado se houver combate ou sessão ativa (UX benchmark §4.4).
- **Em 2s (streaming completo):** vê "Hoje na sua mesa…" — card único que resolve em combate ativo / próxima sessão com countdown / CTA pra planejar.
- **Rolando 1 vez:** vê timeline Roam-style "Atividade recente" (últimos 5 NPCs/locais/notas criados ou editados), uma mini-preview da teia (15 nós mais conectados), e "Pulso da campanha" (métricas suaves + streak).
- **A qualquer momento:** quick actions no rodapé (já existem no hero, reaproveitadas) + sidebar esquerda (vem da Onda 2 F13, fora do escopo deste spec mas integrável).

Copy narrativa (UX benchmark §4.5): "Bem-vindo de volta, Mestre", "Hoje na sua mesa…", "O baú da campanha" em vez de "Dashboard overview".

---

## 3. Layout proposto

### 3.1 Hero (topo) — evolução do `CampaignHero` atual

**Manter do existente:**
- Título + `CampaignPlayerAvatars` + `CampaignActiveEffects`
- `CombatLaunchSheet` / `InvitePlayerDialog` / `SessionPlanner` dialogs
- Quick actions row (linhas 192-282 do `CampaignHero.tsx`) — reaproveitar como-está

**Mudar:**
- Status-aware subtitle vira **`<BriefingStatusBadge />`** (componente novo, filho do hero) com 3 variantes visuais:
  - `active_combat` → badge vermelho + halo dourado no wrapper (`shadow: var(--halo-active)` do §6.1 do UX doc)
  - `planned_next` → badge esmeralda, sem halo
  - `paused` → badge slate, borda dim (`--dim-inactive`)
- Copy narrativa: "Bem-vindo de volta, Mestre. Última visita: há X dias." (i18n `briefing.welcome_back` + `briefing.last_visit`)
- Manter `NextSessionCard` e o botão "entrar em sessão ativa" do hero (não duplicar no "Hoje").

**Remover do hero:**
- `CampaignStatusCards` (KPI grid de 3 colunas) — vira parte do **"Pulso da campanha"** §3.5 para dar respiro ao hero.
- `CampaignHealthBadge` — desloca para "Pulso" (onde faz mais sentido semanticamente).

### 3.2 Seção "Hoje na sua mesa" (prioridade 1)

**Componente novo:** `components/campaign/BriefingToday.tsx`

Lógica condicional (já parcialmente no hero — extrair):

| Estado | Conteúdo | Visual |
|---|---|---|
| `activeSessionId != null` + `activeEncounterId != null` | Card GRANDE "Combate em andamento — Round N" + CTA "Entrar no combate" (`CombatLaunchSheet`) | Halo dourado forte (`--halo-active`), borda amber-500/60 |
| `activeSessionId != null` (sem encounter) | Card "Sessão ao vivo: {name}" + CTA "Entrar na sessão" | Halo dourado sutil (`--halo-available`) |
| `nextPlannedSession != null` | `NextSessionCard` (reuso) + `prep_notes` preview (3 linhas, line-clamp) | Borda amber-500/20 |
| Default | Mensagem narrativa "Nenhuma sessão agendada. Que tal desenhar o próximo capítulo?" + CTA `SessionPlanner` | Borda slate, flat |

**Requisitos de dado (nenhum novo):**
- `activeSessionId`, `activeSessionName` (já em `dmActiveSession` linha 262-269 de page.tsx)
- `nextPlannedSession` (já existe, linha 291-298)
- **Adicionar:** `activeEncounter` query para DM view (hoje só existe no player view linhas 112-124). Query: `encounters.select('id, round_number').eq('session_id', activeSessionId).eq('is_active', true).maybeSingle()`.

### 3.3 Seção "Atividade recente" — timeline Roam-style

**Componente novo:** `components/campaign/BriefingActivityTimeline.tsx`

Lista unificada de até 5 itens, ordenados por `updated_at DESC` (fallback `created_at`), de:
- `campaign_npcs` (nome + tipo "NPC")
- `campaign_locations` (nome + tipo "Local")
- `campaign_notes` (título + tipo "Nota do DM") — filtrar `user_id = auth.uid()` para owner
- `campaign_factions` (nome + tipo "Facção")
- `campaign_quests` (title + tipo "Quest")
- `sessions` com `status='completed'` e `recap` não-vazio (últimos recaps de sessão)

Cada item:
- Ícone do tipo (reuso dos já existentes em `CampaignSidebarIndex`)
- Nome/título em negrito
- Timestamp relativo ("há 2 horas", "ontem", "há 3 dias") — padronizar com helper `getRelativeDate` já em `NextSessionCard.tsx:26`
- Toda linha é `<Link>` pra entidade (clique → `?section={tipo}&entity={id}`) — respeita "every card is a door" (F15).

Estilo: timeline vertical compacta, barra vertical sutil esquerda (border-left `--dim-inactive`), cada item com hover `bg-white/[0.03]`.

**Mobile:** idem desktop, largura total.

### 3.4 Seção "Teia viva" — mini-preview do Entity Graph

**Componente novo:** `components/campaign/BriefingMindMapPreview.tsx`

Requisito depende da **Onda 3** (Entity Graph). MVP:
- Chama RPC existente `get_player_visible_nodes(p_campaign_id)` (mig 087/088) — funciona para DM (ele é owner, vê tudo).
- Ordena nós por grau (contagem de edges onde id aparece em `source_id` OU `target_id`).
- Pega os **top 15**.
- Renderiza mini-`ReactFlow` (reaproveitar types/nodes de `CampaignMindMap.tsx`) com:
  - Layout dagre automático
  - Sem controles (zoom/pan off ou minimal)
  - Altura fixa ~240px
  - `pointerEvents=auto` só em nós (click navega pra entidade)
- Se total de edges < 5: fallback vazio "A teia ainda não foi tecida. Crie links entre NPCs e locais pra ver o mundo se formar." + CTA "Abrir Mapa Mental" → `?section=mindmap`.
- Sempre presente: CTA no canto "Ver mapa completo →".

**Decisão arquitetural:** não chamar RPC extra no SSR para evitar acrescentar peso ao B04. Strategy: **Suspense boundary client-side** — o componente é `"use client"`, busca sob demanda após mount com skeleton. Isto alinha com o plano do SPIKE-b04 (seção "Add React Suspense + streaming").

### 3.5 Seção "Pulso da campanha" — métricas suaves

**Componente novo:** `components/campaign/BriefingPulseStats.tsx`

Reutiliza dados já buscados em `page.tsx`:

| Métrica | Fonte | Fallback |
|---|---|---|
| NPCs | `npcCount` | "0 criados" |
| Locais | `locationCount` | "0 mapeados" |
| Facções | `factionCount` | "0 fundadas" |
| Notas | `noteCount` | "O baú está vazio" (UX §7 do benchmark doc) |
| Combates rodados | `finishedEncounterCount` | "Nenhum ainda" |
| Sessões completas | `sessionCount` | — |
| Streak semanal | Computar no cliente: sessões completed agrupadas por semana ISO — extensão futura | Ocultar se null |
| `campaignStats` (totalDamage, mvp) | Já calculado via `aggregateCampaignStats` | Reusar `CampaignStatsBar` inline |

Embute `CampaignHealthBadge` (realocado do hero) e `CampaignStatsBar` (realocado do page.tsx linha 402).

**Gamificação sutil:** streak de sessões por semana é P2 — em MVP mostrar só "Última sessão: há X dias" com cor via `lastSessionColor` do `calculateCampaignHealth`.

### 3.6 Quick actions — **reaproveitar do hero**

Decisão: **não criar rodapé flutuante separado em MVP.** As quick actions já existem em `CampaignHero.tsx` linhas 192-282 (combat, encounter, nota, NPC, plan session). Mantê-las dentro do hero evita duplicação.

Onda 5+ pode adicionar FAB "Convocar jogadores" quando auto-invite (F19) aterrissar.

---

## 4. Queries necessárias (server-side)

### 4.1 Composição — mudanças vs. `page.tsx` atual

O Promise.all existente (linhas 230-304) já busca **12 das 13 peças** necessárias. Precisa **adicionar apenas**:

1. **`activeEncounter`** para DM (só existe pra player hoje):
   ```ts
   supabase.from('encounters')
     .select('id, round_number, name')
     .eq('session_id', dmActiveSession?.id ?? '00000000-0000-0000-0000-000000000000')
     .eq('is_active', true)
     .maybeSingle()
   ```

2. **`recentActivity`** — UNION virtual via 5 queries em paralelo + merge JS:
   ```ts
   Promise.all([
     supabase.from('campaign_npcs').select('id,name,updated_at,created_at').eq('campaign_id',id).order('updated_at',{ascending:false}).limit(5),
     supabase.from('campaign_locations').select('id,name,updated_at,created_at').eq('campaign_id',id).order('updated_at',{ascending:false}).limit(5),
     supabase.from('campaign_factions').select('id,name,updated_at,created_at').eq('campaign_id',id).order('updated_at',{ascending:false}).limit(5),
     supabase.from('campaign_notes').select('id,title,updated_at,created_at').eq('campaign_id',id).order('updated_at',{ascending:false}).limit(5),
     supabase.from('campaign_quests').select('id,title,updated_at,created_at').eq('campaign_id',id).order('updated_at',{ascending:false}).limit(5),
   ])
   ```
   Merge + sort em JS (5 × 5 = 25 linhas, custo desprezível).

3. **Mind map preview** — **NÃO** no SSR. Client-side dentro de `BriefingMindMapPreview` via RPC existente `get_player_visible_nodes`. Não regride B04.

### 4.2 Performance

- **Respeitar B04:** o SPIKE-b04 já recomenda Suspense + streaming. Este spec **depende** desse fix — indicado como risco R1 na §7.
- **Tudo paralelo:** adicionar `recentActivity` como 1 entrada no Promise.all existente (não cascade). Custo estimado: +50-80ms no mesmo round-trip já dominante.
- **Não criar RPC `get_campaign_briefing` neste spec.** Justificativa:
  - Os 12 itens existentes já rodam em paralelo em <200ms (SPIKE).
  - RPC única exigiria função SECURITY DEFINER nova + teste RLS + coordenação com Onda 3.
  - Se após merge desta spec métricas mostrarem que 17 queries em paralelo > 300ms P95, criar RPC na **Onda 6 polish**.

---

## 5. Componentes a criar / modificar

### Criar

| Arquivo | Papel | Type (client/server) |
|---|---|---|
| `components/campaign/CampaignBriefing.tsx` | Container da overview; recebe todas as props do DM-view hoje spread no page.tsx; organiza hero + 4 seções | server component (composição) ou client se precisar de estado local |
| `components/campaign/BriefingStatusBadge.tsx` | Badge de status da campanha (combate ativo / planejando / pausado) | client (condicional de render) |
| `components/campaign/BriefingToday.tsx` | Card único da seção "Hoje" | client (dialogs internos) |
| `components/campaign/BriefingActivityTimeline.tsx` | Timeline Roam-style | client (ou server — sem state) |
| `components/campaign/BriefingMindMapPreview.tsx` | Mini-grafo ReactFlow + fetch client-side | client (Suspense) |
| `components/campaign/BriefingPulseStats.tsx` | Métricas + health badge + combat stats | server (puro view) |
| `lib/supabase/campaign-briefing.ts` | Helper `getCampaignRecentActivity(supabase, campaignId)` | server util |
| `lib/types/campaign-briefing.ts` | Types `CampaignBriefingData`, `RecentActivityItem`, `BriefingStatus` | — |

### Modificar

| Arquivo | Mudança |
|---|---|
| `app/app/campaigns/[id]/page.tsx` | Quando `!activeSection && role==='dm' && onboardingCompleted`, renderizar `<CampaignBriefing {...props} />` em vez do trio `<CampaignHero/> + <CampaignStatsBar/> + <CampaignGrid/>`. Adicionar `activeEncounter` query + `recentActivity`. Mantém `CampaignOnboardingChecklist` path intacto para onboarding. Mantém `CampaignSidebarIndex`. Player view e focus view (section set) **intocados**. |
| `app/app/campaigns/[id]/CampaignGrid.tsx` | **Deprecar** (não deletar). Adicionar JSDoc `@deprecated use CampaignBriefing` + comentário. |
| `app/app/campaigns/[id]/CampaignHero.tsx` | Extrair blocos: (a) hero visual → virar filho do `BriefingStatusBadge`; (b) `NextSessionCard` + active session button → virar `BriefingToday`; (c) `CampaignStatusCards` + `CampaignHealthBadge` → virar `BriefingPulseStats`. **Preservar:** dialogs (CombatLaunchSheet/InvitePlayer/SessionPlanner) e quick actions row. |
| `messages/pt-BR.json` + `messages/en.json` | Adicionar namespace `briefing.*` com: `welcome_back`, `last_visit_today`, `last_visit_days`, `today_title`, `today_combat_active`, `today_session_active`, `today_session_planned`, `today_empty_plan`, `activity_title`, `activity_empty`, `activity_type_*`, `mindmap_title`, `mindmap_empty_cta`, `mindmap_open_full`, `pulse_title`, `pulse_streak`, `pulse_*_created`, `status_*`. |

**Decisão sobre `CampaignGrid`:** **deprecar silenciosamente**, sem rota de fallback `?view=grid`. Manter 2 layouts dobra surface de bugs; o novo briefing cobre tudo que o grid mostrava + mais.

---

## 6. Critérios de aceitação

- [ ] Em viewport ≥ 1024px, `/app/campaigns/[id]` (DM, onboarding completo) renderiza: **Hero compacto** → **Hoje** → **Atividade recente** → **Teia viva** → **Pulso**, em stack vertical no main content; sidebar index à direita mantida.
- [ ] Mestre vê briefing em < 2s (P95) após merge do fix B04 (R1).
- [ ] Combate ativo é imediatamente visível: badge `active_combat` no hero + halo dourado no card "Hoje" + CTA "Entrar no combate" que abre `CombatLaunchSheet` com `activeSessionId` pré-populado.
- [ ] Próxima sessão agendada mostra countdown relativo ("em 2 dias", "amanhã") usando helper existente + preview de `prep_notes` (3 linhas `line-clamp`).
- [ ] "Atividade recente" lista até 5 itens dos últimos updates entre NPCs, Locais, Facções, Notas, Quests; cada linha é `<Link>` para a entidade (`?section=<tipo>`); timestamp relativo.
- [ ] "Teia viva" renderiza com skeleton, carrega client-side via `get_player_visible_nodes`; mostra até 15 nós top-conectados + CTA "Ver mapa completo"; fallback narrativo se < 5 edges.
- [ ] "Pulso" mostra 6 contadores + `CampaignHealthBadge` + `CampaignStatsBar`; empty states narrativos ("O baú está vazio", etc.).
- [ ] **Mobile (viewport < 768px):** stack vertical total; "Teia viva" colapsa por padrão em `<details>` com CTA "Abrir mapa completo"; timeline e pulse densos (compact).
- [ ] Dark mode (taverna) default — tokens `--halo-active`, `--halo-available`, `--dim-inactive` introduzidos em CSS global.
- [ ] i18n PT-BR/EN completo para namespace `briefing.*` — zero `MISSING_MESSAGE` (regressão B02).
- [ ] Player view e section focus view **inalterados** — zero regressão no fluxo de jogador.
- [ ] Onboarding checklist (`CampaignOnboardingChecklist`) preservado para `onboardingCompleted === false`.
- [ ] `rtk tsc` + `rtk vitest` + `rtk build` verdes.
- [ ] Combat Parity Rule respeitada: todo o briefing é DM Auth-only.
- [ ] Resilient Reconnection Rule: nenhum canal Realtime ou storage listener novo — só leitura SSR + 1 fetch client-side pro mind map.

---

## 7. Riscos

| # | Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|---|
| R1 | B04 ainda não resolvido — briefing mais denso pode piorar LCP | Média | Alto | Este spec **depende** do fix do SPIKE-b04 (Suspense streaming). Bloquear merge deste até Onda 1 fechar B04. |
| R2 | 17 queries em Promise.all ultrapassa 300ms P95 | Baixa | Médio | Medir em staging; se exceder, empacotar em RPC `get_campaign_briefing` (Onda 6 polish). |
| R3 | `BriefingMindMapPreview` com ReactFlow bundle pesa no first-load | Média | Médio | Dynamic import + Suspense; ReactFlow só carrega em viewport. |
| R4 | Muita informação em mobile — scroll infinito maçante | Média | Médio | Hero + Hoje + quick actions *above-the-fold*; "Teia viva" colapsada em `<details>`; "Atividade" limitada a 5; "Pulso" em grid 2 cols. |
| R5 | Onda 3 (Entity Graph) atrasada → "Teia viva" sempre em fallback | Média | Baixo | Fallback copy é narrativo, convida a criar edges; não quebra UX. |
| R6 | Extrair `CampaignHero` quebra estado de dialogs | Baixa | Alto | Dialogs ficam como filhos do hero refatorado; refs/state preservados. Snapshot test visual antes e depois. |
| R7 | Beta tester pode querer o grid de volta | Baixa | Baixo | Grid fica deprecated mas não deletado; 1-PR para reexpor via `?view=grid` se preciso. |

---

## 8. Fora de escopo

- **Widgets reordenáveis Notion-style** (drag-and-drop) — P2/Onda 6.
- **Customização "o que mostrar no briefing"** — P2.
- **Heatmap de atividade anual** (GitHub-style) — P3.
- **Streak de sessões semanais com badge/gamificação** — MVP mostra apenas `lastSessionColor`.
- **Quick switcher Cmd+K integrado ao briefing** — parte do `SPEC-navigation-redesign.md`.
- **Daily note automática por sessão** — `PRD-entity-graph.md` §7.10, Onda 3+.
- **Notificações push de auto-invite combat** (F19) — Onda 5.
- **RPC `get_campaign_briefing` unificada** — opcional, Onda 6 polish.
- **Sidebar esquerda redesign** (F13) — `SPEC-navigation-redesign.md` separado.

---

## 9. Dependências e sequenciamento

1. **Pré-requisito:** SPIKE-b04 resolvido (Suspense streaming no page.tsx) — **sem isso, este spec piora a UX**.
2. **Pré-requisito:** Onda 1 show-stoppers (F12, F15, F29) merged — confirmação de que cards são clicáveis.
3. **Integra com:** `docs/SPEC-navigation-redesign.md` (sidebar esquerda, mesma Onda 2) — ambos devem chegar antes do launch para coerência de UX.
4. **Prepara para:** `docs/PRD-entity-graph.md` Fase 3g (mind map focus) — `BriefingMindMapPreview` é uma vitrine do que a Onda 3 vai entregar.
