# Postmortem: E2E Helper Drift — Share Button Hidden by Guard Regression

**Data:** 2026-04-21
**Severidade:** Alta (suíte E2E completa bloqueada + regressão UX em produção)
**Impacto em produção:** DMs autenticados perderam a capacidade de compartilhar link durante o setup de combate em `/app/combat/new`. Descoberto pela E2E, não por usuário — blast radius em beta limitado.
**Status:** RESOLVIDO

---

## Resumo Executivo

Durante execução da QA Wave 3 (commit `da219f13`), o helper `dmSetupCombatSession` em `e2e/helpers/session.ts` começou a dar timeout aguardando `[data-testid="active-combat"]`. A suspeita inicial apontava para drift da recente refactor de linguagem ubíqua (Combate/Encontro/Histórico/Quest + rota `/session→/combat`).

**A hipótese estava errada.** O audit revelou que **TODOS os testids que o helper referencia ainda existem na produção**. A verdadeira causa raiz foi **uma regressão de UX em produção**, introduzida pelo commit `842e5da1` (Epic 12 Wave 1 — eager session persistence), que fez o `ShareSessionButton` e o `share-prepare-btn` sumirem da rota `/app/combat/new` por causa de um guard que deixou de ser semanticamente correto.

A regressão ficou invisível porque a share section simplesmente não renderiza — não há erro visível, nem warning, nem alerta. DMs que buscam compartilhar o link durante o setup encontram o botão ausente e presumem que precisam iniciar o combate antes. Os E2E, por dependerem do `share-prepare-btn`, foram o primeiro sinal de algo errado.

---

## Timeline

| Quando | O que aconteceu |
|--------|-----------------|
| ~2026-03-25 | Refactor de linguagem ubíqua landed (`/session→/combat`, glossário novo) |
| 2026-04-21 14:04 | Commit `842e5da1` — Epic 12 Wave 1 "eager session persistence" |
| 2026-04-21 pós-commit | Suíte E2E começa a dar timeout em `active-combat` |
| 2026-04-21 pós-commit | Prompt de handoff criado (`docs/prompt-fix-e2e-helper-drift.md`) assumindo drift de testid |
| 2026-04-21 15:30 | Audit dos testids → TODOS existem em produção → hipótese inicial refutada |
| 2026-04-21 15:45 | Root cause identificada no guard `!sessionId` em `EncounterSetup.tsx:768` |
| 2026-04-21 16:00 | Opção A aplicada (share button movido pro page level) + helper atualizado |

---

## Análise de Causa Raiz

### O guard semanticamente ambíguo

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

### Por que a hipótese "linguagem ubíqua" era plausível mas errada

A refactor de linguagem ubíqua aconteceu cronologicamente próximo. A memória conversacional mencionava `Combate/Encontro/Histórico/Quest + /session→/combat`. Era tentador correlacionar. **Audit sistemático dos testids** (rodar grep em produção pra cada testid que o helper usa) desfez a correlação em 10 segundos.

---

## Fix Aplicado (Opção A — page-level Share)

Movido o `<ShareSessionButton>` pro page level em `app/app/combat/new/page.tsx`, espelhando o padrão já estabelecido de `/app/combat/[id]/page.tsx:118`. Eliminou-se inteiramente a lógica de share de dentro de `EncounterSetup.tsx`, junto com o estado redundante `onDemandSessionId` em `CombatSessionClient.tsx`.

### Arquivos tocados

| Arquivo | Mudança |
|---------|---------|
| `app/app/combat/new/page.tsx` | + import `ShareSessionButton` + wrapper com share button no topo quando `draftSessionId` existe |
| `components/combat/EncounterSetup.tsx` | − imports `Share2`, `ShareSessionButton`, `createSessionOnly` − prop `onSessionCreated` − states `onDemandSessionId`, `isCreatingSession` − `effectiveSessionId` − `handlePrepareShare` − share section no render |
| `components/combat-session/CombatSessionClient.tsx` | − state `onDemandSessionId` (dead code pós-remoção do wiring) + `reusableSessionId` simplificado pra `sessionId` direto |
| `e2e/helpers/session.ts` | `getShareToken` reescrito — tenta `share-session-generate` direto (page level) com fallback pra `share-session-qr-toggle` (caso de token auto-carregado) |

### Validação

- `tsc --noEmit` passa (2 errors pré-existentes em `.next/types/validator.ts` de rotas autogeradas não relacionadas).
- Grep de `onDemandSessionId`, `handlePrepareShare`, `effectiveSessionId`, `isCreatingSession` em `components/`, `app/`, `lib/` retorna zero matches — dead code inteiramente limpo.
- Guest path (`GuestCombatClient.tsx`) intacto — preserva seu próprio `share-prepare-btn` (não afetado pela regressão porque guest não usa eager persistence).

---

## Lições Aprendidas

### O que deu errado

1. **Guards baseados em valor de prop são frágeis quando a semântica da prop muda.** `!sessionId` era um sinal indireto pra "estou no `/[id]`" — quando sessionId ganhou um segundo significado ("draft eager"), o guard virou ambíguo.

2. **Regressões de UX silenciosas não geram alerta.** Uma feature sumindo da UI não quebra build, não quebra teste unitário, não gera warning no console. Só o E2E ou um usuário relatando notariam.

3. **Hipótese inicial enviesada atrasa diagnóstico.** O prompt de handoff (`docs/prompt-fix-e2e-helper-drift.md`) assumia "testid drift pós-refactor de linguagem ubíqua" e direcionava esforço para essa hipótese. Um audit dos testids antes do dispatch teria descoberto em minutos que era outra causa.

4. **Features adjacentes (Epic 12 "eager persistence") mudaram semântica de prop sem revisar consumidores.** O diff do commit `842e5da1` tocou `CombatSessionClient.tsx` em 5 linhas (adição do `reusableSessionId`) — mas **não revisou o outro consumidor** da prop `sessionId` em `EncounterSetup.tsx`, que dependia dela pra um guard.

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
| Tempo entre commit culpado e detecção | ~1 hora (QA run imediato) |
| Tempo de diagnóstico (audit → root cause) | ~15 minutos |
| Tempo de correção (edit + tsc) | ~10 minutos |
| Tempo de documentação (este post-mortem) | ~20 minutos |
| Arquivos tocados na correção | 4 (1 page, 2 components, 1 helper) |
| Dead code eliminado | ~40 linhas (onDemandSessionId/handlePrepareShare/effectiveSessionId) |
| Regressões em produção evitadas em relase futuro | 1 (share button some) |

---

## Referências

- Commit trigger: `842e5da171` (Epic 12 Wave 1)
- Prompt de handoff original: `docs/prompt-fix-e2e-helper-drift.md`
- Post-mortem anterior: `docs/postmortem-e2e-failures-2026-03-27.md` (mesmo helper, drift de selectors por placeholder)
- Memória: `feedback_multi_agent_commits.md` (commit+push a cada batch pequeno — aplica aqui)

---

## Autores

- 📊 Mary (BA) — Root cause analysis via audit sistemático de testids
- 🏗️ Winston (Architect) — Hipótese do lifecycle + crítica do guard semântico
- 🧪 Quinn (QA) — Diagnóstico binário via grep, orquestração do plano de fix
- 💻 Amelia (Dev) — Execução dos edits em 4 arquivos + validação tsc
- 🎨 Sally (UX) — Reforço da gravidade da regressão de UX (não apenas E2E)
