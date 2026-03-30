# Epic: Área Logada Completa + Sistema Dual-Role de Campanhas

**Projeto:** Pocket DM
**Autor:** BMAD Team (PM + Architect + UX)
**Data:** 2026-03-29
**Status:** Pronto para Implementação
**Referência:** PRD V2 (`docs/prd-v2.md`), Architecture (`_bmad-output/planning-artifacts/architecture.md`)

---

## 1. Visão Geral

### O Problema

Hoje o Pocket DM trata todo usuário logado como "Mestre". A área logada é centrada no DM: campanhas que ele **possui**, sessões que ele **criou**, presets que ele **salvou**. Não existe uma experiência dedicada para o **Jogador logado** — quem entra via link/QR code é tratado como anônimo, mesmo tendo conta.

O campo `users.role` existe no banco (migration 022) com valores `player`, `dm`, `both`, mas **não tem efeito prático** — não altera a UI, não filtra dados, não muda permissões.

### A Solução

Uma conta no Pocket DM pode participar de **múltiplas campanhas em papéis diferentes**:

- **Mestre** na "Campanha do Dragão" → vê dashboard de DM, gerencia combate, cria sessões
- **Jogador** na "Mesa do João" → vê dashboard de jogador, acompanha combate, gerencia seu personagem
- **Mestre E Jogador** ao mesmo tempo → alterna entre contextos com um switcher

Isso é possível através de uma **tabela de membership** (`campaign_members`) que vincula `user_id` + `campaign_id` + `role`.

### Princípios de Design

1. **Uma conta, múltiplos contextos** — nunca forçar o usuário a ter duas contas
2. **O papel é por campanha, não global** — `users.role` vira apenas uma preferência de onboarding
3. **Progressão natural** — jogador anônimo → jogador com conta → jogador vinculado à campanha
4. **Zero fricção para o mestre** — a experiência atual do DM não pode regredir
5. **Anti-metagaming preservado** — jogador NUNCA vê dados numéricos de monstros (HP, AC, DC)

---

## 2. Modelo de Dados

### 2.1. Nova Tabela: `campaign_members`

```sql
-- migration: 032_campaign_members.sql
CREATE TABLE campaign_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('dm', 'player')),
  joined_at TIMESTAMPTZ DEFAULT now(),
  invited_by UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'banned')),
  UNIQUE(campaign_id, user_id) -- um user por campanha, um papel
);

CREATE INDEX idx_campaign_members_user ON campaign_members(user_id);
CREATE INDEX idx_campaign_members_campaign ON campaign_members(campaign_id);
CREATE INDEX idx_campaign_members_role ON campaign_members(campaign_id, role);

-- RLS
ALTER TABLE campaign_members ENABLE ROW LEVEL SECURITY;

-- Membros podem ver outros membros da mesma campanha
CREATE POLICY "Members can view campaign members"
ON campaign_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaign_members cm
    WHERE cm.campaign_id = campaign_members.campaign_id
    AND cm.user_id = auth.uid()
  )
);

-- DM da campanha pode gerenciar membros
CREATE POLICY "DM can manage campaign members"
ON campaign_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM campaigns
    WHERE campaigns.id = campaign_members.campaign_id
    AND campaigns.owner_id = auth.uid()
  )
);

-- Usuário pode sair de uma campanha (delete own membership)
CREATE POLICY "User can leave campaign"
ON campaign_members FOR DELETE
USING (user_id = auth.uid());
```

### 2.2. Seed do DM como Membro

```sql
-- Quando DM cria campanha, auto-inserir como member com role='dm'
-- Trigger na tabela campaigns:

CREATE OR REPLACE FUNCTION handle_new_campaign()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO campaign_members (campaign_id, user_id, role, status)
  VALUES (NEW.id, NEW.owner_id, 'dm', 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_campaign_created
  AFTER INSERT ON campaigns
  FOR EACH ROW EXECUTE FUNCTION handle_new_campaign();
```

### 2.3. Atualizar RLS de `campaigns`

```sql
-- Jogadores membros podem LER campanhas onde participam
CREATE POLICY "Members can read campaign"
ON campaigns FOR SELECT
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM campaign_members
    WHERE campaign_members.campaign_id = campaigns.id
    AND campaign_members.user_id = auth.uid()
    AND campaign_members.status = 'active'
  )
);
```

### 2.4. Atualizar RLS de `player_characters`

```sql
-- Jogadores podem ler e editar seus próprios personagens
CREATE POLICY "Players can manage own characters"
ON player_characters FOR ALL
USING (user_id = auth.uid());

-- Jogadores membros podem ver todos os PCs da campanha (para initiative board)
CREATE POLICY "Members can view campaign characters"
ON player_characters FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaign_members
    WHERE campaign_members.campaign_id = player_characters.campaign_id
    AND campaign_members.user_id = auth.uid()
    AND campaign_members.status = 'active'
  )
);
```

### 2.5. Atualizar RLS de `sessions`

