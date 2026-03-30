# Project Context for AI Agents

_Regras críticas e padrões que agentes AI devem seguir ao implementar código neste projeto. Foco em detalhes não-óbvios que agentes podem errar._

---

## O Que É Este Projeto

**Combat Tracker para D&D 5e — marca: Pocket DM.** O DM gerencia combate no laptop, jogadores acompanham pelo celular em tempo real. Não é um VTT genérico — é focado exclusivamente em tracking de combate com regras oracle integrado.

**Proposta de valor principal:** Anti-metagaming — jogadores NUNCA veem dados numéricos exatos de monstros (HP, AC, DC). Veem apenas labels de status (LIGHT/MODERATE/HEAVY/CRITICAL).

**Modelo:** Freemium (Beta = tudo gratuito). Guest mode de 60 minutos como funil de conversão (banner warning, hard block planejado para o futuro). Auth por email (PKCE flow). Billing via Stripe preparado para ativação pós-beta.

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
| E2E Testing | Playwright | 1.58 |
| Monitoring | Sentry (`@sentry/nextjs`) | 10.45 |
| Analytics | Vercel Analytics | latest |
| SRD Cache | idb (IndexedDB) | 8.0 |
| AI Oracle | Google Gemini API | latest |
| Animations | Framer Motion | 12.38 |
| Notifications | Novu (`@novu/node` + `@novu/react`) | latest |
| Background Jobs | Trigger.dev | 4.4 |
| Payments | Stripe (preparação pós-beta) | 21 |
| Rate Limiting | Upstash (`@upstash/ratelimit` + `@upstash/redis`) | latest |
| Toasts | Sonner | 2.0 |
| QR Codes | qrcode | 1.5 |
| Markdown | react-markdown | 10.1 |
| Virtualization | react-window | 2.2 |
| Theme | next-themes | 0.4 |
| Hosting | Vercel | — |

**Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key
- `GEMINI_API_KEY` — Google Gemini (Oracle AI)
- `STRIPE_SECRET_KEY` — Stripe (não configurado no beta)
- `NOVU_API_KEY` — Novu notifications

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
- 558+ testes passando — manter cobertura
- Test files: `*.test.ts` / `*.test.tsx`
- **E2E com Playwright** existe mas precisa de expansão — reports em `docs/qa-e2e-results-*.md`

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
── Combat ──
combat:hp_update            → current_hp, temp_hp, death_saves (ou hp_status para monstros)
combat:turn_advance         → current_turn_index, round_number, next_combatant_id?
combat:condition_change     → combatant_id, conditions[], condition_durations?
combat:combatant_add        → combatant sanitizado (hidden combatants NUNCA broadcast)
combat:combatant_remove     → combatant_id
combat:initiative_reorder   → combatants[] reordenados (hidden filtrados)
combat:version_switch       → combatant_id, ruleset_version
combat:defeated_change      → combatant_id, is_defeated
combat:hidden_change        → combatant_id, is_hidden (convertido em add/remove para players)
combat:stats_update         → name (players), display_name sanitizado (monsters)
combat:player_notes_update  → combatant_id, player_notes
combat:late_join_request    → player_name, hp, ac, initiative, request_id
combat:late_join_response   → request_id, accepted
combat:rejoin_request       → character_name, request_id, sender_token_id
combat:rejoin_response      → request_id, accepted
combat:session_revoked      → revoked_token_id

── Session ──
session:state_sync          → encounter state completo (reconnect)
session:player_linked       → vincula jogador a personagem de campanha
session:combat_stats        → stats[], encounter_name, rounds

── Audio ──
audio:play_sound            → sound_id, source, player_name, audio_url?
audio:ambient_start         → sound_id
audio:ambient_stop          → (sem payload)

── Player ──
player:death_save           → player_name, combatant_id, result

