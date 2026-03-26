# Project Context for AI Agents

_Regras críticas e padrões que agentes AI devem seguir ao implementar código neste projeto. Foco em detalhes não-óbvios que agentes podem errar._

---

## O Que É Este Projeto

**Combat Tracker gratuito para D&D 5e.** O DM gerencia combate no laptop, jogadores acompanham pelo celular em tempo real. Não é um VTT genérico — é focado exclusivamente em tracking de combate com regras oracle integrado.

**Proposta de valor principal:** Anti-metagaming — jogadores NUNCA veem dados numéricos exatos de monstros (HP, AC, DC). Veem apenas labels de status (LIGHT/MODERATE/HEAVY/CRITICAL).

**Modelo:** Gratuito com guest mode de 60 minutos como funil de conversão. Auth por email (PKCE flow).

**Idiomas:** pt-BR (primário) + en. Toda UI é internacionalizada.

**Referências visuais:** Liberty Ragnarok Online (UI principal), Kastark + 5e.tools (UX de combate).

---

## Technology Stack & Versions

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js (App Router) | 16 |
| UI Library | React | 19 |
| Language | TypeScript (strict mode) | 5 |
| Styling | Tailwind CSS | 3.4 |
| Components | shadcn/ui + Radix UI | latest |
| Database | Supabase (PostgreSQL + Realtime + Auth) | latest |
| State | Zustand (subscribeWithSelector) | 5.0 |
| Search | Fuse.js (client-side) | 7.1 |
| i18n | next-intl | 4.8 |
| Validation | Zod | 4.3 |
| Drag & Drop | dnd-kit | latest |
| Command Palette | cmdk | 1.1 |
| Icons | Lucide React | latest |
| Testing | Jest + React Testing Library | 30 |
| Monitoring | Sentry + Vercel Analytics | latest |
| SRD Cache | idb (IndexedDB) | 8.0 |
| AI Oracle | Google Gemini API | latest |
| Hosting | Vercel | — |

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key
- `GEMINI_API_KEY` — Google Gemini (Oracle AI)

---

## Regras Críticas de Implementação

### 1. Sanitização de Broadcast (SEGURANÇA DO JOGO)

**NUNCA enviar dados exatos de monstros para jogadores.** Toda atualização de combate broadcast para o player channel DEVE passar pela sanitização em `lib/realtime/broadcast.ts`.

- HP de monstro → enviar apenas `hp_status` (LIGHT/MODERATE/HEAVY/CRITICAL via `lib/utils/hp-status.ts`)
- AC, spell_save_dc de monstro → NUNCA broadcast
- `dm_notes` → NUNCA broadcast (stripped automaticamente por `stripDmFields`)
- Dados de player characters → podem ser enviados normalmente (o jogador é dono)

Violação desta regra é um **bug crítico de segurança do jogo**.

### 2. SRD Versioning (2014 ≠ 2024)

Monstros e spells existem em duas versões (2014 e 2024) que **coexistem no mesmo banco** e nos mesmos bundles. NUNCA assumir que existe só uma versão.

- Filtrar SEMPRE por `ruleset_version`
- Bundles estáticos: `monsters-2014.json`, `monsters-2024.json`, `spells-2014.json`, `spells-2024.json`
- Unique constraint no DB: `(name, version)` — mesmo nome, versões diferentes são entidades distintas
- Combatants podem trocar de versão mid-combat via `combat:version_switch`

### 3. Internacionalização Obrigatória

- TODA string de UI vai em `messages/pt-BR.json` e `messages/en.json`
- NUNCA hardcode texto em componentes
- Usar `useTranslations(namespace)` em client components
- Namespaces organizados por domínio: `auth`, `combat`, `oracle`, `player`, `nav`, `compendium`, etc.
- Middleware detecta `Accept-Language` e seta cookie `NEXT_LOCALE`

### 4. Testes Obrigatórios

- Todo código novo precisa de testes (Jest 30 + React Testing Library)
- 215+ arquivos de teste existentes — manter cobertura
- Test files: `*.test.ts` / `*.test.tsx`
- **Não temos E2E** — gap conhecido no backlog

### 5. Validação de Input

- Toda input de usuário validada com Zod schemas em `lib/validation/schemas.ts`
- Sanitização server-side em `lib/utils/sanitize.ts`
- RLS (Row Level Security) no Supabase — players só acessam sessões com token válido

### 6. Acessibilidade (WCAG 2.1 AA)

- Dark mode default (`#1a1a2e` background)
- Touch targets ≥ 44px para mobile
- Keyboard navigation completa na DM view
- `aria-labels` em elementos interativos
- `aria-live` regions para atualizações dinâmicas
- Skeleton loaders para estados de loading

---

## Padrões de Arquitetura

### Optimistic UI (Padrão Core)

Toda ação de combate segue este fluxo:
1. **Aplica imediatamente** no Zustand store (UI atualiza instant)
2. **Broadcast** para jogadores via Supabase Realtime (background)
3. **Persiste** no banco de dados (async)
4. **Reconcilia** no reconnect (fetch server state se divergiu)

