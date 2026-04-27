# Sprint 3 Handoff + Followup Prompt — Next Session

**Generated:** 2026-04-27 (final session of Sprint 3 Wave 2)
**Master HEAD:** `56ce1d98` (Sprint 3 dev work all merged)
**Open PR:** #79 (prod-deploy bundle, P0 — read first)
**Open PR:** #69 (migration 185 file in repo, hold until #79 applied)

---

## Use this prompt

Copy the bloco abaixo entre os 2 separadores `---` e cola como primeira mensagem em uma nova janela do Claude Code no repo `c:\Projetos Daniel\projeto-rpg`. Sessão nova assume o estado consolidado em 2026-04-27 fim do dia (Sprint 3 dev complete · P0 prod-deploy ação pendente).

---

## Prompt (copiar tudo abaixo deste separador)

---

Você está assumindo a sessão de fechamento da **Sprint 3 (Wave 2 — Player HQ Redesign V2)** do projeto **Pocket DM** (Next.js / TypeScript / Supabase / Tailwind / Playwright).

A Sprint 3 dev está **100% mergeada em master**. O que falta é:
1. **Aplicar migrations 184 + 185 ao Supabase em produção** (P0 — sem isso o site quebra na próxima deploy).
2. **Mergear PR #69** depois que #79 aplicar via Dashboard.
3. **Cleanup mínimo** (worktree órfão).

Não há mais código a escrever. Sua sessão é puro deploy + monitor.

---

## Estado de master @ `56ce1d98` (2026-04-27)

```
56ce1d98  B2b/B2c/B2d wrappers consolidated (Arsenal + Diário + Mapa) (#78)
2a45c637  B2a HeroiTab wraps the 8 Player HQ sections (#74)
bf3bf7d6  B6 E2E suite — Gate Fase B topology coverage (#67)
e939ac9e  tech debt sweep — substring traps + spec relocation + dead i18n (#64)
bf8e8279  A4 fill HD + CD chips from migration #58 schema (#68)  ⚠️ depends on migration 184
c6fbd9ee  B5 keyboard shortcuts 1/2/3/4 + ? help overlay (#66)
1271abae  B3 deep-link back-compat redirects (#63)
2caf7df3  B1 PlayerHqShell V2 4-tab spine (#62)
ae1687d5  B4 usePlayerHqTabState hook with 24h TTL (#65)
8e70fed4  Sprint 3 Wave 2 kickoff prompt (#61)
```

**11 PRs Sprint 3 mergeados.** Todas as reviews 3-reviewer adversariais (Blind Hunter + Edge Case Hunter + Acceptance Auditor) feitas; 7 PRs receberam fixes pós-review.

**1 PR aberto pré-existente fora do escopo Sprint 3:**
- **#59** (`feat/estabilidade-combate`) — Sprint paralela de combat. **Não tocar** — Dani deferiu pra depois.

**2 PRs abertos da Sprint 3 (esta sessão):**
- **#69** — Migration 185 SQL file (Winston APPROVE-WITH-FOLLOWUP). Hold até #79 aplicar.
- **#79** — Prod-deploy bundle (P0). **MERGE PRIMEIRO + DANI APLICA VIA DASHBOARD.**

---

## ⚠️ AÇÃO P0 — Antes de qualquer outra coisa

