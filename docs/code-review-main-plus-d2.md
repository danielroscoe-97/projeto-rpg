# Code Review — Main hotfixes + D2 (pós-76d1d183)

Data: 2026-04-19
Reviewer: Claude adversarial 3-lens (Blind Hunter / Edge Case Hunter / Acceptance Auditor)
Escopo: 7ea5c525 (hotfixes), 419a82d0..d3bdaa46 (D2), merge 4ae9ec95. Skipped: 5d75ce6e (docs-only).

## Sumário
- **0 P0** / **2 P1** / **5 P2** findings
- Recomendação geral: **fix-then-ship** — P1 do X glyph deve ser corrigido antes do push (consistência visual), P2 podem entrar no bucket pós-push

---

## Commit 7ea5c525 — Hotfixes

### Fix 1: B2 X icon swap (`MonsterStatBlock.tsx:362` + `stat-card-5e.css`)

**[P1] Glyph swap incompleto — inconsistência visual entre cards**

- Apenas `MonsterStatBlock.tsx:362` trocou `×` (U+00D7) → `✕` (U+2715).
- Mantiveram `×` os seguintes consumidores da MESMA classe CSS `.toolbar-close`:
  - `components/oracle/SpellCard.tsx:97`
  - `components/oracle/ConditionCard.tsx:140`
  - `components/oracle/OracleAICard.tsx:135`
  - `components/oracle/FloatingCardContainer.tsx` (9 ocorrências: linhas 181, 216, 270, 317, 362, 406, 438, 482, 744)
- **Consequência**: DM fecha stat-block de monstro e vê `✕` heavy. Fecha spell card na mesma sessão e vê `×` thin. Visual dissonance no mesmo layout.
- **Decisão**: ou (a) trocar os ~12 glifos restantes, ou (b) reverter para `×` e confiar só no CSS (fontweight 900 + 22px já ajuda) — o commit escolheu caminho intermediário que é o pior dos dois.

**[OK] CSS treatment** — font-size 22px + border 2px + bg gold 0.18 + line-height 1 está consistente e dentro da especificação do feedback do Lucas Galupo. Contraste `#e8e4d0` em bg `rgba(201,169,89,0.18)` sobre card dark é legível (não testado WCAG numericamente mas dark-only app). Tamanho 44×44 mantido (WCAG target size OK).

### Fix 2: C6 Satori OG blog (`app/blog/[slug]/opengraph-image.tsx`)

**[P2] Cobertura parcial dos divs com children — risco residual**

- Satori docs: "elements with children MUST use `display: flex` or `display: none`". O fix cobriu apenas 2 divs decorativos (radial glow linha 45, border frame linha 60), ambos SEM children.
- Existem outros divs com text-children que NÃO têm `display:flex` explícito: linhas 77 (brand "Pocket DM"), 95 ("Blog"), 115 (reading time), 137 (title), 158 (URL), 167 (D&D 5e · Combat Tracker).
- **Na prática**: o changelog diz "7× runtime errors" e o fix foi nas 2 linhas. Se esses 7 errors vinham dos 2 divs renderizados em 3-4 posts diferentes (SSG), o fix resolve. Se vierem dos divs com children, o build volta a quebrar.
- **Recomendo**: rodar `next build` localmente + verificar OG image no Twitter Card Validator para 1-2 posts. Se passar, o fix está completo. Não bloqueia push se o build CI não acusa.

### Fix 3: Guest polymorph i18n (`GuestCombatClient.tsx:1412`)

**[OK] i18n parity confirmada**
- Chave `combat.polymorph.form_destroyed` existe em pt-BR (`messages/pt-BR.json:1752`) E en (`messages/en.json:1750`), placeholders idênticos (`{form_name}`, `{name}`).
- `t` vem de `useTranslations("combat")` declarado na linha 854 do componente main, está em scope do `useCallback`.

**[P2] Missing dep no useCallback (react-hooks/exhaustive-deps)**
- `useCallback` em linha 1422-1425 tem deps `[applyDamage, pushHpUndo]` — `t` está em closure mas NÃO declarado. Lint warning provável.
- `t` de `useTranslations` do next-intl é estável (memoizado), risco funcional = zero. Mas vai poluir o lint output se `react-hooks/exhaustive-deps` estiver ativo. Fix: adicionar `t` ao array.

