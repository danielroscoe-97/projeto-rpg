# Campaign HQ + Player HQ — Redesign Proposal (v0.2, 2026-04-21)

**Autores:** Sally (UX) + John (PM) + Mary (Analyst) + Winston (Architect)
**Reviewers:** Blind Hunter (Mestre iniciante) + Edge Case Hunter + Acceptance Auditor + Design Critic
**Changelog vs v0.1:**
- ✅ Resolve BL-1 (Run state) · BL-2 (Surface × Auth matrix) · BL-3 (stateless mode) · BL-4 (W0 empty states) · BL-5 (vocabulário)
- ✅ Adiciona user journeys (§2)
- ✅ Adiciona 8 wireframes (v0.1 tinha 5) — inclui W0a/W0b/W6 Run mobile/W7 Player mobile/W8 Recap
- ✅ Fecha 6 findings ignorados (F-09, F-14, F-15, F-16, F-21, F-22)
- ✅ Acceptance criteria pros 11 requisitos novos (§12)
- ✅ Killer-features competitivas (§10)
- ✅ Density budget + tipografia (§11)
- ✅ Soundboard posicionada (§10.5)

**Próximo passo:** se aprovada, subir W0a/W0b/W1/W2/W4 pro Figma via MCP.

---

## 1. Diagnóstico em uma frase

> A Campaign HQ hoje tenta ser Notion + Obsidian + Roll20 + Foundry **ao mesmo tempo, pra Mestre e Player, numa pill bar de 13 abas** — e por isso não é nenhum dos quatro bem feito.

---

## 2. User journeys (quem, quando, o que)

Proposta v0.1 pulou direto pra solução. Sally auto-criticou isso — agora começamos pelo usuário.

### 🟦 J1 — Sexta, 18h: **Mestre preparando a sessão**
Dani acabou de chegar em casa. Mesa é 20h. Abre Pocket DM no laptop.
- Precisa ver **a sessão de hoje** destacada (não "visão geral", não stats)
- Precisa saber **o que falta preparar** (encontro? NPC? nota?)
- Precisa **criar rápido** (Quick add) sem atravessar 4 menus
- Precisa **copiar a nota da sessão passada** (backlinks / tags)
- Este é o momento **Preparar**

### 🟥 J2 — Sexta, 20h05: **Combate acabou de começar**
Grupo chegou, Mestre rolou iniciativa, apertou "Iniciar combate".
- Precisa ver **iniciativa + HP + turno atual** em 1 tela
- Precisa **achar NPC que o player citou em <10s** ("qual era o nome daquele alquimista?")
- Precisa **adicionar monstro surpresa** sem sair do combate
- Precisa que o **player veja o mesmo** em tempo real (Watch)
- Este é o momento **Rodar**

### 🟩 J3 — Domingo, 15h: **Mestre registrando o que aconteceu**
Sessão foi quinta, grupo quer recap antes da próxima.
- Precisa **escrever o resumo** que o player vai ler
- Precisa **linkar** NPCs que apareceram, quests que avançaram
- Precisa **stats** (duração, combates) — mas discretos, não em grid 2×2 de 1 dado vazio
- Player precisa **receber notificação** e ler no celular
- Este é o momento **Recap**

### 🟪 J4 — Sexta, 19h: **Player consultando ficha no ônibus**
Capa Barsavi (player) sabe que é hoje. Abre no celular.
- Precisa ver **quando é a sessão + o que levar**
- Precisa **conferir ficha** sem dor
- Precisa **lembrar onde parou** (recap da anterior)
- Precisa **saber da quest ativa**
- Este é o modo **Minha Jornada**

### 🟨 J5 — Sexta, 20h05: **Player no combate**
Sessão começou no discord, Mestre iniciou combate.
- Precisa **entrar** no tracker em 1 clique (do celular, sem fricção)
- Precisa ver **sua iniciativa** e quando é seu turno
- Precisa ver **HP próprio + party**
- Este é o modo **Assistindo**

---

## 3. Framework: Qual papel × qual momento?

| Momento | Ferramenta referência | Característica dominante |
|---|---|---|
| **Preparar** (entre sessões) | Notion, Obsidian | Compositor linkável, busca global, backlinks |
| **Rodar** (na mesa) | Roll20, Foundry | Cockpit de ação, tudo 1-clique, HP/iniciativa centrais |
| **Recap** (depois da sessão) | Notion + Obsidian | Journal/notes linkado ao que aconteceu |
| **Assistindo** (player durante combate) | Foundry player view | Read-only espelho do Run |

A Campaign HQ precisa ter **modos** (não abas) — um por momento.

---

## 4. Matriz Surface × Role × Auth state (resolve BL-2)

Regra imutável do `CLAUDE.md` (Combat Parity Rule): toda feature tem que verificar 3 modos de acesso.

### 4.1 Matriz de acesso por mode

| Mode | Guest (`/try`) | Anônimo (`/join/token`) | Autenticado (`/invite`) |
|---|---|---|---|
| **Preparar** (Mestre) | ❌ não existe — Guest não tem campanha | ❌ Anônimo é sempre player | ✅ Mestre full |
| **Rodar** (Mestre) | ❌ idem | ❌ idem | ✅ Mestre full |
| **Recap** (Mestre) | ❌ idem | ❌ idem | ✅ Mestre full |
| **Minha Jornada** (Player) | ❌ Guest não tem campanha | ✅ **read-only via token** (ficha + quests + última sessão) | ✅ full + notas privadas |
| **Assistindo** (Player em combate) | ✅ **Watch simplificado** (iniciativa + HP + turno) | ✅ Watch completo | ✅ Watch completo + chat |

### 4.2 Matriz de surfaces (dentro do mode Player)

| Surface | Anônimo (token) | Autenticado |
|---|---|---|
| Ficha do personagem | ✅ read | ✅ read + edit |
| Última sessão (recap) | ✅ | ✅ |
| Próxima sessão | ✅ | ✅ |
| Quests ativas | ✅ | ✅ |
| Notas privadas do player | ❌ **não tem conta** — sem storage persistente | ✅ |
| Inventário | ✅ read | ✅ read + equip |
| Chat/Roll no combate | ❌ (sem realtime persistente) | ✅ |
| Histórico de sessões passadas | ❌ | ✅ |

**Consequência direta:** wireframe W4 (Player desktop) mostrava Chat/Roll — isso é **auth-only**. Anônimo vê Assistindo simplificado sem chat. Atualizado em §7.

