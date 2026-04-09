# Epic: Combat Analytics & Growth Engine

> **Status**: Especificado, pronto para implementacao
> **Autor**: Party Mode (John, Sally, Winston, Bob) + Dani_
> **Data**: 2026-04-03
> **Pre-requisito**: Epic Combat Recap (implementado)

---

## Visao Geral

6 features que transformam o Pocket DM de "combat tracker" em "plataforma de analytics TTRPG":

1. **Coleta de Dados Novos** — fundacao de dados mais ricos
2. **Encontro Sugerido** — reduz tempo ate 1a acao de 60s pra 10s
3. **Link Publico com OG Preview** — motor viral, compartilhamento
4. **Session Recaps Automaticos** — persistencia de reports no banco
5. **Campaign Stats Acumulados** — "Spotify Wrapped" da campanha
6. **Streak Counter** — retencao via gamificacao

### Dependencias

```
[1] Coleta de Dados ──→ [4] Session Recaps ──→ [5] Campaign Stats
                                            └──→ [3] Link Publico (usa mesma tabela)
[2] Encontro Sugerido (independente)
[6] Streak Counter (independente)
```

### Ordem de implementacao sugerida

1 → 2 (paralelos) → 3 → 4 → 5 → 6

---

## Feature 1: Coleta de Dados Novos

### Objetivo
Enriquecer os dados coletados durante combate pra alimentar analytics mais ricos. Sem coleta nova, campaign stats e session recaps ficam limitados aos mesmos dados do leaderboard basico.

### O que JA e coletado (referencia)

```typescript
// CombatLogEntry.details (existente)
{
  damageAmount?: number;
  damageType?: string;        // "Fire", "Slashing", etc.
  damageModifier?: string;    // "normal", "resistant", "immune", "vulnerable"
  isNat20?: boolean;
  isNat1?: boolean;
  conditionName?: string;
  conditionAction?: "applied" | "removed";
}
```

### Mudancas necessarias

#### 1.1 — Novo campo `attackType` no log entry

**Arquivo**: `lib/stores/combat-log-store.ts`

Adicionar campo opcional ao `CombatLogEntry.details`:

```typescript
details?: {
  // ... campos existentes ...
  /** Source type of the attack/damage. Populated when DM uses a parsed monster action. */
  attackType?: "melee" | "ranged" | "spell";
};
```

**Onde popular**: Em `useCombatActions.ts` → `handleApplyDamage`, quando o dano vem de uma parsed action (`ParsedAction.attackType`), propagar o tipo pro log entry. Se o DM aplicar dano manual (sem selecionar action), fica `undefined`.

**Impacto**: Permite agregar "65% do dano foi melee" no report.

#### 1.2 — Turn time por round

**Arquivo**: `lib/stores/combat-store.ts` + `lib/stores/guest-combat-store.ts`

Novo campo no state:

```typescript
/** Snapshot of turn time at each round boundary. Key = round number, value = accumulated time per combatant at that point. */
turnTimeSnapshots: Record<number, Record<string, number>>;
```

**Quando popular**: No `advanceTurn()`, quando `round_number` incrementa (round boundary), fazer snapshot:

```typescript
if (newRound > currentRound) {
  state.turnTimeSnapshots[currentRound] = { ...state.turnTimeAccumulated };
}
```

**Impacto**: Permite calcular "Round 1 demorou 3min, Round 2 demorou 1min" e graficos de tempo por round.

#### 1.3 — Calculos derivados (sem coleta nova)

Estes dados ja existem nos log entries e so precisam de funcoes de agregacao em `combat-stats.ts`:

| Calculo | Dados fonte | Funcao |
|---------|-------------|--------|
| **Heal efficiency** | Σ healing / Σ damage received (por round) | `computeHealEfficiency(entries)` |
| **Resistencias usadas** | Count de entries com `damageModifier !== "normal"` | `computeResistanceUsage(entries)` |
| **Damage por tipo** | Group by `damageType` | `computeDamageByType(entries)` |
| **Damage por source** | Group by `attackType` | `computeDamageBySource(entries)` |
| **Turn time por round** | `turnTimeSnapshots` diffs entre rounds | `computeTurnTimePerRound(snapshots)` |

