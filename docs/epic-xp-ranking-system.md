# Epic: Sistema Holístico de XP e Ranking — Pocket DM

> **Status**: SPEC APROVADO — Pronto para implementação
> **Data**: 2026-04-09
> **Autores**: Party Mode (John PM + Sally UX + Winston Architect + Mary Analyst + Amelia Dev + Bob SM)
> **Prioridade**: Alta — sistema transversal que toca todo o app

---

## 1. Visão Geral

Sistema de pontuação (XP) e ranking que recompensa **todas as ações significativas** de DMs e Players dentro do Pocket DM. Cada ação concede XP que acumula para subir de rank, com títulos narrativos no estilo RPG 16-bit.

### Objetivos

1. **Incentivar consistência** — DMs que voltam toda semana valem mais que picos de uso
2. **Incentivar qualidade de dados** — Ações que alimentam a metodologia (ratings, votos) valem bônus
3. **Incentivar engajamento social** — Convidar jogadores, manter campanhas ativas
4. **Criar prova social** — Rank visível cria confiança (jogador vê que DM é experiente)
5. **Contribuir para a comunidade** — Pontos representam contribuição coletiva

### Princípios de Design

- **RPG, não Duolingo** — Títulos narrativos, não "Level 7"
- **Positivo > Punitivo** — Base generosa + bônus de qualidade, nunca punir por não fazer algo
- **Server-side only** — XP nunca é concedido pelo client (anti-manipulação)
- **Configurável** — Tabela de ações editável por admin, sem redeploy pra rebalancear
- **Non-retroativo** — Fresh start pra todos; XP conta a partir da ativação

---

## 2. Rankings — Dual Track (DM + Player)

Rankings são **separados por role**. Um usuário com ambas as roles tem dois ranks independentes.

### 2.1 Ranks DM (Dungeon Manager)

| Rank | XP Mínimo | Título PT-BR | Título EN | Ícone | Tempo Estimado (DM ativo) |
|------|-----------|-------------|-----------|-------|---------------------------|
| 1 | 0 | Aprendiz de Taverna | Tavern Apprentice | 🕯️ | — |
| 2 | 100 | Narrador de Fogueira | Campfire Narrator | 🔥 | ~1-2 semanas |
| 3 | 400 | Mestre de Masmorras | Dungeon Keeper | ⚔️ | ~1 mês |
| 4 | 1200 | Guardião do Compêndio | Compendium Guardian | 📜 | ~3 meses |
| 5 | 3000 | Arquiteto do Destino | Fate Architect | 🏰 | ~6 meses |
| 6 | 6000 | Lenda Viva | Living Legend | 👑 | ~12+ meses |

### 2.2 Ranks Player

| Rank | XP Mínimo | Título PT-BR | Título EN | Ícone | Tempo Estimado (Player ativo) |
|------|-----------|-------------|-----------|-------|-------------------------------|
| 1 | 0 | Aventureiro Novato | Novice Adventurer | 🗡️ | — |
| 2 | 75 | Caçador de Masmorras | Dungeon Crawler | 🛡️ | ~1-2 semanas |
| 3 | 300 | Veterano de Batalha | Battle Veteran | ⚔️ | ~1 mês |
| 4 | 900 | Campeão do Reino | Realm Champion | 🏅 | ~3 meses |
| 5 | 2200 | Herói Lendário | Legendary Hero | ⭐ | ~6 meses |
| 6 | 5000 | Mito Imortal | Immortal Myth | 👑 | ~12+ meses |

> **Nota**: Thresholds do Player são mais baixos porque player depende do DM pra muitas ações.
> A curva é exponencial suave — progressão rápida no início, grind aspiracional no topo.

### 2.3 Relação com Títulos de Metodologia

Os títulos de metodologia (Explorador → Caçador de Dados → Pesquisador → Arquiteto do Meta) **coexistem** com o rank geral. São badges especializados de contribuição científica, não substituem o rank.

- **Rank geral** = soma de TODAS as ações do usuário
- **Badge de metodologia** = especialização em contribuição pra metodologia
- Ambos aparecem no perfil, em posições distintas

