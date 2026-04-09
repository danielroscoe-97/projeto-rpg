# Addendum: Revisão Arquitetural + UX — Epic Dual-Role

**Revisado por:** Winston (Architect) + Sally (UX Designer)
**Data:** 2026-03-29
**Base:** `docs/epic-campaign-dual-role.md` v1.0
**Status:** Correções e aprofundamentos — integrar antes de implementar

---

## PARTE 1: CORREÇÕES ARQUITETURAIS (Winston)

### Correção 1: RLS Self-Reference em `campaign_members` — CRÍTICO

O epic define uma policy SELECT em `campaign_members` que referencia a própria tabela:

```sql
-- ❌ PROBLEMA: causa infinite recursion (mesma issue da migration 009)
CREATE POLICY "Members can view campaign members"
ON campaign_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM campaign_members cm  -- ← referencia a si mesma
    WHERE cm.campaign_id = campaign_members.campaign_id
    AND cm.user_id = auth.uid()
  )
);
```

**Fix:** Usar SECURITY DEFINER function (padrão já estabelecido no projeto via `is_admin()`):

```sql
-- ✅ CORREÇÃO: helper function bypassa RLS
CREATE OR REPLACE FUNCTION public.is_campaign_member(p_campaign_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.campaign_members
    WHERE campaign_id = p_campaign_id
    AND user_id = auth.uid()
    AND status = 'active'
  );
$$;

-- Agora as policies usam a function:
CREATE POLICY "Members can view campaign members"
ON campaign_members FOR SELECT
USING (public.is_campaign_member(campaign_id));
```

**Impacto:** Todas as RLS policies que fazem `EXISTS (SELECT FROM campaign_members ...)` devem usar `public.is_campaign_member()` em vez de subquery direta. Isso afeta:
- `campaign_members` SELECT (acima)
- `campaigns` SELECT (seção 2.3 do epic)
- `player_characters` SELECT (seção 2.4)
- `sessions` SELECT (seção 2.5)
- `encounters` SELECT (nova — A.3)
- `combatants` SELECT (nova — A.3)

**SQL corrigido para todas:**

```sql
-- campaigns
CREATE POLICY campaigns_member_select ON campaigns
  FOR SELECT USING (public.is_campaign_member(id));

-- player_characters
CREATE POLICY player_characters_member_select ON player_characters
  FOR SELECT USING (public.is_campaign_member(campaign_id));

-- sessions (precisa JOIN para obter campaign_id)
CREATE OR REPLACE FUNCTION public.is_session_campaign_member(p_session_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sessions s
    JOIN public.campaign_members cm ON cm.campaign_id = s.campaign_id
    WHERE s.id = p_session_id
    AND cm.user_id = auth.uid()
    AND cm.status = 'active'
  );
$$;

CREATE POLICY sessions_member_select ON sessions
  FOR SELECT USING (public.is_session_campaign_member(id));

-- encounters
CREATE POLICY encounters_member_select ON encounters
  FOR SELECT USING (
    public.is_session_campaign_member(session_id)
  );

-- combatants (precisa chain encounter → session)
CREATE OR REPLACE FUNCTION public.is_encounter_campaign_member(p_encounter_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.encounters e
    JOIN public.sessions s ON s.id = e.session_id
    JOIN public.campaign_members cm ON cm.campaign_id = s.campaign_id
    WHERE e.id = p_encounter_id
    AND cm.user_id = auth.uid()
    AND cm.status = 'active'
  );
$$;

CREATE POLICY combatants_member_select ON combatants
  FOR SELECT USING (public.is_encounter_campaign_member(encounter_id));
```

---

### Correção 2: Schema `player_characters` — Campos Faltantes

O wireframe do PlayerCampaignView mostra "Anão Guerreiro · Nível 5", mas a tabela `player_characters` **não tem** campos `class`, `race`, ou `level`. Precisamos de uma migration adicional:

```sql
-- migration: 036_player_characters_extended.sql
ALTER TABLE player_characters
  ADD COLUMN IF NOT EXISTS race TEXT,
  ADD COLUMN IF NOT EXISTS class TEXT,
  ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- Todos opcionais — backward compatible
```

**Story impactada:** Adicionar como sub-task de **C.2** ou criar story dedicada **C.0**.

---

### Correção 3: `accept_campaign_invite` — Race Condition

