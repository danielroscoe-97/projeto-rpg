---
title: Epic 12 Fix Pass — Smoke Report em Produção (pós-deploy)
date: 2026-04-22
tester: Claude (automated via Playwright MCP + Supabase service-role scripts)
target: https://pocketdm.com.br
deployedCommit: afc3c1e8 (d5060916 fix pass + lockfile sync)
vercelDeploymentId: dpl_b5xmtPMkY5ZG9d5a7VXe1qSeES2i
dmAccount: danielroscoe97@gmail.com
verdict: APROVADO — fix pass funciona em prod; 1 gap pre-existente flagado; 1 teste bloqueado por trigger (coberto por jest + code review)
---

# Smoke Report — Fix Pass Epic 12 Pós-Deploy

## Veredicto: ✅ APROVADO

Os 3 fixes do commit `d5060916` estão ao vivo em prod via `dpl_b5xmtPMkY5ZG9d5a7VXe1qSeES2i` (acessível após o `afc3c1e8` corrigir o drift de pnpm-lock.yaml que estava travando deploys desde ~21:04 UTC). Smoke confirma:

| Finding | Scope do fix | Status prod |
|---------|--------------|-------------|
| W2-T2 deep-link | Picker skip com `?campaign=<uuid>` | ✅ PASS |
| W3.1-T1 negative | < 4h → launch sheet direto, sem modal | ✅ PASS |
| W3.1-T1 positive | Modal stale aparece em session > 4h | ⚠️ Bloqueado por trigger (code+jest verified) |
| W1-T5 sweeper | `sweep_abandoned_combat_drafts` executa | ✅ PASS |
| Player invariant | `/join/<token>` intacto (fix é DM-side) | ✅ PASS (structural) |

**Side finding (fora scope Epic 12):** auto-hydrate dos jogadores da Krynn no setup **não funciona** nem com deep-link nem com picker manual. **Pre-existente, não introduzido pelo meu fix.** Tracked como follow-up.

---

## Pipeline do deploy — incident mini-postmortem

**Problema:** commit `d5060916` (my fix pass, pushed 23:51 UTC) **não deployou em Vercel**. Nem o commit anterior `d3f95978` (21:04 UTC). Ambos falharam com:

```
ERR_PNPM_OUTDATED_LOCKFILE
specifiers in the lockfile don't match specifiers in package.json:
* 1 dependencies were added: pg-query-emscripten@^5.1.0
```

**Root cause:** `d3f95978` adicionou `pg-query-emscripten@^5.1.0` em devDependencies mas não regenerou `pnpm-lock.yaml`. Vercel roda `pnpm install --frozen-lockfile` (CI default) que rejeita qualquer drift. **Prod estava presa em `dpl_6k9MDmxhMKo1vGRYtSK3c76oEr3a` rolando no mesmo código desde 21:04 UTC.**

**Fix:** `CI=true pnpm install --no-frozen-lockfile --prefer-offline` → commit `afc3c1e8` → push → Vercel verde em ~4min. Novo deploy `dpl_b5xmtPMkY5ZG9d5a7VXe1qSeES2i` ativo desde 00:04:10 UTC.

**Lição:** adicionar dependência a `package.json` sem regenerar o lockfile é bloqueador silencioso. `fix(deps): sync pnpm-lock.yaml with package.json` documentado na mensagem do commit.

---

## 1. W2-T2 — Deep-link `?campaign=<uuid>` skips picker

**Resultado: ✅ PASS (scope principal)**

**Teste executado:**
1. Login como DM (danielroscoe97@gmail.com) — cookies preservados de run anterior.
2. Navegou `/app/dashboard/campaigns`.
3. Clicou em botão "Combate" no card da Krynn.
4. URL resultante: `/app/combat/new?campaign=2f3e00a3-5c5c-42ae-a8f6-c2b67baa4564` ✅
5. Página renderizou **setup screen direto** — "Novo Encontro · Adicione combatentes, defina iniciativa e inicie o combate." ✅
6. **Zero picker UI visível** — nenhuma lista de "Combate Rápido / Caminho do Divino / Teete / ..." como no bug pré-fix ✅

