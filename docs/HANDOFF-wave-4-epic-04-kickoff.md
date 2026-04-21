# Wave 4 Kickoff — Epic 04 Player-as-DM Upsell

Você está iniciando a **Wave 4** da iniciativa **Player Identity & Continuity** no PocketDM
(Next.js 15 + Supabase). Esta é a fase final do big-bang release — loop viral que converte
auth-player em auth-DM, gerando novos invites que geram novos anon players, etc.

## Leitura obrigatória (ordem)

1. **`docs/epics/player-identity/epic-04-player-as-dm-upsell.md`** — spec v3.2 completo
   (~1100 linhas, versão COMPLETA combinando 4 sub-versões a/b/c/d)
2. **`CLAUDE.md`** — regras imutáveis do projeto (Combat Parity, Resilient Reconnection,
   SRD Compliance enforced por trigger D7, SEO Canonical, RTK commands)
3. **`docs/HANDOFF-player-identity-session-4.md`** — estado geral da iniciativa
4. **`docs/glossario-ubiquo.md`** — terminologia obrigatória

## Estado atual (entrando em Wave 4)

### ✅ Completo

- **Epic 01** Identity Foundation — 100% code-complete + reviewed + fixed
- **Epic 02** Player Dashboard & Invite — 100% code-complete + 2 rounds adversarial
  review + fixes
- **Epic 03** Conversion Moments — **100% completo**:
  - Wave 3a: Stories 03-A/B/C/D/E shipped
  - 2 rounds adversarial review (pre-fix: 4🔴+10🟠+16🟡; post-fix: 5🔴+5🟠+~10🟡)
  - Clusters α/β/γ/Δ/ε com 24 fixes + 5 criticals + 9 polish items
  - Wave 3b: Stories 03-F turn-safety + 03-H E2E suite shipped
  - **392 pass + 5 skip em 37 suites, zero fail**
  - Story 03-G (admin dashboard) DEFERRED post-launch (sem baseline de volume)

### Master tip (verificar antes de começar)

Comando: `rtk git log -10 --oneline`

Último commit esperado relacionado à Wave 3: `4ba31122` (ou posterior se Cluster ε
já mergeou — `rtk grep "Cluster ε" <(rtk git log --oneline -20)` pra confirmar).

### Migrations

Última migration em master: **158** (`158_update_default_character_atomic.sql`).

**Buffer reservado para Wave 4: 160-164** (gap defensivo +10 vs outras waves como
entity-graph que pode competir por 159 simultaneamente — memória §5 do handoff).

Se entity-graph pegar 159 antes de você começar, Wave 4 começa em 160. Se não, pule
igualmente — o buffer é defensivo.

## Epic 04 — Visão Geral

**Loop viral:** depois que Epic 01-03 converte anon → auth, Epic 04 converte
auth-player → auth-DM. Cada DM novo gera invites, que geram anon players, que viram
auth-players, que viram DMs. Produto crescendo sozinho.

**Escopo COMPLETO (Dani aprovou 2026-04-19):** combina 4 sub-versões originais:
- (a) Discovery / unlock DM (CTA contextual "Virar DM")
- (b) Onboarding DM (tour + templates)
- (c) Kit DM pre-gerado (starter encounters, NPCs, campanha-tutorial)
- (d) Viral cross-invite (novo DM convida ex-companheiros de mesa)

**Contexto surpreendente:** a criação de campanha JÁ É FREE e não-gated. `users.role`
já tem `'player' | 'dm' | 'both'`, default `'both'`. Este épico NÃO é sobre desbloquear
permissão — é sobre **discovery + activation + retention + viral**.

### Áreas

- **Área 1** — Dashboard CTA "Virar DM" (Stories 04-E)
- **Área 2** — Session counting + trigger lógica (Stories 04-B)
- **Área 3** — Tour de DM + role flip (Stories 04-F)
- **Área 4** — Starter kit templates (Stories 04-C, 04-G)
- **Área 5** — Viral past companions (Stories 04-D, 04-H)
- **Área 6** — Analytics funnel player→DM (Story 04-I)

### Stories (DAG resumido)

