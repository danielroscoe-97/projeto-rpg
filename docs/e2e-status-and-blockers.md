# E2E — Status e Bloqueadores

> Atualizado: 2026-03-30
> Contexto: implementação e hardening das jornadas críticas (E2E Sprints 2–4)

---

## O que está funcionando

| Teste | Estado | Condição |
|-------|--------|----------|
| `guest-try-mode.spec.ts` | **Passa localmente** com `npm run dev` | Requer `NEXT_PUBLIC_SUPABASE_URL` no ambiente |
| `dm-happy-path.spec.ts` | **Passa localmente** com credenciais | Skipped automaticamente sem `E2E_DM_EMAIL/PASSWORD` |
| `dm-reconnect.spec.ts` | **Passa localmente** com credenciais | Skipped automaticamente sem `E2E_DM_EMAIL/PASSWORD` |
| `player-mobile.spec.ts` | **Skipped** permanentemente | Requer `SUPABASE_REALTIME_E2E=1` + Supabase staging estável |

---

## O que não deu pra corrigir

### 1. CI sem Supabase secrets — guest test falha no servidor
**Problema:** O Next.js em `npm start` tenta inicializar o cliente Supabase em SSR para qualquer rota,
incluindo `/try` (guest, sem auth). Sem `NEXT_PUBLIC_SUPABASE_URL`, o servidor lança erro e
retorna 500 em vez da página.

**Workaround aplicado:** Job-level `if: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL != '' }}`
— CI fica verde (skipped) em vez de timeout.

**Fix real necessário:** Lazy-init do cliente Supabase no servidor, só quando a rota exige auth.
Isso exigiria refatoração do middleware/provider do Supabase — fora do escopo do sprint.

---

### 2. `player-mobile` — Realtime broadcast nunca chega em CI
**Problema:** O teste cria duas sessões de browser (DM + Player) e espera um WebSocket broadcast
do Supabase Realtime. Em CI sem projeto Supabase real (ou com projeto de produção + CORS restrito),
o broadcast nunca chega no segundo contexto dentro do timeout de 30s.

**Workaround aplicado:** `test.skip(!process.env.SUPABASE_REALTIME_E2E, ...)` — o teste só roda
quando explicitamente habilitado.

**Como habilitar:** Configurar um projeto Supabase de staging e passar:
```bash
SUPABASE_REALTIME_E2E=1 \
NEXT_PUBLIC_SUPABASE_URL=<staging-url> \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging-key> \
npx playwright test e2e/journeys/player-mobile.spec.ts
```

---

### 3. `j1-j17` — 17 spec files extras em `e2e/journeys/` não auditados
**Problema:** O diretório `e2e/journeys/` contém 17 arquivos `j1-*.spec.ts` a `j17-*.spec.ts`
totalizando ~171 testes. Nenhum foi auditado para:
- Guards de skip quando sem secrets
- Compatibilidade com o app atual
- Timeouts adequados para CI

**Impacto:** Se o comando de CI apontar para `e2e/journeys/` (em vez dos 4 arquivos específicos),
todos os 171 testes rodam e a maioria trava/falha.

**Workaround aplicado:** Workflow aponta explicitamente para os 4 arquivos:
```yaml
run: npx playwright test
  e2e/journeys/dm-happy-path.spec.ts
  e2e/journeys/dm-reconnect.spec.ts
  e2e/journeys/guest-try-mode.spec.ts
  e2e/journeys/player-mobile.spec.ts
```

**O que fazer com os j1-j17:** Auditar ou mover para `e2e/journeys/legacy/` e excluir do CI.

---

## O que não deu pra encontrar

### 1. Por que o workflow rodava em push mesmo com `workflow_dispatch` only
**Observado:** Após o commit `37e205c` (que mudou o trigger para `workflow_dispatch`),
o próximo push ainda acionou um run de CI. GitHub Actions deveria usar o novo workflow no
próprio push que o altera, portanto o push subsequente não deveria ter acionado nada.

**Hipóteses:** Cache do runner, ou o run era de um push anterior (o `gh run list` mostra
runs por data de início e pode ter pareado errado).

**Estado atual:** O workflow agora tem `push/pull_request` + `if` guard, então qualquer
push dispara o job mas ele sai imediatamente (skipped) se `NEXT_PUBLIC_SUPABASE_URL` não
estiver configurado.

---

## Para ativar E2E em CI

1. Ir em **GitHub → Settings → Secrets and variables → Actions** no repo
2. Adicionar os secrets:
   - `NEXT_PUBLIC_SUPABASE_URL` — URL do projeto Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key pública
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — publishable key (se diferente do anon)
   - `E2E_DM_EMAIL` — email do usuário DM de teste (ver `docs/test-accounts.md`)
   - `E2E_DM_PASSWORD` — senha correspondente
3. A partir do próximo push, o job roda automaticamente
4. `dm-happy-path` e `dm-reconnect` passarão com as credenciais configuradas
5. `guest-try-mode` passará quando o servidor conseguir inicializar sem crash
6. `player-mobile` continua skipped até `SUPABASE_REALTIME_E2E=1` ser adicionado

---

## Commits relacionados

```
6a42f93 ci(e2e): skip job when Supabase secrets missing, scope to 4 journey files
739342b fix(e2e): correct waitForFunction arg order + force Zustand re-hydration for tour dismiss
b5c6030 fix(e2e): add srd-status sentinel, tour dismiss beforeEach, visitor test fixes
37e205c ci: disable auto-trigger E2E until Supabase secrets configured
716bf05 fix(e2e): wait for SRD loading screen in guest-try-mode test
e48284b fix(e2e): skip auth-dependent tests when secrets not configured
3a5531c fix(ci): scope E2E to journey tests only, use npm start in CI
```
