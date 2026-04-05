# Plano de Implementação: Campaign Hub v2

**Spec:** `docs/spec-campaign-hub-v2.md`  
**Data:** 2026-04-05  
**Estratégia:** 5 fases, com paralelização máxima dentro de cada fase.  
**Status:** F1-F3 COMPLETAS — F4 pendente

### Execução Realizada

| Fase | Status | Commit | Arquivos Criados/Modificados |
|------|--------|--------|------------------------------|
| **F1** | DONE | `e4ff8c4`, `bfb5da3` | `messages/pt-BR.json`, `messages/en.json`, `lib/types/campaign-hub.ts` |
| **F2a** | DONE | `89f7021` | `components/campaign/CampaignPlayerAvatars.tsx`, `CampaignStatusCards.tsx`, `app/.../CampaignHero.tsx` |
| **F2b** | DONE | `89f7021` | `components/campaign/CampaignGridCard.tsx`, `app/.../CampaignGrid.tsx` |
| **F2c** | DONE | `89f7021` | `components/campaign/CampaignNavBar.tsx`, `CampaignHeroCompact.tsx`, `app/.../CampaignFocusView.tsx` |
| **F3** | DONE | `89f7021` | `app/app/campaigns/[id]/page.tsx` (DM View refatorada) |
| **F4** | PENDING | — | Polish, mobile, deprecar componentes antigos |

**F2 rodou com 3 agentes paralelos** (F2a + F2b + F2c simultaneamente). F3 integrou sequencialmente. Code review completo realizado com 10 fixes aplicados (3 bugs, 2 logic, 5 style).

**Desvios do plano original:**
- `CampaignHero` virou client component (não server) — necessário para interatividade (quick actions, CombatLaunchSheet)
- `CampaignStatusCards` recebeu prop `onOpenCombat` para evitar duplicação de `CombatLaunchSheet`
- `CampaignGridCard` ganhou `framer-motion` (adicionado pelo linter/F4a antecipado)
- Componentes F2 usam flat props em vez de `CampaignHubData` agrupado — integração mais explícita no `page.tsx`

---

## Dependências entre Fases

```
F1 (i18n + shared types)
  ↓
F2a (Hero) ←──── podem rodar EM PARALELO ────→ F2b (Grid) ←→ F2c (Focus View)
  ↓                                                ↓               ↓
F3 (page.tsx integration — requer F2a + F2b + F2c)
  ↓
F4 (polish + mobile + cleanup)
```

**Máximo de agentes paralelos: 3 (na Fase 2)**

---

## F1 — Foundation (i18n + Types) — CONCLUÍDA

**Status:** Concluída  
**Commits:** `e4ff8c4` (implementação), `bfb5da3` (code review fixes)  
**Objetivo:** Criar as chaves i18n e interfaces TypeScript compartilhadas que F2a/F2b/F2c precisam.

### O que foi feito

1. **31 chaves i18n** adicionadas em `messages/pt-BR.json` e `messages/en.json` (prefixo `hub_*`)
2. **`lib/types/campaign-hub.ts`** criado com:
   - `SectionId` (union type das 9 seções)
   - `VALID_SECTIONS` (readonly array para validação)
   - `SECTION_NAV_ORDER` (ordem da nav bar no Focus View)
   - `SectionGroup` ("operational" | "world" | "journal")
   - `SectionCardDef` (definição estática de card)
   - `MonsterOption` (centralizado, antes duplicado 3x)
   - `CampaignSectionCounts` (contagens agrupadas)
   - `CampaignHubData` (interface principal page.tsx → components)
3. **Spec** (`spec-campaign-hub-v2.md`) — wireframes ASCII (4 estados), design language, critérios de aceite
4. **Plan** (`plan-campaign-hub-v2.md`) — 5 fases com paralelização
5. **Code review** — 7 achados corrigidos (readonly types, nav order, spec/plan alignment, DM-only guard, ErrorBoundary reuse)

### Tarefas

#### F1.1 — Chaves i18n
**Arquivos:** `messages/pt-BR.json`, `messages/en.json`