### Realtime Broadcast

- Channel pattern: `session:${sessionId}` (isolado por sessão)
- Event pattern: `domain:action` (ex: `combat:hp_update`, `session:state_sync`)
- `broadcast: { self: false }` — DM não recebe próprias mensagens
- Fallback: WebSocket degrada → polling via `/api/session/[id]/state`
- Backup local: IndexedDB via `lib/stores/combat-persist.ts`

### Eventos de Broadcast

```
combat:hp_update         → current_hp, temp_hp (ou hp_status para monstros)
combat:turn_advance      → current_turn_index, round_number
combat:condition_change  → combatant_id, conditions[]
combat:combatant_add     → combatant sanitizado
combat:combatant_remove  → combatant_id
combat:initiative_reorder → combatants[] reordenados
combat:version_switch    → combatant_id, ruleset_version
combat:defeated_change   → combatant_id, is_defeated
combat:stats_update      → name, max_hp, ac, spell_save_dc
combat:player_notes_update → combatant_id, player_notes
session:state_sync       → encounter state completo (reconnect)
```

### Client Components (Não Server Actions)

- App é predominantemente client-side (`"use client"` em ~97 componentes)
- **NÃO usamos Server Actions** (`"use server"`)
- Lógica server-side em API Routes: `/app/api/`
- Middleware (`middleware.ts`) faz auth refresh + i18n detection

### Zustand Stores (Separados por Domínio)

| Store | Arquivo | Responsabilidade |
|-------|---------|-----------------|
| Combat | `lib/stores/combat-store.ts` | Estado do encounter ativo (combatants, rounds, undo stack) |
| Guest Combat | `lib/stores/guest-combat-store.ts` | Combate efêmero sem auth |
| SRD | `lib/stores/srd-store.ts` | Inicialização e status dos bundles SRD |
| Dice History | `lib/stores/dice-history-store.ts` | Histórico de rolagens |
| Pinned Cards | `lib/stores/pinned-cards-store.ts` | Cards fixados do Oracle |

### SRD System

- Bundles estáticos servidos de `/public/srd/` com CDN caching imutável (1 ano)
- Search 100% client-side via Fuse.js (target ≤300ms, sem round-trip ao server)
- Cache em IndexedDB via `idb` library
- `SrdInitializer` component carrega bundles no app load
- Scripts de import em `/scripts/` (open5e API + 5etools)

---

## Estrutura do Projeto

```
app/
├── page.tsx                    # Landing page (marketing)
├── layout.tsx                  # Root layout (i18n, theme, auth providers)
├── auth/                       # Auth flows (login, signup, confirm, forgot-password)
├── app/                        # Rotas protegidas (requer auth)
│   ├── dashboard/              # DM dashboard (campanhas, encounters salvos)
│   ├── session/[id]/           # Sessão de combate (view principal do DM)
│   ├── session/new/            # Criar nova sessão
│   ├── compendium/             # Navegador SRD (monstros, spells, conditions)
│   ├── campaigns/[id]/         # Detalhe da campanha
│   ├── presets/                # Presets de monstros
│   ├── settings/               # Configurações da conta
│   └── onboarding/             # Wizard de primeiro acesso
├── api/                        # API Routes
│   ├── session/[id]/state/     # State sync endpoint (reconnect fallback)
│   ├── oracle-ai/              # Google Gemini proxy
│   └── account/delete/         # Account deletion (GDPR)
├── join/[token]/               # Player join via token (sem auth)
├── try/                        # Guest mode (60 min, sem login)
├── admin/                      # Admin panel (métricas, users, SRD editing)
└── legal/                      # Privacy policy, attribution

components/
├── combat/          # UI de combate (CombatantRow, HpAdjuster, EncounterSetup...)
├── oracle/          # Rules oracle (MonsterSearch, SpellSearch, CommandPalette...)
├── player/          # Player view (PlayerInitiativeBoard, PlayerLobby, SyncIndicator)
├── session/         # Session management (CombatSessionClient, ShareSessionButton)
├── dashboard/       # DM dashboard (CampaignManager, OnboardingWizard)
├── admin/           # Admin (MetricsDashboard, ContentEditor, UserManager)
├── compendium/      # Compendium browser
├── guest/           # Guest mode (GuestBanner, GuestCombatClient)
├── dice/            # Dice UI (DiceHistoryPanel, ClickableRoll)
├── presets/         # Preset management
├── marketing/       # Landing page (HeroParticles, ScrollReveal)
├── layout/          # Navbar, DmSyncDot
├── srd/             # SrdInitializer, MonsterToken
├── ui/              # shadcn/ui primitives + ErrorBoundary
└── auth/            # Auth forms

lib/
├── stores/          # Zustand stores
├── hooks/           # Custom hooks (useCombatActions, useCombatKeyboardShortcuts)
├── realtime/        # WebSocket broadcast, channel hooks, reconnect
├── supabase/        # Client/server Supabase clients, DB access functions
├── srd/             # SRD loader, search, cache
├── types/           # TypeScript types (combat.ts, database.ts, realtime.ts)
├── utils/           # Utilities (initiative, hp-status, sanitize, dice)
├── validation/      # Zod schemas
└── oracle-ai/       # AI system prompt

supabase/migrations/ # 12 migration files (schema completo)
scripts/             # SRD data import e bundle generation
messages/            # i18n: pt-BR.json, en.json
public/srd/          # Static SRD bundles (JSON, CDN-cached)
docs/                # Sprint documentation
_bmad-output/        # Architecture, PRD, epics, tech specs
```

