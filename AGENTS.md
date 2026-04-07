# AGENTS.md

Guia curto para agentes trabalhando neste repositório. Leia isto primeiro. Só abra `CLAUDE.md` e specs longas quando a tarefa tocar uma área crítica.

## Prioridades

1. Preservar parity entre modos de combate.
2. Não quebrar reconexão de jogador.
3. Não vazar conteúdo não-SRD em páginas públicas.
4. Preferir mudanças pequenas, verificáveis e consistentes com a arquitetura atual.

## Stack e Estrutura

- App principal: Next.js App Router + React + TypeScript.
- Auth/realtime/data: Supabase.
- Guest combat: Zustand + localStorage.
- Testes: Jest + Playwright.
- i18n: `messages/` + `next-intl`.

Áreas principais:

- `app/` rotas e API routes
- `components/` UI e clients
- `lib/` regras de negócio, Supabase, SRD, stores
- `docs/` specs e decisões longas
- `data/srd/` dados completos server-only
- `public/srd/` dados públicos filtrados

## Entry Points Críticos

### Combate

- Guest: `app/try/page.tsx` -> `components/guest/GuestCombatClient.tsx`
- Player anônimo: `app/join/[token]/page.tsx` -> `components/player/PlayerJoinClient.tsx`
- DM autenticado: `app/app/session/[id]/page.tsx` -> `components/session/CombatSessionClient`
- Invite autenticado: `app/invite/[token]/page.tsx`

### Regras e serviços relacionados

- Registro/rejoin de player: `lib/supabase/player-registration.ts`
- Estado SRD no client: `lib/srd/srd-mode.ts`
- Spec de reconexão: `docs/spec-resilient-reconnection.md`

## Regras Imutáveis

### 1. Combat parity

Toda mudança em combate deve checar os 3 modos:

- Guest `/try`
- Anônimo `/join/[token]`
- Autenticado `/invite/[token]` ou DM autenticado

Aplicação prática:

- Mudança visual/UI: aplicar nos 3 modos quando fizer sentido
- Realtime/presença/broadcast: anônimo + autenticado
- Persistência do jogador/campanha: auth-only
- Ferramentas de DM: guest + autenticado

Anti-pattern:

- Corrigir só `PlayerJoinClient` e esquecer `GuestCombatClient`
- Corrigir só guest e esquecer player anônimo

### 2. Reconexão zero-fricção

Objetivo: o jogador não deve perceber desconexão nos fluxos normais.

Regras:

- Nunca exigir aprovação do DM para reconexão se o token ainda existe e está ativo.
- `pagehide`, `sendBeacon`, `broadcast` e `presence.untrack()` são best-effort.
- Heartbeat precisa pausar quando a aba está hidden.
- Deve existir reconexão por storage antes de fluxo novo de auth quando aplicável.
- O DM precisa ter fallback por stale detection baseado em `last_seen_at`.
- Nunca mostrar tela branca ou formulário imediatamente durante reconnect; use skeleton/estado de reconexão.

Se mexer em realtime/conexão, verificar:

- `pagehide`
- `visibilitychange` para hidden e visible
- pausa de heartbeat em hidden
- persistência em `sessionStorage` e `localStorage`
- reconnect-from-storage no mount
- proteção contra split-brain
- stale detection no DM

Abra `docs/spec-resilient-reconnection.md` antes de alterar esse fluxo.

### 3. Compliance SRD

Nunca expor conteúdo não-SRD em público.

Regras:

- `data/srd/` pode conter dados completos e traduções, mas é server-only.
- `public/srd/` deve conter apenas conteúdo público filtrado.
- Auth usa `/api/srd/full/...`; guest usa `/srd/...`.
- Nunca colocar traduções PT-BR, whitelists ou dados completos em `public/`.

Se alterar conteúdo SRD:

1. Atualize dados em `data/srd/`
2. Rode `npx tsx scripts/filter-srd-public.ts`
3. Verifique se a contagem não subiu de forma suspeita
4. Valide com TypeScript/build

Se a mudança tocar filtro, whitelist ou server data, abra também:

- `lib/srd/srd-data-server.ts`
- `scripts/filter-srd-public.ts`
- `CLAUDE.md`

## Fluxos que Merecem Cuidado Extra

### `components/player/PlayerJoinClient.tsx`

Arquivo central e sensível. Antes de editar:

- entenda auth init
- reconnect flow
- late join
- polling fallback
- realtime channel lifecycle
- sessão encerrada / sessão transferida

Evite refactors amplos sem necessidade.

### `lib/supabase/player-registration.ts`

Qualquer mudança aqui pode afetar:

- claim de token
- duplicate players
- reconnect same-device
- reconnect cross-device
- proteção contra takeover indevido

### Guest combat

`components/guest/GuestCombatClient.tsx` concentra muita lógica local. Mudanças de combate quase sempre exigem revisão aqui também.

### SRD mode switching

O dataset SRD pode trocar entre `public` e `full` no mesmo tab depois de login, logout ou mudança de contexto auth.

Regras:

- Não assumir que `initializeSrd()` roda uma vez só por aba.
- Se o modo mudar, o store em memória precisa descartar o snapshot anterior e recarregar o dataset correto.
- Cache persistido já separa `public` e `full`, mas o estado em memória também precisa respeitar isso.

Referência: `lib/stores/srd-store.ts` e `docs/srd-full-access-mode-switch.md`.

## Como Trabalhar Bem Neste Repo

- Faça leitura localizada antes de alterar.
- Preserve padrões existentes e nomes já consolidados.
- Prefira correções incrementais a reescritas.
- Não assuma que uma feature de combate vive em um único client.
- Se tocar UX de player, verifique também estados de loading, reconnect, session ended e late join.
- Se tocar i18n, atualize `messages/en.json` e `messages/pt-BR.json` quando necessário.

## Checklist Rápido Antes de Encerrar

- A mudança respeita parity entre guest/anônimo/auth?
- Há impacto em reconexão/presença/token ownership?
- Há risco de expor conteúdo não-SRD?
- O estado otimista e o realtime continuam coerentes?
- Testes ou validações mínimas foram executados?

## Comandos Úteis

O projeto usa RTK para reduzir ruído de terminal. Quando disponível, prefira prefixar comandos com `rtk`.

Exemplos:

- `rtk git status`
- `rtk tsc`
- `rtk lint`
- `rtk playwright test`

## Quando Ler Mais

Abra `CLAUDE.md` se a tarefa envolver:

- arquitetura de combate
- reconexão/presença/realtime
- regras SRD/publicação

Abra `docs/spec-resilient-reconnection.md` se mexer em:

- `PlayerJoinClient`
- `player-registration`
- `player-disconnect`
- `session state`
- presença do DM/jogador

## Regra Final

Se houver dúvida entre velocidade e segurança, escolha a opção que preserva:

- parity de combate
- reconexão invisível
- compliance SRD