Adicionar dentro do objeto `"campaign"` (APÓS a chave `"vote_error"`):

**PT-BR:**
```json
"hub_subtitle_session": "Sessão {number}",
"hub_subtitle_last": "Última sessão: há {days} dias",
"hub_subtitle_last_today": "Última sessão: hoje",
"hub_subtitle_new": "Campanha nova",
"hub_group_operational": "Operacional",
"hub_group_world": "Mundo",
"hub_group_journal": "Registro",
"hub_nav_overview": "Visão Geral",
"hub_card_encounters": "Encontros",
"hub_card_quests": "Quests",
"hub_card_players": "Jogadores",
"hub_card_npcs": "NPCs",
"hub_card_locations": "Locais",
"hub_card_factions": "Facções",
"hub_card_notes": "Notas",
"hub_card_inventory": "Inventário do Grupo",
"hub_card_mindmap": "Mapa Mental",
"hub_card_empty": "Nenhum ainda",
"hub_card_active_quests": "{count} {count, plural, one {ativa} other {ativas}}",
"hub_card_prepared": "{count} {count, plural, one {preparado} other {preparados}}",
"hub_kpi_session_active": "Sessão Ativa",
"hub_kpi_session_enter": "Continuar →",
"hub_kpi_encounters": "Encontros",
"hub_kpi_quests": "Quests Ativas",
"hub_onboard_step": "Passo {current}/{total}",
"hub_onboard_invite_cta": "Convidar",
"hub_onboard_encounter_cta": "Criar",
"hub_onboard_quest_cta": "Adicionar",
"hub_avatar_edit": "Editar personagem"
```

**EN:**
```json
"hub_subtitle_session": "Session {number}",
"hub_subtitle_last": "Last session: {days} days ago",
"hub_subtitle_last_today": "Last session: today",
"hub_subtitle_new": "New campaign",
"hub_group_operational": "Operations",
"hub_group_world": "World",
"hub_group_journal": "Journal",
"hub_nav_overview": "Overview",
"hub_card_encounters": "Encounters",
"hub_card_quests": "Quests",
"hub_card_players": "Players",
"hub_card_npcs": "NPCs",
"hub_card_locations": "Locations",
"hub_card_factions": "Factions",
"hub_card_notes": "Notes",
"hub_card_inventory": "Party Inventory",
"hub_card_mindmap": "Mind Map",
"hub_card_empty": "None yet",
"hub_card_active_quests": "{count} active",
"hub_card_prepared": "{count} prepared",
"hub_kpi_session_active": "Active Session",
"hub_kpi_session_enter": "Continue →",
"hub_kpi_encounters": "Encounters",
"hub_kpi_quests": "Active Quests",
"hub_onboard_step": "Step {current}/{total}",
"hub_onboard_invite_cta": "Invite",
"hub_onboard_encounter_cta": "Create",
"hub_onboard_quest_cta": "Add",
"hub_avatar_edit": "Edit character"
```

#### F1.2 — Shared Types
**Arquivo:** `lib/types/campaign-hub.ts` (**IMPLEMENTADO** — ver código real abaixo)

```typescript
import type { LucideIcon } from "lucide-react";
import type { PlayerCharacter } from "@/lib/types/database";
import type { CampaignMemberWithUser } from "@/lib/types/campaign-membership";
import type { AggregatedCampaignStats } from "@/lib/utils/campaign-stats";

export type SectionId = "encounters" | "quests" | "players" | "npcs"
  | "locations" | "factions" | "notes" | "inventory" | "mindmap";

export const VALID_SECTIONS: readonly SectionId[] = [...] as const;

/** Order of sections in the Focus View nav bar */
export const SECTION_NAV_ORDER: readonly SectionId[] = [
  "encounters", "quests", "players", "npcs", "notes",
  "locations", "factions", "inventory", "mindmap",
] as const;

export type SectionGroup = "operational" | "world" | "journal";

export interface SectionCardDef {
  id: SectionId;
  icon: LucideIcon;
  titleKey: string;        // i18n key (e.g. "hub_card_encounters")
  group: SectionGroup;
  dmOnly?: boolean;
}

export interface MonsterOption {
  name: string; cr: string; type?: string;
  slug?: string; token_url?: string | null; source?: string;
}

export interface CampaignSectionCounts {
  players: number; sessions: number; encounters: number;
  quests: number; npcs: number; locations: number;
  factions: number; notes: number;
}

export interface CampaignHubData {
  campaignId: string;
  campaignName: string;
  isOwner: boolean;
  userId: string;
  characters: PlayerCharacter[];        // Supabase Row type (full)
  counts: CampaignSectionCounts;        // grouped counts
  activeSessionId: string | null;
  activeSessionName: string | null;
  playerEmails: string[];
  campaignStats: AggregatedCampaignStats;
  srdMonsters?: MonsterOption[];
  initialMembers?: CampaignMemberWithUser[];
}
```

