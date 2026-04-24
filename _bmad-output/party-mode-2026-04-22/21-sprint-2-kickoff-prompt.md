# Sprint 2 Kickoff Prompt — New Session

**Uso:** Copiar o bloco abaixo e colar como primeira mensagem em uma nova janela do Claude Code no repo `c:\Projetos Daniel\projeto-rpg`. Sessão nova assume o estado consolidado em 2026-04-23 e dispatcha Sprint 2 com janela de contexto fresca.

---

## Prompt (copiar tudo abaixo deste separador)

---

Você está assumindo uma sessão de execução no projeto **Pocket DM** (Next.js / TypeScript / Supabase / Tailwind / Playwright). O produto é um app de ajuda ao Mestre de RPG de mesa.

## Contexto da missão

Estamos no meio do projeto **Grimório (Campaign + Player Redesign)**. **Sprint 1 foi entregue ontem (2026-04-23) — 8 PRs merged, CI 100% verde.** Hoje é **Sprint 2 dispatch day**.

Sprint 2 = **Wave 1 do redesign** (EP-1 density quick wins + post-combate redirect). **Primeira sprint com UX impact** — o workflow de UX review (Sally + Piper) que foi definido é obrigatório aqui.

## Estado do repo (2026-04-23)

- `master` está em commit `8037c64f` com os 8 squashes da Sprint 1 (feature flag lib, CI parity gate, E2E baseline, Sprint 2 prep docs, SpellSlotGrid primitive, Dot primitive, Drawer primitive, HP fraction dedup)
- Sem worktrees. Sem branches feature abertas. Sem PRs abertos.
- `.github/pull_request_template.md` ativo com checkbox `ux-review-required` + label correspondente
- Vercel env `NEXT_PUBLIC_PLAYER_HQ_V2=true` em Preview/Dev; `false` em Production (confirmado na Sprint 1)
- CLAUDE.md regras imutáveis ativas: "Mestre" nunca "DM", HP tiers EN (FULL/LIGHT/MODERATE/HEAVY/CRITICAL), Combat Parity Rule, Resilient Reconnection Rule, SRD compliance, SEO canonical

## Docs OBRIGATÓRIOS pra ler ANTES de qualquer ação (nesta ordem)

1. `_bmad-output/party-mode-2026-04-22/19-sprint-2-agent-prompts.md` — **dispatch plan completo** (Track A + Track B prompts prontos pra colar, pre-flight checklist, specs atualizadas pós-UX calibration)
2. `_bmad-output/party-mode-2026-04-22/20-post-combat-screen-spec.md` — spec da Post-Combat Screen (A6)
3. `_bmad-output/party-mode-2026-04-22/08-design-tokens-delta.md` §13 (Header linha 2) + §14 (HP interaction pattern)
4. `_bmad-output/party-mode-2026-04-22/SESSION-HANDOFF-2026-04-24.md` — contexto macro do projeto
5. `CLAUDE.md` — skim pra regras imutáveis (Combat Parity, Mestre≠DM, HP tiers EN)

## Decisões travadas em 2026-04-23 party-mode (NÃO reabrir)