A função não trava o registro do convite. Dois clicks simultâneos podem causar problemas:

```sql
-- ✅ CORREÇÃO: SELECT ... FOR UPDATE previne double-accept
CREATE OR REPLACE FUNCTION accept_campaign_invite(invite_token UUID)
RETURNS JSON AS $$
DECLARE
  v_invite RECORD;
  v_campaign_name TEXT;
BEGIN
  -- Lock the invite row
  SELECT * INTO v_invite FROM campaign_invites
  WHERE token = invite_token
    AND status = 'pending'
    AND expires_at > now()
  FOR UPDATE SKIP LOCKED;

  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Convite inválido, expirado ou já processado');
  END IF;

  -- Criar membership
  INSERT INTO campaign_members (campaign_id, user_id, role, invited_by)
  VALUES (v_invite.campaign_id, auth.uid(), 'player', v_invite.invited_by)
  ON CONFLICT (campaign_id, user_id) DO NOTHING;

  -- Vincular player_characters pré-existentes (criados pelo DM)
  UPDATE player_characters
  SET user_id = auth.uid()
  WHERE campaign_id = v_invite.campaign_id
    AND user_id IS NULL
    AND name ILIKE '%' -- TODO: match por email ou nome? Precisa de lógica extra
  LIMIT 0; -- NÃO auto-vincular sem match explícito

  -- Marcar convite como aceito
  UPDATE campaign_invites SET status = 'accepted' WHERE id = v_invite.id;

  -- Retornar dados para redirect
  SELECT name INTO v_campaign_name FROM campaigns WHERE id = v_invite.campaign_id;
  RETURN json_build_object(
    'campaign_id', v_invite.campaign_id,
    'campaign_name', v_campaign_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Mudanças:**
- Retorna JSON em vez de VOID (client precisa do campaign_id para redirect)
- `FOR UPDATE SKIP LOCKED` previne double-accept
- NÃO auto-vincula player_characters sem match explícito (o DM deve fazer isso manualmente via PlayerLinkDropdown)

---

### Correção 4: `campaign_invites` RLS para Destinatários

A policy atual só permite ler por token (`campaign_invites_read_by_token`). Mas para B.4 (convites pendentes no dashboard), o user precisa buscar por email. Supabase tem `auth.email()`:

```sql
-- migration: parte do 034_update_rls_for_members.sql
CREATE POLICY campaign_invites_recipient_select ON campaign_invites
  FOR SELECT USING (
    email = auth.email()
  );
```

**Validação:** `auth.email()` retorna o email do user autenticado no Supabase. Funciona com email auth (nosso caso).

---

### Correção 5: Session Token para Jogador Logado (Story C.4)

O fluxo atual de `session_tokens` assume jogadores anônimos (`anon_user_id`). Para C.4 ("Entrar na Sessão" direto da campanha), um jogador **logado** precisa de um token. Duas opções:

**Opção A (Recomendada): Server-side token creation**

```typescript
// lib/supabase/campaign-membership.ts
export async function getOrCreatePlayerSessionToken(
  sessionId: string,
  userId: string,
  playerCharacterId: string
): Promise<string> {
  const supabase = createServiceClient(); // Service role — bypassa RLS

  // Verificar se já tem token ativo
  const { data: existing } = await supabase
    .from('session_tokens')
    .select('token')
    .eq('session_id', sessionId)
    .eq('anon_user_id', userId) // user real, não anon
    .eq('is_active', true)
    .single();

  if (existing) return existing.token;

  // Criar token para o jogador logado
  const token = generateSessionToken(); // 32-char random
  const { data: pc } = await supabase
    .from('player_characters')
    .select('name')
    .eq('id', playerCharacterId)
    .single();

  await supabase.from('session_tokens').insert({
    session_id: sessionId,
    token,
    anon_user_id: userId, // real user_id, não UUID anônimo
    player_name: pc?.name || null,
    is_active: true,
  });

  return token;
}
```

**Por que service client:** A RLS de `session_tokens` INSERT só permite `owner_id` (DM). Jogadores logados não podem criar tokens diretamente. Usar service role é seguro porque a função valida membership antes.

**Opção B:** Adicionar RLS policy para members criarem tokens (mais complexo, mais risco).

**Decisão:** Opção A. Menos surface area de segurança.

---

### Correção 6: Combatants RLS — `dm_notes` NÃO Pode Vazar

A policy `combatants_member_select` vai permitir que jogadores membros leiam combatants via RLS. Mas combatants tem `dm_notes` que é DM-only. O epic diz "RLS já garante" mas isso **não é verdade** — a policy de combatants é SELECT ALL COLUMNS.

**Solução: View + RLS (não criar nova tabela)**

Usar query server-side com column filtering (já é o padrão no projeto):

```typescript
// Quando buscando combatants para player view:
const { data } = await supabase
  .from('combatants')
  .select('id, name, display_name, current_hp, max_hp, ac, initiative, initiative_order, conditions, is_defeated, is_player, is_hidden')
  // ↑ NÃO inclui: dm_notes, spell_save_dc, monster_id
  .eq('encounter_id', encounterId)
  .eq('is_hidden', false);
