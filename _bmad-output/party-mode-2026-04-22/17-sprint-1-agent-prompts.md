# 17 — Sprint 1 Agent Prompts · Campaign + Player Redesign (Grimório)

**Data:** 2026-04-24
**Sprint:** S1 (Wave 0 Consolidation + Infra)
**Duração:** 5 dias úteis
**Tracks:** A (features) + B (infra/enablement) em paralelo, cada um em worktree isolada

---

## 🛠️ Setup (fim de semana · ~15 min antes do kickoff)

```bash
cd "c:/Projetos Daniel/projeto-rpg"

# Garantir master atualizada
git checkout master && rtk git pull

# Criar worktrees + branches base
mkdir -p .claude/worktrees
git worktree add .claude/worktrees/agent-A -b feat/hq-redesign-sprint-1-track-a master
git worktree add .claude/worktrees/agent-B -b feat/hq-redesign-sprint-1-track-b master

# Verificar
git worktree list
```

**Vercel env vars (Dashboard Vercel → Settings → Environment Variables):**
- `NEXT_PUBLIC_PLAYER_HQ_V2=false` → Production
- `NEXT_PUBLIC_PLAYER_HQ_V2=true` → Preview
- `NEXT_PUBLIC_PLAYER_HQ_V2=true` → Development

**Ping Winston (async):**
> "Migrations `player_notes` + `level_up_invitations` chegam em ~5 semanas num PR combinado. Specs em `_bmad-output/party-mode-2026-04-22/PRD-EPICO-CONSOLIDADO.md §10`. Review async quando o PR abrir."

**Screenshots baseline do `/sheet` atual:**
Roda a app local, abre `/sheet` com uma campanha existente, screenshot das 7 tabs atuais, salva em `_bmad-output/party-mode-2026-04-22/screenshots/baseline-sheet-v1/`. Serve de comparação pra regressão visual posterior.

---

## 🅰️ PROMPT TRACK A — Wave 0 Consolidation (4 PRs)

> Cole o bloco abaixo na janela do Claude Code aberta em `.claude/worktrees/agent-A`:

```
Você é o Track A da Sprint 1 do Campaign + Player Redesign (codinome "Grimório") do Pocket DM.

## Contexto

- **Repo:** c:\Projetos Daniel\projeto-rpg (Next.js App Router / React 18 / TypeScript / Supabase / Tailwind / Playwright)
- **Worktree:** .claude/worktrees/agent-A
- **Branch base:** feat/hq-redesign-sprint-1-track-a (já criada e checkout)
- **Feature flag:** NEXT_PUBLIC_PLAYER_HQ_V2 (ainda não existe no código; Track B cria em paralelo — você não precisa dela nesta sprint)

## O que você vai entregar — Wave 0: EP-0 Consolidation

4 refactors de tech debt que DEVEM landar antes de qualquer feature do MVP, pra eliminar 3x conflito de merge nas waves 1-4. Zero mudança de comportamento — regressão zero em prod.

### PR 1 — SpellSlotGrid primitivo
- Extrair UI de slots de magia compartilhada entre components/player-hq/SpellSlotsHq.tsx e components/combat/SpellSlotTracker.tsx (são duplicados)
- Novo arquivo: components/ui/SpellSlotGrid.tsx
- Props: `{ used: number, max: number, onToggle?: (index: number) => void, variant: 'permanent' | 'transient' }`
- Comportamento atual preservado 100%; NÃO inverter semântica de dots ainda (isso é decision #37 que landa na Wave 3 com flag gate)
- Branch: feat/hq-redesign-ep0-spell-slot-grid (branchar de feat/hq-redesign-sprint-1-track-a)
- Substituir os 2 call sites (SpellSlotsHq + SpellSlotTracker) pelo componente novo no mesmo PR
- Unit tests: cobertura das 2 variants + onToggle + render sem crash
- Abrir PR pra master, merge quando verde

### PR 2 — Dot primitivo
- Extrair pattern de dot usado em: components/combat/CombatantRow.tsx:516-520 (reaction, transient), components/player-hq/ResourceDots.tsx:65 (permanent), savethrow/skill chips
- Novo arquivo: components/ui/Dot.tsx
- Props: `{ filled: boolean, variant: 'permanent' | 'transient', size?: 'sm' | 'md' | 'lg', onClick?: () => void, ariaLabel: string }`
- Semântica canônica documentada (PRD decision #37):
  - permanent: `○ = não tenho`, `● = tenho`
  - transient: `○ = disponível`, `● = gasto/usado`
- Por ora, apenas empacota; a inversão real do ResourceDots vem depois, flag-gated
- Branch: feat/hq-redesign-ep0-dot-primitive
- Unit tests + Storybook entry (se existe padrão de Storybook no repo; senão só tests)
- Abrir PR pra master

### PR 3 — Drawer primitivo
- 7 drawers do Player HQ compartilham pattern (SessionDrawer, ConditionDrawer, etc.) — ver 12-reuse-matrix.md §drawer family
- Extrair shell comum: overlay + slide-in + close button + trap focus + ESC-to-close
- Novo arquivo: components/ui/Drawer.tsx
- Props: `{ open: boolean, onClose: () => void, title: string, side?: 'right' | 'left' | 'bottom', children: ReactNode }`
- Migrar os 7 drawers existentes no mesmo PR (cada um vira children do Drawer novo)
- Branch: feat/hq-redesign-ep0-drawer-primitive
- Unit tests + a11y test (focus trap, ESC, overlay click)
- Abrir PR pra master

### PR 4 — HP status dedup
- HP status calculation tá duplicada em 3 lugares (ver 11-inventory-current-codebase.md)
- Consolidar tudo em lib/utils/hp-status.ts (arquivo fonte único de verdade já apontado em CLAUDE.md)
- Substituir call sites duplicados por imports do lib
- ZERO mudança de thresholds ou labels — só dedup
- Branch: feat/hq-redesign-ep0-hp-status-dedup
- Unit tests cobrindo todas as 5 tiers (FULL/LIGHT/MODERATE/HEAVY/CRITICAL)
- Abrir PR pra master

## Docs de referência (leia antes de começar)

1. _bmad-output/party-mode-2026-04-22/14-sprint-plan.md Sprint 1 Track A
2. _bmad-output/party-mode-2026-04-22/12-reuse-matrix.md §7 (consolidation tasks)
3. _bmad-output/party-mode-2026-04-22/11-inventory-current-codebase.md
4. _bmad-output/party-mode-2026-04-22/PRD-EPICO-CONSOLIDADO.md decision #37
5. CLAUDE.md

## Regras absolutas (CLAUDE.md)

- "Mestre", nunca "DM" em UI/comentários explicativos
- HP tiers em EN nos 2 locales (FULL/LIGHT/MODERATE/HEAVY/CRITICAL)
- Commit parity Guest/Anônimo/Autenticado em toda feature que toca combate
- Prefixar comandos com `rtk`

## Definition of Done (por PR)

- [ ] Código compila: `rtk tsc --noEmit`
- [ ] Lint passa: `rtk lint`
- [ ] Unit tests passam: `rtk vitest run [arquivo-afetado]`
- [ ] E2E existentes não regridem (rodar só os que tocam spell slots / drawers / HP)
- [ ] Nenhum feature flag necessário (são refactors internos)
- [ ] PR description cita o doc de referência + "closes EP-0.X"

## O que NÃO fazer

- NÃO começar features da Wave 1 (densidade, post-combate) — isso é Sprint 2
- NÃO inverter semântica de dots ainda — isso é flag-gated na Wave 3
- NÃO mexer em PlayerHqShell — isso é Track A da Sprint 3
- NÃO criar feature flag no código — Track B faz isso em paralelo

## Ordem de execução recomendada

PR 1 → PR 2 → PR 3 → PR 4 (serial dentro da sprint). Se alguma PR ficar travada em review, passa pra próxima; não batch mais de 2 PRs abertos simultâneos.

## Reportar no fim

Quando todos os 4 PRs estiverem merged, reportar:
- Sha dos 4 merges
- Screenshots antes/depois (dos 7 drawers migrados, visual regression zero)
- Unit test count adicionado
- Qualquer surpresa ou desvio do plano

Comece lendo os docs da seção "Docs de referência" e depois execute PR 1.
```

---

## 🅱️ PROMPT TRACK B — Infra + CI + E2E scaffold (3 PRs + 1 task opcional)

> Cole o bloco abaixo na janela do Claude Code aberta em `.claude/worktrees/agent-B`:

```
Você é o Track B da Sprint 1 do Campaign + Player Redesign (codinome "Grimório") do Pocket DM.

## Contexto

- **Repo:** c:\Projetos Daniel\projeto-rpg (Next.js App Router / React 18 / TypeScript / Supabase / Tailwind / Playwright)
- **Worktree:** .claude/worktrees/agent-B
- **Branch base:** feat/hq-redesign-sprint-1-track-b (já criada e checkout)
- **Feature flag:** NEXT_PUBLIC_PLAYER_HQ_V2 (você vai CRIAR esta sprint)

## O que você vai entregar — Infra + CI + E2E scaffold

Preparar toda a infraestrutura que Track A e Waves 2-4 vão depender. Landa ANTES ou EM PARALELO com PR 1 de Track A.

### Task 0 — Validação do flag name (5 min, primeira coisa)
- Rodar `rtk grep NEXT_PUBLIC_PLAYER_HQ_V4` em todo o repo
- Rodar `rtk grep NEXT_PUBLIC_PLAYER_HQ_V2` em todo o repo
- Se houver hits de V4 em código (não em docs), reportar imediatamente e PARAR — precisa alinhar com Dani
- Se zero hits de V4 no código, prosseguir com V2 como planejado (default)

### PR 1 — Feature flag library
- Criar lib/flags/player-hq-v2.ts com:
  ```
  export const PLAYER_HQ_V2_FLAG = 'NEXT_PUBLIC_PLAYER_HQ_V2' as const;
  export const isPlayerHqV2Enabled = () => process.env.NEXT_PUBLIC_PLAYER_HQ_V2 === 'true';
  ```
- Adicionar `NEXT_PUBLIC_PLAYER_HQ_V2=false` no `.env.example` com comentário explicativo
- Unit test: mock env var + verificar true/false/undefined cases
- Adicionar documentação breve em `docs/feature-flags.md` (ou criar se não existir) com:
  - Nome da flag
  - Onde usar (PlayerHqShell, routes /sheet, /journey, 3 conversion components)
  - Timeline de remoção (após Sprint 10)
  - Vercel env vars recomendados (prod=false, staging=true, preview=true)
- Branch: feat/hq-redesign-ep-infra-flag-lib
- NÃO usar a flag em código ainda — só criar a lib. Usuários aparecem na Sprint 2+

### PR 2 — CI parity gate
- Ajustar configuração do Playwright / GitHub Actions pra exigir que PRs que tocam rotas de combate tenham testes em Guest/Anônimo/Autenticado (os 3 modos do Combat Parity Rule em CLAUDE.md)
- Implementação sugerida: GHA workflow roda `.github/workflows/parity-check.yml` que detecta arquivos alterados em components/combat/, components/player/, components/guest/ e exige que a matriz de specs cubra os 3 modos
- Reference: _bmad-output/party-mode-2026-04-22/15-e2e-matrix.md §"Wave merge gates"
- Documentar no CONTRIBUTING.md (se existir) ou criar parity-check.md
- Branch: feat/hq-redesign-ep-infra-ci-parity
- Testar com PR de exemplo (abrir PR de teste que deliberadamente falha o gate, confirmar que bloqueia merge)

### PR 3 — E2E scaffolding pro /sheet
- Criar diretório e2e/player-hq/ com smoke test inicial:
  - `e2e/player-hq/sheet-smoke.spec.ts` — carrega /sheet com auth, verifica que 7 tabs renderizam (estado atual pre-refactor)
  - `e2e/player-hq/sheet-smoke-guest.spec.ts` — smoke test no /try (guest)
  - `e2e/player-hq/sheet-smoke-anon.spec.ts` — smoke test no /join/[token] (anon)
- Propósito: criar baseline de referência pra regression visual e funcional antes da Fase A começar
- Usar helpers existentes em e2e/helpers/ pra auth setup
- Rodar localmente: `rtk playwright test e2e/player-hq/`
- Branch: feat/hq-redesign-ep-infra-e2e-scaffold
- Abrir PR pra master

### Task 4 — Sprint 2 prep (se tiver tempo ao fim da sprint)
- Auditar recap-anon-signup.spec.ts e recap-guest-signup-migrate.spec.ts (15-e2e-matrix.md §"Parity gaps" os identifica como quebrados pela decision #43)
- Documentar o que precisa mudar (linhas exatas, assertions afetadas) em um issue/markdown — facilita Track A da Sprint 2

## Docs de referência (leia antes de começar)

1. _bmad-output/party-mode-2026-04-22/14-sprint-plan.md Sprint 1 Track B
2. _bmad-output/party-mode-2026-04-22/15-e2e-matrix.md (parity gaps + merge gates)
3. CLAUDE.md Combat Parity Rule + Resilient Reconnection + Vocabulário Ubíquo

## Regras absolutas (CLAUDE.md)

- "Mestre", nunca "DM"
- Prefixar comandos com `rtk`
- Sem commit sem review humano (Dani aprova merge)

## Definition of Done (por PR)

- [ ] Código compila: `rtk tsc --noEmit`
- [ ] Lint passa: `rtk lint`
- [ ] Testes passam onde aplicável
- [ ] PR description inclui:
  - Propósito
  - Docs referenciados
  - "closes EP-INFRA.X"
  - Instruções de teste manual se aplicável
- [ ] No-op em produção (flag OFF em prod = nenhum usuário afetado)

## Ordem de execução

Task 0 (grep) → PR 1 (flag lib) → PR 2 (CI parity) → PR 3 (E2E scaffold) → Task 4 (prep Sprint 2 se sobrar tempo)

## Reportar no fim

Quando todos PRs estiverem merged (ou Task 4 concluída/pulada), reportar:
- Sha dos merges
- Confirmação: flag lib funciona (screenshot de teste mostrando true/false)
- Confirmação: CI parity gate trigou um PR de teste
- Baseline E2E screenshots + video captures capturados
- Qualquer surpresa ou desvio do plano

Comece pela Task 0 (grep) e depois execute PR 1.
```

---

## 📋 Checklist final de kickoff

- [ ] Worktrees criadas (`.claude/worktrees/agent-A` e `.claude/worktrees/agent-B`)
- [ ] Branches base feitos (`feat/hq-redesign-sprint-1-track-a` e `-track-b`)
- [ ] Vercel env vars configurados
- [ ] Winston pingado
- [ ] Screenshots baseline capturados
- [ ] 2 janelas do Claude Code abertas nas worktrees respectivas
- [ ] Prompts colados
- [ ] Dani acompanha review de PRs quando aparecem

---

**End of file.** Próxima sprint: S2 = Density + Post-Combat (ver [14-sprint-plan.md §5.2](14-sprint-plan.md))
