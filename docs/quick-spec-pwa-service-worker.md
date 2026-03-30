# Quick Spec: PWA + Service Worker

> **Horizonte:** 2.1 — Robustez Arquitetural
> **Prioridade:** P1 — Mesa presencial = WiFi instável
> **Estimativa:** ~12h
> **Data:** 2026-03-30

---

## Contexto

O Pocket DM é usado em mesas presenciais onde WiFi é imprevisível. Hoje, se a conexão cair:
- SRD funciona (cached em IndexedDB via `idb`)
- Combat state é persistido no Supabase (recuperável via reconnect)
- MAS: o app não carrega se offline (nenhum app shell caching)
- MAS: ações de combate falham silenciosamente se a conexão cai mid-action

PWA transforma o app de "site que precisa de internet" para "app instalável que funciona offline".

---

## Story 1: Web App Manifest

**Implementação:**

1. Criar `public/manifest.json`:
```json
{
  "name": "Pocket DM — Combat Tracker",
  "short_name": "Pocket DM",
  "description": "D&D 5e combat tracker for in-person tables",
  "start_url": "/app/dashboard",
  "display": "standalone",
  "background_color": "#13131E",
  "theme_color": "#D4A853",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

2. Adicionar em `app/layout.tsx`:
```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#D4A853" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

3. Gerar ícones a partir do Crown d20 logo (192, 512, maskable).

**AC:**
- [ ] "Add to Home Screen" funciona no Chrome Android
- [ ] "Add to Home Screen" funciona no Safari iOS
- [ ] Ícone correto (Crown d20) aparece na home screen
- [ ] Splash screen com background #13131E e logo gold
- [ ] App abre em standalone mode (sem browser chrome)

---

## Story 2: Service Worker — App Shell Caching

**Implementação:**

1. Criar `public/sw.js` (ou usar `next-pwa` / `serwist` para Next.js):

```
Estratégia de cache:
├── App Shell (HTML, CSS, JS bundles)
│   └── Cache-First, atualiza em background (stale-while-revalidate)
├── SRD Bundles (/public/srd/*.json)
│   └── Cache-First, imutável (já tem max-age=31536000)
├── Audio Files (/public/sounds/*.mp3)
│   └── Cache on First Use (não pre-cache — são 64 arquivos)
├── API Calls (/api/*)
│   └── Network-First, fallback para cache (state sync)
├── Supabase Realtime
│   └── NÃO cachear (WebSocket, não HTTP)
└── Images/Fonts
    └── Cache-First
```

2. Registrar service worker em `app/layout.tsx`:
```typescript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

3. Cache versioning: `CACHE_VERSION = 'v1'` — incrementar em cada deploy.

**AC:**
- [ ] App carrega offline após primeira visita (app shell)
- [ ] SRD search funciona offline (bundles cached)
- [ ] Áudio toca offline (se já foi tocado uma vez)
- [ ] Novas versões do app são detectadas e atualizadas em background
- [ ] Banner "Nova versão disponível" quando update pronto

---

## Story 3: Offline Combat Actions Queue

**Problema:** Se a conexão cair durante o combate, ações no Zustand store funcionam (optimistic UI), mas broadcast e DB persist falham silenciosamente.

**Implementação:**

1. Criar `lib/realtime/offline-queue.ts`:
```typescript
interface QueuedAction {
  id: string;
  event: RealtimeEvent;
  dbOperation: () => Promise<void>;
  timestamp: number;
}

// Quando offline:
// 1. Ação aplica no Zustand (já funciona)
// 2. Broadcast falha → enfileirar na queue
// 3. DB persist falha → enfileirar na queue
// 4. Quando reconectar: replay queue em ordem

export function enqueueAction(action: QueuedAction): void;
export function replayQueue(sessionId: string): Promise<void>;
export function getQueueSize(): number;
```

2. Persistir queue em IndexedDB (sobrevive a refresh):
```typescript
// Usar combat-persist.ts como base
const QUEUE_STORE = 'offline-queue';
```

3. Indicador visual de estado offline:
```
🟢 Online (tudo sincronizado)
🟡 Offline (ações sendo enfileiradas — X ações pendentes)
🔄 Sincronizando (replay de N ações)
🔴 Erro de sync (ações que falharam no replay)
```

4. Conflito resolution: se o server state divergiu durante offline, usar server state como truth e mostrar diff ao DM.

**AC:**
- [ ] Ações de combate funcionam sem conexão (HP, turn, conditions)
- [ ] Queue persiste em IndexedDB (sobrevive refresh)
- [ ] Reconexão faz replay automático da queue
- [ ] Indicador visual mostra estado de sync
- [ ] Conflitos são resolvidos (server wins, DM vê diff)
- [ ] Player view mostra "DM offline — aguardando reconexão"

---

## Story 4: Install Prompt Estratégico

**Implementação:**

1. Interceptar `beforeinstallprompt` event no browser.
2. NÃO mostrar imediatamente — esperar momento estratégico:
   - **DM:** Após completar primeiro combate com sucesso
   - **Player:** Após terceira sessão como player
   - **Guest:** Após signup (no onboarding)
3. Banner discreto (não modal):
```
"Instale Pocket DM para acesso rápido na mesa" [Instalar] [Depois]
```
4. Se "Depois", não mostrar novamente por 7 dias.
5. Tracking: `analytics_events` com `pwa:install_prompt_shown`, `pwa:installed`, `pwa:dismissed`.

**AC:**
- [ ] Prompt aparece no momento correto (não no primeiro load)
- [ ] "Depois" respeita cooldown de 7 dias
- [ ] Analytics trackeia conversão de install
- [ ] Funciona no Chrome Android e Edge (Safari não suporta beforeinstallprompt)