```
Story 04-A: Migrations 160-164 + types update [BLOQUEIA TODAS]
Story 04-A4: past_companions correctness tests (pós 04-A)

Sprint 1 (fundação, pós 04-A):
├─ 04-B Session counting lib + hot-path fallback (Área 2)
├─ 04-C Template seed + clone_campaign_from_template RPC (Área 4) [F1, F5, F9, F-BONUS]
└─ 04-D Past companions function + bulk invite endpoint (Área 5)
   (04-B, 04-C, 04-D são PARALELOS)

Sprint 2:
├─ 04-E BecomeDmCta + dashboard integration (Área 1) — depende de 04-B + Epic 02/03
├─ 04-F BecomeDmWizard + role flip broadcast + DmTourProvider (Área 3) — depende de 04-E, consome 04-C
├─ 04-G TemplateGallery + TemplateDetailModal UI (Área 4 UI) — depende de 04-C, 04-F
└─ 04-K i18n dmUpsell namespace + Paige copy review (paralelo a E-J)

Sprint 3:
├─ 04-H InvitePastCompanions + tab em InvitePlayerDialog (Área 5 UI) — depende de 04-D, 04-F
├─ 04-I Analytics + MetricsDashboard section + admin route (Área 6)
└─ 04-J E2E Playwright suite completa
```

**Estimativa:** 35-45 dias úteis (maior épico da iniciativa). Flag como risco mais alto —
última carta é cortar Área 4 (templates) ou 5 (viral) se apertar o deadline.

## Decisões de arquitetura travadas (não reverter sem review)

- **D1:** "Virar DM" é discovery + role flip, NÃO gate removal (permissão já existe)
- **D2:** Trigger conservador: 2 sessões jogadas antes de mostrar CTA
- **D3:** Templates são curados pelo admin (Dani), NÃO geração LLM
- **D4:** Viral loop reusa `InvitePlayerDialog` + `campaign_invites` — NÃO reinventa
- **D5:** DM Onboarding opcional + interruptível (botão "Pular tour")
- **D6:** Sem paywall, sem gates de subscription neste épico
- **D7:** SRD compliance enforced por **TRIGGER `validate_template_monsters_srd`**,
  NÃO por CHECK constraint (CHECK expressions Postgres não suportam subqueries cross-table)
- **D8:** `users.share_past_companions` opt-out (privacy de relacionamentos)
- **D9:** Role flip broadcast em canal `user:{userId}` (NÃO em `campaign:*` ou `session:*`);
  preserva `session_token_id` na reconexão
- **D10:** Matview refresh via **pg_cron** (DEFAULT), trigger-based refresh foi
  descartado (race com writes em campanhas ativas)

## Migrations planejadas (Sprint 1 — Story 04-A)

| Num | Conteúdo | Notas |
|---|---|---|
| 160 | `v_player_sessions_played` matview + pg_cron + wrapper view (`security_invoker=true`) | F29 security_invoker obrigatório em PG15+ |
| 161 | `user_onboarding_dm` columns + trigger idempotente + `share_past_companions` column | D8 privacy opt-out |
| 162 | `campaign_templates` tables + trigger D7 SRD validation + RLS no-delete | D7 + F1/F5/F9 |
| 163 | Seed starter templates (3-5 templates curados por Dani+Paige) | D3 — Paige revisa copy antes de seed |
| 164 | `past_companions` `get_past_companions()` SECURITY DEFINER function | Restringido a `auth.uid()` |

## Dependências de entrada (do Epic 01-03)

- `users.default_character_id`, `users.last_session_at` (Epic 01 enrichment)
- `player_characters.user_id` preservado no anon→auth upgrade (Epic 01 F12)
- Dashboard player enriquecido (Epic 02 — base visual para CTA)
- `CharacterPickerModal`, `AuthModal` (Epic 02)
- Analytics stack consolidada (Epic 03 — namespace colon-style, agora `dm_upsell:*`)
- Padrão `MetricsDashboard` (Epic 03 — Story 04-I adiciona SEÇÃO, não tab — F7)
- Dismissal store (Epic 03 — reutilizar pra dismissal do CTA "Virar DM")

## Regras CLAUDE.md — aplicação neste épico

- **Combat Parity:** CTA só pra auth (não guest, não anon). Nenhuma mudança em
  experiência de combate — áreas tocam dashboard + wizards + admin, não combate.
- **Resilient Reconnection:** role flip + tour NÃO invalidam sessão. `session_token_id`
  preservado. Broadcast `role_updated` em `user:{userId}` (D9).
