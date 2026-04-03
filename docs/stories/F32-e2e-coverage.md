# F-32 — E2E Tests Coverage

**Epic:** Tech Debt — Qualidade e Confiança  
**Prioridade:** Alta (fundação para deploys seguros)  
**Estimativa:** 5 SP  
**Dependência:** Nenhuma — infraestrutura Playwright já instalada e configurada  
**Arquivos principais:** `e2e/`, `playwright.config.ts`, `.github/workflows/e2e.yml`

---

## Status Atual (2026-04-03)

A infraestrutura E2E está **completa mas não validada**:

| Camada | Estado |
|--------|--------|
| Playwright instalado (`^1.58.2`) | ✅ |
| `playwright.config.ts` configurado | ✅ |
| CI workflow `.github/workflows/e2e.yml` | ✅ criado |
| Helpers: `auth.ts`, `combat.ts`, `db.ts`, `session.ts` | ✅ |
| Test fixtures: `test-accounts.ts` | ✅ |
| Test files (30+ specs cobrindo J1–J17) | ✅ escritos |
| **Último run local confirmado green** | ❌ **nunca rodou contra servidor real** |
| **Secrets configurados no GitHub Actions** | ❌ **`NEXT_PUBLIC_SUPABASE_URL` ausente** |
| **CI passando no repositório** | ❌ **workflow pula por falta de secrets** |

**Problema central:** Os testes existem e são corretos conceitualmente, mas nunca foram executados contra um servidor rodando com Supabase real. É provável que alguns seletores `data-testid` estejam desatualizados em relação ao código atual.

---

## O que Precisa Ser Feito

### Etapa 1 — Audit de seletores (1 SP)

Verificar se os `data-testid` usados nos specs existem no código atual. O código mudou bastante desde que os testes foram escritos.

**Comando para verificar um selector:**
```bash
grep -r "data-testid=\"encounter-name-input\"" components/ app/
```

**Specs prioritários para auditar** (caminho crítico):
```
e2e/journeys/j1-first-combat.spec.ts     → DM login + criar combate
e2e/journeys/j2-player-join.spec.ts      → Player join via link
e2e/combat/player-join.spec.ts           → Auto-join + reconnect
e2e/combat/turn-advance.spec.ts          → Avançar turno, duplicação
e2e/journeys/guest-try-mode.spec.ts      → /try DM guest
```

Para cada seletor que falhar: ou adicionar `data-testid` no componente correto, ou corrigir o seletor no spec.

### Etapa 2 — Rodar localmente contra servidor real (2 SP)

```bash
# Terminal 1: servidor local
npm run dev

# Terminal 2: testes
npx playwright test --project=desktop-chrome e2e/journeys/j1-first-combat.spec.ts
```

**Requisitos:**
- `.env.local` com credenciais Supabase reais (staging ou prod)
- Contas de teste existentes (`docs/test-accounts.md`)
- Primeiro rodar os specs menores/isolados, depois os de jornada

**Critério de sucesso:** Os 5 specs prioritários passam localmente sem falha.

### Etapa 3 — Configurar secrets no GitHub (1 SP)

No repositório GitHub → Settings → Secrets → Actions, adicionar:

```
NEXT_PUBLIC_SUPABASE_URL       → URL do projeto Supabase (staging)
NEXT_PUBLIC_SUPABASE_ANON_KEY  → Anon key pública
SUPABASE_SERVICE_ROLE_KEY      → Service role (para setup/teardown de dados de teste)
TEST_DM_EMAIL                  → Email da conta DM de teste
TEST_DM_PASSWORD               → Senha da conta DM de teste
TEST_PLAYER_EMAIL              → Email da conta player de teste
TEST_PLAYER_PASSWORD           → Senha da conta player de teste
```

O workflow `.github/workflows/e2e.yml` já está configurado para usar esses secrets. Uma vez adicionados, o CI roda automaticamente em cada push para `master`.

### Etapa 4 — Scope final de cobertura (1 SP)

Após os specs prioritários estarem verdes, decidir quais specs adicionais incluir no CI. Sugestão de escopo para o CI:

**INCLUIR no CI (rápidos e críticos):**
```
e2e/journeys/j1-first-combat.spec.ts
e2e/journeys/j2-player-join.spec.ts  
e2e/journeys/guest-try-mode.spec.ts
e2e/combat/turn-advance.spec.ts
e2e/auth/login.spec.ts
```

**EXCLUIR do CI por ora (lentos ou frágeis):**
```
e2e/journeys/j13-mobile-all-journeys.spec.ts   → Mobile device emulation (frágil em CI)
e2e/journeys/j15-comprehensive-qa-sweep.spec.ts → muito longo (50+ assertions)
e2e/journeys/j16-full-platform-walkthrough.spec.ts
e2e/audio/                                      → áudio é difícil de testar em CI headless
```

Configurar via `testMatch` no `playwright.config.ts` ou via script dedicado:

```json
// package.json
"e2e:ci": "playwright test e2e/journeys/j1-first-combat.spec.ts e2e/journeys/j2-player-join.spec.ts e2e/journeys/guest-try-mode.spec.ts e2e/combat/turn-advance.spec.ts e2e/auth/login.spec.ts"
```

---

## Arquivos a Modificar

| Arquivo | Mudança |
|---------|---------|
| `components/` (vários) | Adicionar `data-testid` onde faltam — conforme audit da Etapa 1 |
| `e2e/journeys/*.spec.ts` | Corrigir seletores desatualizados — conforme audit |
| `package.json` | Adicionar script `"e2e:ci"` com scope reduzido |
| `.github/workflows/e2e.yml` | Atualizar para usar `npm run e2e:ci` (ao invés de rodar tudo) |
| GitHub Secrets | Adicionar 7 secrets listados acima (fora do código) |

