# Migração de Rotas: /session → /combat

> **Status:** Pronto para execução
> **Prioridade:** Alta (pós i18n migration)
> **Referência:** [docs/glossario-ubiquo.md](glossario-ubiquo.md)
> **Regra crítica:** ZERO mudança em lógica de combate. Só muda endereço.

---

## Princípio #1 — Segurança Absoluta

```
⚠️  NADA da lógica de combate muda.
⚠️  Nenhum hook, store, broadcast, realtime, reconnect, ou sync é alterado.
⚠️  Supabase queries continuam usando tabelas sessions/encounters/combatants.
⚠️  Apenas rotas (URLs) e referências a rotas mudam.
⚠️  Redirects 301 garantem que URLs antigas continuam funcionando.
```

---

## Escopo da Migração

### Rotas de página (app/)

| Rota atual | Rota nova | Tipo | Arquivos |
|---|---|---|---|
| `/app/session/[id]` | `/app/combat/[id]` | Combate ativo | `app/app/session/[id]/page.tsx`, `loading.tsx` |
| `/app/session/new` | `/app/combat/new` | Criar combate | `app/app/session/new/page.tsx` |
| `/app/sessions` | `/app/sessions` (manter redirect) | Redirect legado | `app/app/sessions/page.tsx` → já redireciona pra `/app/dashboard/combats` |

### Rotas de API

| Rota atual | Rota nova | Função |
|---|---|---|
| `/api/session/[id]/state` | `/api/combat/[id]/state` | Estado do combate (polling fallback) |
| `/api/session/[id]/dm-presence` | `/api/combat/[id]/dm-presence` | Heartbeat do DM |
| `/api/session/[id]/dm-heartbeat` | `/api/combat/[id]/dm-heartbeat` | DM heartbeat POST |
| `/api/session/[id]/player-disconnect` | `/api/combat/[id]/player-disconnect` | sendBeacon disconnect |
| `/api/session/[id]/files` | `/api/combat/[id]/files` | Upload de arquivos |

### Pasta de componentes

| Pasta atual | Pasta nova | Conteúdo |
|---|---|---|
| `components/session/` | `components/combat-session/` | CombatSessionClient, ShareSessionButton, etc. |

> **Nota:** NÃO renomear para `components/combat/` — já existe e contém EncounterSetup, CombatantRow, etc.

---

## Inventário Completo de Referências (~65 locais — auditado 2026-04-16)

### Grupo A — Referências de rota em componentes (links/push)