### Fix 4: `components/combat/HpDisplay.tsx` deletado

**[OK] Remoção limpa, sem imports órfãos**
- Grep em `components/**`, `app/**`, `lib/**`, `e2e/**` (excluindo `.claude/worktrees/`): ZERO imports ativos do `components/combat/HpDisplay`.
- O `HpDisplay` em `components/player-hq/HpDisplay.tsx` é um arquivo DIFERENTE, usado por `CharacterStatusPanel.tsx` — fora do escopo desse delete, permanece intacto.
- `components/combat/__tests__/` lista 4 arquivos de test; nenhum `HpDisplay.test.*`. O code-review anterior (`docs/code-review-beta4-pre-beta-test.md:35`) mencionou tests hipotéticos mas eles nunca existiram em `main`.
- Feature flag `ff_hp_thresholds_v2` continua consumida inline em `CombatantRow.tsx:262-270` — comportamento preservado.

### Fix 5: `favoriteSlug` consolidação (`lib/favorites/slug.ts`)

**[OK] Consolidação completa e segura**
- Novo arquivo `lib/favorites/slug.ts` exporta `favoriteSlug(name)` com signature e implementação idênticas às duas cópias removidas (lowercase → NFD → remove combining marks → non-alphanum → `-` → trim traços).
- `FavoritesTab.tsx:20` importa como `favoriteSlug as slugify` (mantém call-sites locais inalterados).
- `PlayerCompendiumBrowser.tsx:34` importa direto.
- Nenhuma outra definição de `favoriteSlug` ou `slugify` relacionada a favorites sobra no projeto (as outras `slugify` em `BlogTOC.tsx` e `PublicClassFullDetail.tsx` são para slugs de heading, escopo totalmente disjunto).

---

## Commits D2 (419a82d0..d3bdaa46)

### Badges (monster rows + spell rows)

**[OK] VersionBadge robusto**
- `VersionBadge.tsx:49` retorna `null` se `version` é falsy → seguro para monsters/spells sem `ruleset_version`.
- Gating de gold highlight em `is_srd === true && version === "2024"` está correto. 2024-nonSRD → zinc neutro (proteção SRD Compliance preservada).
- `flex-wrap` no container garante que badge + chip MAD + CR + type não quebram em mobile.

**[OK] MAD chip gating**
- Só renderiza quando `monster.source === "MAD"`. Cor `purple-500/30` border + `purple-400` text em dark bg — contraste visualmente aceitável, não validado numericamente.

### Filter (monster source)

**[OK] localStorage persist + migration**
- Chave versionada `compendium.monsters.filter.v1`. Hydration sync no `useState(() => ...)` evita flash. Valores inválidos caem no fallback `"all"` (guardados pelo narrowing explícito em `raw === "all" || ...`).

**[OK] `useContentAccess` gate para "nonsrd"**
- `canAccess` requer `isAuthenticated && (isWhitelisted || hasAgreed)`. Guest (`/try`) e anon (`/join`) têm `isAuthenticated=false` → chip "nonsrd" não aparece → SRD Compliance preservada. Confirmado no código e no test e2e.

**[OK] Combat Parity**
- `GuestCombatClient.tsx:2227` usa o MESMO `PlayerCompendiumBrowser` → guest recebe badges + filter automaticamente. Parity 3-mode atendida.

**[P2] `matchesSource` precedência MAD over SRD**
- A função exclui MAD de todos os buckets não-MAD (linha 47). Correto para o layout atual onde cada monster pertence a um bucket só. Se no futuro um MAD entry for tagged `is_srd=true`, ele NÃO aparecerá no bucket SRD — por design. Documentado no JSDoc. OK.

### i18n + telemetry

**[OK] i18n parity exato**
- 6 keys em ambos locales: `compendium_source_label`, `_all`, `_srd_2014`, `_srd_2024`, `_mad`, `_nonsrd`. Sem drift.

**[OK] Telemetry allowlist**
- `compendium:filter_changed` adicionado em `app/api/track/route.ts:65`. Payload `{scope, filter, results_count}` — sem PII.

