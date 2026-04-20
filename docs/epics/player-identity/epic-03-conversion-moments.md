# EPIC 03: Momentos de Conversão

> **Status:** Aprovado para execução (v3 pós adversarial review 2026-04-19)
> **Prioridade:** Alta — captura o player no pico emocional (H2 ancorado em H3)
> **Origem:** Party Mode 2026-04-19 + Code Review v1 + Adversarial Review v2 (v2 resolveu 3🔴+5🟠+5🟡+3🟢; v3 resolve mais 6🔴+8🟠+7🟡+8🟢)
> **Parent epic:** [`docs/EPIC-player-identity-continuity.md`](../../EPIC-player-identity-continuity.md)
> **Sprint estimate:** ~2-3 sprints (**20-30 dias úteis**). **Nota:** `docs/SPRINT-PLAN-player-identity.md` linhas 115-118 lista 6-8 dias para Sprint 6 — esse número está **stale** (foi escrito pré-review). Bob (SM) deve atualizar sprint plan conforme "Próximos Passos" §5 deste doc. **Os valores deste épico (10-14 dias só Sprint 6 + 6-9 Sprint 7) são autoritativos.**
> **Release strategy:** Big-bang (junto com Épicos 01, 02, 04)
> **Depende de:** Épico 01 (bloqueante) + Épico 02 (bloqueante — consome `AuthModal` e `CharacterPickerModal`)
> **Agente executor:** Sally (UX) lidera; Paige (Tech Writer) define copy; Quinn (QA) valida turn-safety

---

## Contexto do Épico Mãe

Ver [`docs/EPIC-player-identity-continuity.md`](../../EPIC-player-identity-continuity.md) para visão completa da iniciativa **"Player Identity & Continuity"**. Este épico cobre **H2 (retenção/conversão)** ancorado em **H3 (continuidade)** — captura o player no momento de maior vínculo emocional (pré-combate ansioso ou pós-combate vitorioso) e converte em conta preservando o personagem.

---

## Dependências de Entrada

Este épico **NÃO PODE COMEÇAR** antes das primitives abaixo estarem em staging.

### Do Épico 01
- `upgradePlayerIdentity()` via `POST /api/player-identity/upgrade` — consumido em recap e waiting room CTA quando player anon→auth
- `migrateGuestCharacterToAuth()` via `POST /api/player-identity/migrate-guest-character` — consumido no recap do guest após `supabase.auth.signUp`
- `users.default_character_id` — setado após migração do guest character

### Do Épico 02
- `AuthModal` com prop `upgradeContext` — componente principal consumido pelos 3 momentos. Props atuais (Epic 02 Área 3): `open`, `onOpenChange`, `defaultTab`, `onSuccess`, `upgradeContext?`, `preamble?`. Este épico **NÃO** estende a interface (ver D3 + F10).
- `useTranslations("auth")` / preamble patterns já estabelecidos

### Da infraestrutura existente (verificado 2026-04-19)
- `lib/analytics/track.ts:61-101` — `trackEvent(name, properties)` fire-and-forget, endpoint `/api/track`
- `app/api/track/route.ts:7-131` — **ALLOWED_EVENTS é um `Set` com enforcement hard**; linha 187-189 retorna HTTP 400 `unknown_event` para qualquer event name fora do Set. Novos eventos DEVEM ser adicionados ao Set (ver D8).
- `messages/{en,pt-BR}.json` flat (**next-intl**, NÃO `next-i18next`)
- `components/admin/MetricsDashboard.tsx` — dashboard admin existente com seções flat (sem tabs); novos eventos entram aqui como nova seção, NÃO em rota nova
- `Combatant` em `lib/types/combat.ts` + `GuestCombatSnapshot["combatants"]` em `lib/stores/guest-combat-store.ts`
- **DM presence UI** é `components/combat-session/PlayersOnlinePanel.tsx` (embedado em `CombatSessionClient.tsx` linhas 1619-1626, modo compact). Status types: `"online" | "idle" | "offline"`. Alimentado por broadcasts em `CombatSessionClient.tsx:1182-1193` (eventos `player:disconnecting/idle/active/joined`). **NÃO existe `components/dm/PlayerPresenceIndicator.tsx`** — essa referência da v2 era fantasma.

---

## Problema

O player vive dois momentos de pico emocional durante uma sessão, e **nenhum é capturado hoje.**

### Momento 1 — Antes do combate (anon, em `/join/[token]`)
Player anon registra nome, reivindica personagem, e espera o DM iniciar. Esse tempo ocioso (30s a 10min) é ponto perfeito para oferecer "salve seu personagem pra voltar mais rápido". Não existe CTA.

### Momento 2 — Depois do combate (anon, em `/join/[token]`)
Player acaba de viver uma aventura com personagem que nomeou. `CombatRecap.tsx` já tem prop `onSaveAndSignup?: () => void` (usada hoje só pelo guest). Para anon a prop sequer é passada. Player fecha a aba e a experiência acaba.

### Momento 3 — Depois do combate (guest, em `/try`)
Guest joga combate solo. `GuestUpsellModal` existe e é acionado via `handleSaveAndSignup` em `components/guest/GuestCombatClient.tsx:1794-1803` (passado como prop em linha 2214), mas: (a) não migra o personagem do snapshot Zustand, (b) copy não personaliza com o nome do personagem. Maria cria conta e perde Thorin.

**Resultado:** a oportunidade de conversão vira esquecimento.

---

## Estado Atual (verificado contra código, 2026-04-19)

### O que existe

| Componente | Onde | O que faz | Gap |
|---|---|---|---|
| `CombatRecap` | `components/combat/CombatRecap.tsx:15-36` | Modal full-screen com 2 fases (awards → details); props: `onSaveAndSignup?: () => void`, `onJoinCampaign`, `onRate`, `campaignId`, `encounterId` | Assinatura atual é zero-arg; consumo pelo anon inexistente; copy genérica |
| `RecapActions` | `components/combat/RecapActions.tsx:13-32` | Render dos botões CTA; `onSaveAndSignup` usado zero-arg em linha 160-170; "Salvar Combate" em linha 211-232 **renderiza apenas quando `!onSaveAndSignup`** (ver F6) | Mesma assinatura que `CombatRecap` |
| `GuestCombatClient` | `components/guest/GuestCombatClient.tsx:1794-1803,2214` | `handleSaveAndSignup`: `trackEvent("guest:recap_save_signup")` + `saveGuestCombatSnapshot` + `window.location.href = "/auth/sign-up?from=guest-combat"` | Não migra o personagem; trata como signup plain |
| `GuestUpsellModal` | `components/guest/GuestUpsellModal.tsx` | Modal de signup para guest | Não chama `migrateGuestCharacterToAuth` |
| `PlayerJoinClient` | `components/player/PlayerJoinClient.tsx` (~3043 linhas) | Lobby anon + combate; `active` state indica "lobby → combate iniciou" via `session:state_sync` broadcast (linhas 1030-1055) + fallback polling (linhas 1818-1852) | Sem CTA de conta durante waiting room; `active` state não exposto via prop/context |
| `trackEvent` | `lib/analytics/track.ts:61-101` | Analytics colon-namespaced (`lp:cta_click`) | Eventos de `conversion:*` precisam ser **allowlisted** em `app/api/track/route.ts:7-131` |
| `PlayersOnlinePanel` | `components/combat-session/PlayersOnlinePanel.tsx` (+ `CombatSessionClient.tsx:1182-1193`) | DM presence UI com status `online/idle/offline`, alimentado por broadcasts + polling de `session_tokens.last_seen_at` | Não tem estado "cadastrando/authenticating" |
| `MetricsDashboard` | `components/admin/MetricsDashboard.tsx` | Dashboard admin existente com `FUNNEL_LABELS` (44-53) + `GUEST_LABELS` (55-62); seções flat sem tabs | Não cobre funil de conversão novo — **integrar como nova seção, não criar dashboard paralelo** |

### O que NÃO existe

| Gap | Impacto |
|---|---|
| CTA de signup no waiting room do `/join` | H2 perde momento de maior tempo ocioso |
| Passar contexto (`characterId`, `campaignId`, `sessionTokenId`) do recap para o handler de signup | Handler não sabe o que migrar |
| Copy contextual com nome do personagem ("Salvar **Thorin**") | Conversão fria sem gancho emocional |
| Turn-safety explícito — status "cadastrando" no DM view + toast quando combate inicia | DM não sabe por que player parou de responder |
| Memória de dismissal para não re-prompter | Spam frustra |
| Eventos de funil `conversion:*` em ALLOWED_EVENTS | HTTP 400 no /api/track. Bloqueante. |

---

## Decisões de Arquitetura (pós adversarial review)

### D1 — CTA **nunca** bloqueia gameplay

Em nenhum momento um CTA de conversão pode impedir o player de jogar. Vale para waiting room, recap e (especialmente) se combate já começou. Heartbeat **continua** enquanto modal está aberto (exceto tab hidden, ver D10) — o player continua "presente" do ponto de vista do DM.

### D2 — Preservar personagem é **pré-requisito** de qualquer CTA

Pedir "crie conta" sem prometer que Thorin sobrevive mata conversão. Todo CTA exibe: "Salvar **Thorin** na sua conta". Para anon, `upgradePlayerIdentity` preserva o `player_characters` já reivindicado (soft-claim vira hard-claim). Para guest, o fluxo é **separado** (ver D3).

### D3 — Guest e anon têm fluxos **separados**, NÃO compartilhados

A v1 colocou guest dentro do saga `upgradePlayerIdentity`. Isso é **errado**: guest não tem anon session Supabase (é puro localStorage), então `auth.updateUser` não se aplica. Separação correta:

| Modo | Primitive consumido | Notas |
|---|---|---|
| **Anon** (`/join`) | `POST /api/player-identity/upgrade` (Épico 01 Área 2) via `AuthModal.upgradeContext` | Saga `upgradePlayerIdentity` — preserva UUID via `auth.updateUser` |
| **Guest** (`/try`) | `supabase.auth.signUp()` + `POST /api/player-identity/migrate-guest-character` (Épico 01 Área 3) | Signup fresh + migração explícita; **tratamento local no `RecapCtaCard`** — ver D3b |

#### D3b — AuthModal NÃO recebe contrato novo

**Decisão (F10, pin):** o guest NÃO introduz uma prop `guestMigrationContext` no `AuthModal` do Épico 02. Motivo: alterar contrato cross-épico sem review explícito do owner de Epic 02 (Amelia) gera acoplamento oculto. Em vez disso, `RecapCtaCard` (em modo guest) faz o handling local:

1. Abre `AuthModal` **sem** `upgradeContext` (signup padrão).
2. Consome `AuthModal.onSuccess(result)` — resultado contém `{ userId, isNewAccount, upgraded: false }`.
3. Se `isNewAccount === true`, chama `POST /api/player-identity/migrate-guest-character` localmente com o `Combatant` do player extraído do snapshot Zustand.
4. Se migração OK → toast + redirect `/app/dashboard`. Se falhar → `trackConversionFailed` + toast de erro (personagem continua no snapshot — safety net preservado, ver F15).

