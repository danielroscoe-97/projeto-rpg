# EPIC 03: Momentos de Conversão

> **Status:** Pronto para revisão
> **Prioridade:** Alta (captura o player no pico emocional — H2)
> **Origem:** Party Mode 2026-04-19
> **Parent epic:** `docs/EPIC-player-identity-continuity.md` (a ser criado)
> **Sprint estimate:** ~1.5 sprints (7-10 dias úteis)
> **Release strategy:** Big-bang (junto com Épicos 01, 02, 04)
> **Depende de:** Épico 01 (bloqueante), Épico 02 (bloqueante — consome `AuthModal`)
> **Agente executor:** Sally (UX) lidera; Paige (Tech Writer) define copy; Quinn (QA) valida turn-safety

---

## Contexto do Épico Mãe

Ver [`docs/EPIC-player-identity-continuity.md`](../../EPIC-player-identity-continuity.md) (a ser criado) para visão completa. Este épico cobre **H2 (retenção/conversão)** ancorado em **H3 (continuidade)** — captura o player no momento de maior vínculo emocional (pré-combate ansioso ou pós-combate vitorioso) e converte em conta preservando personagem.

---

## Dependências de Entrada

Este épico **NÃO PODE COMEÇAR** antes destas primitives estarem em staging:

### Do Épico 01
- `upgradePlayerIdentity()` — consumido em ambos os CTAs (waiting room e recap) para anon→auth
- `migrateGuestCharacterToAuth()` — consumido no recap do guest (cria personagem a partir do snapshot)
- `users.default_character_id` — setado após migração de guest character

### Do Épico 02
- `AuthModal` com `upgradeContext` — componente principal consumido
- Copy de preamble (ex: "Dani te convidou pra Phandelver")

---

## Problema

O player vive dois momentos de pico emocional durante uma sessão, e **nenhum dos dois é capturado hoje:**

### Momento 1 — Antes do combate (ansiedade, expectativa)
Player anon entra via `/join/[token]`, registra nome, escolhe personagem, e espera o DM iniciar. Esse tempo de espera (30s a 10min) é hoje **tela ociosa**. Ponto perfeito para oferecer "Criar conta pra não perder seu progresso" — mas não existe esse CTA.

### Momento 2 — Depois do combate (euforia, identificação)
Player acabou de viver uma aventura com personagem que nomeou, viu recap cinematográfico em `CombatRecap.tsx` com prêmios e narrativa. O componente **já tem callbacks** `onSaveAndSignup` e `onJoinCampaign` — mas consumo é parcial/incompleto. Player fecha a tab e a experiência acaba.

### Momento 3 — Guest (no `/try`)
Guest joga combate solo sem conta. `GuestUpsellModal` existe mas é raso — não migra o personagem da sessão. Player "Maria" cria conta e perde Thorin que criou pra testar.

Resultado: uma sessão de combate que era oportunidade de conversão vira tela branca + esquecimento.

---

## Estado Atual (verificado 2026-04-19)

### O que existe

| Componente | Onde | O que faz | Gap |
|---|---|---|---|
| `CombatRecap` | `components/combat/CombatRecap.tsx` (~80+ linhas visíveis) | Modal full-screen com 2 fases (awards → details); tem `onSaveAndSignup`, `onJoinCampaign`, `onRate` | Callbacks não ligados a `upgradePlayerIdentity`; copy genérica |
| `GuestUpsellModal` | `components/guest/GuestUpsellModal.tsx` (inferido de `GuestCombatClient`) | Modal de signup para guest | Signup plain (não `migrateGuestCharacterToAuth`); não personaliza com nome do personagem |
| `GuestExpiryModal` | inferido | Modal quando sessão guest expira (4h) | Momento bom, mas perdemos contexto do personagem |
| Waiting room (implícito) | `PlayerJoinClient.tsx` (~3043 linhas) | Antes de combate começar, player vê lobby | Sem CTA de conta |
| `PlayerHqTourProvider` | `components/player-hq/*` (referenciado em standalone epic) | Tour para player HQ | Não cobre conversão |