| # | Arquivo | Linha(s) | Referência | Ação |
|---|---|---|---|---|
| 1 | `components/dashboard/DashboardSidebar.tsx` | 220, 271 | `href="/app/session/new"` | → `/app/combat/new` |
| 2 | `components/dashboard/DashboardOverview.tsx` | 308, 459, 509, 569, 578 | `href="/app/session/new"` + `?quick=true` | → `/app/combat/new` |
| 3 | `components/dashboard/DashboardContent.tsx` | 121, 260, 377 | `href="/app/session/new"` | → `/app/combat/new` |
| 4 | `components/dashboard/GuestDataImportModal.tsx` | 67 | `router.push(/app/session/${session_id})` | → `/app/combat/${session_id}` |
| 5 | `components/dashboard/CombatsPageClient.tsx` | 33, 54 | `href="/app/session/new"` | → `/app/combat/new` |
| 6 | `components/dashboard/CombatHistoryCard.tsx` | 40 | `href=/app/session/${combat.session_id}` | → `/app/combat/${...}` |
| 7 | `components/dashboard/SavedEncounters.tsx` | 32, 48 | `href="/app/session/new"`, `href=/app/session/${enc.session_id}` | → `/app/combat/...` |
| 8 | `components/dashboard/QuickActions.tsx` | 150 | `href="/app/session/new"` | → `/app/combat/new` |
| 9 | `components/dashboard/ActivationChecklist.tsx` | 54, 56 | `href: "/app/session/new"` | → `/app/combat/new` |
| 10 | `components/dashboard/OnboardingWizard.tsx` | 531, 588, 677, 989 | `href="/app/session/new"`, `router.push(...)` | → `/app/combat/new` |
| 11 | `components/campaign/CampaignEncounterList.tsx` | 33 | `router.push(/app/session/new?campaign=...)` | → `/app/combat/new?...` |
| 12 | `components/campaign/CombatLaunchSheet.tsx` | 64, 69, 90, 96, 141, 283, 284 | Múltiplas refs a `/app/session/new` e `/app/session/${id}` | → `/app/combat/...` |
| 13 | `components/campaign/PlayerCampaignView.tsx` | 335 | `href=/app/session/${activeSession.id}` | → `/app/combat/${...}` |
| 14 | `components/campaign/SessionPlanner.tsx` | 96 | `router.push(/app/session/${result.sessionId})` | → `/app/combat/${...}` |
| ~~15~~ | ~~`components/campaign/CampaignHero.tsx`~~ | ~~162~~ | ~~DUPLICATA do #20a — path errado~~ | Ver #20a |
| 16 | `components/dice/DiceHistoryPanel.tsx` | 28 | `pathname.startsWith("/app/session")` | → `/app/combat` |
| 17 | `components/layout/NavbarWithSync.tsx` | 21, 28 | Comentário + regex `/app/session/[uuid]` | → `/app/combat` |
| 18 | `components/tour/DashboardTourProvider.tsx` | 174 | `router.push("/app/session/new")` | → `/app/combat/new` |
| 19 | `app/page.tsx` | 232, 1411 | `href="/app/session/new?quick=true"` | → `/app/combat/new?quick=true` |
| 20 | `lib/notifications/inactivity-email.ts` | 23 | `${BRAND.siteUrl}/app/session/new` | → `/app/combat/new` |

### Grupo A2 — Referência FALTANDO no inventário original (encontrada no audit)

| # | Arquivo | Linha | Referência | Ação |
|---|---|---|---|---|
| 20a | `app/app/campaigns/[id]/CampaignHero.tsx` | 162 | `router.push(/app/session/${nextPlannedSession.id})` | → `/app/combat/${...}` |

### Grupo B — Referências de API em componentes

| # | Arquivo | Referência | Ação |
|---|---|---|---|
| 21 | `components/session/SharedFileCard.tsx` | `fetch(/api/session/${...}/files)` | → `/api/combat/${...}/files` |
| 22 | `components/session/FileShareButton.tsx` | `fetch(/api/session/${sessionId}/files)` | → `/api/combat/${...}/files` |
| 23 | `components/player/PlayerJoinClient.tsx` | `fetch(/api/session/${sessionId}/state)` (×4) | → `/api/combat/${...}/state` |
| 24 | `components/player/PlayerJoinClient.tsx` | `fetch(/api/session/${sessionId}/dm-presence)` | → `/api/combat/${...}/dm-presence` |
| 25 | `components/player/PlayerJoinClient.tsx` | `fetch(/api/session/${sessionId}/player-disconnect)` | → `/api/combat/${...}/player-disconnect` |
| 26 | `lib/hooks/useCombatResilience.ts` | `fetch(/api/session/${state.session_id}/dm-heartbeat)` | → `/api/combat/${...}/dm-heartbeat` |
| 27 | `components/session/CombatSessionClient.tsx` | `router.replace(/app/session/${session_id})` | → `/app/combat/${...}` |

### Grupo C — Imports de `components/session/`

