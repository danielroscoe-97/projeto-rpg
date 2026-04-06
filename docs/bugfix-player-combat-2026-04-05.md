# Bugfix Session — Player Combat View (2026-04-05 noite)

## Bugs Corrigidos (7 fixes, 2 commits)

### BUG-P1 — Lobby "Aguardando DM" nao atualizava quando combate iniciava
- **Arquivo:** `components/player/PlayerJoinClient.tsx:1377`
- **Sintoma:** Player registrado ficava preso na tela de espera; precisava F5 pra ver o combate
- **Causa:** Dependia exclusivamente do broadcast `combat:started` via Realtime. Se o canal nao estivesse conectado no momento do broadcast (delay de auth, desconexao temporaria), o evento era perdido sem fallback
- **Fix:** Adicionado polling fallback de 5s que checa `/api/session/{id}/state` enquanto `isRegistered && !active`. Detecta `encounter.is_active` e transiciona automaticamente pra combat view
- **Commit:** `0de6957`

### BUG-P2 — Todas as condicoes (Blessed, Flying, Haste, etc.) apareciam no card do player
- **Arquivo:** `components/player/PlayerInitiativeBoard.tsx:697, 997`
- **Sintoma:** Player via 6 condicoes (Blessed, Flying, Haste, Heroism, Inspired, Raging) mesmo sem ter nenhuma
- **Causa:** Os botoes de toggle de beneficial conditions eram renderizados sempre visiveis com styling `bg-emerald-900/20 text-emerald-400/70` que no dark theme parecia com badges ativos
- **Fix:** Colapsados atras de um toggle "▸ Bonus" (collapsed by default). State `showBuffPicker` controla visibilidade. Aplicado nos 2 locais: card desktop (L697) e lista mobile (L997)
- **Commit:** `0de6957`

### BUG-P3 — Botao "Passar Turno" na barra inferior obstruido por HP/AC
- **Arquivo:** `components/player/PlayerBottomBar.tsx:194`
- **Sintoma:** Botao "Passar Turno" inline na bottom bar competia com HP, AC, temp HP e ficava ilegivel
- **Fix:** Removido completamente da bottom bar. O player ja tem "Passar Turno" no toolbar superior
- **Commit:** `0de6957`

### BUG-P4 — "−Dano" e "+Cura" com simbolos duplicados
- **Arquivos:** `messages/pt-BR.json:1504`, `messages/en.json:1504`
- **Sintoma:** Botoes mostravam `[icon Minus] −Dano` (dois menos) e `[icon Plus] +Cura` (dois mais)
- **Causa:** Labels de traducao ja incluiam `−` e `+`, mas o componente `PlayerHpActions.tsx` tambem renderizava icones Lucide `Minus`/`Plus`
- **Fix:** Removidos simbolos das strings de traducao: `"−Dano"` → `"Dano"`, `"+Cura"` → `"Cura"`, `"\u2212Damage"` → `"Damage"`, `"+Heal"` → `"Heal"`
- **Commit:** `0de6957`

### BUG-P5 — Soundboard do player mostrava ambient/music e nao rolava
- **Arquivo:** `components/audio/PlayerSoundboard.tsx:6, 71, 115`
- **Sintoma:** Popup de sons mostrava 100+ presets (incluindo ambient loops e musicas) e empurrava a tela pra cima sem scroll
- **Fix:** (1) Trocado `getAllPresets()` por `getSfxPresets()` — player ve apenas SFX (attack, magic, defense, interaction, dramatic, monster). (2) Adicionado `max-h-[60vh] overflow-y-auto` no drawer
- **Commit:** `0de6957`

### BUG-P6 — "Something went wrong" no dashboard (postgres_changes error)
- **Arquivos:** `lib/hooks/useNotifications.ts:44`, `components/campaign/CampaignMindMap.tsx:1197`
- **Sintoma:** Erro "cannot add `postgres_changes` callbacks for realtime:notifications:UUID after `subscribe()`" ao navegar pro dashboard via menu hamburger
- **Causa:** React StrictMode (ou navegacao rapida) causava cleanup do channel + recriacao antes do `removeChannel` completar. Supabase tentava reusar o channel ja subscrito com o mesmo nome
- **Fix:** Adicionado sufixo aleatorio ao nome do channel: `notifications:${userId}:${random}` e `mindmap:${campaignId}:${random}`
- **Commit:** `0de6957`

