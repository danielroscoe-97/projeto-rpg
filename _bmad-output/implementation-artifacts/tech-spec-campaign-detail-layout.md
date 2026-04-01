---
title: 'Campaign Detail — 2-Column Dashboard Layout'
slug: 'campaign-detail-layout'
created: '2026-03-31'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 19 (App Router)', 'React 19', 'TypeScript 5', 'Tailwind CSS', 'shadcn/ui']
files_to_modify: ['app/app/campaigns/[id]/page.tsx', 'app/app/campaigns/[id]/CampaignSections.tsx']
---

# Tech-Spec: Campaign Detail — 2-Column Dashboard Layout

## Overview

### Problem
Campaign detail page uses full-width stacked accordions. On desktop, each section stretches edge-to-edge creating a "scroll forever" experience. Wastes horizontal space and feels disconnected.

### Solution
Reorganize into 2-column layout on desktop (single column on mobile):
- **Main column (2/3):** Players, NPCs, Notes (content-heavy sections)
- **Sidebar (1/3):** Stats summary, Members, Encounters, Mind Map (lighter sections)

## Changes

### CampaignSections.tsx

Replace single `space-y-4` stack with responsive grid:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Main column */}
  <div className="lg:col-span-2 space-y-4">
    <Section icon={Users} title="Jogadores" defaultOpen={true}>...</Section>
    <Section icon={UserCircle} title="NPCs" defaultOpen={false}>...</Section>
    <Section icon={FileText} title="Notas" defaultOpen={false}>...</Section>
  </div>
  {/* Sidebar */}
  <div className="space-y-4">
    <Section icon={UserPlus} title="Membros" defaultOpen={false}>...</Section>
    <Section icon={Swords} title="Combates" defaultOpen={false}>...</Section>
    <Section icon={Network} title="Mapa Mental" defaultOpen={false}>...</Section>
  </div>
</div>
```

### page.tsx (DM view)

Move summary stats into a more compact header card:
```tsx
<div className="bg-card border border-border rounded-xl p-5">
  <div className="flex items-center justify-between">
    <div>
      <Link href="/app/dashboard" className="text-muted-foreground text-sm">← Voltar</Link>
      <h1 className="text-2xl font-semibold mt-1">{campaign.name}</h1>
    </div>
    <div className="flex gap-3">
      <StatBadge icon={Users} value={playerCount} label="jogadores" />
      <StatBadge icon={Calendar} value={sessionCount} label="sessoes" />
      <StatBadge icon={Swords} value={encounterCount} label="combates" />
    </div>
  </div>
</div>
```

### Mobile Behavior
- Single column: all sections stacked (current behavior preserved)
- Breakpoint: `lg:` (1024px+) for 2-column

## Acceptance Criteria
- [ ] Desktop (lg+): 2-column grid layout (2/3 + 1/3)
- [ ] Mobile/tablet: single column stacked (existing behavior)
- [ ] Players, NPCs, Notes in main column
- [ ] Members, Encounters, Mind Map in sidebar
- [ ] Header card with compact stats
- [ ] No functionality changes — just layout reorganization