---

## 3. Tabela de Ações e XP

### 3.1 Ações DM

| action_key | Ação | XP Base | Cooldown | Justificativa |
|------------|------|---------|----------|---------------|
| `dm_campaign_created` | Criar campanha | 20 | 3/semana | Incentiva começar, previne spam |
| `dm_session_created` | Criar sessão | 10 | 5/dia | Preparação ativa |
| `dm_combat_started` | Iniciar combate | 10 | 20/dia | Ação frequente, XP moderado |
| `dm_combat_completed` | Finalizar combate | 25 | 20/dia | Core loop, recompensa completar |
| `dm_combat_rated` | Avaliar dificuldade pós-combate | 30 | 20/dia | **Alta prioridade** — alimenta metodologia |
| `dm_combat_gold` | Combate Gold (DM rating + 3 votos) | 50 | sem limite | Bônus — incentiva pedir votos dos jogadores |
| `dm_streak_weekly` | Streak semanal mantida | 15 × semanas | 1/semana | Compounding: semana 1 = 15, semana 4 = 60 |
| `dm_player_invited` | Jogador aceita convite | 20 | 10/semana | Growth orgânico |
| `dm_preset_created` | Criar preset de encontro | 10 | 5/dia | Incentiva organização |
| `dm_preset_used` | Usar preset em combate | 5 | 10/dia | Reuso de conteúdo |
| `dm_spell_voted` | Votar tier de spell | 5 | 10/dia | Contribuição leve, volume alto |
| `dm_npc_created` | Criar NPC | 5 | 10/dia | World-building |
| `dm_note_created` | Criar nota de campanha | 5 | 10/dia | Organização |

### 3.2 Ações Player

| action_key | Ação | XP Base | Cooldown | Justificativa |
|------------|------|---------|----------|---------------|
| `player_account_created` | Criar conta | 25 | 1/lifetime | Welcome bonus |
| `player_campaign_joined` | Entrar em campanha | 15 | 5/semana | Social engagement |
| `player_combat_participated` | Participar de combate | 20 | 20/dia | Core loop |
| `player_combat_voted` | Votar dificuldade pós-combate | 15 | 20/dia | Contribuição pra metodologia |
| `player_character_created` | Criar personagem | 10 | 5/dia | Engajamento criativo |
| `player_compendium_explored` | Explorar compêndio (5+ itens/sessão) | 5 | 1/dia | Descoberta autônoma |
| `player_journal_written` | Escrever no journal | 10 | 5/dia | Narrativa pessoal |
| `player_npc_noted` | Criar nota de NPC | 5 | 10/dia | World engagement |
| `player_quest_noted` | Criar nota de quest | 5 | 10/dia | Tracking ativo |
| `player_spell_voted` | Votar tier de spell | 5 | 10/dia | Contribuição comunitária |
| `player_spell_searched` | Buscar spell em combate | 3 | 5/dia | Engajamento durante sessão |

### 3.3 Ações Compartilhadas (role determinada pelo contexto)

| action_key | Ação | XP Base | Cooldown | Justificativa |
|------------|------|---------|----------|---------------|
| `profile_completed` | Completar perfil (nome + avatar) | 15 | 1/lifetime | Onboarding |
| `onboarding_completed` | Completar wizard de onboarding | 10 | 1/lifetime | Reduz abandono |
| `tour_completed` | Completar tour do dashboard | 10 | 1/lifetime | Discovery |

### 3.4 Regra do Streak Compounding

O `dm_streak_weekly` usa multiplicador pela quantidade de semanas consecutivas:

```
Semana 1: 15 XP
Semana 2: 30 XP
Semana 3: 45 XP
Semana 4: 60 XP
...
Semana N: 15 × N XP (cap em 52 semanas = 780 XP)
```

Isso recompensa consistência de forma crescente. Um DM com streak de 10 semanas ganha 150 XP naquela semana.

---

## 4. Arquitetura Técnica

### 4.1 Pipeline de XP