### 4.3 Anti-pattern combatido
```
// ❌ v0.1 assumiu W2 (Run) com Chat/Roll existe pra todo mundo
// ✅ v0.2 tem matriz explícita — Chat/Roll é auth-only
```

---

## 5. Nova IA: Modes + Surfaces

### 5.1 Mestre: de 13 pills → 3 modos × surfaces contextuais

**Mode switcher** no topo da sidebar (desktop) ou tab-bar bottom (mobile). **3 ícones grandes com label em PT-BR**, zero jargão.

```
┌──────────┐
│ 🛠 Prep  │  ← "Preparar" (PT-BR)
│ ⚔️ Mesa  │  ← "Rodar"
│ 📖 Recap│  ← "Depois da Sessão"
└──────────┘
```

Cada modo revela uma sidebar contextual com só o que importa agora.

### 5.2 Mapeamento mode → surfaces

| Mode | Surfaces visíveis | Label PT-BR na UI |
|---|---|---|
| **🛠 Preparar** | next-session · quests · npcs · locais · faccoes · notas · mindmap · soundboard | "Próxima Sessão · Quests · NPCs · Locais · Facções · Notas · Mapa Mental · Trilha" |
| **⚔️ Rodar** | combat · party · npcs-cena · locais-cena · quest-ativa · quick-add | "Combate · Party · NPCs em cena · Onde estamos · Quest ativa · ➕" |
| **📖 Recap** | ultima-sessao · recap-editor · timeline · stats · notas-dm | "Última Sessão · Recap · Linha do Tempo · Números · Notas do Mestre" |

**Surfaces compartilham dados** — um NPC é o mesmo NPC em Preparar e Rodar. Muda a **lente** (editor em Preparar, dashboard read-only em Rodar com ação de combate, anotação em Recap).

### 5.3 Player: de 9 pills → 2 modos

| Mode | Surfaces (Auth) | Surfaces (Anônimo via `/join/token`) | Quando aparece |
|---|---|---|---|
| **📖 Minha Jornada** (default) | personagem · ultima-sessao · proxima-sessao · quests · minhas-notas · party | **Light:** personagem (read) · ultima-sessao · proxima-sessao · quests · party (sem minhas-notas) | Sempre que **não há combate ativo** |
| **👁️ Assistindo** (auto-forçado) | combat-tracker · iniciativa · party · turno-atual · ação-rápida · chat/roll | **Light:** combat-tracker · iniciativa · party · turno-atual · ação-rápida (sem chat/roll) | **Auto-switched** quando server detecta combate ativo |

Player **não tem** mode switcher visível. O mode é **derivado do server state** (§5.5). Banner topo oferece "Voltar pra Minha Jornada" durante combate se player quiser.

**Player anônimo (decisão travada):** vê Minha Jornada **light** (read-only por token) antes do combate + Assistindo simplificado durante combate. Rodapé persistente: `💾 Crie uma conta pra salvar suas notas e histórico [Criar conta]`. Copy nos empty states de Notas: "Notas privadas precisam de conta — crie grátis pra começar".

### 5.4 Mode state durante ação (resolve BL-1)

**Regra:** quando `combat.active === true`:

**Para o Mestre:**
- Preparar e Recap **ficam acessíveis mas em read-only lock**
- Sidebar mostra badge `🔒 Combate em andamento — edição pausada`
- Editar NPC/Quest/Nota retorna modal "Pausar combate pra editar? [Pausar] [Cancelar]"
- Apenas **notas de Rodar** (quick note durante combate) e **Recap** (pós-combate) são write-enabled
- Click em Rodar na sidebar volta pro combate ativo

**Para o Player:**
- Assistindo é **sticky** durante combate ativo
- Sidebar mostra apenas: Combate (ativo) · Personagem (read-only) · Última Sessão (read)
- Minhas Notas fica write-enabled (player pode anotar durante combate)

**Anti-pattern combatido (v0.1 não tratava):**
```
// ❌ Mestre muda pra Preparar, edita NPC Grolda (HP 45/80), broadcast HP change no meio do turno
// ✅ v0.2: Sidebar sinaliza lock, edição pede "Pausar combate"
```

### 5.5 Mode = stateless derivado do server (resolve BL-3)

**Regra imutável nova** (adicionar ao `CLAUDE.md` após aprovação):

> **Mode NUNCA é persistido como fonte de verdade.** É sempre derivado do server state + role.

**Algoritmo de resolução de mode (client):**
```typescript
function resolveMode(user, campaign, combat): Mode {
  // Prioridade 1: combate ativo sobrepõe preferência
  if (combat?.active) {
    if (user.role === 'dm') return 'rodar' // Mestre cai em Rodar
    return 'assistindo'                     // Player força Watch
  }

  // Prioridade 2: sem combate, usa último surface visitado (cosmético)
  // Se Mestre acabou de terminar combate → Recap por default
  if (combat?.just_ended_within_minutes === 30 && user.role === 'dm') {
    return 'recap'
  }

  // Default: Mestre → Preparar, Player → Minha Jornada
  return user.role === 'dm' ? 'preparar' : 'minha-jornada'
}
```

**O que pode ser persistido em localStorage/sessionStorage:**
- Última **surface** visitada dentro do mode atual (ex: `preparar/npcs` último aberto) — cosmético
- Estado de sidebar colapsada/expandida — cosmético
- Tema, densidade, preferências visuais — cosmético

**O que JAMAIS é persistido:**
- Mode em si (`preparar` / `rodar` / `recap`)
- Estado de combate ativo
- Lista de NPCs em cena

**Reconnection scenario (Resilient Reconnection Rule compat):**
1. Player fecha aba durante Rodar (combate ativo)
2. Abre 1h depois
3. Client ainda tem token no localStorage (ok)
4. Fetcha `/api/campaign/state` → server retorna `combat.active === true`
5. Mode resolvido: `assistindo` (forçado) — jamais cai em MyStory cenário perdido

**Anti-pattern combatido:**
```
// ❌ localStorage.setItem('mode', 'minha-jornada') → player volta, vê "Minha Jornada" enquanto Mestre tá no R7
// ✅ server state sempre decide; localStorage só lembra qual surface abrir
```

---

## 6. Shell unificado