### O que NÃO existe

| Gap | Impacto |
|---|---|
| CTA de login/signup no waiting room do `/join` | H2 perde momento de maior tempo ocioso |
| Integração do `onSaveAndSignup` com `upgradePlayerIdentity` + `migrateGuestCharacterToAuth` | Callback dispara mas lógica de salvamento é vazia |
| Copy contextual com nome do personagem ("Salve **Thorin**") | Conversão fria sem gancho emocional |
| **Turn safety** durante modal aberto (crítico, flagged Quinn) | Player digitando senha perde turno? |
| Memória de dismissal (player rejeitou CTA 3x, não insistir) | Spam do mesmo prompt frustra |
| Tracking de eventos de conversão (funnel) | Sem dados não conseguimos iterar |

---

## Decisões de Arquitetura

### D1 — CTA **nunca** bloqueia gameplay

Regra ouro: em NENHUM momento um CTA de conversão pode impedir o player de jogar ou fazê-lo perder turno. Vale pra waiting room, vale pro recap, vale especialmente se combate já começou.

### D2 — Preservar personagem é **pre-requisito** pra qualquer CTA

Pedir "crie conta" sem prometer que Thorin sobrevive mata conversão. Todo CTA mostra: "Salvar **Thorin** na sua conta". Para anon, `upgradePlayerIdentity` preserva o `player_character` já vinculado. Para guest, `migrateGuestCharacterToAuth` cria a partir do snapshot.

### D3 — Dismissal tem memória local (não persiste cross-device)

Se player rejeita CTA 3x: localStorage grava `conversion-cta-dismissed-count` e `conversion-cta-last-dismissed-at`. Próximo CTA só aparece se:
- Passaram 7 dias OU
- Nova campanha (novo `campaign_id` no contexto)

### D4 — Copy é i18n desde v1

`document_output_language = Brazilian Portuguese`; suporte multilíngue pro recap/waiting room vem via `next-i18next` ou sistema existente. Copy key usa nome do personagem como variável (`{character_name}`).

### D5 — Tracking de funil obrigatório

Eventos mínimos: `conversion_cta_shown`, `conversion_cta_dismissed`, `conversion_cta_clicked`, `conversion_completed`, `conversion_failed`. Rota pra stack de analytics existente (ver pesquisa do Épico 04 pra confirmar stack).

---

## Solução Proposta

### Área 1 — Waiting Room CTA (anon em `/join`)

**Trigger:** player anon (`session_tokens.user_id IS NULL`) está em `/join/[token]` E sessão ainda não iniciou (combate não ativo).

**Componente novo:** `components/conversion/WaitingRoomSignupCTA.tsx`

```typescript
type WaitingRoomSignupCTAProps = {
  sessionToken: SessionToken;
  playerName: string;      // do session_tokens.player_name
  characterName?: string;  // do player_characters se já claimed
  campaignName: string;    // do campaigns.name via join
  onOpenAuthModal: () => void;  // abre AuthModal em signup + upgradeContext
  onDismiss: () => void;
};
```

**Comportamento:**
- Renderizado como **card inline** (não modal) acima ou abaixo do lobby list — nunca overlay
- Copy: "Quer salvar **{characterName}** e voltar mais rápido na próxima sessão? [Criar conta em 30s]"
- Se `characterName` ausente: "Salve seu progresso e volte mais rápido na próxima sessão"
- Botão secundário "Agora não" → dismiss + memória (D3)
- Some automaticamente quando combate inicia (evento `combat:started`)

**Integração:**
- Injetado em `PlayerJoinClient.tsx` (modificação aditiva, não refatoração) atrás de flag `state === "waiting-for-combat"` (detectar via ausência de `encounters.is_active = true`)
- `onOpenAuthModal` → abre `AuthModal` (Épico 02) com `upgradeContext = { sessionTokenId, campaignId, guestCharacter: undefined }`