```sql
-- Membros da campanha podem ver sessões da campanha
CREATE POLICY "Campaign members can view sessions"
ON sessions FOR SELECT
USING (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM campaign_members cm
    JOIN campaigns c ON c.id = sessions.campaign_id
    WHERE cm.campaign_id = c.id
    AND cm.user_id = auth.uid()
    AND cm.status = 'active'
  )
);
```

### 2.6. Atualizar `campaign_invites` Flow

Quando convite é aceito:
```sql
-- Função chamada quando jogador aceita convite
CREATE OR REPLACE FUNCTION accept_campaign_invite(invite_token UUID)
RETURNS VOID AS $$
DECLARE
  v_invite RECORD;
BEGIN
  SELECT * INTO v_invite FROM campaign_invites
  WHERE token = invite_token
    AND status = 'pending'
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite inválido ou expirado';
  END IF;

  -- Criar membership
  INSERT INTO campaign_members (campaign_id, user_id, role, invited_by)
  VALUES (v_invite.campaign_id, auth.uid(), 'player', v_invite.invited_by)
  ON CONFLICT (campaign_id, user_id) DO NOTHING;

  -- Marcar convite como aceito
  UPDATE campaign_invites SET status = 'accepted' WHERE id = v_invite.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.7. Diagrama ER (Relações Novas)

```
┌──────────┐     ┌──────────────────┐     ┌──────────┐
│  users   │────<│ campaign_members │>────│ campaigns│
│          │     │                  │     │          │
│ id       │     │ user_id (FK)     │     │ id       │
│ email    │     │ campaign_id (FK) │     │ owner_id │
│ role     │     │ role (dm/player) │     │ name     │
│ ...      │     │ status           │     │ ...      │
└──────────┘     └──────────────────┘     └──────────┘
      │                                        │
      │          ┌──────────────────┐          │
      └─────────<│player_characters │>─────────┘
                 │                  │
                 │ user_id (FK)    │
                 │ campaign_id (FK)│
                 │ name, hp, ac   │
                 └──────────────────┘
```

---

## 3. Rotas e Navegação

### 3.1. Estrutura de Rotas Atual vs. Nova

```
ATUAL (somente DM):
/app/dashboard          → Dashboard do Mestre
/app/campaigns/[id]     → Campanha (visão DM)
/app/session/[id]       → Sessão de combate (DM)
/app/session/new        → Nova sessão (DM)
/app/compendium         → Compendium (SRD)
/app/presets            → Presets de monstros
/app/settings           → Configurações
/app/onboarding         → Wizard de primeiro uso