### Arquivos afetados

| Arquivo | Mudanca |
|---------|---------|
| `lib/stores/combat-log-store.ts` | Extend `CombatLogEntry.details` com `attackType` |
| `lib/stores/combat-store.ts` | Add `turnTimeSnapshots`, snapshot no `advanceTurn` |
| `lib/stores/guest-combat-store.ts` | Mesmo: add `turnTimeSnapshots` |
| `lib/hooks/useCombatActions.ts` | Propagar `attackType` da parsed action pro log |
| `lib/utils/combat-stats.ts` | Novas funcoes de agregacao |
| `lib/types/combat-report.ts` | Extend `CombatReportSummary` com novos campos |

### Esforco estimado: M (3-4h)

---

## Feature 2: Encontro Sugerido (Preset no /try)

### Objetivo
Reduzir tempo ate primeira acao util de 60-90s pra ~10s. Quando o DM abre /try com setup vazio, oferecer um encontro pre-montado com 1 clique.

### Preset: "Goblin Ambush"

```typescript
// lib/data/starter-encounters.ts

export interface StarterEncounterPreset {
  nameKey: string; // i18n key
  players: Array<{
    name: string;
    hp: number;
    ac: number;
    role: "player";
  }>;
  monsters: Array<{
    monsterId: string; // SRD monster ID
    count: number;
  }>;
}

export const STARTER_ENCOUNTER: StarterEncounterPreset = {
  nameKey: "preset_goblin_ambush",
  players: [
    { name: "Thorin", hp: 45, ac: 18, role: "player" },
    { name: "Elara", hp: 32, ac: 15, role: "player" },
    { name: "Grimjaw", hp: 38, ac: 16, role: "player" },
    { name: "Luna", hp: 28, ac: 12, role: "player" },
  ],
  monsters: [
    { monsterId: "goblin-mm", count: 3 },
  ],
};
```

Usando o Goblin do SRD 2014 (`goblin-mm`): CR 1/4, HP 7, AC 15 — encontro balanceado pra 4 PCs nivel 1.

### UI: Banner no GuestEncounterSetup

Quando `combatants.length === 0`, mostrar banner acima do formulario de add:

```
┌──────────────────────────────────────────────────────┐
│ ⚔️ Quer testar com um encontro pronto?               │
│ 4 aventureiros vs 3 Goblins — pronto em 1 clique    │
│                                                      │
│ [▶️ Carregar encontro]    [Montar do zero →]          │
└──────────────────────────────────────────────────────┘
```

- "Carregar encontro" → popula store com players + busca goblins no SRD + auto-roll initiatives
- "Montar do zero" → esconde o banner (nao navega)
- Banner nao reaparece se o DM ja adicionou combatants
- Banner nao aparece se ha dados de sessao anterior no sessionStorage

### Acao de carregamento

```typescript
async function loadStarterEncounter() {
  // 1. Add players
  for (const p of STARTER_ENCOUNTER.players) {
    addCombatant({
      name: p.name,
      current_hp: p.hp,
      max_hp: p.hp,
      temp_hp: 0,
      ac: p.ac,
      is_player: true,
      combatant_role: "player",
      // ... defaults pra outros campos
    });
  }

  // 2. Load monsters from SRD
  for (const m of STARTER_ENCOUNTER.monsters) {
    const monster = await loadMonsterById(m.monsterId, "2014");
    if (!monster) continue;
    // Use addMonsterGroup for count > 1
    // Auto-roll initiative for each
  }

  // 3. Auto-roll all initiatives
  handleRollAll();
}
```

### i18n