### 6.1 Arquitetura do shell

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo] Krynn ▾    🔍 Buscar rápida (Ctrl+K)           🔔 [D] ▾    │  ← topbar
├──────────┬──────────────────────────────────────────────────────────┤
│ 🛠 Prep  │                                                          │
│ ⚔️ Mesa  │                                                          │
│ 📖 Recap│                 CONTEÚDO DO MODO                         │
│ ─────    │                                                          │
│ Próxima  │                                                          │
│ Quests   │                                                          │
│ NPCs     │                                                          │
│ Locais   │                                                          │
│ Facções  │                                                          │
│ Notas    │                                                          │
│ Mapa M.  │                                                          │
│ Trilha   │                                                          │
│          │                                                          │
│ ◀ ▸     │                                                          │
└──────────┴──────────────────────────────────────────────────────────┘
 ←  80-220px  →  ←           resto da viewport         →
```

### 6.2 Componentes (com naming PT-BR user-facing)

| Elemento | Label PT-BR (user-facing) | Código (interno) | Atalho |
|---|---|---|---|
| Topbar logo + switcher campanha | "Krynn ▾" (dropdown com todas as campanhas) | `CampaignSwitcher` | — |
| Busca rápida | "🔍 Buscar rápida" (placeholder) | `QuickSearch` | **Ctrl+K** (Windows) / ⌘K (Mac) |
| Mode switcher | Preparar / Rodar / Recap | `ModeNav` → rotas `/prep`, `/run`, `/recap` | `g p` / `g r` / `g c` (Gmail-like) |
| Sidebar contextual | "Próxima Sessão", "Quests" etc | `SurfaceNav` | — |
| Collapse button | ◀ ▸ | — | — |
| Notificações | 🔔 (badge numérico) | `NotificationBell` | — |
| User menu | avatar + dropdown (Perfil / Sair) | `UserMenu` | — |

**Vocabulário banido** (resolve BL-5):
- ❌ "Mode switcher" → UI não diz isso, só mostra 3 ícones com label
- ❌ "Surface" → UI diz "seção" apenas em doc interno; user vê só o nome da coisa
- ❌ "Command palette" → UI diz "Buscar rápida"
- ❌ "Retro" → UI diz "Recap" ou "Depois da Sessão"
- ❌ "Shell", "chrome" — só código interno
- ❌ "JTBD" — nunca vaza pra UI ou help

**Atalhos** (resolve Edge Case §8 / requisito novo #11):
- `Ctrl+K` (Win) / `⌘K` (Mac) → Busca rápida
- `g p` → Ir pra Preparar
- `g r` → Ir pra Rodar (se combate ativo)
- `g c` → Ir pra Recap (c de Contar, ou Chronicles)
- `?` → Mostrar atalhos
- `Esc` → Fechar modals/search

### 6.3 Responsividade

| Breakpoint | Sidebar | Mode switcher |
|---|---|---|
| Desktop ≥ 1024px | Vertical persistente (80-220px colapsável) | **Vertical no topo da sidebar** (decisão travada — padrão Slack/Discord) |
| Tablet 768-1023px | Colapsada default (80px, só ícones) | Vertical (3 ícones) |
| Mobile < 768px | Sidebar vira **drawer** (hamburger no topbar) | **Bottom tab bar** fixo (respeitar `safe-area-inset-bottom`) |

**Rationale** (decisão travada): mode switcher **vertical em desktop/tablet** (3 ícones grandes, labels no hover), **bottom tab bar em mobile** (thumb-zone friendly, padrão iOS/Android). Mesmo 3 modes, duas renderizações — não duplica lógica, só CSS responsivo.

**Mobile bottom tab bar:**
```
┌──────────────────────────────────────┐
│                                      │
│         CONTEÚDO DO MODO             │
│                                      │
│                                      │
├──────────────────────────────────────┤
│ [🛠 Prep] [⚔️ Mesa] [📖 Recap]     │  ← tab-bar bottom (+ safe-area)
└──────────────────────────────────────┘
```

Surfaces no mobile: drawer lateral acionado pelo título do mode ou via botão 🔍.

---

## 7. Wireframes low-fi

### W0a — Dashboard vazio (0 campanhas, primeiro login) ← resolve BL-4

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo] Pocket DM              🔍 (Ctrl+K)           🔔 [D] ▾       │
├──────────┬──────────────────────────────────────────────────────────┤
│ 📋 Camp. │                                                          │
│ 🎲 Comb. │                                                          │
│ 👥 Pers. │              Bem-vindo, Dani!                           │
│ 📚 Comp. │                                                          │
│          │        Você ainda não tem campanhas.                    │
│          │                                                          │
│          │      ┌─────────────────────────────────┐               │
│          │      │                                 │               │
│          │      │    🎲 Criar nova campanha       │               │
│          │      │                                 │               │
│          │      │    Como Mestre: crie e convide  │               │
│          │      │    até 6 jogadores              │               │
│          │      │                                 │               │
│          │      │    [ Começar ▶ ]                │               │
│          │      └─────────────────────────────────┘               │
│          │                                                          │
│          │      ──── OU ────                                       │
│          │                                                          │
│          │      Tem um convite do Mestre? Cole o link:             │
│          │      [ ___________________ ] [Entrar]                   │
│          │                                                          │
│          │      🎬 Ver como funciona (tour 2min)                  │
└──────────┴──────────────────────────────────────────────────────────┘
```
**Inspiração:** Notion signup + Linear onboarding. 1 ação primária, 1 alternativa, 1 tour.