**Bug encontrado nesta sessão:** `useCharacterStatus.ts` (mergeado em #68) faz `.select(... hit_dice, class_resources)` em `player_characters`. **Essas colunas não existem no DB live** (verificado via supabase-js dry-run em `mdcmjpcjkqgyxvhweoqs.supabase.co` — PostgREST retorna `42703 column does not exist`). Migration 184 que adiciona as colunas foi **committada em PR #58 (Sprint 2) mas nunca aplicada via Dashboard**.

**Risco:** próxima deploy do Vercel a partir de master → todo Player HQ load quebra com erro 500.

**Solução pronta:** PR #79 contém o bundle SQL pronto pra aplicar via Supabase Dashboard.

### Passo a passo (você + Dani)

1. **Você merge #79** com `--squash --admin` (PR é docs/SQL only, sem código runtime — safe).
2. **Você pede ao Dani** abrir Supabase Dashboard → SQL Editor → projeto `mdcmjpcjkqgyxvhweoqs`.
3. **Dani roda 3 SQLs em sequência** do `.claude/prod-deploy/sprint-3-bundle/`:
   - `00_sanity.sql` → confirma `hit_dice_exists = false`
   - `01_apply.sql` → aplica 184 + 185 (transação atômica idempotente)
   - `02_verify.sql` → confirma colunas + constraints + rows backfilled
4. **Você merge #69** (`gh pr merge 69 --squash --delete-branch`) → master agora reflete o estado do DB.

Se Dani reportar erro em qualquer step, leia `docs/supabase-migration-runner.md` §"Common failure modes" antes de tentar fix forward.

---

## Contexto absorvido nesta sessão (você precisa saber)

### Decisões importantes da Sprint 3

1. **Vocabulário travado**: "Mestre" nunca "DM" em UI/i18n. Capitalização correta exigida (ex: "Do Mestre" não "do mestre"). PR #72 review pegou drift no pt-BR.
2. **HP tier labels EN nos 2 locales** (`FULL/LIGHT/MODERATE/HEAVY/CRITICAL`). Nunca traduzir.
3. **4 tabs canônicas**: Herói / Arsenal / Diário / Mapa. PRD §28-29 trava nomenclatura.
4. **Combat Parity Rule** (CLAUDE.md regra absoluta): toda mudança em surface de combate exige cobertura nos 3 modos (Guest `/try` + Anon `/join` + Auth `/invite`). Use `<!-- parity-intent -->` block ou label `parity-exempt` pra casos genuínos N/A. Veja `scripts/ci/parity-check.mjs` pra heurística.
5. **PostCombatBanner dormant**: A6 component existe (`components/player-hq/v2/PostCombatBanner.tsx`) + hook (`lib/hooks/usePostCombatState.ts`), mas mount em HeroiTab foi **deferido pra sprint Estabilidade Combate** (próxima sprint). Não monte. Há TODO comment no [HeroiTab.tsx](components/player-hq/v2/HeroiTab.tsx).
6. **Migration 186 followup**: Winston review do #69 recomenda option (a) — `is_primary BOOLEAN` em `character_resource_trackers` + partial unique index + sync trigger. Sprint 7 owns. Não bloqueia A4.

### Pattern que esta sessão estabeleceu (esteja ciente)

**Supabase migrations** (CRÍTICO — leia antes de fazer qualquer migration):
- Doc: [docs/supabase-migration-runner.md](docs/supabase-migration-runner.md) (criado nesta sessão).
- Resumo: NÃO usamos `supabase db push`, GitHub Actions, ou qualquer auto-deploy. Migrations vão pra repo via `supabase/migrations/NNN_*.sql` em PR. Aplicação é **manual via Supabase Dashboard SQL Editor por Dani**, usando bundle staged em `.claude/prod-deploy/<bundle-name>/` que o agente prepara.
- Toda PR que adiciona migration deve PARELHAR um bundle. Senão acontece o que aconteceu nesta sprint: PR mergeia, código lê coluna nova, DB não tem, prod quebra.
- Quick smoke test que todo agent deve rodar antes de SELECT de coluna nova:
  ```ts
  const { error } = await s.from("table").select("new_col").limit(1);
  if (error?.code === "42703") console.log("Migration not applied yet");
  ```

**Permissions liberadas globalmente** (`.claude/settings.local.json`):
- ~70 regras `Bash(rtk:*)`, `Bash(git status:*)`, `Bash(gh pr:*)`, etc. Você pode rodar tudo sem prompt.
- Deny explícito: `git push --force` (sem lease), `git reset --hard:*`, `git branch -D:*`, `git checkout --:*`. Esses ainda pedem confirmação — preserve a regra.

**Adversarial 3-reviewer review é default pra features não-triviais** (memory `feedback_adversarial_review_default.md`):
- Blind Hunter (sem contexto, lê código fresh) + Edge Case Hunter (caminha branches) + Acceptance Auditor (mapeia AC line-by-line) por PR.
- 1 agent por PR (não 3) consolidando perspectivas. Prompts ~500-800 palavras.
- Aplique sempre que abrir PR significativo (não só bugfix de 1 linha).

**Stacked PRs com squash merge é frágil**:
- Quando o pai merge via squash, PRs filhos AUTO-FECHAM (GitHub deleta a base branch). Os filhos viram CONFLICTING.
- Solução desta sprint: rebased + force-pushed cada filho + criou PR novo com `master` como base. PRs antigos fecharam como "Superseded by #X".
- **Padrão pra próxima vez**: planeje merge order pra evitar stacking quando possível. Se não der, abra branches filhos com `master` como base e rebase manualmente após cada parent merge.

### Worktree pendente

`.claude/worktrees/sprint-3-track-a/` falhou cleanup (Permission denied — algum arquivo aberto). Você pode rodar:
```bash
rtk git worktree remove .claude/worktrees/sprint-3-track-a --force
```
Se ainda falhar, é seguro deletar manual via PowerShell (a branch já foi deletada, é só lixo no FS).

---

## O que NÃO fazer

- ❌ Tocar em `feat/estabilidade-combate` ou qualquer arquivo em `components/combat/` ou `lib/combat/`. Dani deferiu — sprint própria.
- ❌ Mergear PR #69 ANTES de Dani aplicar #79 via Dashboard. A ordem importa.
- ❌ Usar `git push --force` (sem `--force-with-lease`). Bloqueado em settings.
- ❌ Aplicar migration 184/185 via algum método não documentado. Use o Dashboard. Pattern é canônico (ver doc).
- ❌ Tentar instalar Supabase CLI / Docker via npm/winget durante a sessão pra "ajudar". Pattern decidido: Dashboard. Não invente.
- ❌ Mergear nada que tenha sido revisado SEM rodar os fixes que o reviewer apontou. Esta sessão pegou drift que custou rebases — não acumule.
- ❌ Mexer em `_bmad-output/estabilidade-combate/*` — sprint do Dani, fora do escopo.

---

## O que ESTÁ pronto e não precisa toque

- Sprint 3 dev work (11 PRs em master)
- Prop contract `PlayerHqV2TabProps` em [components/player-hq/v2/HeroiTab.tsx](components/player-hq/v2/HeroiTab.tsx) — siblings importam dali
- E2E suite Gate Fase B (6 specs novos em `e2e/features/`, `e2e/a11y/`, `e2e/journeys/sheet-mobile-390.spec.ts`) — gated por `NEXT_PUBLIC_PLAYER_HQ_V2 === "true"`
- Tech debt sweep (#64) — substring traps tightened, `e2e/guest/` → `e2e/guest-qa/` (git mv preservou history), `no_party` i18n key removida
- Vercel envs — `NEXT_PUBLIC_PLAYER_HQ_V2=true` em Preview/Dev, `false` em Production. Não mexer.

---

## Memória persistente relevante

Carregada automaticamente em `c:\Users\dani_\.claude\projects\c--Projetos-Daniel-projeto-rpg\memory\MEMORY.md`. Pontos críticos pra esta sessão:

- `feedback_executar_sem_pedir_permissao.md` — pular "quer que eu faça X?" no fim
- `feedback_adversarial_review_default.md` — 3-reviewer é default
- `feedback_mestre_nao_dm.md` — vocabulário travado
- `feedback_combate_so_visual_logica_intocada.md` — combat changes deferred
- `project_realtime_rate_limit_root_cause.md` — Supabase capacity (channel cap + CDC pool); relevante se precisar diagnosticar produção pós-deploy
- `feedback_multi_agent_commits.md` — commit+push a cada batch (<15min); confirme branch após checkout

---

## Workflow esperado nesta sessão (3-5 etapas)

1. **Check state**:
   ```bash
   rtk git status
   rtk git log master --oneline -5
   rtk gh pr list --state open --base master
   ```
   Confirme: master @ `56ce1d98`, PRs #59 (out of scope), #69 (hold), #79 (action).

2. **Merge #79** (sem dependência de Dani — é docs/SQL, safe):
   ```bash
   rtk gh pr merge 79 --squash --delete-branch --admin
   ```

3. **Pedir ao Dani aplicar via Dashboard** (mande mensagem clara com os 3 SQLs em ordem). Espere confirmação que `02_verify.sql` voltou green.

4. **Após confirmação, merge #69**:
   ```bash
   rtk gh pr merge 69 --squash --delete-branch --admin
   ```

5. **Cleanup final**:
   ```bash
   rtk git worktree remove .claude/worktrees/sprint-3-track-a --force
   rtk git fetch --prune origin
   ```
   E reporte ao Dani: "Sprint 3 closed. Master clean. 0 open Sprint 3 PRs."

---

## Próximas sprints (informativo, NÃO escopo desta sessão)

- **Estabilidade Combate** — sprint paralela, ramp owns. PR #59 + branch `feat/estabilidade-combate`. Esperando Dani retomar.
- **Wave 3** (EP-3 Ribbon Vivo + AbilityChip + Modo Combate Auto) — depende da Sprint 3 estar fully deployed (incluindo migrations). Sprint 5 do plano original.
- **Migration 186** — Winston followup pro sync trigger `character_resource_trackers ↔ class_resources.primary`. Owned by Sprint 7 (Wizard Level Up).

---

## Action imediata (cole isso direto se quer começar agora)

```bash
# 1. Confirme estado
cd "c:/Projetos Daniel/projeto-rpg"
rtk git status
rtk git log master --oneline -5
rtk gh pr list --state open --base master

# 2. Reporte:
#    "Estado confirmado: master @ 56ce1d98, 3 PRs abertos (#59 out-of-scope, #69 hold, #79 P0 action).
#     Plano: merge #79 → pedir Dani aplicar bundle via Dashboard → merge #69 → cleanup.
#     Iniciando step 1 (merge #79). OK?"
```

Se Dani estiver presente, espere "OK" antes de mergear #79. Se autônomo, pode mergear direto — bundle não tem código runtime.

---

## Fim do prompt (copiar até aqui)

---

## Notas de uso (Dani-only, não copiar)

- Esta handoff assume PR #79 ainda está aberto e #69 ainda em hold.
- Se Dani já aplicou o bundle quando esta sessão começar, pular pra step 4 (merge #69).
- Mobile-safari smoke (CSP fix #60) NÃO foi rodado nesta sprint — defer porque user pediu para não tocar combat. Próxima sprint que tocar combat deve rodar.
- Worktree cleanup: se `git worktree remove --force` falhar de novo, pode rodar `Remove-Item -Recurse -Force .claude/worktrees/sprint-3-track-a` via PowerShell. A branch local já foi deletada, é só lixo de FS.
