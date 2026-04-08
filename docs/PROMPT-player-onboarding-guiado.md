# PROMPT: Onboarding Guiado do Jogador — Estrutura Completa

> **Contexto:** O Pocket DM tem toda a infraestrutura de onboarding construída para o DM (wizard 4 passos, tour 7 steps, ActivationChecklist). O jogador não tem nada disso — cai em telas genéricas ou fica perdido. Este sprint cria o onboarding guiado end-to-end para o jogador, tanto mobile quanto desktop.
>
> **Regra absoluta:** NÃO tocar em nenhum arquivo de combate. NÃO alterar fluxo anônimo (/join/[token]). NÃO criar migrations — só usar colunas que já existem ou adicionar em `user_onboarding`.
>
> **Referências obrigatórias antes de implementar:**
> - `components/tour/TourProvider.tsx` — infraestrutura de tour completa, reutilizar
> - `components/dashboard/DashboardTourProvider.tsx` — padrão de tour do DM para seguir
> - `components/dashboard/ActivationChecklist.tsx` — padrão de checklist para seguir
> - `components/dashboard/OnboardingWizard.tsx` — wizard existente, adicionar fork para player
> - `components/tour/dashboard-tour-steps.ts` — formato de steps, criar equivalente para player

---

## DIAGNÓSTICO — Estado Atual do Jogador

### Entry points do jogador (3 caminhos)

| Caminho | Rota | Status do token | Estado do onboarding |
|---------|------|-----------------|---------------------|
| **Via invite** (mais comum) | `/invite/[token]` → auth → dashboard | ✅ Sobrevive (JO-01) | ❌ Cai no dashboard sem guia |
| **Via código de campanha** | `/join-campaign/[code]` → auth | ✅ Sobrevive (JO-02) | ❌ Cai no dashboard sem guia |
| **Sign-up direto** | `/auth/sign-up` → dashboard | N/A | ❌ Wizard mostra "aguardando convite" sem contexto |

### O que existe vs. o que falta

| Componente | Status |
|---|---|
| Token survival (JO-01/JO-02) | ✅ Feito |
| Player empty state no dashboard (JO-09/JO-11) | ✅ Feito |
| CharacterWizard dentro da campanha | ✅ Feito |
| Player HQ completo (26 componentes) | ✅ Feito |
| Fork do OnboardingWizard para role=player | ❌ Falta |
| Tour do dashboard para jogador | ❌ Falta |
| Tour do Player HQ (primeira abertura) | ❌ Falta |
| Player Activation Checklist | ❌ Falta |
| Coluna `player_hq_tour_completed` na `user_onboarding` | ❌ Falta (migration necessária) |

---

## ARQUITETURA DO ONBOARDING DO JOGADOR

O onboarding do jogador tem **4 fases** sequenciais:

```
[FASE 1] OnboardingWizard (role=player)
    ↓ wizard_completed = true
[FASE 2] Player Dashboard Tour
    ↓ dashboard_tour_completed = true
[FASE 3] Player HQ Tour (1ª vez que abre sheet)
    ↓ player_hq_tour_completed = true
[FASE 4] Player Activation Checklist (contínuo até 4/4)
```

Cada fase persiste no `user_onboarding`. Fases são **opcionais de pular** mas não devem ser puladas implicitamente.

---

## MIGRATION NECESSÁRIA

Adicionar coluna ao `user_onboarding`:

```sql
-- migration: 110_player_hq_tour.sql
ALTER TABLE user_onboarding
  ADD COLUMN IF NOT EXISTS player_hq_tour_completed BOOLEAN NOT NULL DEFAULT FALSE;
```

Criar arquivo em `supabase/migrations/110_player_hq_tour.sql` e rodar `npx supabase db push`.

---

## FASE 1 — OnboardingWizard: Fork para Jogador

### Arquivo: `components/dashboard/OnboardingWizard.tsx`

**Problema atual:** Quando `step === "role"` e o usuário seleciona `player`, o wizard muda para `step = "choose"` que mostra opções focadas no DM. O jogador fica sem caminho.

**O que fazer:** Após selecionar role = "player" no step "role", ir para um step novo chamado `"player_entry"` em vez de `"choose"`.

### Novo step: `"player_entry"`

Visual: card centralizado, tom acolhedor, fundo escuro Pocket DM.