NOVO (dual-role):
/app/dashboard          → Hub unificado (DM + Player)
/app/campaigns/[id]     → Campanha (visão DM ou Player, baseado no membership.role)
/app/campaigns/[id]/player → Visão explícita do jogador na campanha
/app/my-characters      → Meus personagens em todas as campanhas
/app/invites            → Convites pendentes
/join/[token]           → Join anônimo (mantém)
/invite/[token]         → Aceitar convite de campanha (mantém)
```

### 3.2. Dashboard Unificado (`/app/dashboard`)

```
┌─────────────────────────────────────────────┐
│  Pocket DM                    [🔔] [⚙] [👤] │
├─────────────────────────────────────────────┤
│                                             │
│  ⚔️ Minhas Mesas (como Mestre)              │
│  ┌─────────────┐ ┌─────────────┐           │
│  │ Campanha do  │ │ + Nova      │           │
│  │ Dragão       │ │ Campanha    │           │
│  │ 4 jogadores  │ │             │           │
│  │ Último: 2d   │ │             │           │
│  └─────────────┘ └─────────────┘           │
│                                             │
│  🎲 Minhas Mesas (como Jogador)             │
│  ┌─────────────┐ ┌─────────────┐           │
│  │ Mesa do João │ │ Mesa da     │           │
│  │ Thorin, Anão │ │ Ana         │           │
│  │ HP: 45/52    │ │ Lyra, Elfa  │           │
│  │ Sessão ativa │ │ Sem sessão  │           │
│  └─────────────┘ └─────────────┘           │
│                                             │
│  📩 Convites Pendentes (2)                  │
│  ┌─────────────────────────────────────┐   │
│  │ "Campanha Noturna" — convidado por  │   │
│  │ marcos@email.com  [Aceitar] [Recusar]│  │
│  └─────────────────────────────────────┘   │
│                                             │
│  ⚡ Combate Rápido (sem campanha)           │
│  [Iniciar Combate Rápido]                   │
│                                             │
└─────────────────────────────────────────────┘
```

**Regras de exibição:**
- Se `users.role = 'dm'` → mostra "Minhas Mesas (Mestre)" primeiro, "Jogador" abaixo
- Se `users.role = 'player'` → mostra "Minhas Mesas (Jogador)" primeiro, "Mestre" abaixo
- Se `users.role = 'both'` → mostra ambas, mestre primeiro (padrão)
- Se não tem nenhuma campanha como jogador → não mostra a seção
- Se não tem nenhuma campanha como mestre → mostra "Criar primeira campanha" CTA
- Convites pendentes sempre visíveis se houver

### 3.3. Visão da Campanha — Mestre (`/app/campaigns/[id]`)

Mantém a estrutura atual (spec M2) + adiciona:

```
┌─────────────────────────────────────────────┐
│ ← Dashboard    Campanha do Dragão    [⚙]   │
├─────────────────────────────────────────────┤
│                                             │
│  📊 Resumo                                  │
│  4 jogadores · 12 sessões · Último: 2d     │
│                                             │
│  👥 Jogadores                                │
│  ┌─────────────────────────────────────┐   │
│  │ Thorin (dani@email) ✅ Online       │   │
│  │ Lyra (ana@email) ⚪ Offline         │   │
│  │ Goblin (sem conta) 🔗 Convidar      │   │
│  │ + Adicionar Jogador                  │   │
│  │ + Convidar por Email                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  📝 Notas da Campanha                       │
│  [CampaignNotes — já especificado em M2.2] │
│                                             │
│  ⚔️ Sessões                                 │
│  [Nova Sessão] [Histórico]                  │
│                                             │
│  ⚔️ Combates Anteriores                     │
│  [EncounterHistory — já especificado M2.3]  │
│                                             │
└─────────────────────────────────────────────┘
```

### 3.4. Visão da Campanha — Jogador (`/app/campaigns/[id]`)

Quando o user é `player` naquela campanha (via `campaign_members`):

```
┌─────────────────────────────────────────────┐
│ ← Dashboard   Mesa do João    🟢 Sessão Ativa│
├─────────────────────────────────────────────┤
│                                             │
│  🧙 Meu Personagem                          │
│  ┌─────────────────────────────────────┐   │
│  │ Thorin Oakenshield                   │   │
│  │ Anão Guerreiro · Nível 5            │   │
│  │ HP: ████████░░ 45/52                │   │
│  │ AC: 18 · Spell DC: —               │   │
│  │                                      │   │
│  │ [Editar Personagem]                  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ⚔️ Sessão Ativa                            │
│  ┌─────────────────────────────────────┐   │
│  │ "Caverna do Dragão" — Round 3       │   │
│  │ É a vez de: Lyra                     │   │
│  │ Você é o próximo!                    │   │
│  │                                      │   │
│  │ [Entrar na Sessão]                   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  👥 Companheiros                             │
│  ┌─────────────────────────────────────┐   │
│  │ Lyra — HP: ██████████ 32/32         │   │
│  │ Ragnar — HP: ████░░░░ 18/40         │   │
│  │ (monstros: não exibidos)            │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  📜 Histórico de Combates                   │
│  Combate 1: 5 rounds · 3 monstros          │
│  Combate 2: 8 rounds · 2 monstros          │
│                                             │
└─────────────────────────────────────────────┘
```

**O que o jogador NÃO vê:**
- Notas do DM (`dm_notes`)
- Dados numéricos de monstros (HP, AC, DC)
- Configurações da campanha
- Gerenciamento de outros jogadores
- Presets de encontro

**O que o jogador VÊ:**
- Seu personagem (pode editar nome, mas HP/AC são gerenciados pelo DM em combate)
- HP dos aliados (números reais) — regra anti-metagaming não se aplica a PCs
- HP de monstros como labels (LIGHT/MODERATE/HEAVY/CRITICAL)
- Sessão ativa (link para entrar)
- Histórico de combates (resumo)

### 3.5. Navegação Principal (Atualizada)

```
Sidebar/Navbar:
├── 📊 Dashboard
├── ⚔️ Campanhas (dropdown)
│   ├── [Lista de campanhas — DM e Player]
│   └── + Nova Campanha
├── 📚 Compendium (mantém)
│   ├── Monstros
│   ├── Magias
│   ├── Itens
│   └── Condições
├── 📦 Presets (mantém, só para DMs)
├── 📩 Convites (badge com count)
└── ⚙ Configurações