### BUG-P7 — animate-pulse na bottom bar durante turno do jogador
- **Arquivo:** `components/player/PlayerBottomBar.tsx:98`
- **Sintoma:** Barra inferior piscava freneticamente quando era turno do player
- **Fix:** Removido `animate-pulse`. Mantido `border-amber-500 bg-amber-900/10` pra indicacao visual sutil
- **Commit:** `a2fae91`

---

## Arquitetura da Player Combat View

### Entry Points

| Modo | Rota | Pagina | Client Component | Auth |
|------|------|--------|-----------------|------|
| Anonimo (link) | `/join/[token]` | `app/join/[token]/page.tsx` | `PlayerJoinClient` | Supabase anon auth + session_tokens |
| Autenticado (convite) | `/invite/[token]` | `app/invite/[token]/page.tsx` | `PlayerJoinClient` | Supabase auth + campaign_members |
| Guest (demo) | `/try` | `app/try/page.tsx` | `GuestCombatClient` | Nenhum (Zustand + localStorage) |

### Componentes Principais

```
PlayerJoinClient.tsx (2310 linhas — orquestrador principal)
├── PlayerLobby.tsx              — Form de registro + espera pre-combate
├── PlayerInitiativeBoard.tsx    — UI de combate (lista de iniciativa)
│   ├── PlayerSoundboard.tsx     — FAB de sons (SFX apenas, turno-locked)
│   ├── PlayerSpellBrowser.tsx   — Oracle de magias buscavel
│   ├── SpellSlotTracker.tsx     — Dots de spell slots (toggle + long rest)
│   ├── DeathSaveTracker.tsx     — Sucesso/falha nos death saves
│   ├── DiceRoller.tsx           — Rolagem de dados inline
│   └── CombatActionLog.tsx      — Log de acoes do combate
├── PlayerBottomBar.tsx          — Barra fixa mobile (HP + controles)
│   ├── PlayerHpActions.tsx      — Botoes Dano/Cura/Temp com popover
│   └── SpellSlotTracker.tsx     — Slots colapsaveis mobile
├── PlayerChat.tsx               — Chat realtime entre jogadores
├── DmPostit.tsx                 — Post-its do DM (popup)
├── TurnNotificationOverlay.tsx  — Alerta fullscreen "Seu turno!"
├── TurnUpcomingBanner.tsx       — Banner "Proximo na fila"
└── TurnPushNotification.tsx     — Push notification nativa
```

### Fluxo de Conexao (State Machine)

```
                    ┌──────────────────────┐
                    │    RECONNECTING      │
                    │  (aguardando canal)  │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │ SUBSCRIBED     │                 │ timeout 3s
              ▼                │                 ▼
   ┌──────────────────┐       │     ┌───────────────────────┐
   │    CONNECTED      │       │     │  POLLING_FALLBACK     │
   │  (realtime ativo) │◄──────┘     │  (2s → 30s backoff)  │
   └──────────────────┘              └───────────────────────┘
```

### Eventos Realtime (Player recebe)

| Evento | Payload | Efeito |
|--------|---------|--------|
| `session:state_sync` | combatants[], round, turn | Snapshot completo — sai do lobby, atualiza tudo |
| `combat:started` | encounter_id | setActive(true), fetch state |
| `combat:turn_advance` | turn_index, round, _seq | Avanca turno (sequence-ordered) |
| `combat:hp_update` | combatant_id, hp, temp_hp | Delta visual + update (flash red/green) |
| `combat:condition_change` | combatant_id, conditions[] | Atualiza badges com guard 5s |
| `combat:combatant_add` | combatant{} | Late-join detection + dedup |
| `combat:combatant_remove` | combatant_id | Remove da lista |
| `combat:late_join_response` | request_id, accepted | Aceita/rejeita late-join |
| `combat:session_revoked` | token_id | Split-brain protection |
| `audio:play_sound` | sound_id, source | Toca SFX via AudioStore |
| `audio:ambient_start/stop` | sound_id | Controla loops ambient |
| `session:combat_stats` | stats[], name, rounds | Leaderboard pos-combate |
| `session:combat_recap` | report{} | "Spotify Wrapped" do combate |
| `session:poll_results` | avg, distribution | Resultado da votacao |
| `session:ended` | — | Cleanup total, limpa identidade |