### W0b — Campaign HQ vazia (campanha recém-criada, Preparar mode) ← resolve BL-4

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo] Minha Campanha ▾      🔍 (Ctrl+K)             🔔 [D] ▾       │
├──────────┬──────────────────────────────────────────────────────────┤
│ 🛠 Prep  │  🎉 Campanha criada! Vamos preparar a primeira sessão? │
│ ⚔️ Mesa  │                                                          │
│ 📖 Recap│  ┌─ PASSO 1 ─────────────────────────────────────────┐ │
│          │  │ Convide seus jogadores (ou pule e faça depois) │ │
│ Próxima  │  │ [ + Convidar por link ]  [ + Convidar por email]│ │
│ Quests   │  └───────────────────────────────────────────────────┘ │
│ NPCs     │                                                          │
│ Locais   │  ┌─ PASSO 2 ─────────────────────────────────────────┐ │
│ Facções  │  │ Marque a primeira sessão                         │ │
│ Notas    │  │ [📅 Quando? ] [ ✍ Dar nome ] [ Salvar ]         │ │
│ Mapa M.  │  └───────────────────────────────────────────────────┘ │
│ Trilha   │                                                          │
│          │  ┌─ PASSO 3 ─────────────────────────────────────────┐ │
│          │  │ Comece a preencher o mundo                       │ │
│          │  │ [+ NPC]  [+ Local]  [+ Facção]  [+ Quest]       │ │
│          │  │                                                   │ │
│          │  │ 💡 Dica: você pode usar templates do compêndio  │ │
│          │  └───────────────────────────────────────────────────┘ │
│          │                                                          │
│          │  🎬 Tour do modo Preparar (30s)  [Pular ×]              │
└──────────┴──────────────────────────────────────────────────────────┘
```
**Inspiração:** Notion "getting started" + Linear "Your first project". 3 passos **não obrigatórios**, com tour opcional.

### W1 — Mestre / Preparar / Próxima Sessão (desktop 1440) — density budget reduzido

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo] Krynn ▾    🔍 (Ctrl+K)        Sess. 12 em 2 dias   🔔 [D]  │
├──────────┬──────────────────────────────────────────────────────────┤
│ 🛠 Prep  │ ┌─ PRÓXIMA SESSÃO — #12 "Masmorra do Dragão" ─── [✎] ─┐│
│ ⚔️ Mesa  │ │ 📅 Sex, 25/Abr · 20h                                 ││
│ 📖 Recap│ │ 🎯 Grupo persegue o dragão fugido                    ││
│ ─────    │ └──────────────────────────────────────────────────────┘│
│▸ Próxima│                                                           │
│ Quests   │  PREPARADO            PENDENTE                           │
│ NPCs     │  ✅ Encontro: Kobolds  ⬜ Boss final                     │
│ Locais   │  ✅ NPC: Grolda        ⬜ Recap sess. 11                 │
│ Facções  │                                                           │
│ Notas    │  [ + Adicionar item ▼ ]                                  │
│ Mapa M.  │                                                           │
│ Trilha   │                                                           │
│ ◀ ▸     │  (resto scrollable: atividade recente, NPCs editados)    │
└──────────┴──────────────────────────────────────────────────────────┘
```
**Density:** 8 elementos clicáveis no above-the-fold (era 14 na v0.1). Quick add unificado em dropdown. Remove as 4 barras dourada vazias ("Saúde da Campanha 100/100"). Remove os 4 stats 2×2.

### W2 — Mestre / Rodar / Combate ativo (desktop 1440) — painéis colapsáveis

```
┌─────────────────────────────────────────────────────────────────────┐
│ ⚔️ Krynn · Combate: Quick Encounter · Round 3      [Pausar] [Sair] │
├──────────┬──────────────────────────────────────────────────────────┤
│ 🛠🔒    │  INICIATIVA (vez: Satori)     [⚡ Próx. turno]           │
│▸⚔️ Mesa │  ┌──────────────────────────┐                            │
│ 📖🔒    │  │ ▶ Satori   [83/83] AC23 │  [▼ ver cena]              │
│ ─────    │  │   Goblin 1 [18/18] AC12 │  [▼ ver ações do turno]   │
│ Combate  │  │   Torin    [86/86] AC22 │  [▼ chat/roll]            │
│ Party    │  │   Goblin 2 [ 5/18] AC12 │  [▼ nota rápida]          │
│ Cena     │  │   Kai      [71/71] AC14 │                            │
│ Quest    │  │   Dragão   [120/200]    │  💡 Expand só o que       │
│ ➕       │  └──────────────────────────┘      você precisa agora   │
│          │                                                           │
│          │  [+ Adicionar monstro] [+ Adicionar PC]                  │
└──────────┴──────────────────────────────────────────────────────────┘
```
**Density:** 30+ elementos na v0.1 → **8 visíveis + 4 colapsáveis** na v0.2. Inspiração corrigida: **Foundry usa painéis colapsáveis por padrão**, v0.1 tinha copiado errado. Sidebar mostra **🔒** nos outros modes (BL-1 read-only lock).

### W3 — Mestre / Preparar / Mapa Mental (desktop 1440) ← fix F-12 + F-13

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo] Krynn ▾       🔍 (Ctrl+K)                         🔔 [D]    │
├──────────┬──────────────────────────────────────────────────────────┤
│ 🛠 Prep  │  MAPA MENTAL                                             │
│          │  ┌─────────────────────────────────────────────────────┐│
│          │  │ Filtrar: [✓ NPCs] [✓ Locais] [✓ Quests] [ ] Notas ││
│ Próxima  │  │ Layout: [ Hierárquico ▾ ]  [ ⊞ Ajustar ] [ ⊙ Reset]││
│ Quests   │  │                                                     ││
│ NPCs     │  │ Legenda: ● NPC  ▲ Local  ⬢ Quest  ■ Facção        ││
│ Locais   │  │                                                     ││
│ Facções  │  │          ╔══════╗                                  ││
│ Notas    │  │          ║KRYNN║                                   ││
│▸Mapa M. │  │          ╚╤════╤╝                                  ││
│ Trilha   │  │    ┌─────┘    └────┐                              ││
│          │  │    ▼              ▼                                ││
│          │  │ [▲ Cavernas]  [● Grolda]   [⬢ Caça ao Dragão]    ││
│          │  │                                                     ││
│          │  │ [Click num node → painel direito com detalhes]    ││
│          │  └─────────────────────────────────────────────────────┘│
│          │                                                           │
│ ◀ ▸     │  💡 Nodes com ≥2 conexões ficam em destaque              │
└──────────┴──────────────────────────────────────────────────────────┘
```
**Melhorias v0.2:**
- Labels **sempre visíveis** ao lado do node (fix F-12)
- Legenda de cor explícita (fix F-13)
- Layout button com "Ajustar" (auto-fit inicial)
- Reset zoom sempre acessível
- Hint visual pra descoberta

### W4 — Player / Minha Jornada (desktop 1440) ← sem chat no caso anônimo

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo] Curse of Strahd ▾ · Mestre: lucasgaluppo17    🔍       🔔 [D]   │
├──────────┬──────────────────────────────────────────────────────────┤
│ 📖 Jorn.│  ⚠ O MESTRE INICIOU O COMBATE                            │
│ (auto→  │  [Entrar no combate ▶]   (banner único — fim da triplicata)│
│  Assist.│                                                           │
│  se     │  MEU PERSONAGEM                                           │
│  ativo) │  ┌───────────────────────────────────────────────────┐   │
│ ─────    │  │ Capa Barsavi · Half-Elf Clérigo/Sorcerer · Nv 10 │   │
│ Pers.    │  │ ████████████████████████████  88/88   AC 21     │   │
│ Última   │  │ [Abrir ficha completa ▶]                          │   │
│ Próxima  │  └───────────────────────────────────────────────────┘   │
│ Quests   │                                                           │
│ Notas    │  ÚLTIMA SESSÃO (3 dias)       PRÓXIMA SESSÃO             │
│ Party    │  "Masmorra do Dragão"         Sex 25/Abr · 20h          │
│          │  O grupo encontrou a          📍 Cavernas de Krynn       │
│          │  espada +2, Grolda pediu      ⚠ Trazer ficha impressa   │
│          │  ajuda... [Ler recap ▶]                                  │
│          │                                                           │
│          │  QUESTS ATIVAS (2)            MINHAS NOTAS               │
│          │  • Destruir o dragão          • "Grolda mentiu sobre..." │
│          │  • Achar o Culto Negro        [+ Nova nota]              │
│          │                                                           │
│          │  PARTY (5)                                                │
│          │  ● Daniel (Você — Capa Barsavi)  ← fix F-15: "Você"     │
│          │  ● Torin · Half-Elf Druid · Nv5                          │
│          │  ⚠ 3 fichas incompletas — [Pedir pros outros jogadores]  │
└──────────┴──────────────────────────────────────────────────────────┘
```
**Fixes específicos:**
- F-07: banner único (remove card verde + CTA duplicado)
- F-15: "Party" em vez de "Companheiros"; você primeiro com "Você"
- F-14: indicador de fichas incompletas + CTA pro Mestre pedir
- F-05: se player vê Quests, empty state diz "Seu mestre ainda não criou quests" (não "Crie a primeira")