| # | Arquivo | Import | Ação |
|---|---|---|---|
| 28 | `components/guest/GuestCombatClient.tsx` | `from "@/components/session/RulesetSelector"` | → `@/components/combat-session/...` |
| 29 | `components/combat/CombatantSetupRow.tsx` | `from "@/components/session/RulesetSelector"` | → idem |
| 30 | `components/combat/CombatantRow.tsx` | `from "@/components/session/RulesetSelector"` | → idem |
| 31 | `components/combat/MonsterSearchPanel.tsx` | `from "@/components/session/RulesetSelector"` | → idem |
| 32 | `components/combat/EncounterSetup.tsx` | `from "@/components/session/ShareSessionButton"`, `RulesetSelector`, `CampaignLoader` | → idem |
| 33 | `components/presets/PresetEditor.tsx` | `from "@/components/session/RulesetSelector"` | → idem |
| 34 | `components/oracle/MonsterSearch.tsx` | `from "@/components/session/VersionBadge"` | → idem |
| 35 | `app/app/session/[id]/page.tsx` | `from "@/components/session/CombatSessionClient"` | → idem |
| 36 | `app/app/session/new/page.tsx` | `from "@/components/session/CombatSessionClient"`, `CampaignLoader` | → idem |

### Grupo D — Testes (e2e + unit)

| # | Arquivo | Referências | Ação |
|---|---|---|---|
| 37 | `e2e/i18n/language.spec.ts` | `/app/session/new`, `**/app/session/**` (×4) | → `/app/combat/...` |
| 38 | `e2e/journeys/j10-free-all-features.spec.ts` | `/app/session/new` | → `/app/combat/new` |
| 39 | `e2e/journeys/j15-comprehensive-qa-sweep.spec.ts` | `/app/session/new`, `/app/session/nonexistent-uuid` (×6) | → `/app/combat/...` |
| 40 | `e2e/helpers/combat.ts` | Comentário `/app/session/[id]` | → `/app/combat/[id]` |
| 41 | `e2e/helpers/session.ts` | `/app/session/new` (×2), comentários "session" | → `/app/combat/new` |
| 42 | `e2e/journeys/j3-dm-returns.spec.ts` | `a[href*="/app/session/"]` (×3) | → `/app/combat/` |
| 43 | `components/dashboard/__tests__/QuickActions.test.tsx` | `/app/session/new` (×2) | → `/app/combat/new` |
| 44 | `components/session/CombatSessionClient.test.tsx` | Mock de `ShareSessionButton` | → atualizar path do mock |
| 45 | `components/combat/EncounterSetup.test.tsx` | Mock de `RulesetSelector`, `CampaignLoader` | → atualizar path do mock |
| 46 | `components/session/RulesetSelector.test.tsx` | Mover junto com componente |
| 47 | `components/session/ShareSessionButton.test.tsx` | Mover junto com componente |
| 48 | `components/session/CampaignLoader.test.tsx` | Mover junto com componente |
| 49 | `components/guest/GuestCombatClient.test.tsx` | Mock de `RulesetSelector` | → atualizar path |
| 50 | `components/combat/CombatantSetupRow.test.tsx` (se existir) | Mock de `RulesetSelector` | → atualizar path |

### Grupo D2 — Testes e2e/combat/ (FALTANDO no inventário original)

| # | Arquivo | Referências | Ação |
|---|---|---|---|
| 51 | `e2e/combat/session-create.spec.ts` | `import { goToNewSession }`, regex `\/app\/session\/`, comentários | → atualizar imports + regex |
| 52 | `e2e/combat/turn-advance.spec.ts` | `import { dmSetupCombatSession } from "../helpers/session"` | → atualizar import path |
| 53 | `e2e/combat/adversarial-large-battle.spec.ts` | `import { dmSetupCombatSession }`, comentários "session" | → atualizar import path |
| 54 | `e2e/combat/adversarial-rapid-dm-actions.spec.ts` | `import { dmSetupCombatSession }`, comentários | → atualizar import path |
| 55 | `e2e/combat/adversarial-long-session.spec.ts` | `import { dmSetupCombatSession }`, múltiplos comentários | → atualizar import path |
| 56 | `e2e/combat/adversarial-late-join-deep.spec.ts` | `import { dmSetupCombatSession }`, comentários | → atualizar import path |
| 57 | `e2e/combat/adversarial-dm-crash-recovery.spec.ts` | `import { dmSetupCombatSession }`, sessionUrl variable, comentários | → atualizar import path |
| 58 | `e2e/combat/adversarial-network-failure.spec.ts` | `import { dmSetupCombatSession }`, comentários | → atualizar import path |
| 59 | `e2e/combat/player-view.spec.ts` | `import { dmSetupCombatSession, playerJoinCombat }` | → atualizar import path |

