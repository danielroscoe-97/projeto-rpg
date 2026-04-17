# Code Review — Sprint 2 Track E
Branch: `worktree-agent-aee55b39`
Commits: `825a39c` (H3 HP CRITICAL), `78158c7` (i18n inventory)

## Veredicto
**APPROVE WITH CHANGES** — bloqueador menor: teste unitário `CombatantRow.test.tsx:229` ficará vermelho em CI porque o `barClass` do tier CRITICAL mudou de `bg-red-900` para `bg-red-600`. Correção trivial (1 linha no teste), mas precisa entrar antes do merge. Demais achados são comentários de polimento (texto do commit msg com número de contraste ligeiramente otimista, line-ref incorreta no `__doc`, divergência consciente do spec em `combat.sheet.defenses_header`).

## Severity Summary

| Severidade | Quantidade | Categoria |
|---|---|---|
| **Blocker** | 1 | Teste `CombatantRow.test.tsx:229` vai falhar em CI — asserção `bg-red-900` não bate com novo `barClass` (`bg-red-600`) |
| **Major**   | 0 | — |
| **Minor**   | 3 | (a) commit msg declara 5.37:1 para barra mas valor real é 4.83:1 ainda AA; (b) `__doc` cita "linha 2333" mas `hp_status_*` está em 2377; (c) `defenses_header` foi para `combat.*` flat em vez de `combat.sheet.*` como pedia o spec (linhas 109, 577, 589) |
| **Info**    | 4 | (a) contraste do badge 6.47:1 vs agente 6.48:1 vs spec 5.94:1 — agente mais próximo do real; (b) 3 erros de lint em `PlayerInitiativeBoard.tsx` pré-existentes (não warnings como o agente falou); (c) vitest jsdom missing é pré-existente; (d) `animate-critical-glow` preservado |

## Findings

### `825a39c` — HP CRITICAL

**Blocker #1 — teste quebrado**
- `components/combat/CombatantRow.test.tsx:229` → `expect(screen.getByTestId("hp-bar-c1")).toHaveClass("bg-red-900")`.
- Novo `HP_STATUS_STYLES.CRITICAL.barClass` agora é `bg-red-600` (`lib/utils/hp-status.ts:31`).
- A barra no DM consome `getHpBarColor()` → `barClass`, logo renderiza `bg-red-600`. Teste quebra.
- Agente não executou `vitest run` localmente (jsdom missing é pré-existente), então não pegou.
- **Fix:** atualizar a asserção para `bg-red-600` e, idealmente, adicionar uma asserção adicional para o badge/textClass (`text-white`, `bg-red-700`) se aplicável.

**Info — texto-shadow removido legitimamente**
- `components/player/PlayerInitiativeBoard.tsx:79-81` tinha `[text-shadow:_0_0_6px_rgba(0,0,0,0.9),_0_0_2px_rgba(0,0,0,0.8)]` aplicado SÓ quando `isCriticalStatus`. Olhando o resto do componente, o shadow era exclusivo do tier CRITICAL. A remoção é consistente com "paliativo que tentava compensar dark-on-dark". Nenhuma outra tier perdeu visual secundário.
- `animate-critical-glow` permanece em `components/combat/CombatantRow.tsx:231` e `app/globals.css:513`. Coexistência OK.

**Info — HP number do DM ainda muted**
- `components/combat/CombatantRow.tsx:462` mantém `className="text-muted-foreground ..."` sem branch para `isCritical`.
- Spec confirma isso é fora de escopo do H3 em duas passagens:
  - `docs/epic-2-combat-ux-hotfixes.md:42` — "H3 — badge do player ... | Finding 7 Quick Win 2 — HP number no DM (`CombatantRow.tsx:459-468`) | Paralelo (lugares diferentes)"
  - `docs/epic-2-combat-ux-hotfixes.md:459` — "DM view — CombatantRow (HP number) está fora do escopo H3. Ver spike Finding 7 Quick Win 2."