### W5 — Mestre / Preparar / Mobile 390 ← fix F-01 + F-17

```
┌─────────────────────────────┐
│ ☰  Krynn · Prep         [D] │
├─────────────────────────────┤
│                             │
│  PRÓXIMA SESSÃO #12         │
│  "Masmorra do Dragão"       │
│  📅 Sex 25/Abr · 20h        │
│  🎯 Grupo persegue o dragão │
│                             │
│  PREPARADO (2)              │
│  ✅ Encontro: Kobolds       │
│  ✅ NPC: Grolda             │
│                             │
│  PENDENTE (2)               │
│  ⬜ Encontro boss           │
│  ⬜ Recap sess. 11          │
│                             │
│  [ + Adicionar item ▼ ]     │
│                             │
│                             │
├─────────────────────────────┤
│ 🛠 Prep  ⚔️ Mesa  📖 Recap │  ← tab bar + safe-area
└─────────────────────────────┘
```

### W6 — Mestre / Rodar / Mobile 390 (NOVO v0.2)

```
┌─────────────────────────────┐
│ ⚔️ Round 3 · Satori    [X] │  ← X sai do combate
├─────────────────────────────┤
│ INICIATIVA                  │
│ ▶ Satori    [83/83] AC23  │
│   Goblin 1  [18/18] AC12  │
│   Torin     [86/86] AC22  │
│   Goblin 2  [ 5/18] AC12  │
│   Kai       [71/71] AC14  │
│                             │
│ [▼ Expandir ação do turno]  │
│ [▼ Cena + NPCs]             │
│ [▼ Quick add]               │
│                             │
│ ┌─────────────────────────┐ │
│ │ [⚡ Próximo turno]      │ │  ← CTA grande, thumb zone
│ └─────────────────────────┘ │
│                             │
├─────────────────────────────┤
│ 🛠🔒 ⚔️ Mesa 📖🔒        │
└─────────────────────────────┘
```
**Princípio:** thumb-zone friendly. "Próximo turno" é o botão primário sempre visível. Outros paineis colapsados por padrão.

### W7 — Player / Assistindo / Mobile 390 (NOVO v0.2)

```
┌─────────────────────────────┐
│ 👁️ Combate · Round 3       │
├─────────────────────────────┤
│ SUA VEZ EM 2 TURNOS         │
│                             │
│ VOCÊ — Capa Barsavi         │
│ ██████████  88/88           │
│                             │
│ TURNO ATUAL                 │
│ Satori (aliado)             │
│                             │
│ INICIATIVA                  │
│ ▶ Satori    [83/83]        │
│   Goblin 1  [18/18]        │
│ ► Você      [88/88]   ← ★  │
│   Torin     [86/86]        │
│   Goblin 2  [ 5/18]        │
│   Kai       [71/71]        │
│                             │
│ [📖 Minha ficha]            │
│ [✎ Anotar algo]             │
│                             │
├─────────────────────────────┤
│ (auto-sticky, sem tab bar)  │
└─────────────────────────────┘
```