```

**Nota:** O `/join/[token]/page.tsx` já faz esse filtering. A nova PlayerCampaignView DEVE fazer o mesmo. Documentar como regra de implementação.

**Regra de ouro:** NUNCA fazer `.select('*')` em combatants quando o viewer é player.

---

### Correção 7: Convite via Link Direto (D.3) — Modelo Diferente

O epic usa `campaign_invites` para links diretos, mas campaign_invites é 1:1 (um convite = um email). Links diretos são 1:N. Modelo correto:

```sql
-- Adicionar coluna à campaigns (não criar tabela nova)
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS join_code_active BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_players INTEGER DEFAULT 10;

-- Index para lookup rápido
CREATE INDEX IF NOT EXISTS idx_campaigns_join_code
  ON campaigns(join_code) WHERE join_code IS NOT NULL;
```

**Fluxo:**
- DM gera join_code (6 chars alfanumérico, ex: "AB12CD")
- Link público: `/join-campaign/[code]`
- Qualquer pessoa com o link + conta pode entrar como player
- DM pode ativar/desativar e regenerar o código
- Limite de max_players

**Nova rota:** `/join-campaign/[code]/page.tsx` (separada de `/join/[token]` que é para sessões)

---

## PARTE 2: APROFUNDAMENTO UX (Sally)

### UX 1: Remover Role Switcher Global

O epic propõe um "Role Switcher (Mestre ↔ Jogador)" no header. Isso é **confuso e desnecessário** porque:

- O papel é detectado **automaticamente** por campanha (via `campaign_members.role`)
- Não existe "modo global" — o user vê o que precisa baseado na campanha que acessa
- `users.role` é apenas preferência de ordenação no dashboard (DM primeiro vs Player primeiro)

**Decisão:** Remover Role Switcher do header. Em vez disso:
- Dashboard mostra as duas seções (DM + Player) sempre que houver memberships dos dois tipos
- Ordem baseada em `users.role` (configurável em Settings)
- Não há "modo" — há contexto

---

### UX 2: Presets na Nav — Esconder para Player-Only

Se o user **só** tem memberships como player (nenhuma campanha como DM), o item "Presets" no nav é ruído. Regra:

```
Se count(memberships WHERE role='dm') === 0 AND users.role !== 'dm':
  → Esconder "Presets" da nav
  → Esconder "Nova Campanha" se role='player'