- Claim do agente procede.

**Info — classes antigas (`text-red-200`, `bg-red-950/50`, `bg-red-900`) ainda no repo, mas em outros contextos**
- `text-red-200` reaparece em `components/settings/MySpellVotes.tsx:23` (rating "E", não-HP). Uso legítimo, não precisa mudar.
- `bg-red-900` aparece dezenas de vezes com função diferente (ação destrutiva de botão, overlays, CR Calculator, homebrew badge, etc.). Nenhum desses consome `HP_STATUS_STYLES`. Seguros.

### `78158c7` — i18n (48 keys)

**Minor #1 — `__doc` cita linha errada**
- `messages/en.json:2` / `messages/pt-BR.json:2` — "`hp_status_*` (prefixed) in the `player` namespace (legacy, line 2333)".
- Valor real: `hp_status_full/light/...` estão em `messages/en.json:2377-2381` (e idem em pt-BR). Linha 2333 é `my_notes_limit`.
- **Fix:** trocar "line 2333" por "line 2377" nos dois arquivos.

**Minor #2 — divergência de namespace em `defenses_header`**
- Spec `docs/epic-2-combat-ux-hotfixes.md:109` diz `combat.sheet.defenses_header`; linha 577 reforça "Chave i18n adicional: `combat.sheet.defenses_header`"; linha 589 idem.
- Agente implementou como flat em `combat.defenses_header` (en.json:2144 / pt-BR.json:2144), justificando no commit msg: "no such sub-namespace exists".
- Realidade: `combat` já tem várias chaves flat no nível raiz. Um sub-objeto `combat.sheet` NÃO existe no en.json atual, então o agente estaria criando esse sub-namespace. Decisão de evitar subnamespace single-key é defensável, mas deveria ter sido registrada no `__doc` ou no epic, não só no commit msg.
- **Recomendação:** se o H4 sprint entregar outras chaves de "sheet" (tipo `sheet.section_header`, `sheet.attributes`), vale migrar `defenses_header` para dentro de `combat.sheet.*` na mesma PR — custo de rename é baixo enquanto não há consumidores.

**Minor #3 — claim de contraste da barra ligeiramente otimista**
- Commit msg: "white on bg-red-600 (#dc2626) = 5.37:1 (AA normal)".
- Valor independente (fórmula WCAG 2.x, ver seção abaixo): **4.83:1**. Ainda passa AA normal (>= 4.5). Spec original listava 4.83:1 corretamente em `docs/epic-2-combat-ux-hotfixes.md:155`. O número 5.37:1 que apareceu no commit foi um desvio.
- **Fix:** corrigir commit msg em eventual PR summary (o commit em si não precisa ser reescrito).

**Info — nenhum duplicado, parity total**
- Contagem de chaves: pt-BR = 3924, en = 3924.
- Duplicates em pt-BR: 0. Em en: 0.
- Keys only in EN: 0. Only in PT: 0. Parity absoluta.

**Info — `__doc` não vaza para UI**
- `__doc` está no nível raiz do JSON — `next-intl` trata qualquer chave raiz como namespace. Uma chamada `useTranslations("__doc")` retornaria uma função que aceita chaves filhas; como é string e não objeto, qualquer tentativa de `t("algum-caminho")` debaixo dele falha silenciosamente (ou gera warning em dev). Nenhum `__doc` é referenciado em código TS/TSX (verificado via grep). Risco efetivo: zero em runtime, mas gera "missing namespace" noise se alguém chamar `useTranslations("__doc").raw`. Convenção mais segura seria um arquivo `messages/CONVENTIONS.md` à parte, mas o atual é tolerável.

**Info — 48 chaves realmente novas (+1 `__doc` = 49 top-level)**
- 42 em `combat.*` (inclui `defenses_header`, 6 stat_card, 1 hp_defeated, 1 group_members_hp, 6 hp_*_short, 5 group_clear_*, 5 group_delete_*, 5 custom_condition_*, 1 quick_actions_label, 6 action_*, 6 action_*_desc).
- 5 em `compendium.*` (login_nudge).
- 1 `__doc` raiz.
- Sem UI consumindo nenhuma das 48 hoje — consistente com a estratégia "land keys first" declarada no commit msg.

