# Quick Spec: API Pública v1

> **Horizonte:** 3.1 — Plataforma
> **Prioridade:** P2 — Diferencial competitivo (nenhum concorrente tem)
> **Estimativa:** ~16h (phased)
> **Data:** 2026-03-30

---

## Contexto

Nenhum combat tracker existente (D&D Beyond, Roll20, Foundry, Shieldmaiden) oferece uma API pública. Isso é uma oportunidade massiva para criar um ecossistema: bots de Discord, OBS overlays para streams, integração com character sheets externos, e ferramentas de terceiros.

**Formato:** REST (alinhado com filosofia de simplicidade). Não GraphQL.

---

## Story 1: Fundação da API — Auth + Routing

**Implementação:**

1. Criar estrutura de rotas:
```
app/api/v1/
├── auth/
│   └── token/route.ts          # POST — gerar API token
├── sessions/
│   ├── route.ts                # GET — listar sessões do DM
│   └── [id]/
│       ├── route.ts            # GET — detalhes da sessão
│       ├── combatants/route.ts # GET — lista de combatants
│       └── events/route.ts     # GET — SSE stream (real-time)
├── campaigns/
│   ├── route.ts                # GET/POST — listar/criar campanhas
│   └── [id]/
│       ├── route.ts            # GET/PATCH — detalhes/editar
│       └── characters/route.ts # GET — PCs da campanha
├── srd/
│   ├── monsters/route.ts       # GET — search/list monsters (public)
│   ├── monsters/[slug]/route.ts # GET — monster detail (public)
│   ├── spells/route.ts         # GET — search/list spells (public)
│   └── spells/[slug]/route.ts  # GET — spell detail (public)
└── webhooks/
    └── route.ts                # POST — register webhook URL
```

2. Auth via API Keys (não JWT sessions):
```typescript
// Tabela nova: api_keys
// user_id, key_hash, name, scopes[], last_used_at, created_at, revoked_at

// Middleware de auth:
const apiKey = req.headers.get('X-API-Key');
const keyRecord = await validateApiKey(apiKey);
if (!keyRecord) return Response.json({ error: 'Unauthorized' }, { status: 401 });
```

3. Rate limiting por API key:
```typescript
// 100 req/min para free tier
// 1000 req/min para pro tier
const { limited } = await checkRateLimit(`api:${keyRecord.id}`, tier.rateLimit, "1 m");
```

4. Response format padrão:
```json
{
  "data": { ... },
  "meta": {
    "request_id": "uuid",
    "timestamp": "ISO8601"
  }
}
```

**AC:**
- [ ] API key creation via dashboard settings
- [ ] Auth middleware valida key em todas as rotas v1
- [ ] Rate limiting por key
- [ ] Formato de response consistente
- [ ] Documentação OpenAPI/Swagger auto-gerada

---

## Story 2: Endpoints SRD (Public, No Auth)

**Rotas:**
```
GET /api/v1/srd/monsters?q=goblin&version=2024&cr=0.25&type=humanoid&limit=20&offset=0
GET /api/v1/srd/monsters/goblin-2024
GET /api/v1/srd/spells?q=fireball&version=2024&level=3&school=evocation&class=wizard
GET /api/v1/srd/spells/fireball-2024
```

**Features:**
- Search com query params (reutilizar lógica de Fuse.js ou SQL LIKE)
- Pagination (limit/offset)
- Filtragem por version, CR, type, level, school, class
- Response inclui stat block completo
- Cache headers: `Cache-Control: public, max-age=3600` (1h)
- Sem auth necessário (conteúdo é SRD, CC-BY-4.0)

**AC:**
- [ ] Search funciona com query params
- [ ] Pagination com limit/offset
- [ ] Filtros por version, CR, type, level, school, class
- [ ] Cache headers corretos
- [ ] Attribution CC-BY-4.0 no response header

---

## Story 3: Endpoints de Sessão (Auth Required)

**Rotas:**
```
GET /api/v1/sessions                    → lista de sessões do DM
GET /api/v1/sessions/:id                → detalhes (combatants, round, turn)
GET /api/v1/sessions/:id/combatants     → lista de combatants com stats
GET /api/v1/sessions/:id/events         → SSE stream de eventos real-time
```

**Regras de sanitização:**
- API key do DM: dados completos (HP, AC, DC, dm_notes)
- API key de terceiros com scope `sessions:read`: dados sanitizados (mesma lógica anti-metagaming)
- Webhooks notificam sobre: turn_advance, hp_update, combat_start, combat_end

**SSE (Server-Sent Events) para real-time:**
```typescript
// GET /api/v1/sessions/:id/events
// Headers: Accept: text/event-stream
// Response: stream de eventos formatados como SSE
export async function GET(req: Request) {
  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to Supabase Realtime channel
      // Forward sanitized events as SSE
      channel.on('broadcast', { event: '*' }, (payload) => {
        controller.enqueue(`data: ${JSON.stringify(sanitize(payload))}\n\n`);
      });
    }
  });
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
  });
}
```

**Use cases:**
- Discord bot mostrando "Round 3 — Turno do Thorin" em tempo real
- OBS overlay mostrando initiative order para streamers
- Dashboard externo mostrando status de combate

**AC:**
- [ ] DM pode listar e visualizar suas sessões
- [ ] SSE stream funciona para eventos real-time
- [ ] Sanitização aplicada para scopes não-DM
- [ ] Webhook registration e delivery funcional

---

## Story 4: Documentação Interativa (Swagger)

**Implementação:**

1. Usar `swagger-jsdoc` ou OpenAPI spec manual em `docs/api-v1-openapi.yaml`
2. Servir Swagger UI em `/api/v1/docs`:
```typescript
// app/api/v1/docs/route.ts
// Serve Swagger UI com spec embeddada
```

3. Incluir exemplos de uso:
   - cURL
   - Python (requests)
   - JavaScript (fetch)
   - Discord.js bot example

**AC:**
- [ ] Swagger UI acessível em `/api/v1/docs`
- [ ] Todos os endpoints documentados com exemplos
- [ ] Try-it-out funciona (com API key)
