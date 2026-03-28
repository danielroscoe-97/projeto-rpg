# Testes do Orquestrador BMAD

## Rodar tudo

```bash
cd scripts/orchestrator
npm test
```

## Testes da Fila (Queue)

### `queue-e2e.test.ts` — Testes unitários do padrão

**15 testes** que validam a lógica de orquestração com um harness leve (sem I/O real):

- Paralelismo (Semaphore real, maxConcurrent configurável)
- Dependências within-stream (a0-2 espera a0-1)
- Sprint gates (b1-1 → a1-4, c1-1 → b3-5)
- Retry (falha → backoff → retenta → sucede)
- State machine (pending → spawning → working → verifying → pr_open → done)
- Crash recovery (entries stuck → reset to pending)
- Skip (stories skipadas não executam)

```bash
npx vitest run __tests__/queue-e2e.test.ts
```

### `queue-integration.test.ts` — Teste de integração real

**1 teste pesado** que roda o `runQueue()` REAL do `story-queue.ts`:

- Cria 5 specs `.md` reais em `_bmad-output/implementation-artifacts/`
- Chama `buildQueue()` + `runQueue()` de verdade
- Valida o `.queue-state.json` real do disco
- Confirma paralelismo (max concurrency >= 2)
- Confirma deps (z0-2 depois de z0-1, z1-2 depois de z1-1)
- Imprime execution log com timestamps relativos

```bash
npx vitest run __tests__/queue-integration.test.ts
```

**O que é mockado:** Claude CLI, git worktrees, Slack, comandos git/gh/npx
**O que é real:** config, filesystem, semaphore, dependency resolution, queue state

#### Output esperado

```
📊 Final queue state:
┌─────────┬────────────────────┬────────┐
│ (index) │ id                 │ status │
│ 0       │ 'z0-1-e2e-setup'   │ 'done' │
│ 1       │ 'z0-2-e2e-auth'    │ 'done' │
│ 2       │ 'z1-1-e2e-combat'  │ 'done' │
│ 3       │ 'z1-2-e2e-logging' │ 'done' │
│ 4       │ 'z2-1-e2e-pricing' │ 'done' │
└─────────┴────────────────────┴────────┘

⚡ Max concurrency observed: 3 (config.maxConcurrent=4)

🔗 Dep: z0-1 ended +146ms, z0-2 started +201ms  ← respeitou
🔗 Dep: z1-1 ended +148ms, z1-2 started +212ms  ← respeitou

📝 Execution log:
  ▶ z0-1 start @ +0ms     ← paralelo com z1-1!
  ▶ z1-1 start @ +0ms
  ■ z0-1 end @ +146ms
  ■ z1-1 end @ +148ms
  ▶ z2-1 start @ +184ms   ← slot liberou, entrou
  ▶ z0-2 start @ +201ms   ← dep z0-1 met
  ▶ z1-2 start @ +212ms   ← dep z1-1 met
  ...
```

### Grafo de dependências dos specs de teste

```
z0-1-e2e-setup ──→ z0-2-e2e-auth     (within-stream)
z1-1-e2e-combat ──→ z1-2-e2e-logging  (within-stream)
z2-1-e2e-pricing                       (independente)

z0-1 ║ z1-1 ║ z2-1  rodam em paralelo
z0-2 espera z0-1    |  z1-2 espera z1-1
```
