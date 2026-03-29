"use client";

import { motion, AnimatePresence } from "framer-motion";

interface TourOverlayProps {
  isActive: boolean;
  targetRect: DOMRect | null;
  allowInteraction?: boolean;
  /** When true, renders a plain dark backdrop without a spotlight cutout */
  dimOnly?: boolean;
  /** Called when user clicks on the dark overlay area (outside the spotlight) */
  onOverlayClick?: () => void;
  /** When true, intensifies the pulse ring animation to draw attention */
  pulseTarget?: boolean;
}

const PADDING = 8;
const BORDER_RADIUS = 8;

export function TourOverlay({
  isActive,
  targetRect,
  allowInteraction = false,
  dimOnly = false,
  onOverlayClick,
  pulseTarget = false,
}: TourOverlayProps) {
  if (!isActive) return null;

  const hasTarget = targetRect !== null && !dimOnly;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-[10000]"
          style={{ pointerEvents: allowInteraction ? "none" : "auto", cursor: "pointer" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          aria-hidden="true"
          onClick={(e) => {
            // Only fire on the overlay itself, not on children
            if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === "svg" || (e.target as HTMLElement).tagName === "rect") {
              onOverlayClick?.();
            }
          }}
        >
          {hasTarget ? (
            <svg className="w-full h-full" style={{ pointerEvents: "none" }} xmlns="http://www.w3.org/2000/svg">
              <defs>
                <mask id="tour-spotlight-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  <rect
                    x={targetRect.left - PADDING}
                    y={targetRect.top - PADDING}
                    width={targetRect.width + PADDING * 2}
                    height={targetRect.height + PADDING * 2}
                    rx={BORDER_RADIUS}
                    ry={BORDER_RADIUS}
                    fill="black"
                  />
                </mask>
              </defs>
              {/* Dark overlay with spotlight cutout — needs pointer-events to capture clicks */}
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.7)"
                mask="url(#tour-spotlight-mask)"
                style={{ pointerEvents: "auto", cursor: "pointer" }}
              />
              {/* Pulse ring around spotlight */}
              <rect
                x={targetRect.left - PADDING - 2}
                y={targetRect.top - PADDING - 2}
                width={targetRect.width + PADDING * 2 + 4}
                height={targetRect.height + PADDING * 2 + 4}
                rx={BORDER_RADIUS + 2}
                ry={BORDER_RADIUS + 2}
                fill="none"
                stroke="var(--gold, #d4a843)"
                strokeWidth={pulseTarget ? "4" : "2"}
                className={pulseTarget ? "animate-tour-pulse-intense" : "animate-tour-pulse"}
              />
              {/* Extra glow ring when pulsing */}
              {pulseTarget && (
                <rect
                  x={targetRect.left - PADDING - 6}
                  y={targetRect.top - PADDING - 6}
                  width={targetRect.width + PADDING * 2 + 12}
                  height={targetRect.height + PADDING * 2 + 12}
                  rx={BORDER_RADIUS + 6}
                  ry={BORDER_RADIUS + 6}
                  fill="none"
                  stroke="var(--gold, #d4a843)"
                  strokeWidth="2"
                  opacity="0.5"
                  className="animate-tour-pulse-intense"
                />
              )}
            </svg>
          ) : (
            <div className="w-full h-full bg-black/70" />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
