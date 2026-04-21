# Prompt para próxima sessão — Follow-ups pós 2026-04-21

Copy-paste o bloco abaixo numa nova sessão do Claude Code. Ele é autocontido: a IA pega todo o contexto dos docs referenciados sem precisar de perguntas.

---

## Contexto inicial (para a IA ler primeiro)

Sessão anterior (2026-04-21) fechou a sprint "Linguagem Ubíqua + melhorias" com QA completo via Playwright em prod + fixes de 2 bugs críticos descobertos no meio do QA. Estado atual: prod verde, zero pendências bloqueantes.

**Leia primeiro, nessa ordem:**

1. [docs/qa-playwright-run-2026-04-21.md](qa-playwright-run-2026-04-21.md) — QA Run #1, validou 11 commits da sprint
2. [docs/qa-playwright-run-2-2026-04-21.md](qa-playwright-run-2-2026-04-21.md) — QA Run #2 (follow-ups + bugs descobertos)
3. [docs/bugfix-join-code-validator-drift-2026-04-21.md](bugfix-join-code-validator-drift-2026-04-21.md) — postmortem do Bug #1 (regex drift)
4. [docs/QA-SPRINT-2026-04-21.md](QA-SPRINT-2026-04-21.md) — escopo original da sprint

**Convenções do repo (aplicar sempre):**
- Commits em português quando for user-facing, inglês quando for tech interno; mensagem com **why** > **what**
- `rtk` prefix em todos comandos (`rtk git add`, `rtk tsc --noEmit`, etc) — ver `CLAUDE.md`
- Commit trailer `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`
- Migrations numeradas sequencialmente em `supabase/migrations/` — última foi `175_player_characters_fk_set_null.sql`
- **Combat Parity Rule** e **Resilient Reconnection Rule** são imutáveis — ler `CLAUDE.md` se alterar combat flow
- **SRD Content Compliance** — NUNCA expor conteúdo não-SRD em páginas públicas; SEO canonical é apex `pocketdm.com.br`
- i18n em `messages/pt-BR.json` e `messages/en.json` — ambos os locales sempre

**Contas de teste (acesso já configurado):**
- DM: `adventure.br.games@gmail.com` / `Eusei123*`
- Player: `danielroscoe97@gmail.com` / `Eusei123*` (⚠️ conta principal do user — evitar destruição)
- Supabase linked via `npx supabase db query --linked` (projeto `mdcmjpcjkqgyxvhweoqs`)
- Vercel linked via `npx vercel` (`.vercel/` já configurado)

---

## Plano de trabalho — 10 itens em 4 batches

### 🟢 Batch 1 — Blindagem anti-drift (MÉDIO, ~45min, 1 commit)

Prevenir a próxima recorrência do bug que ficou 45min pra diagnosticar ontem. Recomendação direta do postmortem.

**1.1. Centralizar `JOIN_CODE_RE`**
- Criar `lib/validation/join-code.ts` exportando:
  - `export const JOIN_CODE_RE = /^[0-9A-F]{8}$/i;`
  - JSDoc explicando que o charset é contrato com o generator SQL em `create_campaign_with_settings` (migration 122); mudança em um lado exige o outro.
