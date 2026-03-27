# Sprint Execution Report: Estabilização & Simplificação

**Data:** 2026-03-27
**Origem:** Feedback do fundador via walkthrough completo (áudios + screenshot em `scripts/audiosv2/`)
**PRD:** `docs/prd-stabilization-simplification.md`
**Épicos:** `docs/epics-stabilization-simplification.md`

---

## Escopo Solicitado pelo Fundador

O fundador fez um walkthrough completo de 3 jornadas (visitante, mestre logado, jogador novo) e reportou:

1. **Bugs Críticos (Sprint 1):** Signup quebrado, F5 perde estado, join invisível, alias não aparece
2. **Limpeza UI (Sprint 2):** Header poluído, menu com 7+ itens, dificuldade gigante, iniciativa sem validação, cor HP crítico confusa
3. **Experiência (Sprint 3):** Histórico de rolagens, add combatente mid-combat, login/signup separados
4. **Bug visual:** Tag `{@h}` do 5e.tools aparecendo como texto literal nos stat blocks (4613 ocorrências)
5. **Futuros (E3-S4/S5):** Jogadores submetem iniciativa, botões bloqueados para visitante

---

## O Que Foi Implementado

### Sprint 1 — Desbloqueio Crítico (E1)

| Story | Descrição | Arquivos-chave |
|-------|-----------|----------------|
| E1-S1 | Fix signup: error handling específico + tradução de erros | `sign-up-form.tsx`, `translate-error.ts`, i18n |
| E1-S2 | Persistência F5: backup salva em setup, restore no load | `combat-store.ts`, `CombatSessionClient.tsx` |
| E1-S3 | Join request: state check + resetDmChannel | `broadcast.ts`, `EncounterSetup.tsx`, `PlayerJoinClient.tsx` |
| E1-S4 | Alias no setup: display_name visível | `CombatantSetupRow.tsx` |

### Sprint 2 — Limpeza & Simplificação (E2)

| Story | Descrição | Arquivos-chave |
|-------|-----------|----------------|
| E2-S1 | Header limpo: removidos FileShareButton, GMNotesSheet, ShareSession duplicado | `session/[id]/page.tsx`, `CombatSessionClient.tsx` |
| E2-S2 | Menu Compêndio: dropdown único com Monstros/Magias/Itens/Condições | `Navbar.tsx`, `NavbarWithSync.tsx`, `layout.tsx` |
| E2-S3 | Dificuldade compacta: badge inline | `CRCalculator.tsx`, `EncounterSetup.tsx` |
| E2-S4 | Validação iniciativa: obrigatória ao iniciar combate | `AddCombatantForm.tsx`, `EncounterSetup.tsx` |
| E2-S5 | Cor Critical HP: `bg-gray-900` → `bg-red-900` | `hp-status.ts`, `HPLegendOverlay.tsx` |

### Sprint 3 — Experiência Completa (E3)

| Story | Descrição | Arquivos-chave |
|-------|-----------|----------------|
| E3-S1 | Histórico de rolagens: DiceRollLog + integração com ClickableRoll events | NOVO `DiceRollLog.tsx`, `CombatSessionClient.tsx` |
| E3-S2 | Add combatente mid-combat: SRD search + manual | `CombatSessionClient.tsx` |
| E3-S3 | Login/signup separados: páginas dedicadas | `AuthPageContent.tsx`, `login/page.tsx`, `sign-up/page.tsx`, `page.tsx` |

### Bug Fix Adicional

| Bug | Descrição | Fix |
|-----|-----------|-----|
| `{@h}` tag | 4613 tags do 5e.tools renderizando como texto literal nos stat blocks | `fetch-5etools-bestiary.ts` (regex) + limpeza direta dos JSONs |

---

## QA & Code Review — Achados Corrigidos

### P0 (Crítico) — 3 corrigidos