```

Não é disabled — é hidden. Menos cognitive load.

---

### UX 3: Mobile Layout — Dashboard

O wireframe ASCII é desktop-only. Mobile (393px+) precisa de regras:

```
Mobile Dashboard:
┌─────────────────────────┐
│ Pocket DM        [🔔][👤]│
├─────────────────────────┤
│                         │
│ 📩 Convites (2)         │  ← Convites PRIMEIRO no mobile
│ ┌─────────────────────┐ │     (mais urgente, ação rápida)
│ │ Campanha Noturna    │ │
│ │ De: marcos@email    │ │
│ │ [Aceitar] [Recusar] │ │
│ └─────────────────────┘ │
│                         │
│ ⚔️ Minhas Mesas         │  ← Tabs: Mestre | Jogador
│ ┌─── Mestre ─┬─ Jogador ┐│     (não seções separadas)
│ │            │          ││
│ │ Card 1     │          ││
│ │ Card 2     │          ││
│ └────────────┴──────────┘│
│                         │
│ [⚡ Combate Rápido]      │  ← Bottom CTA, sticky
│                         │
└─────────────────────────┘
```

**Diferenças mobile vs desktop:**
- Convites vão pro **topo** (mobile-first — ação pendente é urgente)
- Seções DM/Player viram **tabs** (não duas seções com scroll)
- Cards de campanha são **full-width** com swipe horizontal se mais de 2
- "Combate Rápido" é **sticky bottom button** (sempre acessível)

---

### UX 4: PlayerCampaignView Mobile

```
Mobile Player Campaign View:
┌─────────────────────────┐
│ ← Mesa do João  🟢 Ativa │
├─────────────────────────┤
│                         │
│ ⚔️ SESSÃO ATIVA          │  ← Destaque máximo se ativa
│ ┌─────────────────────┐ │
│ │ Round 3 · Vez de:   │ │
│ │ Lyra                │ │
│ │ Você é o próximo!   │ │
│ │                     │ │
│ │ [ENTRAR NA SESSÃO]  │ │  ← CTA primário, full-width
│ └─────────────────────┘ │
│                         │
│ 🧙 Meu Personagem       │
│ ┌─────────────────────┐ │
│ │ Thorin Oakenshield  │ │
│ │ Anão · Guerreiro 5  │ │
│ │ ████████░░ 45/52 HP │ │
│ │ AC: 18              │ │
│ └─────────────────────┘ │
│                         │
│ 👥 Companheiros          │  ← Colapsável
│ ┌─────────────────────┐ │
│ │ Lyra ████████ 32/32 │ │
│ │ Ragnar ████░░ 18/40 │ │
│ └─────────────────────┘ │
│                         │
│ 📜 Histórico (2)         │  ← Colapsável
│                         │
└─────────────────────────┘
```

**Regras mobile:**
- Se tem sessão ativa → card de sessão no **topo** com CTA gigante
- Se não tem sessão ativa → personagem no topo
- Companheiros e histórico são **colapsáveis** (accordion)
- HP bars usam os tiers padrão (LIGHT/MODERATE/HEAVY/CRITICAL)
- Mínimo tap target: 44x44px

---

### UX 5: Convite — Tela de Aceite (`/invite/[token]`)

```
┌─────────────────────────┐
│       🏰 Pocket DM       │
├─────────────────────────┤
│                         │
│  ⚔️ Convite para         │
│  "Campanha do Dragão"   │
│                         │
│  Convidado por:          │
│  marcos@email.com       │
│                         │
│  Jogadores: 4           │
│  Sessões: 12            │
│                         │
│  ┌─────────────────────┐│
│  │ [ACEITAR CONVITE]   ││  ← Botão primário
│  │                     ││
│  │ [Recusar]           ││  ← Link discreto
│  └─────────────────────┘│
│                         │
│  Ao aceitar, você será   │
│  adicionado como jogador │
│  nesta campanha.         │
│                         │
└─────────────────────────┘
```

**Se não tem conta:**
```
┌─────────────────────────┐
│       🏰 Pocket DM       │
├─────────────────────────┤
│                         │
│  ⚔️ Convite para         │
│  "Campanha do Dragão"   │
│                         │
│  Para aceitar, crie      │
│  sua conta gratuita:     │
│                         │
│  ┌─────────────────────┐│
│  │ [CRIAR CONTA]       ││
│  │                     ││
│  │ Já tem conta?       ││
│  │ [Fazer login]       ││
│  └─────────────────────┘│
│                         │
└─────────────────────────┘
```

---

### UX 6: Empty States Detalhados

**Dashboard — Nenhuma campanha como DM:**
```
┌─────────────────────────┐
│ ⚔️ Minhas Mesas (Mestre) │
│                         │
│ 🏰 Comece sua jornada    │
│ Crie sua primeira        │
│ campanha e convide       │
│ seus jogadores.          │
│                         │
│ [+ Criar Campanha]       │
└─────────────────────────┘
```

**Dashboard — Nenhuma campanha como Jogador:**
```
┌─────────────────────────┐
│ 🎲 Minhas Mesas (Jogador)│
│                         │
│ 🎭 Aguardando convite    │
│ Peça ao seu mestre para  │
│ te convidar por email    │
│ ou link.                 │
│                         │
│ Enquanto isso:           │
│ [⚡ Testar Combate Rápido]│
└─────────────────────────┘
```

**PlayerCampaignView — Sem personagem vinculado:**
```
┌─────────────────────────┐
│ 🧙 Meu Personagem       │
│                         │
│ Seu mestre ainda não     │
│ criou seu personagem     │
│ nesta campanha.          │
│                         │
│ Avise ele para adicionar │
│ você na lista de         │
│ jogadores.               │
└─────────────────────────┘
```

---

### UX 7: Fluxo de Join via Código da Campanha

```
Fluxo de Link Direto (D.3):