```json
// pt-BR
"preset_banner_title": "Quer testar com um encontro pronto?",
"preset_banner_description": "4 aventureiros vs 3 Goblins — pronto em 1 clique",
"preset_banner_load": "Carregar encontro",
"preset_banner_skip": "Montar do zero",
"preset_goblin_ambush": "Emboscada Goblin",

// en
"preset_banner_title": "Want to try a ready-made encounter?",
"preset_banner_description": "4 adventurers vs 3 Goblins — ready in 1 click",
"preset_banner_load": "Load encounter",
"preset_banner_skip": "Build from scratch",
"preset_goblin_ambush": "Goblin Ambush",
```

### Arquivos afetados

| Arquivo | Mudanca |
|---------|---------|
| `lib/data/starter-encounters.ts` | **NOVO** — preset data |
| `components/guest/GuestCombatClient.tsx` | Banner condicional no GuestEncounterSetup |
| `lib/srd/srd-loader.ts` | Possivelmente: funcao `loadMonsterById()` se nao existir |
| `messages/pt-BR.json` / `messages/en.json` | Chaves do preset |

### Esforco estimado: P (2-3h)

---

## Feature 3: Link Publico com OG Preview

### Objetivo
Permitir que o DM compartilhe um link (pocketdm.com.br/r/abc123) que mostra o combat report como pagina publica, com OG preview rico pra WhatsApp/Discord/Twitter. Cada view e um potencial novo usuario via CTA.

### 3.1 — Tabela `combat_reports`

**Migration**: `085_combat_reports.sql`

```sql
CREATE TABLE combat_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_code TEXT NOT NULL UNIQUE,
  encounter_name TEXT NOT NULL DEFAULT 'Encounter',
  report_data JSONB NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  encounter_id UUID REFERENCES encounters(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ, -- NULL = never expires (logged user), 30 days for guest
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_combat_reports_short_code ON combat_reports(short_code);
CREATE INDEX idx_combat_reports_owner ON combat_reports(owner_id) WHERE owner_id IS NOT NULL;
CREATE INDEX idx_combat_reports_campaign ON combat_reports(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX idx_combat_reports_encounter ON combat_reports(encounter_id) WHERE encounter_id IS NOT NULL;

-- RLS
ALTER TABLE combat_reports ENABLE ROW LEVEL SECURITY;

-- Public read (anyone with the short_code can view)
CREATE POLICY "Anyone can read combat reports"
  ON combat_reports FOR SELECT USING (true);

-- Owner can insert/delete their own
CREATE POLICY "Users can insert own reports"
  ON combat_reports FOR INSERT WITH CHECK (
    auth.uid() = owner_id OR owner_id IS NULL
  );

CREATE POLICY "Users can delete own reports"
  ON combat_reports FOR DELETE USING (auth.uid() = owner_id);
```

**`short_code`**: 8 caracteres alphanumericos gerados com `nanoid` ou `crypto.randomUUID().slice(0, 8)`.

**`report_data`**: O `CombatReport` serializado (awards, narratives, summary, rankings).

**`expires_at`**: NULL pra DM logado (permanente), `now() + 30 days` pra guest (cleanup via cron ou lazy check).

### 3.2 — API Route: Criar report

**Arquivo**: `app/api/combat-reports/route.ts`

```typescript
// POST /api/combat-reports
// Body: { report: CombatReport, campaignId?: string, encounterId?: string }
// Returns: { shortCode: string, url: string }

export async function POST(req: Request) {
  const { report, campaignId, encounterId } = await req.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const shortCode = crypto.randomUUID().slice(0, 8);
  const expiresAt = user ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("combat_reports").insert({
    short_code: shortCode,
    encounter_name: report.encounterName,
    report_data: report,
    owner_id: user?.id ?? null,
    campaign_id: campaignId ?? null,
    encounter_id: encounterId ?? null,
    expires_at: expiresAt,
  });

  if (error) throw error;

  const url = `${new URL(req.url).origin}/r/${shortCode}`;
  return Response.json({ shortCode, url });
}
```

### 3.3 — Pagina publica: `/r/[code]`

**Arquivo**: `app/r/[code]/page.tsx` (server component, fora do /app — publico)

**Layout**: Mobile-first, screenshot-optimized.

