<!-- rtk-instructions v2 -->
# RTK (Rust Token Killer) - Token-Optimized Commands

## Golden Rule

**Always prefix commands with `rtk`**. If RTK has a dedicated filter, it uses it. If not, it passes through unchanged. This means RTK is always safe to use.

**Important**: Even in command chains with `&&`, use `rtk`:
```bash
# ❌ Wrong
git add . && git commit -m "msg" && git push

# ✅ Correct
rtk git add . && rtk git commit -m "msg" && rtk git push
```

## RTK Commands by Workflow

### Build & Compile (80-90% savings)
```bash
rtk cargo build         # Cargo build output
rtk cargo check         # Cargo check output
rtk cargo clippy        # Clippy warnings grouped by file (80%)
rtk tsc                 # TypeScript errors grouped by file/code (83%)
rtk lint                # ESLint/Biome violations grouped (84%)
rtk prettier --check    # Files needing format only (70%)
rtk next build          # Next.js build with route metrics (87%)
```

### Test (90-99% savings)
```bash
rtk cargo test          # Cargo test failures only (90%)
rtk vitest run          # Vitest failures only (99.5%)
rtk playwright test     # Playwright failures only (94%)
rtk test <cmd>          # Generic test wrapper - failures only
```

### Git (59-80% savings)
```bash
rtk git status          # Compact status
rtk git log             # Compact log (works with all git flags)
rtk git diff            # Compact diff (80%)
rtk git show            # Compact show (80%)
rtk git add             # Ultra-compact confirmations (59%)
rtk git commit          # Ultra-compact confirmations (59%)
rtk git push            # Ultra-compact confirmations
rtk git pull            # Ultra-compact confirmations
rtk git branch          # Compact branch list
rtk git fetch           # Compact fetch
rtk git stash           # Compact stash
rtk git worktree        # Compact worktree
```

Note: Git passthrough works for ALL subcommands, even those not explicitly listed.

### GitHub (26-87% savings)
```bash
rtk gh pr view <num>    # Compact PR view (87%)
rtk gh pr checks        # Compact PR checks (79%)
rtk gh run list         # Compact workflow runs (82%)
rtk gh issue list       # Compact issue list (80%)
rtk gh api              # Compact API responses (26%)
```

### JavaScript/TypeScript Tooling (70-90% savings)
```bash
rtk pnpm list           # Compact dependency tree (70%)
rtk pnpm outdated       # Compact outdated packages (80%)
rtk pnpm install        # Compact install output (90%)
rtk npm run <script>    # Compact npm script output
rtk npx <cmd>           # Compact npx command output
rtk prisma              # Prisma without ASCII art (88%)
```

### Files & Search (60-75% savings)
```bash
rtk ls <path>           # Tree format, compact (65%)
rtk read <file>         # Code reading with filtering (60%)
rtk grep <pattern>      # Search grouped by file (75%)
rtk find <pattern>      # Find grouped by directory (70%)
```

### Analysis & Debug (70-90% savings)
```bash
rtk err <cmd>           # Filter errors only from any command
rtk log <file>          # Deduplicated logs with counts
rtk json <file>         # JSON structure without values
rtk deps                # Dependency overview
rtk env                 # Environment variables compact
rtk summary <cmd>       # Smart summary of command output
rtk diff                # Ultra-compact diffs
```

### Infrastructure (85% savings)
```bash
rtk docker ps           # Compact container list
rtk docker images       # Compact image list
rtk docker logs <c>     # Deduplicated logs
rtk kubectl get         # Compact resource list
rtk kubectl logs        # Deduplicated pod logs
```

### Network (65-70% savings)
```bash
rtk curl <url>          # Compact HTTP responses (70%)
rtk wget <url>          # Compact download output (65%)
```

### Meta Commands
```bash
rtk gain                # View token savings statistics
rtk gain --history      # View command history with savings
rtk discover            # Analyze Claude Code sessions for missed RTK usage
rtk proxy <cmd>         # Run command without filtering (for debugging)
rtk init                # Add RTK instructions to CLAUDE.md
rtk init --global       # Add RTK to ~/.claude/CLAUDE.md
```

## Token Savings Overview

| Category | Commands | Typical Savings |
|----------|----------|-----------------|
| Tests | vitest, playwright, cargo test | 90-99% |
| Build | next, tsc, lint, prettier | 70-87% |
| Git | status, log, diff, add, commit | 59-80% |
| GitHub | gh pr, gh run, gh issue | 26-87% |
| Package Managers | pnpm, npm, npx | 70-90% |
| Files | ls, read, grep, find | 60-75% |
| Infrastructure | docker, kubectl | 85% |
| Network | curl, wget | 65-70% |