── Atmosfera ──
session:weather_change      → effect
```

### Client Components (Predominantemente Client-Side)

- App é predominantemente client-side (`"use client"`)
- **Exceção pontual:** `lib/actions/invite-actions.ts` usa `"use server"` para campaign invites
- Lógica server-side principal em API Routes: `/app/api/`
- Middleware (`middleware.ts`) faz auth refresh + i18n detection

### Zustand Stores (Separados por Domínio)

| Store | Arquivo | Responsabilidade |
|-------|---------|-----------------|
| Combat | `lib/stores/combat-store.ts` | Estado do encounter ativo (combatants, rounds, undo stack) |
| Guest Combat | `lib/stores/guest-combat-store.ts` | Combate efêmero sem auth |
| Guest Combat Stats | `lib/stores/guest-combat-stats.ts` | Estatísticas de combate no guest mode |
| Combat Log | `lib/stores/combat-log-store.ts` | Log de ações de combate |
| Combat Persist | `lib/stores/combat-persist.ts` | Backup local IndexedDB |
| SRD | `lib/stores/srd-store.ts` | Inicialização e status dos bundles SRD |
| Dice History | `lib/stores/dice-history-store.ts` | Histórico de rolagens |
| Pinned Cards | `lib/stores/pinned-cards-store.ts` | Cards fixados do Oracle |
| Tour | `lib/stores/tour-store.ts` | Guided onboarding tour (persist localStorage `guided-tour-v1`) |
| Audio | `lib/stores/audio-store.ts` | DM soundboard, ambient, custom audio uploads |
| Role | `lib/stores/role-store.ts` | Seleção de papel (DM/Player) |
| Subscription | `lib/stores/subscription-store.ts` | Estado de assinatura e billing |

### Guided Onboarding Tour (Try Mode)

- Tour automático na primeira visita ao `/try` — 8 steps guiando o fluxo completo de combate
- **Componentes:** `components/tour/` — TourProvider (orquestrador), TourOverlay (SVG spotlight), TourTooltip (posicionamento auto), TourProgress (dots)
- **Steps config:** `components/tour/tour-steps.ts` — declarativo, cada step tem `id`, `targetSelector` (data-tour-id), `type` (info/interactive)
- **Interactive steps** auto-avançam via subscribe no guest-combat-store (ex: combatants.length aumenta → avança)
- **Smart skip:** `shouldSkipStep()` pula steps cujas condições já foram satisfeitas
- **Spotlight:** SVG mask com `pointer-events: auto` na área do spotlight para steps interativos
- **i18n:** namespace `tour.*` em `messages/pt-BR.json` + `messages/en.json`
- **Elementos alvo:** Marcados com `data-tour-id="..."` nos componentes GuestCombatClient e MonsterSearchPanel

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
├── auth/                       # Auth flows (login, signup, confirm, forgot-password, update-password)
├── app/                        # Rotas protegidas (requer auth)
│   ├── dashboard/              # DM dashboard (campanhas, encounters salvos)
│   ├── session/[id]/           # Sessão de combate (view principal do DM)
│   ├── session/new/            # Criar nova sessão
│   ├── compendium/             # Navegador SRD (monstros, spells, conditions)
│   ├── campaigns/[id]/         # Detalhe da campanha (DM + Player view)
│   ├── checkout/success/       # Stripe checkout success
│   ├── presets/                # Presets de monstros
│   ├── settings/               # Configurações da conta
│   └── onboarding/             # Wizard de primeiro acesso + role selection
├── api/                        # API Routes
│   ├── session/[id]/state/     # State sync endpoint (reconnect fallback)
│   ├── session/[id]/files/     # File sharing (upload/download)
│   ├── oracle-ai/              # Google Gemini proxy
│   ├── account/delete/         # Account deletion (GDPR)
│   ├── admin/                  # Admin endpoints (content, metrics, users)
│   ├── billing-portal/         # Stripe customer portal
│   ├── checkout/               # Stripe checkout session
│   ├── webhooks/stripe/        # Stripe webhooks
│   ├── campaign/[id]/invites/  # Campaign invite management
│   ├── player-audio/           # Player audio upload/playback
│   ├── track/                  # Analytics event tracking
│   ├── trial/                  # Trial management
│   └── user/language/          # Language preference
├── join/[token]/               # Player join via token (sem auth)
├── invite/[token]/             # Campaign invite acceptance
├── try/                        # Guest mode (60 min, sem login)
├── monsters/                   # SEO pages: monster index + detail (/monsters/[slug])
├── spells/                     # SEO pages: spell index + detail (/spells/[slug])
├── pricing/                    # Pricing page
├── admin/                      # Admin panel (métricas, users, SRD editing)
└── legal/                      # Privacy policy, attribution

components/
├── combat/          # UI de combate (CombatantRow, HpAdjuster, EncounterSetup...)
├── oracle/          # Rules oracle (MonsterSearch, SpellSearch, CommandPalette...)
├── player/          # Player view (PlayerInitiativeBoard, PlayerLobby, SyncIndicator)
├── session/         # Session management (CombatSessionClient, ShareSessionButton)
├── dashboard/       # DM dashboard (CampaignManager, OnboardingWizard)
├── admin/           # Admin (MetricsDashboard, ContentEditor, UserManager)
├── analytics/       # Page view tracking (LandingPageTracker, PageViewTracker)
├── audio/           # DM soundboard (DmSoundboard, DmAudioControls, PlayerSoundboard)
├── billing/         # Billing UI (ProBadge, ProGate, SubscriptionPanel, TrialBanner)
├── campaign/        # Campaign management (CampaignNotes, InvitePlayerDialog, PlayerCampaignView)
├── compendium/      # Compendium browser
├── guest/           # Guest mode (GuestBanner, GuestCombatClient, GuestUpsellModal)
├── homebrew/        # Homebrew content (HomebrewCreator, StatBlockImporter)
├── import/          # External content import (ImportContentModal, ExternalContentGate)
├── dice/            # Dice UI (DiceHistoryPanel, ClickableRoll)
├── presets/         # Preset management
├── marketing/       # Landing page (HeroParticles, ScrollReveal)
├── layout/          # Navbar, DmSyncDot
├── settings/        # Settings components (LanguageSwitcher)
├── srd/             # SrdInitializer, MonsterToken
├── tour/            # Guided onboarding (TourProvider, TourOverlay, TourTooltip)
├── ui/              # shadcn/ui primitives + ErrorBoundary
└── auth/            # Auth forms

lib/
├── stores/          # Zustand stores (12 stores — ver tabela acima)
├── actions/         # Server Actions (pontual: invite-actions.ts)
├── hooks/           # Custom hooks (useCombatActions, useCombatKeyboardShortcuts)
├── realtime/        # WebSocket broadcast, channel hooks, reconnect
├── supabase/        # Client/server Supabase clients, DB access functions
├── srd/             # SRD loader, search, cache
├── types/           # TypeScript types (combat.ts, database.ts, realtime.ts)
├── utils/           # Utilities (initiative, hp-status, sanitize, dice, cr-calculator)
├── combat/          # Combat logic (parse-action, action parsing)
├── analytics/       # Analytics helpers
├── auth/            # Auth utilities
├── constants/       # App constants
├── design/          # Design tokens (RPG visual system, pixel sprites)
├── dice/            # Dice utilities
├── errors/          # Error capture (Sentry integration)
├── import/          # External content import logic
├── notifications/   # Novu notification workflows
├── parser/          # Content parsers
├── validation/      # Zod schemas
└── oracle-ai/       # AI system prompt

supabase/migrations/ # 39 migration files (001–039)
scripts/             # SRD data import, bundle generation, orchestrator
messages/            # i18n: pt-BR.json, en.json (32 namespaces)
public/srd/          # Static SRD bundles (JSON, CDN-cached)
docs/                # Sprint docs, specs, QA reports (~54 markdown files)
_bmad-output/        # Architecture, PRD, epics, tech specs
```