DM → Campanha → "Compartilhar" → Gerar Código
┌─────────────────────────┐
│ 🔗 Link da Campanha      │
│                         │
│  Código: AB12CD          │
│  Link: pocketdm.com.br/    │
│    join-campaign/AB12CD  │
│                         │
│  [📋 Copiar Link]        │
│  [QR Code]               │
│                         │
│  ○ Ativo ● Desativado    │
│  Máx jogadores: 10       │
│                         │
│  [Gerar novo código]     │
└─────────────────────────┘

Jogador acessa /join-campaign/AB12CD:
┌─────────────────────────┐
│ 🏰 Entrar na campanha    │
│                         │
│ "Campanha do Dragão"     │
│ Mestre: Marcos           │
│ 4 jogadores ativos       │
│                         │
│ [ENTRAR COMO JOGADOR]    │
│                         │
│ (Precisa de conta)       │
│ [Criar Conta] [Login]    │
└─────────────────────────┘
```

---

## PARTE 3: STORIES ADICIONAIS IDENTIFICADAS

Baseado na revisão, as seguintes stories faltam no epic original:

| Story | Título | Epic | Prioridade | Esforço |
|-------|--------|------|------------|---------|
| A.0 | Helper functions RLS (`is_campaign_member`, `is_session_campaign_member`, `is_encounter_campaign_member`) | A | P0 | 2h |
| A.6 | Migration `player_characters` — adicionar campos `race`, `class`, `level` (opcionais) | A | P1 | 1h |
| A.7 | Migration `campaigns` — adicionar `join_code`, `join_code_active`, `max_players` | A | P1 | 1h |
| A.8 | RLS `campaign_invites` — policy para destinatário ler por email (`auth.email()`) | A | P0 | 1h |
| B.6 | Atualizar nav/sidebar — esconder Presets para player-only, adicionar badge convites | B | P1 | 2h |
| D.3' | Join via código da campanha (usar `campaigns.join_code` em vez de `campaign_invites`) | D | P1 | 4h |

---

## PARTE 4: SPRINT PLAN REVISADO

### Sprint 1: Fundação (3-4 dias) — SEM MUDANÇAS GRANDES

1. **A.0** — Helper functions RLS (NOVO, P0, 2h)
2. **A.1** — Criar `campaign_members` + trigger + RLS (usar helpers de A.0)
3. **A.2** — Seed memberships existentes
4. **A.3** — Atualizar RLS (encounters, combatants, sessions, campaigns, player_characters)
5. **A.4** — Função `accept_campaign_invite()` (com fix de race condition)
6. **A.5** — API de memberships
7. **A.8** — RLS de `campaign_invites` para destinatário (NOVO, P0, 1h)

### Sprint 2: Dashboard + Player View (4-5 dias) — LAYOUT MOBILE INCLUÍDO

8. **A.6** — Migration player_characters extended (NOVO, P1, 1h)
9. **B.1** — Redesign Dashboard (com tabs mobile, empty states)
10. **B.3** — Card de campanha (Player)
11. **B.4** — Convites pendentes
12. **B.6** — Atualizar nav/sidebar (NOVO, P1, 2h)
13. **C.1** — Detecção de role na campanha
14. **C.2** — PlayerCampaignView (com mobile layout)

### Sprint 3: Convites + Join (3-4 dias) — JOIN CODE ADICIONADO

15. **D.1** — UI de convite por email
16. **D.2** — Fluxo de aceite
17. **C.4** — "Entrar na Sessão" direto (com service client token)
18. **A.7** — Migration campaigns join_code (NOVO, P1, 1h)
19. **D.3'** — Join via código da campanha (REVISADO, usa join_code)

### Sprint 4: Polish + Realtime (3-4 dias) — SEM MUDANÇAS

20. **E.2** — Badge de convite no nav
21. **E.1** — Notificação de sessão ativa
22. **B.5** — Indicador de sessão ativa
23. **D.5** — Upgrade anônimo → conta

### Sprint 5: Nice-to-have (2-3 dias) — SEM MUDANÇAS

24. **C.3** — Edição do personagem pelo jogador
25. **C.5** — Companheiros
26. **C.6** — Histórico (visão jogador)
27. **F.1** — Meus Personagens
28. **E.3** — Notificação "é sua vez"
29. **E.4** — Presence online

---

## PARTE 5: REGRAS DE IMPLEMENTAÇÃO

### Regra 1: NUNCA `select('*')` em combatants para player view

```typescript
// ✅ Player view — select explícito
.select('id, name, display_name, current_hp, max_hp, initiative, initiative_order, conditions, is_defeated, is_player, is_hidden')