> **Nota:** Estes 9 testes importam de `e2e/helpers/session.ts`. Se renomearmos o helper para `e2e/helpers/combat-session.ts`, todos os imports quebram. Alternativa: manter o nome do helper e só atualizar o conteúdo interno (URLs dentro do helper).

---

## Plano de Execução (8 passos)

### Passo 1 — Criar rotas novas (cópia)
```
Copiar app/app/session/[id]/ → app/app/combat/[id]/
Copiar app/app/session/new/  → app/app/combat/new/
Copiar app/api/session/[id]/ → app/api/combat/[id]/
```
> Neste passo, AMBAS as rotas funcionam. Zero downtime.

### Passo 2 — Redirect 301 nas rotas de PÁGINA (NÃO em APIs)
```typescript
// app/app/session/[id]/page.tsx → substituir conteúdo por:
import { redirect } from "next/navigation";
export default function LegacySessionPage({ params }: { params: { id: string } }) {
  redirect(`/app/combat/${params.id}`);
}

// app/app/session/new/page.tsx → substituir conteúdo por:
import { redirect } from "next/navigation";
export default function LegacyNewSession() {
  redirect("/app/combat/new");
}
```
> URLs de página antigas continuam funcionando via redirect. Links compartilhados não quebram.

**⚠️ APIs (`/api/session/[id]/*`) — NÃO usar redirect.**
Redirects com POST/sendBeacon são unreliable (RFC 7231: POST→redirect pode virar GET).
Em vez disso: mover handler para `/api/combat/[id]/*` e DELETAR a rota antiga.
Todas as referências de fetch já terão sido atualizadas no Passo 4.

### Passo 3 — Renomear pasta de componentes
```
Mover components/session/ → components/combat-session/
```
> "combat-session" porque "combat" já existe.

### Passo 4 — Find & Replace em referências (Grupo A + B + C)
```
Buscar e substituir em todo o projeto:
  "/app/session/new"     → "/app/combat/new"
  "/app/session/${       → "/app/combat/${
  "/app/session/"        → "/app/combat/"          (em strings hardcoded)
  "/api/session/${       → "/api/combat/${
  "/api/session/"        → "/api/combat/"
  "@/components/session/ → "@/components/combat-session/
  components/session/    → components/combat-session/ (em mocks jest)
```

### Passo 5 — Atualizar testes (Grupo D)
```
Mesmas substituições do Passo 4, aplicadas nos arquivos e2e/ e __tests__/
```

### Passo 6 — Verificar build
```bash
rtk tsc --noEmit
```
> DEVE compilar sem erros. Se quebrar, é referência faltando — fix pontual.

### Passo 7 — Rodar testes
```bash
rtk vitest run
rtk playwright test
```
> Testes devem passar. Se falharem por URL, é referência faltando no Passo 5.

### Passo 8 — Smoke test manual
- [ ] Abrir `/app/combat/new` — deve mostrar tela de criar combate
- [ ] Abrir `/app/session/new` — deve redirecionar pra `/app/combat/new`
- [ ] Iniciar combate — deve funcionar normalmente, URL = `/app/combat/[uuid]`
- [ ] Abrir `/app/session/[uuid-antigo]` — deve redirecionar pra `/app/combat/[uuid]`
- [ ] Player join via `/join/[token]` — deve funcionar (usa API, não rota direta)
- [ ] Player reconnect — deve funcionar (polling usa nova API)
- [ ] DM heartbeat — deve funcionar
- [ ] sendBeacon disconnect — deve funcionar
- [ ] Guest combat (`/try`) — NÃO afetado (rota diferente)
- [ ] Compartilhar link de combate — URL nova funciona
- [ ] Link antigo compartilhado — redirect funciona

---

## O Que NÃO Muda (garantias de segurança)

