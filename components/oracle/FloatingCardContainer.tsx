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
import {
  usePinnedCardsStore,
  type PinnedCard,
} from "@/lib/stores/pinned-cards-store";
import {
  getMonsterById,
  getSpellById,
  getItemById,
  findCondition,
} from "@/lib/srd/srd-search";
import { MonsterStatBlock } from "./MonsterStatBlock";
import { SpellCard } from "./SpellCard";
import { ItemCard } from "./ItemCard";
import { ConditionCard } from "./ConditionCard";
import { OracleAICard } from "./OracleAICard";
import "@/styles/stat-card-5e.css";

// ---------------------------------------------------------------------------
// Draggable Card Wrapper
// ---------------------------------------------------------------------------

function DraggableCard({
  card,
  children,
  onFocus,
  onClose: _onClose,
  onMinimize: _onMinimize,
}: {
  card: PinnedCard;
  children: React.ReactNode;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
}) {
  const {
    attributes: { role: _role, tabIndex: _tabIndex, ...attributes },
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: card.id, disabled: card.isLocked });

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
      role="region"
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
  if (card.type === "monster")
    return (
      getMonsterById(card.entityId, card.rulesetVersion)?.name ?? card.entityId
    );
  if (card.type === "spell")
    return (
      getSpellById(card.entityId, card.rulesetVersion)?.name ?? card.entityId
    );
  if (card.type === "item")
    return getItemById(card.entityId)?.name ?? card.entityId;
  if (card.type === "oracle-ai")
    return card.oracleData?.question?.slice(0, 40) ?? "Oracle AI";
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
  const typeIcon =
    card.type === "monster"
      ? "👹"
      : card.type === "spell"
        ? "✨"
        : card.type === "item"
          ? "⚔️"
          : card.type === "oracle-ai"
            ? "🔮"
            : "⚡";
  const displayName = resolveDisplayName(card);
  const typeClass =
    card.type === "spell"
      ? "card-type-spell"
      : card.type === "condition"
        ? "card-type-condition"
        : card.type === "oracle-ai"
          ? "card-type-oracle-ai"
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
        <button
          type="button"
          onClick={onRestore}
          aria-label="Restore card"
          title="Restore"
        >
          +
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close card"
          title="Close"
        >
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
  onFocus,
  onLock,
  onClose,
  onMinimize,
}: {
  card: PinnedCard;
  onFocus: () => void;
  onLock: () => void;
  onClose: () => void;
  onMinimize: () => void;
}) {
  const monster = getMonsterById(card.entityId, card.rulesetVersion);
  if (!monster) {
    return (
      <div className="stat-card-5e card-floating" data-testid="card-not-found">
        <div className="card-toolbar">
          <button type="button" onClick={onClose} aria-label="Close card">
            ×
          </button>
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
      onFocus={onFocus}
      onLock={onLock}
      isLocked={card.isLocked}
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
  onFocus,
  onLock,
  onClose,
  onMinimize,
}: {
  card: PinnedCard;
  onFocus: () => void;
  onLock: () => void;
  onClose: () => void;
  onMinimize: () => void;
}) {
  const spell = getSpellById(card.entityId, card.rulesetVersion);
  if (!spell) {
    return (
      <div
        className="stat-card-5e card-type-spell card-floating"
        data-testid="card-not-found"
      >
        <div className="card-toolbar">
          <button type="button" onClick={onClose} aria-label="Close card">
            ×
          </button>
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
      onFocus={onFocus}
      onLock={onLock}
      isLocked={card.isLocked}
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
  onFocus,
  onLock,
  onClose,
  onMinimize,
}: {
  card: PinnedCard;
  onFocus: () => void;
  onLock: () => void;
  onClose: () => void;
  onMinimize: () => void;
}) {
  const condition = findCondition(card.entityId);
  if (!condition) {
    return (
      <div
        className="stat-card-5e card-type-condition card-floating"
        data-testid="card-not-found"
      >
        <div className="card-toolbar">
          <button type="button" onClick={onClose} aria-label="Close card">
            ×
          </button>
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
      onFocus={onFocus}
      onLock={onLock}
      isLocked={card.isLocked}
      onClose={onClose}
      onMinimize={onMinimize}
    />
  );
}

// ---------------------------------------------------------------------------
// Pinned Item Card Wrapper
// ---------------------------------------------------------------------------

function PinnedItemCard({
  card,
  onFocus,
  onLock,
  onClose,
  onMinimize,
}: {
  card: PinnedCard;
  onFocus: () => void;
  onLock: () => void;
  onClose: () => void;
  onMinimize: () => void;
}) {
  const item = getItemById(card.entityId);
  if (!item) {
    return (
      <div className="stat-card-5e card-floating" data-testid="card-not-found">
        <div className="card-toolbar">
          <button type="button" onClick={onClose} aria-label="Close card">
            ×
          </button>
        </div>
        <p className="card-name">Item not found</p>
        <p className="card-subtitle">{card.entityId}</p>
      </div>
    );
  }
  return (
    <div className="stat-card-5e card-floating">
      <div className="card-toolbar">
        <button
          type="button"
          onClick={onLock}
          aria-label={
            card.isLocked ? "Unlock card position" : "Lock card position"
          }
          title={card.isLocked ? "Desbloquear posição" : "Travar posição"}
        >
          {card.isLocked ? "🔒" : "🔓"}
        </button>
        <button
          type="button"
          onClick={onFocus}
          aria-label="Bring card to front"
          title="Trazer para frente"
        >
          ⬆️
        </button>
        <button
          type="button"
          onClick={onMinimize}
          aria-label="Minimize card"
          title="Minimize"
        >
          −
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close card"
          title="Close"
        >
          ×
        </button>
      </div>
      <ItemCard item={item} variant="inline" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Container
// ---------------------------------------------------------------------------

export function FloatingCardContainer() {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [confirmingUnpinAll, setConfirmingUnpinAll] = useState(false);

  const cards = usePinnedCardsStore((s) => s.cards);
  const moveCard = usePinnedCardsStore((s) => s.moveCard);
  const focusCard = usePinnedCardsStore((s) => s.focusCard);
  const unpinCard = usePinnedCardsStore((s) => s.unpinCard);
  const toggleMinimize = usePinnedCardsStore((s) => s.toggleMinimize);
  const toggleLock = usePinnedCardsStore((s) => s.toggleLock);
  const unpinAll = usePinnedCardsStore((s) => s.unpinAll);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    setPortalRoot(document.getElementById("floating-cards-root"));
  }, []);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
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
          setConfirmingUnpinAll(true);
        } else {
          unpinAll();
        }
      } else {
        if (confirmingUnpinAll) {
          setConfirmingUnpinAll(false);
          return;
        }
        const visible = cards.filter((c) => !c.isMinimized);
        if (visible.length === 0) return;
        const topmost = [...visible].sort((a, b) => b.zIndex - a.zIndex)[0];
        unpinCard(topmost.id);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cards, unpinCard, unpinAll, confirmingUnpinAll]);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, delta } = event;
      const card = cards.find((c) => c.id === active.id);
      if (!card || card.isLocked) return;

      // Clamp to viewport — keep at least 300px of card width / 44px toolbar visible
      const newX = Math.max(
        0,
        Math.min(window.innerWidth - 300, card.position.x + delta.x),
      );
      const newY = Math.max(
        0,
        Math.min(window.innerHeight - 44, card.position.y + delta.y),
      );
      moveCard(card.id, { x: newX, y: newY });
    },
    [cards, moveCard],
  );

  const expandedCards = useMemo(
    () => cards.filter((c) => !c.isMinimized),
    [cards],
  );
  const minimizedCards = useMemo(
    () => cards.filter((c) => c.isMinimized),
    [cards],
  );

  if (!portalRoot || cards.length === 0) return null;

  function renderCard(
    card: PinnedCard,
    onClose: () => void,
    onMinimize: () => void,
  ) {
    const onFocusCard = () => focusCard(card.id);
    const onLock = () => toggleLock(card.id);
    switch (card.type) {
      case "monster":
        return (
          <PinnedMonsterCard
            card={card}
            onFocus={onFocusCard}
            onLock={onLock}
            onClose={onClose}
            onMinimize={onMinimize}
          />
        );
      case "spell":
        return (
          <PinnedSpellCard
            card={card}
            onFocus={onFocusCard}
            onLock={onLock}
            onClose={onClose}
            onMinimize={onMinimize}
          />
        );
      case "condition":
        return (
          <PinnedConditionCard
            card={card}
            onFocus={onFocusCard}
            onLock={onLock}
            onClose={onClose}
            onMinimize={onMinimize}
          />
        );
      case "item":
        return (
          <PinnedItemCard
            card={card}
            onFocus={onFocusCard}
            onLock={onLock}
            onClose={onClose}
            onMinimize={onMinimize}
          />
        );
      case "oracle-ai":
        if (!card.oracleData) return null;
        return (
          <OracleAICard
            data={card.oracleData}
            variant="card"
            onFocus={onFocusCard}
            onLock={onLock}
            isLocked={card.isLocked}
            onClose={onClose}
            onMinimize={onMinimize}
          />
        );
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
        {/* Invisible backdrop — click outside any card to close the topmost one */}
        {expandedCards.length > 0 && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 0,
              pointerEvents: "auto",
            }}
            aria-hidden="true"
            onClick={() => {
              const topmost = [...expandedCards].sort((a, b) => b.zIndex - a.zIndex)[0];
              if (topmost) unpinCard(topmost.id);
            }}
          />
        )}

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

        {/* Unpin All button / inline confirm */}
        {cards.length >= 2 &&
          (confirmingUnpinAll ? (
            <div
              style={{
                position: "fixed",
                bottom: 12,
                left: 12,
                pointerEvents: "auto",
                background: "rgba(26,26,30,0.95)",
                color: "#e8e4d0",
                border: "1px solid rgba(146,38,16,0.6)",
                borderRadius: 4,
                padding: "8px 12px",
                fontSize: 12,
                zIndex: 10000,
                display: "flex",
                gap: 8,
                alignItems: "center",
              }}
              role="alertdialog"
              aria-label={`Close all ${cards.length} pinned cards?`}
            >
              <span>Close all {cards.length} cards?</span>
              <button
                type="button"
                onClick={() => {
                  unpinAll();
                  setConfirmingUnpinAll(false);
                }}
                style={{
                  cursor: "pointer",
                  color: "#922610",
                  background: "none",
                  border: "none",
                  font: "inherit",
                  fontSize: 12,
                }}
                autoFocus
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setConfirmingUnpinAll(false)}
                style={{
                  cursor: "pointer",
                  color: "#e8e4d0",
                  background: "none",
                  border: "none",
                  font: "inherit",
                  fontSize: 12,
                }}
              >
                No
              </button>
            </div>
          ) : (
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
          ))}
      </div>
    </DndContext>,
    portalRoot,
  );
}