Header direita:
├── 🔔 Notificações (sessão ativa, convites)
├── 🎭 Role Switcher (se role='both': "Mestre ↔ Jogador")
└── 👤 Perfil / Logout
```

---

## 4. Fluxos de Usuário

### 4.1. Fluxo: Jogador Recebe Convite e Entra na Campanha

```
DM clica "Convidar por Email" na campanha
├── Input: email do jogador
├── API: POST /api/campaign/[id]/invites
│   ├── Cria campaign_invites record (token, 7d expiry)
│   └── Envia email via Novu (campaign-invite workflow)
│
Jogador recebe email com link /invite/[token]
├── Se NÃO tem conta:
│   ├── Redirect: /auth/sign-up?invite=[token]&campaign=[id]
│   ├── Cria conta
│   ├── Seleciona role (player/dm/both)
│   ├── Auto-aceita convite via trigger
│   ├── Cria campaign_members record (role='player')
│   └── Redirect: /app/campaigns/[id] (visão jogador)
│
├── Se JÁ tem conta (logado):
│   ├── Mostra: "Fulano te convidou para 'Campanha X'"
│   ├── [Aceitar] → accept_campaign_invite(token)
│   │   ├── Cria campaign_members record
│   │   ├── Se tem player_characters pré-criados pelo DM → vincula user_id
│   │   └── Redirect: /app/campaigns/[id] (visão jogador)
│   └── [Recusar] → marca convite como 'expired'
│
├── Se JÁ tem conta (deslogado):
│   ├── Redirect: /auth/login?redirect=/invite/[token]
│   └── Após login → mesmo fluxo de "logado"
```

### 4.2. Fluxo: Jogador Anônimo → Jogador com Conta

```
Jogador entra via /join/[token] (link do QR)
├── Anon sign-in automático
├── Registra nome + iniciativa
├── Participa do combate
│
Combate termina ou jogador quer persistir
├── Banner: "Crie uma conta para salvar seu progresso"
├── [Criar Conta]
│   ├── /auth/sign-up?session=[session_id]
│   ├── Cria conta com email
│   ├── Auto-vincula session_token ao novo user
│   ├── Se sessão tem campaign_id:
│   │   ├── Cria campaign_members record (role='player')
│   │   ├── Vincula/cria player_character com user_id
│   │   └── Redirect: /app/campaigns/[campaign_id]
│   └── Se sessão SEM campaign:
│       └── Redirect: /app/dashboard
```

### 4.3. Fluxo: Mesma Conta como Mestre e Jogador

```
Usuário (role='both') acessa /app/dashboard
├── Seção "Minhas Mesas (Mestre)":
│   ├── Campanha A (owner) → click → /app/campaigns/A (visão DM)
│   └── Campanha B (owner) → click → /app/campaigns/B (visão DM)
│
├── Seção "Minhas Mesas (Jogador)":
│   ├── Mesa do João (member, role=player) → click → /app/campaigns/C (visão player)
│   └── Mesa da Ana (member, role=player) → click → /app/campaigns/D (visão player)
│
Detecção automática:
├── /app/campaigns/[id] verifica campaign_members
│   ├── Se role='dm' OU campaigns.owner_id = uid → renderiza DM view
│   └── Se role='player' → renderiza Player view
```

### 4.4. Fluxo: DM Cria Sessão e Jogadores Entram

```
DM acessa /app/session/new
├── Seleciona campanha (dropdown com player count)
├── Auto-carrega player_characters como combatants
├── Configura encontro (busca monstros, etc)
├── Inicia combate
├── ShareSessionButton → QR/Link para jogadores
│
Jogador LOGADO na campanha:
├── Dashboard mostra: "Sessão ativa na Mesa do João"
├── Notificação: "DM iniciou uma sessão!"
├── Click → /join/[session_token]
├── Auto-preenche dados do personagem (Story 3.3)
├── Entra no combate
│
Jogador ANÔNIMO (sem conta):
├── Escaneia QR ou clica link
├── /join/[token] → anon sign-in
├── Registra nome + stats manualmente
├── Participa do combate (fluxo atual)
```

---

## 5. Stories (Épicos)

### Epic A: Infraestrutura de Membership

| Story | Título | Prioridade | Esforço | Dependência |
|-------|--------|------------|---------|-------------|
| A.1 | Criar tabela `campaign_members` + trigger + RLS | P0 | 4h | — |
| A.2 | Seed memberships para campanhas existentes | P0 | 2h | A.1 |
| A.3 | Atualizar RLS de `campaigns`, `player_characters`, `sessions` | P0 | 4h | A.1 |
| A.4 | Função `accept_campaign_invite()` com membership | P0 | 3h | A.1 |
| A.5 | API: GET `/api/user/memberships` — campanhas do user | P0 | 2h | A.1 |

---

#### Story A.1: Criar tabela `campaign_members`

**Arquivo:** `supabase/migrations/032_campaign_members.sql`

**O que fazer:**
- Criar tabela `campaign_members` conforme seção 2.1
- Criar trigger `on_campaign_created` conforme seção 2.2
- Criar policies RLS conforme seção 2.1

**Acceptance Criteria:**
- [ ] Tabela criada com constraints e indexes
- [ ] Trigger auto-insere DM como member ao criar campanha
- [ ] RLS: membros leem membros da mesma campanha
- [ ] RLS: DM gerencia membros da campanha
- [ ] RLS: user pode deletar próprio membership (sair da campanha)
- [ ] Migration roda sem erro em dev e prod

---

#### Story A.2: Seed memberships para campanhas existentes

**Arquivo:** `supabase/migrations/033_seed_existing_memberships.sql`

**O que fazer:**
- Para cada campanha existente, inserir `campaign_members` record com `role='dm'` para o `owner_id`
- Para cada `player_character` com `user_id` não-null, inserir `campaign_members` record com `role='player'`
- Idempotente (ON CONFLICT DO NOTHING)

```sql
-- Seed DMs
INSERT INTO campaign_members (campaign_id, user_id, role, status)
SELECT id, owner_id, 'dm', 'active' FROM campaigns
ON CONFLICT (campaign_id, user_id) DO NOTHING;

