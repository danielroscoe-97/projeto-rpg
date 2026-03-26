"use client";

import { useCallback, useState } from "react";
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

      const oldIndex = combatants.findIndex((c) => c.id === active.id);
      const newIndex = combatants.findIndex((c) => c.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(combatants, oldIndex, newIndex);
      onReorder(newOrder, String(active.id));
    },
    [combatants, onReorder]
  );

  const activeCombatant = activeId ? combatants.find((c) => c.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={combatants.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        {combatants.map((c) => (
          <SortableItem key={c.id} combatant={c} renderItem={renderItem} />
        ))}
      </SortableContext>

      <DragOverlay>
        {activeCombatant && (
          <div className="opacity-80 shadow-lg rounded-md">
            {renderItem(activeCombatant, {})}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

interface SortableItemProps {
  combatant: Combatant;
  renderItem: (combatant: Combatant, dragHandleProps: Record<string, unknown>) => React.ReactNode;
}

function SortableItem({ combatant, renderItem }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: combatant.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const dragHandleProps = { ...attributes, ...listeners };

  return (
    <div ref={setNodeRef} style={style}>
      {renderItem(combatant, dragHandleProps)}
    </div>
  );
}