---

### Área 2 — Recap CTA pós-combate (anon)

**Trigger:** `CombatRecap` renderiza fase `details` (última fase) E player é anon (session_token sem user_id).

**Modificação em** `components/combat/CombatRecap.tsx`:
- Tab/fase nova ou card final: "Salvar **{characterName}** e levar na próxima aventura"
- Botão primário "Criar minha conta" → abre `AuthModal` com `upgradeContext` completo
- Botão secundário "Fechar" → dismiss + memória (D3)

**Prop change:**

```typescript
// Antes (existente):
onSaveAndSignup?: () => void;

// Depois (expandido para passar contexto):
onSaveAndSignup?: (context: {
  sessionTokenId: string;
  characterId: string | null;
  characterName: string | null;
  campaignId: string;
}) => void;
```

`PlayerJoinClient` passa função que abre `AuthModal` com upgradeContext e o callback chama `upgradePlayerIdentity`.

---

### Área 3 — Recap CTA pós-combate (guest em `/try`)

**Trigger:** `GuestCombatClient` chegou no `CombatRecap`, player não tem conta, tem guest character no Zustand store.

**Modificação em** `components/guest/GuestCombatClient.tsx`:
- Passar `onSaveAndSignup` para `CombatRecap` que abre `AuthModal` com:

```typescript
upgradeContext = {
  sessionTokenId: undefined,   // guest não tem session_token
  campaignId: undefined,       // guest não está em campanha
  guestCharacter: useGuestCombatStore.getState().myCharacter  // snapshot
};
```

- `AuthModal` em `signup` mode (não upgrade): cria conta nova via `signUp` normal + em seguida chama `POST /api/player-identity/migrate-guest-character` com o snapshot
- Resultado: character novo em `player_characters` com `user_id = novaConta, campaign_id = NULL`, setado como `default_character_id`
- Copy: "Salvar **{characterName}** na minha conta"

**Decisão importante:** guest NÃO usa `upgradePlayerIdentity` — guest não tem anon session no Supabase (é localStorage puro). É signup fresh + migrate character.

---

### Área 4 — Turn Safety (requisito de Quinn)

**Problema:** player abre `AuthModal` no waiting room, começa digitando, DM inicia combate, DM distribui turnos, turno do player começa — player ainda digitando senha. **Não pode perder o turno.**

**Decisão:** modal fica aberto; combate roda "por baixo" (PlayerJoinClient mantém socket conectado); heartbeat continua; quando modal fecha (sucesso ou dismiss), player vê estado atualizado do combate — possivelmente já em seu turno.

**Implementação:**
- `AuthModal` **não trava heartbeat** — o component externo (`PlayerJoinClient`) segue enviando
- Listener em `PlayerJoinClient` detecta `combat:started` ou `turn:your-turn` E `AuthModal.open === true` → exibe toast discreto "Combate começou! Você pode continuar o cadastro — seu turno não será perdido"
- Se DM tenta pular turno do player (timeout): `heartbeat` + `last_seen_at` indicam player ativo → DM vê status "ainda presente"
- Se cadastro completa durante turno: `AuthModal.onSuccess` → upgrade → UI re-hidrata → player vê seu turno com countdown ainda rodando

**Regra CLAUDE.md (Combat Parity):** comportamento deve ser idêntico nos 3 modos. Guest em /try não tem DM externo, mas mesma lógica: modal não trava botões de ação; se player clica "End Turn" enquanto modal aberto, passa turno normal.

---

### Área 5 — Copy & i18n

**Responsabilidade:** Paige (Tech Writer) produz copy principal; integra com `next-i18next` ou sistema existente.

**Chaves propostas** (arquivo `public/locales/pt/conversion.json`):