**Layout mobile (375px):**
```
┌─────────────────────────────┐
│  🎲  Bem-vindo, Aventureiro  │  (título dourado)
│                             │
│  Você foi convidado         │
│  para uma campanha?         │
│                             │
│  ┌─────────────────────┐    │
│  │ 📨 Tenho um convite │    │  (botão primário amber)
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │ 🔗 Tenho um código  │    │  (botão secundário outline)
│  └─────────────────────┘    │
│                             │
│  Sem convite ainda?         │
│  Explore o compêndio →      │  (link sutil, muted)
└─────────────────────────────┘
```

**Desktop:** Mesma estrutura, card com max-w-md centralizado.

### Fluxo a partir do `"player_entry"`:

**Opção A — "Tenho um convite":**
- Campo de input: "Cole o link do convite ou o código"
- Ao submeter: extrair token do link ou usar código diretamente
- Redirecionar para `/invite/[token]` ou `/join-campaign/[code]`
- NÃO precisa criar personagem aqui — isso acontece na campanha

**Opção B — "Tenho um código":**
- Campo de input: código curto (ex: `ABC-123`)
- Ao submeter: redirecionar para `/join-campaign/[code]`

**Opção C — "Sem convite":**
- Completar wizard imediatamente (`wizard_completed = true`)
- Mostrar step `"player_waiting"` com CTAs:
  - "Explore o compêndio de monstros"
  - "Teste um combate rápido"
  - "Ver como funciona o Player HQ"
- Mensagem: "Quando seu Mestre te convidar, o link aparecerá aqui automaticamente"

### Implementação técnica:

```tsx
// Em WizardStep type, adicionar:
type WizardStep = "role" | "welcome" | "choose" | "express" 
  | "player_entry" | "player_waiting"   // ← NOVOS
  | 1 | 2 | 3 | 4 | "done";

// Na transição de role → próximo step:
if (selectedRole === "player") {
  // Se já tem campaign via pendingInvite/pendingJoinCode no localStorage,
  // pular player_entry e ir direto ao step de confirmação
  const pendingInvite = localStorage.getItem("pendingInvite");
  const pendingCode = localStorage.getItem("pendingJoinCode");
  if (pendingInvite || pendingCode) {
    // Redirecionar automaticamente e marcar wizard_completed
    handlePendingTokens(); // extrair e redirecionar
  } else {
    dispatch({ type: "SET_STEP", step: "player_entry" });
  }
}
```

### Step `"done"` para jogador:

Diferente do done do DM (que mostra link de sessão), o done do jogador mostra:

```
┌─────────────────────────┐
│  ✨ Tudo pronto!         │
│                          │
│  Sua conta está criada.  │
│  Aguardando convite do   │
│  seu Mestre.             │
│                          │
│  Enquanto isso:          │
│  • [Compêndio →]         │
│  • [Combate de treino →] │
│                          │
│  [Ir para o Dashboard]   │
└─────────────────────────┘
```

---

## FASE 2 — Player Dashboard Tour

### Arquivo novo: `components/tour/player-dashboard-tour-steps.ts`

Seguindo o formato exato de `dashboard-tour-steps.ts`, criar steps específicos para o jogador.

**Tour do dashboard do jogador — 5 steps:**

```ts
export const PLAYER_DASHBOARD_TOUR_STEPS = [
  {
    id: "player-welcome",
    target: "[data-tour='player-header']",  // header do dashboard
    title: "Seu painel de jogador",
    content: "Aqui você acompanha suas campanhas, personagens e convites pendentes.",
    placement: "bottom",
  },
  {
    id: "player-invites",
    target: "[data-tour='pending-invites']",  // PendingInvites component
    title: "Convites pendentes",
    content: "Quando um Mestre te convidar, aparece aqui. Aceite com um toque.",
    placement: "bottom",
    conditional: (ctx) => ctx.hasPendingInvites,  // só mostra se há invites
  },
  {
    id: "player-campaigns",
    target: "[data-tour='player-campaigns-section']",
    title: "Suas campanhas",
    content: "Cada card é uma campanha. Toque para acessar seu personagem e o Player HQ.",
    placement: "top",
  },
  {
    id: "player-character",
    target: "[data-tour='player-character-section']",
    title: "Seus personagens",
    content: "Crie e gerencie seus personagens aqui. Cada campanha pode ter um personagem diferente.",
    placement: "top",
  },
  {
    id: "player-sidebar",
    target: "[data-tour='sidebar-compendium']",
    title: "Compêndio de monstros",
    content: "Consulte fichas de monstros, magias e itens durante o jogo. Funciona offline.",
    placement: "right",
    mobileAlt: "bottom",  // no mobile, tooltip aparece na parte de baixo
  },
];
```

