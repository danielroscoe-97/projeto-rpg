# Code Review Adversarial — Beta 4 Pre-Beta-Test

Data: 2026-04-19
Reviewer: Claude (3-lens adversarial — Blind Hunter / Edge Case Hunter / Acceptance Auditor)
Scope: commits `8d3d2dc..HEAD` (=`76d1d183`) — S3.1, S3.3, S3.4, S3.5, S3.6, S4.1, S4.2, S4.3, S4.4, S5.1, S5.2, S5.3, S5.4, S5.6, S5.7

---

## Sumário Executivo

- **4 findings P0** (blocker — devem ser corrigidos antes do beta 4)
- **7 findings P1** (fix antes do beta 4, se der tempo)
- **6 findings P2** (backlog / pós-beta)

Cross-cutting: i18n pt-BR das legendas de HP está quebrada (palavras ficaram em inglês), FavoriteStar faz 50+ fetches simultâneos na abertura do compendium rompendo o rate-limit de 30/min, e HpDisplay novo criado pelo S3.1 **não é usado em lugar nenhum** (sprint entregue incompleto). O resto dos sprints (quick actions, custom conditions, polymorph, recharge, group clear, fetch orchestrator, guest recap) está sólido.

---

## Findings por Sprint

### S3.1 — HpDisplay + `ff_hp_thresholds_v2`

#### [P0] i18n pt-BR das legendas de HP está em **inglês**
- Local: `messages/pt-BR.json` linhas 1603-1607 e 2370-2374 (`combat.hp_*` e `player.hp_*`)
- Problema: `combat.hp_full = "FULL"`, `combat.hp_light = "LIGHT"`, `combat.hp_moderate = "MODERATE"`, `combat.hp_heavy = "HEAVY"`, `combat.hp_critical = "CRITICAL"` — todos em inglês. O valor correto está em `player_hq.sheet.hp_*` (`"CHEIO"`, `"LEVE"`, …) e nos `_short` (`"CHEIO"`, `"LEVE"`, `"MOD"`). Apenas `combat.hp_defeated = "CAÍDO"` ficou correto.
- Evidência: `lib/utils/hp-status.ts:27-31` define `labelKey: "hp_light"`. `components/combat/CombatantRow.tsx:606` faz `t(hpThresholdKey)` no namespace `combat`. `components/player/PlayerInitiativeBoard.tsx:121` usa namespace `player` (mesmo bug).
- Fix sugerido: traduzir os blocos `combat.hp_*` e `player.hp_*` em `messages/pt-BR.json` para CHEIO / LEVE / MODERADO / GRAVE / CRÍTICO.
- Parity impact: **afeta Guest, Anon e Auth** (todos usam CombatantRow + PlayerInitiativeBoard).
- Nota: bug é pre-existente (herdado do beta 3), mas S3.1 explicitamente prometia "i18n parity gate" — não foi honrado.

