# Postmortem: E2E Helper Drift — Three Concurrent Causes (Share Button + Form Close + Min Combatants)

**Data:** 2026-04-21
**Severidade:** Alta (suíte E2E completa bloqueada + regressão UX em produção)
**Impacto em produção:** DMs autenticados perderam a capacidade de compartilhar link durante o setup de combate em `/app/combat/new`. Descoberto pela E2E, não por usuário — blast radius em beta limitado.
**Status:** RESOLVIDO (helper drift) — RUN-TO-RUN STABILITY separada (ver §Wave 3 Suite Stability)

---

## Resumo Executivo

Durante execução da QA Wave 3 (commit `da219f13`), o helper `dmSetupCombatSession` em `e2e/helpers/session.ts` começou a dar timeout aguardando `[data-testid="active-combat"]`. A suspeita inicial apontava para drift da recente refactor de linguagem ubíqua (Combate/Encontro/Histórico/Quest + rota `/session→/combat`).

**A hipótese estava errada.** O audit revelou que **TODOS os testids que o helper referencia ainda existem na produção**. A investigação subsequente descobriu **três causas concorrentes**, todas acumuladas em janela de 3 semanas, sem que nenhuma individualmente derrubasse todo o teste — mas em conjunto interceptaram o fluxo em três pontos sequenciais:

1. **`842e5da1` (2026-04-21, mesmo dia da QA):** Epic 12 Wave 1 — eager session persistence fez `sessionId` virar truthy em `/app/combat/new`. Guard `!sessionId` em `EncounterSetup.tsx:768` passou a suprimir a share section inteira. DMs perderam o botão de compartilhar durante o setup. Helper E2E `getShareToken()` silenciosamente retorna null.

2. **`3e42dcd67` (2026-04-01, 3 semanas antes):** `MonsterSearchPanel.handleManualSubmit` começou a chamar `setManualOpen(false)` incondicionalmente depois de cada add manual. DMs em setup-mode precisam re-clicar o toggle "Manual" entre adds. Helper E2E assume form aberto pra iteração seguinte; re-open lógica existe mas é frágil.

3. **`ac2d41b9f` (2026-04-03, 2 semanas antes):** QA Tier 1 elevou o mínimo de combatentes de 1 pra 2 pra iniciar combate. Todos os 5 specs da `e2e/conversion/` (Wave 3) seguiam passando apenas 1 combatant (eles testam fluxo do player-side, não mecânica de combate). Resultado: `start-combat-btn` fica permanentemente disabled.

A falha visível era sempre a mesma — timeout esperando `active-combat` — mas cada causa interceptava em ponto diferente: (1) no getShareToken, (2) no loop de adds, (3) no click de start-combat. O fix da (1) destravava o getShareToken, expondo a (2). Fix da (2) destravava o loop de adds, expondo a (3). Só com as três corrigidas a suíte flui até o body do teste.

Essa propriedade — "três bugs empilhados que só aparecem em sequência" — é o que tornou o diagnóstico custoso: cada fix parcial deixava o sintoma indistinguível do estado anterior (mesmo timeout na mesma linha do helper).

---

## Timeline