### W8 — Mestre / Recap (desktop 1440) (NOVO v0.2)

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Logo] Krynn ▾    🔍                               🔔 [D]          │
├──────────┬──────────────────────────────────────────────────────────┤
│ 🛠 Prep  │  📖 RECAP — Sessão 12 (terminou há 2h)                   │
│ ⚔️ Mesa  │                                                           │
│▸📖 Recap│  ESCREVA O QUE ACONTECEU (o player vai ler)              │
│ ─────    │  ┌────────────────────────────────────────────────────┐  │
│ Última   │  │ # Masmorra do Dragão                               │  │
│ Recap    │  │                                                    │  │
│ Timeline │  │ O grupo [[Torin]] e [[Capa Barsavi]] desceram nas  │  │
│ Números  │  │ [[Cavernas]] e encontraram [[Grolda]]...           │  │
│ Notas Mestre │  │                                                    │  │
│          │  │ 💡 `[[nome]]` cria link automático (backlinks)    │  │
│          │  └────────────────────────────────────────────────────┘  │
│          │  Tags: #masmorra #dragão                                  │
│          │                                                           │
│          │  NÚMEROS DISCRETOS                                        │
│          │  ⏱ 2h 14min · ⚔ 2 combates · 🎲 47 rolagens              │
│          │  (expandir só se tiver ≥3 sessões — F-10 fix)            │
│          │                                                           │
│          │  [📤 Publicar pros jogadores]  [Salvar rascunho]         │
└──────────┴──────────────────────────────────────────────────────────┘
```

---

## 8. Fechando findings ignorados pela v0.1

### F-09 — Sessões sem identidade ("Quick Encounter" × 5)
**Fix v0.2:** sessão nasce com:
- **Nome default contextual:** `"Sessão {N} — {data_curta}"` (ex: "Sessão 13 — 25 Abr")
- **Campo editável** inline no card da sessão (hover → ✎)
- **Regra:** se nome default sobreviver **3 dias após sessão terminar**, trigger sutil "Quer dar um nome a essa sessão?" no Recap

### F-14 — Players sem raça/classe/nível
**Fix v0.2:** card de player em W4 tem estado:
- **Completo:** nome + raça + classe + nível + HP + AC
- **Incompleto:** nome + indicador `⚠ ficha incompleta` + CTA (só Mestre vê) "Pedir pro {nome} completar"
- Sistema envia notificação pro player com link direto pra `/ficha/{id}`

### F-15 — "Companheiros (1)" = o próprio jogador
**Fix v0.2 (em W4):**
- Rename: "Companheiros" → **"Party"**
- Sempre mostra **você primeiro** com badge "Você"
- Se `count === 1 && único === self`: accordion mostra texto "Você está sozinho por enquanto. O mestre pode convidar mais jogadores em Preparar > Party."

### F-16 — "Por facção" dropdown cortado mobile
**Fix v0.2:** em mobile, sub-filtros ficam **dentro de um botão "Filtros"** que abre bottom-sheet. Elimina dropdown horizontal que corta.

### F-21 — Card misterioso "Pocket DM (Beta)"
**Fix v0.2:** investigado — é badge do compêndio SRD mostrando "origem" do monstro. **Rename pra "SRD 5.1"** (consistente com CLAUDE.md SRD Compliance). Mover pra tooltip em vez de card-footer.

### F-22 — HP "—" em personagens na aba Encounters
**Fix v0.2:** regra de display:
- Se `current_hp` é null/undefined → mostrar `max_hp/max_hp` (default cheio)
- Se `current_hp === max_hp` → mostrar apenas `max_hp` (reduz ruído)
- Se `current_hp < max_hp` → mostrar `current/max` com cor (verde/laranja/vermelho via `getHpStatus`)

---

## 9. Findings parcialmente endereçados — gaps cobertos

### F-06 (role-gating unificado)
**Fix v0.2:** Criar **único array fonte-da-verdade** em `lib/types/campaign-hub.ts`:
```typescript
export const SURFACES: SurfaceDef[] = [
  { id: 'next-session', label: 'Próxima Sessão', mode: 'preparar', roles: ['dm'] },
  { id: 'quests', label: 'Quests', mode: 'preparar', roles: ['dm', 'player-auth', 'player-anon'] },
  // ...
]
```
Sidebar (Mestre + Player) consome **o mesmo array** com filter `by mode + role + auth`. Zero duplicação.

### F-10 (stats vazios)
**Fix v0.2:** panel "Números" em Recap só aparece **após ≥3 combates finalizados**. Até lá, mostra "Estatísticas aparecem depois da 3ª sessão rodada".

### F-11 (sub-tabs internas)
**Fix v0.2:** padrão único pra todas as listas (NPCs, Quests, Locais, Sessões):
- Busca inline (sempre visível no topo da surface)
- Filtros em **chips removíveis** (não sub-tabs): `[× Ativas]  [× Tag: dragão]  [+ Adicionar filtro]`
- Views salvas (Notion-like): `[Ativas + Tag:dragão ▾]` como preset do usuário

### F-12 (mindmap ilegível) + F-19 (stats caixa alta mobile)
**Fix v0.2:** já coberto em W3 e W8 respectivamente.

---

## 10. Killer-features competitivas (1 por referência)

Proposta v0.2 compromete-se a **1 killer-feature por ref** até Fase C:

### 10.1 Notion → **Backlinks automáticos com `@`**
- Digitar `@` dispara autocomplete com NPCs, Locais, Quests, Sessões
- Selecionar cria chip-link → clica abre ficha da entidade
- Ficha da entidade mostra automaticamente "Menções (3): [Sessão 11], [Sessão 12], [Nota: segredo]"
- **Sintaxe primária: `@nome` (decisão travada — padrão Notion-like, mais familiar que `[[]]`)**
- `[[nome]]` aceito como sintaxe alternativa pra quem vem de Obsidian (parser suporta os dois, UI mostra `@`)
- **Já tem no schema parcial** — precisa UI de autocomplete + parser inline

### 10.2 Obsidian → **Tags com autocomplete**
- Tags em `#masmorra #dragão` em qualquer entidade
- Tag page: `/tags/masmorra` lista tudo tagged
- Autocomplete ao digitar `#`
- Filter chips usam tags (§9 F-11)

### 10.3 Foundry → **Permissões granulares**
- Player edita **sua própria ficha** (HP, spells, inventory) — não dos outros
- Mestre **vê todas**; player vê só a sua + "vistas do público" de NPCs/Locais
- Mapa Mental tem view "só compartilhado com players" — Mestre filtra o que vira público

### 10.4 Roll20 → **Handout drop**
- Mestre em Rodar arrasta imagem/link pra uma zona "Mostrar pros players"
- Player em Assistindo vê handout aparecer como toast + fica no accordion "Última sessão > Handouts"
- Imagens no Supabase Storage, link compartilhado

### 10.5 Soundboard — onde mora?
- **Preparar:** sidebar item "Trilha" — Mestre curador (cria playlists por mood)
- **Rodar:** controle rápido como chip no topo do Rodar (play/pause + mood switcher)
- **Player Assistindo:** vê mood atual em forma de label ("🎵 Taverna tranquila") — não áudio, só contexto narrativo. Opcional: áudio streamed se auth + player optou.

---

## 11. Densidade visual + tipografia

### 11.1 Density budget

| Wireframe | v0.1 elementos | v0.2 target | Status |
|---|---|---|---|
| W1 (Preparar) | 14 | ≤8 above fold | ✅ reduzido |
| W2 (Rodar) | 30+ | ≤8 visíveis + 4 colapsáveis | ✅ painéis collapse |
| W3 (Mapa) | N/A | labels sempre visíveis | ✅ |
| W4 (Player) | 10 | ≤9 | ✅ banner unificado |

### 11.2 Tipografia

| Uso | Fonte | Peso | Tamanho desktop | Tamanho mobile |
|---|---|---|---|---|
| Nome de campanha / NPC / Local (títulos narrativos) | **Serif** (Cinzel ou similar) | 600 | 24-32px | 20-24px |
| H1 de surface ("Próxima Sessão") | Sans | 600 | 20px | 18px |
| Body / descrições | Sans | 400 | 14-15px | 14px |
| Labels de form / badges | Sans caps | 500 | 11px | 11px |
| HP/AC numbers (combat) | **Mono tabular** | 600 | 16px | 16px |

