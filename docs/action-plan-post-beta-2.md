# Action Plan — Post Beta Test #2

> **Data**: 2026-04-10
> **Base**: Cruzamento de dados Supabase, analytics, logs Vercel, auditoria de codigo, feedback verbal
> **Metodologia**: Party Mode com 6 agentes BMAD + 7 agentes de pesquisa paralelos

---

## Resumo Executivo

O Beta Test #2 (2026-04-09, ~3h30 de sessao) revelou problemas graves, mas a analise cruzada mostra que **o app esta em estado muito melhor do que o feedback verbal sugere**:

- **10 dos 15 itens reportados ja estao implementados** (commits pos-beta)
- **A causa raiz do crash foi polling agressivo (1.4s) + rate limiting desativado + bug "Already registered"**, nao gaps de broadcast
- **Token reconnect por ID ja funciona** (dual matching: session_token_id first, name fallback)
- **Full state sync de 30s ja roda** como safety net contra drift

### Dados-chave do Beta Test #2

| Metrica | Valor |
|---------|-------|
| Duracao | ~3h30 (20:37 - 00:05 BRT) |
| Players | 7 (Torin, Noknik, W, Kai, Askeladd, Sylas, Yoshiro) |
| DM | luiz.alexandre1213 |
| Requests totais (30min log window) | 9.123 |
| Taxa de sucesso | 44.9% (4.005 de 9.123) |
| 504 errors | 2.023 (22.7%) |
| 500 errors | 1.685 (18.9%) — 1.470 do bug "Already registered" |
| 401 auth failures | 1.204 (13.5%) |
| Pico de concurrency | 113 funcoes simultaneas |
| Refreshes dos players | 150+ page:views no /join |
| Tokens duplicados | 2 (Noknik + Kai) |

---

## Scorecard — Status Atual do Codigo

| # | Item | Status | Detalhe |
|---|---|---|---|
| 1 | Polling interval (1.4s -> 30s) | FIXADO | PlayerJoinClient.tsx:1769 |
| 2 | "Already registered" throw 500 | NAO FIXADO | player-registration.ts:159 — throw em vez de idempotente |
| 3 | Backoff exponencial on error | FIXADO | 5s->10s->20s->30s + circuit breaker |
| 4 | Circuit breaker reset | PARCIAL | Reseta em fetch success, NAO em broadcast success |
| 5 | player_notes_update listener | NAO FIXADO | Zero handlers em PlayerJoinClient |
| 6 | useRealtimeChannel hook | NAO FIXADO | 10 de 33 event types |
| 7 | combat:started dead code | NAO FIXADO | Handler existe, evento nunca emitido |
| 8 | Analytics de combate | NAO FIXADO | Zero trackEvent pra turn/damage/add/remove |
| 9 | Token reconnect por ID | FIXADO | session_token_id first, name fallback |
| 10 | DmSyncDot animacao (BT2-08) | PROVAVEL CAUSA | animate-pulse 2s em dot 1.5x1.5 |
| 11 | Rate limiting Upstash | DESATIVADO | Codigo pronto, 25+ routes, Redis nao configurado |
| 12 | Onboarding trap mid-combat | NAO FIXADO | auth/confirm nao preserva join_token |
| 13 | CRITICAL text shadow | FIXADO | PlayerInitiativeBoard.tsx:79 |
| 14 | AC visivel pro DM | FIXADO | CombatantRow.tsx:508-518 |
| 15 | Group expand player view | FIXADO | PlayerInitiativeBoard.tsx:436-465 |
| 16 | Monstros individuais em grupo | FIXADO | HpStatusBadge por monstro |
| 17 | "(voce)" marker | FIXADO | t("your_character") |
| 18 | Reacoes bidirecionais | FIXADO | combat:reaction_toggle broadcast |
| 19 | Full state sync 30s | FIXADO | CombatSessionClient.tsx:430-441 |
| 20 | Offline queue IndexedDB | FIXADO | offline-queue.ts |

**Placar: 12 fixados, 1 parcial, 7 nao fixados**

---

## Plano de Acao

### TIER 1 — Antes do Proximo Beta (HOJE)

#### T1-1: Configurar Upstash Redis (MANUAL — Dani_)
- Criar conta em console.upstash.com (free tier: 10K req/dia)
- Criar Redis database (regiao US-East)
- Copiar UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN
- Adicionar no Vercel > Settings > Environment Variables
- Adicionar no .env.local
- **Impacto**: Ativa rate limiting em 25+ API routes

#### T1-2: Fix "Already registered" (CODE)
- Arquivo: lib/supabase/player-registration.ts:150-159
- Mudar: se token.player_name ja existe, buscar combatant por session_token_id e retornar
- Pattern: seguir markPlayerToken (linha 267) que ja faz if (token.player_name) return
- **Impacto**: Elimina 1.470 errors desnecessarios