| Item | Decisão |
|---|---|
| Header A4 linha 2 | Recursos rápidos: `HD x/y · CD x/y · Insp x · [✨ Slots X/Y →]` |
| HP A5 pattern | Copiar `CombatantRow.tsx:540-587` canônico (inline number input, tap `44px sm:28px`). Botões `[−5/−1/+1/+5]` REMOVIDOS. |
| A5 escopo | **Combat Parity STRICT** agora — 3-mode E2E obrigatório (Auth /sheet + Anon /join + Guest /try) |
| A6 Post-Combat | Tela nova/modal full-screen, gold+neutral, **sem auto-dismiss**, sequência Combat → **Post-Combat** → Recap → Herói |
| Guest A6 | Mantém `/app/dashboard` (decision #43 preservada — sem campaign_id seeded) |
| Baselines visuais | **Track B item 0 OBRIGATÓRIO** antes de Track A começar |
| CI hex check | Sprint 3 follow-up (não bloqueante) |
| UX gate ativo | Sally (forma) + Piper (fogo real) aprovam antes de merge em **todo PR visual** da Wave 1+ |

## Sua missão nesta sessão

1. **Ler os 5 docs obrigatórios**
2. **Verificar estado git** — confirmar master em `8037c64f`, worktrees vazios, sem branches grimório
3. **Confirmar com Dani**: tudo certo pra criar worktrees + dispatchar Track B primeiro?
4. **Dispatch ordem travada**:
   - Track B PRIMEIRO → captura baselines visuais (FLAG OFF, desktop-chrome + mobile-safari) → commit + PR standalone → merge
   - Track A começa DEPOIS do merge dos baselines → A1 density tokens → A4 header rebase → A2 + A5 paralelos
   - Track B paralelamente: A3 perícias grid → A6 Post-Combat Screen → 9 E2Es Gate Fase A
5. **Monitor + review**: quando PRs abrirem, rodar code review adversarial (modelo da Sprint 1 — lancei 5 agents em paralelo, 1 por PR, com checklist CLAUDE.md + DoD). Lembrete: **todo PR visual precisa de label `ux-review-required`** e Dani aprova merge manualmente.
6. **Consolidar**: quando todos os PRs estiverem verdes, propor ordem de merge a Dani; resolver conflitos (Sprint 1 teve 1 conflito #38 vs #36 — usei `git checkout --theirs` em SpellSlotTracker).

## Regras absolutas (violação = rollback)

- **"Mestre", nunca "DM"** em UI / i18n / comentários / commits (exceção: code identifiers tipo `role='dm'`)
- **rtk em todos comandos** (inclusive em chains com `&&`)
- **NÃO merge autônomo** — Dani aprova todo merge (exceto baselines Track B0 que é docs-only)
- **NÃO force push** — se conflito, merge master na branch local, resolver, push normal
- **NÃO bypass hooks** (`--no-verify`) — se falha, investigar raiz
- **Linkar wireframe na PR description** é obrigatório pra PRs visuais
- **Label `ux-review-required`** em todo PR visual

## Ordem crítica

Track B **NÃO** pode ser lançado em paralelo com Track A. **Serial obrigatório**: Track B baselines → merge → Track A dispatch.

## Memória persistente (já carregada automaticamente)

Ver `c:\Users\dani_\.claude\projects\c--Projetos-Daniel-projeto-rpg\memory\MEMORY.md`. Pontos-chave pra esta sessão:
- `feedback_executar_sem_pedir_permissao.md` — pular "quer que eu faça X?" no fim de cada resposta, executar direto
- `feedback_adversarial_review_default.md` — 3-reviewer adversarial é default pra features não-triviais
- `feedback_worktree_cleanup.md` — worktrees acumulam; cleanup seguro ao fim
- `project_hq_redesign_nomenclatura.md` — nome canônico, codinome, slug, flag

## Ação imediata (começa por aqui)

```bash
# 1. Verificar estado
cd "c:/Projetos Daniel/projeto-rpg"
rtk git status
rtk git log --oneline -5
rtk git worktree list

# 2. Ler os docs
# (usar Read tool nos 5 docs listados acima)

# 3. Reportar pra Dani:
#    - "Estado confirmado: master @ 8037c64f, 0 worktrees, 0 PRs abertos"
#    - "Decisões Sprint 2 lidas e absorvidas"
#    - "Pronto pra criar worktrees + dispatchar Track B. OK?"
```

Depois de Dani confirmar, executar pre-flight §1-§3 do `19-sprint-2-agent-prompts.md`, dispatchar Track B, aguardar baselines mergear, depois dispatchar Track A.

---

## Fim do prompt (copiar até aqui)

---

## Notas de uso

- **Não inclua este "Notas de uso" quando copiar** — é só pro Dani.
- O prompt acima assume que a nova sessão tem acesso aos mesmos arquivos (mesmo repo, mesma machine). Memory.md carrega automaticamente.
- Se a nova sessão tiver dúvida sobre alguma decisão, o doc `19-sprint-2-agent-prompts.md` é o source of truth. `20-post-combat-screen-spec.md` é o source para A6. `08-design-tokens-delta.md` §13/§14 é source pra A4/A5.
- Sessão atual (que gerou este prompt) permanece disponível se precisar esclarecer algo — posso ser consultado via SendMessage ou nova invocação.
