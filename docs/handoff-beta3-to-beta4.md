# Handoff — Beta 3 → Beta 4

**Data:** 2026-04-17
**Contexto:** Beta 3 (DM Lucas Galupo, 16/04/2026) shipou ~50% dos feedbacks. Próximo beta test é **na semana que vem** e o restante **TEM que subir antes**.
**Master atual:** `8d3d2dc` | prod deployado | migrations 136/137/138 aplicadas

---

## 🎯 Missão do próximo agente

Shipar **todos** os feedbacks/bugs/melhorias pendentes do beta test 3 antes do próximo beta test (semana que vem). Todas as specs estão prontas; foco é implementação + review + merge + deploy.

---

## 📚 Leia ANTES de começar (ordem importa)

Cada doc é auto-suficiente. Lê todos antes de codar.

1. **[docs/beta-test-session-3-2026-04-16.md](beta-test-session-3-2026-04-16.md)** — Feedback bruto da sessão
2. **[docs/spike-beta-test-3-2026-04-17.md](spike-beta-test-3-2026-04-17.md)** — Spike arquitetural v2 (9 findings, 3 P0 já shippados, 4 P2 pendentes)
3. **[docs/epic-2-combat-ux-hotfixes.md](epic-2-combat-ux-hotfixes.md)** — UX spec v2 (14 hotfixes, H1/H2/H3/H4/H7 shippados, H5/H6/H8/H9/H10/H11/H12/H13/H14 pendentes)
4. **[docs/sprint-plan-beta3-remediation.md](sprint-plan-beta3-remediation.md)** — Sprint plan completo (Sprints 1-2 feitos; 3-4-5 pendentes)
5. **[docs/spec-feedback-retroactive-voting.md](spec-feedback-retroactive-voting.md)** — Votação (já shippada, referência)
6. **[docs/spec-polymorph-wildshape.md](spec-polymorph-wildshape.md)** — Polymorph + Wild Shape (~16h, migration 139, feature flag `ff_transformation_v1`)
7. **[docs/spec-favorites.md](spec-favorites.md)** — Favoritos (~12h, reusa pattern de `audio_favorites` migration 135)
8. **[docs/content-adds-beta3-items.md](content-adds-beta3-items.md)** — Rod/Fragmento/Braceletes já traduzidos + bug sistêmico descoberto
9. **[docs/code-review-final-2026-04-17.md](code-review-final-2026-04-17.md)** — Review end-to-end do que já subiu (pontos de atenção)
10. **[CLAUDE.md](../CLAUDE.md)** — Regras IMUTÁVEIS:
   - Combat Parity Rule (Guest/Anon/Auth em toda UI)
   - Resilient Reconnection (Zero-Drop Guarantee)
   - SRD Content Compliance (nenhum conteúdo não-SRD em páginas públicas)

Reviews adversariais de cada track shippado (pra entender padrões de qualidade esperados):
- `docs/code-review-track-a.md` + `docs/code-review-track-b.md` + `docs/code-review-track-c.md` + `docs/code-review-track-d.md` + `docs/code-review-track-e.md` + `docs/code-review-track-f.md`
- E os `*-fixes.md` correspondentes

---

## ✅ O que JÁ subiu (não tocar novamente)