- Importar em **todos 3 sites** que hoje têm cópias independentes:
  - [`app/join-campaign/[code]/actions.ts`](../app/join-campaign/%5Bcode%5D/actions.ts) — remove const local, `import { JOIN_CODE_RE }`
  - [`lib/supabase/proxy.ts:159`](../lib/supabase/proxy.ts#L159) — substitui inline regex
  - [`app/auth/confirm/route.ts:109`](../app/auth/confirm/route.ts#L109) — substitui inline regex
- Grep `A-Z2-9` e `0-9A-F.*8` em `app/` e `lib/` após pra confirmar zero duplicações.

**1.2. Unit test do invariante charset**
- Arquivo: `lib/validation/__tests__/join-code-charset.test.ts`
- Caso 1: `JOIN_CODE_RE` aceita todos os 16 chars hex uppercase individualmente (loop de `[0-9A-F]`).
- Caso 2: sample de 1000 códigos gerados localmente com `crypto.randomBytes` + `.toString('hex').slice(0,8).toUpperCase()` — todos devem passar `JOIN_CODE_RE.test(code)`.
- Caso 3: códigos inválidos (lowercase, 7 chars, 9 chars, caracteres fora de `[0-9A-F]`) devem falhar.
- Rodar `npx jest lib/validation/__tests__/join-code-charset.test.ts` — esperado 3/3 passing.

**1.3. Comentário de contrato no SQL generator**
- Migration nova (176_join_code_charset_contract_comment.sql): só adiciona COMMENT na função `create_campaign_with_settings` documentando que `v_join_code` emite `[0-9A-F]` e que `lib/validation/join-code.ts` é a fonte client-side.
- Pure-docs migration, zero impacto runtime.

**Commit único:** `chore(validation): centralize JOIN_CODE_RE + test charset invariant`

**Validação de sucesso:** tsc clean, jest passa, grep `A-Z2-9` retorna zero matches em `app/` e `lib/`.

---

### 🟡 Batch 2 — Sentry enrichment (MÉDIO, ~30min, 1 commit)

Fazer o próximo bug de server action levar 5min pra diagnosticar em vez de 45min. O Sentry de ontem stripou "Código inválido" e mostrou só "An error occurred in the Server Components render" — tivemos que adicionar `console.log` temporário + rodar `npx vercel logs` pra descobrir.

**2.1. Helper `withActionInstrumentation`**
- Arquivo: `lib/errors/with-action-instrumentation.ts`
- Exporta função wrapper:
  ```ts
  export function withActionInstrumentation<TArgs extends unknown[], TResult>(
    actionName: string,
    fn: (...args: TArgs) => Promise<TResult>,
  ): (...args: TArgs) => Promise<TResult>
  ```
- No catch, re-throw mas antes loga via `console.error` **preservando a mensagem original** (não sanitizada) para aparecer em Vercel runtime logs.
- Tags via `captureError` existente em `lib/errors/capture` com `{ component: actionName, action: 'entry' }`.

**2.2. Aplicar em `acceptJoinCodeAction`**
- Em `app/join-campaign/[code]/actions.ts`, wrappar o export:
  ```ts
  export const acceptJoinCodeAction = withActionInstrumentation(
    "acceptJoinCodeAction",
    async (data: JoinCampaignData): Promise<AcceptJoinCodeResult> => { ... }
  );
  ```
- Zero mudança no corpo da função.

**2.3. Documentar o padrão**
- `docs/patterns-server-action-error-handling.md` — quando usar o wrapper, como ler os logs, exemplo de output esperado.

**Não aplicar em TUDO agora** — só acceptJoinCodeAction como piloto + o padrão documentado pra ser adotado incrementalmente conforme outros actions forem tocados.

**Commit:** `feat(errors): withActionInstrumentation helper + apply to join flow`

**Validação:** Simular falha (regex quebrado de novo propositalmente, depois revert) + ver se a mensagem real aparece em `npx vercel logs`. Revert o teste de regressão.

---

### 🔴 Batch 3 — Gap técnico NPC auto-link (ALTO, ~1.5h, 1 commit)

Bug UX real: usuário digita `@Gandalf` numa nota, espera que o chip "Gandalf" apareça em "NPCs Relacionados" (igual Location/Faction/Quest fazem). Atualmente não aparece — precisa clicar "Vincular NPC" manualmente. Usuário não sabe dessa inconsistência, pensa que `@mention` é cosmético pra NPC.

**Contexto do código (já investigado na sessão anterior):**
- `syncTextMentions` em [lib/supabase/entity-links.ts:201](../lib/supabase/entity-links.ts#L201) trata os 4 tipos iguais, popula tabela `entity_links`.
- Chips de **Location/Faction/Quest** leem de `entity_links` via `mentionsByNote` — por isso auto-linkam.
- Chips de **NPC** leem de `note_npc_links` (**tabela legacy**) via `linksByNote` — NÃO populada por `syncTextMentions`. Só `handleLinkNpc` ([components/campaign/CampaignNotes.tsx:495-548](../components/campaign/CampaignNotes.tsx#L495)) faz dual-write.

**3.1. Escolher abordagem** (decidir antes de implementar):
- **Opção A (mais simples):** mirror-write em `syncTextMentions` — quando processa um edge de tipo `npc`, também insere/deleta em `note_npc_links`. Mantém dual-table architecture. Risco de drift futuro.
- **Opção B (mais limpo):** migrar UI NPC chips pra ler de `entity_links`, deprecar `note_npc_links`. Requer migration + múltiplos consumers (`linkedNpcIds`, `getCampaignNoteNpcLinks`, etc). Mais trabalho, elimina dívida.

Recomendo **Opção A** pra essa wave — fix imediato, dívida de migração fica pra próxima sprint.

**3.2. Implementar Opção A**
- Em `syncTextMentions` ([lib/supabase/entity-links.ts:201](../lib/supabase/entity-links.ts#L201)):
  - Para cada `added` com `ref.type === "npc"`: `await supabase.from("note_npc_links").insert({ note_id: source.id, npc_id: ref.id }).select().maybeSingle();` (idempotent — `23505` retorna silencioso).
  - Para cada `removed` com target_type `npc`: deletar row correspondente em `note_npc_links`.
- Adicionar comment explicando que é mirror-write pra dual-table legacy, e que a próxima sprint deve deprecar `note_npc_links`.

**3.3. Testar**
- Criar nota DM com `@Gandalf` — esperado: chip "Gandalf" aparece em "NPCs Relacionados" sem precisar clicar Vincular.
- Remover `@Gandalf` do texto — esperado: chip desaparece.
- Unit test: `syncTextMentions` com ref NPC popula `note_npc_links`.
- Validar em prod via Playwright: criar nota, digitar @NPC, confirmar chip aparece auto.

**3.4. Validar que AC-3c-04 (undo) continua funcionando**
- Criar nota, vincular 3 NPCs via @mention, unlink um via X do chip, verificar toast "Desfazer" + click funciona.

**Commit:** `fix(entity-graph): auto-populate note_npc_links on @mention parse`

**Abrir issue:** "Deprecar `note_npc_links` legacy table" — próxima wave, refactor maior.

---

### 🔵 Batch 4 — Follow-ups documentados (BAIXO, triagem rápida, N commits)

Itens que foram registrados mas precisam decisão de produto antes de virar código.

**4.1. Combat parity guest `/try` share button** (~20min de validação)
- Rodar QA rápido em `/try` (combate guest) — botão "Compartilhar Combate" existe e dispara dialog?
- Se faltar: mini-fix seguindo padrão do `/app/combat/new` já validado no Run #1 (Fase 3.3)
- Se estiver lá: nada a fazer, só documentar no Run #3 doc

**4.2. Deprecar `campaign_invites` email flow** (decisão de produto)
- Ler [docs/diagnostic-campaign-invites-zero-accept.md](diagnostic-campaign-invites-zero-accept.md)
- User precisa decidir: remove, ou mantém e tenta melhorar? Zero % de accept em 30 dias é evidência forte de remover.
- Se decidir remover: ticket separado (migration drop tabela + remove routes + remove UI)

**4.3. Vercel preview com `NEXT_PUBLIC_E2E_MODE=true`** (ops setup)
- Configurar Vercel project env `NEXT_PUBLIC_E2E_MODE=true` só em preview deploys (não em production).
- Destravaria ~26 E2E specs que hoje ficam skipped porque `window.__pocketdm_supabase` só é exposto com essa flag.
- Requer: UI do Vercel dashboard ou `vercel env add NEXT_PUBLIC_E2E_MODE preview`.
- Validação: um preview deploy com a flag e rodar `npx playwright test e2e/features/entity-graph-chip-navigation.spec.ts --project=desktop-chrome` apontando pra ele.

**4.4. Coverage gap ACs** — ACs documentados como "uncovered" no [docs/QA-SPRINT-2026-04-21.md](QA-SPRINT-2026-04-21.md): 3b-06, 3b-09, 3b-10, 3c-05, 3e-05, REG-03. Investigar um por um, gerar E2E test ou marcar como WONTFIX.

**4.5. SPEC retention fix** — dois bugs pequenos documentados no mesmo QA doc (§2.3 syntax + `campaigns.deleted_at` não existe). Docs-only, ~15min.

**4.6. Mobile note expanded scroll horizontal** — known issue pre-existente, chip container não wrapa em viewport < 400px. Ticket UX separado se worth fixing.

---

## Ordem de execução recomendada

1. **Batch 1** primeiro (infra/prevenção, não bloqueia nada, ganho permanente)
2. **Batch 2** (helper Sentry — constrói em cima do Batch 1)
3. **Batch 3** (NPC auto-link — user-facing, valor imediato)
4. **Batch 4** triagem: fazer 4.1 (quick) e 4.5 (docs-only) se sobrar tempo; 4.2, 4.3, 4.4, 4.6 viram tickets separados com dono.

**Meta mínima da sessão:** fechar Batch 1 + Batch 3. Isso blinda o bug que repetiu ontem + fecha a inconsistência user-facing mais irritante.

**Meta ideal da sessão:** Batches 1-3 + triagem 4.1/4.5. Comunicar ao user as decisões pendentes (4.2 deprecação email, 4.3 ops Vercel).

---

## Entregas esperadas ao final

- Commits limpos, passando tsc + CI
- Screenshots de validação em prod (via Playwright MCP) em `.claude/qa-run-<DATA>/`
- Postmortem/followup docs em `docs/` se algum batch revelar outro bug
- Relatório consolidado no final da sessão com (a) o que fechou, (b) o que ficou aberto, (c) o que decidiu com user