```json
{
  "waiting_room": {
    "headline_with_char": "Quer salvar **{character_name}** e voltar mais rápido?",
    "headline_no_char": "Salve seu progresso pra voltar mais rápido",
    "body": "Em 30 segundos você cria sua conta e volta na próxima sessão com tudo pronto.",
    "cta_primary": "Criar minha conta",
    "cta_secondary": "Agora não"
  },
  "recap_anon": {
    "headline": "Parabéns, **{character_name}** sobreviveu!",
    "body": "Crie sua conta pra manter {character_name} e o histórico dessa aventura.",
    "cta_primary": "Salvar e criar conta",
    "cta_secondary": "Fechar"
  },
  "recap_guest": {
    "headline": "**{character_name}** merece ser salvo!",
    "body": "Sua aventura pode continuar. Crie sua conta e leve {character_name} pra próxima.",
    "cta_primary": "Salvar {character_name}",
    "cta_secondary": "Fechar"
  },
  "post_success": {
    "waiting_room": "Conta criada! Seu personagem está salvo. Continue jogando.",
    "recap": "Conta criada! {character_name} foi salvo na sua conta."
  }
}
```

**Regras de copy (estabelecidas com Paige):**
- Evitar vocabulário de marketing ("promoção", "oferta", "não perca")
- Focar em preservação de progresso (H3), não em features
- Sempre citar nome do personagem quando disponível (gancho emocional)
- Copy em EN-US feita em paralelo pra não atrasar lançamento internacional

**Correspondência com glossário ubíquo (Épico 01 Story 01-A):**
- "Salvar" = preservar personagem (não "converter", não "adotar")
- "Sua conta" = `auth.users` row do player
- "Aventura" = sessão de combate (ver `docs/glossario-ubiquo.md` — "combate" vs "sessão")

---

### Área 6 — Dismissal Memory