---

## Modelo de Dados (Entidades Core)

### Relações Principais

```
User (DM) ──1:N──► Campaign ──1:N──► PlayerCharacter
     │
     └──1:N──► Session ──1:N──► Encounter ──1:N──► Combatant
                  │                                    │
                  └──1:N──► SessionToken          monster_id? ──► Monster
                            (player access)       player_character_id? ──► PlayerCharacter
```

### Distinções Importantes

- **Session ≠ Encounter**: Session contém tokens de acesso, lifecycle, estado da conexão. Encounter contém combatants e rounds. Uma session pode ter múltiplos encounters.
- **Combatant dual-type**: `monster_id` (ref Monster) OU `player_character_id` (ref PlayerCharacter) — nunca ambos.
- **Conditions**: `TEXT[]` (PostgreSQL array) no combatant — lista de strings.
- **Session Tokens**: Efêmeros, scoped por sessão, auto-expiram. Usados para player access sem auth.
- **SRD Tables**: `monsters` e `spells` com unique constraint `(name, version)`.

### Tabelas

| Tabela | Descrição | RLS |
|--------|-----------|-----|
| `users` | DM accounts + admin flag + language pref | owner-only |
| `campaigns` | Grupos de jogadores salvos | owner-only |
| `player_characters` | PCs em uma campanha (HP, AC, DC) | campaign owner |
| `sessions` | Sessões de jogo ativas/arquivadas | owner + token holders |
| `encounters` | Combates dentro de uma sessão | session owner |
| `combatants` | Monstros + PCs no combate (HP, initiative, conditions, notes) | encounter owner |
| `monsters` | SRD monsters (2014 + 2024) | public read |
| `spells` | SRD spells (2014 + 2024) | public read |
| `condition_types` | Condições D&D (Blinded, Charmed, etc.) | public read |
| `session_tokens` | Tokens efêmeros de acesso player | session owner |
| `monster_presets` | Presets customizados de monstros | owner-only |

---

## Convenções de Código

### Naming

- **Componentes**: PascalCase (`CombatantRow.tsx`)
- **Hooks**: `use*` camelCase (`useCombatActions.ts`)
- **Stores**: `*-store.ts` kebab-case (`combat-store.ts`)
- **Utils**: kebab-case (`hp-status.ts`)
- **Types**: kebab-case (`combat.ts`, `realtime.ts`)
- **API Routes**: kebab-case dirs (`/api/session/[id]/state/route.ts`)

### Imports

- **Absolutos com `@/` alias**: `import { X } from "@/lib/utils/initiative"`
- Nunca imports relativos exceto dentro do mesmo diretório
- Configurado em `tsconfig.json`: `"@/*": ["./*"]`

### Componentes

- `"use client"` explícito em todo componente interativo
- Props tipadas com `interface` inline no mesmo arquivo
- shadcn/ui como base — customizar via Tailwind, não override de CSS
- `ErrorBoundary` wrapping em componentes que podem falhar

### Segurança

- Security headers em `next.config.ts` (HSTS, CSP, X-Frame-Options)
- CSP permite: Supabase, Sentry, Vercel analytics
- Input sanitization via `lib/utils/sanitize.ts`
- Zod validation em `lib/validation/schemas.ts`
- Auth PKCE flow via Supabase (nunca tokens em URL)

---

## Sistema Visual

- **Dark mode padrão**: background `#1a1a2e`, classe `dark` no HTML
- **Action Color Semantics**: damage = vermelho, heal = verde, buff = azul, debuff = roxo
- **Font**: system font stack (sans-serif)
- **Spacing**: Tailwind scale padrão
- **Mobile-first** no player view — DM view é desktop-first
- **Touch targets**: mínimo 44px em mobile
- **Referências**: Liberty Ragnarok Online (UI), Kastark (combat cards), 5e.tools (data tables)
- **Theme switching**: via `next-themes` (class strategy)

---

## Documentação de Sprint

- Sprint docs em `docs/` com nome `{tipo}-sprint-{data}.md`
- Tracking de épicos: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Tech specs detalhados: `_bmad-output/implementation-artifacts/`
- Architecture, PRD, UX spec: `_bmad-output/planning-artifacts/`
- Épicos definidos em `_bmad-output/planning-artifacts/epics.md` (10 épicos totais)

---

## Performance Targets (NFRs)

- FCP ≤ 1.5s
- TTI ≤ 3s
- Oracle response (modal/search) ≤ 300ms
- WebSocket latency ≤ 500ms
- SRD bundles: CDN cached, `Cache-Control: public, max-age=31536000, immutable`