---

## Modelo de Dados (Entidades Core)

### Relações Principais

```
User ──1:N──► Campaign ──1:N──► PlayerCharacter
  │               │
  │               └──N:M──► CampaignMember (User como Player)
  │               └──1:N──► CampaignInvite
  │
  └──1:N──► Session ──1:N──► Encounter ──1:N──► Combatant
                │                                    │
                └──1:N──► SessionToken          monster_id? ──► Monster
                          (player access)       player_character_id? ──► PlayerCharacter
```

### Distinções Importantes

- **Session ≠ Encounter**: Session contém tokens de acesso, lifecycle, estado da conexão. Encounter contém combatants e rounds. Uma session pode ter múltiplos encounters.
- **Combatant dual-type**: `monster_id` (ref Monster) OU `player_character_id` (ref PlayerCharacter) — nunca ambos.
- **Combatant fields V2**: `display_name` (anti-metagaming), `is_hidden` (oculto de players), `player_notes` (notas do jogador).
- **Conditions**: `TEXT[]` (PostgreSQL array) no combatant — lista de strings.
- **Session Tokens**: Efêmeros, scoped por sessão, auto-expiram. Usados para player access sem auth.
- **SRD Tables**: `monsters` e `spells` com unique constraint `(name, version)`.
- **Campaign Members**: Dual-role — um User pode ser DM em uma campanha e Player em outra. `campaign_members` table com `role` (dm/player).
- **Campaign Invites**: Via email ou join_code. Acceptance via `accept_campaign_invite()` function (SECURITY DEFINER, FOR UPDATE SKIP LOCKED).