-- Seed Players (que já têm user_id vinculado)
INSERT INTO campaign_members (campaign_id, user_id, role, status)
SELECT DISTINCT campaign_id, user_id, 'player', 'active'
FROM player_characters
WHERE user_id IS NOT NULL
ON CONFLICT (campaign_id, user_id) DO NOTHING;
```

**Acceptance Criteria:**
- [ ] Todas as campanhas existentes têm DM como member
- [ ] Players com user_id vinculado estão como members
- [ ] Sem duplicatas
- [ ] Migration é idempotente

---

#### Story A.3: Atualizar RLS policies

**Arquivo:** `supabase/migrations/034_update_rls_for_members.sql`

**O que fazer:**
- Adicionar policy de leitura em `campaigns` para membros (seção 2.3)
- Adicionar policy de leitura em `player_characters` para membros (seção 2.4)
- Adicionar policy de leitura em `sessions` para membros (seção 2.5)
- Adicionar policy de leitura em `encounters` e `combatants` para membros
- NÃO remover policies existentes — adicionar novas

**Acceptance Criteria:**
- [ ] Jogador membro lê dados da campanha
- [ ] Jogador membro lê personagens da campanha
- [ ] Jogador membro lê sessões da campanha
- [ ] Jogador NÃO pode escrever em campanhas que não possui
- [ ] DM mantém acesso total (regressão zero)
- [ ] Admin mantém acesso total

---

#### Story A.4: Função `accept_campaign_invite()`

**Arquivo:** `supabase/migrations/035_accept_invite_function.sql`
**Arquivo:** `lib/supabase/campaign-membership.ts`

**O que fazer:**
- Criar RPC `accept_campaign_invite(invite_token UUID)` conforme seção 2.6
- Criar client-side wrapper em `campaign-membership.ts`
- Atualizar `/app/invite/[token]/page.tsx` para chamar a função
- Atualizar `app/invite/actions.ts` com server action

**Acceptance Criteria:**
- [ ] Jogador aceita convite → membership criada
- [ ] Convite marcado como 'accepted'
- [ ] Convite expirado retorna erro
- [ ] Convite já aceito não duplica membership
- [ ] Se player_character pré-existe, vincular user_id

---

#### Story A.5: API de memberships do usuário

**Arquivo:** `lib/supabase/campaign-membership.ts`

**O que fazer:**
- `getUserMemberships(userId)` — retorna campanhas com role e dados resumidos
- Query:
```sql
SELECT
  cm.role,
  cm.joined_at,
  c.id as campaign_id,
  c.name as campaign_name,
  c.description,
  u.display_name as dm_name,
  u.email as dm_email,
  (SELECT COUNT(*) FROM player_characters WHERE campaign_id = c.id) as player_count,
  (SELECT COUNT(*) FROM sessions WHERE campaign_id = c.id AND is_active = true) as active_sessions