```
Ação do usuário (server action / API route)
  → grantXp(userId, actionKey, role, metadata)
    → Checa cooldown (query xp_ledger)
    → Se permitido: INSERT xp_ledger
    → Trigger Postgres: atualiza user_xp (total + rank)
    → Retorna { granted, xp, newTotal, rankUp? }
  → Client recebe resultado e exibe animação
```

### 4.2 Schema do Banco de Dados

#### Tabela `xp_actions` (configuração)

```sql
CREATE TABLE public.xp_actions (
  action_key TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('dm', 'player', 'both')),
  xp_base INTEGER NOT NULL CHECK (xp_base > 0),
  cooldown_max INTEGER,                    -- NULL = ilimitado
  cooldown_period TEXT CHECK (cooldown_period IN ('day', 'week', 'month', 'lifetime')),
  description_pt TEXT NOT NULL,
  description_en TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### Tabela `xp_ledger` (append-only, imutável)

```sql
CREATE TABLE public.xp_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_key TEXT NOT NULL REFERENCES public.xp_actions(action_key),
  role TEXT NOT NULL CHECK (role IN ('dm', 'player')),
  xp_amount INTEGER NOT NULL CHECK (xp_amount > 0),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_xp_ledger_user_action ON public.xp_ledger (user_id, action_key, created_at DESC);