// ❌ NUNCA para player view
.select('*') // expõe dm_notes, spell_save_dc, monster_id, ac
```

### Regra 2: HP de Monstros — SEMPRE como Label

```typescript
// Na PlayerCampaignView e PlayerInitiativeBoard:
// NUNCA mostrar current_hp/max_hp numérico de monstros
// Usar getHpStatus(current_hp, max_hp) → LIGHT/MODERATE/HEAVY/CRITICAL
// Fonte: lib/utils/hp-status.ts

// PCs aliados: mostrar HP numérico (números reais)
// Monstros: mostrar apenas label + barra colorida
```

### Regra 3: Campaign Membership — Source of Truth

```
Para determinar se user tem acesso a uma campanha:
1. Verificar campaign_members (UNIQUE: campaign_id + user_id)
2. NUNCA usar campaigns.owner_id como único critério
3. owner_id = DM que criou. campaign_members.role = quem tem acesso

Para determinar a VIEW a renderizar:
1. campaign_members.role = 'dm' → DMCampaignView
2. campaign_members.role = 'player' → PlayerCampaignView
3. Fallback: campaigns.owner_id = auth.uid() → DMCampaignView
```

### Regra 4: i18n — Chaves Necessárias

Todas as novas telas precisam de chaves em `messages/pt-BR.json` e `messages/en.json`:

```json
{
  "dashboard": {
    "myTablesAsDm": "Minhas Mesas (como Mestre)",
    "myTablesAsPlayer": "Minhas Mesas (como Jogador)",
    "pendingInvites": "Convites Pendentes",
    "quickCombat": "Combate Rápido",
    "createFirstCampaign": "Crie sua primeira campanha",
    "waitingForInvite": "Aguardando convite do mestre",
    "activeSession": "Sessão Ativa",
    "noSession": "Sem sessão ativa"
  },
  "campaign": {
    "myCharacter": "Meu Personagem",
    "companions": "Companheiros",
    "combatHistory": "Histórico de Combates",
    "enterSession": "Entrar na Sessão",
    "invitePlayer": "Convidar Jogador",
    "shareCampaignLink": "Compartilhar Link",
    "joinCode": "Código da Campanha"
  },
  "invites": {
    "invitedBy": "Convidado por",
    "accept": "Aceitar",
    "decline": "Recusar",
    "createAccountToAccept": "Crie uma conta para aceitar",
    "invalidOrExpired": "Convite inválido ou expirado"
  }
}
```

---

## PARTE 6: CHECKLIST DE VALIDAÇÃO PRÉ-IMPLEMENTAÇÃO

- [x] RLS self-reference corrigida (usar SECURITY DEFINER functions)
- [x] Race condition no accept_campaign_invite corrigida (FOR UPDATE SKIP LOCKED)
- [x] Schema player_characters extended (race, class, level)
- [x] Campaigns join_code para convite por link
- [x] campaign_invites RLS para destinatário (auth.email())
- [x] Session token creation para player logado (service client)
- [x] dm_notes nunca expostas em player queries
- [x] Mobile wireframes para dashboard e player campaign view
- [x] Empty states detalhados
- [x] Role Switcher removido (detecção automática por campanha)
- [x] Nav adaptada para player-only (esconder Presets)
- [x] i18n keys listadas
- [x] HP tiers regra respeitada em todos os wireframes
- [x] Convite via link direto usa modelo separado (join_code, não campaign_invites)

---

*Revisado por: Winston (Architect) + Sally (UX Designer)*
*Data: 2026-03-29*
*Integrar com epic-campaign-dual-role.md v1.0 antes de iniciar Sprint 1*