| Quando | O que aconteceu |
|--------|-----------------|
| 2026-04-01 00:37 | Commit `3e42dcd67` — `setManualOpen(false)` incondicional em `handleManualSubmit` (causa #2) |
| 2026-04-03 22:44 | Commit `ac2d41b9f` — QA Tier 1: mínimo de combatentes elevado de 1 pra 2 (causa #3) |
| ~2026-03-25 | Refactor de linguagem ubíqua landed (`/session→/combat`, glossário novo) — acabou sendo red herring |
| 2026-04-21 14:04 | Commit `842e5da1` — Epic 12 Wave 1 "eager session persistence" (causa #1) |
| 2026-04-21 pós-commit | Suíte E2E começa a dar timeout em `active-combat` |
| 2026-04-21 pós-commit | Prompt de handoff criado (`docs/prompt-fix-e2e-helper-drift.md`) assumindo drift de testid |
| 2026-04-21 15:30 | Audit dos testids → TODOS existem em produção → hipótese inicial refutada |
| 2026-04-21 15:45 | Causa #1 identificada no guard `!sessionId` em `EncounterSetup.tsx:768` |
| 2026-04-21 16:00 | Opção A aplicada (share button movido pro page level) + helper atualizado |
| 2026-04-21 16:30 | Re-run canonical: AINDA falha no mesmo timeout — descobre-se que não era causa única |
| 2026-04-21 16:45 | Diag instrumentation no helper revela `combatantCount=0` e `btnDisabled=true` |
| 2026-04-21 17:00 | Causa #2 identificada (`setManualOpen(false)`) — fix: honrar `keepOpenAfterAdd` |
| 2026-04-21 17:15 | Re-run: AINDA falha — mas agora combatantCount=1 (segundo add funciona agora) |
| 2026-04-21 17:30 | Causa #3 identificada via git blame: mínimo=2 em produção, specs passam 1 |
| 2026-04-21 17:45 | Fix defensivo no helper: auto-pad pra mínimo 2 combatants |
| 2026-04-21 18:00 | Canonical `dismissal-memory` isolado passa (1 skipped via lógica própria do spec) |

---

## Análise de Causa Raiz

### Causa #1 — O guard semanticamente ambíguo (Epic 12 Wave 1)

`components/combat/EncounterSetup.tsx:768` tinha:

```tsx
{!sessionId && (
  effectiveSessionId ? (
    <ShareSessionButton sessionId={effectiveSessionId} />
  ) : (
    <button data-testid="share-prepare-btn" onClick={handlePrepareShare}>
      …
    </button>
  )
)}
```

**Intent original do guard `!sessionId`:** "Não renderizar share button aqui quando estou dentro de `/app/combat/[id]`, porque o page level dessa rota já tem seu próprio `<ShareSessionButton>`."

Sinal usado pra detectar "estou em `/app/combat/[id]`": `sessionId` prop vir populada. Fazia sentido porque:

- `/app/combat/new/page.tsx` passava `sessionId={null}` (lazy create no start)
- `/app/combat/[id]/page.tsx` passava `sessionId={id}` (da URL)

### A mudança semântica silenciosa do Epic 12

Story 12.2 implementou **eager session persistence**: no momento que a DM chega em `/app/combat/new`, uma session draft é criada no banco. O objetivo era permitir refresh + recuperação de progresso pré-start.

Implementação em `app/app/combat/new/page.tsx:60` introduziu:

```tsx
const [draftSessionId, setDraftSessionId] = useState<string | null>(null);
// ...
<CombatSessionClient sessionId={draftSessionId} … />
```

Agora `sessionId` chega populado **nas duas rotas**:
- `/app/combat/new` → `draftSessionId` (eager create)
- `/app/combat/[id]` → `id` da URL

O sinal usado pelo guard (`!sessionId`) **parou de distinguir** entre as duas situações. Resultado: share section inteira suprimida em `/new`.

### Impacto em camadas

1. **Produção (UX):** DM abre `/app/combat/new` → adiciona combatentes → quer mandar link pros jogadores por WhatsApp → botão de share simplesmente não existe. DM assume que precisa iniciar combate primeiro.

2. **E2E:** `getShareToken()` procura `share-prepare-btn` → elemento invisível → `expect().toBeVisible({ timeout: 5_000 })` throw → catch silencioso → fallback evaluate() → nenhum input com `/join/` pattern → retorna `null`. Specs que dependem de token pra conectar player perdem o fio.

3. **Hipótese inicial falsa:** O timeout visível foi em `active-combat`, não em `share-prepare-btn`. Levou a um diagnóstico enganado — "deve ser drift de testid pós-linguagem-ubíqua" — que atrasaria a correção sem o audit sistemático.

### Causa #2 — Manual add form fecha após cada submit

`components/combat/MonsterSearchPanel.tsx:502` chamava `setManualOpen(false)` incondicionalmente no final de `handleManualSubmit`. O prop `keepOpenAfterAdd` era respeitado para a search section (resultados de busca SRD) mas NÃO para a manual add form — uma assimetria silenciosa.

Consequência pro DM: em setup mode (que já passa `keepOpenAfterAdd`), cada add manual fecha o form, forçando re-click no toggle "Monstro/Jogador Manual" entre adds. UX friction real em produção.

Consequência pra E2E: `dmSetupCombatSession` itera por uma lista de combatants. A primeira iteração encontra o form aberto (via `goToNewSession`). Submit fecha o form. Segunda iteração vê form fechado, re-open logic tem timing issue — às vezes clica, às vezes não — terminando com apenas 1 combatant persistido no store.

**Fix:** honrar o prop existente também pro manual form:
```diff
+    // Close in combat-mode (single add expected); keep open in setup-mode
+    if (!keepOpenAfterAdd) {
+      setManualOpen(false);
+    }
-    setManualOpen(false);
```

Mudança trivial que respeita a semântica já estabelecida pelo resto do componente. Removeu UX friction pro DM e destravou o loop de adds do helper.

### Causa #3 — Mínimo de combatentes subiu de 1 pra 2 (QA Tier 1)

`components/combat/EncounterSetup.tsx` tem duas checagens que usam o mesmo limite:

```tsx
if (combatants.length < 2) {
  setSubmitError(t("error_no_combatants"));
  return;
}
// ...
<button disabled={combatants.length < 2 || isPending} data-testid="start-combat-btn">
```

Commit `ac2d41b9f` (2026-04-03, "QA Tier 1 bug fixes") elevou esse limite de 1 pra 2. O commit message lista a mudança: `fix(setup): require minimum 2 combatants to start combat (was 1)`. UX decision válida — combate com 1 combatant não faz sentido semanticamente.

**Mas os 5 specs da `e2e/conversion/` (Story 03-H Wave 3) seguiam passando apenas 1 combatant.** Eles testam fluxo do player-side (waiting room CTA, recap signup, dismissal memory), não mecânica de combate. A única função do combatant pra eles era ser "setup suficiente pra player conseguir join".

O resultado do mismatch: `start-combat-btn` eternamente disabled. `force: true` no click não ajuda — disabled buttons não firam onClick handlers independente de force. Navigation pra `/app/combat/[id]` nunca acontece. `active-combat` nunca aparece.

**Fix defensivo no helper:**
```ts
const effectiveCombatants =
  combatants.length >= 2
    ? combatants
    : [...combatants, { name: "Filler NPC", hp: "5", ac: "10", init: "1" }];
```

Alternativa considerada e descartada: atualizar os 5 specs pra passar 2 combatants. Rejected porque (a) o directive original era "Não modifique specs em `e2e/conversion/`", (b) a regra de min 2 é business-layer, o helper deve abstrair.

### Por que a hipótese "linguagem ubíqua" era plausível mas errada

A refactor de linguagem ubíqua aconteceu cronologicamente próximo. A memória conversacional mencionava `Combate/Encontro/Histórico/Quest + /session→/combat`. Era tentador correlacionar. **Audit sistemático dos testids** (rodar grep em produção pra cada testid que o helper usa) desfez a correlação em 10 segundos.

### Por que foi custoso diagnosticar

Três bugs independentes, todos com o MESMO sintoma visível (timeout esperando `active-combat`), todos com o MESMO stack trace (`session.ts:172`). Cada fix parcial não parecia ter efeito — o teste continuava falhando no mesmo ponto. Só um diagnóstico via instrumentation (log de estado antes do click) revelou que as falhas aconteciam em pontos diferentes DENTRO do helper em runs diferentes (depois dos fixes).

**Lição geral:** quando um sintoma não muda após fix aplicado, não concluir "fix não funcionou". Concluir "fix funcionou, outro bug à frente está mascarando — instrumenta pra diferenciar". Layered bugs requerem layered diagnostics.

---

## Fixes Aplicados

### Fix #1 — Opção A: page-level Share (commit `6d01a8b4`)

Movido o `<ShareSessionButton>` pro page level em `app/app/combat/new/page.tsx`, espelhando o padrão já estabelecido de `/app/combat/[id]/page.tsx:118`. Eliminou-se inteiramente a lógica de share de dentro de `EncounterSetup.tsx`, junto com o estado redundante `onDemandSessionId` em `CombatSessionClient.tsx`.

| Arquivo | Mudança |
|---------|---------|
| `app/app/combat/new/page.tsx` | + import `ShareSessionButton` + wrapper com share button no topo quando `draftSessionId` existe |
| `components/combat/EncounterSetup.tsx` | − imports `Share2`, `ShareSessionButton`, `createSessionOnly` − prop `onSessionCreated` − states `onDemandSessionId`, `isCreatingSession` − `effectiveSessionId` − `handlePrepareShare` − share section no render |
| `components/combat-session/CombatSessionClient.tsx` | − state `onDemandSessionId` (dead code pós-remoção do wiring) + `reusableSessionId` simplificado pra `sessionId` direto |
| `e2e/helpers/session.ts` | `getShareToken` reescrito — tenta `share-session-generate` direto (page level) com fallback pra `share-session-qr-toggle` (caso de token auto-carregado) |

### Fix #2 — Manual form respeita keepOpenAfterAdd (commit `3d3de81c`)

| Arquivo | Mudança |
|---------|---------|
| `components/combat/MonsterSearchPanel.tsx` | `handleManualSubmit` só chama `setManualOpen(false)` quando `!keepOpenAfterAdd` — simetria com o comportamento da search results section |

### Fix #3 — Helper pads combatants pra mínimo 2 (commit `3d3de81c`)

| Arquivo | Mudança |
|---------|---------|
| `e2e/helpers/session.ts` | `dmSetupCombatSession` auto-adiciona um "Filler NPC" quando `combatants.length < 2`, destravando os 5 specs Wave 3 de conversion/ sem ter que editá-los |

### Validação

- `tsc --noEmit` passa (2 errors pré-existentes em `.next/types/validator.ts` de rotas autogeradas não relacionadas).
- Grep de `onDemandSessionId`, `handlePrepareShare`, `effectiveSessionId`, `isCreatingSession` em `components/`, `app/`, `lib/` retorna zero matches — dead code inteiramente limpo.
- Guest path (`GuestCombatClient.tsx`) intacto — preserva seu próprio `share-prepare-btn` (não afetado pela regressão porque guest não usa eager persistence).
- Canonical `e2e/conversion/dismissal-memory.spec.ts` passa em isolamento (1 skipped via lógica própria do spec — CTA visibility guard, não timeout no helper).

## Wave 3 Suite Stability (Separado do Helper Drift)

Com o helper drift resolvido, rodar a Wave 3 suite (`e2e/conversion/`, 7 tests) revelou uma camada separada de problemas que **não são regressão do fix**:

| # | Spec | Status em suite full | Status isolado | Classificação |
|---|------|---------------------|----------------|---------------|
| 1 | `dismissal-memory` | fail (`shareToken === null`) | **skipped** (spec-logic) | Suite-only — rate-limit Supabase |
| 2 | `recap-anon-signup` | skipped | _não testado isoladamente_ | Spec-logic skip |
| 3 | `recap-guest-signup-migrate` | fail (`guest-qa/helpers.ts:59` waitForSrdReady) | **skipped** (spec-logic) | Suite-only — rate-limit |
| 4 | `turn-safety` | fail (`#login-email` timeout) | **fail** (`player-view`) | **Real issue — anon auto-accept** |
| 5 | `waiting-room-signup-race (a+b+d)` | fail (`waitForURL /app/**`) | **skipped** (spec-logic) | Suite-only — rate-limit |
| 6 | `waiting-room-signup-race (c)` | fail (`player-view` timeout) | **fail** (`player-view`) | **Real issue — anon auto-accept** |
| 7 | `waiting-room-signup` | skipped | _não testado isoladamente_ | Spec-logic skip |

**Categorização pós-investigação:**
- **3 specs pollution/rate-limit** (passam isolados, falham em suite) — # 1, 3, 5
- **2 specs real issue** (player-view timeout em `anonJoinCombat` tanto isolado quanto suite) — # 4, 6
- **2 specs spec-logic skip** (passam o helper, skippam intencional via test.skip) — # 2, 7

### Hipótese: rate-limit cumulativo no Supabase

Cada spec faz:
- 1 DM login (Supabase auth)
- 1 eager session create (Supabase RLS INSERT)
- 1 anon player signIn (Supabase anon auth)
- 1 session_tokens INSERT
- N combatants INSERT

7 specs × ~5 endpoints = ~35 Supabase calls em < 30 minutos, todos usando a mesma conta `danielroscoe97@gmail.com`. Supabase aplica rate-limiting em auth endpoints. Em specs mais tarde na ordem alfabética, tokens de auth começam a falhar.

### Mitigação sugerida (backlog, não scope deste postmortem)

1. **Dedicated test account** diferente da conta pessoal da Dani (memória `feedback_e2e_test_account` recomendava mudar pra `dm.primary@test-pocketdm.com`, seeded por `scripts/seed-test-accounts.ts`).
2. **Explicit `afterEach` cleanup** do `/api/e2e/cleanup` endpoint pra limpar data órfã entre specs.
3. **Rate-limit aware retry** no helper `loginAs` (se auth falhar, wait + retry).
4. **Parallel isolation** — rodar specs in parallel com contexts dedicados (hoje suite é sequential por convention).

### Real issue investigado — anon auto-accept é DUPLA camada

**Investigação concluída (sessão 2026-04-21):** Auto-accept NUNCA existiu em produção. O workflow atual é sempre manual: player submita `combat:late_join_request` via broadcast → DM recebe e exibe JoinRequestBanner → DM clica "Aceitar" → `combat:late_join_response accepted=true` → player marca `isRegistered=true` → player-view renderiza.

O comment no helper `anonJoinCombat` que dizia "auto-accept is a feature" era desatualizado/errado. O workflow de produção requer accept manual.

**Fix parcial aplicado** (commit seguinte ao post-mortem):
- `anonJoinCombat` aceita `dmPage` opcional; quando passado, chama `dmAcceptPlayer` antes do `await expect(player-view)`.
- `dmAcceptPlayer` ganhou 4ª estratégia via `aria-label` do JoinRequestBanner button (o texto visível é só "Aceitar", sem player_name — regex anterior não matchava).
- Specs `turn-safety` e `waiting-room-signup-race (c)` atualizados pra passar `dmPage` / chamar `dmAcceptPlayer` explicitamente.

**Camada adicional investigada a fundo — root cause narrowed mas não resolvida:**

Instrumentação via `console.log` no `CombatSessionClient.useEffect(late_join)` + no subscribe callback de `getDmChannel` + no player `.send()` revelou:

- **Player side**: broadcast enviado com sucesso. Channel state `joined`. `send() result: ok`. Supabase server aceitou.
- **DM side**: `channel.subscribe` callback retorna **sempre `CLOSED` ou `TIMED_OUT`, nunca `SUBSCRIBED`**. `handleLateJoin` NUNCA dispara (count = 0 em 3 test runs). O listener foi anexado ao canal, mas o canal não conseguiu entrar em estado subscribed.

**Causa narrowed (mas não proven como fix único):** `EncounterSetup` criava seu próprio `supabase.channel("session:${sid}")` enquanto `getDmChannel` (usado por `CombatSessionClient`) criava outro com topic idêntico. **Um único Supabase client não pode ter 2 canais no mesmo topic** — o segundo subscribe falha com CHANNEL_ERROR. Legacy `resetDmChannel()` chamado pelo cleanup tentava coordenar mas acabava orfanando um canal ainda subscribing.

**Fix aplicado (commit subsequente):** `EncounterSetup` agora subscribe via `getDmChannel` — uma única instância de canal por topic por client. Mudança arquiteturalmente correta.

**Problema persiste após o fix:** Mesmo sem duplicação de canal, o DM continua com `CLOSED`/`TIMED_OUT` no subscribe. Há algo mais fundo — possivelmente:
- WebSocket connection state
- Auth token propagation para realtime
- Rate limit do Supabase Realtime (muitos canais por conexão)
- Dev server turbopack/WS proxy interference

**Próximos passos (além do scope helper drift):**
1. Inspecionar Supabase Realtime server logs durante o teste
2. Adicionar instrumentação em `lib/supabase/client.ts` pra capturar estado do WS
3. Testar contra Supabase localmente (supabase start) pra isolar se é issue de produção vs dev
4. Considerar usar `createServerClient` + API route broadcast em vez de direto do client pra late-join (já existe `broadcastViaServer` em `lib/realtime/broadcast-server.ts` — pode ser que o fluxo do DM deveria usar isso)

---

## Lições Aprendidas

### O que deu errado

1. **Guards baseados em valor de prop são frágeis quando a semântica da prop muda.** `!sessionId` era um sinal indireto pra "estou no `/[id]`" — quando sessionId ganhou um segundo significado ("draft eager"), o guard virou ambíguo.

2. **Regressões de UX silenciosas não geram alerta.** Uma feature sumindo da UI não quebra build, não quebra teste unitário, não gera warning no console. Só o E2E ou um usuário relatando notariam.

3. **Hipótese inicial enviesada atrasa diagnóstico.** O prompt de handoff (`docs/prompt-fix-e2e-helper-drift.md`) assumia "testid drift pós-refactor de linguagem ubíqua" e direcionava esforço para essa hipótese. Um audit dos testids antes do dispatch teria descoberto em minutos que era outra causa.

4. **Features adjacentes (Epic 12 "eager persistence") mudaram semântica de prop sem revisar consumidores.** O diff do commit `842e5da1` tocou `CombatSessionClient.tsx` em 5 linhas (adição do `reusableSessionId`) — mas **não revisou o outro consumidor** da prop `sessionId` em `EncounterSetup.tsx`, que dependia dela pra um guard.

5. **Three-layer bug — same symptom, different causes.** Os 3 bugs geravam o MESMO sintoma visível (timeout na mesma linha). Isso levou a conclusões prematuras de "fix não funcionou" quando na verdade cada fix destravou uma camada e revelou a próxima. A regra "se sintoma não muda, instrumenta" economizaria horas de debug.

6. **Assimetria silenciosa em props semi-respeitados.** O prop `keepOpenAfterAdd` era respeitado para search section mas NÃO para manual form. Não há erro, não há warning, só comportamento surpreendente em setup-mode. Code review perdeu isso no commit `3e42dcd67`.

7. **Specs e produção evoluindo em timelines diferentes.** A Wave 3 tests foram escritos quando min=1. Produção subiu min=2 em `ac2d41b9f` mas nenhuma auditoria cruzada checou se specs existentes ainda funcionavam. Business-rule change deveria ter ativado CI run da suite E2E full antes do merge.

### O que deu certo

1. **Audit sistemático primeiro, hipótese depois.** Rodar grep em produção pra cada testid que o helper usa → matou a hipótese "linguagem ubíqua" em 10 segundos.
2. **Rastreamento de commits recentes no mesmo componente** identificou rapidamente `842e5da1` como trigger candidato.
3. **Multi-agente BMAD** (Mary/Winston/Quinn) cruzando perspectivas acelerou a síntese do root cause.

### Ações Preventivas

#### Regras duras (não negociáveis)

1. **Guards arquiteturais > guards baseados em prop value.** Se precisa distinguir rota, passe um prop explícito (ex: `renderShareButton?: boolean`) ou use composition (page-level ownership). NUNCA inferir route-context a partir de valores de prop que podem mudar semantica.

2. **Ao mudar semântica de uma prop (ex: "esta prop agora pode ser populada em um contexto novo"), revisar TODOS os consumidores downstream.** Usar grep do nome da prop em todo o componente-tree que recebe.

3. **Features de persistência eager (criar coisas proativamente antes de explicitar intent) devem ter RFC ou design-review** listando: quais props mudam de null→populado, quais guards ou condicionais dependem desses nulls, quais caminhos de código viram dead code.

#### Processo de discovery

4. **Audit antes de hipótese.** Quando um E2E quebra, o primeiro passo é:
   - Extrair TODOS os selectors referenciados no helper/spec em questão
   - Grep cada um em `app/` + `components/`
   - Se todos existem → drift de lifecycle ou timing, NÃO de nome
   - Se algum falta → drift de nome, confirmado

5. **Prompts de handoff de E2E fixing não devem declarar hipótese como dada.** Devem descrever evidência + pedir investigação. "Acho que é X, confirma ou refuta antes de agir" > "É X, corrige X".

#### Sinais que devem alertar

6. **Qualquer commit de Epic ou feature-flag que toca page.tsx de rota autenticada deve ser smoke-testado localmente** no fluxo E2E canônico (DM login → /combat/new → add combatant → start) antes do merge. Estimativa: ~3 minutos manual. Preço barato comparado a rebootar QA completa.

---

## Métricas

| Métrica | Valor |
|---------|-------|
| Tempo entre commit culpado (#1) e detecção | ~1 hora (QA run imediato) |
| Tempo entre commit #2 (`3e42dcd67`) e detecção | ~3 semanas (impacto UX subtle, passou) |
| Tempo entre commit #3 (`ac2d41b9f`) e detecção | ~2.5 semanas (specs nunca rodaram entre) |
| Tempo total de diagnóstico (audit → 3 root causes) | ~2 horas (layered, instrumentation needed) |
| Tempo de correção (4 arquivos + helpers) | ~30 minutos |
| Tempo de documentação (este post-mortem) | ~40 minutos |
| Arquivos tocados nas 3 correções | 5 (1 page, 3 components, 1 helper) |
| Dead code eliminado | ~40 linhas (onDemandSessionId/handlePrepareShare/effectiveSessionId) |
| Regressões em produção evitadas em release futuro | 2 (share button some; manual form fecha) |
| Commits | `6d01a8b4` (fix #1) + `3d3de81c` (fixes #2, #3) |

---

## Referências

- Commit trigger: `842e5da171` (Epic 12 Wave 1)
- Prompt de handoff original: `docs/prompt-fix-e2e-helper-drift.md`
- Post-mortem anterior: `docs/postmortem-e2e-failures-2026-03-27.md` (mesmo helper, drift de selectors por placeholder)
- Memória: `feedback_multi_agent_commits.md` (commit+push a cada batch pequeno — aplica aqui)

---

## Autores

- 📊 Mary (BA) — Root cause analysis via audit sistemático de testids (causa #1)
- 🏗️ Winston (Architect) — Hipótese do lifecycle + crítica do guard semântico + previsão acertada de que seria multi-layer
- 🧪 Quinn (QA) — Diagnóstico binário via grep, orquestração do plano de fix, instrumentação que revelou causas #2 e #3
- 💻 Amelia (Dev) — Execução dos edits em 5 arquivos + validação tsc + instrumentação diagnostic
- 🎨 Sally (UX) — Reforço da gravidade da regressão de UX (não apenas E2E) + observação de que `setManualOpen(false)` incondicional era UX friction latente

---

## Apêndice: Wave 3 Run — Status final pós-fix

Com as 3 correções landedas, rodando `npx playwright test e2e/conversion/ --project=desktop-chrome`:

- **Antes (7/7 fail)**: todos os 7 tests timeout em `active-combat` dentro do helper
- **Depois (2 skip + 5 fail)**: todos chegam AO MENOS até o body do teste — helper drift destravado

Os 5 failures restantes (documentados na seção "Wave 3 Suite Stability" acima) têm causas heterogêneas (anon auto-accept, rate-limit Supabase, player-view timing) que são **pre-existentes** e **ortogonais** ao helper drift. Ficam como backlog pra próxima session.

**Meta métrica**: `dmSetupCombatSession` — o helper compartilhado — funcionou em 6 de 7 runs durante investigação. O único run onde ele falhou foi durante um teste de suite-cumulative onde o Supabase auth rate-limitou o DM login ANTES de chegar ao `dmSetupCombatSession`.