Overall average: **60-90% token reduction** on common development operations.
<!-- /rtk-instructions -->

# Combat Parity Rule — Guest vs Auth

**REGRA IMUTÁVEL**: Toda alteração em experiência de combate ou arquitetura de combate DEVE incluir verificação de parity entre os 3 modos de acesso:

## Checklist Obrigatório

Antes de considerar qualquer combat feature ou fix completo, responder:

1. **Guest (`/try`)** — Funciona no guest combat (GuestCombatClient, Zustand store, localStorage)? Se sim, implementar lá também.
2. **Anônimo (`/join`)** — Funciona pro player anônimo via link do DM (PlayerJoinClient, session_tokens, anon auth)? Se sim, implementar lá também.
3. **Autenticado (`/invite`)** — Requer dados persistentes do user (campanha, personagem, histórico)? Marcar como Auth-only.

## Arquivos de Referência

| Modo | Client Principal | Store/Auth | Entry Point |
|------|-----------------|------------|-------------|
| Guest | `components/guest/GuestCombatClient.tsx` | Zustand + localStorage | `/app/try/page.tsx` |
| Anônimo | `components/player/PlayerJoinClient.tsx` | Supabase anon auth + session_tokens | `/app/join/[token]/page.tsx` |
| Autenticado | `components/player/PlayerJoinClient.tsx` | Supabase auth + campaign_members | `/app/invite/[token]/page.tsx` |

## Regra de Aplicação

- **UI-only changes** (display, layout, styling) → SEMPRE aplicar nos 3 modos
- **Realtime/broadcast features** → Aplicar em Anônimo + Autenticado (Guest não tem realtime)
- **Data persistence features** (ratings, notas, spell slots) → Auth-only, documentar no bucket
- **DM features** (legendary actions, monster stats) → Aplicar no Guest + Autenticado (DM sempre é autenticado)

## Anti-Pattern

```
// ❌ ERRADO: Implementar feature só no PlayerJoinClient
// ❌ ERRADO: Implementar fix só no GuestCombatClient
// ✅ CERTO: Verificar os 3 modos e implementar onde aplicável
```

# Resilient Player Reconnection Rule — Zero-Drop Guarantee

**REGRA IMUTÁVEL**: A conexão do jogador NUNCA pode ser perdida de forma perceptível. Reconexão DEVE ser automática e invisível. Spec completo: `docs/spec-resilient-reconnection.md`

## Princípios Absolutos

1. **Zero friction para reconexão**: DM NUNCA precisa aprovar reconexão se o token do jogador ainda existe e está ativo no DB
2. **Defense in depth**: Toda detecção de saída e reconexão usa múltiplas camadas de fallback — NUNCA depender de um único mecanismo
3. **Best-effort cleanup**: `pagehide`, `sendBeacon`, `broadcast`, `untrack` são TODOS best-effort — o sistema DEVE funcionar se TODOS falharem
4. **Heartbeat miss é o fallback absoluto**: DM timer de stale detection (15s polling) é a última linha de defesa

## Checklist Obrigatório — Qualquer Mudança em Realtime/Conexão

1. **pagehide handler existe?** — Broadcast `player:disconnecting` + sendBeacon no unload
2. **visibilitychange bidirecional?** — Age tanto no "hidden" (idle broadcast, pause heartbeat) quanto no "visible" (reconnect, validate token ownership)
3. **Heartbeat pausa em hidden?** — `document.visibilityState === "hidden"` check antes de enviar
4. **Storage persist?** — sessionStorage + localStorage salvos após register/rejoin
5. **Reconnect-from-storage no mount?** — Checa storage ANTES de signInAnonymously
6. **Split-brain protection?** — Valida token_owner no visibilitychange visible
7. **DM stale detection timer?** — Timer de 15s no DM que checa last_seen_at independente de broadcast

## Anti-Patterns — PROIBIDO

```
// ❌ NUNCA depender APENAS de visibilitychange em mobile
// ❌ NUNCA exigir aprovação do DM para reconexão (exceto token revogado)
// ❌ NUNCA mostrar banner de "desconectado" nos primeiros 3s
// ❌ NUNCA rodar heartbeat quando tab está hidden
// ❌ NUNCA depender APENAS de broadcasts para detectar offline
// ❌ NUNCA depender APENAS de cookies/localStorage (ambos podem sumir)
// ❌ NUNCA fazer operação assíncrona blocking no pagehide
// ❌ NUNCA mostrar tela branca ou formulário durante reconexão (use skeleton)
```