**Principios de design**:
- Todo o conteudo cabe em **1 tela** no mobile (sem scroll pra print)
- Fundo dark solid (sem gradientes complexos que ficam feios em screenshot)
- Awards em **grid 2-col** no mobile (economiza espaco vertical)
- Narrativas limitadas a **2 no mobile** (3 no desktop)
- Font-size minimo 16px no mobile
- CTA fixo no final: "Rode seu combate gratis → pocketdm.com.br/try"

**Estrutura da pagina**:

```
Mobile (< 640px):              Desktop (>= 640px):
┌────────────────────┐         ┌──── max-w-md centered ────┐
│ ⚔️ COMBAT RECAP    │         │                           │
│ ━━━━━━━━━━━━━━━━━━│         │   (mesmo conteudo,        │
│ 📜 Encounter Name  │         │    card flutuante no      │
│ 4v3 · 7rds · 12m  │         │    centro da tela)        │
│                    │         │                           │
│ 🏆MVP    💀Assassin│         │   Awards em grid 3-col    │
│ Thorin   Elara    │         │                           │
│ 67dmg    2 kills  │         │                           │
│                    │         │                           │
│ 🛡️Tank   💚Healer │         │                           │
│ Grimjaw  Luna     │         │                           │
│ 45recv   28heal   │         │                           │
│                    │         │                           │
│ ─────────────────  │         │                           │
│ 📖 Thorin          │         │                           │
│ sobreviveu com 2HP │         │                           │
│ ─────────────────  │         │                           │
│                    │         │                           │
│ 💔2 PCs · 🎲5crits│         │                           │
│                    │         │                           │
│ ━━━━━━━━━━━━━━━━━━│         │                           │
│ Rode seu combate!  │         │                           │
│ [🚀 Testar gratis] │         │                           │
│ pocketdm.com.br       │         │                           │
└────────────────────┘         └───────────────────────────┘
```

### 3.4 — OG Image dinamica

**Arquivo**: `app/r/[code]/opengraph-image.tsx`

Usa `ImageResponse` do `next/og` (mesmo pattern do OG image existente em `app/opengraph-image.tsx`).