| Track | Feedback coberto | Arquivos principais | Migration |
|-------|------------------|---------------------|-----------|
| **A** | Recap persistence | `app/api/encounters/[id]/recap/`, `app/api/session/[id]/latest-recap/`, recap-payload | 136 |
| **B** | Combatant add reorder (flag OFF) | `lib/hooks/useCombatActions.ts`, `lib/realtime/broadcast.ts`, `lib/flags.ts` | — |
| **C** | Telemetry 3-tier + whitelist + Finding 3/5/7 | `PlayerJoinClient.tsx`, `MonsterGroupHeader.tsx`, `MonsterStatBlock.tsx` | 137 |
| **D** | Dialog X + stat card + VersionBadge | `components/ui/dialog.tsx`, `sheet.tsx`, `VersionBadge.tsx`, stat-card-5e.css | — |
| **E** | HP CRITICAL + 48 i18n keys | `lib/utils/hp-status.ts`, messages/*.json | — |
| **F** | Votação `/feedback/[token]` | `app/feedback/`, `app/api/feedback/`, `RecapActions.tsx` | 138 |

---

## 🚨 O que VOCÊ precisa shipar

### 🔴 SPRINT 3 — estrutural (~16h) — PRIORIDADE ALTA

#### S3.1 — HP numérico em vez de "Full/Light/Moderate" (H5)
- **Feedback:** "Full/Light/Moderate sem números — mostrar 70/XX com barra"
- **Spec:** [epic-2-combat-ux-hotfixes.md H5](epic-2-combat-ux-hotfixes.md)
- **Feature flag:** `ff_hp_thresholds_v2` (default OFF)
- **⚠️ Critical constraint:** `HpStatus` union em `lib/types/realtime.ts` é trafegada via broadcasts. **NÃO ADICIONE** `DEFEATED` ao union — use tipo derivado client-side `HpDisplayState = HpStatus | "DEFEATED"` + helper `deriveDisplayState()`. Qualquer mudança no union quebra clientes PWA cacheados.
- Novo componente `HpDisplay` com prop `revealExact` (anti-metagaming preservado)
- Breakpoints novos (100-75% Full, 74-50% Light, 49-25% Moderate, <25% Critical)

#### S3.2 — HP individual em grupo (H9)
- **Feedback:** "Vida do grupo somando HP de todas criaturas (bug)"
- **Spec:** [epic-2-combat-ux-hotfixes.md H9](epic-2-combat-ux-hotfixes.md)
- **Cross-cutting com Track C já shippado:** Track C já expôs `groupHealth{min,max,median,membersAlive,membersTotal}` em `MonsterGroupHeader.tsx` (spike Finding 3). Seu job é só renderização visual: dots/pips individuais por tier.
- **NÃO MEXER** na lógica de dados (Track C é dono).

#### S3.3 — Busca do compêndio (H6)
- **Feedback:** "Velociraptor não aparece na busca, Owlbear idem (acentos)"
- **Spec:** [epic-2-combat-ux-hotfixes.md H6](epic-2-combat-ux-hotfixes.md)
- **⚠️ Critical:** Use `ignoreDiacritics: true` do Fuse.js (opção existente, [node_modules/fuse.js/dist/fuse.d.ts:299](../node_modules/fuse.js/dist/fuse.d.ts#L299)). **NÃO** use `getFn` em `Fuse.config` — não existe na API pública. Adicionar também helper `normalizeForSearch()` para filtros não-Fuse (PlayerCompendiumBrowser usa `.includes()` sem normalização).
- Threshold recalibrar 0.35 → 0.4

#### S3.4 — Remover grupo inteiro / Deletar grupo (H10)
- **Feedback:** "Tem que ter botão pra remover grupo inteiro, não um por um. Deletar grupo inteiro também."
- **Spec:** [epic-2-combat-ux-hotfixes.md H10](epic-2-combat-ux-hotfixes.md)
- **⚠️ Critical:** espelhar `handleRemoveCombatant` ([lib/hooks/useCombatActions.ts:352-400](../lib/hooks/useCombatActions.ts#L352-L400)) — loop persist + broadcast por combatant + turn_index adjust (wasCurrentTurnRemoved + removedBeforeCurrent) + state_sync + initiative reorder persist. Guest mode: store-only equivalent.
- Confirmar modal + copy dos 2 botões

#### S3.5 — Fetch orchestrator unificado (Finding 4D do spike)
- **Feedback:** 4-5 loops de polling `/api/session/[id]/state` concorrentes no beta 3 — 219 req/min no pico, 90 × 429 rate-limit em 2min
- **Spec:** [spike-beta-test-3-2026-04-17.md Finding 4D](spike-beta-test-3-2026-04-17.md)
- Consolidar todos os `fetchFullState` em um orchestrator único com fila + debounce + circuit breaker. Priority levels: `emergency` (bypass) vs `throttled` (5s).

---

### 🟡 SPRINT 4 — features + polish (~9h) — PRIORIDADE ALTA

#### S4.1 — Auto-scroll + pulse visual no turn advance (H8)
- **Feedback:** "Ao passar vez na visão do mestre tem que scrollar"
- **Spec:** [epic-2-combat-ux-hotfixes.md H8](epic-2-combat-ux-hotfixes.md)
- **⚠️ Track C já fixou o guard `data-panel-open` (Finding 5).** Seu job é o polish visual: smooth scroll + pulse highlight 1s + respect `prefers-reduced-motion`.
- Cross-cutting: `turn-advancing` CustomEvent já existe (Track C), tem listener em CombatantRow que fecha painéis. Aproveitar.

#### S4.2 — Condições custom pelo DM (H11)
- **Feedback:** "Condição ponto que o mestre escreve como se fosse um bless um toner, tipo um cbre histérico por exemplo"
- **Spec:** [epic-2-combat-ux-hotfixes.md H11](epic-2-combat-ux-hotfixes.md)
- **Feature flag:** `ff_custom_conditions_v1` (default OFF)
- DM cria condição com nome + descrição livre, aplica em combatente, remove quando quiser
- **Parity:** Guest = DM (solo play), aplica. Anon/Auth aplicam via DM.
- i18n keys já existem (prefixadas `combat.custom_condition_*` — 5 keys em pt-BR.json + en.json)

#### S4.3 — Quick actions: Dodge, Dash, Help, Disengage, Hide, Ready (H12)
- **Feedback:** "Tem que colocar também uma condição tipo um status assim que eu tô de dodge"
- **Spec:** [epic-2-combat-ux-hotfixes.md H12](epic-2-combat-ux-hotfixes.md)
- Quick-actions strip na ficha do combatente; aplica condições pré-definidas
- Dodge auto-expira no próximo turno do caster (feature do D&D)
- i18n keys já existem (`combat.action_*` + `combat.action_*_desc` — 12 keys)

#### S4.4 — Login nudge contextual (H14)
- **Feedback:** "Pede pra ele fazer o login pra poder verificar se ele tem uma flag de beta tester"
- **Spec:** [epic-2-combat-ux-hotfixes.md H14](epic-2-combat-ux-hotfixes.md)
- Prompt contextual (NÃO bloqueia) quando guest/anon abre compêndio no combate: "Faça login pra ver o compêndio completo com itens homebrew"
- **⚠️ Detection bug original:** NÃO use `authReady && authUserId` — use `!session.user.is_anonymous` ([PlayerJoinClient.tsx:415](../components/player/PlayerJoinClient.tsx#L415))
- returnUrl whitelist sanitization (anti open-redirect)

---

### 🟢 SPRINT 5 — roadmap (decisão tua sobre shipar antes do beta 4)

Alguns destes exigem decisão/validação do Dani antes. Se beta 4 for usar, shipa; se não, deixa bucket.

#### S5.1 — Polymorph + Wild Shape ✅ SPEC PRONTA
- **Feedback:** "Jogador se transformar num monstro, seja via polymorf... segunda barrinha de vida que vai começar a morrer antes..."
- **Dani confirmou:** entra em beta 4. Cobre polymorph (spell) E wild shape (druida feature).
- **Spec completa:** [docs/spec-polymorph-wildshape.md](spec-polymorph-wildshape.md)
- **Estimativa:** ~16h (não 10-12h original — wildshape overflow + 2 HP bars + parity 3-mode são complexos)
- **Plano B se apertar:** só Polymorph em B4, Wild Shape em B5 → economiza ~3h
- Migration 139 (próxima livre), feature flag `ff_transformation_v1` default OFF
- **Critical:** `combatants.monster_id` é TEXT (não UUID) desde migration 014. Spec já corrigiu.

#### S5.2 — Favoritar monstros/itens/spells/condições ✅ SPEC PRONTA
- **Feedback:** "Favoritar as fichas dos monstros... dentro do combate pra ele aparecer como um atalho"
- **Dani confirmou:** entra em beta 4.
- **Spec completa:** [docs/spec-favorites.md](spec-favorites.md)
- **Estimativa:** ~12h (não 8h — scope real inclui 4 card components + 4 browsers + 3 modos + drawer + widget público)
- **Key insight:** projeto **já tem `audio_favorites`** (migration 135) + `favorites-store.ts` com pattern idêntico (guest localStorage + auth DB + rate limit). Spec manda **copiar o padrão** em vez de reinventar.
- Limite 200/tipo (baseado em P95 real), widget público com SRD filter obrigatório
- Anon player: localStorage (efêmero), não DB
- **Cortes se apertar:** widget público + PATCH reorder → out-of-scope fallback

#### S5.3 — Richard / dice roller clicável
- **Feedback:** "O Richard não tá dando pra clicar, ele tem que dar pra clicar pra ser o D6, né?"
- **⚠️ BLOCKED:** Contexto ambíguo. Dani: identifique com o Lucas o que é "Richard" — é o ClickableRoll do dice component? É um nome de jogador? Um NPC específico? Antes de mexer, precisa clarificação.
- Spec parcial: [epic-2-combat-ux-hotfixes.md H13](epic-2-combat-ux-hotfixes.md)

#### S5.4 — Guest recap persistence (Finding 9)
- **Feedback:** Guest não salva recap em localStorage → perde se refresh
- **Spec:** [spike-beta-test-3-2026-04-17.md Finding 9](spike-beta-test-3-2026-04-17.md)
- Salvar recap em localStorage com TTL 24h

#### S5.5 — Content additions ✅ ENTREGUE (commit `b2dbdfb`, em branch `seo/sprint-4-1-core-web-vitals`)
- **Descoberta:** os 3 itens **JÁ EXISTIAM** em `data/srd/items.json` com `srd: false`. O bug era **tradução PT-BR ausente**.
- **Identificações corrigidas:**
  1. "Rod of the Pact Keeper" → 6 variantes (DMG 2014 + DMG 2024, +1/+2/+3)
  2. "Bracers of Illusionist" → TYPO. Nome correto: **"Illusionist's Bracers"** (fonte GGR, não DMG)
  3. "Astral Shards" → singular: **"Astral Shard"** (fonte TCE, não Spelljammer)
- **Arquivo alterado:** `data/srd/item-descriptions-pt.json` (+8 entradas PT-BR)
- **Doc:** [docs/content-adds-beta3-items.md](content-adds-beta3-items.md)
- **SRD Compliance:** CLEAN (`public/srd/items.json` inalterado, 0 vazamentos)

#### S5.5b — 🚨 BUG SISTÊMICO DESCOBERTO (alta prioridade pro beta 4)
- **Local:** [lib/srd/srd-search.ts:388-394](../lib/srd/srd-search.ts#L388-L394) `injectTranslationsAndRebuild`
- **Bug:** faz lookup `translations.items[i.id]` mas `item-descriptions-pt.json` está indexado por `toSlug(name)` (sem sufixo de fonte).
- **Impacto:** afeta busca PT-BR de **TODOS os 2707 itens**. Provavelmente também explica por que outros conteúdos PT-BR do Lucas não apareciam na busca.
- **Opções de fix:**
  - A) Regenerar `item-descriptions-pt.json` com chaves por id (breaking)
  - B) Mudar `srd-search.ts:388-394` pra tentar slug-fallback primeiro antes do id
  - Recomendado: B (compat back, low risk)
- **Estimativa:** ~1-2h incluindo testes

#### S5.6 — Encounter duration telemetry (Finding 8)
- **Feedback:** SUMMARY.md reportou "duração média 18s" enganador porque `started_at` NULL
- **Spec:** [spike-beta-test-3-2026-04-17.md Finding 8](spike-beta-test-3-2026-04-17.md)
- Populate `encounters.started_at` ao iniciar combate

---

## ⚙️ Feature flag flip que depende de soak

**`ff_combatant_add_reorder`** (Track B já shippado, flag OFF)

Timeline:
1. ✅ Shippado 2026-04-17 00:00 UTC, SW cache v3
2. ⏳ **Soak 24h** — esperar até 2026-04-18 00:00 UTC antes do flip
3. Flip em **staging** → Lucas ou outro DM testa "adicionar 3 criaturas rapidamente em combate ativo"
4. Observar `combat:combatant_add_desync_detected` < 5%
5. Flip em **prod** (general availability)

---

## 🔄 Workflow esperado (mesmo processo de sucesso do beta 3)

1. **Leia tudo** listado acima
2. **Confirme com Dani** o que é prioridade máxima dessa semana vs o que fica bucket (sprint 5 items especificamente)
3. **Verifique tsc/lint baseline** em master antes de começar
4. **Paralelize em worktrees**:
   - Usar tool Agent com `isolation: "worktree"`
   - Cada worktree commita na sua branch, não push, não PR
   - Múltiplos agents em paralelo quando scopes não colidem em arquivos-chave
   - Shared files hot: `PlayerJoinClient.tsx`, `CombatSessionClient.tsx`, `CombatantRow.tsx`, `useCombatActions.ts`, `messages/*.json` — se 2+ tracks tocam o mesmo arquivo, sequenciar ou planejar conflict resolution
5. **Code review** de cada track após completar — adversarial, 3 lentes (Blind Hunter, Edge Case Hunter, Acceptance Auditor)
6. **Fix agents** nos blockers identificados
7. **Review dos fix commits** também (beta 3 errou isso no começo — não pule)
8. **Merge sequencial** em master (ordem: migrations primeiro, depois data-shape, depois UI, depois flags)
9. **Consolidated review** pós-merge (cross-cutting integrity + build + tests)
10. **Push** origin master → Vercel auto-deploy
11. **Aplicar migrations** (se tiver) via `npx supabase db push --linked`
12. **Smoke test prod** via curl nos endpoints novos
13. **Monitoring setup** — Sentry alerts + Supabase query alerts + analytics targets

---

## 🧪 Gate de "pronto pra shipar"

Antes de considerar qualquer feature nova como completo:

- [ ] `rtk tsc --noEmit` zero erros
- [ ] `rtk lint` zero novos errors vs baseline master (pre-existing OK)
- [ ] Testes unit novos passam (Jest não vitest neste projeto)
- [ ] Playwright e2e cena nova listando corretamente
- [ ] Combat Parity matrix documentada por feature (Guest/Anon/Auth)
- [ ] A11y: touch targets 44×44pt min, contraste WCAG AA, `prefers-reduced-motion`, ARIA labels
- [ ] i18n: novas keys em ambos pt-BR.json e en.json (parity 100%)
- [ ] Feature flag default OFF se risky
- [ ] Observability events planejados
- [ ] Rollback plan (especialmente pra changes de schema/RPC)

---

## 📊 Métricas alvo pra beta 4

Pós-deploy desta semana, antes do beta 4 começar:

- `player:reconnected` false positives < 20% dos eventos (filtro 3-tier)
- `/api/session/[id]/state` 429 errors < 5/min (throttle + orchestrator)
- `recap.served_from_db` ≥ 95% pra reconnects pós-combate
- `combat:combatant_add_desync_detected` < 5% **com flag ON**
- Zero 5xx nos endpoints novos por 24h em prod
- `encounter_votes` recebendo votos (dispatch pack do beta 3 funcionou)

---

## 🚧 Débitos técnicos conhecidos (não esquecer)

1. **Voting RPC** — atacante com anon key pode rotar `voter_fingerprint` pra spam. V2 = WAF/service-role gateway. Low severity (5/60s por fingerprint, não escala).
2. **Linear commits dificultam rollback per-track** — kill switches existem (flag OFF, REVOKE RPC, route removal), documentar expandido se shipar mais complexidade.
3. **PWA cache soak** — sempre que mexer em broadcast type ou ABI crítica, bumpar `CACHE_VERSION` em `public/sw.js` + soak 24h.
4. **lint errors pré-existentes** — 16 errors + 7 warnings em master. Baseline documentado — não aumentar.

---

## 🎬 Começando

Sugestão de arranque:

```
1. Leia esse handoff
2. Leia CLAUDE.md, spike v2, UX spec v2, sprint plan
3. Valide com Dani: prioridade dentro dos sprints 3-4-5
4. Planeje worktrees (3-5 em paralelo, scopes disjuntos)
5. Dispatche dev agents
6. Entre em loop review → fix → merge → deploy
```

Boa sorte. Beta 4 conta contigo.

— Claude Opus 4.7 (handoff 2026-04-17)