Opção A (adicionar `guestMigrationContext` ao AuthModal) fica **deferred pending explicit Epic 02 contract amendment**. Se essa prop for adicionada em ciclo futuro, Story 03-E pode migrar para a opção mais limpa sem quebrar nada — o handling local continuaria funcionando como fallback.

### D4 — `CombatRecap.onSaveAndSignup` permanece `() => void` (não-breaking)

Assinatura atual é `() => void`, usada em `components/guest/GuestCombatClient.tsx:2214` e `components/combat/RecapActions.tsx:17,163`. **Não mudamos a assinatura.** Contexto trafega via prop nova adicional:

```typescript
// Prop existente — MANTIDA como está (non-breaking):
onSaveAndSignup?: () => void;

// Prop NOVA (opcional, aditiva):
saveSignupContext?: {
  mode: "anon" | "guest";
  sessionTokenId?: string;       // anon only
  campaignId?: string;           // anon only
  characterId?: string | null;   // anon only (já soft-claimed)
  characterName?: string | null; // display copy
  guestCharacter?: Combatant;    // guest only — filtrado via snapshot.combatants.find(c => c.is_player)
};
```

Quando `saveSignupContext` é fornecido, `RecapCtaCard` lê o contexto e aciona o fluxo correto (anon vs guest). Quando não é fornecido, o botão continua chamando `onSaveAndSignup()` como hoje (legacy path). Deprecar `onSaveAndSignup` zero-arg fica em follow-up.

**Regressão F6 — "Salvar Combate" button:** `RecapActions.tsx:211` esconde o botão "Salvar Combate" sempre que `onSaveAndSignup` está presente. Hoje auth DMs e anon-com-campaignId já veem "Salvar Combate". Após 03-D, `saveSignupContext` anon é passado mesmo quando campanha existe — o que, no path legacy, esconderia o botão. **Solução:** a nova regra de render é:

```
Mostrar "Salvar Combate" quando:
  !saveSignupContext                          // callers atuais (auth DM, anon sem CTA de conversão) — preserva comportamento
  OR saveSignupContext.mode === "anon"        // anon com CTA: "Salvar Combate" continua aparecendo porque CTA de conversão é card separado (RecapCtaCard), não substitui
  OR (saveSignupContext.mode === "guest" && !!saveSignupContext.campaignId)  // guest com campaignId (improvável mas completo)

Esconder "Salvar Combate" APENAS quando:
  saveSignupContext?.mode === "guest" && !saveSignupContext.campaignId
  OR onSaveAndSignup && !saveSignupContext   // guest legacy (GuestCombatClient ainda sem saveSignupContext)
```

Regra encapsulada em helper `shouldShowSaveCombat(saveSignupContext, onSaveAndSignup)` dentro de `RecapActions.tsx`. Teste unitário cobre os 4 casos. AC explícito em Story 03-D.

### D5 — Guest character é `Combatant`, extraído do snapshot pelo caller

`useGuestCombatStore` NÃO tem `myCharacter`. O snapshot guarda `combatants: Combatant[]` incluindo monstros. O caller extrai o personagem do player via:

```typescript
const snapshot = useGuestCombatStore.getState();
const playerCombatants = snapshot.combatants.filter(c => c.is_player === true);
```

Esse padrão já está em uso em `lib/supabase/character-portability.ts:32-43` (Story 01-D). Este épico reproduz. Referências em código: `is_player` setado em `GuestCombatClient.tsx:157` (handler de spell cast), `416` (add form), `696` (import flow), `1280` (duplicate).

**Multi-player guest (F7):** guest pode ter **N>1 combatants com `is_player === true`** (Maria e o marido jogam na mesma máquina, adicionam 2 heroes). Comportamento v3:

| Cenário | Comportamento |
|---|---|
| 1 player combatant | Migra automaticamente |
| 2+ player combatants | Mostra **picker modal inline** no `RecapCtaCard`: "Qual personagem salvar?" com lista. Usuário seleciona 1. Outros permanecem no snapshot (não perdidos). Analytics adiciona `guest_combatant_count: number` no `trackCtaShown` + `trackConversionCompleted` para instrumentar prevalência desse caso. |
| 0 player combatants | Botão desabilitado + texto "Sem personagem para salvar" |

### D6 — Dismissal memory em localStorage com prefix consistente + TTL

Chave: **`pocketdm_conversion_dismissal_v1`** (seguindo padrão `pocketdm_*` já estabelecido em `lib/analytics/track.ts:12`, `components/dashboard/ActivationChecklist.tsx:43`, `PlayerActivationChecklist.tsx:43`). Não confundir com `guest-banner-dismissed` (chave do landing banner em `components/guest/GuestBanner.tsx:8` — legado, **outro fluxo**, ver F21) nem `taverna_anon_id` (legacy analytics ID).

Para guest (sem `campaignId`): usar sentinel `"__guest__"`.

**F18 TTL:** o record tem timestamps **por campanha** e é podado na leitura. 90 dias de TTL:

```typescript
const KEY = "pocketdm_conversion_dismissal_v1";
const TTL_DAYS = 90;

type CampaignDismissalEntry = {
  count: number;         // número de dismissals acumulados
  lastDismissedAt: string; // ISO-8601
};

type DismissalRecord = {
  dismissalsByCampaign: Record<string, CampaignDismissalEntry>;  // key = campaignId | "__guest__"
  lastSeenCampaign: string | null;
};
```

Na leitura, entradas com `lastDismissedAt` mais antigo que 90d são descartadas antes do retorno. Isso resolve F8 (cap per-campaign impossível no schema anterior) e F18 (growth ilimitado).

### D7 — i18n usa **next-intl** com `messages/{en,pt-BR}.json` flat

O projeto usa **next-intl**, NÃO `next-i18next`. Todas as chaves entram como sub-objeto `conversion` nos arquivos `messages/en.json` e `messages/pt-BR.json` já existentes (confirmação: `conversion` namespace **ainda não existe** nos dois locales — cria do zero em Story 03-B).

Markdown inline (ex: `**{characterName}**` / `<em>{characterName}</em>`) exige `t.rich()` — `t()` simples não interpreta.

**F13 — Este épico introduz o **primeiro uso** de `t.rich()` no projeto.** Grep `.rich\(` em `.tsx` retorna 0 matches em 2026-04-19. Definição canônica que vira pattern do projeto:

```typescript
// components/conversion/RecapCtaCard.tsx (exemplo canônico v3)
import { useTranslations } from "next-intl";
const t = useTranslations("conversion.recap_anon");

// Valor da chave "headline" no JSON: "Parabéns! <em>{characterName}</em> sobreviveu."
<h2>
  {t.rich("headline", {
    characterName,
    em: (chunks) => <strong className="text-gold">{chunks}</strong>,
  })}
</h2>
```

Variáveis (ex: `{characterName}`) são escapadas por next-intl (safe contra XSS). Tags custom (ex: `<em>`) são interpretadas apenas como chamadas a funções passadas no segundo argumento — sem HTML parsing cru. Paige e Sally documentam este snippet em `docs/patterns-i18n-rich-text.md` como artefato do epic.

### D8 — Analytics com namespace colon-style + allowlist update

Todos os eventos seguem o padrão existente de `lib/analytics/track.ts`:

| Evento | Forma correta |
|---|---|
| CTA exibido | `conversion:cta_shown` |
| CTA dispensado | `conversion:cta_dismissed` |
| CTA clicado | `conversion:cta_clicked` |
| Modal aberto | `conversion:modal_opened` |
| Conversão concluída | `conversion:completed` |
| Conversão falhou | `conversion:failed` |

**F1 — ALLOWED_EVENTS enforcement:** `app/api/track/route.ts:7-131` é um `Set` com enforcement duro (linha 187-189 retorna HTTP 400 `unknown_event` para qualquer nome fora). **Os 6 eventos acima DEVEM ser adicionados ao Set** (Story 03-A task + AC). Sem essa modificação, client tenta trackear e recebe 400 silencioso — sem dado ingressado.

### D9 — "Combate iniciou" vem do `active` state do `PlayerJoinClient`, NÃO de um novo subscription

**F2 — Correção do vaporware da v2.** Reality check:
- `combat:started` é evento de **servidor→analytics** (não broadcast); disparado em `lib/supabase/session.ts:34` (DM-side, quando DM inicia combate) e listado em `app/api/track/route.ts:20` (allowlist). Está lá faz meses.
- No lado player, a transição "lobby → combate" é detectada via broadcast `session:state_sync` recebido em `PlayerJoinClient.tsx:1030-1055`. O handler chama `setActive(true)` na linha 1055. Há também fallback polling em `PlayerJoinClient.tsx:1818-1852` que também seta `active` quando `enc.is_active` chega `true`.
- **Não existe** (nem precisamos) um hook `useEncounterActivation` sobre `postgres_changes`. V2 inventou essa camada.

**Decisão v3:** Story 03-C consome o `active` state que `PlayerJoinClient` **já possui internamente**. Como `active` é state local do componente (1 arquivo monolito), a integração acontece dentro de `PlayerJoinClient.tsx` — o render do `<WaitingRoomSignupCTA>` é condicional a `!active && isAnon && shouldShowCta(campaignId)`. Não há nova subscription realtime, não há novo hook. Guest não tem realtime **nem** waiting room, então essa parte é N/A para guest (CLAUDE.md Combat Parity).

Se Sally achar a injeção inline desagradável, a Story 03-C pode opcionalmente extrair `active` para um prop do filho (`<WaitingRoomSignupCTA active={active} ... />`) com condicional de unmount no nível do pai, mas **não cria subscription nova**.

### D10 — Turn-safety: liveness garantido, ação não

**Liveness (garantido):** heartbeat continua enquanto modal aberto → DM vê player como presente → DM não expulsa player por inatividade.

**Ação (NÃO garantido):** se DM distribuir turno enquanto modal está aberto, o player NÃO executa automaticamente. Ao fechar o modal, vê o turno atual (possivelmente já passou sem ação). Isso é aceitável porque heartbeat prova que o player está vivo — o DM pode voluntariamente esperar ou re-distribuir.