CREATE INDEX idx_xp_ledger_user_role ON public.xp_ledger (user_id, role);
```

#### Tabela `user_xp` (materializada)

```sql
CREATE TABLE public.user_xp (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dm_xp INTEGER DEFAULT 0,
  dm_rank INTEGER DEFAULT 1,
  player_xp INTEGER DEFAULT 0,
  player_rank INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### Tabela `rank_thresholds` (lookup)

```sql
CREATE TABLE public.rank_thresholds (
  role TEXT NOT NULL CHECK (role IN ('dm', 'player')),
  rank INTEGER NOT NULL CHECK (rank >= 1),
  xp_required INTEGER NOT NULL,
  title_pt TEXT NOT NULL,
  title_en TEXT NOT NULL,
  icon TEXT NOT NULL,
  PRIMARY KEY (role, rank)
);
```

#### Trigger de Atualização

```sql
CREATE OR REPLACE FUNCTION update_user_xp()
RETURNS TRIGGER AS $$
DECLARE
  v_total INTEGER;
  v_new_rank INTEGER;
BEGIN
  -- Soma total de XP para a role
  SELECT COALESCE(SUM(xp_amount), 0) INTO v_total
  FROM public.xp_ledger
  WHERE user_id = NEW.user_id AND role = NEW.role;

  -- Deriva rank do total
  SELECT COALESCE(MAX(rank), 1) INTO v_new_rank
  FROM public.rank_thresholds
  WHERE role = NEW.role AND xp_required <= v_total;

  -- Upsert user_xp
  INSERT INTO public.user_xp (user_id, dm_xp, dm_rank, player_xp, player_rank, updated_at)
  VALUES (
    NEW.user_id,
    CASE WHEN NEW.role = 'dm' THEN v_total ELSE 0 END,
    CASE WHEN NEW.role = 'dm' THEN v_new_rank ELSE 1 END,
    CASE WHEN NEW.role = 'player' THEN v_total ELSE 0 END,
    CASE WHEN NEW.role = 'player' THEN v_new_rank ELSE 1 END,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    dm_xp = CASE WHEN NEW.role = 'dm' THEN v_total ELSE public.user_xp.dm_xp END,
    dm_rank = CASE WHEN NEW.role = 'dm' THEN v_new_rank ELSE public.user_xp.dm_rank END,
    player_xp = CASE WHEN NEW.role = 'player' THEN v_total ELSE public.user_xp.player_xp END,
    player_rank = CASE WHEN NEW.role = 'player' THEN v_new_rank ELSE public.user_xp.player_rank END,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_user_xp
AFTER INSERT ON public.xp_ledger
FOR EACH ROW EXECUTE FUNCTION update_user_xp();
```

#### RLS Policies

```sql
-- xp_ledger: INSERT apenas via service_role (server-side)
-- xp_ledger: SELECT do próprio user
ALTER TABLE public.xp_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own xp_ledger"
  ON public.xp_ledger FOR SELECT
  USING (auth.uid() = user_id);

-- user_xp: SELECT do próprio user (e futuramente público pra leaderboard)
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own user_xp"
  ON public.user_xp FOR SELECT
  USING (auth.uid() = user_id);

-- xp_actions: SELECT público (configuração é leitura aberta)
ALTER TABLE public.xp_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read xp_actions"
  ON public.xp_actions FOR SELECT
  USING (true);

-- rank_thresholds: SELECT público
ALTER TABLE public.rank_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read rank_thresholds"
  ON public.rank_thresholds FOR SELECT
  USING (true);
```

### 4.3 Função Server-Side: `grantXp()`

```typescript
// lib/xp/grant-xp.ts
interface GrantXpResult {
  granted: boolean
  xp: number
  newTotal: number
  newRank: number
  rankUp?: { from: number; to: number; newTitle: string }
  reason?: string // se não concedido, explica por quê (cooldown, etc.)
}

async function grantXp(
  userId: string,
  actionKey: string,
  role: 'dm' | 'player',
  metadata?: Record<string, unknown>
): Promise<GrantXpResult>
```

**Lógica interna:**
1. Busca `xp_actions` pra obter `xp_base`, `cooldown_max`, `cooldown_period`
2. Se `cooldown_max` definido: conta registros no `xp_ledger` dentro do período
3. Se cooldown excedido: retorna `{ granted: false, reason: 'cooldown' }`
4. Se `dm_streak_weekly`: calcula multiplicador via `computeStreak()` existente
5. Insere no `xp_ledger` (trigger atualiza `user_xp`)
6. Lê `user_xp` atualizado
7. Compara rank anterior vs novo pra detectar `rankUp`
8. Retorna resultado

### 4.4 API Route

```
GET  /api/xp/me         → { dm_xp, dm_rank, player_xp, player_rank, dm_title, player_title }
GET  /api/xp/history    → últimos N registros do xp_ledger do user
GET  /api/xp/thresholds → rank_thresholds (público, cacheable)
```

### 4.5 Client Hook

```typescript
// lib/xp/hooks.ts
function useUserXp(): {
  dmXp: number
  dmRank: number
  dmTitle: string
  dmIcon: string
  dmNextRankXp: number    // XP pro próximo rank
  playerXp: number
  playerRank: number
  playerTitle: string
  playerIcon: string
  playerNextRankXp: number
  isLoading: boolean
}
```

---

## 5. Superfícies de UI

### 5.1 Dashboard — XP Card (Principal)

- **Localização**: Dashboard, próximo ao StreakBadge existente
- **Conteúdo**: Ícone do rank + título + barra de progresso pixel art dourada
- **Barra**: Reutiliza design da HP bar (golden), mostra "X / Y XP"
- **Animação**: Quando ganha XP, partículas douradas "+X XP" flutuam pra cima
- **Click**: Expande pra mostrar breakdown recente (últimas 5 ações)
- **Dual display**: Se user tem ambas roles, mostra dois mini-cards (DM + Player)

### 5.2 Post-Combat — XP Reward Toast

- **Trigger**: Após finalizar combate (DM) ou após combate encerrar (Player)
- **Conteúdo**: Lista de ações com XP ganho
  - "⚔️ Combate finalizado +25 XP"
  - "⭐ Dificuldade avaliada +30 XP"
  - "🏆 Combate Gold +50 XP"
- **Barra**: Avança em tempo real com animação suave
- **Duration**: 5 segundos, dismissable

### 5.3 Rank Up — Animação Especial

- **Trigger**: Quando `rankUp` retorna no `grantXp()`
- **Visual**: Tela escurece levemente (overlay), novo título aparece centralizado com brilho dourado
- **Mensagem**: "Você é agora um [Título]!" + frase temática
- **Estilo**: Pixel art, partículas douradas, som de level up (se soundboard ativo)
- **Duration**: 3 segundos, dismissable

### 5.4 Perfil / Badge Compacto

- **XpBadge**: Componente compacto com ícone + título
- **Aparece em**: Perfil do DM visível pra jogadores na sala de combate
- **Aparece em**: Lista de membros da campanha
- **Hover**: Mostra XP total e rank

### 5.5 Metodologia — Integração

- Badges de metodologia (Explorador, Pesquisador, etc.) continuam existindo
- XpCard e badges de metodologia aparecem lado a lado no dashboard
- /methodology page ganha seção "Seu Rank Geral" com link pro dashboard

---

## 6. Anti-Gaming e Segurança

| Vetor | Proteção |
|-------|----------|
| Spam de campanhas | Cooldown: 3/semana |
| Spam de combates vazios | `dm_combat_completed` exige combate com >= 1 round |
| XP injection | INSERT no ledger apenas via service_role |
| Contas de teste/admin | Filtradas via `excluded_accounts` (já existe) |
| Múltiplas contas | Aceitar por agora; futuro: fingerprint anti-abuse |
| Cooldown bypass | Período calculado server-side, imutável pelo client |

### Validações Mínimas para Ações

- `dm_combat_completed`: combate deve ter `round_number >= 1`
- `dm_combat_gold`: combate deve ter `dm_difficulty_rating IS NOT NULL` AND `difficulty_votes >= 3`
- `player_combat_participated`: player deve estar no `party_snapshot` do combate
- `player_compendium_explored`: tracking de itens visitados na sessão (client-side count, server valida >= 5)

---

## 7. Épicos de Implementação

### Épico 1: Fundação XP (Backend) — ~1 dia

| Story | Descrição | Dependência |
|-------|-----------|-------------|
| 1.1 | Migration: criar 4 tabelas + trigger + índices | — |
| 1.2 | Seed: popular `xp_actions` (26 ações) + `rank_thresholds` (12 ranks) | 1.1 |
| 1.3 | RLS policies pra todas as tabelas | 1.1 |
| 1.4 | `grantXp()` server function com cooldown check | 1.1, 1.2 |
| 1.5 | API routes: `/api/xp/me`, `/api/xp/thresholds` | 1.4 |

### Épico 2: Dashboard XP (Frontend) — ~1 dia

| Story | Descrição | Dependência |
|-------|-----------|-------------|
| 2.1 | `useUserXp()` hook + provider | Épico 1 |
| 2.2 | `XpCard` componente no dashboard | 2.1 |
| 2.3 | Barra de XP pixel art dourada animada | 2.2 |
| 2.4 | `XpBadge` compacto pra header/perfil | 2.1 |

### Épico 3: Integração de Ações (Wiring) — ~1-2 dias

| Story | Descrição | Dependência |
|-------|-----------|-------------|
| 3.1 | DM combate: started, completed, rated, gold | Épico 1 |
| 3.2 | DM campanha: created, player_invited, session_created | Épico 1 |
| 3.3 | DM conteúdo: preset, NPC, notes, spell_voted | Épico 1 |
| 3.4 | Player combate: participated, voted | Épico 1 |
| 3.5 | Player autônomo: journal, compendium, spell_voted, character | Épico 1 |
| 3.6 | Compartilhadas: profile, onboarding, tour | Épico 1 |
| 3.7 | Streak → XP: integrar com `computeStreak()` | Épico 1 |

### Épico 4: Recompensas Visuais — ~1 dia

| Story | Descrição | Dependência |
|-------|-----------|-------------|
| 4.1 | `XpRewardToast` pós-ação com breakdown | Épico 2, Épico 3 |
| 4.2 | `RankUpAnimation` celebração | Épico 2 |
| 4.3 | Rank no perfil público + sala de combate | 2.4 |
| 4.4 | Integração com /methodology (badges coexistentes) | Épico 2 |

### Épico 5: i18n + Polish — ~0.5 dia

| Story | Descrição | Dependência |
|-------|-----------|-------------|
| 5.1 | Traduções PT-BR + EN pra todos os títulos e mensagens | Épicos 2-4 |
| 5.2 | Animações e transições finais | Épico 4 |
| 5.3 | QA: verificar cooldowns, edge cases, rank up correto | Todos |

---

## 8. Decisões Documentadas

| # | Decisão | Razão |
|---|---------|-------|
| D-01 | Rankings **separados** DM vs Player | Ações fundamentalmente diferentes; misturar dilui significado |
| D-02 | **6 ranks** por role com curva exponencial | Progressão rápida inicial + grind aspiracional no topo |
| D-03 | XP via **tabela de configuração** (não hardcoded) | Permite rebalanceamento sem deploy |
| D-04 | **Cooldowns por ação** para anti-gaming | Previne spam sem punir uso legítimo |
| D-05 | **Append-only ledger** + trigger materializado | Auditável, performático, sem race conditions |
| D-06 | XP concedido **server-side only** | Previne manipulação client-side |
| D-07 | **NÃO retroativo** — fresh start | Complexidade de recálculo não justifica |
| D-08 | Títulos **narrativos RPG** (não "Level X") | Alinha com identidade pixel art do produto |
| D-09 | Badges de metodologia **coexistem** com rank | Especialização vs. progressão geral |
| D-10 | Barra de XP **reutiliza design** da HP bar | Consistência visual, menos trabalho |
| D-11 | DM streak → XP com **compounding** (15 × semanas) | Multiplicador crescente reforça retenção semanal |
| D-12 | Player tem ações **autônomas** | Não depender 100% do DM pra progredir |
| D-13 | Thresholds Player **mais baixos** que DM | Player tem menos oportunidades de XP |
| D-14 | Cooldown de `dm_combat_completed` exige >= 1 round | Previne spam de combates vazios |
| D-15 | Guest mode **não ganha XP** | Guest é inferior by design (teaser pra registro) |

---

## 9. Arquivos de Referência

| Arquivo | Relevância |
|---------|-----------|
| `lib/utils/streak.ts` | Lógica de streak existente pra integrar |
| `lib/analytics/track.ts` | Pontos de instrumentação de eventos |
| `components/dashboard/StreakBadge.tsx` | Pattern de badge no dashboard |
| `components/dashboard/ResearcherBadge.tsx` | Pattern de badge com reveal animation |
| `components/methodology/MethodologyProgressBar.tsx` | Pattern de barra dourada |
| `components/methodology/MethodologyMilestoneToast.tsx` | Pattern de toast de milestone |
| `components/methodology/TitleProgressionDisplay.tsx` | Títulos de metodologia existentes |
| `components/methodology/ContributorCard.tsx` | Card de contribuição pessoal |
| `docs/epic-metodologia-pocket-dm.md` | Visão da metodologia |
| `docs/methodology-status-2026-04-04.md` | Status atual da metodologia |

---

## 10. Métricas de Sucesso

| Métrica | Target | Como Medir |
|---------|--------|-----------|
| Adoção | 80% dos DMs ativos atingem Rank 2 em 3 semanas | Query `user_xp WHERE dm_rank >= 2` |
| Rating de combate | +30% de combates com dm_difficulty_rating | Comparar antes/depois no `get_methodology_stats()` |
| Retenção semanal | +20% em streak médio de DMs | Comparar `computeStreak()` médio |
| Engagement Player | 50% dos players fazem >= 1 ação autônoma/semana | Query `xp_ledger` por ações player não-combate |

---

## 11. Futuro (Pós-MVP)

Itens **NÃO inclusos** neste épico, reservados pra iterações futuras:

- **Leaderboard** — ranking público dos top contributors (requer opt-in e volume)
- **Achievements/Badges** — conquistas específicas ("Primeiro TPK", "100 combates", etc.)
- **Recompensas tangíveis** — desbloquear features, temas, ou cosmetics com XP
- **Leaderboard por campanha** — ranking dentro de uma campanha específica
- **XP Decay** — penalidade por inatividade (decidimos contra por enquanto)
- **Seasonal resets** — seasons com rank reset (tipo Diablo/LoL)
- **API pública de ranking** — expor rankings pra integração externa
