# data-testid Contract — Player Identity UI

> **Status:** Normative (Follow-up #3 do handoff Story 01-F, 2026-04-20)
> **Owner:** Sally (UX)
> **Scope:** Surfaces de Player Identity & Continuity — Epic 01 (Claim UI existente) + Epic 02 (Player Dashboard & Invite) + Epic 03 (Conversion Moments)
> **Motivação:** A spec E2E `e2e/features/anon-claim-upgrade-ownership.spec.ts` (Story 01-F) foi forçada a caçar múltiplos seletores porque não havia contrato. Épico 02 está prestes a introduzir `AuthModal`, `CharacterPickerModal`, `InviteLanding` — estabelecer o contrato agora evita retrofit. Épico 03 herda o contrato.

---

## 1. Naming Convention

**Formato:** `feature.component.element[.qualifier]`

- **feature** — super-escopo funcional (`invite`, `join`, `auth`, `combat`, `dashboard`, `recap`).
- **component** — o React component ou a região lógica (`picker`, `modal`, `landing`, `waiting-room`, `turn-panel`).
- **element** — o elemento DOM concreto (`confirm-button`, `name-input`, `character-card`, `current`).
- **qualifier** (opcional) — identificador estável quando um elemento é renderizado N vezes (`character-card-{slug}`, `tab-{name}`, `step-{n}`).

**Exemplos:**

| testid | Significado |
|---|---|
| `invite.picker.mode-claim` | Toggle pro modo "claim" no 3-mode picker |
| `invite.picker.character-card-thorin-shadowmane` | Card do personagem Thorin no picker |
| `combat.turn-panel.current` | Painel da unidade de turno atual |
| `auth.modal.tab-signup` | Tab "signup" dentro do AuthModal |
| `dashboard.recap-cta.card` | Card de CTA pro recap no dashboard |

---

## 2. Regras Imutáveis

1. **kebab-case** em toda a chain. Nada de camelCase ou snake_case. Dots (`.`) separam hierarquia.
2. **Sem índices mutáveis.** `character-card-0`, `character-card-1` quebra quando a lista reordena. **Use IDs estáveis** — slug, UUID curto, ou `name-kebab`. Se não houver ID estável, documente por que no comentário acima do componente.
3. **Evite testids que replicam conteúdo traduzível.** `confirm-button`, não `botao-confirmar` nem `confirm-continuar-button`.
4. **Aditivo a `id`, `aria-*`, `name=` existentes** — nunca substituir. testids servem TEST automation; acessibilidade usa attrs semânticos.
5. **Herança:** se um wrapper tem testid `feature.component`, os children relevantes usam `feature.component.child`. Não repita o prefixo no id do parent se desnecessário.
6. **Uma palavra por segmento preferido.** `current-turn-panel` é um único `component`; `turn-panel.current` separa `component.element` (preferível — permite queries tipo `[data-testid^="combat.turn-panel"]`).
7. **Boolean states via atributos separados** (`data-state="active"`, `aria-selected`), não via testids diferentes. Mantém o testid estável entre states.
8. **Testids NÃO são removidos.** Adicionar novos é livre; deletar ou renomear exige checar specs e CODEOWNERS.

### Anti-Patterns (proibido)

```tsx
// Não — índice mutável
<Card data-testid={`character-card-${index}`} />

// Não — conteúdo traduzível no testid
<Button data-testid="entrar-na-campanha-button" />

// Não — camelCase
<Input data-testid="characterNameInput" />

// Não — state no testid
<Tab data-testid={active ? "tab-signup-active" : "tab-signup"} />

// Sim
<Card data-testid={`invite.picker.character-card-${character.slug}`} />
<Button data-testid="invite.picker.confirm-button" />
<Input data-testid="invite.picker.name-input" />
<Tab data-testid="auth.modal.tab-signup" data-state={active ? "active" : "inactive"} />
```

---

## 3. Contrato Obrigatório

### 3.1 Claim UI — Epic 01 (existente, aplicado em 2026-04-20)

Superfície: `components/campaign/InviteAcceptClient.tsx` — 3-mode state machine (`claim` → `pick` → `create`).

| testid | Tipo | Onde | Obrigatório |
|---|---|---|---|
| `invite.picker.mode-claim` | `button` toggle | No menu de modo quando `unlinkedCharacters.length > 0` | Sim |
| `invite.picker.mode-pick` | `button` toggle | No menu de modo quando `existingCharacters.length > 0` | Sim |
| `invite.picker.mode-create` | `button` toggle | Sempre disponível | Sim |
| `invite.picker.claim-card-{charId}` | `button` seletor | Por unlinkedCharacter. `charId` é o UUID do char | Sim |
| `invite.picker.character-card-{charId}` | `button` seletor | Por existingCharacter. `charId` é o UUID | Sim |
| `invite.picker.confirm-button` | `button submit` | O submit do form — varia o label (claim/pick/create) | Sim |
| `invite.picker.claim-not-listed` | `button` | Fallback "Meu personagem não está na lista" | Sim |
| `invite.picker.pick-create-new` | `button` | Link "+ Criar personagem novo" no modo pick | Sim |
| `invite.picker.back-to-selection` | `button` | Voltar do modo create pro modo anterior | Sim |
| `invite.picker.create-wizard-step-{n}` | `div` / `section` | Wrapper de cada step do form create (1=nome, 2=stats, ...). Ainda não segmentado em steps — reservado | Recomendado |
| `invite-char-name` | `input` | **LEGACY** — manter por compat enquanto `invite.picker.name-input` rola | Manter até deprecação |
| `invite.picker.name-input` | `input` | Nome no modo create | Sim (novo) |
| `invite.picker.hp-input` | `input` | HP opcional | Recomendado |
| `invite.picker.ac-input` | `input` | AC opcional | Recomendado |
| `invite.picker.dc-input` | `input` | Spell save DC opcional | Recomendado |

### 3.2 InviteLanding — Epic 02 Área 1A (a criar)

Superfície: `components/invite/InviteLanding.tsx` (não existe ainda — contrato pra quem implementar a Story 02-D).

| testid | Tipo | Estado | Obrigatório |
|---|---|---|---|
| `invite.landing.root` | `div` wrapper | Sempre | Sim |
| `invite.landing.state-{guest\|auth\|auth-with-invite-pending\|invalid}` | `div` data-attr OU testid | Espelha `detectInviteState` | Sim |
| `invite.landing.campaign-name` | `span`/`h1` | Sempre visível | Sim |
| `invite.landing.dm-name` | `span` | Sempre visível | Sim |
| `invite.landing.preamble` | `p` | State `auth-with-invite-pending` | Sim |
| `invite.landing.open-auth-modal` | `button` | State `guest` | Sim |
| `invite.landing.open-picker-modal` | `button` | States `auth*` | Sim |
| `invite.landing.skeleton` | `div` | Durante detecção de estado | Sim |
| `invite.landing.invalid-reason-{not-found\|expired\|accepted}` | `div` | State `invalid` | Sim |

### 3.3 CharacterPickerModal — Epic 02 Área 2 (a criar)

Superfície: `components/character/CharacterPickerModal.tsx` (a criar na Story 02-B, refatorando `InviteAcceptClient`).

| testid | Tipo | Obrigatório |
|---|---|---|
| `invite.picker.modal` | `Dialog` root | Sim |
| `invite.picker.tab-available` | `button` tab | Sim (auth only) |
| `invite.picker.tab-my-characters` | `button` tab | Sim (auth only) |
| `invite.picker.tab-create` | `button` tab | Sim |
| `invite.picker.tab-panel-{available\|my-characters\|create}` | `section` | Sim |
| `invite.picker.character-card-{charId}` | `button` | Sim (cada char) |
| `invite.picker.load-more-button` | `button` | Sim (infinite scroll) |
| `invite.picker.empty-state-{available\|my-characters}` | `div` | Sim (empty) |
| `invite.picker.confirm-button` | `button submit` | Sim |
| `invite.picker.close-button` | `button` | Sim |
| `invite.picker.loading` | `div` | Sim (while paging) |

> **Nota:** os 3-mode toggles (`mode-claim/pick/create`) do `InviteAcceptClient` migram pros `tab-*` do modal. Durante deprecação, manter ambos.

### 3.4 AuthModal — Epic 02 Área 3 (a criar)

Superfície: `components/auth/AuthModal.tsx` (a criar na Story 02-C).

| testid | Tipo | Obrigatório |
|---|---|---|
| `auth.modal.root` | `Dialog` root | Sim |
| `auth.modal.tab-login` | `button` tab | Sim |
| `auth.modal.tab-signup` | `button` tab | Sim |
| `auth.modal.preamble` | `div` | Sim (se fornecido) |
| `auth.modal.email-input` | `input` | Sim |
| `auth.modal.password-input` | `input` | Sim |
| `auth.modal.display-name-input` | `input` | Sim (signup) |
| `auth.modal.submit-button` | `button submit` | Sim |
| `auth.modal.oauth-google-button` | `button` | Sim |
| `auth.modal.switch-to-signup` | `button link` | Sim |
| `auth.modal.switch-to-login` | `button link` | Sim |
| `auth.modal.error` | `div[role=alert]` | Sim (quando erro) |
| `auth.modal.loading` | `div` | Sim (while submitting) |
| `auth.modal.upgrade-context-indicator` | `div`/`span` | Recomendado — mostra ao user que é upgrade (não signup novo) |

### 3.5 WaitingRoomSignupCTA — Epic 03 Área 1 (a criar)

Superfície: banner de CTA "Criar conta" dentro do waiting room de `/join/[token]`. Contexto: Epic 03 adiciona oferta opcional antes do combate começar.

| testid | Tipo | Obrigatório |
|---|---|---|
| `join.signup-cta.banner` | `div` | Sim |
| `join.signup-cta.headline` | `h2`/`p` | Sim |
| `join.signup-cta.primary-button` | `button` | Sim — abre `AuthModal` com `upgradeContext` |
| `join.signup-cta.dismiss-button` | `button` | Sim — dismiss suave |

### 3.6 RecapCtaCard — Epic 03 Área 2 (a criar)

Superfície: card de CTA no pós-recap (`components/combat/CombatRecap.tsx` e variantes) pra converter guest/anon em auth.

| testid | Tipo | Obrigatório |
|---|---|---|
| `recap.cta.card` | `div` wrapper | Sim |
| `recap.cta.headline` | `h2`/`p` | Sim |
| `recap.cta.save-character-button` | `button` | Sim — fluxo `onSaveAndSignup` |
| `recap.cta.join-campaign-button` | `button` | Sim — fluxo `onJoinCampaign` |
| `recap.cta.dismiss-button` | `button` | Sim |

### 3.7 PlayerJoinClient — Epic 01/02 (aplicado parcial em 2026-04-20)

Superfície: `components/player/PlayerJoinClient.tsx`. Testids aditivos ao que já existe (reconnecting-skeleton, player-loading, player-view, etc).

| testid | Tipo | Onde | Estado |
|---|---|---|---|
| `join.waiting-room` | `div` wrapper | Em volta do `<PlayerLobby>` | **Aplicado** |
| `join.combat-view` | `div` wrapper | Em volta da view de combate ativo (linha ~2732) — **coexiste** com `player-view` legado | **Aplicado** |
| `join.name-input` | `input` | **Em `PlayerLobby.tsx`**, já existe como `lobby-name`. Alias futuro | Pendente (PlayerLobby) |
| `join.join-button` | `button` | **Em `PlayerLobby.tsx`**, já existe como `lobby-submit`. Alias futuro | Pendente (PlayerLobby) |
| `join.signup-cta` | `div` wrapper | Em volta do `CombatRecap` quando `showJoinCampaignCta` é true | **Aplicado** |
| `player-view` | `div` wrapper | Legado — coexiste com `join.combat-view` | Manter (compat) |
| `reconnecting-skeleton` | `p` | Legado | Manter |
| `player-loading` | `p` | Legado | Manter |

> **Nota importante:** `join.name-input` e `join.join-button` precisam ser adicionados em `components/player/PlayerLobby.tsx` (arquivo fora do escopo do commit atual — deixar como follow-up). O `PlayerLobby` já tem `lobby-name` e `lobby-submit`; o contrato acima define que specs novos devem preferir `join.*`, mas os specs legados podem continuar usando `lobby-*` até migração.

### 3.8 Combat (contrato herdado — já aplicado)

| testid | Onde |
|---|---|
| `combat.turn-panel.current` | Tanto DM quanto player — painel da unidade atual |
| `combat.combatants-list` | Lista lateral de combatants |

> Esta seção consolida o que já está no código disperso — documentação deste contrato é task futura.

---

## 4. Regras de Aplicação (workflow)

### Ao criar componente novo

1. **Antes de escrever JSX**, liste os testids que os specs vão usar. Use este doc como referência.
2. Siga a convenção `feature.component.element`.
3. Se o componente é renderizado N vezes, passe um ID estável como qualifier.
4. Adicione testid no root wrapper + nos CTAs principais (submit, cancel, close, tabs).

### Ao modificar componente existente

1. **Nunca remova** testids existentes. Se precisar renomear, adicione o novo **E** mantenha o legado por 1-2 sprints.
2. Se adicionar um CTA ou section nova, adicione testid.
3. Se o componente está listado nesta doc, confira se a forma aplicada casa com o contrato.

### Ao escrever spec E2E

1. **Prefira `getByTestId`** a `getByRole` + `getByText`. Motivo: texto muda (i18n), role pode ser ambíguo.
2. Se o testid contratado não existe no código, abra issue + adicione no componente (PR separado do spec).
3. Se precisar de seletor composto (ex: card específico), use o `qualifier` no testid, não `:has-text()`.

### Ao rodar CI

- **Lint rule futura:** detectar JSX com testid que não seguem `kebab-case-with-dots`. Story backlog.

---

## 5. Histórico

| Data | Sprint/Story | Mudança |
|---|---|---|
| 2026-04-20 | Follow-up #3 Story 01-F | Doc inicial. Testids aplicados em `InviteAcceptClient` e `PlayerJoinClient` (wrappers). Pendente: aplicar em `PlayerLobby` + criar componentes Epic 02. |