**Armazenamento:** localStorage (não sync cross-device por simplicidade; se player quer ser CTA'd de novo em outro device, ok).

**Chaves:**

```typescript
"conversion-cta-dismissal-v1": {
  totalDismissals: number;           // incrementa a cada dismiss
  lastDismissedAt: string;           // ISO
  dismissedCampaigns: string[];      // UUIDs onde player dismissou
  lastSeenCampaign: string | null;
}
```

**Regras de exibição do CTA:**

```
function shouldShowCta(context: {
  campaignId: string;
  momento: "waiting" | "recap";
}) {
  const record = localStorage["conversion-cta-dismissal-v1"];
  
  // Primeira vez: sempre mostra
  if (!record) return true;
  
  // Nova campanha: sempre mostra
  if (!record.dismissedCampaigns.includes(context.campaignId)) return true;
  
  // Mais de 7 dias desde último dismiss: mostra
  if (daysSince(record.lastDismissedAt) >= 7) return true;
  
  // Já dismissou 3+ vezes nessa campanha: não insiste
  if (record.totalDismissals >= 3) return false;
  
  // Default: mostra
  return true;
}
```

**Reset:** ao completar signup com sucesso, limpa o record (usuário convertido não precisa mais de CTA).

---

### Área 7 — Analytics / Tracking de Funil

**Eventos mínimos** (rota para stack existente — será detalhada após pesquisa do Épico 04):

| Evento | Payload | Momento |
|---|---|---|
| `conversion_cta_shown` | `{ momento, campaignId, hasCharacter, characterName }` | Quando CTA aparece (waiting room ou recap) |
| `conversion_cta_dismissed` | `{ momento, campaignId, dismissalCount }` | Clique em "Agora não" ou fechar |
| `conversion_cta_clicked` | `{ momento, campaignId }` | Clique em CTA primário → abre AuthModal |
| `conversion_completed` | `{ momento, campaignId, characterId, flow: "upgrade" \| "signup-and-migrate" }` | `upgradePlayerIdentity` ou `migrateGuestCharacterToAuth` retornou sucesso |
| `conversion_failed` | `{ momento, campaignId, error }` | Erro no endpoint |

**Validação de funil:** relatório em `/app/app/admin/conversion-funnel` (auth admin only) mostra taxa de conversão por momento.

---

## Arquivos Chave

| Arquivo | Ação | Área |
|---|---|---|
| `components/conversion/WaitingRoomSignupCTA.tsx` | **CRIAR** — card inline | 1 |
| `components/conversion/RecapCtaCard.tsx` | **CRIAR** — card no fim do CombatRecap | 2, 3 |
| `components/conversion/dismissal-store.ts` | **CRIAR** — localStorage logic (D3) | 6 |
| `components/combat/CombatRecap.tsx` | **MODIFICAR** — aceita novo prop `onSaveAndSignup` com context; renderiza RecapCtaCard | 2 |
| `components/player/PlayerJoinClient.tsx` | **MODIFICAR** — injeta WaitingRoomSignupCTA atrás de flag state; listener de `combat:started` para toast turn-safety | 1, 4 |
| `components/guest/GuestCombatClient.tsx` | **MODIFICAR** — passa guestCharacter snapshot ao AuthModal via onSaveAndSignup | 3 |
| `components/guest/GuestUpsellModal.tsx` | **MODIFICAR** (ou DEPRECAR) — substituído por AuthModal + migrateGuestCharacter | 3 |
| `lib/conversion/analytics.ts` | **CRIAR** — tracking helpers | 7 |
| `public/locales/pt/conversion.json` | **CRIAR** — copy PT-BR | 5 |
| `public/locales/en/conversion.json` | **CRIAR** — copy EN | 5 |
| `app/app/admin/conversion-funnel/page.tsx` | **CRIAR** — dashboard admin | 7 |
| `tests/conversion/waiting-room-cta.test.tsx` | **CRIAR** (RTL) | 1 |
| `tests/conversion/recap-cta.test.tsx` | **CRIAR** (RTL) | 2, 3 |
| `tests/conversion/dismissal-store.test.ts` | **CRIAR** (unit) | 6 |
| `e2e/conversion/waiting-room-signup.spec.ts` | **CRIAR** (Playwright) | 1, 4 |
| `e2e/conversion/recap-anon-signup.spec.ts` | **CRIAR** | 2 |
| `e2e/conversion/recap-guest-signup-migrate.spec.ts` | **CRIAR** | 3 |
| `e2e/conversion/turn-safety.spec.ts` | **CRIAR** — DM inicia combate enquanto modal aberto | 4 |

---

## Critérios de Aceitação

### Área 1 — Waiting Room CTA
- [ ] Card inline aparece no `/join/[token]` quando player é anon e combate não iniciou
- [ ] Desaparece automaticamente quando combate começa (listener de broadcast)
- [ ] Copy contextual usa `characterName` se disponível
- [ ] Botão "Agora não" chama dismissal store
- [ ] Nunca overlay/modal (parity com design system)

### Área 2 — Recap CTA (anon)
- [ ] `CombatRecap` exibe card de conversão na fase `details` se player anon
- [ ] `onSaveAndSignup` recebe contexto completo
- [ ] AuthModal abre com upgradeContext correto
- [ ] Pós-success: `upgradePlayerIdentity` executa, toast de sucesso

### Área 3 — Recap CTA (guest)
- [ ] `GuestCombatClient` passa snapshot do Zustand ao AuthModal
- [ ] Fluxo: signUp → migrateGuestCharacterToAuth → default_character_id setado
- [ ] Character novo aparece no dashboard pós-signup
- [ ] `GuestUpsellModal` deprecated ou substituído

### Área 4 — Turn Safety (não-negociável)
- [ ] AuthModal aberto **não trava** heartbeat, broadcasts ou action buttons
- [ ] Toast avisa quando combate inicia durante modal ("seu turno não será perdido")
- [ ] E2E valida: modal aberto + DM inicia combate + player completa cadastro → player vê seu turno ativo
- [ ] DM vê player como "presente" durante cadastro (last_seen_at atualizado)

### Área 5 — Copy & i18n
- [ ] Chaves em `public/locales/{pt,en}/conversion.json` existem
- [ ] Copy usa `character_name` como variável
- [ ] Paige revisa antes de merge
- [ ] Vocabulário alinhado com glossário ubíquo (Épico 01 Story 01-A)

### Área 6 — Dismissal Memory
- [ ] localStorage record implementado
- [ ] `shouldShowCta` lógica cobre 4 cenários (primeira vez, nova campanha, 7 dias, 3+ dismissals)
- [ ] Reset ao conversão completa

### Área 7 — Analytics
- [ ] 5 eventos de funil emitidos com payload correto
- [ ] Dashboard admin exibe taxa de conversão por momento
- [ ] Integração com stack de analytics existente (ver docs do Épico 04)

### Integração
- [ ] `tsc --noEmit` limpo
- [ ] **Parity check (CLAUDE.md):** guest/anon funcionam em `/try` e `/join`; auth não vê CTAs desnecessários
- [ ] **Resilient reconnection:** modal aberto não quebra reconnect-from-storage
- [ ] **SEO:** nenhuma rota pública nova; `/app/admin/conversion-funnel` tem `noindex`

---

## Testing Contract

| Área | Unit | Integration | E2E |
|---|---|---|---|
| 1 — Waiting room | RTL render + props (3+) | Broadcast listener | `waiting-room-signup.spec.ts` |
| 2 — Recap anon | RTL render (3+) | Prop wire | `recap-anon-signup.spec.ts` |
| 3 — Recap guest | RTL render + Zustand mock | Endpoint call | `recap-guest-signup-migrate.spec.ts` |
| 4 — Turn safety | — | Broadcast + modal open | `turn-safety.spec.ts` **obrigatório** |
| 5 — Copy | i18n key coverage | — | — |
| 6 — Dismissal | Unit test de `shouldShowCta` | — | — |
| 7 — Analytics | Event emission (5+) | — | — |

**Testes obrigatórios (Quinn):**
1. **Turn-safety E2E** — anon no waiting room → abre AuthModal → DM inicia combate → DM distribui iniciativa → player é atingido por turno com modal aberto → completa cadastro → vê turno ativo com countdown ainda rodando ou turno já passado sem penalidade
2. **Dismissal memory** — player rejeita 3x na mesma campanha → não aparece de novo até nova campanha ou 7 dias
3. **Guest character migrate E2E** — guest cria "Maria" em `/try`, joga combate, vê recap, clica "Salvar Maria" → signUp → login → dashboard mostra Maria como default
4. **Concurrent submit** — player abre AuthModal no waiting room e recap da sessão anterior (tab antiga) — primeiro submit sucede, segundo detecta "já autenticado" e vira no-op
5. **Broadcast desincroniza** — combate iniciou mas broadcast chegou atrasado → CTA ainda visível 2s depois → testa se UI recupera graciosamente

---

## Story Sequencing (DAG)

```
Story 03-A: dismissal-store (Área 6) + analytics helpers (Área 7)
   └─ sem dependências, pode começar antes de 01/02 terminarem

Story 03-B: copy + i18n chaves (Área 5)
   └─ Paige lidera; pode rodar em paralelo

Story 03-C: WaitingRoomSignupCTA componente + integração em PlayerJoinClient
   └─ depende de 03-A, 03-B
   └─ depende de Épico 02 (AuthModal)

Story 03-D: RecapCtaCard + modificação de CombatRecap (Área 2)
   └─ depende de 03-A, 03-B
   └─ depende de Épico 02 (AuthModal)

Story 03-E: Guest migrate flow (Área 3) + modificação de GuestCombatClient
   └─ depende de 03-D (reusa RecapCtaCard)
   └─ depende de Épico 01 (migrateGuestCharacterToAuth endpoint)

Story 03-F: Turn safety implementation + toast (Área 4)
   └─ depende de 03-C, 03-D
   └─ crítico — Quinn valida antes de merge

Story 03-G: Admin dashboard de funil (Área 7)
   └─ depende de 03-A
   └─ paralelo a C/D/E/F

Story 03-H: E2E suite completa
   └─ depende de 03-C a 03-F
```

**Sprint distribution:**
- **Sprint 1:** 03-A, 03-B, 03-C, 03-D (paralelos)
- **Sprint 2:** 03-E, 03-F, 03-G, 03-H

---

## Riscos Documentados

| Risco | Severidade | Mitigação |
|---|---|---|
| Modal aberto durante turno → player perde ação | **Alta** | Área 4 + Quinn turn-safety E2E obrigatório; heartbeat não pausa; DM vê player presente |
| CTA spam frustra player | Alta | Dismissal memory (Área 6) + não persistente agressivo |
| Copy emocional soa forçada / marketing | Média | Paige revisa; Dani aprova; A/B test no dashboard de funil |
| `PlayerJoinClient` (3043 linhas) difícil de modificar sem regressão | Alta | Mudança puramente aditiva (injeção de componente); feature flag; parity E2E |
| Guest migrate flow cria char duplicado se player já tinha em outra guest session | Média | `migrateGuestCharacterToAuth` é idempotente por shape; se duplicate detected, merge no mais recente ou keep-both |
| Broadcast de `combat:started` chega atrasado e CTA some enquanto player digita | Baixa | Dismissal por transição automática não limpa form; state restore |
| Analytics não configurado (stack indefinido) | Média | Pesquisa do Épico 04 resolve; fallback console.log + server log com telemetry tag |
| i18n EN não pronto no lançamento | Baixa | Lançar com PT-BR; adicionar EN em story follow-up |

---

## Regras Imutáveis (CLAUDE.md)

- **Combat Parity Rule:** CTAs aparecem em anon e guest (não em auth, que já é convertido). Turn safety vale nos 3 modos. Parity E2E obrigatório.
- **Resilient Reconnection Rule:** abrir `AuthModal` **NUNCA** invalida `session_token_id` em storage. Durante cadastro, heartbeat segue. Spec §4 (Épico 01 Área 8) cobre identity upgrade — este épico só consome.
- **SRD Compliance:** nenhum conteúdo SRD público novo; copy é de marketing/UX (livre).
- **SEO Canonical:** nenhuma rota pública nova; `/app/admin/conversion-funnel` tem `noindex`.

---

## Dependências

### De entrada
- Épico 01 — primitives de identity (upgrade, migrate)
- Épico 02 — `AuthModal`

### De saída
- Épico 04 — herda dashboard de funil (base pra métrica de player-virando-DM)

---

## Estimativa de Esforço

| Área | Complexidade | Esforço |
|---|---|---|
| Área 1 — Waiting Room CTA | Média | 1-2 dias |
| Área 2 — Recap CTA anon | Média | 1 dia |
| Área 3 — Guest migrate recap | Média | 2 dias |
| Área 4 — Turn safety | **Alta** | 2-3 dias (Quinn é rigoroso) |
| Área 5 — Copy & i18n | Baixa | 1 dia |
| Área 6 — Dismissal memory | Baixa | 0.5 dia |
| Área 7 — Analytics + dashboard | Média | 2-3 dias |
| Testes unit + integration | Média | 1-2 dias |
| E2E (5+ specs) | Média | 2 dias |
| **Total estimado** | | **12-16 dias úteis (~1.5-2 sprints)** |

---

## Próximos Passos

1. Revisão deste épico com Dani_ + time (GO / AJUSTAR)
2. Aguardar Épicos 01 e 02 em staging antes de começar stories de código
3. Paige começa copy imediatamente (não depende de 01/02 estar pronto)
4. Sally produz mockups dos CTAs (waiting room card + recap card)
5. Bob quebra em stories conforme DAG
6. Quinn define test plan de turn-safety ANTES de Story 03-F entrar em execução