#### [P0] `components/combat/HpDisplay.tsx` não é importado por nenhum call-site real
- Local: `components/combat/HpDisplay.tsx`
- Problema: componente novo foi criado pelo sprint (spec em `docs/sprint-plan-beta3-remediation.md:419`), mas buscando nos imports `@/components/combat/HpDisplay` ou `from "./HpDisplay"` em components/combat/*.tsx não há consumidor. `CombatantRow.tsx:20-24` importa apenas helpers de `lib/utils/hp-status`, NÃO o componente. `PlayerInitiativeBoard.tsx:10` idem. Os worktrees `.claude/worktrees/agent-adb68ece/` e `agent-a1b6212c/` têm o import — mas nenhum chegou ao branch master. S3.1 foi shipped pela metade.
- Evidência: `grep -n "from.*combat/HpDisplay" components/` retorna apenas a definição e arquivos de teste. O trabalho visual (flag v2 bands) acabou sendo duplicado inline em `CombatantRow.tsx:262-270`.
- Fix sugerido: (a) apagar `components/combat/HpDisplay.tsx` E `components/combat/__tests__/*HpDisplay*` e declarar que o trabalho vive inline nas Rows, **ou** (b) fazer o refactor real — substituir os blocos inline no `CombatantRow.tsx` e `PlayerInitiativeBoard.tsx` pelo novo componente. Sem uma dessas ações, o componente é código morto com bug próprio (P1 abaixo).
- Parity impact: n/a (não renderiza em lugar nenhum)

#### [P1] Bug latente no `HpDisplay.tsx` novo: cor da barra vs label inconsistente quando flag v2 ON
- Local: `components/combat/HpDisplay.tsx:101`
- Problema: `getHpBarColor(effectiveCurrent, maxHp)` é a função **legacy** (thresholds 70/40/10). `labelKey` acima usa `getHpStatusWithFlag(..., flagV2)` (thresholds 75/50/25). Com flag v2 ON e HP a 60%: label mostra `MODERATE` (amber, pct 0.5<x<0.75) mas barra usa cor de `LIGHT` (verde, pct>0.7). Cor ≠ texto.
- Evidência: lib/utils/hp-status.ts:96-99 — `getHpBarColor` chama `getHpStatus` não `getHpStatusWithFlag`.
- Fix sugerido: trocar por `HP_STATUS_STYLES[hpStatus].barClass` (hpStatus é o `getHpStatusWithFlag` já calculado acima).
- Parity impact: estaria nos 3 modos SE o componente fosse usado — por ora é bug latente. Ligar à decisão do P0 acima.

---

### S3.3 — Normalização + Fuse ignoreDiacritics

#### OK
- `lib/srd/normalize-query.ts` é puro e bem testado. `MONSTER_OPTIONS.threshold = 0.4` / `ITEM_OPTIONS.threshold = 0.35` depois de β'/test-fix são valores defensáveis. Cobertura boa em `srd-search.test.ts` (+ teste de "Velociraptor" → "Velociráptor").
- Todos os Fuse options exportam `ignoreDiacritics: true` e `minMatchCharLength: 2`.

#### [P2] Slug para favoritos strip chars unicode
- Local: `components/player/PlayerCompendiumBrowser.tsx:32-39` e `components/favorites/FavoritesTab.tsx:130-137`
- Problema: `favoriteSlug` usa `[^a-z0-9]+/g → "-"` APÓS NFD strip. Para monstros com nomes em CJK, árabe etc. vai gerar slug vazio ou só traços. No SRD atual o dado é mostly ASCII pós-NFD então tudo bem, mas imported content via homebrew pode quebrar.
- Fix sugerido: usar `[^\p{L}\p{N}]+` (como o `normalizeForSearch` já faz), e NÃO NFD-strippar completo.
- Parity impact: 3 modos (favorites funcionam em todos).

---

### S3.4 — Group Clear-defeated / Delete-group

#### OK
- `computeBatchRemove` em `lib/combat/batch-remove.ts` é puro, retorna `nextTurnIndex` correto incluindo o caso onde o turn-current é removido. Teste coverage boa em `batch-remove.test.ts`.
- `AlertDialog` usado corretamente para ambos os botões, com `stopPropagation` para não colapsar o header.

#### [P2] Botões não atingem 44×44 em mobile
- Local: `components/combat/MonsterGroupHeader.tsx:346` (`h-8 min-w-8`) e `:387` (`h-8 w-8`)
- Problema: 32×32 passa WCAG 2.5.8 AA (24×24) mas o resto do projeto segue o padrão `min-h-[44px] sm:min-h-[32px]`. Inconsistência visual em mobile (botões de grupo menores que outros).
- Fix sugerido: adicionar `min-h-[44px] sm:h-8 min-w-[44px] sm:min-w-8`.
- Parity impact: DM-only (guest + auth DM). Anon não aplica.

---

### S3.5 — Fetch Orchestrator

#### OK
- `fetchOrchestrator` singleton bem-desenhado: circuit breaker, dedup, coalescing, 4 prioridades. `setUnauthorizedHandler` pluga 401→silent refresh sem acoplar à supabase-js. Allowlist em `/api/track` presente (`fetch_orchestrator:hit/dropped/circuit_open/circuit_close`).
- Telemetry throttle strict-mode hardening do fix `896e2e8d` correta.

#### [P2] Sem circuit-close notification via realtime
- Local: `lib/realtime/fetch-orchestrator.ts:268`
- Problema: quando circuit abre, jogador pode ficar 30s sem ver atualizações e não tem feedback visual. Só `SyncIndicator` ajuda — e ele depende do canal realtime, não do orchestrator.
- Fix sugerido: expor `circuitOpen` via subscription → SyncIndicator pode mostrar "conectando" quando circuit está open.
- Parity impact: Anon + Auth (Guest não usa orchestrator).

---

### S3.6 — i18n slug fallback (injector)

#### OK
- `toSlug(entity.name)` fallback em `lib/srd/srd-search.ts:405,414,423,431,439` garante que monsters/spells com IDs sufixados (`rod-of-the-pact-keeper-dmg`) encontram a tradução keyed por slug nu. Resolve o bug de 93% dos itens sem name_pt.
- `compendium:search_missed` debounced (2s idle) e deduped por query em `PlayerCompendiumBrowser.tsx:444-468`. Allowlist presente.

---

### S4.1 — Auto-scroll + pulse highlight

#### OK
- `lib/__tests__/turn-pulse.test.tsx` valida que o `useEffect` guarda `isFirstRender` (não pulsa no mount) e limpa timer no unmount.
- Pattern replicado idêntico em `CombatSessionClient.tsx`, `GuestCombatClient.tsx`, `PlayerInitiativeBoard.tsx` — parity por construção.

---

### S4.2 — Custom conditions (DM-only)

#### OK
- `formatCustomCondition` strip separator `|`, enforce 32/200 char caps, throw on empty. Parser defensive (retorna `{ name: "" }` em inputs malformados).
- Flag `ff_custom_conditions_v1` default OFF. `isPlayerForbiddenCondition` gate em `PlayerInitiativeBoard.canPlayerSelfApply` — bloqueia self-apply do `custom:*`.
- `ConditionBadge` trunca `max-w-[140px]` para nomes longos + tooltip preserva descrição.
- Telemetry `combat:custom_condition_applied` LGPD-safe (só `name_length`).

#### [P1] Sem defesa server-side contra payloads maliciosos
- Local: `lib/realtime/sanitize.ts` / `app/api/session/.../events`
- Problema: `isPlayerForbiddenCondition` é checado só no client (PlayerInitiativeBoard). Um jogador que construir um POST direto ao server pode enviar `custom:XYZ|...` via `player:self_condition_toggle`. Precisa validação server-side correspondente.
- Evidência: `canPlayerSelfApply` está em `components/player/PlayerInitiativeBoard.tsx:60-65` — pura UI.
- Fix sugerido: adicionar a mesma allowlist no handler server do player:self_condition_toggle. O spec diz que já existe ("DM-side has a matching allowlist") — conferir `CombatSessionClient.handleSelfConditionToggle`.
- Parity impact: Anon + Auth (player path). Guest n/a.

---

### S4.3 — Quick actions (Dodge/Dash/Help/Disengage/Hide/Ready)

#### OK
- `quick-actions.ts` com storage format `action:<kind>` não colide com `concentrating:` nem `custom:`. AUTO_EXPIRE_ON_NEXT_TURN apenas para dodge (5e RAW "until your next turn").
- Strip no turn-advance chamado em `guest-combat-store.ts:359` e `useCombatActions.ts:124`. Parity Guest + Auth garantida.
- Player path tem allowlist dupla (beneficial + concentrating + quick actions, rejeita `custom:*`).
- ConditionBadge renderiza `action:*` com ícone azul próprio (`sky-*` classes), sem expor prefixo cru.

#### [P2] Dodge não é auto-stripado quando `player:self_condition_toggle` recebe re-broadcast
- Local: `lib/hooks/useCombatActions.ts:124`
- Problema: strip acontece em handleAdvanceTurn no DM. Mas se um player aplicou action:dodge via self-apply e NUNCA toma turno (morreu prone-unconscious), o dodge fica lá para sempre. Edge case raro.
- Fix sugerido: ao processar `combat:defeated_change`, também chamar strip. Baixa prioridade.

---

### S4.4 — Login nudge contextual no compendium

#### OK
- `CompendiumLoginNudge` respeita 3 modos (`guest`/`anonymous`/`authenticated`), suprimido em auth. TTL 3 dias em localStorage com fallback sessionStorage. SSR-safe default `dismissed=true` para evitar hydration flicker. Allowlist telemetry presente.
- `sanitizeReturnUrl` usado no CTA href (prev. open-redirect).

---

### S5.1 — Polymorph / Wild Shape

#### OK
- `lib/combat/polymorph.ts` é puro. Damage routing: polymorph=descarta overflow, wildshape=carrega overflow para HP original (absorve temp_hp antes). Healing só eleva form HP. Helpers compartilhados entre `lib/stores/combat-store.ts:245` e `lib/stores/guest-combat-store.ts` → parity por construção.
- `sanitizeCombatant` em `lib/realtime/sanitize.ts:52-63` zera `temp_current_hp/temp_max_hp` e remove `temp_ac` para monstros polymorphed — anti-metagaming ok.
- Modal tem `aria-label`, min-h-[44px], validation (nome ≤64, HP 1-999, AC 0-30). Reset de state no cancel/apply.
- `applyPolymorph` rejeita sobrescrita quando `polymorph.enabled` já true (S4 review fix).
- Service worker bumpado v4→v5 (ABI rotation correta).
- Telemetry `combat:polymorph_applied/ended` allowlisted.

#### [P1] Guest log entry usa string hardcoded em inglês
- Local: `components/guest/GuestCombatClient.tsx:1412`
- Problema: `description: \`${polyBefore.form_name} was destroyed; ${target.name} reverts to original form\`` — hard-coded English. Em `useCombatActions.ts:280` (auth path) usa `t("polymorph.form_destroyed", ...)` via namespace combat → correto. Guest vaza inglês no recap.
- Evidência: messages/pt-BR.json:1752 tem a chave `combat.polymorph.form_destroyed` traduzida. Guest ignora.
- Fix sugerido: importar `useTranslations` no guest ou passar `t` via prop; traduzir também line 1415 "reverts to original form".
- Parity impact: **Guest only**. Anon/Auth ok.

#### [P2] `polymorph.enabled` quando DM tries to set twice é silent no-op sem toast
- Local: `lib/stores/combat-store.ts:294` (`applyPolymorph`)
- Problema: "if (c.polymorph?.enabled) return c" — return silencioso. Nenhum toast/feedback pro DM. Ele clica "Polymorph" de novo e nada acontece, achando que a UI bugou.
- Fix sugerido: modal validar state antes de chamar applyPolymorph, ou retornar boolean do store.
- Parity impact: DM-only (guest + auth).

---

### S5.2 — Favoritos (compendium)

#### [P0] `FavoriteStar` causa storm de fetches `/api/favorites` na abertura
- Local: `lib/favorites/use-favorites.ts:66-91,102-120`
- Problema: cada `<FavoriteStar>` instancia seu próprio `useFavorites(kind)`. Cada hook faz `supabase.auth.getUser()` + `fetch(/api/favorites?kind=...)` no mount. O compendium carrega PAGE_SIZE=50 monstros/itens — são 50 FavoriteStars por aba, cada um disparando seu próprio GET. `/api/favorites` tem rate-limit 30/min por user (`app/api/favorites/route.ts:166-179`) — **estouro certo**.
- Adicionalmente: cada hook re-escuta `visibilitychange` e `focus` (linha 125-136), amplificando a storm a cada retorno ao tab.
- Evidência: `PlayerCompendiumBrowser.tsx` linhas 1263, 1349, 1770 — uma `<FavoriteStar>` por linha de lista. Tab monstros + items + conditions = 3 aba × 50 = até 150 hooks simultâneos.
- Fix sugerido: promover `useFavorites` a store global (Zustand singleton ou Context) — uma única fetch por kind, todas as stars se inscrevem ao mesmo state. Alternativa mais pequena: move auth probe + reload para o topo do PlayerCompendiumBrowser e passar `favorites` como prop para FavoriteStar (ou usar `useSyncExternalStore` contra `local-store.subscribe` + uma cache única).
- Parity impact: **Auth mode principal** — maior impacto. Guest/anon usam local-store que é O(1) memory read, então menos pior mas ainda faz N renders com useState. Ainda que auth seja o caso crítico, o fix também melhora guest.

#### [P1] `FavoritesTab` e `favoriteSlug` duplicados
- Local: `components/favorites/FavoritesTab.tsx:130-137` vs `components/player/PlayerCompendiumBrowser.tsx:32-39`
- Problema: duas cópias do `slugify/favoriteSlug`. Se uma mudar sem a outra, slugs divergem e favoritos somem (write vs read mismatch).
- Fix sugerido: extrair para `lib/favorites/slug.ts` e importar nos dois.
- Parity impact: 3 modos.

#### [P2] Race condition: add + rápido remove antes do POST terminar
- Local: `lib/favorites/use-favorites.ts:148-220` (add) e `:222-247` (remove)
- Problema: add é otimista. Se usuário clica add+remove muito rápido: o add POST ainda está in-flight, remove envia DELETE. DELETE pode retornar 404 ("not found") enquanto o servidor ainda não inseriu. O `!res.ok && res.status !== 404` ignora 404, então o estado final fica consistente — MAS o usuário pode ver o coração piscando em estado errado por ~500ms.
- Fix sugerido: queue as mutations serializando por `slug`. Baixa prioridade.

---

### S5.3 — Recharge dice roller

#### OK
- `parseRecharge` regex `\(Recharge\s+(\d)(?:[-\u2013](\d))?\)` com `\b` e negative-lookahead para "Recharges" (plural, rest-based). Bounds 2-6.
- `RechargeButton` respeita `prefers-reduced-motion`. 500ms animation cleanup on unmount.
- Wiring em `combat-store.ts:setRechargeState` (auth) e `guest-combat-store.ts` (guest). DM-only — `PlayerInitiativeBoard` não renderiza stat block com combatantContext.
- Allowlist `combat:recharge_used/rolled` presente.
- i18n pt-BR correto (`combat.recharge.*`).

#### [P2] `rechargeState` vaza no broadcast para players (info leak menor)
- Local: `lib/realtime/sanitize.ts:47` (`...safe` spread inclui rechargeState)
- Problema: sanitize faz `const {...} = base; return {...safe}` — mas não remove `rechargeState`. Não aparece na UI do player (stat block é DM-only), porém um player pode inspecionar network tab e saber quais abilities estão depleted ("fire_breath depleted" via action_key).
- Fix sugerido: destructure out `rechargeState` no sanitize monster branch.
- Parity impact: Anon + Auth (metagaming). Guest N/A.

#### [P2] Sem SW bump apesar de mudança ABI no Combatant
- Local: `public/sw.js:12`
- Problema: rechargeState é novo campo em Combatant (carrier do CombatStateBroadcast). Per CLAUDE.md comment em sw.js:7-11, ABI changes em Combatant devem bumpar SW. S5.1 bumpou v4→v5 pelo polymorph; S5.3 não bumpou. Embora additive (old clients ignoram), inconsistência com a regra.
- Fix sugerido: `CACHE_VERSION = "v6"` — ou documentar exceção.
- Parity impact: n/a (todos recebem stale SW se não bumpar).

---

### S5.4 + S5.6 + S5.7 — Guest recap / encounter started_at / First Blood

#### OK
- `guest-last-recap.ts`: TTL 24h, JSON defensive, clear on malformed/expired. Teste coverage em `guest-last-recap.test.ts`.
- Migration 141 backfill + trigger idempotente (INSERT OR UPDATE only quando started_at IS NULL). Rollback comentado.
- `first_blood` rename com backward-compat no `app/r/[code]/opengraph-image.tsx:10` (alias "assassin"). Ícone + i18n comum ("First Blood" em ambos idiomas, intencional).
- Telemetry `guest:recap_persisted/banner_shown/banner_clicked` allowlisted.

---

## Findings Cross-Cutting

### Parity gaps (features que não cobrem 3 modos)

| Feature | Guest | Anon | Auth | Nota |
|---|---|---|---|---|
| Polymorph log msg i18n | ❌ EN hard-coded | ✅ traduz | ✅ traduz | [P1] guest único falhou |
| Favorites | ✅ local | ✅ local | ✅ /api/favorites | mas [P0] fetch storm em Auth |
| Quick actions | ✅ | ✅ self-apply | ✅ self-apply | OK |
| Custom conditions | ✅ (DM=host) | ✅ read-only | ✅ read-only | OK — [P1] falta validação server-side |
| Recharge | ✅ DM | N/A (player não vê) | ✅ DM | OK |
| HP tier labels | ❌ EN em PT-BR | ❌ EN em PT-BR | ❌ EN em PT-BR | [P0] `messages/pt-BR.json` bug |

### Telemetry allowlist

Todos os eventos novos presentes em `app/api/track/route.ts`. Nada órfão.

### i18n parity

- 0 chaves órfãs entre `messages/en.json` e `messages/pt-BR.json`.
- BUG: valores de tradução para `combat.hp_full/light/moderate/heavy/critical` e `player.hp_*` **não foram traduzidos** (ficaram idênticos a EN).

### A11y

- FavoriteStar 32×32 (compact=28). Passa WCAG 2.5.8 AA. OK.
- PolymorphModal min-h-[44px] mobile ✓, radix focus trap ✓, escape-to-close ✓.
- MonsterGroupHeader buttons 32×32 desktop (deveriam ter variante 44×44 mobile — [P2]).
- RechargeButton 44×44 mobile / 32×32 desktop ✓.
- Login nudge CTA + dismiss 44×44 ✓.

### Reconexão & Zero-Drop

Fetch orchestrator: 401 retry hook, dedup, circuit breaker — todas as L1-L4 da cadeia de fallbacks do CLAUDE.md presentes. Heartbeat pause / visibility handling não foram tocados neste sprint, mas o review não encontrou regressão.

---

## Recomendação de priorização

### Bloqueiam beta 4 (fix antes de sexta)
1. **[P0] i18n pt-BR `combat.hp_*` e `player.hp_*`** — 15 min de trabalho (editar messages/pt-BR.json). DMs brasileiros verão "CRITICAL" em inglês sobre avatares durante o combate todo.
2. **[P0] FavoriteStar fetch-storm** — expor `ff_favorites_v1` em prod resultará em 429 para qualquer user auth que abrir o compendium. Se beta 4 flipar o flag, quebra. Solução: manter flag OFF em prod para beta 4 **ou** refactor para shared state (2-3h).
3. **[P0] HpDisplay code morto do S3.1** — decidir: deletar o componente + tests, **ou** fazer o refactor que faltou. Ter código morto com bug próprio é confuso para o próximo reviewer. 30 min qualquer caminho.
4. **[P1] Guest polymorph log em inglês** — se a flag `ff_polymorph_v1` flipar para beta 4 no guest, log recap aparecerá misturado. 10 min.

### Fix antes de sexta se der tempo
5. [P1] Server-side allowlist para `player:self_condition_toggle` (custom:*) — segurança
6. [P1] Consolidar `favoriteSlug` duplicado em `lib/favorites/slug.ts`
7. [P1] (bug latente) `HpDisplay.tsx:101` cor da barra usa legacy threshold

### Backlog
- P2: MonsterGroupHeader 44×44 mobile
- P2: Favorites add/remove race queue
- P2: rechargeState redact no sanitize
- P2: SW bump v5→v6 por consistência
- P2: polymorph silent no-op sem toast
- P2: dodge cleanup no defeated transition
- P2: circuit-open surfaced no SyncIndicator
- P2: favoriteSlug preservar unicode letras

---

## Nota final

A qualidade média está boa — a maioria dos sprints tem testes unitários próprios, gates de feature flag respeitados, allowlist telemetry e comentários explicando o porquê das decisões. Os 4 P0 são: um bug pre-existente que o S3.1 prometia resolver (i18n), um storm de rede que aparece só com 50+ itens e flag ON (S5.2), código morto (S3.1), e um vazamento de hard-coded string no guest (S5.1). Nenhum deles é arquitetural — todos são defeitos localizados, corrigíveis em minutos/poucas horas.

Os 3 sprints mais complexos (S5.1 polymorph, S5.3 recharge, S3.5 fetch orchestrator) estão bem construídos e merecem soak. O único fator de preocupação real é o S5.2 + flag rollout — recomendo manter `ff_favorites_v1` OFF em prod até o refactor do shared state.