#### T1-3: Fix circuit breaker reset em broadcast (CODE)
- Arquivo: PlayerJoinClient.tsx
- Mudar: quando qualquer broadcast event e recebido com sucesso, resetar consecutiveFailsRef
- **Impacto**: Player nao fica preso em modo degradado quando broadcast funciona mas fetch nao

#### T1-4: DmSyncDot animacao mais lenta (CODE)
- Arquivo: components/layout/DmSyncDot.tsx:21-22
- Mudar: trocar animate-pulse por animacao custom de 4-5s ou opacity mais sutil
- **Impacto**: Resolve BT2-08 (blinking too fast)

### TIER 2 — Semana (Observability + Safety)

#### T2-1: Onboarding preservar join_token (CODE)
- Arquivo: app/auth/confirm/route.ts
- Mudar: se URL tem join_token param, redirecionar de volta pro /join/:token apos signup
- **Impacto**: Player que faz signup mid-combat volta pro combate

#### T2-2: Analytics de combate (CODE)
- Adicionar trackEvent em: turn_advanced, combatant_added, combatant_removed, player_reconnected
- Arquivos: useCombatActions.ts, PlayerJoinClient.tsx
- **Impacto**: Telemetria do loop principal — saber se beta #3 melhorou

#### T2-3: Limpar dead code (CODE)
- Remover handler combat:started em PlayerJoinClient (nunca emitido)
- Atualizar ou remover useRealtimeChannel hook (10 de 33 events)
- **Impacto**: Codigo mais limpo, menos armadilhas

#### T2-4: Listener player_notes_update (CODE)
- Adicionar handler em PlayerJoinClient.tsx
- **Impacto**: Notas do DM sincronizam em tempo real

### TIER 3 — Backlog

| Item | Prioridade |
|------|-----------|
| E2E smoke test multiplayer (Playwright) | Alta |
| Dashboard de health: refresh rate por sessao | Media |
| Completar analytics 31/44 -> 44/44 | Media |
| Player spectator mode (usar useRealtimeChannel) | Baixa |

---

## Insights de Negocio

### Positivos
- **Funil LP -> Guest -> Signup funcionou** (bcgalfa95 via utm_source=ig)
- **Retencao pos-sessao**: guigateixeira17 voltou 3h depois pra explorar o app sozinho
- **5 signups reais em 10 minutos** durante o beta
- **Onboarding + wizard completados** por 2 dos 5 novos users

### Preocupantes
- **Zero analytics de combate** — nao sabemos engagement real
- **1 auth error no signup** (cbe2b9c6 bateu em /auth/error)
- **DM abandonou 1a sessao** antes de criar a 2a — possivel confusao na UI

### Oportunidades
- **guigateixeira17** = contato direto pra feedback qualitativo (voltou sozinho)
- **Instagram como canal** = dobrar investimento (utm_source=ig converteu)
- **Demo Pixel Bar / Taverna de Ferro** = com rate limiting ativo, suporta 20+ players

---

## Causa Raiz do Crash — Anatomia Completa

```
00:16-00:23  FASE 1: Bug "Already registered"
             - Android client tenta /join repetidamente -> 1.470x 500 errors
             - Mesmo client polando /state a cada 1.4 segundos
             - Error rate: ~40%

00:23-00:31  BREVE RECUPERACAO
             - Errors caem, polling continua: 250-330 req/min

00:32        FASE 2: CASCADE
             - Primeiro 504 em /api/session/:id/state
             - Concurrency: 7 -> 113 execucoes simultaneas

00:33-00:38  COLAPSO TOTAL
             - 723 req/min pro /state no pico
             - Error rate 100% as 00:36 — ZERO sucesso
             - Functions enfileiram, timeout 5min -> 504
             - 504 triggera retry -> mais requests -> mais 504
             - RETRY STORM classico

00:38-00:46  MORTE LENTA
             - 504s diminuem, 401 auth failures dominam
             - Sessions anonimas expiraram
             - 199 auth failures/min no pico
```

**Causa raiz**: Polling 1.4s + zero backoff + bug "Already registered" + rate limiting desativado = thundering herd auto-amplificado.

**Fix aplicado**: Polling 30s + backoff exponencial + circuit breaker. **Falta**: rate limiting (Upstash) + idempotent register.

---

## Proximos Passos

1. Dani_ configura Upstash Redis (guiado passo a passo)
2. Aplicar fixes T1-2 a T1-4 via Claude Code
3. Deploy
4. Teste manual: DM + 2 celulares
5. Beta Test #3 com confianca
