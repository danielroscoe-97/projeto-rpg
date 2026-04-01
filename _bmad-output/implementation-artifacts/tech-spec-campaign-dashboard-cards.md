---
title: 'Campaign Dashboard — Cards Grid with Quick Actions'
slug: 'campaign-dashboard-cards'
created: '2026-03-31'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 19 (App Router)', 'React 19', 'TypeScript 5', 'Tailwind CSS', 'shadcn/ui', 'next-intl', 'lucide-react']
files_to_modify: ['components/dashboard/CampaignManager.tsx', 'components/dashboard/CampaignsPageClient.tsx', 'messages/en.json', 'messages/pt-BR.json']
---

# Tech-Spec: Campaign Dashboard — Cards Grid with Quick Actions

## Overview

### Problem
Campaign list on dashboard uses flat rows (name + player count + action links). No visual identity per campaign, no image, no quick actions. Feels like a spreadsheet.

### Solution
Replace list with responsive card grid. Each card is fully clickable (navigates to campaign detail). Cards include:
- Image placeholder (SVG/icon with gradient, future: upload)
- Campaign name + player count
- Quick action buttons (Start Combat, Notes) with `stopPropagation`
- Kebab menu (Edit name, Delete) with `stopPropagation`

### Layout
- Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4`
- Card: vertical layout — image area top, info + actions bottom
- Image placeholder: 120px height, dark gradient bg with centered RPG icon (shield.png or chibi-knight.png)

## Changes

### CampaignManager.tsx — Full Rewrite of Render

**Card structure:**
```
<Link href={/app/campaigns/${id}} className="group block">
  <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-gold/40 transition-all">
    <!-- Image placeholder -->
    <div className="h-28 bg-gradient-to-br from-card to-background flex items-center justify-center">
      <Image src="/art/icons/shield.png" ... className="pixel-art opacity-30" />
    </div>
    <!-- Info -->
    <div className="p-4">
      <h3 className="font-semibold text-foreground truncate">{name}</h3>
      <p className="text-muted-foreground text-xs">{count} jogadores</p>
      <!-- Quick actions row -->
      <div className="flex items-center gap-2 mt-3">
        <Button variant="gold" size="sm" onClick={stopProp → navigate to combat}>⚔️ Combate</Button>
        <Button variant="ghost" size="sm" onClick={stopProp → navigate to notes}>📝</Button>
        <KebabMenu (edit, delete) />
      </div>
    </div>
  </div>
</Link>
```

**Quick Actions (stopPropagation):**
- ⚔️ Start Combat → navigates to `/app/dashboard` (existing session flow)
- 📝 Notes → navigates to `/app/campaigns/[id]` and auto-opens notes section (query param `?section=notes`)
- Edit name → inline edit (reuse existing logic)
- Delete → AlertDialog (reuse existing logic)

**Create Campaign:** Keep the "+ Nova Campanha" button above the grid. Create form appears as a card-sized form placeholder in the grid.

### CampaignsPageClient.tsx
- DM campaigns section: pass to CampaignManager (grid handled internally)
- Player campaigns: already uses grid — no changes needed

### i18n Keys (new)
- `campaigns_start_combat`: "Iniciar Combate" / "Start Combat"
- `campaigns_notes`: "Notas" / "Notes"
- `campaigns_card_players`: "{count} jogadores" / "{count} players"

## Acceptance Criteria
- [ ] Campaigns render as card grid (3 cols desktop, 2 tablet, 1 mobile)
- [ ] Card entirely clickable → navigates to campaign detail
- [ ] Quick action buttons work with stopPropagation (no double navigation)
- [ ] Image placeholder shows pixel art icon with gradient
- [ ] Kebab menu has Edit/Delete with existing functionality
- [ ] Create form integrates cleanly in grid layout
- [ ] Empty state preserved with pixel art
