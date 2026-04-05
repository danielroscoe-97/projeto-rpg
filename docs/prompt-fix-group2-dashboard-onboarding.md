# Code Review & Patches — Grupo 2: Dashboard + OnboardingWizard

**Data:** 2026-04-05  
**Epic:** User Journey Onboarding (JO-01 a JO-15)  
**Base diff:** `git diff f8393e9..HEAD`  
**Sprints cobertos:** 2, 3, 4 (JO-05/06/07/08/09/10/11/13/15)

---

## Contexto

O Grupo 2 cobre a reescrita massiva do dashboard após os Sprints 1–4 do Epic User Journey. Os arquivos revisados foram:

| Arquivo | Mudança Principal | Stories |
|---|---|---|
| `components/dashboard/OnboardingWizard.tsx` | +694 linhas: role step integrado, PlayerStep simplificado, CelebrationStep | JO-05/06/08 |
| `components/dashboard/DashboardOverview.tsx` | Active session banner, player empty state, pending invites destacados, DM nudge | JO-07/09/10/11 |
| `components/dashboard/ActivationChecklist.tsx` | Novo componente — checklist interativa de ativação do DM | JO-13 |
| `components/dashboard/DashboardSidebar.tsx` | Quick actions: new_combat, invite_player | JO-15 |
| `components/dashboard/PendingInvites.tsx` | Prop `highlighted` para player sem campanhas | JO-11 |
| `components/dashboard/PlayerCampaignCard.tsx` | Badge `sessionLive`, CTA `sessionJoin` | JO-10 |
| `components/dashboard/PocketDmLabBadge.tsx` | shimmer-sweep substituiu rune-pulse | — |
| `app/app/dashboard/page.tsx` | Remoção de gate `userRole !== "player"` no redirect; queries de checklist | JO-05/13 |
| `app/app/dashboard/layout.tsx` | `isPlayerFirstCampaign` para tour do player; translations sidebar | JO-12/15 |
| `app/app/layout.tsx` | `tourId` no link Compendium | JO-12 |
| `messages/en.json` + `messages/pt-BR.json` | ~60 novas chaves para todos os sprints | todos |

---

## Patches Aplicados

### P2-09 — OnboardingWizard: sessionStorage bypassa role step para usuários sem role

**Arquivo:** `components/dashboard/OnboardingWizard.tsx:159`  
**Severidade:** Alta — usuário legacy com sessionStorage salvo pulava o role step mesmo sem role definida no DB

**Problema:**
```typescript
// ANTES (bugado)
const ss = readSessionStorage();
if (ss?.step && ss.step !== "done") return ss.step as WizardStep;
// ↑ se ss.step = "2" e userRole = null → vai direto pro step 2, sem pedir role
```

O comentário P6 dizia "force 'role' step even if there's a savedStep" — mas a guarda só existia para o `savedStep` vindo do DB, não para o sessionStorage. Cenário de repro: usuário nova conta, começou o wizard (salvou step 2 no sessionStorage), fechou a aba, voltou no dia seguinte → sessionStorage ainda presente, role ainda null → pula role step.

**Fix:**
```typescript
// DEPOIS (corrigido)
if (ss?.step && ss.step !== "done") {
  // P6: sessionStorage also must not bypass role step for users with no role
  if (!userRole && ss.step !== "role") return "role";
  return ss.step as WizardStep;
}
```

---

### P2-10 — messages: `go_to_dashboard` duplicado no namespace `onboarding`

**Arquivos:** `messages/en.json`, `messages/pt-BR.json`  
**Severidade:** Média — JSON inválido (chave duplicada); PT-BR tinha duas traduções levemente diferentes

**Problema:**  
O Sprint 2 adicionou `go_to_dashboard` ao bloco `celebration` do namespace `onboarding`, sem perceber que a chave já existia mais acima no mesmo namespace (adicionada em trabalho anterior). JSON duplicado — JavaScript usa o ÚLTIMO valor, então funcionava, mas:
- EN: mesmo valor nas duas → sem impacto funcional
- PT-BR: antigo = `"Ir para Dashboard"`, novo = `"Ir para o Dashboard"` → o novo ganhava, mas a inconsistência era um risco

**Fix EN:** removido o duplicado Sprint-added (perto de `celebration_subtitle`).  
**Fix PT-BR:** removido o duplicado Sprint-added + corrigida a string antiga de `"Ir para Dashboard"` para `"Ir para o Dashboard"`.