| # | Issue | Fix |
|---|-------|-----|
| 1 | Invite token sem `encodeURIComponent()` na redirectUrl do signup | Adicionado `encodeURIComponent()` em `sign-up-form.tsx:54` |
| 2 | `player_character_id` não incluído no SELECT do Supabase | Adicionado ao SELECT em `session/[id]/page.tsx:47` |
| 3 | Fixtures de teste sem `player_character_id: null` | Adicionado em 3 arquivos de teste (CombatantRow, CombatSessionClient, EncounterSetup) |

### P1 (Alto) — 4 corrigidos

| # | Issue | Fix |
|---|-------|-----|
| 4 | HP Legend cor MODERATE: `bg-yellow-500` vs `bg-amber-400` | Corrigido para `bg-amber-400` em `HPLegendOverlay.tsx` |
| 5 | `saveCombatBackup` sem debounce (jank com muitos combatentes) | Debounce 500ms em `combat-store.ts` |
| 6 | `AddCombatantForm` usava `.replace("{n}")` manual ao invés de interpolação next-intl | Corrigido para `t("key", { n })` |
| 7 | 3 keys i18n faltando em `en.json` (clear_all, back_to_dashboard, manage_players_description) | Adicionadas ao `en.json` |

### Correções de Testes Pré-existentes — 11 suites corrigidas

| Suite | Problema | Fix |
|-------|----------|-----|
| `jest.config.ts` | Orchestrator tests (Vitest) rodando no Jest | Excluídos do Jest |
| `srd-loader.test.ts` | Cache de monstros vazava entre testes | `_clearMonsterCache()` no beforeEach |
| `sanitize.test.ts` | Esperava decode de entities (função não faz isso) | Corrigido expectation |
| `ConditionLookup.test.tsx` | Mock usava `getAllConditions` (renomeado para `getCoreConditions`) | Atualizado mock |
| `ConditionBadge.test.tsx` | aria-label esperava texto traduzido em vez de chave i18n | Atualizado para formato mock |
| `MonsterStatBlock.test.tsx` | ClickableRoll quebrava texto em elementos separados | Adicionado mock + assertions via textContent |
| `AccountDeletion.test.tsx` | Danger Zone colapsada — delete button invisível | Adicionado `expandDangerZone()` helper |
| `OnboardingWizard.test.tsx` | Wizard agora começa com tela "Choose" ao invés de Step 1 | Adicionado `goToCampaignFlow()` helper |
| `PlayerCharacterManager.test.tsx` | Esperava "—" para null spell_save_dc (componente não renderiza) | Corrigido assertion |
| `MonsterSearch.test.tsx` | aria-label esperava texto traduzido | Atualizado para formato mock |
| `EncounterSetup.test.tsx` | Supabase client + encounter name validation | Mock useFeatureGate + type encounter name |

---

## P2/P3 Não Corrigidos (backlog para futuro)

- CRCalculator popover sem Escape key handler
- Mobile menu drawer sem focus trap / aria-modal
- AddCombatantForm labels sem `htmlFor`/`id` programático
- Late-join listener acumulação de handlers (mitigado pelo flag `active`)
- `loadCombatBackup` pode restaurar dados stale sobre estado vazio legítimo (mitigado TTL 4h)
- Landing page hardcoded em PT (sem i18n)
- Login/signup pages quase idênticas (poderiam ser 1 componente)

---

## Status Final

| Métrica | Valor |
|---------|-------|
| **Build** | ✅ Passa |
| **Testes** | 41 suites, 558 testes — 100% passing |
| **Épicos concluídos** | E1 (4/4), E2 (5/5), E3 (3/5 — S4/S5 futuro) |
| **Bugs P0 corrigidos** | 3 |
| **Bugs P1 corrigidos** | 4 |
| **Testes pré-existentes corrigidos** | 11 suites |
| **SRD data fix** | 4613 tags `{@h}` removidas |

---

## Pendente para Sprint Futuro

- **E3-S4:** Jogadores submetem própria iniciativa via sessão compartilhada
- **E3-S5:** Botões bloqueados para visitante incentivando criação de conta
- **P2/P3:** Accessibility fixes (focus trap, aria labels, Escape handlers)
- **Visual testing:** Configurar Puppeteer MCP ou Playwright E2E para cobertura automatizada