| Camada | O que permanece idêntico | Motivo |
|---|---|---|
| **Tabela `sessions`** | Nome, schema, RLS | Renomear tabela seria risco desnecessário |
| **Tabela `encounters`** | Nome, schema, RLS | Idem |
| **Tabela `combatants`** | Nome, schema, RLS | Idem |
| **Supabase queries** | `.from('sessions')`, `.from('encounters')` | Queries não dependem de rota |
| **Realtime channels** | `session:{id}`, `encounter:{id}` | Channel names são internos |
| **Combat stores** | `combat-store.ts`, `guest-combat-store.ts` | Lógica intacta |
| **Combat hooks** | `useCombatActions`, `useCombatResilience`, etc. | Lógica intacta |
| **Combat sync** | `combat-sync.ts`, broadcasts | Lógica intacta |
| **Reconnection** | Toda a cadeia de fallbacks (L1-L5) | Especificação inalterada |
| **Guest combat** | `/try` route, `GuestCombatClient` | Rota separada, não afetada |
| **Player join** | `/join/[token]`, `/invite/[token]` | Rotas separadas |
| **Middleware** | Sem referência a `/app/session` | Não afetado |
| **Player identity storage** | `pocketdm:session:${sessionId}` key prefix | Key usa DB ID, não URL — NÃO renomear |
| **Service worker** | `turn-${payload.sessionId}` notification tag | Tag interna, não rota — NÃO alterar |
| **data-testid attrs** | `share-session-*`, `session-history-*`, `session-recap-*` | Não renomear agora — são IDs de teste, não URLs |
| **next.config.ts** | Sem rewrites/redirects de session | Não afetado |
| **vercel.json** | Sem config de session routes | Não afetado |
| **sitemap.ts** | Não inclui session routes | Não afetado |
| **manifest.json** | start_url: `/app/dashboard` | Não afetado |
| **playwright.config.ts** | baseURL genérica | Não afetado |

### ⚠️ ALERTA CRÍTICO — NÃO Renomear Realtime Channels

Os canais Supabase Realtime usam `session:${sessionId}` como nome:

```
lib/realtime/broadcast.ts:59        → supabase.channel(`session:${sessionId}`)
lib/realtime/use-realtime-channel.ts:57 → supabase.channel(`session:${sessionId}`)
app/api/broadcast/route.ts:147       → supabaseAdmin.channel(`session:${sessionId}`)
components/combat/EncounterSetup.tsx:181 → supabase.channel(`session:${sid}`)
components/player/PlayerJoinClient.tsx:984 → supabase.channel(`session:${sessionId}`)
```

**NÃO RENOMEAR ESTES.** Motivos:
1. DM e players DEVEM estar no MESMO canal — renomear um lado sem o outro = **combate quebrado**
2. O `sessionId` é o UUID do DB (tabela `sessions`), não a URL — funciona independente da rota
3. Event types (`session:state_sync`, `session:weather_change`, `session:ended`, `session:combat_stats`, `session:poll_results`) são contratos internos entre DM e player — renomear = **breaking change silencioso**
4. Existem **30+ referências** a esses event types em broadcast.ts, sanitize.ts, offline-queue.ts, use-realtime-channel.ts e testes
5. O custo de renomear é alto e o benefício é ZERO (usuário nunca vê channel names)

### ⚠️ ALERTA — NÃO Renomear Storage Keys

```
lib/player-identity-storage.ts:7 → STORAGE_KEY_PREFIX = "pocketdm:session:"
```

**NÃO RENOMEAR.** Se o prefixo mudar, todo player que tinha dados salvos (reconnect via localStorage/sessionStorage) perde a capacidade de reconectar sem formulário. Isso viola a Resilient Reconnection Rule.

---

## Rollback Plan

Se algo der errado após deploy:

1. **Reverter Passo 2** — restaurar `app/app/session/` com conteúdo original (não redirect)
2. **Reverter Passo 4** — as rotas novas (`/app/combat/`) simplesmente param de funcionar, mas as antigas voltam
3. **Manter rotas duplicadas** — ambas funcionam em paralelo até resolver o problema

