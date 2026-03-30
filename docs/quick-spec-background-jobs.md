# Quick Spec: Background Jobs Robustos (Trigger.dev)

> **Horizonte:** 2.3 — Robustez Arquitetural
> **Prioridade:** P1 — Higiene do banco + processos automáticos
> **Estimativa:** ~8h
> **Data:** 2026-03-30

---

## Contexto

`@trigger.dev/sdk ^4.4.3` está instalado no package.json mas subutilizado. O banco cresce indefinidamente — sessões antigas, guest data, invites expirados, analytics brutos nunca são limpos. Processos que hoje seriam manuais precisam de automação.

---

## Story 1: Setup Trigger.dev

**Implementação:**

1. Configurar projeto Trigger.dev (se não feito):
```bash
npx trigger.dev@latest init
```

2. Criar diretório `trigger/` na raiz do projeto:
```
trigger/
├── cleanup-sessions.ts
├── cleanup-guest-data.ts
├── trial-expiry.ts
├── invite-expiry.ts
├── analytics-aggregation.ts
└── srd-bundle-regen.ts
```

3. Configurar variáveis de ambiente:
```
TRIGGER_API_KEY=...
TRIGGER_API_URL=...
```

**AC:**
- [ ] `npx trigger.dev@latest dev` funciona localmente
- [ ] Dashboard do Trigger.dev mostra jobs registrados

---

## Story 2: Cleanup de Sessões Antigas

**Job:** `cleanup-sessions` — Cron diário às 04:00 UTC

**Lógica:**
```typescript
// 1. Sessões com status 'active' mas sem atividade há 30+ dias → status 'archived'
// 2. Sessões com status 'archived' há 90+ dias → soft delete (is_deleted = true)
// 3. Encounters de sessões deletadas → cascade delete combatants
// 4. Session tokens de sessões inativas → deletar
// 5. Logging: quantas sessões processadas em cada categoria
```

**Queries:**
```sql
-- Arquivar sessões inativas
UPDATE sessions SET status = 'archived'
WHERE status = 'active'
  AND updated_at < NOW() - INTERVAL '30 days';

-- Soft delete de sessões antigas
UPDATE sessions SET is_deleted = true
WHERE status = 'archived'
  AND updated_at < NOW() - INTERVAL '90 days';

-- Limpar tokens expirados
DELETE FROM session_tokens
WHERE expires_at < NOW() - INTERVAL '7 days';
```

**AC:**
- [ ] Job roda diariamente sem erro
- [ ] Sessões ativas recentes NÃO são afetadas
- [ ] Tokens expirados são limpos
- [ ] Dashboard mostra métricas (N sessões arquivadas, N tokens limpos)
- [ ] Nenhum dado de sessão ativa é perdido

---

## Story 3: Cleanup de Guest Data

**Job:** `cleanup-guest-data` — Cron diário às 04:30 UTC

**Lógica:**
```typescript
// Guest data é efêmero (localStorage + anonymous auth)
// Mas Supabase cria auth.users entries para anonymous users
// Limpar anonymous users sem atividade há 7+ dias

// 1. Identificar anonymous users (is_anonymous = true no Supabase Auth)
// 2. Verificar se têm session_tokens ativos → NÃO deletar
// 3. Se sem tokens ativos e last_sign_in > 7 dias → delete via Admin API
// 4. Logging: quantos anonymous users limpos
```

**AC:**
- [ ] Anonymous users inativos são limpos semanalmente
- [ ] Anonymous users com sessões ativas NÃO são deletados
- [ ] Logging detalhado para auditoria

---

## Story 4: Trial Expiry Check

**Job:** `trial-expiry` — Cron diário às 08:00 UTC