> **Nota para agentes F2:** usar `PlayerCharacter` (import de `@/lib/types/database`) para characters, não shape inline. Usar `counts.npcs`, `counts.players`, etc — NÃO flat `npcCount`.

**Commit:** `e4ff8c4` — `feat(campaign-hub): F1 — i18n keys + shared types for Campaign Hub v2`

---

## F2 — Core Components — PARALLEL, 3 agentes

### F2a — Hero Section (Agente 1)

**Objetivo:** Criar o Hero com avatares, KPI cards (com onboarding integrado), e quick actions.

**Arquivos a criar:**

#### `components/campaign/CampaignPlayerAvatars.tsx`
- Client component
- Props: `characters` (array do type acima), `campaignId`
- Renderiza row de avatares circulares com initial/token + nome + classe
- Click abre Popover (shadcn `@radix-ui/react-popover`) com mini-card:
  - HP bar (reutilizar estilo do HP tier: LIGHT/MODERATE/HEAVY/CRITICAL em 70/40/10%)
  - AC badge
  - Classe + nível
  - Link "Editar →" que navega `?section=players`
- Último slot: botão [+] que abre `InvitePlayerDialog`
- Mobile: row com `overflow-x-auto` se > 5 avatares

#### `components/campaign/CampaignStatusCards.tsx`
- Client component
- Props: `playerCount`, `sessionCount`, `questCount`, `finishedEncounterCount`, `activeSessionId`, `activeSessionName`, `campaignId`, `campaignName`, `playerEmails`
- 3 KPI cards em row:
  1. **Sessão Ativa** (se `activeSessionId`) — pulsing dot, "Continuar →", onClick abre `CombatLaunchSheet`
     Ou **Novo Combate** (se não tem sessão) — onClick abre `CombatLaunchSheet`
  2. **Encontros** — contagem, onClick navega `?section=encounters`
  3. **Quests** — contagem, onClick navega `?section=quests`
- Lógica de onboarding: se `playerCount === 0 || sessionCount === 0 || questCount === 0`:
  - Cards zerados mostram CTA button e step counter
  - Card jogadores: onClick abre `InvitePlayerDialog`
  - Card encontros: onClick abre `CombatLaunchSheet`
  - Card quests: onClick navega `?section=quests`
- Contém instâncias controladas de `InvitePlayerDialog` e `CombatLaunchSheet`

#### `app/app/campaigns/[id]/CampaignHero.tsx`
- **Server component** (apenas layout, sem interatividade)
- Props: subset de `CampaignHubData` necessário
- Layout:
  ```
  <div className="bg-card border border-border rounded-xl p-5 space-y-4">
    <div> ← breadcrumb + title </div>
    <div> subtitle contextual </div>
    <CampaignPlayerAvatars .../> ← client island
    <CampaignStatusCards .../> ← client island
    <QuickActionsRow .../> ← inline (3 buttons, reutilizar estilo CampaignQuickActions)
  </div>
  ```
- Quick actions inline (não componente separado): Novo Combate, Novo Encontro, Nova Nota
- Os botões "Novo Encontro" e "Nova Nota" fazem `router.push(?section=encounters)` e `?section=notes`