FROM campaign_members cm
JOIN campaigns c ON c.id = cm.campaign_id
JOIN users u ON u.id = c.owner_id
WHERE cm.user_id = $1 AND cm.status = 'active'
ORDER BY cm.role DESC, c.updated_at DESC;
```

**Acceptance Criteria:**
- [ ] Retorna campanhas do user com role
- [ ] Inclui count de jogadores e sessões ativas
- [ ] Inclui nome do DM
- [ ] Ordenado: mesas de DM primeiro, depois player

---

### Epic B: Dashboard Unificado

| Story | Título | Prioridade | Esforço | Dependência |
|-------|--------|------------|---------|-------------|
| B.1 | Redesign do Dashboard com seções DM + Player | P0 | 6h | A.5 |
| B.2 | Card de campanha (DM) com stats resumidos | P1 | 3h | B.1 |
| B.3 | Card de campanha (Player) com personagem e sessão ativa | P0 | 4h | B.1 |
| B.4 | Seção de convites pendentes no Dashboard | P0 | 3h | A.4, B.1 |
| B.5 | Indicador de sessão ativa (realtime) | P1 | 4h | B.3 |

---

#### Story B.1: Redesign do Dashboard

**Arquivos a modificar:**
- `app/app/dashboard/page.tsx`
- `components/dashboard/DashboardContent.tsx` (ou equivalente)

**O que fazer:**
- Buscar memberships via `getUserMemberships(userId)`
- Separar em duas seções: "Minhas Mesas (Mestre)" e "Minhas Mesas (Jogador)"
- Seção só aparece se tem campanhas naquele role
- Combate Rápido permanece acessível para todos
- Ordem das seções baseada em `users.role`:
  - `dm` → Mestre primeiro
  - `player` → Jogador primeiro
  - `both` → Mestre primeiro (padrão)
- Se user é player-only e não tem campanhas → "Aguardando convite do mestre" + "Combate Rápido"

**Acceptance Criteria:**
- [ ] Dashboard mostra seções separadas por role
- [ ] Cards de campanha com stats resumidos
- [ ] Combate Rápido sempre acessível
- [ ] Responsivo: mobile mostra cards empilhados
- [ ] Empty state para cada seção
- [ ] Onboarding flow mantido para DMs sem campanha

---

#### Story B.3: Card de Campanha (Player)

**Arquivo novo:** `components/dashboard/PlayerCampaignCard.tsx`

**O que fazer:**
- Card mostra:
  - Nome da campanha
  - Nome do personagem do jogador
  - HP bar do personagem (com tiers LIGHT/MODERATE/HEAVY/CRITICAL)
  - Badge "Sessão Ativa" se houver sessão ativa
  - Nome do DM
- Click → `/app/campaigns/[id]` (renderiza visão de jogador)
- Badge de sessão ativa usa Supabase Realtime (subscribe ao channel da campanha)

**Acceptance Criteria:**
- [ ] Card exibe dados do personagem
- [ ] HP bar usa tiers corretos
- [ ] Badge de sessão ativa funciona em realtime
- [ ] Click navega para visão de jogador da campanha
- [ ] Mobile: card full-width

---

#### Story B.4: Convites Pendentes

**Arquivo novo:** `components/dashboard/PendingInvites.tsx`

**O que fazer:**
- Query: `campaign_invites WHERE email = user.email AND status = 'pending' AND expires_at > now()`
- Para cada convite:
  - Nome da campanha
  - Nome do DM que convidou
  - Botões: [Aceitar] [Recusar]
  - Aceitar → `accept_campaign_invite(token)` → refresh dashboard
  - Recusar → update status = 'expired'
- Badge no nav com count de convites

**Acceptance Criteria:**
- [ ] Convites pendentes aparecem no dashboard
- [ ] Aceitar cria membership e recarrega
- [ ] Recusar remove o convite da lista
- [ ] Badge no nav mostra count
- [ ] Convites expirados não aparecem

---

### Epic C: Visão do Jogador na Campanha

| Story | Título | Prioridade | Esforço | Dependência |
|-------|--------|------------|---------|-------------|
| C.1 | Página da campanha detecta role e renderiza view correta | P0 | 4h | A.1, A.3 |
| C.2 | PlayerCampaignView — visão do jogador | P0 | 6h | C.1 |
| C.3 | Edição do personagem pelo jogador | P1 | 3h | C.2 |
| C.4 | "Entrar na Sessão" direto da campanha | P0 | 3h | C.2 |
| C.5 | Companheiros — ver outros PCs da campanha | P1 | 2h | C.2 |
| C.6 | Histórico de combates (visão jogador) | P2 | 3h | C.2 |

---

#### Story C.1: Detecção de Role na Página da Campanha

**Arquivo:** `app/app/campaigns/[id]/page.tsx`

**O que fazer:**
- Buscar `campaign_members` WHERE `campaign_id` AND `user_id`
- Se `role = 'dm'` OU `campaigns.owner_id = uid` → renderizar `DMCampaignView` (atual)
- Se `role = 'player'` → renderizar `PlayerCampaignView` (novo)
- Se não é membro → 404 ou redirect

```typescript
const membership = await supabase
  .from('campaign_members')
  .select('role')
  .eq('campaign_id', id)
  .eq('user_id', user.id)
  .single();

