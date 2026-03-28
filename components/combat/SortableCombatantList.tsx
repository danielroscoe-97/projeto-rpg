"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Combatant } from "@/lib/types/combat";

// ─── Block model: groups become a single draggable unit ─────────────────────

type SortableBlock =
  | { kind: "single"; id: string; members: [Combatant] }
  | { kind: "group"; id: string; groupId: string; members: Combatant[] };

function buildBlocks(combatants: Combatant[]): SortableBlock[] {
  const blocks: SortableBlock[] = [];
  const seenGroups = new Set<string>();

  for (const c of combatants) {
    if (!c.monster_group_id) {
      blocks.push({ kind: "single", id: c.id, members: [c] });
      continue;
    }
    if (seenGroups.has(c.monster_group_id)) continue;
    seenGroups.add(c.monster_group_id);
    const members = combatants
      .filter((m) => m.monster_group_id === c.monster_group_id)
      .sort((a, b) => (a.group_order ?? 0) - (b.group_order ?? 0));
    blocks.push({
      kind: "group",
      id: `group:${c.monster_group_id}`,
      groupId: c.monster_group_id,
      members,
    });
  }
  return blocks;
}

/** Flatten blocks back into a flat combatant array preserving block order. */
function flattenBlocks(blocks: SortableBlock[]): Combatant[] {
  return blocks.flatMap((b) => b.members);
}

// ─── Public API ─────────────────────────────────────────────────────────────

interface SortableCombatantListProps {
  combatants: Combatant[];
  onReorder: (newOrder: Combatant[], movedId?: string) => void;
  renderItem: (combatant: Combatant, dragHandleProps: Record<string, unknown>) => React.ReactNode;
}

export function SortableCombatantList({
  combatants,
  onReorder,
  renderItem,
}: SortableCombatantListProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const blocks = useMemo(() => buildBlocks(combatants), [combatants]);
  const blockIds = useMemo(() => blocks.map((b) => b.id), [blocks]);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reorderedBlocks = arrayMove(blocks, oldIndex, newIndex);
      const newOrder = flattenBlocks(reorderedBlocks);

      // Use the first member's id as the "moved" id for initiative adjustment
      const movedBlock = blocks[oldIndex];
      onReorder(newOrder, movedBlock.members[0]?.id);
    },
    [blocks, onReorder]
  );

  // Find the active block for overlay rendering
  const activeBlock = activeId ? blocks.find((b) => b.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
        {blocks.map((block) => (
          <SortableBlock key={block.id} block={block} renderItem={renderItem} />
        ))}
      </SortableContext>

      <DragOverlay>
        {activeBlock && (
          <div className={`opacity-80 shadow-lg rounded-md ${activeBlock.kind === "group" ? "border-l-2 border-gold/30 rounded-l-sm" : ""}`}>
            {activeBlock.members.map((c) => (
              <div key={c.id}>{renderItem(c, {})}</div>
            ))}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

// ─── Sortable block wrapper ─────────────────────────────────────────────────

interface SortableBlockProps {
  block: SortableBlock;
  renderItem: (combatant: Combatant, dragHandleProps: Record<string, unknown>) => React.ReactNode;
}

function SortableBlock({ block, renderItem }: SortableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const dragHandleProps = { ...attributes, ...listeners };

  if (block.kind === "single") {
    return (
      <div ref={setNodeRef} style={style}>
        {renderItem(block.members[0], dragHandleProps)}
      </div>
    );
  }

  // Group: render all members inside one draggable container.
  // Only the first member gets the drag handle; others get an empty
  // handle (they can't be dragged individually).
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border-l-2 border-gold/30 rounded-l-sm"
    >
      {block.members.map((c, i) => (
        <div key={c.id}>{renderItem(c, i === 0 ? dragHandleProps : {})}</div>
      ))}
    </div>
  );
}