### Eventos Realtime (Player envia)

| Evento | Quando | Payload |
|--------|--------|---------|
| `player:joined` | Registro/rejoin | id, name, initiative, hp, ac |
| `player:end_turn` | Passa turno | player_name, combatant_id |
| `player:death_save` | Death save | player_name, combatant_id, result |
| `player:hp_action` | Dano/cura self-report | player_name, combatant_id, action, amount |
| `player:self_condition_toggle` | Toggle buff | player_name, combatant_id, condition |
| `player:idle` | Tab hidden / offline | token_id, player_name |
| `player:active` | Tab visible / online | token_id, player_name |
| `player:disconnecting` | pagehide | token_id, player_name |
| `audio:play_sound` | Toca SFX no turno | sound_id, source, player_name |
| `combat:late_join_request` | Pede pra entrar | request_id, name, initiative, hp, ac |
| `player:poll_vote` | Avalia combate | player_name, vote (1-5) |

### Cadeia de Reconexao

```
L1: sessionStorage (mesmo browser, tab restore)
L2: localStorage (browser fechou e abriu, 24h TTL)
L3: Cookie auth (anon session viva, same-device)
L4: Lista de nomes (server-side, 1 clique — rejoin sem DM approval)
L5: Formulario completo (ultimo recurso)
```

**Guard IG-02:** Se o heartbeat do player original for <10s, impede transfer de token (anti-impersonacao).

### Polling Timers Ativos

| Timer | Intervalo | Condicao | Proposito |
|-------|-----------|----------|-----------|
| Lobby poll | 5s | `isRegistered && !active` | Detecta combate iniciado |
| Turn safety net | 30s (connected) / 10s (fallback) | Combat ativo | Catch-up de turno perdido |
| DM presence | 30s | Combat ativo | Detecta DM offline (>90s stale) |
| Heartbeat | 60s | Registrado + ativo | `session_tokens.last_seen_at` |
| Late-join poll | 5s | `lateJoinStatus ∈ {waiting, polling, rejected}` | Detecta aceitacao no DB |

### Optimistic Updates (Guards 5s)

| Tipo | Ref | Protege |
|------|-----|---------|
| Death saves | `deathSaveOptimisticRef` | Polling nao sobrescreve death save local |
| HP action | `hpActionOptimisticRef` + `lastHpActionCombatantRef` | Polling nao sobrescreve HP do combatant especifico |
| Conditions | `conditionOptimisticRef` | Polling nao sobrescreve condicoes locais |

### Guest Mode vs Player Mode

| Feature | PlayerJoinClient | GuestCombatClient |
|---------|-----------------|-------------------|
| Auth | Supabase anon/auth | Nenhum |
| Realtime | Canal bidirecional | Nenhum |
| Persistencia | Server-side (DB) | Zustand + localStorage |
| Escopo | Multi-user (DM + players) | Single-user local |
| Controle | Read-only (player) | Full DM control |
| Pos-combate | Leaderboard + poll + recap | Stats simples |
| Sons | Broadcast → DM | Local playback |
| Spell slots | Salvos no DB | N/A |

### APIs Consumidas

| Endpoint | Metodo | Uso |
|----------|--------|-----|
| `/api/session/[id]/state` | GET | Estado completo (combatants, round, turn) |
| `/api/session/[id]/dm-presence` | GET | Leve — so `dm_last_seen_at` |
| `/api/session/[id]/player-disconnect` | POST (sendBeacon) | Notifica server no pagehide |
| `/api/player-audio` | GET | Custom audio files do player autenticado |