- **SRD Compliance:** templates usam só monstros SRD (whitelist `data/srd/srd-monster-whitelist.json`
  — singular, F23). Trigger `validate_template_monsters_srd` (D7) enforça em runtime.
  Narrativas originais. ZERO livros WotC não-SRD.
- **SEO Canonical:** `/app/admin/dm-upsell-funnel` com `noindex` (match layout
  `/app/admin/*`). Nenhuma rota pública nova.

## Verificações iniciais (roda ANTES de escrever código)

```bash
rtk git log -10 --oneline               # confirma master tip (último commit Wave 3 deve aparecer)
rtk git status --short                  # confirma estado workspace
rtk npm test -- tests/conversion/ tests/guest/ tests/auth/ tests/player-identity/ tests/invite/ tests/dashboard/ tests/character/ tests/identity/ tests/player/
                                         # deve mostrar ~392+ pass, zero fail
rtk tsc --noEmit                        # deve estar clean (4 errors em .next/types/validator.ts são pre-existing SEO Epic A — NÃO-bloqueantes)
ls supabase/migrations/ | tail -8       # confirma 158 é último player-identity (próximo livre 160 buffer)
```

Se algo falhar, **reporte antes de escrever código novo**.

## Próximo passo — pergunta pra mim (Dani)

**NÃO assuma ordem.** Pergunte primeiro qual fase atacar:

**Opção 1 — Sprint 1 em paralelo (3-4 agents):**
- Story 04-A migrations (SEQUENCIAL, caminho crítico) — depois disso:
- Story 04-B + 04-C + 04-D em paralelo via worktrees (fundação)

**Opção 2 — Monolítico por story** (mais lento mas menor risco de merge conflict)

**Opção 3 — Só 04-A + 04-A4 agora**, valida migrations em staging, depois retoma

## Padrões estabelecidos nas Waves anteriores

- Worktree isolation (`isolation: "worktree"`) pra stories paralelas
- Cluster-based fix dispatch pós-review (áreas coesas, não 1-per-finding)
- Adversarial re-review pós-shipment — **sempre** pega issues novos (Wave 3a:
  re-review achou 5🔴 que primeiro round não detectou)
- Commit `--only <paths explícitos>` — Dani trabalha em paralelo, evite `git add .`
- Buffer zones migrations — gap de 10 entre epics
- Teste em **jest** (NÃO vitest), RTL, jest globals sem import
- E2E em **Playwright** (`e2e/conversion/` é padrão pós Epic 03)
- i18n via **next-intl** (flat keys em `messages/{en,pt-BR}.json`) — `t.rich()` pra
  marcações `<em>`
- Discriminated unions pra Result em server actions:
  `{ ok: true, ... } | { ok: false, code, retryable, message }`
- SECURITY DEFINER functions com `SET search_path = pg_catalog, public, pg_temp` +
  REVOKE FROM PUBLIC + GRANT TO authenticated explícito

## Contatos (Party Mode personas)

- 📋 John (PM) — prioridades, scope
- 🏗️ Winston (Architect) — DB, RLS, triggers, migrations, security
- 💻 Amelia (Dev) — implementação, tests, integration
- 🎨 Sally (UX) — componentes UI, mockups
- 📚 Paige (Tech Writer) — copy, glossário, i18n
- 🧪 Quinn (QA) — testing contracts, E2E, regression guards
- 🏃 Bob (SM) — sprint planning, DAGs
- 🚀 Barry (Quick Flow) — specs pequenos, refactors

---

**Quando estiver pronto, comece com:**

> Li `docs/HANDOFF-wave-4-epic-04-kickoff.md`. Estado: Epic 01+02+03 completos e
> deployed. 392 pass em 37 suites. Master tip `<SHA>`. Migrations próxima livre 160
> (buffer Epic 04).
>
> Rodei verificações §inicial. Resultado: [✅ clean / ⚠️ X tests failing / etc].
>
> Próxima prioridade sugerida: Sprint 1 Story 04-A (migrations 160-164 — caminho
> crítico, bloqueia todas outras).
>
> Quer que eu ataque 04-A solo ou já dispatch 04-A + preparação de worktrees pra
> 04-B/C/D em paralelo?

**Sempre pergunte. Não assuma.** 🎲
