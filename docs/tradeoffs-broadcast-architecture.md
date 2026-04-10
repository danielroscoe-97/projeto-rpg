# Tradeoffs — Broadcast Architecture

> **Data**: 2026-04-10
> **Contexto**: Code review pos-Beta Test #2. Decisoes arquiteturais documentadas para referencia futura.

---

## 1. Dual Broadcast (Client + Server)

### Estado Atual

Cada acao do DM dispara 2 broadcasts:
1. **Client broadcast** — direto pelo WebSocket Supabase, ~20ms, com `_seq`
2. **Server broadcast** — POST `/api/broadcast`, server sanitiza, rebroadcasta, ~100-300ms, sem `_seq`

O comentario no codigo (`broadcast.ts:385`) diz "Phase 1 (dual mode)" e planeja remover client-side no "Phase 3".

### Por que existe dual mode

- **Client**: baixa latencia, funciona mesmo se API estiver lenta
- **Server**: sanitizacao inviolavel (anti-metagaming gate), nao depende de JS do browser

### Problema

Players recebem cada evento 2x. A dedup por `_seq` filtra duplicatas client-client, mas NAO filtra client+server porque o server nao injeta `_seq`. O processamento duplicado e idempotente (setar mesmo valor 2x nao causa efeito visivel), exceto `combatant_add` que ja tem dedup por ID (`findIndex`).

### Decisao: Desligar client broadcast quando pronto

| Aspecto | So Server | Dual (hoje) |
|---------|-----------|-------------|
| Latencia | +100-300ms (imperceptivel em RPG de mesa) | ~20ms |
| Seguranca | Sanitizacao server-side inviolavel | Client sanitiza no browser — DM malicioso pode bypassar |
| Offline DM | Se API cai, players param de receber. Offline queue + state_sync cobrem. | Client broadcast funciona se WebSocket ok mesmo com API lenta |
| Duplicatas | Zero | Toda acao processada 2x |
| Complexidade | Menor | Maior (dedup, _seq, dois caminhos) |

**Recomendacao**: Migrar pra server-only quando a infra de offline queue + state_sync estiver madura (ja esta quase la). O unico risco e latencia +200ms que ninguem nota num jogo de mesa.

**Como migrar**:
1. Remover `ch.send()` de `doSend()` em `broadcast.ts`
2. Manter `broadcastViaServer()` como unico caminho
3. Injetar `_seq` no server broadcast (API route) pra manter ordering
4. Testar offline resilience sem fallback client

---

## 2. Token Revogado Ainda Faz Match

### Estado Atual

Quando DM revoga um token (`is_active = false`), o FK `session_token_id` no combatant ainda existe. O match de reconexao por `session_token_id` nao checa `is_active`.

### Por que nao e problema agora

O player reconecta ao combatant no frontend (ve o estado), mas **qualquer acao server-side falha** porque:
- Heartbeat API checa `is_active`
- Late-join checa `is_active`
- `registerPlayerCombatant` checa `is_active`
- State API (`/api/session/[id]/state`) checa `is_active`

O player vira um "fantasma" — ve mas nao interage.

### Quando revogar token acontece

Quase nunca. Cenarios:
- Player saiu da mesa definitivamente
- Player causando problemas (kick)
- Token expirou (24h TTL)

### Risco

**Zero risco de seguranca ou dados.** Apenas UX confusa (player ve combate mas nao consegue agir).

### Fix futuro (trivial)

Em `PlayerJoinClient.tsx`, no match de reconexao, adicionar check:
```typescript
// Antes: match so por ID
const match = combatants.find(c => c.session_token_id === tokenId);

// Depois: match por ID + verificar token ativo
const match = combatants.find(c => c.session_token_id === tokenId);
if (match && !tokenIsActive) {
  // Mostrar mensagem "Token revogado pelo mestre"
}
```

**Nao implementar agora** — adiciona 1 query extra na reconexao pra um cenario que acontece <1% das sessoes.

---

## 3. Server Broadcast Cria Canal por Request

### Estado Atual

Cada POST em `/api/broadcast` faz:
1. `supabase.channel(...)` — cria canal
2. `.subscribe()` — handshake WebSocket (~50-100ms)
3. `.send()` — envia evento
4. `.removeChannel()` — cleanup

Total: ~100-300ms por request.

### Por que nao usar pool de canais

**Vercel serverless functions sao efemeras.** Cada invocacao e uma funcao nova — nao ha estado persistente entre requests. Um pool de canais morre quando a funcao termina.

| Abordagem | Funciona em Serverless? | Latencia | Complexidade |
|-----------|------------------------|----------|--------------|
| Canal por request (atual) | SIM | ~100-300ms | Minima — stateless |
| Pool de canais | NAO (estado morre entre invocacoes) | ~10ms | Alta — lifecycle, timeout, cleanup |
| WebSocket persistente | NAO (serverless nao suporta long-lived connections) | ~5ms | Requer VPS |

### Quando repensar

Se migrar de Vercel serverless para:
- **Vercel com Edge Runtime persistente** — talvez pool funcione
- **Node.js em VPS (Fly.io, Railway, etc)** — pool de canais e ideal
- **Cloudflare Durable Objects** — estado persistente por sessao

### Numeros de referencia

- 60 req/min rate limit = 1 req/s
- Overhead: ~200ms/req em media
- Capacidade estimada: ~300 DMs simultaneos antes de rate limit ser problema
- Beta atual: 1 DM. Producao esperada ano 1: ~50 DMs simultaneos peak

**Veredicto**: Nao e gargalo ate 300+ DMs simultaneos. Quando chegar la, ja tera migrado pra infra persistente.

---

## Resumo de Decisoes

| Item | Decisao | Revisar quando |
|------|---------|---------------|
| Dual broadcast | Aceitar, migrar pra server-only na proxima sprint | Antes do Beta Test #3 |
| Token revogado | Backlog — fantasma sem risco | Se players reclamarem de UX apos kick |
| Canal por request | Unica opcao viavel em serverless | Se migrar de Vercel para VPS |