### Arquivo novo: `components/tour/PlayerDashboardTourProvider.tsx`

Baseado em `DashboardTourProvider.tsx`, criar versão para jogador:

```tsx
// Trigger: dashboard carregado + wizard_completed=true + dashboard_tour_completed=false + userRole inclui "player"
// Delay: 800ms após render (igual ao DM tour)
// Skip: botão "Pular tour" visível sempre
// Complete: marcar dashboard_tour_completed=true no Supabase
```

**Integração em `DashboardOverview.tsx`:**
Onde hoje renderiza `DashboardTourProvider` (DM), adicionar renderização condicional:
```tsx
{isDm && <DashboardTourProvider ... />}
{isPlayer && <PlayerDashboardTourProvider ... />}
```

---

## FASE 3 — Player HQ First-Time Tour

### Arquivo novo: `components/tour/player-hq-tour-steps.ts`

Tour disparado na **primeira vez** que o jogador abre `/app/campaigns/[id]/sheet`.

**Trigger:** `player_hq_tour_completed === false` (coluna da migration 110).

**5 steps, mobile-first:**

```ts
export const PLAYER_HQ_TOUR_STEPS = [
  {
    id: "hq-welcome",
    target: "[data-tour='hq-header']",  // header com nome do personagem
    title: "Seu Player HQ",
    content: "Esta é sua central de jogador. Tudo sobre seu personagem em um lugar.",
    placement: "bottom",
  },
  {
    id: "hq-sheet",
    target: "[data-tour='tab-sheet']",  // tab de ficha
    title: "Ficha do Personagem",
    content: "HP, condições, CA e atributos. O essencial na ponta do dedo durante o combate.",
    placement: "bottom",
  },
  {
    id: "hq-resources",
    target: "[data-tour='tab-resources']",  // tab de recursos
    title: "Recursos e Magias",
    content: "Controle seus spell slots, habilidades de descanso e rastreadores de recursos.",
    placement: "bottom",
  },
  {
    id: "hq-notes",
    target: "[data-tour='tab-notes']",  // tab de notas
    title: "Notas Privadas",
    content: "Anote durante a sessão. Só você vê — o Mestre não tem acesso.",
    placement: "bottom",
  },
  {
    id: "hq-map",
    target: "[data-tour='tab-map']",  // tab de mapa
    title: "Mapa da Campanha",
    content: "Explore o que o Mestre revelou. NPCs, locais, quests — tudo conectado.",
    placement: "bottom",
  },
];
```

### Integração em `PlayerHqShell.tsx`

1. Adicionar `data-tour` attrs nos elementos-alvo dos tabs e header
2. Criar `PlayerHqTourProvider` wrapper (simples, sem `DashboardTourProvider` de overhead)
3. Ao completar: `UPDATE user_onboarding SET player_hq_tour_completed = true`

**Arquivos a alterar:**
- `components/player-hq/PlayerHqShell.tsx` — adicionar `data-tour` nos tabs, wrapping com tour
- Novo: `components/tour/PlayerHqTourProvider.tsx`
- Novo: `components/tour/player-hq-tour-steps.ts`
- `app/app/campaigns/[id]/sheet/page.tsx` — passar `playerHqTourCompleted` como prop

---

## FASE 4 — Player Activation Checklist

### Arquivo novo: `components/dashboard/PlayerActivationChecklist.tsx`

Equivalente ao `ActivationChecklist.tsx` do DM, mas para o jogador. Aparece no dashboard do player até todos os 4 itens estarem completos.

**4 milestones:**

```tsx
const PLAYER_MILESTONES = [
  {
    id: "account",
    icon: UserCheck,
    label: "Conta criada",
    description: "Você está aqui!",
    check: () => true,  // sempre completo se chegou aqui
  },
  {
    id: "campaign_joined",
    icon: Users,
    label: "Entrou em uma campanha",
    description: "Aceite um convite do seu Mestre",
    check: (ctx) => ctx.campaignCount > 0,
    cta: { label: "Ver convites pendentes", href: "#pending-invites" },
  },
  {
    id: "character_created",
    icon: Swords,
    label: "Criou seu personagem",
    description: "Crie um personagem na sua campanha",
    check: (ctx) => ctx.hasCharacter,
    cta: { label: "Ir para a campanha", href: "/app/campaigns" },
  },
  {
    id: "first_session",
    icon: Sparkles,
    label: "Participou de uma sessão",
    description: "Entrou em combate ao vivo com seu Mestre",
    check: (ctx) => ctx.hasAttendedSession,
    cta: { label: "Aguardando seu Mestre iniciar", disabled: true },
  },
];
```