**Conteudo da imagem (1200x630)**:
- Background dark (#0a0a0f)
- Logo Pocket DM no topo
- Encounter name em fonte grande
- MVP destacado: "🏆 Thorin — 67 dmg"
- Matchup: "4 vs 3 · 7 rounds · 12min"
- URL pocketdm.com.br no rodape

**Meta tags**:
```html
<meta property="og:title" content="⚔️ Thorin foi MVP com 67 de dano!" />
<meta property="og:description" content="Goblin Ambush — 4 vs 3, 7 rounds, 12min. Rode seu combate gratis no Pocket DM." />
<meta property="og:image" content="https://pocketdm.com.br/r/abc123/opengraph-image" />
<meta property="og:url" content="https://pocketdm.com.br/r/abc123" />
```

### 3.5 — Integracao no RecapActions

Adicionar botao "Compartilhar como link" no RecapActions:
- POST pra `/api/combat-reports` com o report
- Recebe URL curta
- Copia pro clipboard
- Toast: "Link copiado! Cole no grupo pra compartilhar"

Para guest: funciona sem auth (owner_id = null, expira em 30 dias).
Para DM logado: vincula ao owner_id e campaign_id (permanente).

### Arquivos afetados

| Arquivo | Mudanca |
|---------|---------|
| `supabase/migrations/085_combat_reports.sql` | **NOVO** — tabela |
| `app/api/combat-reports/route.ts` | **NOVO** — API de criacao |
| `app/r/[code]/page.tsx` | **NOVO** — pagina publica responsiva |
| `app/r/[code]/opengraph-image.tsx` | **NOVO** — OG image dinamica |
| `app/r/[code]/layout.tsx` | **NOVO** — layout minimo (sem sidebar) |
| `components/combat/RecapActions.tsx` | **EDIT** — botao "Compartilhar como link" |
| `components/combat/PublicReportCard.tsx` | **NOVO** — componente da pagina publica |

### Esforco estimado: G (4-5h)

---

## Feature 4: Session Recaps Automaticos

### Objetivo
Quando o DM finaliza um combate (DM logado), persistir o CombatReport automaticamente no banco. Isso alimenta o historico de combates, campaign stats, e permite compartilhar recaps de combates passados.

### Fluxo

```
DM clica "Encerrar combate"
    ↓
Nome do encontro (modal ja existente)
    ↓
CombatRecap exibe (ja implementado)
    ↓ [NOVO — em paralelo]
buildCombatReport() → POST /api/combat-reports (auto-save)
    ↓
Report persistido com encounter_id + campaign_id
    ↓
Visivel no historico de encontros da campanha
```

### Implementacao

#### 4.1 — Auto-save no CombatSessionClient

No `proceedAfterNaming()`, apos construir o `CombatReport`, fazer POST automatico:

```typescript
// Auto-persist combat report (fire-and-forget, non-blocking)
if (report && getSessionId()) {
  fetch("/api/combat-reports", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      report,
      campaignId: campaignId ?? undefined,
      encounterId: useCombatStore.getState().encounter_id ?? undefined,
    }),
  }).catch(() => { /* non-fatal — report display still works without persistence */ });
}
```

Nao bloqueia a UI. Se falhar, o recap local ainda funciona — persistencia e best-effort.

#### 4.2 — Exibicao no EncounterHistory

No componente `EncounterHistory.tsx`, quando um encounter tem um `combat_report` vinculado, mostrar mini-recap:

```
📜 Goblin Ambush
   7 rounds | 12min | 🏆 MVP: Thorin (67 dmg)
   💀 2 PCs cairam | 3 monstros eliminados
   [Ver recap completo] [Compartilhar]
```

- "Ver recap completo" → abre modal com `CombatRecap` (report do banco)
- "Compartilhar" → gera link publico (Feature 3)

**Query**: No server component da campanha, fazer LEFT JOIN com `combat_reports`:

```sql
SELECT e.*, cr.report_data, cr.short_code
FROM encounters e
LEFT JOIN combat_reports cr ON cr.encounter_id = e.id
WHERE e.session_id IN (SELECT id FROM sessions WHERE campaign_id = $1)
  AND e.is_active = false
ORDER BY e.created_at DESC
```

### Arquivos afetados

| Arquivo | Mudanca |
|---------|---------|
| `components/session/CombatSessionClient.tsx` | **EDIT** — auto-save report no proceedAfterNaming |
| `components/campaign/EncounterHistory.tsx` | **EDIT** — mini-recap quando report existe |
| `app/app/campaigns/[id]/page.tsx` | **EDIT** — query inclui combat_reports |

### Esforco estimado: M (3-4h)

---

## Feature 5: Campaign Stats Acumulados

### Objetivo
"Spotify Wrapped" da campanha. Agregar dados de todos os combates de uma campanha em stats visuais no topo da pagina da campanha.

### Dados agregados

Computados server-side a partir da tabela `combat_reports` filtrada por `campaign_id`:

| Stat | Calculo | Display |
|------|---------|---------|
| **Total combates** | `COUNT(*)` | "12 combates" |
| **Total rounds** | `SUM(report_data->'summary'->>'totalRounds')` | "89 rounds" |
| **Tempo total** | `SUM(report_data->'summary'->>'totalDuration')` | "2h 34m" |
| **Dano total** | `SUM(report_data->'summary'->>'totalDamage')` | "1,247 dano" |
| **PCs caidos** | `SUM(report_data->'summary'->>'pcsDown')` | "8 quedas" |
| **Monstros derrotados** | `SUM(report_data->'summary'->>'monstersDefeated')` | "23 monstros" |
| **MVP all-time** | Count de vezes que cada nome aparece como award type="mvp" | "Thorin (MVP x7)" |
| **Maior dano em 1 combate** | `MAX(report_data->'summary'->>'totalDamage')` | "234 dano" |
| **Combate mais longo** | `MAX(report_data->'summary'->>'totalRounds')` | "14 rounds" |

### UI: CampaignStatsBar

Componente novo no topo da pagina da campanha, abaixo do header e acima das sections:

```
📊 Stats da Campanha
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│    12    │ │    89    │ │  2h 34m  │ │  Thorin  │
│ combates │ │  rounds  │ │  total   │ │  MVP x7  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

- **Mobile**: grid 2-col (2 cards por linha)
- **Desktop**: grid 4-col (todos visivel)
- So aparece se campanha tem **>= 2 combates** com reports salvos (1 combate nao e "stats acumulados")
- Animacao de entrada com Framer Motion (fade-in suave)

### Componente: `CampaignStatsBar`

```typescript
// components/campaign/CampaignStatsBar.tsx

interface CampaignStatsBarProps {
  stats: {
    totalEncounters: number;
    totalRounds: number;
    totalDuration: number; // ms
    totalDamage: number;
    pcsDown: number;
    monstersDefeated: number;
    mvpName: string | null;
    mvpCount: number;
  };
}
```

### Server-side computation

Na pagina da campanha (`app/app/campaigns/[id]/page.tsx`), query:

```typescript
const { data: reports } = await supabase
  .from("combat_reports")
  .select("report_data")
  .eq("campaign_id", campaignId);

// Agregar client-side (reports e JSONB, mais facil processar no JS)
const stats = aggregateCampaignStats(reports ?? []);
```

Funcao `aggregateCampaignStats()` em `lib/utils/campaign-stats.ts`.

### Arquivos afetados

| Arquivo | Mudanca |
|---------|---------|
| `lib/utils/campaign-stats.ts` | **NOVO** — funcao de agregacao |
| `components/campaign/CampaignStatsBar.tsx` | **NOVO** — componente visual |
| `app/app/campaigns/[id]/page.tsx` | **EDIT** — query reports + render stats |
| `app/app/campaigns/[id]/CampaignSections.tsx` | **EDIT** — posicionar stats bar |
| `messages/pt-BR.json` / `messages/en.json` | Chaves i18n |

### Esforco estimado: M (3-4h)

---

## Feature 6: Streak Counter

### Objetivo
Gamificacao leve: mostrar quantas semanas consecutivas o DM rodou sessoes. Inspirado no Duolingo, mas semanal (RPG nao e diario).

### Regra de negocio

- Uma "semana ativa" e uma semana (seg-dom) em que o DM **finalizou pelo menos 1 encontro** (encounter com `is_active = false`)
- Streak = numero de semanas consecutivas ativas, contando da semana atual para tras
- Se a semana atual nao tem encontro finalizado, verificar se a semana anterior teve (grace period: o streak so quebra quando DUAS semanas passam sem atividade)
- Streak minimo pra exibir: **2** (nao mostrar "1 semana" — e obvio demais)

### Query

```sql
WITH weekly_activity AS (
  SELECT DISTINCT DATE_TRUNC('week', e.created_at) AS week
  FROM encounters e
  JOIN sessions s ON s.id = e.session_id
  WHERE s.owner_id = $1
    AND e.is_active = false
  ORDER BY week DESC
),
numbered AS (
  SELECT week,
    ROW_NUMBER() OVER (ORDER BY week DESC) AS rn
  FROM weekly_activity
),
streak AS (
  SELECT COUNT(*) AS weeks
  FROM numbered
  WHERE week >= DATE_TRUNC('week', NOW()) - (rn - 1) * INTERVAL '1 week'
)
SELECT weeks FROM streak;
```

### UI: StreakBadge no Dashboard

Componente discreto no header do dashboard:

```
┌─────────────────────────────────┐
│ 🔥 3 semanas consecutivas!     │
└─────────────────────────────────┘
```

- Badge pequeno, nao intrusivo
- So aparece se streak >= 2
- Tooltip/subtitle: "Proxima sessao mantem o streak"
- Se streak = 0 ou 1, nao renderiza nada (evitar "shame")

**Mobile**: badge inline no header, abaixo do titulo "Dashboard"
**Desktop**: badge ao lado do titulo

### Componente: `StreakBadge`

```typescript
// components/dashboard/StreakBadge.tsx

interface StreakBadgeProps {
  weeks: number; // 0 = no streak
}

export function StreakBadge({ weeks }: StreakBadgeProps) {
  if (weeks < 2) return null;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 px-3 py-1">
      <span>🔥</span>
      <span className="text-sm font-medium text-orange-400">
        {t("streak_weeks", { count: weeks })}
      </span>
    </div>
  );
}
```

### Server-side: Dashboard page

Na `app/app/dashboard/page.tsx`, adicionar query de streak e passar pro component:

```typescript
const streakWeeks = await computeStreak(supabase, user.id);
// Pass to DashboardOverview
```

Funcao `computeStreak()` em `lib/utils/streak.ts`.

### i18n

```json
// pt-BR
"streak_weeks": "{count, plural, one {# semana consecutiva} other {# semanas consecutivas}}",

