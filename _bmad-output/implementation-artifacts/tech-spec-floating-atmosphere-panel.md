---
title: 'Floating Draggable Atmosphere Panel'
slug: 'floating-atmosphere-panel'
created: '2026-03-31'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 19 (App Router)', 'React 19', 'TypeScript 5', 'Tailwind CSS', 'framer-motion', 'localStorage']
files_to_modify: ['components/audio/DmAtmospherePanel.tsx', 'components/session/CombatSessionClient.tsx']
---

# Tech-Spec: Floating Draggable Atmosphere Panel

## Overview

### Problem
Atmosphere panel opens as a dropdown anchored to the toolbar button. It blocks combat view, can't be repositioned, and closes on click outside. DM can't keep it open while managing combat.

### Solution
Transform atmosphere panel into a floating, draggable widget:
- Click 🎭 button toggles a floating card that persists on screen
- Card is draggable anywhere on screen via drag handle (header bar)
- Collapsible: minimize to a small floating icon, expand to full panel
- Position + collapsed state persisted in localStorage
- Click outside does NOT close it (only explicit close/minimize)

## Changes

### DmAtmospherePanel.tsx — Refactor to Floating Widget

**Drag implementation:** Use `framer-motion`'s `drag` prop (already in project, no new deps):

```tsx
<motion.div
  drag
  dragMomentum={false}
  dragConstraints={{ left: 0, top: 0, right: maxX, bottom: maxY }}
  style={{ x: position.x, y: position.y }}
  onDragEnd={(_, info) => savePosition(info.point)}
  className="fixed z-50 w-80 bg-card border border-border rounded-xl shadow-2xl"
>
  {/* Drag handle / header */}
  <div className="flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing border-b border-border">
    <span className="text-xs text-gold font-medium flex items-center gap-1.5">
      🎭 Atmosfera
      {hasActiveAnything && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
    </span>
    <div className="flex items-center gap-1">
      <button onClick={toggleCollapse}>
        {collapsed ? <Maximize2 /> : <Minimize2 />}
      </button>
      <button onClick={close}>
        <X />
      </button>
    </div>
  </div>
  {/* Content — hidden when collapsed */}
  {!collapsed && (
    <div> ... existing tab content ... </div>
  )}
</motion.div>
```

**Collapsed state:** When collapsed, render only:
```tsx
<motion.div drag ... className="fixed z-50 w-12 h-12 bg-card border border-border rounded-full shadow-lg flex items-center justify-center cursor-grab">
  <button onClick={expand}>🎭</button>
</motion.div>
```

**LocalStorage persistence:**
- Key: `pocket-dm-atmosphere-position`
- Value: `{ x: number, y: number, collapsed: boolean }`
- Save on drag end + collapse toggle
- Load on mount with fallback to bottom-right corner

**Remove click-outside-to-close:** The panel is explicitly managed (close button or minimize).

### CombatSessionClient.tsx
- The 🎭 toolbar button toggles `isAtmosphereOpen` state
- Panel renders via `createPortal(document.body)` to escape toolbar flow
- Pass same props (onBroadcast, weatherEffect, onWeatherChange)

## Acceptance Criteria
- [ ] Panel floats freely over combat view
- [ ] Draggable via header bar (framer-motion drag)
- [ ] Stays within viewport bounds (dragConstraints)
- [ ] Collapse to small floating circle icon
- [ ] Expand back to full panel
- [ ] Position + collapse state saved to localStorage
- [ ] No close on click-outside (explicit close/minimize only)
- [ ] All existing audio/weather/volume functionality preserved
- [ ] Toolbar 🎭 button toggles panel open/closed