## Contrast verification (independent)

Fórmula: WCAG 2.x relative luminance + `(L1+0.05)/(L2+0.05)` (fórmula do W3C). Tailwind v3 (confirmado em `package.json:106`), paleta clássica de `red`.

| Par | Uso | Ratio (medido) | Agente claimed | Spec claimed | Verdito |
|---|---|---|---|---|---|
| `#ffffff` sobre `#b91c1c` (red-700) | Badge CRITICAL (bgClass) | **6.47:1** | 6.48:1 | 5.94:1 (L154) | Agente certo, spec com erro de 0.5 |
| `#ffffff` sobre `#dc2626` (red-600) | Barra CRITICAL (barClass) | **4.83:1** | 5.37:1 | 4.83:1 (L155) | Spec certo, agente otimista em 0.5 |
| `#fecaca` sobre `#450a0a` (red-200 sobre red-950 opaco) | Paleta antiga (hipotético sem alpha) | 11.16:1 | — | — | Paleta antiga teria alto contraste se opaca — problema real era o `/50` alpha sobre surface escuro variável, não red-200-on-red-950 puro |

Ambas as combinações novas passam WCAG AA normal (≥4.5:1). Badge também passa AAA para texto grande (≥4.5:1). Agente decidiu certo; a palavra "paliativo" no commit faz sentido para o `text-shadow` que estava mascarando a baixa contraste real do tier com bg alpha.

## i18n integrity

- **Duplicates:** 0 em ambos os locais.
- **Parity EN↔PT:** 3924 ↔ 3924, nenhuma chave só em um lado.
- **`__doc` risk:** não referenciado em TS/TSX, nenhum `t("__doc")` ou `useTranslations("__doc")`. Seguro em runtime.
- **Namespace conflicts:**
  - `combat.defenses_header` — único, não conflita.
  - `combat.hp_full` já existia em `messages/en.json:1603` (scalar legacy). Novos `hp_*_short` evitam colisão — decisão correta do agente.
  - `combat.hp_defeated` é novo, sem conflito (`hp_defeated_short` coexiste OK, ambos renderizam "DOWN"/"CAÍDO").
  - `compendium.login_nudge_*` novos, sem conflito.
  - `player.hp_status_*` em `messages/en.json:2377-2381` permanecem intactos (legacy). Coexistência sã.