if (membership.data?.role === 'dm' || campaign.owner_id === user.id) {
  return <DMCampaignView campaign={campaign} />;
} else if (membership.data?.role === 'player') {
  return <PlayerCampaignView campaign={campaign} membership={membership.data} />;
} else {
  notFound();
}
```

**Acceptance Criteria:**
- [ ] DM vê visão de DM (regressão zero)
- [ ] Jogador vê visão de jogador
- [ ] Não-membro vê 404
- [ ] Admin pode ver qualquer campanha

---

#### Story C.2: PlayerCampaignView

**Arquivo novo:** `components/campaign/PlayerCampaignView.tsx`

**Layout conforme seção 3.4 deste documento.**

**O que fazer:**
- Buscar personagem do jogador: `player_characters WHERE campaign_id AND user_id`
- Buscar sessão ativa: `sessions WHERE campaign_id AND is_active`
- Buscar companheiros: `player_characters WHERE campaign_id` (sem mostrar dados de monstros)
- Buscar histórico: encounters finalizados (query da spec M2.3)

**Regras anti-metagaming:**
- Monstros: HP como label (LIGHT/MODERATE/HEAVY/CRITICAL), nome pode ser display_name
- PCs aliados: HP exato (números reais)
- Notas do DM (`dm_notes`): NUNCA visíveis
- Notas do jogador (`player_notes`): visíveis para todos

**Acceptance Criteria:**
- [ ] Personagem do jogador exibido com HP bar
- [ ] Sessão ativa com botão "Entrar"
- [ ] Companheiros com HP real
- [ ] Monstros com HP label (nunca numérico)
- [ ] dm_notes NUNCA expostas
- [ ] Responsive (mobile-first)

---

#### Story C.4: "Entrar na Sessão" Direto

**Arquivo:** `components/campaign/PlayerCampaignView.tsx`

**O que fazer:**
- Se existe sessão ativa na campanha → mostrar card com "Entrar na Sessão"
- Click → buscar/criar session_token para o user
- Redirect → `/join/[token]` com auto-fill do personagem (Story 3.3)
- Se já tem token ativo → reusar

**Acceptance Criteria:**
- [ ] Botão visível quando sessão ativa existe
- [ ] Click leva direto ao combate
- [ ] Dados do personagem pré-preenchidos
- [ ] Se não tem sessão ativa → não mostra botão

---

### Epic D: Convite e Onboarding do Jogador

| Story | Título | Prioridade | Esforço | Dependência |
|-------|--------|------------|---------|-------------|
| D.1 | UI de convite por email na campanha (DM) | P0 | 4h | A.1 |
| D.2 | Fluxo de aceite de convite (com e sem conta) | P0 | 5h | A.4 |
| D.3 | Convite via link direto (sem email) | P1 | 3h | A.1 |
| D.4 | Onboarding de primeiro uso para Player | P1 | 3h | B.1 |
| D.5 | Upgrade de jogador anônimo para conta | P1 | 4h | A.1 |

---

#### Story D.1: UI de Convite por Email

**Arquivo:** `components/campaign/InvitePlayerModal.tsx`
**Arquivo:** `app/app/campaigns/[id]/page.tsx` (trigger do modal)

**O que fazer:**
- Botão "Convidar Jogador" na seção de jogadores da campanha
- Modal com input de email + botão "Enviar Convite"
- Validação: email válido, não já membro, não já convidado (pending)
- Chamar API: `POST /api/campaign/[id]/invites`
- Sucesso: toast "Convite enviado para fulano@email.com"
- Rate limit: máximo 20 convites/dia por DM

**Acceptance Criteria:**
- [ ] Modal com input de email funcional
- [ ] Validação de email duplicado
- [ ] Toast de sucesso/erro
- [ ] Rate limit respeitado
- [ ] Lista de convites pendentes visível na campanha

---

#### Story D.3: Convite via Link Direto

**Arquivo:** `components/campaign/ShareCampaignLink.tsx`

**O que fazer:**
- Gerar link de convite público para a campanha (sem necessidade de email)
- Link: `/invite/[campaign_invite_token]`
- DM pode gerar/revogar o link
- Qualquer pessoa com o link pode entrar como player
- Limite configurável: máximo de X jogadores por campanha

**Acceptance Criteria:**
- [ ] Link gerado e copiável
- [ ] QR code do link (reusar componente do session share)
- [ ] DM pode revogar link
- [ ] Link funciona para users com e sem conta

---

#### Story D.5: Upgrade de Jogador Anônimo → Conta

**Arquivo:** `components/player/PlayerUpgradeBanner.tsx`

**O que fazer:**
- Após combate (encounter finalizado), mostrar banner:
  - "Crie uma conta para salvar seu personagem e participar de futuras sessões"
  - [Criar Conta] → `/auth/sign-up?session=[session_id]`
- No signup, detectar `session` query param:
  - Buscar session → campaign_id
  - Se tem campaign → criar campaign_members (player)
  - Vincular player_character com user_id
  - Vincular session_token com user real (não anon)

**Acceptance Criteria:**
- [ ] Banner aparece após combate para anônimos
- [ ] Signup vincula session/campaign automaticamente
- [ ] Dados do combate não são perdidos
- [ ] Se não tem campaign, só cria conta normalmente

---

### Epic E: Notificações e Realtime

| Story | Título | Prioridade | Esforço | Dependência |
|-------|--------|------------|---------|-------------|
| E.1 | Notificação in-app de sessão ativa | P1 | 4h | C.2 |
| E.2 | Badge de convite no nav | P0 | 2h | B.4 |
| E.3 | Notificação "é sua vez" para player logado | P1 | 3h | C.4 |
| E.4 | Presence de membros online na campanha | P2 | 3h | A.1 |

---

#### Story E.1: Notificação de Sessão Ativa

**O que fazer:**
- Supabase Realtime: subscribe ao channel `campaign:{campaign_id}`
- Quando DM cria sessão → broadcast `session_started` event
- Jogadores no dashboard veem toast/badge: "Sessão iniciada na Mesa do João"
- Click no toast → `/join/[token]` com auto-fill

**Acceptance Criteria:**
- [ ] Notificação aparece em tempo real
- [ ] Click navega para a sessão
- [ ] Não aparece para o DM que criou
- [ ] Toast desaparece após 30s ou dismiss

---

### Epic F: Gerenciamento de Personagens pelo Jogador

| Story | Título | Prioridade | Esforço | Dependência |
|-------|--------|------------|---------|-------------|
| F.1 | Página "Meus Personagens" | P2 | 4h | A.5 |
| F.2 | Editar personagem (nome, classe, nível) | P2 | 3h | F.1 |
| F.3 | Avatar/token do personagem | P2 | 3h | F.2 |

---

#### Story F.1: Página "Meus Personagens"

**Arquivo novo:** `app/app/my-characters/page.tsx`
**Arquivo novo:** `components/player/MyCharactersList.tsx`

**O que fazer:**
- Query: `player_characters WHERE user_id = auth.uid()`
- Para cada personagem:
  - Nome + campanha associada
  - HP bar
  - AC badge
  - Link para a campanha
- Empty state: "Você ainda não tem personagens. Peça ao mestre para te convidar!"

**Acceptance Criteria:**
- [ ] Lista todos os personagens do user
- [ ] Agrupados por campanha
- [ ] HP bar com tiers corretos
- [ ] Click navega para campanha
- [ ] Empty state amigável

---

## 6. Ordem de Implementação (Sprint Plan)

### Sprint 1: Fundação (3-4 dias)
1. **A.1** — Criar `campaign_members` + trigger + RLS
2. **A.2** — Seed memberships existentes
3. **A.3** — Atualizar RLS policies
4. **A.4** — Função `accept_campaign_invite()`
5. **A.5** — API de memberships

### Sprint 2: Dashboard + Campanha Player (4-5 dias)
6. **B.1** — Redesign Dashboard
7. **B.3** — Card de campanha (Player)
8. **B.4** — Convites pendentes
9. **C.1** — Detecção de role na campanha
10. **C.2** — PlayerCampaignView

### Sprint 3: Convites + Join (3-4 dias)
11. **D.1** — UI de convite por email
12. **D.2** — Fluxo de aceite
13. **C.4** — "Entrar na Sessão" direto
14. **D.3** — Convite via link direto

### Sprint 4: Polish + Realtime (3-4 dias)
15. **E.2** — Badge de convite no nav
16. **E.1** — Notificação de sessão ativa
17. **B.5** — Indicador de sessão ativa
18. **D.5** — Upgrade anônimo → conta

### Sprint 5: Nice-to-have (2-3 dias)

> Itens deste sprint foram movidos para [bucket-future-ideas.md](bucket-future-ideas.md) (F-27 a F-30).
19. **C.3** — Edição do personagem pelo jogador
20. **C.5** — Companheiros
21. **C.6** — Histórico (visão jogador)
22. **F.1** — Meus Personagens
23. **E.3** — Notificação "é sua vez"
24. **E.4** — Presence online

---

## 7. Tipos TypeScript

```typescript
// lib/types/campaign-membership.ts