**Referência visual:** usar estilos do `CampaignCombatTriggers.tsx` para stats pills e do `CampaignOnboarding.tsx` para step styling.

**Commit:** `feat(campaign-hub): F2a — Hero section with player avatars, KPI cards, and quick actions`

---

### F2b — Section Grid (Agente 2)

**Objetivo:** Criar o grid de cards compactos que substitui os acordeões no Overview.

**Arquivos a criar:**

#### `components/campaign/CampaignGridCard.tsx`
- Client component
- Props: `sectionId: SectionId`, `icon: LucideIcon`, `title: string`, `count: number | null`, `flavor?: string`, `size: "large" | "compact"`
- Renderiza card com ícone, título, contagem, flavor text
- Click: `router.push(\`?section=${sectionId}\`, { scroll: false })`
- Variantes:
  - `large`: mais padding (`p-5`), mostra flavor text, `min-h-[120px]`
  - `compact`: menos padding (`p-4`), sem flavor, `min-h-[80px]`
- Styling conforme spec: `bg-card border border-border/60 rounded-xl hover:border-amber-500/30`

#### `app/app/campaigns/[id]/CampaignGrid.tsx`
- Client component
- Props: todas as contagens + `isOwner` + `campaignId`
- Layout com 3 grupos:
  ```tsx
  {/* Operacional */}
  <SectionGroupHeader label={t("hub_group_operational")} icon="⚡" />
  <div className="grid grid-cols-2 gap-3">
    <CampaignGridCard sectionId="encounters" size="large" ... />
    <CampaignGridCard sectionId="quests" size="large" ... />
  </div>

  {/* Mundo */}
  <SectionGroupHeader label={t("hub_group_world")} icon="🌍" />
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
    <CampaignGridCard sectionId="players" size="compact" ... />
    <CampaignGridCard sectionId="npcs" size="compact" ... />
    <CampaignGridCard sectionId="locations" size="compact" ... />
    <CampaignGridCard sectionId="factions" size="compact" ... />
  </div>

  {/* Registro */}
  <SectionGroupHeader label={t("hub_group_journal")} icon="📋" />
  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
    <CampaignGridCard sectionId="notes" size="compact" ... />
    {isOwner && <CampaignGridCard sectionId="inventory" size="compact" ... />}
    <CampaignGridCard sectionId="mindmap" size="compact" ... />
  </div>
  ```
- `SectionGroupHeader` é inline (não componente): `<h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-6 mb-2 flex items-center gap-2">`

**Commit:** `feat(campaign-hub): F2b — Section grid with grouped cards (Overview state)`

---

### F2c — Focus View + Nav Bar (Agente 3)

**Objetivo:** Criar a Focus View com nav bar sticky e renderização da seção selecionada.

**Arquivos a criar:**

#### `components/campaign/CampaignNavBar.tsx`
- Client component
- Props: `activeSection: SectionId`, `isOwner: boolean`
- Usar `SECTION_NAV_ORDER` de `@/lib/types/campaign-hub` para definir ordem dos pills
- Filtrar `inventory` se `!isOwner` (seção DM-only)
- Pill buttons horizontais para cada seção + "Overview"
- "Overview" pill: `onClick → router.push(pathname, { scroll: false })` (remove searchParam)
- Seção pills: `onClick → router.push(\`?section=${id}\`, { scroll: false })`
- Active pill: `border-amber-500 text-amber-400 bg-amber-500/10`
- Container: `sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/60`
- Mobile: `overflow-x-auto scrollbar-hide` para scroll horizontal
- Ícones: cada seção tem seu ícone Lucide (mesmos do grid)

#### `components/campaign/CampaignHeroCompact.tsx`
- Client component
- Props: `campaignName`, `characters` (minimal), `activeSessionName?`, `sessionCount`
- 1 linha: `← Dashboard | ⚔️ KRYNN · [●][●][●][●][●] · S5 ativa`
- Avatares mini: `w-6 h-6` sem nome/classe, só initial e ring
- Link "← Dashboard" como `<Link href="/app/dashboard">`

