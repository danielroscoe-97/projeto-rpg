# Quick Spec: E2E Critical Journeys (Playwright)

> **Prioridade:** P0 — Fundação para qualquer mudança futura com confiança
> **Estimativa:** ~8h
> **Data:** 2026-03-30
> **Referência:** PRD jornadas 1-4, roadmap H1.1

---

## Contexto

Playwright está instalado (`@playwright/test ^1.58.2`) e há reports de QA em docs/, mas a cobertura E2E é mínima. Os 558+ testes unitários cobrem lógica isolada, mas não validam fluxos reais end-to-end. Qualquer mudança pode quebrar silenciosamente uma jornada crítica.

**Meta:** Cobrir as 4 jornadas do PRD com E2E determinísticos que rodam no CI.

---

## Story 1: Setup de Infra E2E

**Problema:** Playwright pode não estar configurado para rodar contra o app real com Supabase.

**Implementação:**

1. Criar/atualizar `playwright.config.ts`:
   - `baseURL: 'http://localhost:3000'`
   - `webServer: { command: 'npm run dev', port: 3000, reuseExistingServer: true }`
   - `projects: [{ name: 'desktop-chrome' }, { name: 'mobile-safari', use: devices['iPhone 14'] }]`
   - `retries: 1` (no CI), `retries: 0` (local)

2. Criar `e2e/fixtures/test-accounts.ts`:
   - Importar credenciais de `docs/test-accounts.md`
   - DM account + Player account para testes

3. Criar `e2e/helpers/auth.ts`:
   - `loginAsDM(page)` — login via UI ou cookie injection
   - `joinAsPlayer(page, sessionUrl)` — navegar para join link

4. Criar `e2e/helpers/combat.ts`:
   - `createEncounter(page, monsters: string[])` — adicionar monstros e PCs
   - `startCombat(page)` — iniciar combate
   - `advanceTurn(page)` — avançar turno

**AC:**
- [ ] `npx playwright test` roda sem erro no ambiente local
- [ ] Fixtures de test accounts funcionam
- [ ] Helpers de auth e combat são reutilizáveis

---

## Story 2: Jornada Rafael — Happy Path

**Mapa:** Login → Dashboard → Nova Sessão → Adicionar monstros → Adicionar PCs → Iniciar combate → HP update → Turn advance → Encerrar

**Test file:** `e2e/journeys/dm-happy-path.spec.ts`

```
test("DM runs a full combat encounter", async ({ page }) => {
  // 1. Login como DM
  // 2. Navegar para dashboard
  // 3. Criar nova sessão
  // 4. Buscar e adicionar "Goblin" (2024)
  // 5. Adicionar PC manualmente (name: "Thorin", HP: 45, AC: 18)
  // 6. Setar initiative para todos
  // 7. Iniciar combate
  // 8. Verificar que initiative order aparece corretamente
  // 9. Aplicar dano ao Goblin (-7 HP)
  // 10. Verificar HP atualizado
  // 11. Avançar turno
  // 12. Verificar turno atualizado
  // 13. Aplicar condição "Poisoned" ao Goblin
  // 14. Verificar badge de condição visível
  // 15. Encerrar combate
});
```

**AC:**
- [ ] Teste passa em desktop Chrome
- [ ] Tempo total < 30 segundos
- [ ] Nenhum flaky step (determinístico)
- [ ] Screenshot em caso de falha (para debug)

---

## Story 3: Jornada Rafael — Edge Case (Reconexão)

**Mapa:** Combate ativo → Simular disconnect → Reconectar → Verificar state preservado

**Test file:** `e2e/journeys/dm-reconnect.spec.ts`

```
test("DM reconnects and state is preserved", async ({ page, context }) => {
  // 1. Login e iniciar combate (reusar helper)
  // 2. Aplicar dano e avançar turno
  // 3. Capturar estado (HP, turno, round)
  // 4. Navegar para outra página (simula saída)
  // 5. Voltar para a sessão
  // 6. Verificar que HP, turno e round são idênticos ao capturado
  // 7. Verificar que combat actions continuam funcionando
});
```