### Tabelas

| Tabela | Descrição | RLS |
|--------|-----------|-----|
| `users` | DM accounts + admin flag + language pref + role | owner-only |
| `campaigns` | Grupos de jogadores (join_code, notes) | owner + members |
| `campaign_members` | Membership DM↔Player em campanhas | campaign-based |
| `campaign_invites` | Convites para campanhas (token, email, 7d expiry) | owner + recipient |
| `player_characters` | PCs (HP, AC, DC, race, class, level, user_id, dm_notes) | campaign owner + player |
| `sessions` | Sessões de jogo ativas/arquivadas (notes, files) | owner + token holders |
| `encounters` | Combates dentro de uma sessão | session owner |
| `combatants` | Monstros + PCs (HP, initiative, conditions, notes, is_hidden, display_name) | encounter owner |
| `monsters` | SRD monsters (2014 + 2024) | public read |
| `spells` | SRD spells (2014 + 2024) | public read |
| `condition_types` | Condições D&D (Blinded, Charmed, etc.) | public read |
| `session_tokens` | Tokens efêmeros de acesso player | session owner |
| `monster_presets` | Presets customizados de monstros | owner-only |
| `analytics_events` | Tracking de eventos do funil | admin-only |
| `subscriptions` | Assinaturas Stripe (preparação pós-beta) | owner-only |
| `feature_flags` | Feature flags para gating | admin-only |
| `homebrew` | Conteúdo homebrew de usuários | owner-only |

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
- Quick specs em `docs/quick-spec-*.md` e `docs/quick-specs/`
- QA reports em `docs/qa-*.md`
- Tracking de épicos: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Tech specs detalhados: `_bmad-output/implementation-artifacts/`
- Architecture, PRD, UX spec: `_bmad-output/planning-artifacts/`
- Épicos definidos em `_bmad-output/planning-artifacts/epics.md` (9 épicos V2 + estabilização)
- **Índice mestre**: `docs/index.md` — consultar PRIMEIRO para encontrar qualquer documento

---

## Performance Targets (NFRs)

- FCP ≤ 1.5s
- TTI ≤ 3s
- Oracle response (modal/search) ≤ 300ms
- WebSocket latency ≤ 500ms
- SRD bundles: CDN cached, `Cache-Control: public, max-age=31536000, immutable`