**Lógica:**
```typescript
// 1. Buscar subscriptions com status 'trial' e trial_ends_at < NOW() + 3 days
// 2. Para cada: enviar notificação via Novu (email + in-app)
//    "Seu trial expira em X dias. Assine para manter acesso."
// 3. Buscar subscriptions com trial_ends_at < NOW() (expirados)
// 4. Atualizar status para 'expired'
// 5. Feature flags: revogar acesso a features pro
```

**Notificação (Novu template):**
```
Subject: "Seu trial do Pocket DM Pro expira em {days} dias"
Body: "Olá {name}, seu período de teste expira em {days} dias.
       Assine para continuar usando campanhas, presets e exports.
       [Assinar agora] [Ver planos]"
```

**AC:**
- [ ] Notificação enviada 3 dias antes da expiração
- [ ] Notificação enviada no dia da expiração
- [ ] Status atualizado corretamente após expiração
- [ ] Features pro bloqueadas após trial expirar (via feature_flags)

---

## Story 5: Campaign Invite Expiry

**Job:** `invite-expiry` — Cron diário às 05:00 UTC

**Lógica:**
```typescript
// campaign_invites tem expiry de 7 dias
// 1. Marcar invites expirados: status = 'expired' WHERE created_at < NOW() - 7 days AND status = 'pending'
// 2. Opcionalmente: notificar DM que convites expiraram sem aceite
// 3. Logging: N invites expirados
```

**AC:**
- [ ] Invites pendentes > 7 dias são marcados como expirados
- [ ] Invites já aceitos NÃO são afetados
- [ ] DM pode reenviar convites expirados (novo invite, novo token)

---

## Story 6: Analytics Aggregation

**Job:** `analytics-aggregation` — Cron diário às 03:00 UTC

**Lógica:**
```typescript
// analytics_events cresce rápido (cada page view, cada ação)
// Agregar em tabela de métricas diárias para queries rápidas

// 1. Agregar eventos do dia anterior:
//    - DAU (distinct user_ids)
//    - Sessões criadas
//    - Combates iniciados
//    - Players joined
//    - Signups
//    - Guest→Auth conversions
// 2. Inserir em tabela analytics_daily (criar migration se não existir)
// 3. Opcionalmente: deletar raw events > 90 dias (manter apenas agregados)
```

**Nova migration `041_analytics_daily.sql`:**
```sql
CREATE TABLE analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  dau INTEGER DEFAULT 0,
  sessions_created INTEGER DEFAULT 0,
  combats_started INTEGER DEFAULT 0,
  players_joined INTEGER DEFAULT 0,
  signups INTEGER DEFAULT 0,
  guest_conversions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_daily_date ON analytics_daily(date);
```

**AC:**
- [ ] Métricas diárias calculadas e salvas
- [ ] Admin dashboard pode ler de analytics_daily (rápido) ao invés de analytics_events (lento)
- [ ] Raw events > 90 dias opcionalmente limpos
- [ ] Dashboard mostra tendências (gráfico DAU/WAU/MAU)

---

## Story 7: SRD Bundle Regeneration

**Job:** `srd-bundle-regen` — Triggered manualmente (não cron)

**Lógica:**
```typescript
// Quando admin edita conteúdo SRD (monster/spell), os bundles estáticos
// em /public/srd/*.json ficam desatualizados
// 1. Buscar todos os monsters e spells do DB
// 2. Gerar bundles: monsters-2014.json, monsters-2024.json, spells-2014.json, spells-2024.json
// 3. Upload para Vercel (ou trigger redeploy)
// 4. Invalidar CDN cache (se possível)
// 5. Broadcast evento content:update para clients ativos
```

**Trigger:** Chamado via API route `/api/admin/content` após edição:
```typescript
await triggerJob("srd-bundle-regen", { editedEntity: "monsters", version: "2024" });
```

**AC:**
- [ ] Bundles regenerados corretamente após edição de conteúdo
- [ ] Clients ativos recebem notificação de update
- [ ] IndexedDB cache invalidado no client
- [ ] Job leva < 30 segundos (bundles são pequenos)