---

## Critérios de Aceite

- [ ] `npx playwright test e2e/journeys/j1-first-combat.spec.ts` passa localmente (green) — requer servidor real
- [ ] `npx playwright test e2e/journeys/j2-player-join.spec.ts` passa localmente (green) — requer servidor real
- [ ] `npx playwright test e2e/journeys/guest-try-mode.spec.ts` passa localmente (green) — requer servidor real
- [ ] `npx playwright test e2e/combat/turn-advance.spec.ts` passa localmente (green) — requer servidor real
- [ ] `npx playwright test e2e/auth/login.spec.ts` passa localmente (green) — requer servidor real
- [ ] Secrets configurados no GitHub Actions
- [x] CI workflow atualizado para usar `npm run e2e:ci` (scope reduzido aos 5 specs críticos)
- [ ] CI workflow roda e passa em push para `master` — requer secrets
- [ ] Relatório HTML gerado (`playwright-report/`) sem falhas críticas
- [x] Script `e2e:ci` adicionado ao `package.json`
- [x] 5 specs auditados — seletores `add-row-*` corrigidos no MonsterSearchPanel
- [x] Helper `goToNewSession` atualizado para abrir manual-add form antes de interagir com seletores

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Seletores `data-testid` desatualizados | Audit manual (Etapa 1) antes de tentar rodar |
| Testes de auth dependem de sessão Supabase real | Usar conta de staging dedicada, não prod |
| Race conditions em testes de multiplayer (player-join) | `retries: 2` para esses specs específicos |
| Flakiness em CI (timeouts de rede) | `timeout: 90_000` para specs de jornada completa |
| Dados sujos entre testes (combates não encerrados) | Verificar `afterEach` cleanup nos helpers |

---

---

## Audit de Seletores — Resultado (2026-04-03)

### Seletores OK (existem no código)
| Seletor | Arquivo |
|---------|---------|
| `encounter-name-input` | `components/combat/EncounterSetup.tsx:709` |
| `setup-combatant-list` | `components/combat/EncounterSetup.tsx:828`, `GuestCombatClient.tsx:546` |
| `setup-row-${id}` | `components/combat/CombatantSetupRow.tsx:76` |
| `start-combat-btn` | `components/combat/EncounterSetup.tsx:914`, `GuestCombatClient.tsx:653` |
| `active-combat` | `components/session/CombatSessionClient.tsx:887` |
| `initiative-list` | `components/session/CombatSessionClient.tsx` |
| `next-turn-btn` | `components/session/CombatSessionClient.tsx` |
| `combatant-row-${id}` | `components/combat/CombatantRow.tsx:199` |
| `combatant-name-${id}` | `components/combat/CombatantRow.tsx:324` |
| `hp-btn-${id}` | computed in JS (querySelector) |
| `hp-adjuster` | `components/combat/HpAdjuster.tsx:138` |
| `hp-amount-input` | `components/combat/HpAdjuster.tsx:172` |
| `hp-apply-btn` | `components/combat/HpAdjuster.tsx:185` |
| `srd-search-input` | `components/combat/MonsterSearchPanel.tsx:397` |
| `srd-results` | `components/combat/MonsterSearchPanel.tsx:543` |
| `srd-result-${id}` | `components/combat/MonsterSearchPanel.tsx:559` |
| `guest-banner` | `components/guest/GuestBanner.tsx:70` |
| `player-view` | `components/player/PlayerJoinClient.tsx` |
| `player-loading` | `components/player/PlayerJoinClient.tsx` |
| `reconnecting-skeleton` | `components/player/PlayerJoinClient.tsx` |
| `lobby-name` | `components/player/PlayerLobby.tsx:561` |
| `lobby-initiative` | `components/player/PlayerLobby.tsx:586` |
| `lobby-hp` | `components/player/PlayerLobby.tsx:606` |
| `lobby-ac` | `components/player/PlayerLobby.tsx:624` |
| `lobby-submit` | `components/player/PlayerLobby.tsx:635` |
| `end-encounter-btn` | `components/session/CombatSessionClient.tsx` |
| `#login-email` | `components/login-form.tsx:91` (id, not data-testid) |
| `#login-password` | `components/login-form.tsx:120` (id, not data-testid) |
| `#login-error` | `components/login-form.tsx:134` (id, not data-testid) |

### Seletores CORRIGIDOS (adicionados via PR)
| Seletor | Arquivo | Situação Anterior |
|---------|---------|-------------------|
| `add-row` | `components/combat/MonsterSearchPanel.tsx` (manual add container) | Não existia — container do manual add não tinha testid |
| `add-row-name` | `components/combat/MonsterSearchPanel.tsx` | Não existia |
| `add-row-init` | `components/combat/MonsterSearchPanel.tsx` | Não existia |
| `add-row-hp` | `components/combat/MonsterSearchPanel.tsx` | Não existia |
| `add-row-ac` | `components/combat/MonsterSearchPanel.tsx` | Não existia |
| `add-row-btn` | `components/combat/MonsterSearchPanel.tsx` | Não existia |

### Helpers Corrigidos
- `e2e/helpers/session.ts` — `goToNewSession()` agora abre o manual-add toggle antes de usar os testids `add-row-*`

> **Última atualização:** 2026-04-03  
> **Estimativa:** 5 SP  
> **Nota:** Não requer escrever novos testes — só fazer os existentes rodarem. O trabalho é de diagnóstico e configuração, não de implementação.