---

## Verificações Sem Bugs (não precisaram de patch)

### ActivationChecklist.tsx
- `dismissed = true` como estado inicial (SSR-safe, sem hydration mismatch) ✓
- `t[item.labelKey]` — TypeScript correto, `ITEMS` só usa keys do tipo `item_*` ✓
- `checklist_progress` usa ICU-escaped `'{done}/{total}'` em EN e PT-BR → client-side `.replace()` funciona corretamente ✓
- Dismiss persiste em localStorage; re-check no mount via useEffect ✓

### DashboardOverview.tsx
- `showInvitesAtTop` é mutuamente exclusivo com a posição padrão dos invites — sem risco de renderização dupla ✓
- `pendingCampaignJoin` recebe `sessionId` corretamente (P1-01 do Grupo 1) ✓
- DM nudge: condição `campaigns.every(c => c.player_count === 0)` só avalia owned campaigns; em array vazio retorna `true` (vacuosamente) mas `hasDmCampaigns = true` exige que haja pelo menos DM membership — edge case aceitável ✓
- `OverviewPlayerSection` ordena por `active_sessions DESC` antes do slice ✓

### app/app/dashboard/page.tsx
- Remoção de `if (userRole !== "player")` no redirect de onboarding é **intencional** (JO-05): players sem wizard_completed também são redirecionados para definir seu role ✓
- Queries de checklist (`session_tokens`, `combatants`, `combat_reports`) com `head: true` corretas ✓
- `encounterCount` reutilizado em `hasUsedCombat` e `checklistStatus.hasRunCombat` sem consulta duplicada ✓

### app/app/dashboard/layout.tsx
- `isPlayerFirstCampaign = !hasDmAccess && count === 1 && !tour_completed` — strict `=== 1` intencional (first campaign only) ✓
- Queries em `Promise.all` paralelas sem dependência entre si ✓
- `new_combat`, `invite_player`, `quick_actions` existem no namespace `sidebar` de ambos os locales ✓

### messages/ — i18n completo
Todas as novas chaves verificadas em EN e PT-BR:

| Grupo de chaves | EN | PT-BR |
|---|---|---|
| `checklist_title/progress/dismiss/account/combat/invite/legendary/recap/all_complete` | ✅ | ✅ |
| `player_empty_title/desc/code_placeholder/code_submit/explore/try` | ✅ | ✅ |
| `session_live`, `session_join` | ✅ | ✅ |
| `dm_empty_title_v2/desc_v2/cta_campaign/cta_quick` | ✅ | ✅ |
| `dm_nudge_invite/desc` | ✅ | ✅ |
| `campaign_joined_success` | ✅ | ✅ |
| `players_advanced_details/fill_later/skip/skip_hint` | ✅ | ✅ |
| `role_title/subtitle/player/dm/both/*_desc/continue/save_error` | ✅ | ✅ |
| `celebration_title/subtitle` | ✅ | ✅ |
| `go_to_dashboard`, `launch_copied` | ✅ (1x cada) | ✅ (1x cada) |

---

## Resumo dos Patches do Epic (acumulado)

| ID | Arquivo | Fix |
|---|---|---|
| P1-01 | `actions.ts` | `joinCampaignDirectAction` valida sessionId |
| P1-02 | `sign-up-form.tsx` | inviteToken sem campaignId sobrevive ao email confirm |
| P1-03 | `PlayerJoinClient.tsx` | Guard `!authUserId` + sessionId no payload localStorage |
| P2-04 | `role/page.tsx` | `export const dynamic = "force-dynamic"` restaurado |
| P2-05 | `confirm/route.ts` | `context=campaign_join` → redireciona para `/app/dashboard` |
| P2-06 | `sign-up-form.tsx` + `DashboardOverview.tsx` | `pendingJoinCode` com TTL 24h + backward compat |
| P2-07 | `actions.ts` | Erro do insert de `player_characters` capturado e logado |
| P2-08 | `sign-up-form.tsx` | `selectedRole \|\| "both"` em todos os redirects |
| **P2-09** | `OnboardingWizard.tsx` | sessionStorage não bypassa mais role step para `userRole = null` |
| **P2-10** | `messages/en.json` + `messages/pt-BR.json` | Chave `go_to_dashboard` duplicada removida; PT-BR corrigida |