**AC:**
- [ ] State é 100% preservado após "disconnect"
- [ ] Combat actions funcionam normalmente após reconexão
- [ ] Teste < 20 segundos

---

## Story 4: Jornada Camila — Player View (Mobile)

**Mapa:** DM cria sessão → Gera link → Player abre link (mobile viewport) → Vê initiative → Vê HP update em tempo real

**Test file:** `e2e/journeys/player-mobile.spec.ts`

```
test("Player joins and sees real-time updates", async ({ browser }) => {
  // SETUP: Dois contextos — DM (desktop) e Player (mobile)
  const dmContext = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const playerContext = await browser.newContext({ ...devices['iPhone 14'] });
  const dmPage = await dmContext.newPage();
  const playerPage = await playerContext.newPage();

  // 1. DM: Login, criar sessão, adicionar combatants, iniciar combate
  // 2. DM: Copiar session link
  // 3. Player: Abrir link no mobile viewport
  // 4. Player: Selecionar personagem no lobby
  // 5. Player: Verificar initiative board visível
  // 6. DM: Aplicar dano a um monstro
  // 7. Player: Verificar que HP status do monstro mudou (LIGHT→MODERATE)
  // 8. Player: NÃO deve ver HP numérico do monstro (anti-metagaming)
  // 9. DM: Avançar turno
  // 10. Player: Verificar que indicador de turno atualizou
  // 11. Player: Abrir spell search, buscar "Fireball"
  // 12. Player: Verificar modal de spell abre corretamente no mobile
});
```

**AC:**
- [ ] Player view funciona em mobile viewport (iPhone 14)
- [ ] HP numérico de monstros NUNCA aparece no player view
- [ ] HP status label (LIGHT/MODERATE/HEAVY/CRITICAL) aparece corretamente
- [ ] Real-time sync funciona (DM action → Player view update < 2s)
- [ ] Spell oracle funciona no mobile
- [ ] Teste < 45 segundos

---

## Story 5: Jornada Guest — Try Mode

**Mapa:** Visitante abre /try → Tour aparece → Adiciona monstro → Inicia combate → Banner de 60min visível

**Test file:** `e2e/journeys/guest-try-mode.spec.ts`

```
test("Guest completes try mode flow", async ({ page }) => {
  // 1. Navegar para /try (sem login)
  // 2. Verificar que guided tour aparece (se primeira visita)
  // 3. Fechar/skip tour
  // 4. Buscar monstro "Goblin"
  // 5. Adicionar ao encounter
  // 6. Adicionar PC manualmente
  // 7. Setar initiative
  // 8. Iniciar combate
  // 9. Verificar GuestBanner visível com timer
  // 10. Aplicar dano
  // 11. Verificar combate funciona sem auth
  // 12. Verificar CTA de signup visível
});
```

**AC:**
- [ ] /try funciona completamente sem login
- [ ] GuestBanner mostra timer
- [ ] Todas as ações de combate funcionam
- [ ] CTA de signup está presente
- [ ] Teste < 30 segundos

---

## Story 6: CI Integration

**Implementação:**

1. Adicionar script em `package.json`:
```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

2. Criar `.github/workflows/e2e.yml` (se usando GitHub Actions) ou configurar no Vercel:
```yaml
- run: npx playwright install --with-deps
- run: npm run build
- run: npx playwright test
```

3. Reports salvos como artifacts:
```
playwright-report/
├── index.html
├── screenshots/  (só em falhas)
└── traces/       (só em falhas)
```

**AC:**
- [ ] E2E roda automaticamente em PR (ou manual trigger)
- [ ] Report HTML disponível como artifact
- [ ] Falhas mostram screenshot + trace para debug rápido