// en
"streak_weeks": "{count, plural, one {# consecutive week} other {# consecutive weeks}}",
```

### Arquivos afetados

| Arquivo | Mudanca |
|---------|---------|
| `lib/utils/streak.ts` | **NOVO** — funcao de calculo de streak |
| `components/dashboard/StreakBadge.tsx` | **NOVO** — badge visual |
| `app/app/dashboard/page.tsx` | **EDIT** — query streak, passar pro overview |
| `components/dashboard/DashboardOverview.tsx` | **EDIT** — renderizar StreakBadge |
| `messages/pt-BR.json` / `messages/en.json` | Chaves i18n |

### Esforco estimado: P (2-3h)

---

## Resumo de Impacto

### Novos arquivos (estimativa)

| Arquivo | Feature |
|---------|---------|
| `supabase/migrations/085_combat_reports.sql` | F3 |
| `lib/data/starter-encounters.ts` | F2 |
| `lib/utils/campaign-stats.ts` | F5 |
| `lib/utils/streak.ts` | F6 |
| `app/api/combat-reports/route.ts` | F3 |
| `app/r/[code]/page.tsx` | F3 |
| `app/r/[code]/opengraph-image.tsx` | F3 |
| `app/r/[code]/layout.tsx` | F3 |
| `components/combat/PublicReportCard.tsx` | F3 |
| `components/campaign/CampaignStatsBar.tsx` | F5 |
| `components/dashboard/StreakBadge.tsx` | F6 |

### Arquivos modificados (estimativa)

| Arquivo | Features |
|---------|----------|
| `lib/stores/combat-log-store.ts` | F1 |
| `lib/stores/combat-store.ts` | F1 |
| `lib/stores/guest-combat-store.ts` | F1 |
| `lib/hooks/useCombatActions.ts` | F1 |
| `lib/utils/combat-stats.ts` | F1 |
| `lib/types/combat-report.ts` | F1 |
| `components/guest/GuestCombatClient.tsx` | F2 |
| `components/combat/RecapActions.tsx` | F3 |
| `components/session/CombatSessionClient.tsx` | F4 |
| `components/campaign/EncounterHistory.tsx` | F4 |
| `app/app/campaigns/[id]/page.tsx` | F4, F5 |
| `app/app/campaigns/[id]/CampaignSections.tsx` | F5 |
| `app/app/dashboard/page.tsx` | F6 |
| `components/dashboard/DashboardOverview.tsx` | F6 |
| `messages/pt-BR.json` | F1-F6 |
| `messages/en.json` | F1-F6 |

### Esforco total estimado: ~18-23h

| Feature | Esforco |
|---------|---------|
| F1: Coleta de dados | M (3-4h) |
| F2: Encontro sugerido | P (2-3h) |
| F3: Link publico + OG | G (4-5h) |
| F4: Session recaps | M (3-4h) |
| F5: Campaign stats | M (3-4h) |
| F6: Streak counter | P (2-3h) |