#### `app/app/campaigns/[id]/CampaignFocusView.tsx`
- Client component
- Props: `section: SectionId` + todos os dados necessários para renderizar qualquer seção
- Importa TODOS os componentes de seção (mesmos imports de `CampaignSections.tsx`)
- Usa `ErrorBoundary` de `@/components/ui/ErrorBoundary` (NÃO copiar `SectionErrorBoundary` — usar o existente com `fallback` prop customizado e `name` para logging)
- Switch/map de `section` → componente:
  ```tsx
  const SECTION_COMPONENTS: Record<SectionId, () => ReactNode> = {
    encounters: () => (
      <div>
        <EncounterSubTabs /> {/* builder/history pills, copiar lógica de CampaignSections */}
        {encounterTab === "builder" ? <CampaignEncounterBuilder .../> : <EncounterHistory .../>}
      </div>
    ),
    quests: () => <QuestBoard campaignId={campaignId} isEditable={isOwner} />,
    players: () => <PlayerCharacterManager .../>,
    npcs: () => <NpcList campaignId={campaignId} />,
    locations: () => <LocationList campaignId={campaignId} isEditable={isOwner} />,
    factions: () => <FactionList campaignId={campaignId} isEditable={isOwner} />,
    notes: () => <CampaignNotes campaignId={campaignId} />,
    inventory: () => <BagOfHolding campaignId={campaignId} userId={userId} isDm />,
    mindmap: () => <CampaignMindMap campaignId={campaignId} campaignName={campaignName} />,
  };
  ```
- `Suspense` boundary ao redor do conteúdo com skeleton fallback
- **Guard DM-only:** se `!isOwner` e `section` é `"inventory"`, redirecionar para Overview (`router.replace(pathname)`). `encounters` mostra apenas `EncounterHistory` para não-owners (sem builder)

**Commit:** `feat(campaign-hub): F2c — Focus View with sticky nav bar and section rendering`

---

## F3 — Integration (page.tsx) — SEQUENTIAL, 1 agente

**Objetivo:** Reescrever o DM View em `page.tsx` para usar os novos componentes.

**Pré-requisitos:** F2a, F2b, F2c COMPLETOS.

### Tarefas

#### F3.1 — Refatorar page.tsx (DM View)

**Arquivo:** `app/app/campaigns/[id]/page.tsx`

Manter intacto:
- Todo o bloco `if (role === 'player') { ... }` (linhas 40-194)
- Todas as queries do DM View (linhas 198-280)
- `aggregateCampaignStats` e `getSrdMonsters`

Substituir o JSX do DM View (linhas 285-358) por:

```tsx
// Parse section from searchParams
const searchParams = /* get from props */;
const section = searchParams?.section as SectionId | undefined;
const validSections: SectionId[] = ["encounters","quests","players","npcs","locations","factions","notes","inventory","mindmap"];
const activeSection = section && validSections.includes(section) ? section : null;

const hubData: CampaignHubData = {
  campaignId: campaign.id,
  campaignName: campaign.name,
  isOwner,
  userId: user.id,
  characters: characters ?? [],
  counts: {
    players: playerCount ?? 0,
    sessions: sessionCount ?? 0,
    encounters: finishedEncounterCount,
    quests: questCount ?? 0,
    npcs: npcCount ?? 0,
    locations: locationCount ?? 0,
    factions: factionCount ?? 0,
    notes: noteCount ?? 0,
  },
  activeSessionId: dmActiveSession?.id ?? null,
  activeSessionName: dmActiveSession?.name ?? null,
  playerEmails,
  campaignStats,
  srdMonsters: isOwner ? getSrdMonsters().map(...) : undefined,
  initialMembers,
};

return (
  <div className="space-y-6">
    {activeSection ? (
      <>
        <CampaignHeroCompact
          campaignName={campaign.name}
          characters={hubData.characters}
          activeSessionName={hubData.activeSessionName}
          sessionCount={hubData.sessionCount}
        />
        <CampaignNavBar activeSection={activeSection} isOwner={isOwner} />
        <CampaignFocusView section={activeSection} {...hubData} />
      </>
    ) : (
      <>
        <CampaignHero {...hubData} />
        <CampaignStatsBar stats={campaignStats} />
        {(playerCount ?? 0) > 0 || (sessionCount ?? 0) > 0 ? (
          <CampaignGrid {...hubData} />
        ) : null}
      </>
    )}
  </div>
);
```