Não precisa de migration de dados, não precisa de rollback de DB.

### Estratégia de deleção segura das APIs antigas

**NÃO deletar APIs antigas imediatamente.** Seguir este plano:

1. **Sprint N (migração):** Copiar handlers para `/api/combat/[id]/*`. Manter `/api/session/[id]/*` como **proxy** (chama a mesma função, não redirect). Atualizar todas as refs no código.
2. **Sprint N+1 (observação):** Monitorar logs por 1 semana. Se zero requests chegam nas rotas antigas → seguro deletar.
3. **Sprint N+2 (cleanup):** Deletar `app/api/session/[id]/*` quando confirmado que ninguém usa.

**Motivo:** Se deletarmos as APIs antigas e um player tiver uma tab aberta com código antigo (antes do deploy), os fetches vão falhar silenciosamente. O proxy garante que tabs antigas continuam funcionando.

---

## Mapa de Risco — O Que Pode Quebrar Combate

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Ref esquecida em componente (link aponta pra rota antiga) | Média | Baixo — redirect 301 cobre | Smoke test manual + grep final |
| Ref esquecida em fetch de API (polling/heartbeat aponta pra rota antiga) | Média | **ALTO** — API redirect pode não funcionar com POST/sendBeacon | Testar CADA endpoint API individualmente |
| Renomear channel realtime por engano | Baixa | **CRÍTICO** — combate quebra silenciosamente | Regra: NÃO TOCAR em realtime channels |
| Renomear storage key por engano | Baixa | **ALTO** — reconnect quebra | Regra: NÃO TOCAR em player-identity-storage |
| e2e test regex `/app\/session/` falha silenciosamente | Média | Baixo — só afeta CI | Atualizar regex nos testes |
| data-testid `share-session-*` quebra testes | Baixa | Baixo — não renomear testids nesta fase | Regra: NÃO renomear data-testid |
| sendBeacon para `/api/session/.../player-disconnect` não segue redirect | **Alta** | **ALTO** — player disconnect silenciosamente falha | Manter API antiga como proxy OU atualizar sendBeacon URL |
| Next.js API redirect com POST body | **Alta** | **ALTO** — dm-heartbeat POST pode perder body no redirect | Manter API antiga como proxy OU atualizar fetch URL |

### ⚠️ Risco #1 mais perigoso: API redirects com POST/sendBeacon

O browser **NÃO garante** que `sendBeacon` siga redirects. E redirects de POST requests podem virar GET (RFC 7231). Isso significa que:

- `POST /api/session/[id]/dm-heartbeat` → redirect 301 → pode virar GET e falhar
- `POST /api/session/[id]/player-disconnect` via sendBeacon → pode NÃO seguir redirect

**Solução segura:** Para APIs com POST, NÃO usar redirect. Em vez disso:
1. Copiar o handler para `/api/combat/[id]/...` (rota nova com lógica real)
2. Manter `/api/session/[id]/...` como **proxy** que chama a mesma função (não redirect)
3. Ou simplesmente atualizar TODAS as referências de fetch e remover a rota antiga

**Recomendação:** Opção 3 (atualizar refs + remover antiga) é mais limpa. Já que temos a lista completa de refs, podemos garantir que todas foram atualizadas.

---

## Checklist Pré-Execução

- [ ] Branch dedicada: `refactor/session-to-combat-routes`
- [ ] Todas as 16 chaves i18n já migradas (doc anterior)
- [ ] Build limpo antes de começar
- [ ] Testes passando antes de começar
- [ ] Grep final: `grep -r "/app/session\|/api/session" --include="*.ts" --include="*.tsx"` deve retornar ZERO (exceto redirects e testes)
- [ ] Testar sendBeacon para `/api/combat/[id]/player-disconnect` funciona
- [ ] Testar POST para `/api/combat/[id]/dm-heartbeat` funciona
- [ ] Backup mental: se qualquer coisa de combate quebrar → revert imediato