**Visual:**
- Card colapsável (expandido por padrão enquanto não completo)
- Progress bar amber: `X de 4 concluídos`
- Ao completar todos: `confetti()` + card desaparece com fade (usar `animate-out slide-out-to-top`)
- Persistência: `localStorage.setItem('player_checklist_dismissed', 'true')` se o jogador fechar manualmente

**Onde renderizar:**
Em `DashboardOverview.tsx`, na seção do player, acima dos `PlayerCampaignCard`s:
```tsx
{isPlayer && completedCount < 4 && !isDismissed && (
  <PlayerActivationChecklist
    campaignCount={playerCampaigns.length}
    hasCharacter={hasAnyCharacter}
    hasAttendedSession={hasAttendedSession}
  />
)}
```

---

## UX — MOBILE VS DESKTOP

### Diferenças explícitas por fase

| Aspecto | Mobile (< 768px) | Desktop (≥ 768px) |
|---------|-----------------|-------------------|
| **Wizard player_entry** | Full-screen card, botões 100% width, texto grande | Card max-w-md centralizado, padding generoso |
| **Tour tooltips** | `placement: "bottom"` forçado — nunca side (sem espaço) | `placement` livre conforme definido no step |
| **Tour overlay** | Fundo escuro com área recortada em destaque (já existe em TourOverlay.tsx) | Idem |
| **Tour progress** | Indicador de pontinhos (TourProgress.tsx) no bottom center | Indicador no canto da tooltip |
| **Player HQ tour** | Tabs ficam na parte de baixo → tooltips acima dos tabs | Tooltips acima também (layout vertical) |
| **Activation checklist** | Colapsado por padrão, toque para expandir | Expandido por padrão |
| **Skip button** | Sempre visível, mínimo 44px de touch target | Visible no hover |

### Regra geral de tooltip position no mobile:
No `PlayerHqTourProvider` e `PlayerDashboardTourProvider`, detectar `window.innerWidth < 768` e sobrescrever placement para `"bottom"` em todos os steps. O `TourTooltip.tsx` já suporta isso via prop `placement`.

---

## ESTRUTURA DE ARQUIVOS — O QUE CRIAR/MODIFICAR

### Novos arquivos:
```
components/tour/player-dashboard-tour-steps.ts    ← steps do tour do dashboard
components/tour/PlayerDashboardTourProvider.tsx    ← dispara tour do dashboard (jogador)
components/tour/player-hq-tour-steps.ts           ← steps do tour do Player HQ
components/tour/PlayerHqTourProvider.tsx           ← dispara tour do HQ
components/dashboard/PlayerActivationChecklist.tsx ← checklist 4 itens
supabase/migrations/110_player_hq_tour.sql         ← nova coluna
```

### Arquivos modificados:
```
components/dashboard/OnboardingWizard.tsx          ← fork player_entry + player_waiting
components/dashboard/DashboardOverview.tsx         ← renderizar tours e checklist condicionalmente
components/player-hq/PlayerHqShell.tsx             ← data-tour attrs + tour wrapper
app/app/campaigns/[id]/sheet/page.tsx             ← passar playerHqTourCompleted
```

### data-tour attributes a adicionar:

| Elemento | Atributo |
|---|---|
| Header do dashboard | `data-tour="player-header"` |
| Seção PendingInvites | `data-tour="pending-invites"` |
| Seção de campanhas do player | `data-tour="player-campaigns-section"` |
| Seção de personagens | `data-tour="player-character-section"` |
| Link do compêndio na sidebar | `data-tour="sidebar-compendium"` |
| Header do PlayerHqShell | `data-tour="hq-header"` |
| Tab "Mapa" | `data-tour="tab-map"` |
| Tab "Ficha" | `data-tour="tab-sheet"` |
| Tab "Recursos" | `data-tour="tab-resources"` |
| Tab "Notas" | `data-tour="tab-notes"` |

---

## CRITÉRIOS DE ACEITE (por fase)

### Fase 1 — Wizard Player
- [ ] Role = player → vai para step `player_entry` (não `choose`)
- [ ] Se `pendingInvite` ou `pendingJoinCode` no localStorage, pular player_entry e processar automaticamente
- [ ] Input de convite valida formato de URL e código
- [ ] Opção "Sem convite" completa wizard e mostra CTAs para compêndio + /try
- [ ] Step `done` do player diferente do DM (sem session link, com CTAs do jogador)
- [ ] `wizard_completed = true` salvo no Supabase em todos os caminhos