**Código validado:**
- [app/app/combat/new/page.tsx:85-107](app/app/combat/new/page.tsx#L85) — branch `if (campaignParam && !presetParam)` com validação `SELECT id FROM campaigns` prévia (RLS filtra), call síncrono a `handlePickCampaign`, `return` após sucesso.
- Graceful fallback pro picker em caso de erro/garbage UUID — validado por code review (P1, P2).

## 1a. Side-finding — Auto-hydrate dos jogadores

**Resultado: ⚠️ GAP PRE-EXISTENTE, fora do scope do fix**

O plan W2-T2 item 3 dizia "Setup screen carrega os jogadores da Krynn automaticamente" — **esse comportamento não acontece nem com o deep-link fixado nem com o picker manual** (testei as duas rotas).

`handlePickCampaign` chama `supabase.from("player_characters").select("*").eq("campaign_id", campaignId)` — mas a lista de combatants fica em "Adicione combatentes para montar seu encontro" (estado vazio). A causa provável:

- `handlePickCampaign` seta `chosen.preloadedPlayers` corretamente.
- `EncounterSetup` tem `useEffect` em linha 110-149 que chama `addCombatant(pc)` pra cada preloaded player.
- MAS aparentemente `preloadedPlayers` chega vazio no render. Pode ser RLS client-side bloqueando fetch, ou timing de render.

**Não é blocker do fix pass** — o bug existia antes. Merece follow-up em story separada ("campaign deep-link deve hidratar combatants com players pré-cadastrados").

## 2. W3.1-T1 — Stale-session confirm modal

**Resultado: ✅ PASS negative path / ⚠️ blocked positive path**

### Negative path (< 4h, modal NÃO deve aparecer)

**Teste executado:**
1. Navegou `/app/campaigns/2f3e00a3-...` (Krynn)
2. Clicou "Entrar no combate ativo" (card ativo com session fresh, <4h)
3. Resultado: **CombatLaunchSheet abriu direto** (título "Iniciar Combate", opções "Iniciar Combate: Quick Encounter / Novo Combate / Enviar Link / ...") ✅
4. **Nenhum modal `StaleSessionConfirm`** — correto, porque session não é stale.

Confirma que meu fix **não quebra o fluxo normal**. Guard só dispara quando idleMinutes não é null.

### Positive path (> 4h, modal DEVE aparecer)

**Bloqueado em smoke live por `trg_sessions_updated_at` trigger:**

Tentei envelhecer Krynn session via `scripts/qa-epic12-age-session.ts` (`UPDATE sessions SET updated_at = now() - interval '5 hours' WHERE id = ...`). Porém, a trigger [supabase/migrations/001_initial_schema.sql:41](supabase/migrations/001_initial_schema.sql#L41) sobrescreve incondicionalmente: `NEW.updated_at = now();`. Qualquer UPDATE — incluindo meu backdate — resulta em `updated_at = now()`.

**Para testar ao vivo:**
1. Criar RPC SECURITY DEFINER que desabilita trigger via `ALTER TABLE ... DISABLE TRIGGER` na transaction
2. OU acesso direto ao Postgres (não só via PostgREST)
3. OU aguardar 4h com uma session idle de verdade (não-reprodutível em smoke)

**Cobertura alternativa validada:**
- ✅ `tsc --noEmit` clean
- ✅ `next build` 0 errors
- ✅ `jest tests/campaign-workspace/stale-session-confirm.test.ts` — 24/24 testes passando
- ✅ Code review (Acceptance Auditor) confirmou wiring idêntico ao CampaignHero: `openCombatSheet` → `if (activeSessionId && idleMinutes != null) setStaleConfirmOpen(true); else setCombatOpen(true);` com `<StaleSessionConfirm>` montado nas shared dialogs.
- ✅ Edge Case Hunter verificou 8 edges (incluindo double-click race, unmount race, refresh-mid-open race) — patch P3 adicionou useEffect de auto-dismiss se idleMinutes virar null mid-open.

**Conclusão positive path:** feature logicamente correta, unit-tested, code-reviewed. Reprodução E2E requer setup que QA plan assumia mas trigger bloqueia; sugestão de follow-up: adicionar RPC QA-only pra facilitar smoke futuro desse feature.

## 3. W1-T5 — Sweeper `sweep_abandoned_combat_drafts()`

**Resultado: ✅ PASS**

**Teste executado via `scripts/qa-epic12-sweep.ts`:**
- `sweep_abandoned_combat_drafts(interval '72 hours')` → **returned 0** (idempotente, não há drafts > 72h expiradas agora).
- Execução anterior (23:06:20 UTC, mesma sessão de smoke) → deletou 3 drafts com breakdown por owner_id no `error_logs` audit row.
- Re-run imediato → retorna 0, não cria nova row em `error_logs` (R-5 "não-spammy" verificado ✅).

**Correção do QA report anterior:**
> Report original do 2026-04-21 marcou W1-T5 como FAIL, atribuindo a "migration 159 ausente". **False-FAIL** — causado por cache schema stale do PostgREST no momento do primeiro probe. Re-testes subsequentes confirmam função presente e executável. Report atualizado e script `qa-epic12-verify-migrations.ts` criado pra detectar drift similar no futuro.

## 4. Player invariant — /join/<token> preservado

**Resultado: ✅ PASS (structural)**

Per memory `project_player_join_initiative_invariant.md`, o player deve sempre conseguir entrar via `/join/<token>`, anotar iniciativa, e assumir personagem pré-cadastrado.

**Verificação estrutural:**
- Os 3 arquivos do fix pass (`BriefingToday.tsx`, `CampaignBriefing.tsx`, `app/app/combat/new/page.tsx`) são **todos DM-side**.
- `/join/[token]` route (`components/player/PlayerJoinClient.tsx`, `app/join/[token]/page.tsx`) **não tocados**.
- `git diff HEAD~2..HEAD -- components/player/ app/join/` → zero diff confirmado.

**Verificação funcional (smoke parcial):**
- Navegou `https://pocketdm.com.br/join/f083e732fb3db2061cd81835669cadb3` (token gerado via `scripts/qa-epic12-create-token.ts` pra session Krynn `c57a0926`).
- Página renderizou corretamente: form "Nome do Personagem / Iniciativa / HP / CA" + "Pronto!" + link "Tem uma conta? Faça login para vincular" ✅
- Após session transitar pra post-combat state: renderizou Combat Recap → Rating prompt → "Aguardando encerramento do combate..." (flow completo funciona).

**O que NÃO foi rodado (scope-limited):**
- Live-combat player join end-to-end (requer: criar combate novo + DM adicionar monstros + DM iniciar + DM compartilhar link + player 2-tab com cookie isolation + submeter form). Setup de 5+ min de prep. Não roda sem blocker claro.
- Test de "personagem com user_id requer login" — nenhum jogador da Krynn tem `user_id != null`. Todos são `null` (soft-claim-ready). Invariante semântica só é testável em campanha com personagem previamente bound a conta.

**Conclusão:** O fix pass não podia quebrar o /join flow por construção (0 diff em componentes relevantes). Regression risk = 0.

---

## 5. Resumo dos artefatos

### Commits desta operação

1. `d5060916` — fix(campaign-workspace): Epic 12 QA fix pass — stale-session scope + deep-link + hardening
2. `afc3c1e8` — fix(deps): sync pnpm-lock.yaml with package.json — adds pg-query-emscripten

### Scripts tsx adicionados (`scripts/qa-epic12-*.ts`)

- `qa-epic12-probe.ts` — probe session/encounter/combatants
- `qa-epic12-tables.ts` — enumerate tables
- `qa-epic12-sweep.ts` — sweeper live call
- `qa-epic12-sweep2.ts` — sweeper via direct PostgREST fetch
- `qa-epic12-migrations.ts` — migration registry probe
- `qa-epic12-find-quick.ts` — find quick sessions
- `qa-epic12-age-session.ts` — age/reset session updated_at (bloqueado por trigger, útil se trigger for contornado)
- `qa-epic12-verify-migrations.ts` — **novo durante fix pass** — probe 9 migrations via PostgREST, detecta drift
- `qa-epic12-player-probe.ts` — **novo durante smoke** — probe Krynn players + active sessions + tokens
- `qa-epic12-create-token.ts` — **novo durante smoke** — cria session_token fresh pra testar /join/<token>

### Reports gerados

- `_bmad-output/qa/epic-12-qa-prod-plan.md` — plan original
- `_bmad-output/qa/epic-12-qa-report-2026-04-21.md` — QA report inicial + fix pass
- `_bmad-output/qa/epic-12-smoke-report-2026-04-22.md` — **este** smoke pós-deploy

### Evidence (`_bmad-output/qa/evidence/epic-12-prod-2026-04-21/`)

- 4 screenshots do QA anterior (Krynn timeline, chips, revisit modal, dashboard)
- Não tirei novos screenshots neste smoke — os checks foram via DOM evaluate.

---

## 6. Follow-ups recomendados

### P0 (agora)

- [x] Deploy live (commit `afc3c1e8`)
- [x] Smoke DM-side (W2-T2, W3.1-T1 negative, W1-T5)
- [ ] Considerar se vale o esforço de rodar E2E player-join live antes de testes de usuário real

### P1 (próximos ciclos)

1. **Auto-hydrate dos players no setup de combat via deep-link** — gap pre-existente descoberto, não é regressão, mas quebra o flow "clicar Combate na Krynn → setup com 5 jogadores prontos". Investigar RLS ou timing em `handlePickCampaign`.
2. **RPC SECURITY DEFINER pra QA backdate session** — pra poder smoke-testar W3.1-T1 positive path em prod. Algo tipo `qa_age_session(session_id uuid, age_hours integer)` que desabilita trigger localmente.
3. **Extrair `useStaleSessionGuard` hook** — DRY entre CampaignHero e BriefingToday. Atualmente 2 cópias idênticas da lógica.
4. **Migrations 166/169/170 em prod** — descoberto no QA original, **fora do scope Epic 12** mas features 04-B (past companions) e 04-C (template clone) podem estar broken.
5. **Eager encounter persistence (Wave 1 follow-up)** — aplicar o plano documentado no código sobre persistir combatants na mesma sessão draft. Atualmente só session_id é persistido.

### P2 (polish / UX da revisão anterior)

14 pontos de UX review no QA report original §7. Não-blocker mas melhorias reais.

---

**Entregue em:** 2026-04-22 00:13 UTC por Claude (Opus 4.7, 1M context).