**F19 — OAuth redirect e heartbeat:** `PlayerJoinClient.tsx:1792-1803` pausa heartbeat quando `document.visibilityState === "hidden"` (CLAUDE.md Resilient Reconnection anti-pattern #4). OAuth flow do `AuthModal` fecha o modal e redireciona página inteira (ver Epic 02 Área 3 M2). Durante a redirect (página visita provider e volta), a tab pode ficar hidden por alguns segundos; heartbeat pausa durante isso — comportamento **correto**, não bug.

**Regra refinada:** heartbeat continua EXCETO quando tab está hidden (OAuth new-tab redirect, user trocou de aba, etc.). Durante OAuth (≤45s típico), player aparece offline brevemente para o DM; reconexão segue cadeia de fallbacks em `docs/spec-resilient-reconnection.md §3`. Isso está **alinhado com CLAUDE.md Resilient Reconnection**, não em conflito.

**Regra CLAUDE.md (Combat Parity):** guest NÃO tem realtime nem DM externo, então o conceito de turn-safety é diferente. No guest, o modal aberto não trava botões de ação da UI — player pode interagir com combat UI se quiser. Sem heartbeat pra provar liveness porque não há DM externo.

---

## Stories

| ID | Título | Área | Status | Estimativa |
|---|---|---|---|---|
| 03-A | Dismissal store + analytics helpers + **ALLOWED_EVENTS update** | 6, 8 | Pronta | 1-2 dias |
| 03-B | Copy + chaves i18n `conversion.*` + `t.rich()` pattern doc | 5 | Pronta (Paige lidera) | 1 dia |
| 03-C | `WaitingRoomSignupCTA` + integração `PlayerJoinClient` consumindo `active` state | 1 | Pronta | 3-4 dias |
| 03-D | `RecapCtaCard` + `saveSignupContext` no `CombatRecap`/`RecapActions` + anon flow + regressão "Salvar Combate" | 2 | Pronta | 2-3 dias |
| 03-E | Guest flow (signUp + migrateGuestCharacterToAuth) local handling em `RecapCtaCard` | 3 | Pronta | 2-3 dias |
| 03-F | Turn-safety (reuso de `player:idle` com novo payload field) + `PlayersOnlinePanel` badge + validação Quinn | 4 | Pronta | 3-4 dias |
| 03-G | Integração dos eventos `conversion:*` no `MetricsDashboard` (via nova RPC `admin_conversion_funnel`) | 7 | Pronta | 1-2 dias |
| 03-H | Suite E2E Playwright | — | Pronta | 3-4 dias |

**Total:** 16-23 dias base + 4-7 dias de buffer (code review, a11y, polish) = **20-30 dias úteis (~2-3 sprints)**.

---

## Stories detalhadas

### Story 03-A — Dismissal store + analytics helpers + ALLOWED_EVENTS update (Áreas 6, 8)

**Goal:** camada de infraestrutura que não depende de nenhum outro épico. Pode rodar em paralelo enquanto Épicos 01/02 ainda não terminaram.

**Arquivos:**
- `components/conversion/dismissal-store.ts` — **CRIAR**
- `lib/conversion/analytics.ts` — **CRIAR** (wrappers sobre `trackEvent`)
- `app/api/track/route.ts` — **MODIFICAR** linhas 7-131: adicionar 6 eventos `conversion:*` ao `Set` ALLOWED_EVENTS **(F1 — bloqueante)**
- `tests/conversion/dismissal-store.test.ts` — **CRIAR**
- `tests/conversion/analytics.test.ts` — **CRIAR**

**Contrato `dismissal-store.ts`:**

```typescript
// Exportado para reutilização em testes (F24)
export const KEY = "pocketdm_conversion_dismissal_v1";
const TTL_DAYS = 90;
const CAP_PER_CAMPAIGN = 3;
const COOLDOWN_DAYS = 7;

export type CampaignDismissalEntry = {
  count: number;
  lastDismissedAt: string;  // ISO-8601
};

export type DismissalRecord = {
  dismissalsByCampaign: Record<string, CampaignDismissalEntry>;
  lastSeenCampaign: string | null;
};

export function readDismissalRecord(): DismissalRecord | null;
export function recordDismissal(campaignId: string | "__guest__"): void;
export function resetOnConversion(): void;
export function shouldShowCta(campaignId: string | "__guest__"): boolean;
```

**Regras de `shouldShowCta` (5 cenários, ordenados por precedência, F9):**

Precedência top-down — primeira regra que combinar decide:

1. **Storage inacessível ou parse error:** `true` (graceful — prefere mostrar a silenciar)
2. **Sem record:** `true` (primeira vez)
3. **Campaign entry ausente OU `lastDismissedAt` > 90 dias (TTL):** `true` (nova campanha ou entrada expirada — purga na leitura)
4. **`count >= CAP_PER_CAMPAIGN` (3+) nessa campanha:** `false` (cap vence cooldown — player desistiu explicitamente)
5. **`now - lastDismissedAt` > COOLDOWN_DAYS (7):** `true` (cooldown passou, dá outra chance)
6. **Default:** `false`

Nota: regra 4 (cap) **vence** regra 5 (cooldown) — se player dispensou 3+ vezes, não re-prompter mesmo após 7d. Só TTL (90d, regra 3) zera o contador.

**ACs dismissal-store:**
- [ ] `readDismissalRecord` retorna `null` se chave ausente (graceful)
- [ ] Acesso a `localStorage` via try/catch (Safari ITP, iframe) — retorna `null` se falha
- [ ] Prefix da chave é `pocketdm_conversion_dismissal_v1` (D6); `KEY` exportado para testes (F24)
- [ ] Sentinel `"__guest__"` tratado como campaignId válido no `dismissalsByCampaign`
- [ ] `resetOnConversion()` remove o record completamente
- [ ] TTL de 90 dias poda entries expiradas na leitura (F18)
- [ ] Cap de 3 per-campaign (D6); cap vence cooldown de 7d (F9 ordering)
- [ ] 100% de cobertura unit (**jest**, não vitest — ver handoff §3). Script: `npm test -- tests/conversion/` (F22: não usar `rtk` em AC executado por CI; `rtk` é wrapper local de dev)

**Contrato `lib/conversion/analytics.ts`:**

```typescript
import { trackEvent } from "@/lib/analytics/track";

type ConversionMoment = "waiting" | "recap_anon" | "recap_guest";

export function trackCtaShown(
  moment: ConversionMoment,
  ctx: { campaignId?: string; hasCharacter: boolean; guestCombatantCount?: number }
): void;  // fires "conversion:cta_shown"

export function trackCtaDismissed(
  moment: ConversionMoment,
  ctx: { campaignId?: string; dismissalCount: number }
): void;  // fires "conversion:cta_dismissed"

export function trackCtaClicked(
  moment: ConversionMoment,
  ctx: { campaignId?: string }
): void;  // fires "conversion:cta_clicked"

export function trackModalOpened(moment: ConversionMoment): void;  // fires "conversion:modal_opened"

export function trackConversionCompleted(
  moment: ConversionMoment,
  ctx: { campaignId?: string; characterId?: string; flow: "upgrade" | "signup_and_migrate"; guestCombatantCount?: number }
): void;  // fires "conversion:completed"

export function trackConversionFailed(
  moment: ConversionMoment,
  ctx: { campaignId?: string; error: string }
): void;  // fires "conversion:failed"
```

**ACs analytics:**
- [ ] Todos os eventos usam namespace colon-style (`conversion:cta_shown`, etc.) — D8
- [ ] Nenhum evento passa PII (email, displayName, sessionTokenId)
- [ ] `characterName` **NÃO** é enviado em nenhum event (PII potencial) — apenas `hasCharacter: boolean` e `characterId`
- [ ] `trackEvent` é fire-and-forget (já garantido por `lib/analytics/track.ts`)

**ACs allowlist (F1):**
- [ ] Em `app/api/track/route.ts`, após linha 130 e antes do fechamento `]` em 131, adicionar:
  ```typescript
  // Conversion funnel (Epic 03)
  "conversion:cta_shown",
  "conversion:cta_clicked",
  "conversion:cta_dismissed",
  "conversion:modal_opened",
  "conversion:completed",
  "conversion:failed",
  ```
- [ ] Smoke test: `POST /api/track` com `event_name: "conversion:cta_shown"` retorna 200, não 400
- [ ] Teste unitário de route: eventos novos não são rejeitados

**Testing contract (03-A):**
- Unit jest: 6 cenários de `shouldShowCta` (incluindo ordenação cap > cooldown) + `resetOnConversion` + storage blocked fallback + TTL pruning
- Unit jest: smoke de cada `track*` helper mockando `trackEvent` — validar nome exato do evento
- Unit jest: `POST /api/track` com cada `conversion:*` retorna 200

---

### Story 03-B — Copy + i18n + `t.rich()` pattern (Área 5)

**Goal:** chaves de tradução sob `conversion` em `messages/en.json` e `messages/pt-BR.json`. Paige lidera o texto. Pode rodar em paralelo com 03-A.

**Arquivos:**
- `messages/pt-BR.json` — **MODIFICAR** (adicionar sub-objeto `conversion` na raiz)
- `messages/en.json` — **MODIFICAR** (idem)
- `docs/patterns-i18n-rich-text.md` — **CRIAR** (F13 pattern doc, referenciado em D7)

**Estrutura proposta:**

```jsonc
// messages/pt-BR.json — adicionar sob a raiz, próximo de "combat"
"conversion": {
  "waiting_room": {
    "headline_with_char": "Quer salvar <em>{characterName}</em> pra voltar mais rápido?",
    "headline_no_char": "Salve seu progresso pra voltar mais rápido",
    "body": "Em 30 segundos você cria sua conta e volta na próxima sessão com tudo pronto.",
    "cta_primary": "Criar minha conta",
    "cta_secondary": "Agora não"
  },
  "recap_anon": {
    "headline": "Parabéns! <em>{characterName}</em> sobreviveu.",
    "body": "Crie sua conta e mantenha {characterName} e o histórico dessa aventura.",
    "cta_primary": "Salvar e criar conta",
    "cta_secondary": "Fechar"
  },
  "recap_guest": {
    "headline": "<em>{characterName}</em> merece ser salvo!",
    "body": "Sua aventura pode continuar. Crie sua conta e leve {characterName} pra próxima.",
    "cta_primary": "Salvar {characterName}",
    "cta_secondary": "Fechar",
    "picker_headline": "Qual personagem salvar?",
    "picker_hint": "Você pode salvar um agora; os outros continuam no modo guest.",
    "no_character": "Sem personagem para salvar"
  },
  "turn_safety_toast": {
    "combat_started": "Combate começou! Você pode continuar o cadastro — o DM sabe que você está aqui.",
    "your_turn": "Seu turno! Se quiser jogar agora, feche o cadastro."
  },
  "dm_badge": {
    "authenticating": "cadastrando"
  },
  "post_success": {
    "waiting_room": "Conta criada! Seu personagem está salvo. Continue jogando.",
    "recap_anon": "Conta criada! {characterName} foi preservado na sua conta.",
    "recap_guest": "Conta criada! {characterName} foi salvo na sua conta."
  }
}
```

**Notas de implementação i18n:**
- Copy com marcação `<em>{characterName}</em>` exige `t.rich("headline_with_char", { characterName, em: (chunks) => <strong className="text-gold">{chunks}</strong> })`. `t()` plano **não** interpreta tags — bug latente se esquecido. Ver snippet canônico em D7.
- Este épico introduz o **primeiro** uso de `t.rich()` no projeto (grep `.rich\(` em `.tsx` retorna 0 em 2026-04-19 — F13). Snippet em D7 + `docs/patterns-i18n-rich-text.md` viram fonte de verdade para próximos usos.
- Copy em inglês é **obrigatória no lançamento** — bilíngue desde v1 (evita dívida)
- Nome do personagem é variável; HTML/markdown ficam no template, não no valor — segurança XSS ok porque next-intl escapa `{characterName}`

**Regras Paige estabeleceu:**
- Evitar vocabulário de marketing ("promoção", "oferta", "não perca")
- Focar em preservação de progresso (H3), não em features
- Sempre citar nome do personagem quando disponível
- **Alinhamento com `docs/glossario-ubiquo.md` (F25):** "Salvar" (não "converter"/"adotar"); "Conta" (não "perfil"/"cadastro" solto); "Aventura" (não "sessão" em copy user-facing); "Combate" (não "encontro"/"encounter"); Quest não traduzida. Review inclui grep pelos termos proibidos.

**ACs:**
- [ ] Chaves existem nos dois locales (PT-BR + EN)
- [ ] Todas as strings com `<em>` são consumidas via `t.rich()`, não `t()`
- [ ] `docs/patterns-i18n-rich-text.md` criado com snippet canônico de D7
- [ ] Grep confirma que glossário é respeitado: ausência de "converter"/"adotar"/"encontro"/"perfil" nos arquivos de copy novos (check contra `docs/glossario-ubiquo.md`)
- [ ] Snapshot test render de cada CTA em RTL com locale PT-BR e EN (garante `t.rich` renderiza `<strong>`)

**F11 — Process gate (separado de ACs técnicos):** Paige **peer-review do PR** via mecanismo scriptável: comentário `/approved` no PR; CI parseia comentários da Paige e bloqueia merge até encontrar a flag. Se infra de comment-parsing não existir no CI atual, alternativa aceita: label `approved-by-paige` aplicado manualmente, check CI simples que exige a label. Está documentado em "Process Gates" abaixo — não é AC programático da story.

**F12 — i18n lint:** v2 citava um script inexistente. Decisão v3 = **Opção B**: drop do lint automatizado (não vale a infra pra uma story). Garantia de consistência vem dos **snapshot tests** (AC acima) + review Paige (process gate). Se o projeto adotar `@intlify/unplugin-*` no futuro, essa AC pode voltar.

**Testing contract (03-B):**
- Snapshot test render de cada CTA em RTL com locale PT-BR e EN (garante `t.rich` renderiza `<strong>`)
- Snapshot quebra se copy muda — força PR de copy a atualizar os snapshots e force Paige review

---

### Story 03-C — Waiting Room CTA (Área 1)

**Goal:** card inline no `/join/[token]` que oferece signup enquanto player aguarda combate. Aparece apenas para anon (não auth, não guest).

**Trigger:**
- Player atual em `/join/[token]` é anon (`session_tokens.user_id IS NULL`)
- Combate não iniciou — consome `active` state já existente em `PlayerJoinClient` (D9/F2: `active === false`)
- `shouldShowCta(campaignId)` retorna `true` (Story 03-A)

**Arquivos:**
- `components/conversion/WaitingRoomSignupCTA.tsx` — **CRIAR**
- `components/player/PlayerJoinClient.tsx` (3043 linhas) — **MODIFICAR** aditivamente (render condicional do CTA usando `active` state já existente; **NÃO criar nova realtime subscription**)
- `tests/conversion/waiting-room-cta.test.tsx` — **CRIAR** (RTL)

**Contrato `WaitingRoomSignupCTA`:**

```typescript
type WaitingRoomSignupCTAProps = {
  sessionTokenId: string;
  campaignId: string;
  playerName: string;          // de session_tokens.player_name
  characterId: string | null;  // já soft-claimed ou null
  characterName: string | null;
  onOpenAuthModal: (ctx: { sessionTokenId: string; campaignId: string; characterId: string | null }) => void;
  onDismiss: () => void;
};
```

**Integração em `PlayerJoinClient` (aditiva, F2):**
- Identificar condição: `isAnon && !active && shouldShowCta(campaignId)`
- Renderizar `<WaitingRoomSignupCTA>` próximo ao lobby list (bloco JSX existente)
- **Não criar novo hook, não criar nova subscription.** `active` já transiciona para `true` automaticamente via `session:state_sync` handler em linha 1055. Quando vira `true`, o card naturalmente não re-renderiza (condição falsa). React faz o resto.
- `onOpenAuthModal` abre `AuthModal` (Épico 02) com `upgradeContext = { sessionTokenId, campaignId, guestCharacter: undefined }`

**Copy/i18n:**
- `useTranslations("conversion.waiting_room")` + `t.rich("headline_with_char", { characterName, em: ... })`
- Botão primário usa `conversion.waiting_room.cta_primary`
- Botão secundário usa `conversion.waiting_room.cta_secondary` → chama `recordDismissal(campaignId)` + `onDismiss`

**Analytics:**
- `trackCtaShown("waiting", { campaignId, hasCharacter: !!characterId })` ao mount
- `trackCtaDismissed("waiting", { campaignId, dismissalCount })` ao clicar "Agora não"
- `trackCtaClicked("waiting", { campaignId })` ao clicar primário
- `trackConversionCompleted("waiting", { campaignId, characterId, flow: "upgrade" })` após AuthModal retornar success

**ACs:**
- [ ] Card inline renderiza como `Card` (não overlay), acima ou abaixo do lobby list
- [ ] Desaparece automaticamente quando `active` vira `true` (re-render condicional; sem hook novo, sem subscription nova — F2/F17)
- [ ] Não aparece para auth (`session_tokens.user_id IS NOT NULL`) nem guest (guest está em `/try`, não `/join`)
- [ ] Copy contextual usa `characterName` quando disponível; fallback `headline_no_char`
- [ ] "Agora não" grava no dismissal store e some até próxima campanha ou 7 dias (ou 3+ cap)
- [ ] Parity: guest/auth/anon em `/try`, `/join`, `/invite` continuam funcionando (CLAUDE.md)
- [ ] Reconexão: fechar `/join` e reabrir re-avalia `shouldShowCta`; não quebra `session_token_id` storage (CLAUDE.md Resilient Reconnection)

**Testing contract (03-C):**
- RTL: render com/sem `characterName`; dismissal store mockado; parent state `active` controlado por prop
- RTL: "Agora não" incrementa dismissal count
- RTL: mudar parent `active` para `true` → componente unmount via render condicional no parent
- E2E Playwright: cobrir em Story 03-H

---

### Story 03-D — Recap CTA anon (Área 2)

**Goal:** exibir card de conversão no recap quando player é anon; ligar `onSaveAndSignup` ao fluxo de upgrade preservando assinatura atual; **preservar botão "Salvar Combate" para callers que já o veem (F6).**

**Arquivos:**
- `components/conversion/RecapCtaCard.tsx` — **CRIAR** (shared entre 03-D anon e 03-E guest)
- `components/combat/CombatRecap.tsx` — **MODIFICAR** (adicionar prop `saveSignupContext?`, non-breaking — D4; real location confirmado em 15-36)
- `components/combat/RecapActions.tsx` — **MODIFICAR** (forward `saveSignupContext?` para `RecapCtaCard`; atualizar regra `!onSaveAndSignup` na linha 211 para `shouldShowSaveCombat(...)` — F6)
- `components/player/PlayerJoinClient.tsx` — **MODIFICAR** aditivamente (passar `saveSignupContext` ao `CombatRecap` quando anon)
- `tests/conversion/recap-cta-anon.test.tsx` — **CRIAR**
- `tests/conversion/recap-actions-save-combat.test.tsx` — **CRIAR** (F6 regressão)

**F14 — `components/player/combat/RecapActions.tsx` NÃO EXISTE.** Este arquivo nunca existiu. Todas as referências anteriores eram fantasma (`ls components/player/combat/` retorna "No such file"). Real path é **apenas** `components/combat/RecapActions.tsx`. Ignorar menções em v1/v2.

**Modificações em `CombatRecap.tsx`:**

```typescript
interface CombatRecapProps {
  // ...props existentes mantidas (15-36)...
  onSaveAndSignup?: () => void;              // MANTÉM assinatura atual (D4)
  saveSignupContext?: SaveSignupContext;     // PROP NOVA (opcional)
}

type SaveSignupContext = {
  mode: "anon" | "guest";
  sessionTokenId?: string;       // anon
  campaignId?: string;           // anon
  characterId?: string | null;   // anon
  characterName?: string | null;
  guestCombatants?: Combatant[]; // guest — N>=1 filtrados via snapshot.combatants.filter(c => c.is_player), D5/F7
};
```

Quando `saveSignupContext` está presente, `RecapCtaCard` lê o contexto e dispara o fluxo. Quando ausente, botão continua chamando `onSaveAndSignup()` zero-arg (preserva comportamento atual do guest em `GuestCombatClient.tsx:2214`).

**Modificações em `RecapActions.tsx` — regra de "Salvar Combate" (F6):**

Hoje linha 211 tem `{!onSaveAndSignup && ...<button>Salvar Combate</button>}`. Nova lógica:

```typescript
function shouldShowSaveCombat(
  saveSignupContext: SaveSignupContext | undefined,
  onSaveAndSignup: (() => void) | undefined
): boolean {
  if (!saveSignupContext) {
    // Path legacy: esconde pra guest (onSaveAndSignup presente sem contexto) — comportamento atual preservado
    return !onSaveAndSignup;
  }
  if (saveSignupContext.mode === "anon") return true;  // anon vê os dois: RecapCtaCard (card) + Salvar Combate (botão)
  if (saveSignupContext.mode === "guest") return !!saveSignupContext.campaignId;  // guest só com campaign (edge case)
  return false;
}

// linha 211 passa a ser:
{shouldShowSaveCombat(saveSignupContext, onSaveAndSignup) && (
  <button ...>Salvar Combate</button>
)}
```

Teste unitário cobre 4 casos: `(undefined, undefined)`, `(undefined, fn)`, `(anon, any)`, `(guest no campaignId, any)`, `(guest with campaignId, any)`.

**Contrato `RecapCtaCard`:**

```typescript
type RecapCtaCardProps = {
  context: SaveSignupContext;
  onComplete?: () => void;  // fecha recap após success
};
```

Internamente:
- Se `mode === "anon"`: abre `AuthModal` com `upgradeContext = { sessionTokenId, campaignId, guestCharacter: undefined }`. AuthModal `onSuccess` → re-hidrata client via reconnect-from-storage (sessionToken preservado)
- Se `mode === "guest"`: Story 03-E cuida do handling pós-signup localmente

**Integração em `PlayerJoinClient` (aditiva):**
- Quando `<CombatRecap>` é montado após combate finalizar E player é anon: passar `saveSignupContext = { mode: "anon", sessionTokenId, campaignId, characterId, characterName }`
- Preservar comportamento atual do `onJoinCampaign` (mutualmente exclusivo com `saveSignupContext` anon)

**Copy/i18n:**
- `useTranslations("conversion.recap_anon")` + `t.rich`
- Botão primário `cta_primary`, secundário `cta_secondary` → fechar recap

**Analytics:**
- `trackCtaShown("recap_anon", { campaignId, hasCharacter: !!characterId })` ao montar o card
- `trackCtaClicked("recap_anon", ...)` ao clicar primário
- `trackConversionCompleted("recap_anon", { campaignId, characterId, flow: "upgrade" })` após success
- `trackConversionFailed("recap_anon", { error })` em erro do endpoint

**ACs:**
- [ ] `CombatRecap` aceita `saveSignupContext?` sem alterar assinatura de `onSaveAndSignup`
- [ ] Call sites existentes (`GuestCombatClient.tsx:2214`, `RecapActions.tsx`) compilam sem alteração
- [ ] Card aparece **apenas** quando `mode === "anon"`; guest é coberto em 03-E; auth não vê card
- [ ] **F6:** Botão "Salvar Combate" continua renderizando para callers atuais (auth/DM sem saveSignupContext; anon com saveSignupContext) — regressão de render testada em `recap-actions-save-combat.test.tsx` com 5 cenários cobrindo a matriz completa de `(saveSignupContext, onSaveAndSignup)`
- [ ] AuthModal abre com `upgradeContext` correto
- [ ] Pós-success: toast "Conta criada! {characterName} foi preservado na sua conta" + fecha recap
- [ ] `tsc --noEmit` limpo

**Testing contract (03-D):**
- RTL: montar `CombatRecap` com/sem `saveSignupContext`, validar render condicional
- RTL: clicar CTA → mock AuthModal → simular success → validar `onComplete` chamado
- RTL: `shouldShowSaveCombat` testado em 5 combinações (F6)
- E2E: Story 03-H

---

### Story 03-E — Recap CTA guest + migrate (Área 3)

**Goal:** guest no `/try` cria conta no AuthModal e migra o personagem do snapshot Zustand para `player_characters`.

**Arquivos:**
- `components/guest/GuestCombatClient.tsx` (linha 2214) — **MODIFICAR** aditivamente (passar `saveSignupContext` com `mode: "guest"`; preservar `handleSaveAndSignup` legacy como fallback em caso de erro — F15)
- `components/conversion/RecapCtaCard.tsx` — **EXTENDER** (criado em 03-D) para tratar `mode: "guest"` localmente (D3b)
- `components/guest/GuestUpsellModal.tsx` — **MANTER** (deprecar em fase 2; ver F15)
- `tests/conversion/recap-cta-guest.test.tsx` — **CRIAR**

**Fluxo guest (dentro de `RecapCtaCard` quando `mode === "guest"`, D3b):**

1. `useGuestCombatStore.getState()` — obter snapshot
2. `const playerCombatants = snapshot.combatants.filter(c => c.is_player === true)` (D5)
3. **Se `playerCombatants.length === 0`:** botão desabilitado + texto `conversion.recap_guest.no_character`
4. **Se `playerCombatants.length === 1`:** pré-selecionado; botão primário habilitado
5. **Se `playerCombatants.length >= 2` (F7):** render picker inline com os N candidatos ordenados por HP atual desc; player seleciona 1. Copy: `conversion.recap_guest.picker_headline` + `picker_hint`. Analytics `trackCtaShown` inclui `guestCombatantCount: N`.
6. **`onClick`:**
   - Chama `saveGuestCombatSnapshot(snapshot)` **antes** de abrir modal (safety net F15 — preserva estado mesmo se AuthModal falhar)
   - Abre `AuthModal` com `defaultTab: "signup"` **sem** `upgradeContext` (D3b, F10 Opção B)
   - `AuthModal.onSuccess({ userId, isNewAccount })` callback:
     - Se `isNewAccount === true`: `fetch("/api/player-identity/migrate-guest-character", { body: { guestCharacter: selectedCombatant, setAsDefault: true } })`
     - Endpoint invoca `migrateGuestCharacterToAuth(guestCharacter, userId, { setAsDefault: true })` (Épico 01 Área 3)
     - Se migração OK: toast `conversion.post_success.recap_guest` + `trackConversionCompleted("recap_guest", { flow: "signup_and_migrate", guestCombatantCount })` + redirect `/app/dashboard`
     - Se migração falha: `trackConversionFailed("recap_guest", { error })` + toast "erro ao salvar personagem, você pode tentar de novo no dashboard" — user continua logado, snapshot ainda salvo em localStorage; dashboard pode oferecer retry
7. **Se AuthModal throw inesperado (ex: hydration):** catch → fallback para `window.location.href = "/auth/sign-up?from=guest-combat"` (path legacy preservado — F15 fallback chain). Evita user stuck.

**F15 — Deprecação do flow legacy (`handleSaveAndSignup` em `GuestCombatClient.tsx:1794-1803`):**

| Artefato | Decisão v3 | Fase |
|---|---|---|
| `saveGuestCombatSnapshot(...)` call antes do modal | **PRESERVADO** — safety net. Runs tanto no flow novo (v3) quanto no fallback legacy | v3 |
| `trackEvent("guest:recap_save_signup")` em linha 1795 | **PRESERVADO como supplement** — analytics backward compat com histórico pré-v3; coexiste com `conversion:cta_clicked("recap_guest")` | v3 → deprecar em v4 após 90d de data no novo evento |
| `window.location.href = "/auth/sign-up?from=guest-combat"` | **PRESERVADO como fallback** — usado apenas se `AuthModal` falhar ao abrir. Landing page `/auth/sign-up?from=guest-combat` continua ativa | v3 → re-avaliar em 90d; decisão: remover quando `conversion:failed` com `error: "modal_open_failed"` < 1% |
| `GuestUpsellModal.tsx` | **PRESERVADO não-chamado** — sem import novo; flagado para remoção em Epic follow-up (issue link no PR) | v4 |

**Importante:**
- Guest NÃO passa por `upgradePlayerIdentity` (não tem session_token Supabase) — D3
- AuthModal `upgradeContext` NÃO é usado aqui (`upgradeContext` é anon→auth apenas) — D3b
- AuthModal `guestMigrationContext` **NÃO é adicionado** — F10 Opção B (local handling)
- `migrateGuestCharacterToAuth` já valida `guestCharacter.is_player === true` (ver `lib/supabase/character-portability.ts:41-43`)

**Copy/i18n:**
- `useTranslations("conversion.recap_guest")` + `t.rich`
- Picker usa `picker_headline`, `picker_hint`
- Disabled state usa `no_character`

**Analytics:**
- `trackCtaShown("recap_guest", { hasCharacter: playerCombatants.length > 0, guestCombatantCount: playerCombatants.length })`
- `trackCtaClicked("recap_guest", {})`
- `trackConversionCompleted("recap_guest", { characterId: newCharacterId, flow: "signup_and_migrate", guestCombatantCount: playerCombatants.length })`
- `trackConversionFailed("recap_guest", { error })` se migrate-guest-character falhar

**ACs:**
- [ ] `RecapCtaCard` em `mode: "guest"` filtra `combatants` por `is_player === true` (sem `.find()` — usar `.filter()` — F7)
- [ ] Se nenhum combatant player existe, CTA desabilitado com copy `no_character`
- [ ] Se 1 player combatant, pré-selecionado sem picker
- [ ] Se 2+ player combatants, picker inline com lista; outros permanecem no snapshot (não deletados — F7)
- [ ] Signup fresh (sem `upgradeContext`) + migration explícita local (D3b)
- [ ] `default_character_id` setado após migração (via `setAsDefault: true` no endpoint)
- [ ] Character novo aparece no `/app/dashboard/characters` pós-signup
- [ ] `saveGuestCombatSnapshot` chamado **antes** do `AuthModal` abrir (safety net F15)
- [ ] Fallback legacy `/auth/sign-up?from=guest-combat` funciona se AuthModal throw
- [ ] Evento `guest:recap_save_signup` continua sendo disparado em paralelo ao `conversion:cta_clicked("recap_guest")` (F15 backward compat)
- [ ] `GuestUpsellModal.tsx` não é removido; comentário `@deprecated` adicionado no topo; issue follow-up criado com link
- [ ] Guest NÃO tem realtime (CLAUDE.md): nenhum observer/broadcast neste fluxo

**Testing contract (03-E):**
- RTL + mock Zustand store: snapshot com 1 player + monstros → pré-selecionado, migra
- RTL + mock: snapshot com 3 players + monstros → picker aparece; usuário seleciona 1; analytics registra `guestCombatantCount: 3`
- RTL: snapshot sem player → botão desabilitado
- RTL: AuthModal falha ao abrir → fallback para `/auth/sign-up?from=guest-combat`
- E2E: Story 03-H

---

### Story 03-F — Turn Safety (Área 4, Quinn não-negociável)

**Goal:** garantir que modal aberto NÃO quebra detecção de liveness; DM vê player como presente com status "cadastrando". Formalizar regra D10: **liveness garantido, ação não**.

**F3 — Decisão: reusar `player:idle` com payload field novo (não criar `player:status-update`).**

Listener DM em `CombatSessionClient.tsx:1182-1193` hoje aceita: `player:disconnecting`, `player:idle`, `player:active`, `player:joined`. Inventar um quinto evento (`player:status-update`) aumenta surface area sem benefício. Solução v3:

- **Player emite `player:idle` com payload `{ player_name, reason: "authenticating" }`** ao abrir AuthModal.
- **Player emite `player:active` (sem payload reason)** ao fechar AuthModal.
- **DM listener `CombatSessionClient.tsx:1185-1187` é modificado** para ler `payload.reason`; se `reason === "authenticating"`, overrida o status visual para `"authenticating"` (variante de `idle` com texto específico).
- **`PlayersOnlinePanel.tsx` é modificado** para aceitar novo status `"authenticating"` como variante visual (badge `conversion.dm_badge.authenticating`).

Rationale da escolha: reuso do evento existente = zero nova superfície broadcast; zero nova allowlist (`player:idle` não é allowlisted em `/api/track` porque é broadcast realtime, não analytics server-side); zero risco de regressão em listeners não-modificados (eles ignoram `reason` e tratam como idle normal, que visualmente já é próximo do desejado — yellow dot).

**Arquivos (todos reais, F4/F14 verificados):**
- `components/player/PlayerJoinClient.tsx` — **MODIFICAR** aditivamente:
  - Callbacks ao abrir/fechar AuthModal: `channel.send({ type: "broadcast", event: "player:idle", payload: { player_name, reason: "authenticating" } })` e equivalente com `event: "player:active"` ao fechar
  - NÃO pausar heartbeat ao abrir AuthModal (tab continua visible em geral; apenas OAuth redirect pausa — D10/F19)
  - Listener local que escuta `session:state_sync` com `active: true` e mostra toast `turn_safety_toast.combat_started` se o AuthModal ainda estiver aberto
  - Novo listener: se `combat:turn_advance` payload indica `current_turn_combatant_id` que pertence ao player **E** AuthModal está aberto, dispara toast `turn_safety_toast.your_turn` (F16)
- `components/combat-session/CombatSessionClient.tsx` — **MODIFICAR** linhas 1185-1187: `player:idle` handler agora lê `payload.reason`; se `"authenticating"` passa status `"authenticating"` (novo valor) para `markStatus`; caso contrário mantém `"idle"`
- `components/combat-session/PlayersOnlinePanel.tsx` — **MODIFICAR**:
  - Tipo `PlayerStatus` vira `"online" | "idle" | "offline" | "authenticating"`
  - Novo badge amarelo-pulsante com texto `t("conversion.dm_badge.authenticating")` em ambos os modos (compact linha 199-222 e full linha 225-256)
- `tests/conversion/turn-safety.test.tsx` — **CRIAR**

**F16 — Binding do toast `turn_safety_toast.your_turn`:**

Trigger: `combat:turn_advance` broadcast chega em `PlayerJoinClient.tsx:1080` (confirmado existir) com payload contendo current turn info. Se AuthModal state é `open: true` E o turn advance aponta para o próprio player combatant (check via `player_combatant_id === currentTurnCombatantId` no payload), dispara toast. Toast é não-bloqueante (sonner), não fecha modal.

Verificação: `combat:turn_advance` é broadcast, não está em ALLOWED_EVENTS de `/api/track` — correto, porque broadcasts não passam por `/api/track`. Esta AC não requer nova allowlist.

**Regras explícitas:**

| Situação | Comportamento esperado |
|---|---|
| Player abre AuthModal em waiting room, DM inicia combate | Toast `conversion.turn_safety_toast.combat_started`; modal permanece aberto; heartbeat continua |
| DM distribui turno do player enquanto modal aberto | Toast `conversion.turn_safety_toast.your_turn`; heartbeat prova liveness → DM vê badge "cadastrando" (não expulsa); player NÃO executa turno automaticamente; turno pode passar sem ação |
| Player fecha modal após turno já ter passado | UI re-hidrata → player vê rodada atual; sem dano automatizado |
| AuthModal OAuth redirect (página inteira, ver Epic 02 Área 3 M2) | State em `localStorage` sobrevive; heartbeat pausa durante redirect (visibilityState=hidden — comportamento correto D10/F19); DM vê offline brevemente; reconexão padrão (<45s via `docs/spec-resilient-reconnection.md §3`) |

**Decisão Quinn:** parity guest NÃO exige turn-safety idêntico — guest não tem DM externo nem heartbeat real. No guest, o único requisito é: modal aberto não trava botões de ação da UI. Se o player clica "End Turn" por trás do modal (via keyboard), passa turno normal. Essa parity é cosmética (CLAUDE.md Combat Parity Rule — "Realtime/broadcast features → Aplicar em Anônimo + Autenticado. Guest não tem realtime").

**ACs (reformuladas, testáveis):**
- [ ] AuthModal aberto NÃO chama `clearInterval` do heartbeat em `PlayerJoinClient.tsx:1807-1809`
- [ ] Broadcast `player:idle` com payload `{ reason: "authenticating" }` emitido ao abrir AuthModal
- [ ] Broadcast `player:active` emitido ao fechar AuthModal (sucesso ou cancel)
- [ ] DM view (`PlayersOnlinePanel`) exibe badge visível `conversion.dm_badge.authenticating` quando recebe `player:idle` com reason `authenticating`
- [ ] Listeners DM que ignoram `payload.reason` (casos não-modificados) continuam tratando `player:idle` como idle — no regression
- [ ] Toast `conversion.turn_safety_toast.combat_started` exibido se `active` vira `true` com AuthModal aberto (F16)
- [ ] Toast `conversion.turn_safety_toast.your_turn` exibido se `combat:turn_advance` indica turn do player com AuthModal aberto (F16)
- [ ] Se DM distribui turno durante modal, player NÃO executa automaticamente (ação não garantida, liveness sim — D10)
- [ ] Guest: modal aberto não bloqueia botões de ação (parity cosmético, sem realtime)
- [ ] OAuth redirect: heartbeat pausa durante tab hidden — ESPERADO, validado por teste (F19/D10)
- [ ] Quinn executa turn-safety test plan ANTES do merge (requisito não-negociável, gate documentado em "Process Gates")

**Testing contract (03-F):**
- Unit jest: heartbeat timer não é limpo quando modal state `open: true` (apenas quando `visibilityState === "hidden"`)
- Integration Supabase local: broadcast chain (player emit `idle+reason` → DM listener → badge render)
- E2E Playwright `turn-safety.spec.ts`: 2 browsers (DM + player); player abre modal; DM inicia combate; validar badge "cadastrando" visível; DM avança turno → toast "seu turno"; player fecha modal; validar UI refletindo turno atual
- Quinn test plan separado (documento adicional — bloqueia merge): 5 cenários críticos listados na tabela acima

---

### Story 03-G — Analytics dashboard integration (Área 7)

**Goal:** integrar os eventos `conversion:*` no `MetricsDashboard` **existente** (`components/admin/MetricsDashboard.tsx`). NÃO criar rota nova `/app/admin/conversion-funnel`.

**F20 — Aggregation path decidido: nova RPC `admin_conversion_funnel` (mesmo padrão de `admin_guest_funnel`).**

Arquitetura existente (confirmada):
- `app/api/admin/metrics/route.ts` chama RPC `admin_event_funnel`, `admin_top_events`, `admin_guest_funnel`, `admin_combat_stats` via `Promise.all` (linhas 52-61)
- Tabela base: `analytics_events` (verificado em `trigger/analytics-aggregation.ts`)

Decisão: replicar pattern de `admin_guest_funnel` criando **nova RPC `admin_conversion_funnel`** que filtra `analytics_events` por `event_type LIKE 'conversion:%'` com janela de 30 dias. Vantagens: (a) isolamento (não polui agregações existentes); (b) agregação em SQL (indexada) — mais rápida que filter client-side; (c) padrão já familiar ao time.

**Arquivos:**
- `supabase/migrations/146_admin_conversion_funnel.sql` — **CRIAR** (nova RPC; numeração após última migration)
- `app/api/admin/metrics/route.ts` — **MODIFICAR** (adicionar chamada RPC `admin_conversion_funnel` ao `Promise.all`; adicionar `conversion_funnel: conversionFunnelResult.data ?? []` ao response)
- `components/admin/MetricsDashboard.tsx` — **MODIFICAR** (adicionar `CONVERSION_LABELS`; adicionar prop `conversion_funnel: EventCount[]` ao type `Metrics`; adicionar render de nova seção seguindo padrão de `top_events`/`guest_funnel`)

**Conteúdo da migration (esqueleto):**

```sql
-- migration 146: admin_conversion_funnel RPC
CREATE OR REPLACE FUNCTION admin_conversion_funnel(since TIMESTAMPTZ)
RETURNS TABLE(event_name TEXT, event_count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT event_type AS event_name, COUNT(*)::BIGINT AS event_count
  FROM analytics_events
  WHERE event_type LIKE 'conversion:%'
    AND created_at >= since
  GROUP BY event_type
  ORDER BY event_count DESC;
$$;

GRANT EXECUTE ON FUNCTION admin_conversion_funnel(TIMESTAMPTZ) TO authenticated;
-- Route handler já verifica is_admin antes de chamar; RPC é defesa secundária
```

**Integração client:**

```typescript
const CONVERSION_LABELS: Record<string, string> = {
  "conversion:cta_shown": "CTA Exibido",
  "conversion:cta_clicked": "CTA Clicado",
  "conversion:cta_dismissed": "CTA Dispensado",
  "conversion:modal_opened": "Modal Aberto",
  "conversion:completed": "Conversão Concluída",
  "conversion:failed": "Conversão Falhou",
};

// Type Metrics ganha campo:
interface Metrics {
  // ... existente
  conversion_funnel: EventCount[];  // NOVO
}

// Render: nova <SectionTitle>Funil de Conversão</SectionTitle> após guest_funnel
```

**F26 — "MetricsDashboard é único dashboard admin":** confirmado (glob `app/app/admin/**`), é único. Movido de "Assumptions" para "Pré-condições verificadas" (abaixo).

**ACs:**
- [ ] Nova migration 146 aplica sem erro em supabase local
- [ ] RPC `admin_conversion_funnel` retorna 6 event_names quando dados existem
- [ ] Seção nova renderiza no dashboard com labels PT-BR
- [ ] Auth admin-only preservado (rota `/app/admin/metrics` já tem proteção via `verifyAdmin()` em linhas 6-13; não introduzir nova)
- [ ] CLAUDE.md SEO: `/app/admin/*` já é `noindex, nofollow` — nenhuma rota pública criada
- [ ] Parity: `MetricsDashboard` continua funcional para DMs que só querem ver funil legado (backward compat — `conversion_funnel: []` se RPC retorna vazio)
- [ ] `tsc --noEmit` limpo

**Testing contract (03-G):**
- RTL: render `MetricsDashboard` com mock `Metrics` incluindo `conversion_funnel` → valida labels
- Integração backend: smoke test da RPC com dados seed — query agrega corretamente
- Smoke manual: acessar dashboard em staging após evento real

---

### Story 03-H — Suite E2E Playwright

**Goal:** cobertura end-to-end dos 3 momentos + turn safety + dismissal.

**Arquivos:**
- `e2e/conversion/waiting-room-signup.spec.ts` — **CRIAR** (Área 1)
- `e2e/conversion/recap-anon-signup.spec.ts` — **CRIAR** (Área 2)
- `e2e/conversion/recap-guest-signup-migrate.spec.ts` — **CRIAR** (Área 3)
- `e2e/conversion/turn-safety.spec.ts` — **CRIAR** (Área 4, Quinn obrigatório)
- `e2e/conversion/dismissal-memory.spec.ts` — **CRIAR** (Área 6)

**Specs mínimas:**

1. **waiting-room-signup** — anon abre `/join/[token]`, vê card, clica "Criar minha conta", completa signup no AuthModal, validar `upgradePlayerIdentity` executou, card desaparece, combate funciona
2. **recap-anon-signup** — anon joga combate até o fim, recap aparece com CTA + botão "Salvar Combate" visível (F6), vê card de conversão com nome do personagem, clica "Salvar e criar conta", completa, validar dashboard mostra personagem com campaign_id vinculada
3. **recap-guest-signup-migrate** — guest em `/try` joga combate com 2 players no snapshot (cobre F7), recap, picker aparece, seleciona Thorin, AuthModal signup, `migrateGuestCharacterToAuth` executou, `/app/dashboard/characters` mostra Thorin como default, segundo player continua no snapshot guest
4. **turn-safety** — 2 browsers; DM inicia sessão; player anon abre AuthModal no waiting room; DM inicia combate (toast `combat_started` visível no player); DM avança turno para o player (toast `your_turn` visível); validar badge "cadastrando" no DM view; player completa signup; player vê turno atual; sem "lost turn" banner
5. **dismissal-memory** — player rejeita 3x na mesma campanha; validar 4ª visita não exibe CTA (cap); mudar para outra campanha mock; validar CTA volta; avançar mock time 90+ dias; validar TTL reset

**ACs:**
- [ ] 5 specs acima compilam e passam em CI
- [ ] Cobertura CLAUDE.md Combat Parity: specs cobrem guest (spec 3) + anon (specs 1, 2, 4). Auth não tem CTA a testar
- [ ] Cobertura CLAUDE.md Resilient Reconnection: spec 4 implicitamente testa que session_token_id sobrevive upgrade
- [ ] Nenhum spec depende de dados seed manual — tudo criado via test fixtures/API

---

## Dependências de outros épicos

### Entrada (bloqueantes)

| Épico | O que consome |
|---|---|
| 01 — Identity Foundation | `POST /api/player-identity/upgrade`, `POST /api/player-identity/migrate-guest-character`, `users.default_character_id` |
| 02 — Player Dashboard & Invite Inteligente | `AuthModal` (com `upgradeContext` + `onSuccess` callback; **contrato não é alterado** — F10/D3b), `MetricsDashboard` estável |

### Saída (o que este épico desbloqueia)
- **Épico 04 — Player-as-DM Upsell** — reusa `MetricsDashboard` com eventos `conversion:*` como baseline do funil player→DM

---

## Arquivos Chave para Criar/Modificar

| Arquivo | Ação | Story |
|---|---|---|
| `app/api/track/route.ts` (linhas 7-131) | **MODIFICAR** — adicionar 6 eventos `conversion:*` ao Set ALLOWED_EVENTS (F1) | 03-A |
| `components/conversion/dismissal-store.ts` | **CRIAR** | 03-A |
| `lib/conversion/analytics.ts` | **CRIAR** | 03-A |
| `tests/conversion/dismissal-store.test.ts` | **CRIAR** | 03-A |
| `tests/conversion/analytics.test.ts` | **CRIAR** | 03-A |
| `messages/pt-BR.json` | **MODIFICAR** — sub-objeto `conversion` | 03-B |
| `messages/en.json` | **MODIFICAR** — sub-objeto `conversion` | 03-B |
| `docs/patterns-i18n-rich-text.md` | **CRIAR** — pattern doc (F13) | 03-B |
| `components/conversion/WaitingRoomSignupCTA.tsx` | **CRIAR** | 03-C |
| `components/player/PlayerJoinClient.tsx` | **MODIFICAR** aditivo (render CTA usando `active` state existente; broadcasts `player:idle/active` com reason; listener toast) | 03-C, 03-D, 03-F |
| `tests/conversion/waiting-room-cta.test.tsx` | **CRIAR** | 03-C |
| `components/conversion/RecapCtaCard.tsx` | **CRIAR** — trata anon + guest | 03-D, 03-E |
| `components/combat/CombatRecap.tsx` (15-36) | **MODIFICAR** — adicionar `saveSignupContext?` prop (non-breaking) | 03-D |
| `components/combat/RecapActions.tsx` (13-32, 211) | **MODIFICAR** — forward `saveSignupContext?` + helper `shouldShowSaveCombat` (F6) | 03-D |
| `tests/conversion/recap-cta-anon.test.tsx` | **CRIAR** | 03-D |
| `tests/conversion/recap-actions-save-combat.test.tsx` | **CRIAR** — regressão F6 | 03-D |
| `components/guest/GuestCombatClient.tsx` (1794-1803, 2214) | **MODIFICAR** — passar `saveSignupContext={{ mode: "guest", ... }}`; preservar `handleSaveAndSignup` como fallback legacy (F15) | 03-E |
| `components/guest/GuestUpsellModal.tsx` | **MANTER** (comentário `@deprecated` + issue follow-up) | 03-E |
| `tests/conversion/recap-cta-guest.test.tsx` | **CRIAR** | 03-E |
| `components/combat-session/CombatSessionClient.tsx` (1185-1187) | **MODIFICAR** — `player:idle` handler lê `payload.reason` (F3) | 03-F |
| `components/combat-session/PlayersOnlinePanel.tsx` (tipos + render) | **MODIFICAR** — novo status `"authenticating"` + badge | 03-F |
| `tests/conversion/turn-safety.test.tsx` | **CRIAR** | 03-F |
| `supabase/migrations/146_admin_conversion_funnel.sql` | **CRIAR** — RPC (F20) | 03-G |
| `app/api/admin/metrics/route.ts` (52-88) | **MODIFICAR** — chamar RPC + retornar `conversion_funnel` | 03-G |
| `components/admin/MetricsDashboard.tsx` (9-20, 44-53) | **MODIFICAR** — `CONVERSION_LABELS` + tipo + seção | 03-G |
| `e2e/conversion/*.spec.ts` (5 specs) | **CRIAR** | 03-H |

**F4/F14 — Arquivos REMOVIDOS de v2 (eram fantasmas, não existem no filesystem):**
- ~~`components/dm/PlayerPresenceIndicator.tsx`~~ — diretório `components/dm/` não existe
- ~~`components/player/combat/RecapActions.tsx`~~ — diretório `components/player/combat/` não existe. Real path é apenas `components/combat/RecapActions.tsx`
- ~~`lib/conversion/use-encounter-activation.ts`~~ — hook inventado; D9/F2 eliminou a necessidade

---

## Critérios de Aceitação (consolidação cross-story)

### Integração
- [ ] `tsc --noEmit` limpo após todas as stories
- [ ] `npm test -- tests/conversion/` passa (F22: sem `rtk` wrapper em AC de CI)
- [ ] CLAUDE.md **Combat Parity Rule**: testado em guest (`/try`), anon (`/join`), auth (`/invite`). Auth não vê CTAs — validado
- [ ] CLAUDE.md **Resilient Reconnection Rule**: abrir AuthModal NÃO invalida `session_token_id`; heartbeat continua EXCETO quando tab hidden (D10/F19)
- [ ] CLAUDE.md **SRD Compliance**: não aplicável — copy é UX/marketing
- [ ] CLAUDE.md **SEO Canonical**: nenhuma rota pública nova; `/app/admin/*` segue `noindex, nofollow`

### Funcional
- [ ] Card waiting room só aparece em anon + `active === false` + `shouldShowCta` true (D9/F2)
- [ ] RecapCtaCard anon abre AuthModal com `upgradeContext`; guest abre AuthModal signup + migrate local (D3b/F10)
- [ ] CombatRecap mantém assinatura `onSaveAndSignup: () => void` (D4) — callers existentes não quebram
- [ ] "Salvar Combate" continua visível para auth/DM e anon com saveSignupContext (F6)
- [ ] Dismissal store usa chave `pocketdm_conversion_dismissal_v1` (D6); guest usa sentinel `"__guest__"`; TTL 90d; cap 3 per-campaign
- [ ] Analytics events usam namespace colon-style (`conversion:cta_shown`, etc. — D8) **e estão allowlisted em `/api/track`** (F1)
- [ ] Turn-safety garante liveness (heartbeat + badge "cadastrando" via `player:idle`+reason — F3), NÃO ação automática (D10)
- [ ] Guest multi-player: picker mostra quando N>=2 (F7)

---

## Process Gates (não-AC técnicos, mas bloqueiam merge)

- **F11 — Paige peer review (Story 03-B):** CI exige ou (a) comentário `/approved` da Paige no PR (parsed por script), OU (b) label `approved-by-paige` aplicada manualmente. Se nenhum existir, CI falha. Script de check reside em `.github/workflows/require-paige-review.yml` (criar se não existir — trabalho pequeno, ≤30min).
- **Story 03-F — Quinn turn-safety test plan:** Documento separado em `docs/testing/turn-safety-test-plan.md`, 5 cenários executados manualmente por Quinn antes de merge. PR referencia esse plano em descrição.

---

## Pré-condições Verificadas (F26 — movido de Assumptions)

- `MetricsDashboard` é o único dashboard admin de métricas — confirmado via `glob app/app/admin/**` + `components/admin/`. Sem rota paralela já criada.
- `ALLOWED_EVENTS` em `/api/track/route.ts` é um Set com enforcement hard (retorna 400 para eventos fora) — confirmado linhas 7-131, 187-189.
- `combat:started` evento já existe (não é vaporware) — disparado em `lib/supabase/session.ts:34`, allowlisted em `/api/track/route.ts:20` — F2.
- `PlayersOnlinePanel` é a UI real de presença do DM — confirmado em `components/combat-session/PlayersOnlinePanel.tsx` + integração em `CombatSessionClient.tsx:1619-1626`. Não existe `components/dm/*` — F4.
- `RecapActions` está apenas em `components/combat/RecapActions.tsx` — diretório `components/player/combat/` não existe — F14.
- `t.rich()` ainda não é usado no projeto — grep retornou 0 matches. Este épico introduz o pattern — F13.
- Heartbeat pausa em `visibilityState === "hidden"` — `PlayerJoinClient.tsx:1794`. Comportamento OAuth é esperado, não bug — F19.

---

## Assumptions & Risks

### Assumptions
- `AuthModal` do Épico 02 está funcional em staging antes de Story 03-C começar (dependência hard)
- `AuthModal.onSuccess` retorna `{ userId, isNewAccount, upgraded }` como documentado em Epic 02 Área 3
- `migrateGuestCharacterToAuth` já validou `is_player === true` internamente (confirmado em `lib/supabase/character-portability.ts:41-43`)

### Risks

| Risco | Severidade | Mitigação |
|---|---|---|
| Turn-safety E2E revela race condition entre heartbeat + broadcast + DM timer | **Alta** | Quinn test plan antes de merge; 03-F bloqueia até 5 cenários passarem |
| Modificar `PlayerJoinClient.tsx` (3043 linhas) gera regressão silenciosa | **Alta** | Mudanças puramente aditivas (condicional JSX, novos emit broadcast, listener toast) — sem refactor; parity E2E obrigatório (03-H) |
| Dependência dura de Épico 02 `AuthModal` atrasa este épico | **Alta** | Stories 03-A, 03-B, 03-G podem rodar em paralelo sem Épico 02; 03-C/D/E são bloqueados |
| Guest multi-player picker UX confunde usuário casual | Média | Default pre-selected é "primeiro player" ordenado por HP; picker só abre se N>=2 + copy explicativa (F7) |
| CTA spam frustra player | Média | Dismissal store + cap de 3 per-campaign + TTL 90d |
| Copy emocional soa marketing | Média | Paige review obrigatório (03-B process gate) + glossário ubíquo grep (F25) |
| Modificação de `player:idle` handler em `CombatSessionClient.tsx` quebra listeners pré-existentes | Média | Handler reescrito faz fallback para `"idle"` se `reason` ausente → comportamento idêntico ao atual para callers não-modificados (F3) |
| `saveGuestCombatSnapshot` chamado antes de `AuthModal` deixa state stale se user cancelar | Baixa | Aceitável — snapshot é safety net; `onClose` do AuthModal não altera snapshot; próxima abertura re-lê store fresh |
| i18n EN não pronto no launch | Baixa | Requisito v1 (ver D7); feature flag inviável para copy — bloqueia merge de 03-B |
| Migration 146 entra em conflito com Épico 04 (que também cria migrations) | Média | Comunicar com John (owner Épico 04) antes de 03-G; se Epic 04 já ocupou o número, incrementar |

---

## Regras Imutáveis (CLAUDE.md)

- **Combat Parity Rule:** 3 modos cobertos. Guest tem CTA de migração no recap (`/try`) mas SEM realtime; anon tem CTA em waiting room E recap (`/join`) com broadcasts; auth não vê CTA. Turn-safety em anon (com `player:idle` broadcast reason=authenticating); parity cosmético em guest (modal não trava UI, sem broadcast).
- **Resilient Reconnection Rule:** abrir `AuthModal` **nunca** invalida `session_token_id` em storage. Heartbeat segue (exceto tab hidden — D10/F19). Spec §3 fallback chain cobre OAuth redirect — este épico só consome, não modifica.
- **SRD Compliance:** não aplicável — copy é UX/marketing (livre).
- **SEO Canonical:** nenhuma rota pública nova; dashboard admin em `/app/admin/*` é `noindex, nofollow`.

---

## F21 — Migração de chaves legacy

`guest-banner-dismissed` (chave do landing banner em `components/guest/GuestBanner.tsx:8`) e `taverna_anon_id` (legacy analytics ID em `lib/analytics/track.ts:11`) são **fluxos independentes** do conversion dismissal. Decisão v3:

- **Sem migração:** `pocketdm_conversion_dismissal_v1` começa do zero. Users que dispensaram o banner de landing page não têm dismissal de conversão carregado.
- **Rationale:** os contextos são diferentes (landing banner ≠ recap CTA ≠ waiting room CTA). Carregar dismissal de um contexto pra outro confunde analytics.
- **Documentação:** comentário em `dismissal-store.ts` explica que é intencional. Não é oportunidade de bug, é decisão de design.

## F27 — Nomenclatura `dismissalsByCampaign` vs `__guest__` sentinel

V2 usava `dismissedCampaigns: string[]` com sentinel `"__guest__"` — confuso porque "Campaigns" não cobre guest. V3 renomeia para `dismissalsByCampaign: Record<string, ...>` com o sentinel `"__guest__"` mantido como chave especial. Nomenclatura sugestiva: se Sally ou Paige quiserem renomear para `dismissalsByContext` no PR de 03-A, é livre — não afeta API externa. Flag: opcional; não bloqueante.

---

## Estimativa de Esforço

| Story | Complexidade | Esforço |
|---|---|---|
| 03-A — Dismissal + analytics helpers + ALLOWED_EVENTS | Baixa | 1-2 dias |
| 03-B — Copy & i18n + pattern doc | Baixa | 1 dia |
| 03-C — Waiting room CTA + integração `active` state | Média (reduzida de Alta em v2 — sem hook novo) | 3-4 dias |
| 03-D — Recap CTA anon + CombatRecap non-breaking + F6 regressão | Média | 2-3 dias |
| 03-E — Recap CTA guest + migrate + multi-player picker | Média | 2-3 dias |
| 03-F — Turn-safety (reuso `player:idle` — simplificado) | **Alta** (Quinn rigoroso) | 3-4 dias |
| 03-G — MetricsDashboard + RPC migration | Baixa | 1-2 dias |
| 03-H — E2E Playwright (5 specs) | Média | 3-4 dias |
| Code review + polish + a11y | Média | 2-3 dias |
| Buffer de imprevistos | — | 2 dias |
| **Total estimado** | | **20-30 dias úteis (~2-3 sprints)** |

---

## Changelog

### v3 — 2026-04-19 (pós adversarial review #2)

v2 passou por review adversarial que identificou 6🔴 + 8🟠 + 7🟡 + 8🟢 issues. v3 os endereça:

**🔴 Críticos resolvidos:**
- **F1 — ALLOWED_EVENTS enforcement:** v2 afirmava falsamente que era "naming convention". Real: `Set` com HTTP 400 enforcement em `app/api/track/route.ts:187-189`. Story 03-A ganhou task explícita de modificar linhas 7-131 para adicionar 6 eventos `conversion:*`. AC e tabela de arquivos atualizadas. Assumption falsa removida.
- **F2 — `combat:started` não era vaporware:** Real: existe em `lib/supabase/session.ts:34` + allowlist + `MetricsDashboard:47`. V2 inventou um hook `useEncounterActivation` desnecessário. V3 (D9): Story 03-C consome `active` state que `PlayerJoinClient` já possui via `session:state_sync` handler (linhas 1030-1055). Sem hook novo, sem subscription nova.
- **F3 — `player:status-update` inventado:** Listener real em `CombatSessionClient.tsx:1182-1193` só aceita `player:disconnecting/idle/active/joined`. V3: **Opção (b) — reuso de `player:idle` com `payload.reason: "authenticating"`** (simpler, less surface). Handler modificado para ler reason. `PlayersOnlinePanel` ganha status `"authenticating"`. Rationale documentado.
- **F4 — Phantom files removidos:** `components/dm/PlayerPresenceIndicator.tsx` (diretório não existe) e `components/player/combat/RecapActions.tsx` (diretório não existe) eliminados. Real DM presence UI é `components/combat-session/PlayersOnlinePanel.tsx`.
- **F5 — Sprint plan delta:** header aponta que `SPRINT-PLAN-player-identity.md:115-118` (6-8d) é stale. Épico (10-14d Sprint 6 + 6-9d Sprint 7) é autoritativo. "Próximos Passos" #5 instrui Bob (SM) a atualizar sprint plan.
- **F6 — "Salvar Combate" regression:** `RecapActions.tsx:211` hoje usa `{!onSaveAndSignup && ...}`. V3 introduz helper `shouldShowSaveCombat(saveSignupContext, onSaveAndSignup)` com 5 casos; auth DM e anon-com-campaignId continuam vendo o botão. AC + teste regressão dedicado (`recap-actions-save-combat.test.tsx`).

**🟠 Altos resolvidos:**
- **F7 — Multi-player guest:** V2 usava `.find()` (retorna primeiro). V3 usa `.filter()` e introduz **picker inline** quando N>=2 players. Outros permanecem no snapshot. Analytics inclui `guestCombatantCount`.
- **F8/F9 — DismissalRecord schema não suportava per-campaign count:** V3 muda para `dismissalsByCampaign: Record<string, { count, lastDismissedAt }>`. Regra ordering documentada (cap > cooldown > TTL). 5 cenários ordenados em Story 03-A.
- **F10 — Cross-epic contract change silencioso:** V3 pin Opção B (local handling no `RecapCtaCard`, sem `guestMigrationContext` novo prop no AuthModal). Opção A "deferred pending Epic 02 contract amendment".
- **F11 — "Paige revisa" não era CI-testable:** demovido para Process Gates (separado de ACs). Artefato scriptável: comentário `/approved` parseado por CI OU label `approved-by-paige`.
- **F12 — i18n lint script inexistente:** V3 Opção B — drop do lint; snapshot tests + Paige review cobrem.
- **F13 — `t.rich()` primeiro uso:** reconhecido em D7 + snippet canônico + criação de `docs/patterns-i18n-rich-text.md` como artefato.
- **F14 — Phantom `components/player/combat/RecapActions.tsx`:** deletado. Real path único em `components/combat/RecapActions.tsx`.

**🟡 Médios resolvidos:**
- **F15 — Guest flow deprecation plan:** tabela explícita: `saveGuestCombatSnapshot` preservado como safety net; `/auth/sign-up?from=guest-combat` preservado como fallback; `guest:recap_save_signup` preservado como supplement; `GuestUpsellModal` flagado para deprecação em v4; fallback chain se AuthModal throw.
- **F16 — Toast `your_turn` binding:** trigger = `combat:turn_advance` broadcast com check `current_turn_combatant_id === player_combatant_id` quando AuthModal open. AC adicionada em Story 03-F.
- **F17 — hook filter:** eliminado junto com F2.
- **F18 — Dismissal TTL:** 90 dias, podado na leitura. Entry vira `{ count, lastDismissedAt }`.
- **F19 — Heartbeat-OAuth contradição:** D10 reescrita. Heartbeat pausa em tab hidden é comportamento correto (alinhado com CLAUDE.md anti-pattern #4, não em conflito). OAuth redirect cai na cadeia de fallbacks do spec-resilient-reconnection §3.
- **F20 — Aggregation path:** decisão explícita = nova RPC `admin_conversion_funnel` (mesmo pattern de `admin_guest_funnel`). Migration 146 criada. Esqueleto SQL incluído.
- **F21 — Legacy dismissal:** no-migration documentado. `guest-banner-dismissed` e `taverna_anon_id` são fluxos independentes.

**🟢 Baixos resolvidos:**
- **F22 — `rtk npm test`:** substituído por `npm test` em ACs executados por CI.
- **F23 — Line-range precisões:** CombatRecap 15-36 (não 15-38); RecapActions 13-32 (não 13-34); `lib/analytics/track.ts` trackEvent 61-101.
- **F24 — Export `KEY`:** `export const KEY = "pocketdm_conversion_dismissal_v1"` para uso em testes.
- **F25 — Glossário citado:** Story 03-B AC cita `docs/glossario-ubiquo.md` com termos proibidos grep.
- **F26 — "MetricsDashboard único":** verified fact, movido para "Pré-condições Verificadas".
- **F27 — Nomenclatura `dismissalsByCampaign`:** renomeada. Flag não-bloqueante.
- **F28 (implícito) — `t.rich()` snippet canônico:** incluído em D7 + doc dedicado.

### v2 — 2026-04-19 (pós code review v1)

**Críticos (🔴) resolvidos:**
- i18n stack corrigido (de `next-i18next` + `public/locales/*` para `next-intl` + `messages/{en,pt-BR}.json` flat)
- `CombatRecap.onSaveAndSignup` preservado (assinatura `() => void`)
- `guestCharacter` shape real (`Combatant` de `lib/types/combat.ts`)

**Altos (🟠) resolvidos:**
- Turn-safety reformulada — D10 distingue liveness vs ação
- Dismissal namespace `pocketdm_conversion_dismissal_v1`
- Analytics colon-namespaced
- Estimativa 12-16 → 20-30 dias

**Médios (🟡) resolvidos:**
- `combat:started` broadcast vaporware (removido — mas v2 inventou `useEncounterActivation`, corrigido em v3/F2)
- Guest vs anon separados (D3)
- Guest sem realtime (parity cosmético)
- Dismissal sentinel `"__guest__"` para guest
- Admin dashboard integrado

**Baixos (🟢) resolvidos:**
- Story 03-A sem dependências
- `t.rich()` para markdown
- "Paige revisa" → AC concreto (ainda não scriptável — endereçado em v3/F11)

### v1 — 2026-04-19 (original, pré-review)

Primeira escrita. Problemas: i18n stack errado, breaking change em CombatRecap, guest character shape inventado, turn-safety vago, analytics naming inconsistente, estimativa 2x baixa, broadcast vaporware, dashboard duplicado. Fonte: [`docs/HANDOFF-player-identity-session-2.md`](../../HANDOFF-player-identity-session-2.md) §5.

---

## Próximos Passos

1. Aguardar Épicos 01 + 02 em staging (Stories 01-E, 02-C, 02-D como mínimo)
2. Story 03-A e 03-B podem começar AGORA (sem bloqueio) — 03-A inclui modificação de `app/api/track/route.ts` que é self-contained
3. Sally produz mockups Figma dos 3 CTAs (waiting room card, recap card anon, recap card guest) + badge "cadastrando" no `PlayersOnlinePanel` + picker guest multi-player (F7)
4. Quinn produz turn-safety test plan detalhado (`docs/testing/turn-safety-test-plan.md`) antes de 03-F entrar em execução
5. **Bob (SM) atualiza `docs/SPRINT-PLAN-player-identity.md` linhas 115-118 (F5):** Sprint 6 passa de 6-8d para 10-14d reais; Sprint 7 ganha linhas para 03-G (1-2d) + 03-H (3-4d) = 4-6d
6. Story 03-A quebra em tickets conforme DAG: 03-A e 03-B primeiro, 03-C/D/E/F/G em paralelo após 01+02 em staging, 03-H ao final
7. John valida métricas esperadas para o funil (taxa de conversão anon→auth esperada por momento — input pro A/B test pós-lançamento) — aguardar RPC `admin_conversion_funnel` pronta (03-G) para baseline