**[P2] `results_count` projetado usa `baseline` recalculado a cada chip click**
- O botão recomputa `baseline.filter(matchesSource)` dentro do `onClick`. Como `baseline` é derivado de `monsters` (completo) ou `monsterHaystack` (search ativo), a operação é O(n) sobre ~1122 monsters. Aceitável, não blocker, mas podia ser memoizado. Cosmético.

### Tests

**[OK] Cobertura unit sólida**
- `monster-source-filter.test.ts`: 5 casos cobrem all/srd_2014/srd_2024/mad/nonsrd incluindo edge case "2024 não-SRD não vaza para srd_2024".
- `PlayerCompendiumBrowser.favorites.test.tsx`: 2 casos D2 — chips render (nonsrd hidden for guest) + SRD 2024 click filtra + persist localStorage.

**[P2] Gaps de cobertura**
1. **Chip MAD click** não testado — só SRD 2024. MAD filter é feature-key, deveria ter happy-path.
2. **Chip NONSRD com `canAccess=true`** não testado — variante whitelisted/auth nunca exercita o render do 5º chip.
3. **Telemetry assertion** ausente — nem unit nem e2e assertam que `compendium:filter_changed` foi emitido com `results_count` correto. Prompt pediu explicitamente.
4. **Spell-row VersionBadge** (commit aceb60f5) tem ZERO tests — nem unit nem e2e. Só monster path coberto.
5. **Migration de valor inválido em localStorage** não testado — ex: `localStorage.setItem("compendium.monsters.filter.v1", "bogus")` → renderização deveria cair em "all". O código trata (narrowing), mas sem teste é regressão-prone.

---

## Cross-cutting

### Parity check (Guest / Anon / Auth)
- **Filter + badges**: guest usa `PlayerCompendiumBrowser` via `GuestCombatClient`; anon/auth via `PlayerJoinClient`/`PlayerInitiativeBoard`. 3-mode coverage automática porque é UI-only mudando só o browser. OK.
- **DM combat** (`MonsterSearchPanel.tsx`) tem outro `sourceFilter` com shape diferente (`sm_filter_source`) — intencionalmente separado, não precisa parity.

### A11y
- Close `✕` 44×44 preserva target size.
- Filter chips `role="group"` + `aria-label={t("compendium_source_label")}` + `aria-pressed` por chip. Semântica OK.
- `VersionBadge` tem `aria-label` e `title`. OK.

### i18n parity
- Todas as 6 keys de filter parity EN↔PT. Chave polymorph também parity com placeholders corretos.

### Telemetry allowlist
- Single event `compendium:filter_changed` whitelisted. OK.

### SRD Compliance
- **Não foi necessário regenerar `public/srd/`** — nenhum dado mudou, apenas UI filtering. Whitelist intacta.
- Chip "Outros livros" renderizado apenas quando `canAccess=true`. Guest/anon bloqueados. Preservado.

### Resilient Reconnection
- Não aplicável a esses commits. Skip.

---

## Recomendação

### Blockers pra push origin/master
1. **[P1] Decidir glyph strategy** — ou completar o swap `×→✕` em SpellCard, ConditionCard, OracleAICard, FloatingCardContainer (9 pts), ou reverter MonsterStatBlock e confiar só no CSS 22px/900. ~15 min.

### Pós-push (bucket)
2. **[P2] C6 Satori** — rodar `next build` e validar no Twitter Card Validator. Se passar, close. Se quebrar em div com text-child, adicionar `display:flex` a todos os wrappers.
3. **[P2] `useCallback` deps** — adicionar `t` ao array em `GuestCombatClient.tsx:1420`. 1 linha.
4. **[P2] Cobertura de test gaps D2** — MAD click, nonsrd com canAccess=true, telemetry assertion, spell-row coverage, invalid-localStorage fallback. ~1h.

### O que está sólido (não tocar)
- HpDisplay delete: execução impecável
- favoriteSlug consolidação: zero divergência
- Filter gating + SRD compliance preservation: correto
- VersionBadge: robusto para loading/null
- Unit tests de `matchesSource`: cobrem buckets corretamente
- i18n parity: exata
- Telemetry whitelist: presente
- TypeScript: limpo (rodado `tsc --noEmit`, zero erros)