**Regra:** serif **só** em nomes próprios (campanhas, NPCs, locais, facções). Todo o resto é sans. Isso mata o barulho visual dos H1 caixa alta serif (F-19).

### 11.3 Escala de spacing

Escala padrão: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64` (Tailwind default). Qualquer spacing fora disso é bug visual.

---

## 12. Acceptance criteria dos requisitos novos

Auditor identificou 11 requisitos novos sem AC. Aqui estão os critérios testáveis:

| # | Requisito | Critério de aceite (testável) |
|---|---|---|
| 1 | Mode switcher | ✅ Mestre em Preparar vê APENAS surfaces de Preparar; clicar Rodar troca sidebar sem recarregar página; URL reflete mode (`/campaigns/X/preparar`); aria-live anuncia mudança |
| 2 | Busca rápida (Ctrl+K) | ✅ Abre em qualquer surface; busca campanha-escopada (NPC + Quest + Local + Nota + Comando); atalho Ctrl+K (Win) / ⌘K (Mac); mobile tem ícone 🔍 no topbar |
| 3 | Rotas segmentadas | ✅ `/app/campaigns/[id]/preparar/npcs` resolve; `?section=X` antigo redireciona 301 por 90 dias; back-button funciona; sitemap preserva SEO interno |
| 4 | Sidebar persistente vs bottom-sheet mobile | ✅ Desktop ≥1024: sidebar visível colapsável; Mobile <768: hamburger drawer + bottom tab bar; Tablet 768-1023: sidebar colapsada default |
| 5 | Quick add unificado | ✅ Dropdown único `[+ Adicionar item ▼]` com todas opções; cria item e volta pra Preparar sem perder contexto; suporta atalho `N` |
| 6 | "Cena" panel em Rodar | ✅ **Requisito de schema:** `npcs_in_scene` (joint table), `npc.mood` (enum), `npc.can_flee_at_round` (number nullable); se schema não existe → implementar antes |
| 7 | Watch mode auto-forçado | ✅ Server state `combat.active === true` dispara `resolveMode()` retornando 'assistindo'; banner "Voltar pra Minha Jornada" se player quiser opt-out (exceto se Mestre proibir no combat settings) |
| 8 | Notas do Mestre em Recap | ✅ `notes.visibility === 'dm-only'` — não aparece em player view; tem ícone 🔒; auditable |
| 9 | Timeline em Recap | ✅ **Escopo MVP:** linha do tempo de eventos capturados: combate iniciou/terminou, quest mudou status, NPC adicionado, nota escrita. Auto-gerado. Data + label. Click → abre item |
| 10 | Feature flag `CAMPAIGN_HQ_V2` | ✅ Flag off volta `CampaignNavBar` antigo; A/B com 5 Mestres tracking: tempo-pra-preparar-sessão, taxa-de-retorno-semana-1, NPS qualitativo |
| 11 | Atalhos `g p/r/c` + ARIA | ✅ Mode switcher tem `role="tablist"`, cada mode `role="tab"` + `aria-selected`; atalhos Gmail-like; `?` abre help de atalhos |

---

## 13. Decisões travadas (v0.2 não reabre)

1. ✅ **Eliminar pill bar horizontal**
2. ✅ **Shell unificado Mestre + Player**
3. ✅ **Mode switcher > pill bar**
4. ✅ **Busca rápida (Ctrl+K)** é first-class
5. ✅ **Empty states têm copy por role**
6. ✅ **1 CTA dominante por combate ativo**
7. ✅ **Mode é stateless derivado do server (BL-3)**
8. ✅ **Matriz Surface × Auth explícita (BL-2)**
9. ✅ **Read-only lock em Prep/Recap durante combate (BL-1)**
10. ✅ **Labels PT-BR na UI** (Preparar, Rodar, Recap; nunca "mode switcher", "surface", "retro")
11. ✅ **Ctrl+K primário, ⌘K alternativa Mac** (Dani é Windows)
12. ✅ **Density budget: ≤8 elementos above-fold em W1; W2 usa painéis colapsáveis**
13. ✅ **Serif só em nomes próprios; sans pra tudo mais**
14. ✅ **4 killer-features competitivas committed (backlinks, tags, permissões, handouts)**
15. ✅ **Soundboard: Preparar curadoria + Rodar controle rápido + Player contexto narrativo**
16. ✅ **Rotas EN curto:** `/app/campaigns/[id]/prep`, `/run`, `/recap` — label PT-BR só na UI, code path em inglês (SEO/bookmark-friendly)
17. ✅ **Player anônimo vê Minha Jornada light** (ficha + última + quests read-only via token) + Assistindo simplificado (sem chat). Rodapé persistente: `Crie conta pra salvar notas`
18. ✅ **Mode switcher vertical em desktop/tablet + bottom tab bar em mobile** (Slack/Discord desktop; iOS/Android mobile)
19. ✅ **Tour do W0b é dismissable com "Pular" visível** — não trava onboarding
20. ✅ **Backlinks: `@nome` primário** (Notion-like, familiar) + `[[nome]]` aceito como alternativa. Parser suporta os dois, UI sempre renderiza como chip
21. ✅ **Mode enum canônico (revisado 2026-04-21 v0.3):** code = `type Mode = 'prep' | 'run' | 'recap' | 'journey'` (EN — **4 modes, watch removido**). Labels user-facing (PT-BR fixo nos 2 locales): **"Preparar Sessão"** (prep), **"Rodar Combate"** (run), **"Recaps"** (recap), **"Minha Jornada"** (journey). Rotas: `/prep`, `/run`, `/recap`, `/journey`. `resolveMode()` retorna uma das 4 strings EN. Mestre tem 3 modes (prep, run, recap). Jogador tem 1 mode (journey).
22. ✅ **HP tiers canônicos (legacy thresholds):** `FULL` = 100% · `LIGHT` = 70-100% (exclusivo em ambos lados) · `MODERATE` = 40-70% · `HEAVY` = 10-40% · `CRITICAL` = 0-10%. Labels EN nos 2 locales (memory `feedback_hp_tier_labels.md`). Single source-of-truth: `lib/utils/hp-status.ts` (`HP_STATUS_STYLES` + `formatHpPct`). Flag `ff_hp_thresholds_v2` shifta para 75/50/25 quando ON.
23. ✅ **Watch mode REMOVIDO** (2026-04-21). Player não tem mais auto-switch durante combate. Em vez disso, na surface "Minha Jornada" aparece **banner sticky topo** "O Mestre iniciou o combate — [Entrar no Combate]" + push notification (PWA). Click navega pra `/app/combat/[id]` (tela de combate **existente**, não nova surface). Simplifica MVP, reduz complexidade de realtime state, alinha com como Roll20/Foundry funcionam. Trade-off aceito: player precisa engajar voluntariamente — mitigado por banner gritante + notificação.
24. ✅ **Wiki do Jogador em "Minha Jornada":** surface "Minhas Notas" expandida pra mini-wiki estilo Obsidian — markdown editor + tags (`#aliado #segredo`) + busca por tag. **MVP v1.0:** sem backlinks. **v1.5:** backlinks `@` com autocomplete **filtrado por visibility** (jogador NUNCA referencia entidades hidden). Schema novo `player_notes(id, player_id, campaign_id, content_md, tags[], created_at, updated_at)` em `schema-investigation-winston.md` (M8).
25. ✅ **Quests atribuíveis — usar entity graph existente:** confirmado em `supabase/migrations/080_mind_map_edges.sql` + 148. A tabela `campaign_mind_map_edges` já suporta 9 entidades × 18 relationships polimórficas. Atribuições via edges:
    - `edges(player → quest, rel='participated_in')` — jogador atribuído
    - `edges(quest → location, rel='happened_at')` — local da quest
    - `edges(npc → quest, rel='gave_quest')` — NPC quest-giver
    - `edges(faction → quest, rel='allied_with'/'enemy_of')` — facção ligada
    **ZERO tabelas novas.** UI: quest card mostra chips dos edges (auto-populated). Jogador vê suas quests destacadas via query `edges where source='player' and source_id=me and target_type='quest'`. MVP = só UI nova; schema 100% pronto. Ver [schema-investigation-winston.md §1](../../architecture/schema-investigation-winston.md).