export type CampaignRole = 'dm' | 'player';
export type MembershipStatus = 'active' | 'inactive' | 'banned';

export interface CampaignMember {
  id: string;
  campaign_id: string;
  user_id: string;
  role: CampaignRole;
  joined_at: string;
  invited_by: string | null;
  status: MembershipStatus;
}

export interface UserMembership {
  role: CampaignRole;
  joined_at: string;
  campaign_id: string;
  campaign_name: string;
  campaign_description: string | null;
  dm_name: string | null;
  dm_email: string;
  player_count: number;
  active_sessions: number;
}

export interface CampaignInviteWithDetails {
  id: string;
  campaign_id: string;
  campaign_name: string;
  dm_name: string;
  dm_email: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  expires_at: string;
}
```

---

## 8. Considerações de Segurança

### RLS é a Linha de Defesa Principal

- **NUNCA** confiar no client-side para esconder dados
- Toda query de campanha DEVE passar por RLS com membership check
- `dm_notes` em combatants: RLS garante que player não lê (policy existente já faz isso)
- Monster stats (HP numérico, AC, DC): filtrado no server-side antes de enviar ao client (já implementado em `/join/[token]`)

### Rate Limiting

- Convites: máximo 20/dia por DM (Supabase RPC `check_rate_limit`)
- Accept invite: máximo 10/hora por user
- Campaign creation: máximo 50 campanhas por user

### Anti-Metagaming

- HP de monstros: SEMPRE renderizado como label (LIGHT/MODERATE/HEAVY/CRITICAL) na visão do jogador
- Tiers imutáveis: 70% = LIGHT, 40% = MODERATE, 10% = CRITICAL (regra documentada em `docs/hp-status-tiers-rule.md`)
- Nome do monstro: pode ser `display_name` diferente do real
- AC, DC, spell_save_dc de monstros: NUNCA expostos ao jogador

---

## 9. Compatibilidade com Features Existentes

| Feature Existente | Impacto | Ação |
|-------------------|---------|------|
| Guest Mode (/try) | Nenhum | Mantém independente |
| Combate Rápido (sem campanha) | Nenhum | Continua funcionando |
| QR Code / Session Link | Compatível | Jogador logado auto-preenche |
| Campaign Notes (M2.2) | Compatível | DM-only, RLS já garante |
| Encounter History (M2.3) | Compatível | Player vê versão simplificada |
| Homebrew (Migration 026) | Compatível | Mantém user-scoped |
| Feature Flags (Migration 018) | Compatível | Adicionar flag para campaign_membership |
| Subscriptions | Compatível | Modelo "Mesa" beneficia jogadores na campanha |
| i18n | Compatível | Adicionar chaves para novas telas |

---

*Documento gerado por: PM (John) + Architect (Winston) + UX Designer (Sally)*
*Data: 2026-03-29*
*Versão: 1.0*
