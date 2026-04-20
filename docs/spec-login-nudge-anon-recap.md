# Spec — Login Nudge + Anon Player Recap Hydration

**Data:** 2026-04-19
**Autor:** Claude (Plan agent)
**Status:** AUDIT COMPLETO — B1/B4 já shipados; polimentos opcionais identificados
**Tracks:** Beta 4 B1 (login nudge) + B4 (anon recap)

---

## TL;DR

Ambos os comportamentos pedidos pelo Lucas **já estão shipados** no `main`. B1 saiu como S4.4 / Hotfix H14 (commit `518fa7fc`). B4 saiu como Finding 1 do `docs/spike-beta-test-3-2026-04-17.md` (Track A), cobrindo **tanto auth quanto anon**. Este spec é majoritariamente **auditoria de conformidade** + pequenas aditivas opcionais.

---

## Parte 1 — Login Nudge (B1 / S4.4 / H14)

### Status: SHIPADO ✅

Evidências principais:
- [components/player/CompendiumLoginNudge.tsx:1-161](../components/player/CompendiumLoginNudge.tsx) — componente completo com três modos (`guest`/`anonymous`/`authenticated`), dismiss persistido em `localStorage` com fallback `sessionStorage`, TTL de 3 dias, sanitização de `returnUrl`, analytics `trackEvent`.
- [components/player/PlayerCompendiumBrowser.tsx:21,74-88](../components/player/PlayerCompendiumBrowser.tsx) — import do nudge + props `mode` e `returnUrl` (default `"authenticated"` fail-safe).
- [components/player/PlayerJoinClient.tsx:423-435](../components/player/PlayerJoinClient.tsx#L423-L435) — derivação do `compendiumMode` via `isRealAuth = !!u && !u.is_anonymous`.
- [components/guest/GuestCombatClient.tsx:2224-2228](../components/guest/GuestCombatClient.tsx) — renderiza `PlayerCompendiumBrowser mode="guest"`.
- [lib/utils/returnUrl.ts:1-57](../lib/utils/returnUrl.ts) — `sanitizeReturnUrl` com allowlist defensiva.
- i18n: `login_nudge_title/desc/cta_guest/cta_anon/dismiss` em `messages/pt-BR.json` + `messages/en.json`.

### Gaps (polimento opcional, não-bloqueadores)

1. **Copy do áudio** — Lucas falou "verificar flag beta tester e acesso completo". Copy atual pt-BR: *"Entre para acessar compêndio completo, itens homebrew e traduções PT-BR."* Cobre "compêndio completo" + "itens homebrew" mas **não menciona beta tester**. Opcional: adicionar sufixo *"e acesso beta tester"*. (~5min)
2. **Analytics de contexto** — `compendium:login_nudge_shown` carrega só `{ mode }`. Adicionar `{ context: "compendium_open" }`. (~10min em `CompendiumLoginNudge.tsx:89,101,107`)
3. **Telemetria `returnUrl`** — `login_nudge_cta_clicked` não inclui o `returnUrl`. Baixa prioridade.

### Combat Parity Matrix — Login Nudge

| Cenário | Guest | Anon | Auth |
|---|---|---|---|
| Banner aparece | SIM (CTA "Criar conta grátis") | SIM (CTA "Entrar") | NÃO (retorna `null`) |
| Dismiss persiste 3 dias | SIM | SIM | N/A |
| SSR-safe | SIM | SIM | SIM |

---

## Parte 2 — Anon Player Recap Hydration (B4 / Finding 1)

### Status: SHIPADO ✅ (auth E anon)

Track A do Finding 1 entregou `/api/session/[id]/latest-recap` com autorização dupla (session_token ativo **ou** session owner).

Evidências:
- [app/api/session/[id]/latest-recap/route.ts:29-122](../app/api/session/[id]/latest-recap/route.ts) — endpoint aceita:
  - Usuário autenticado — **incluindo anon JWT** (anon também tem `user.id` no `auth.users`)
  - Autorização por **session_token ativo** (`session_tokens.anon_user_id = user.id AND is_active = true`) — **caminho do anon player**
  - Fallback: session owner (DM)
  - Usa `createServiceClient()` porque anon JWT não lê `session_tokens` via RLS diretamente
  - TTL de 24h via filtro `ended_at > now() - 24h`
- [components/player/PlayerJoinClient.tsx:1877-1940](../components/player/PlayerJoinClient.tsx#L1877-L1940) — hook de hidratação no mount (auth OU anon):
  - Dispara quando `authReady && sessionId && !active && !combatRecapReport`
  - Fetch `/api/session/${sessionId}/latest-recap`
  - Chave anti-reopen `recap-seen-${sessionId}-${encounter_id}` em `sessionStorage`
  - Populate `combatStatsData` + `combatRecapReport` pra renderizar mesmo modal da broadcast path
  - Telemetria `recap.served_from_db`

### Cenários cobertos

- [x] **C1** — Anon ativo recebe broadcast `encounter:ended` → recap via state
- [x] **C2** — Anon offline durante broadcast, reconecta mesmo tab → `useEffect` roda no `authReady`, bate `/latest-recap`, hidrata
- [x] **C3** — Anon fechou browser antes do `encounter:ended`, volta em `/join/[token]` → anon session Supabase persiste no `localStorage`, `session_tokens.anon_user_id` ainda ativo, `/latest-recap` autoriza, hook hidrata. **Funciona se dentro da janela 24h.**
- [x] **C4** — Anon volta DEPOIS que DM iniciou novo combate → `/latest-recap` retorna encounter `ended_at DESC LIMIT 1` com `recap_snapshot NOT NULL`. Mostra o anterior.
- [ ] **C5** (gap minor) — Anon com session expirada/purgada → falha silenciosamente em vez de mostrar card "Recap indisponível"

### Gap C5 — Polimento opcional (~2-3h)

**Não é bug do cenário do Lucas.** Edge case: quando anon session do Supabase foi invalidada (user limpou cookies, 24h+ passaram), hook falha silenciosamente.

**Implementação:**

1. **Marcar recap-seen antes do fetch** — quando broadcast `encounter:ended` chega, salvar `sessionStorage.setItem('recap-delivered-${sessionId}', Date.now())` em paralelo ao `recap-seen`.
2. **Tratar 403 no hook** ([PlayerJoinClient.tsx:1899-1935](../components/player/PlayerJoinClient.tsx#L1899-L1935)) — se `res.status === 403` e `sessionStorage['recap-delivered-...']` existe na janela 24h, setar estado `recapUnavailable: true` e renderizar card minimalista ("Recap indisponível — sessão expirou"). Segue padrão guest banner.
3. **Telemetria:**
   - `player:anon_recap_hydrated` `{ session_id, encounter_id, latency_ms }`
   - `player:anon_recap_unavailable` `{ reason: "403" | "404" | "ttl_expired" | "network" }`
4. **e2e regression** — `e2e/features/recap-persistence.spec.ts` adicionar:
   - C3 explícita: anon close-browser → reopen → vê recap
   - C5: anon session revogada → vê "indisponível", não error toast

### Combat Parity Matrix — Recap Hydration

| Feature | Guest | Anon | Auth |
|---|---|---|---|
| Broadcast delivery | SIM | SIM | SIM |
| Persistência durável | localStorage (Finding 9) | DB via session_token (Track A) | DB via session_token (Track A) |
| TTL | 24h | 24h | 24h |
| Reconnect hydrate | no mount `GuestCombatClient` | no mount `PlayerJoinClient` | idem anon |
| Degrade "expirado" | banner card (Finding 9) | **gap C5** | **gap C5** |

---

## Telemetry (estado final)

Já shipado:
- `compendium:login_nudge_shown` `{ mode }`
- `compendium:login_nudge_cta_clicked` `{ mode }`
- `compendium:login_nudge_dismissed` `{ mode, ttl_days }`
- `recap.persisted_success` / `recap.persisted_noop` `{ encounter_id, payload_bytes }`
- `recap.served_from_db` `{ session_id, encounter_id }`
- `player:reconnected` `{ session_id, method }`

A adicionar (opcional):
- `compendium:login_nudge_shown` → incluir `context: "compendium_open"`
- `player:anon_recap_hydrated` `{ session_id, encounter_id, latency_ms }`
- `player:anon_recap_unavailable` `{ reason }`

---

## Testes

Existentes:
- `components/player/CompendiumLoginNudge.test.tsx` — unit
- `e2e/features/recap-persistence.spec.ts` — Track A (auth + anon reconnect)
- `components/player/PlayerJoinClient.test.tsx` — smoke

A adicionar (se atacar C5):
- e2e C3 explícita
- e2e C5 degrade
- unit: 403 handling no hook

---

## Recomendação

**Fechar B1/B4 como SHIPADOS** e abrir ticket tiny "recap-polish" com os 3 aditivos. Feedback do Lucas foi satisfeito antes mesmo da conversa — ele provavelmente não conhecia Track A (mergeou após beta 3).

### Critical Files

- `c:/Projetos Daniel/projeto-rpg/components/player/PlayerJoinClient.tsx`
- `c:/Projetos Daniel/projeto-rpg/app/api/session/[id]/latest-recap/route.ts`
- `c:/Projetos Daniel/projeto-rpg/components/player/CompendiumLoginNudge.tsx`
- `c:/Projetos Daniel/projeto-rpg/components/guest/guest-last-recap.ts`

## Estimativa

- **B1:** 0h core (shipado). ~15-30min para polimentos de copy + telemetria
- **B4:** 0h core (shipado). ~2-3h para C5 degrade card + 2 telemetrias + 2 e2e
- **Total se atacar polimentos:** ~3h. Se apenas fechar o bucket: 0h.