26. ✅ **Modes separados por papel:** `prep` / `run` / `recap` são **só do Mestre**. `journey` é **só do Jogador**. Nunca há sobreposição. Sidebar do Mestre mostra 3 modes; sidebar do Jogador mostra 1 mode (sem switcher visível — só o conteúdo da journey direto).

---

## 14. Plano de ataque revisado

### Fase A (1–2 dias) — quick wins pré-redesign (mantido da v0.1)
1. 🔴 F-02: i18n key `campaign.player_hq_button` (1h)
2. 🔴 F-04: role-gate sidebar player (2h)
3. 🟠 F-05: empty state Quest condicional (1h)
4. 🟠 F-07: remover CTA duplicado (2h)
5. 🟠 F-08: renomear "Histórico" → "Sessões" + split (3h)
6. 🟡 F-17, F-18: padding mobile (1h)
7. **NOVO:** F-09 naming default + editável (3h)
8. **NOVO:** F-15 rename "Companheiros" → "Party" + regra count-1 (2h)

### Fase B (1 sprint) — shell novo
1. Build shell unificado (Topbar + Sidebar + Mode switcher + bottom tab mobile) behind flag `CAMPAIGN_HQ_V2`
2. Array fonte-da-verdade `SURFACES[]` com filter by mode/role/auth
3. Implementar `resolveMode()` server-driven
4. Wireframes W0a, W0b, W1, W4, W5 migrados pro flag on
5. A/B com 5 Mestres (incluindo Dani)

### Fase C (2 sprints) — Rodar + Recap + killer-features
6. Rodar mode completo com painéis colapsáveis (W2 + W6)
7. Recap editor com backlinks e tags (W8) — **killer-feat 10.1 + 10.2**
8. Handout drop em Rodar — **killer-feat 10.4**
9. Permissões granulares em Party — **killer-feat 10.3**
10. Mindmap polish (W3) — F-12/F-13

### Fase D (1 sprint) — cleanup
11. Remover pill bar antiga (`CampaignNavBar`)
12. Remover surfaces duplicadas
13. Busca rápida (Ctrl+K) expandida com comandos ("add quest", "go to NPC")
14. Observability: tracking tempo-pra-preparar-sessão + NPS

**Estimativa total:** 4-5 sprints. Fase A mata 8 blockers/highs em <3 dias.

---

## 15. Riscos atualizados

- **Winston:** schema mudanças (req #6 — humor do NPC, npcs_in_scene) precisam de migration. Recomendação: spike de schema na Fase B antes de Fase C.
- **Sally:** mode "Recap" pode ser mal usado se Mestre nunca escreve recap. Recomendação: badge "Sessão sem recap" no Preparar próxima sessão, sutil nudge.
- **Mary:** Foundry + Roll20 têm comunidade forte; competir diretamente não é caminho. Pocket DM é **first-screen + second-brain + real-time thin client** — posicionamento diferente.
- **Quinn:** shell novo precisa regression suite visual (Playwright + screenshot compare) pra não quebrar Combat Parity + Resilient Reconnection. Adicionar ao plano Fase B.
- **John:** ROI — redesign grande competindo com features novas. Recomendação: Fase A (quick wins) **ship antes** — valida que usuários notam melhoria sem esperar redesign completo.

---

## 16. Próximos passos aprovados (2026-04-21)

**Todas as decisões abertas travadas (v14 → decisões 16-20 em §13).**

1. ✅ Schema investigation aberta pro Winston — ver [schema-investigation-winston.md](../../architecture/schema-investigation-winston.md)
2. ✅ Wireframes autorizados pro Figma via MCP — ordem W0b → W1 → W4 → W2 → W5

1. ✅/❌ — v0.2 fechou os 5 bloqueantes?
2. Decisões em aberto §14 (5 items): qual a preferência?
3. Schema mudanças (req #6): posso abrir issue de backend pra Winston investigar?
4. **Prioridade de wireframes pro Figma** (recomendo top 5):
   - 🥇 W0b (empty state Preparar) — maior impacto onboarding
   - 🥈 W1 (Preparar populada) — volume de uso
   - 🥉 W4 (Player Minha Jornada) — mais fácil de vender
   - 4️⃣ W2 (Rodar) — diferencial competitivo
   - 5️⃣ W5 (Prep mobile) — mobile-first para beta

Se tudo ✅, subo W0b + W1 + W4 pro Figma via MCP como primeira leva.
