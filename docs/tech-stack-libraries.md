# Tech Stack & Bibliotecas Disponíveis

**Projeto:** Taverna do Mestre
**Atualizado:** 2026-03-27
**Referência:** PRD V2 (`docs/prd-v2.md`)

---

## Stack Principal

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js (App Router) | latest |
| Linguagem | TypeScript | ^5 |
| Styling | Tailwind CSS + CSS Variables | ^3.4 |
| Componentes | shadcn/ui (New York style) | via CLI |
| Primitivas | Radix UI | diversos |
| Backend | Supabase (Auth, DB, Realtime, Storage) | latest |
| Monitoramento | Sentry | ^10.45 |
| Analytics | Vercel Analytics | ^2.0 |
| i18n | next-intl | ^4.8 |
| Testes | Jest + Testing Library | ^30 / ^16 |

---

## Bibliotecas de UI & Animacao

### shadcn/ui

**Status:** Configurado e em uso
**Config:** `components.json` (style: new-york, rsc: true)
**Aliases:** `@/components/ui`, `@/lib/utils`

**O que eh:**
Colecao de componentes React acessiveis construidos sobre Radix UI + Tailwind CSS. Nao eh uma dependencia — componentes sao copiados pro projeto e customizados.

**Como usar:**

```bash
# Adicionar um componente novo
npx shadcn@latest add [componente]

# Ver componentes disponiveis
npx shadcn@latest search shadcn

# Ver docs de um componente
npx shadcn@latest docs [componente]
```

**Componentes ja instalados:**
- `alert-dialog`, `badge`, `button`, `card`, `checkbox`, `dialog`, `dropdown-menu`, `input`, `label`

**Componentes recomendados para instalar conforme necessidade:**
- `toast` / `sonner` — feedback ao usuario (erros, sucesso)
- `data-table` — listagem de monstros, spells, items
- `tabs` — navegacao no compendium
- `popover` — tooltips ricos em stat blocks
- `sheet` — paineis laterais mobile
- `command` — command palette (ja usam `cmdk`)
- `select` — dropdowns estilizados
- `separator`, `scroll-area` — layout