#### F3.2 — Adicionar searchParams ao page

Next.js App Router: adicionar `searchParams` à assinatura:

```typescript
export default async function CampaignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ section?: string }>;
}) {
```

#### F3.3 — Verificar build

```bash
rtk tsc --noEmit
rtk next build
```

**Commit:** `feat(campaign-hub): F3 — integrate Hub v2 into page.tsx (Overview + Focus routing)`

---

## F4 — Polish + Mobile + Cleanup — PARALLEL, 2 agentes

### F4a — Polish Visual + Mobile (Agente 1)

#### Tarefas
1. **Mobile responsive** — verificar todos os breakpoints:
   - Hero: stack vertical, avatares com scroll horizontal
   - Grid: 2 cols em mobile para todos os grupos
   - Nav bar: scroll horizontal com `scrollbar-hide`
   - Hero compacto: nome truncado em mobile
2. **Animações suaves** — usar `framer-motion` onde instalado:
   - Cards: `whileHover={{ scale: 1.02 }}` sutil
   - Transição Overview ↔ Focus: fade
3. **Empty states** — cards com count 0 mostram "Nenhum ainda" em muted
4. **Touch targets** — todos os botões/cards `min-h-[44px]`

#### F4b — Cleanup + E2E (Agente 2)

#### Tarefas
1. **Remover arquivos depreciados:**
   - ~~`CampaignSections.tsx`~~ — NÃO deletar, mover para `_deprecated/` para rollback seguro
   - ~~`CampaignQuickActions.tsx`~~ — mover para `_deprecated/`
   - ~~`CampaignCombatTriggers.tsx`~~ — mover para `_deprecated/`
   - ~~`CampaignOnboarding.tsx`~~ — mover para `_deprecated/`
2. **Limpar imports** em `page.tsx` (remover imports dos componentes antigos)
3. **Atualizar E2E selectors** — se existem testes que usam `#section_*` IDs:
   - Pesquisar em `tests/` ou `e2e/` por referências a `section_players`, `section_encounters`, etc.
   - Atualizar pra nova estrutura (nav bar + focus view)
4. **Atualizar spec** — marcar `docs/spec-campaign-page-redesign.md` como superseded

**Commits:**
- `chore(campaign-hub): F4a — responsive polish and mobile optimization`
- `chore(campaign-hub): F4b — deprecate old components, update E2E selectors`

---

## Resumo de Paralelização

```
Fase  │ Agentes │ Duração Est. │ Depende de
──────┼─────────┼──────────────┼──────────
F1    │ 1       │ Rápido       │ —
F2a   │ 1       │ Médio        │ F1
F2b   │ 1       │ Médio        │ F1
F2c   │ 1       │ Médio        │ F1
F3    │ 1       │ Médio        │ F2a + F2b + F2c
F4a   │ 1       │ Curto        │ F3
F4b   │ 1       │ Curto        │ F3
──────┼─────────┼──────────────┼──────────
Total │ max 3   │              │
```

**Para maximizar paralelização:** executar F1, commitar, e imediatamente lançar F2a + F2b + F2c como 3 agentes paralelos. Após os 3 terminarem, F3 integra tudo. F4a + F4b rodam em paralelo como cleanup.

---

## Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| Componentes internos quebram no Focus View | Alto | Não modificar nenhum — apenas passar mesmas props |
| Focus View lenta (MindMap, EncounterBuilder) | Médio | Suspense boundary com skeleton |
| Deep linking quebra se searchParams mudar | Baixo | Validação contra `validSections` array |
| Mobile nav bar com muitos items | Baixo | Scroll horizontal com fade edges |
| Rollback necessário | Baixo | `CampaignSections.tsx` preservado em `_deprecated/` |
