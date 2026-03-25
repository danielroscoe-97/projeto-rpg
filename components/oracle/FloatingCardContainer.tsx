"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  useDraggable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { usePinnedCardsStore, type PinnedCard } from "@/lib/stores/pinned-cards-store";
import { getMonsterById, getSpellById, findCondition } from "@/lib/srd/srd-search";
import { MonsterStatBlock } from "./MonsterStatBlock";
import { SpellCard } from "./SpellCard";
import { ConditionCard } from "./ConditionCard";
import "@/styles/stat-card-5e.css";

// ---------------------------------------------------------------------------
// Draggable Card Wrapper
// ---------------------------------------------------------------------------

function DraggableCard({
  card,
  children,
  onFocus,
  onClose,
  onMinimize,
}: {
  card: PinnedCard;
  children: React.ReactNode;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
}) {
  const { attributes: { role: _role, tabIndex: _tabIndex, ...attributes }, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: card.id });

  const style: React.CSSProperties = {
    position: "fixed",
    left: card.position.x + (transform?.x ?? 0),
    top: card.position.y + (transform?.y ?? 0),
    zIndex: card.zIndex + 1000, // offset above normal content
    pointerEvents: "auto",
    opacity: isDragging ? 0.9 : 1,
    maxHeight: "80vh",
    overflowY: "auto",
    transition: isDragging ? "none" : "transform 200ms ease",
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    onFocus();
    listeners?.onPointerDown?.(e);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      role="dialog"
      aria-modal="false"
      aria-label={`Pinned ${card.type} card`}
      tabIndex={-1}
      {...attributes}
      {...listeners}
      onPointerDown={handlePointerDown}
      data-testid={`floating-card-${card.id}`}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Minimized Card
// ---------------------------------------------------------------------------

function resolveDisplayName(card: PinnedCard): string {
  if (card.type === "monster") return getMonsterById(card.entityId, card.rulesetVersion)?.name ?? card.entityId;
  if (card.type === "spell") return getSpellById(card.entityId, card.rulesetVersion)?.name ?? card.entityId;
  return findCondition(card.entityId)?.name ?? card.entityId;
}

function MinimizedCard({
  card,
  index,
  onRestore,
  onClose,
  onFocus,
}: {
  card: PinnedCard;
  index: number;
  onRestore: () => void;
  onClose: () => void;
  onFocus: () => void;
}) {
  const typeIcon = card.type === "monster" ? "👹" : card.type === "spell" ? "✨" : "⚡";
  const displayName = resolveDisplayName(card);
  const typeClass =
    card.type === "spell"
      ? "card-type-spell"
      : card.type === "condition"
        ? "card-type-condition"
        : "";

  return (
    <div
      className={`stat-card-5e card-minimized card-transition ${typeClass}`}
      style={{
        position: "fixed",
        bottom: 8 + index * 40,
        right: 8,
        zIndex: card.zIndex + 1000,
        pointerEvents: "auto",
      }}
      onPointerDown={onFocus}
      data-testid={`minimized-card-${card.id}`}
    >
      <div className="card-toolbar">
        <button type="button" onClick={onRestore} aria-label="Restore card" title="Restore">
          +
        </button>
        <button type="button" onClick={onClose} aria-label="Close card" title="Close">
          ×
        </button>
      </div>
      <div className="card-name">
        {typeIcon} {displayName}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pinned Monster Card Wrapper
// ---------------------------------------------------------------------------

function PinnedMonsterCard({
  card,
  onPin,
  onClose,
  onMinimize,
}: {
  card: PinnedCard;
  onPin: () => void;
  onClose: () => void;
  onMinimize: () => void;
}) {
  const monster = getMonsterById(card.entityId, card.rulesetVersion);
  if (!monster) {
    return (
      <div className="stat-card-5e card-floating" data-testid="card-not-found">
        <div className="card-toolbar">
          <button type="button" onClick={onClose} aria-label="Close card">×</button>
        </div>
        <p className="card-name">Monster not found</p>
        <p className="card-subtitle">{card.entityId}</p>
      </div>
    );
  }
  return (
    <MonsterStatBlock
      monster={monster}
      variant="card"
      onPin={onPin}
      onClose={onClose}
      onMinimize={onMinimize}
    />
  );
}

// ---------------------------------------------------------------------------
// Pinned Spell Card Wrapper
// ---------------------------------------------------------------------------

function PinnedSpellCard({
  card,
  onPin,
  onClose,
  onMinimize,
}: {
  card: PinnedCard;
  onPin: () => void;
  onClose: () => void;
  onMinimize: () => void;
}) {
  const spell = getSpellById(card.entityId, card.rulesetVersion);
  if (!spell) {
    return (
      <div className="stat-card-5e card-type-spell card-floating" data-testid="card-not-found">
        <div className="card-toolbar">
          <button type="button" onClick={onClose} aria-label="Close card">×</button>
        </div>
        <p className="card-name">Spell not found</p>
        <p className="card-subtitle">{card.entityId}</p>
      </div>
    );
  }
  return (
    <SpellCard
      spell={spell}
      variant="card"
      onPin={onPin}
      onClose={onClose}
      onMinimize={onMinimize}
    />
  );
}

// ---------------------------------------------------------------------------
// Pinned Condition Card Wrapper
// ---------------------------------------------------------------------------

function PinnedConditionCard({
  card,
  onPin,
  onClose,
  onMinimize,
}: {
  card: PinnedCard;
  onPin: () => void;
  onClose: () => void;
  onMinimize: () => void;
}) {
  const condition = findCondition(card.entityId);
  if (!condition) {
    return (
      <div className="stat-card-5e card-type-condition card-floating" data-testid="card-not-found">
        <div className="card-toolbar">
          <button type="button" onClick={onClose} aria-label="Close card">×</button>
        </div>
        <p className="card-name">Condition not found</p>
        <p className="card-subtitle">{card.entityId}</p>
      </div>
    );
  }
  return (
    <ConditionCard
      condition={condition}
      variant="card"
      onPin={onPin}
      onClose={onClose}
      onMinimize={onMinimize}
    />
  );
}

// ---------------------------------------------------------------------------
// Main Container
// ---------------------------------------------------------------------------

export function FloatingCardContainer() {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const cards = usePinnedCardsStore((s) => s.cards);
  const moveCard = usePinnedCardsStore((s) => s.moveCard);
  const focusCard = usePinnedCardsStore((s) => s.focusCard);
  const unpinCard = usePinnedCardsStore((s) => s.unpinCard);
  const toggleMinimize = usePinnedCardsStore((s) => s.toggleMinimize);
  const unpinAll = usePinnedCardsStore((s) => s.unpinAll);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    setPortalRoot(document.getElementById("floating-cards-root"));
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Escape closes topmost visible card; Shift+Escape closes all (confirm at 3+)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape" || cards.length === 0) return;
      if (e.shiftKey) {
        if (cards.length >= 3) {
          if (!window.confirm(`Close all ${cards.length} pinned cards?`)) return;
        }
        unpinAll();
      } else {
        const visible = cards.filter((c) => !c.isMinimized);
        if (visible.length === 0) return;
        const topmost = [...visible].sort((a, b) => b.zIndex - a.zIndex)[0];
        unpinCard(topmost.id);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cards, unpinCard, unpinAll]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const card = cards.find((c) => c.id === active.id);
      if (!card) return;

      // Clamp to viewport — keep at least 300px of card width / 44px toolbar visible
      const newX = Math.max(0, Math.min(window.innerWidth - 300, card.position.x + delta.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 44, card.position.y + delta.y));
      moveCard(card.id, { x: newX, y: newY });
    },
    [cards, moveCard],
  );

  const expandedCards = useMemo(() => cards.filter((c) => !c.isMinimized), [cards]);
  const minimizedCards = useMemo(() => cards.filter((c) => c.isMinimized), [cards]);

  if (!portalRoot || cards.length === 0) return null;

  function renderCard(card: PinnedCard, onClose: () => void, onMinimize: () => void) {
    const onPin = () => focusCard(card.id);
    switch (card.type) {
      case "monster":
        return <PinnedMonsterCard card={card} onPin={onPin} onClose={onClose} onMinimize={onMinimize} />;
      case "spell":
        return <PinnedSpellCard card={card} onPin={onPin} onClose={onClose} onMinimize={onMinimize} />;
      case "condition":
        return <PinnedConditionCard card={card} onPin={onPin} onClose={onClose} onMinimize={onMinimize} />;
      default:
        return null;
    }
  }

  // Mobile: full-screen overlay
  if (isMobile) {
    const topCard = [...cards].sort((a, b) => b.zIndex - a.zIndex)[0];
    return createPortal(
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          backgroundColor: "rgba(0,0,0,0.8)",
          overflowY: "auto",
          padding: 16,
          pointerEvents: "auto",
        }}
        data-testid="floating-cards-mobile-overlay"
      >
        <button
          type="button"
          onClick={() => unpinCard(topCard.id)}
          style={{
            position: "fixed",
            top: 12,
            right: 12,
            zIndex: 10000,
            background: "rgba(0,0,0,0.6)",
            color: "#e8e4d0",
            border: "1px solid rgba(232,228,208,0.3)",
            borderRadius: 4,
            padding: "4px 10px",
            cursor: "pointer",
          }}
          aria-label="Close card"
        >
          ×
        </button>
        {renderCard(
          topCard,
          () => unpinCard(topCard.id),
          () => toggleMinimize(topCard.id),
        )}
      </div>,
      portalRoot,
    );
  }

  return createPortal(
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          pointerEvents: "none",
        }}
        data-testid="floating-cards-container"
      >
        {/* Expanded cards */}
        {expandedCards.map((card) => (
          <DraggableCard
            key={card.id}
            card={card}
            onFocus={() => focusCard(card.id)}
            onClose={() => unpinCard(card.id)}
            onMinimize={() => toggleMinimize(card.id)}
          >
            {renderCard(
              card,
              () => unpinCard(card.id),
              () => toggleMinimize(card.id),
            )}
          </DraggableCard>
        ))}

        {/* Minimized cards stacked bottom-right */}
        {minimizedCards.map((card, i) => (
          <MinimizedCard
            key={card.id}
            card={card}
            index={i}
            onRestore={() => toggleMinimize(card.id)}
            onClose={() => unpinCard(card.id)}
            onFocus={() => focusCard(card.id)}
          />
        ))}

        {/* Unpin All button */}
        {cards.length >= 2 && (
          <button
            type="button"
            onClick={unpinAll}
            style={{
              position: "fixed",
              bottom: 12,
              left: 12,
              pointerEvents: "auto",
              background: "rgba(26,26,30,0.9)",
              color: "#e8e4d0",
              border: "1px solid rgba(232,228,208,0.2)",
              borderRadius: 4,
              padding: "6px 12px",
              cursor: "pointer",
              fontSize: 12,
              zIndex: 10000,
            }}
            aria-label="Unpin all cards"
            data-testid="unpin-all-btn"
          >
            Unpin All
          </button>
        )}
      </div>
    </DndContext>,
    portalRoot,
  );
}