**Referencia:** [ui.shadcn.com/docs](https://ui.shadcn.com/docs)

---

### Magic UI

**Status:** Disponivel (via framer-motion)
**Pacote:** `framer-motion` ^12.38.0
**Instalado em:** 2026-03-27

**O que eh:**
Biblioteca de componentes animados que extende shadcn/ui. Componentes sao copy-paste — nao eh uma dependencia direta. Usa Framer Motion por baixo para animacoes.

**Como usar:**

```bash
# Instalar um componente Magic UI
npx shadcn@latest add "https://magicui.design/r/[componente]"
```

**Componentes recomendados para Taverna do Mestre:**
- `animated-list` — log de combate com entradas animadas
- `number-ticker` — HP e initiative com transicao numerica
- `shimmer-button` — CTAs de conversao (upgrade pro, iniciar combate)
- `border-beam` — destaque visual no turno ativo
- `pulse-card` — cards de jogador com status pulsante
- `fade-text` — transicoes de texto no player view
- `particles` — efeito ambiental na tela de combate
- `dock` — barra de acoes do DM estilo macOS

**Quando usar:**
- Sprints de UX/polish visual
- Player view (diferenciacao visual)
- Tela de combate (feedback visual de acoes)
- Landing page e conversao freemium

**Referencia:** [magicui.design](https://magicui.design)

---

### Framer Motion

**Status:** Instalado
**Pacote:** `framer-motion` ^12.38.0

**O que eh:**
Biblioteca de animacoes para React. Base do Magic UI, mas pode ser usada diretamente para animacoes customizadas.

**Casos de uso no projeto:**
- `AnimatePresence` — transicoes ao adicionar/remover criaturas do combate
- `motion.div` — animacoes de entrada/saida nos paineis
- `layoutId` — transicoes shared-layout entre combat tracker e stat block
- `useScroll` / `useTransform` — efeitos de parallax no player view
- Variants e gestures — drag-and-drop visual feedback

**Exemplo basico:**

```tsx
import { motion, AnimatePresence } from 'framer-motion';

// Animar entrada/saida de criaturas no tracker
<AnimatePresence>
  {creatures.map(creature => (
    <motion.div
      key={creature.id}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
    >
      <CreatureCard creature={creature} />
    </motion.div>
  ))}
</AnimatePresence>
```

**Referencia:** [motion.dev](https://motion.dev)

---

## Notificacoes

### Novu

**Status:** Instalado (SDK client + server)
**Pacotes:** `@novu/react` ^3.14.1, `@novu/node` ^2.6.6
**Instalado em:** 2026-03-27

**O que eh:**
Infraestrutura open-source de notificacoes. Unifica in-app inbox, push, email e SMS via uma unica API. Componente React embeddable.

**Quando usar:**
- Epic de Player Experience (notificacoes de turno, convites)
- Sistema de convite para mesa (email + in-app)
- Alertas do DM (jogador entrou, jogador saiu)
- Notificacoes de trial expirando (freemium)

**Arquitetura:**

```
[Next.js Server Action / API Route]
       |
       v
  @novu/node  -->  Novu Cloud  -->  Canais (in-app, email, push)
       |
       v
  @novu/react (<Inbox />)  -->  Player view / DM dashboard
```

**Setup necessario:**
1. Criar conta em [novu.co](https://novu.co) (free tier generoso)
2. Obter `NOVU_SECRET_KEY` e `NOVU_APP_ID`
3. Adicionar ao `.env.local`
4. Criar workflows no dashboard do Novu
5. Integrar `<NovuProvider>` e `<Inbox />` no layout

**Exemplo basico (server):**

```typescript
import { Novu } from '@novu/node';

const novu = new Novu(process.env.NOVU_SECRET_KEY!);

// Notificar jogador que eh seu turno
await novu.trigger('turn-notification', {
  to: { subscriberId: playerId },
  payload: {
    creatureName: 'Gandalf',
    sessionCode: 'ABC123',
  },
});
```

**Exemplo basico (client):**

```tsx
import { NovuProvider, Inbox } from '@novu/react';

<NovuProvider applicationIdentifier={NOVU_APP_ID} subscriberId={playerId}>
  <Inbox />
</NovuProvider>
```

**Referencia:** [docs.novu.co](https://docs.novu.co)

---

## Background Jobs & Cron

### Trigger.dev

**Status:** Instalado (SDK)
**Pacote:** `@trigger.dev/sdk` ^4.4.3
**Instalado em:** 2026-03-27

**O que eh:**
Plataforma open-source para background jobs em TypeScript. Long-running tasks com retries, queues, cron schedules e observability. Roda com Next.js nativamente.

**Quando usar:**
- Limpeza de sessoes guest (timer 60min)
- Processamento de analytics em batch
- Emails de trial expirando (freemium)
- Sincronizacao de dados do compendium
- Qualquer tarefa que nao deve bloquear o request do usuario

**Arquitetura:**

```
[Next.js App]
     |
     v
  @trigger.dev/sdk  -->  Trigger.dev Cloud  -->  Task execution
     |                                              |
     v                                              v
  trigger/  (pasta de tasks)                  Dashboard (observability)
```

**Setup necessario:**
1. Criar conta em [trigger.dev](https://trigger.dev) (free tier)
2. Obter `TRIGGER_SECRET_KEY`
3. Adicionar ao `.env.local`
4. Criar pasta `trigger/` na raiz do projeto
5. Configurar `trigger.config.ts`

**Exemplo — cron de limpeza de sessoes guest:**

```typescript
import { schedules } from "@trigger.dev/sdk/v3";

export const cleanupGuestSessions = schedules.task({
  id: "cleanup-guest-sessions",
  cron: "*/30 * * * *", // a cada 30 minutos
  run: async () => {
    const { data, error } = await supabase
      .from('sessions')
      .delete()
      .eq('type', 'guest')
      .lt('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString());

    return { deleted: data?.length ?? 0 };
  },
});
```

**Exemplo — task com retry:**

```typescript
import { task } from "@trigger.dev/sdk/v3";

export const sendTrialExpiringEmail = task({
  id: "send-trial-expiring",
  retry: { maxAttempts: 3 },
  run: async ({ userId, email }: { userId: string; email: string }) => {
    // enviar email via Novu ou Resend
    await novu.trigger('trial-expiring', {
      to: { subscriberId: userId },
      payload: { email },
    });
  },
});
```

**Referencia:** [trigger.dev/docs](https://trigger.dev/docs)

---

## Real-time & Backend

### Supabase Realtime (Aprofundamento)

**Status:** Ja integrado (usar mais)
**Pacotes:** `@supabase/supabase-js`, `@supabase/ssr`

**O que eh:**
Supabase Realtime oferece 3 primitivas alem do basico de DB:

**1. Broadcast — Mensagens efemeras entre clients**

```typescript
// DM envia atualizacao de combate para todos os jogadores
const channel = supabase.channel(`combat:${sessionId}`);

// DM side
channel.send({
  type: 'broadcast',
  event: 'combat-update',
  payload: { creatures, round, currentTurn },
});

// Player side
channel.on('broadcast', { event: 'combat-update' }, ({ payload }) => {
  setCombatState(payload);
});

await channel.subscribe();
```

**Quando usar:** Atualizacoes de combate em tempo real, sem persistir no banco.

**2. Presence — Quem esta online**

```typescript
const channel = supabase.channel(`session:${sessionId}`);

// Jogador anuncia presenca
channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState();
  setOnlinePlayers(Object.values(state).flat());
});

await channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    await channel.track({
      playerId,
      playerName,
      joinedAt: new Date().toISOString(),
    });
  }
});
```

**Quando usar:** Mostrar jogadores online, resolver late-join e auto-join.

**3. Postgres Changes — Reagir a mudancas no banco**

```typescript
// Escutar mudancas na tabela de combate
supabase
  .channel('combat-changes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'combat_state', filter: `session_id=eq.${sessionId}` },
    (payload) => {
      handleCombatChange(payload);
    }
  )
  .subscribe();
```

**Quando usar:** Sincronizar estado persistido (campanhas, presets, encounters).

**Referencia:** [supabase.com/docs/guides/realtime](https://supabase.com/docs/guides/realtime)

---

## Mapa de Bibliotecas por Epic

| Epic | Bibliotecas Relevantes |
|------|----------------------|
| Epic 0: Tech Debt | shadcn/ui (toast/sonner para error handling) |
| Epic 1: Combat Core | Framer Motion (AnimatePresence), Supabase Realtime (Broadcast) |
| Epic 2: Compendium+ | shadcn/ui (data-table, tabs, scroll-area) |
| Epic 3: Player Experience | Supabase Realtime (Presence, Broadcast), Novu (notificacoes), Magic UI (animacoes player view) |
| Epic 4: Freemium | Trigger.dev (cron jobs, trial management), Novu (emails) |
| Epic 5: Campanhas Ricas | Supabase Realtime (Postgres Changes), shadcn/ui (sheet, tabs) |
| Epic 6: DM Tools | Magic UI (polish visual), Framer Motion (transicoes) |
| Epic 7: Growth | Magic UI (landing page), Novu (onboarding emails) |

---

## Regras para Agentes

1. **Antes de instalar qualquer componente shadcn/ui novo**, verifique se ja existe em `components/ui/`
2. **Magic UI requer framer-motion** — ja instalado, nao instalar novamente
3. **Novu requer setup de conta** — nao criar componentes Novu ate ter `NOVU_SECRET_KEY` no `.env.local`
4. **Trigger.dev requer setup de conta** — nao criar tasks ate ter `TRIGGER_SECRET_KEY` no `.env.local`
5. **Supabase Realtime ja funciona** — nao precisa de setup adicional, apenas usar as primitivas
6. **Animacoes sao opcionais** — nao adicionar animacoes a menos que a story/spec peca explicitamente
7. **Sempre use componentes existentes** antes de criar novos — verifique `components/ui/` e o registry do shadcn