### Fase 2 — Dashboard Tour Player
- [ ] Tour dispara automaticamente quando: `wizard_completed=true` + `dashboard_tour_completed=false` + `userRole includes 'player'`
- [ ] 5 steps com posição correta em mobile e desktop
- [ ] Step de invites pendentes só aparece se há invites (`conditional`)
- [ ] "Pular tour" funciona e marca `dashboard_tour_completed=true`
- [ ] Tour não dispara novamente após completar

### Fase 3 — Player HQ Tour
- [ ] Tour dispara na 1ª abertura de `/app/campaigns/[id]/sheet` quando `player_hq_tour_completed=false`
- [ ] 5 steps apontando para os tabs corretos
- [ ] Funciona em mobile (tooltips bottom) e desktop
- [ ] Ao completar/pular: `player_hq_tour_completed = true` salvo
- [ ] Migration 110 aplicada antes de implementar

### Fase 4 — Activation Checklist
- [ ] Mostra para player enquanto `completedCount < 4`
- [ ] Cada milestone verifica condição correta (campanha, personagem, sessão)
- [ ] CTA de cada milestone funcional
- [ ] Confetti + fade out ao completar todos
- [ ] Pode ser dispensado manualmente (X fecha e persiste em localStorage)
- [ ] Não aparece mais após dispensar ou completar

### Geral
- [ ] Build limpo `tsc --noEmit` após cada fase
- [ ] Nenhum arquivo de combate tocado
- [ ] i18n completo (pt-BR + en) para todos os novos textos
- [ ] HP tiers imutáveis respeitados (não tocamos em combat)

---

## I18N — CHAVES NECESSÁRIAS

Adicionar em `messages/pt-BR.json` e `messages/en.json` sob namespace `onboarding.player.*`:

```json
{
  "onboarding": {
    "player": {
      "entry_title": "Bem-vindo, Aventureiro!",
      "entry_subtitle": "Você foi convidado para uma campanha?",
      "has_invite": "Tenho um convite",
      "has_code": "Tenho um código",
      "no_invite": "Ainda não tenho convite",
      "invite_input_placeholder": "Cole o link ou código do convite...",
      "code_input_placeholder": "Código da campanha (ex: ABC-123)",
      "waiting_title": "Sua conta está pronta!",
      "waiting_subtitle": "Aguardando seu Mestre te convidar",
      "waiting_explore": "Enquanto isso, explore o compêndio",
      "waiting_try_combat": "Teste um combate de treino",
      "done_cta": "Ir para o Dashboard",
      "checklist_title": "Sua jornada começa aqui",
      "checklist_progress": "{done} de {total} concluídos",
      "milestone_account": "Conta criada",
      "milestone_campaign": "Entrou em uma campanha",
      "milestone_character": "Criou seu personagem",
      "milestone_session": "Participou de uma sessão",
      "checklist_all_done": "Você está pronto para aventurar!"
    }
  }
}
```

---

## RESULTADO ESPERADO

Ao final desta sprint, um jogador que:

1. **Recebe um invite** → clica → cria conta → aceita automaticamente → tem tour do dashboard → cria personagem na campanha → abre Player HQ → tem tour do HQ → tem checklist guiando os próximos passos

2. **Abre o app sem invite** → wizard explica o que fazer → CTAs para explorar o app → quando invite chegar, é processado automaticamente

3. **Volta depois de um tempo** → tours já foram vistos → checklist mostra progresso → sem repetições chatas

**Tempo estimado:** 2 sessões (wizard + tours em uma, checklist + polish em outra).

---

## REFERÊNCIAS DE CÓDIGO — PADRÕES A SEGUIR

| O que implementar | Siga o padrão de |
|---|---|
| PlayerDashboardTourProvider | `components/tour/DashboardTourProvider.tsx` |
| player-dashboard-tour-steps.ts | `components/tour/dashboard-tour-steps.ts` |
| PlayerActivationChecklist | `components/dashboard/ActivationChecklist.tsx` |
| PlayerHqTourProvider | `components/tour/DashboardTourProvider.tsx` (versão simplificada) |
| Wizard step player_entry | Steps existentes do OnboardingWizard (mesma estrutura de render) |
| Supabase update tour_completed | `lib/hooks/useOnboarding.ts` ou padrão direct supabase client call |
