# Prompt: Metodologia Pocket DM — Próximos Passos

Cole este prompt numa nova janela do Claude Code.

---

## CONTEXTO

O Epic da Metodologia Pocket DM foi implementado em 2026-04-04 (commit `aa2c023`). Todas as 4 sprints (METH-0 a METH-3) foram codadas, passaram code review (11 patches aplicados), e estão com zero erros TypeScript.

**Documentos de referência:**
- `docs/epic-metodologia-pocket-dm.md` — Epic pai (visão, fases, hipóteses, schema SQL, pipeline)
- `docs/epic-methodology-community-page.md` — Epic derivado (página, dashboard hooks, gamificação)
- `_bmad-output/implementation-artifacts/sprint-plan-methodology.md` — Sprint plan com 11 stories detalhadas
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Tracking (METH-0 a METH-3 = done)

---

## O QUE JÁ EXISTE (implementado e commitado)

### Infra (METH-0)
- **Migration 094**: `excluded_accounts` table + `get_methodology_stats()` RPC (Supabase)
- **API `/api/methodology/stats`**: endpoint público, cached 5min, retorna `{ valid_combats, combats_with_dm_rating, unique_dms, current_phase, phase_target }`
- **API `/api/methodology/contribution`**: endpoint autenticado, retorna stats pessoais do DM (`total_combats, rated_combats, is_researcher`)

### Página Pública (METH-1)
- **`/methodology`**: página com 5 seções (barra dourada, headline, como funciona, por que o DMG erra, CTA)
- **`MethodologyProgressBar`**: barra de HP dourada com milestones dinâmicos (500/2000/5000), usa `phase_target` da API
- **SEO**: JSON-LD `ResearchProject`, metadata bilingual, canonical
- **Footer**: link "Metodologia" adicionado
- **i18n**: namespace `methodology` completo em `messages/pt-BR.json` + `messages/en.json` (32 keys)

### Dashboard Hooks (METH-2)
- **`PocketDmLabBadge`**: ícone beaker com `animate-rune-pulse` no header do dashboard (DM-only)
- **`MethodologyMilestoneToast`**: toast dourado via Sonner quando comunidade cruza milestone (debounce 5min)
- **`PostCombatMethodologyNudge`**: card sutil no recap pós-combate, dismissable 7 dias (wired no `CombatSessionClient.tsx`)

### Easter Egg (METH-3)
- **`ResearcherBadge`**: badge desbloqueável com 10+ combates rated, animação `fade-in`, no dashboard entre QuickActions e campanhas
- **Spell Tiers Teaser**: banner discreto na página `/methodology`

### Patches de Code Review (11 aplicados)
- `fade-in` keyframe no `tailwind.config.ts`
- Guard `valid_combats > 0` (não `combats_with_dm_rating > 0`) pra divisão
- Contribution endpoint com filtros matching RPC (`creatures_snapshot`, `combat_result`)
- `captureError` no catch do contribution
- `localStorage.setItem` APÓS `toast()` no MilestoneToast
- Shimmer via `className` ao invés de inline `style`
- Debounce 5min no MilestoneToast fetch
- `parseInt || 0` guard contra NaN
- `cancelled` guard no ResearcherBadge useEffect
- Dynamic `phase_target` no ProgressBar (não hardcoded 5000)

---

## O QUE FALTA / PRÓXIMOS PASSOS

### 1. Aplicar Migration no Supabase (URGENTE)
A migration `supabase/migrations/094_methodology_stats.sql` precisa ser aplicada no Supabase de produção:
```bash
supabase db push
# OU aplicar manualmente no SQL Editor do dashboard Supabase
```
Sem isso, o RPC `get_methodology_stats()` não existe e a barra mostra zero.

### 2. Testar Visualmente
- Acessar `/methodology` em dev e produção
- Verificar barra dourada renderiza com dados reais (ou zeros)
- Verificar milestones aparecem corretamente
- Testar mobile (barra full-width, milestones viram dots)
- Verificar dashboard: LabBadge visível, MilestoneToast dispara, ResearcherBadge aparece com 10+ combates
- Verificar PostCombatMethodologyNudge aparece no recap (só Auth mode, não Guest)

### 3. Decisões de Design Pendentes (do Party Mode)
- **3 opções > 5 opções pra DM rating**: John sugeriu simplificar votação pra "mais fácil / esperado / mais difícil". Avaliar UX. (Backlog)
- **Preview descritivo (Fase 1)**: Mary sugeriu que com ~300 dados Gold, mostrar lookup descritivo ("47 combates similares foram votados 3.4/5") mesmo antes do modelo preditivo. (Backlog)
- **Quality tiers (Gold/Silver/Bronze)**: classificar dados por qualidade. Gold = 3+ votos + snapshot completo. (Backlog — Fase 1 do epic pai)

### 4. Evolução da Página (alinhada com epic pai)
- Quando Fase 1 atingir ~500 combates: adicionar "precisão atual" e top hipóteses
- Quando Fase 2 atingir ~2000 combates: mostrar score do modelo no builder
- Spell tier voting system (teased na página, implementar quando pronto)

### 5. Itens Técnicos
- A `excluded_accounts` table precisa ter mais contas inseridas conforme QA/test accounts são criadas
- Considerar criar `get_user_methodology_contribution()` como RPC server-side pra substituir as queries com `!inner` join no contribution endpoint (mais eficiente)
- O `PostCombatMethodologyNudge` só aparece em Auth mode — verificar que NÃO aparece em `GuestCombatClient.tsx` (Combat Parity Rule)

---

## ARQUIVOS-CHAVE

| Arquivo | O que faz |
|---------|-----------|
| `supabase/migrations/094_methodology_stats.sql` | Migration: table + RPC |
| `app/api/methodology/stats/route.ts` | API pública de stats |
| `app/api/methodology/contribution/route.ts` | API de contribuição pessoal |
| `components/methodology/MethodologyProgressBar.tsx` | Barra dourada |
| `app/methodology/page.tsx` | Página pública com 5 seções |
| `components/dashboard/PocketDmLabBadge.tsx` | Badge no dashboard |
| `components/dashboard/MethodologyMilestoneToast.tsx` | Toast de milestone |
| `components/dashboard/ResearcherBadge.tsx` | Easter egg (10+ combates) |
| `components/combat/PostCombatMethodologyNudge.tsx` | Nudge pós-combate |
| `components/dashboard/DashboardOverview.tsx` | Integração dos hooks |
| `components/session/CombatSessionClient.tsx` | Integração do nudge |

---

## REGRAS

- Seguir CLAUDE.md do projeto (RTK, Combat Parity, SRD compliance)
- A página `/methodology` é **pública** — nunca expor dados individuais, só agregados
- Dados são **anonimizados** — nunca mostrar dados por usuário/campanha
- `excluded_accounts` filtra admin + QA + test — nunca remover essa proteção
- Ao alterar componentes de combate, verificar Guest/Anon/Auth parity