- **Line-ref bug em `__doc`:** cita "line 2333", valor real 2377 (ver Minor #1).

## Parity propagation proof

Grep por `HP_STATUS_STYLES` mostra os 3 modos e pontos DM consumindo o mapa central:

| Arquivo | Linha | Modo consumindo |
|---|---|---|
| `components/player-hq/HpDisplay.tsx:11-12,34` | HpDisplay usa `HP_STATUS_STYLES[status]` | Auth (player HQ) |
| `components/player/PlayerInitiativeBoard.tsx:10,74` | HpStatusBadge usa `HP_STATUS_STYLES` | **Anônimo + Auth** (PlayerJoinClient usa PlayerInitiativeBoard) |
| `components/combat/HPLegendOverlay.tsx:7,11` | Legenda HP no DM | DM (Guest + Auth) |
| `components/dashboard/PlayerCampaignCard.tsx:5,49` | Dashboard card | Auth |
| `components/combat/CombatantRow.tsx:19` | importa `getHpBarColor` + `getHpThresholdKey` (consome `barClass`) | DM (Guest + Auth) |
| `components/combat/MonsterGroupHeader.tsx:7` | `getHpBarColor` | DM |
| `components/combat/PlayerDrawer.tsx:7` | `getHpBarColor` + `getHpTextColor` | DM |
| `components/player/PlayerBottomBar.tsx:7` | `getHpBarColor` + `getHpThresholdKey` | Anônimo + Auth |
| `lib/realtime/sanitize.ts:19`, `lib/realtime/broadcast.ts:15` | derivam `hp_status` para broadcasts | Anônimo + Auth |
| `lib/utils/sanitize-combatants.ts:1` | guest sanitize | Guest |
| `components/campaign/PlayerCampaignView.tsx:22` | `getHpBarColor` | Auth |

GuestCombatClient não importa `HP_STATUS_STYLES` diretamente, mas consome o mapa transitivamente via `CombatantRow` (que usa `getHpBarColor` → `barClass`). Parity completa nos 3 modos. Nenhum componente mantém cópia própria de estilos CRITICAL.

## DoD verification

| Item | Status | Evidência |
|---|---|---|
| `tsc --noEmit` verde | **OK** | "TypeScript compilation completed" sem erros |
| Lint — 3 warnings pré-existentes | **Parcial** | `eslint components/player/PlayerInitiativeBoard.tsx lib/utils/hp-status.ts` retorna 3 **erros** (não warnings) — `PlayerNoteInput`, `combatLog`, `onPlayerNote` unused. IDÊNTICO em master (mesmos 3 erros, apenas em linhas ligeiramente diferentes — 124/230/233 no branch, 126/232/235 em master). Pré-existente, confirmado. Agente chamou-os erroneamente de "warnings" — mas a natureza (pré-existente) está correta |
| Vitest — config issue pré-existente | **OK** | `jsdom` missing no npx cache reproduz IDENTICAMENTE em master. Pré-existente |
| JSON parse clean em ambos locales | **OK** | `node -e "require('./messages/en.json'); require('./messages/pt-BR.json')"` sem erro |
| 0 duplicates, parity total | **OK** | ver seção acima |
| Parity 3-mode | **OK** | `HP_STATUS_STYLES` é single source of truth, consumida por Guest/Anônimo/Auth (via importações diretas ou transitivas via CombatantRow/PlayerBottomBar/HpDisplay) |
| CRITICAL row treatment preservado | **OK** | `animate-critical-glow` intacto em `CombatantRow.tsx:231` + `app/globals.css:513`; border-red-500/60 intacto |
| Testes unitários verdes | **BLOQUEADO** | `CombatantRow.test.tsx:229` asserta `bg-red-900` — vai falhar. Não rodou local por jsdom missing, mas CI com jsdom instalado detecta |

## Recomendações antes do merge

1. **[Blocker]** Atualizar `components/combat/CombatantRow.test.tsx:229` de `.toHaveClass("bg-red-900")` para `.toHaveClass("bg-red-600")`. Se existir cobertura de `HpStatusBadge` em outro teste, adicionar asserções para `text-white`, `bg-red-700`.
2. **[Minor]** Corrigir line-ref no `__doc` de "line 2333" para "line 2377" em `messages/en.json:2` e `messages/pt-BR.json:2`.
3. **[Minor]** Decidir sobre `defenses_header`:
   - Opção A: manter flat `combat.defenses_header`, atualizar spec (`docs/epic-2-combat-ux-hotfixes.md:109, 577, 589`) para refletir decisão.
   - Opção B: migrar para `combat.sheet.defenses_header` antes que H4 aterrize consumidor.
4. **[Minor]** Em eventual PR summary, trocar "5.37:1" por "4.83:1" para a barra; manter 6.47:1 ou 6.48:1 para o badge.
5. **[Nice-to-have]** Adicionar, no futuro, um teste de integração/snapshot que consuma `HP_STATUS_STYLES.CRITICAL` e assegure `text-white` + `bg-red-700` visíveis (evita regressão silenciosa do tier dramático).
6. **[Nice-to-have]** Investigar, em sprint posterior, instalação do `jsdom` como devDep explícito para que `vitest run` não dependa de cache do npx — isso pegaria o teste quebrado localmente antes de chegar na CI.