## Cadeia de Fallbacks

```
DETECÇÃO DE SAÍDA (DM sabe que jogador saiu):
  L1: broadcast player:disconnecting     (< 2s, best-effort)
  L2: sendBeacon → last_seen_at = null   (< 2s, best-effort)
  L3: Presence untrack timeout            (~ 30s, Supabase interno)
  L4: DM timer stale detection            (< 45s, confiável)

RECONEXÃO DO JOGADOR (jogador volta):
  L1: sessionStorage (mesmo browser, tab restore)
  L2: localStorage (browser fechou e abriu, 24h TTL)
  L3: Cookie auth (anon session viva, same-device)
  L4: Lista de nomes (server-side, 1 clique)
  L5: Formulário completo (último recurso)
```

# SRD Content Compliance — REGRA IMUTÁVEL

**NUNCA expor conteúdo não-SRD em páginas públicas.**

## O que é SRD (seguro para uso público)

O SRD 5.1 (Systems Reference Document) é licenciado sob **CC-BY-4.0** pela Wizards of the Coast. Apenas esse conteúdo pode aparecer em páginas públicas indexadas por mecanismos de busca.

| Fonte | Licença | Status |
|---|---|---|
| SRD 5.1 monsters (~419) | CC-BY-4.0 | Permitido |
| SRD 5.1 spells (~361) | CC-BY-4.0 | Permitido |
| Monster-a-Day (MAD, 357) | CC (parceria r/monsteraday) | Permitido |
| Qualquer outro livro WotC | Copyright WotC | **PROIBIDO em público** |

## Arquitetura de Dados SRD (Dual-Mode)

| Local | Conteúdo | Acesso |
|-------|----------|--------|
| `data/srd/` | Dados COMPLETOS (SRD + não-SRD) + traduções PT-BR + whitelists | Server-only, auth-gated via `/api/srd/full/` |
| `public/srd/` | Dados FILTRADOS (SRD-only) | Público, estático, seguro |

### Fluxo de dados

1. `scripts/generate-srd-bundles.ts` → exporta do Supabase para `data/srd/`
2. `scripts/filter-srd-public.ts` → aplica whitelists, gera versões SRD-only em `public/srd/`
3. `lib/srd/srd-mode.ts` → controla se o client busca de `/srd/` (guest) ou `/api/srd/full/` (auth)
4. `lib/srd/srd-data-server.ts` → lê de `data/srd/`, aplica whitelist para SSG

### Arquivos protegidos (NUNCA em public/)

- `monster-descriptions-pt.json` — traduções PT-BR (IP próprio)
- `spell-descriptions-pt.json` — traduções PT-BR (IP próprio)
- `monster-names-pt.json`, `spell-names-pt.json` — slug maps
- `monster-lore.json`, `monster-lore-pt.json` — lore narrativo
- `srd-*-whitelist.json` — whitelists de filtragem
- Versões COMPLETAS de `monsters-*.json`, `spells-*.json`, `items.json`

## Anti-Patterns — PROIBIDO

```
// ❌ NUNCA colocar dados completos (não-SRD) em public/
// ❌ NUNCA colocar traduções PT-BR em public/
// ❌ NUNCA remover ou bypassar os filtros de whitelist
// ❌ NUNCA adicionar conteúdo não-SRD aos whitelists
// ❌ NUNCA expor getSrdMonsters() sem filtro de whitelist ativo
// ❌ NUNCA usar fonte (VGM, MPMM, MTF, FTD, etc.) em páginas públicas
// ❌ NUNCA servir conteúdo completo sem auth check (/api/srd/full/ exige login)
// ✅ SEMPRE rodar filter-srd-public.ts após alterar dados em data/srd/
// ✅ SEMPRE verificar build após alterar srd-data-server.ts
// ✅ SEMPRE manter whitelists derivados do SRD 5.1 oficial
```

## Ao Alterar Conteúdo SRD

1. Editar/gerar dados em `data/srd/`
2. Rodar `npx tsx scripts/filter-srd-public.ts` para atualizar `public/srd/`
3. Verificar contagem: monsters ~1122 (419 SRD + 346 SRD 2024 + 357 MAD), spells ~604
4. Se os números subirem significativamente, investigar se conteúdo não-SRD vazou
5. Verificar build com `tsc --noEmit`
