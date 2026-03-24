"use client";

import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCombatStore } from "@/lib/stores/combat-store";
import type { Combatant } from "@/lib/types/combat";

interface TiebreakerDragListProps {
  /** The subset of combatants that are tied on the same initiative value. */
  tiedCombatants: Combatant[];
}

export function TiebreakerDragList({ tiedCombatants }: TiebreakerDragListProps) {
  const { reorderCombatants } = useCombatStore();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = tiedCombatants.findIndex((c) => c.id === active.id);
    const newIndex = tiedCombatants.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedTied = arrayMove(tiedCombatants, oldIndex, newIndex);

    // Read current store state to avoid stale closure when multiple tie groups exist
    const updatedAll = [...useCombatStore.getState().combatants];
    let tiedIdx = 0;
    for (let i = 0; i < updatedAll.length; i++) {
      if (reorderedTied.some((t) => t.id === updatedAll[i].id)) {
        updatedAll[i] = reorderedTied[tiedIdx++];
      }
    }
    reorderCombatants(updatedAll);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={tiedCombatants.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul
          className="space-y-1"
          role="list"
          aria-label="Drag to resolve tie"
          data-testid="tiebreaker-drag-list"
        >
          {tiedCombatants.map((c) => (
            <SortableItem key={c.id} combatant={c} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableItem({ combatant }: { combatant: Combatant }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: combatant.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center gap-3 bg-amber-900/20 border border-amber-400/30 rounded px-4 py-2 cursor-grab active:cursor-grabbing select-none"
      data-testid={`tiebreaker-item-${combatant.id}`}
    >
      <span className="text-amber-400/60 text-xs">⠿</span>
      <span className="text-white text-sm font-medium">{combatant.name}</span>
      <span className="text-white/30 text-xs ml-auto">
        Init {combatant.initiative}
      </span>
    </li>
  );
}
