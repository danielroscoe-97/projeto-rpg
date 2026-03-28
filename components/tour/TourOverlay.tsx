"use client";

import { motion, AnimatePresence } from "framer-motion";

interface TourOverlayProps {
  isActive: boolean;
  targetRect: DOMRect | null;
}

const PADDING = 8;
const BORDER_RADIUS = 8;

export function TourOverlay({ isActive, targetRect }: TourOverlayProps) {
  if (!isActive) return null;

  // If no target rect (e.g. welcome step), show full-screen dim overlay
  const hasTarget = targetRect !== null;

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          className="fixed inset-0 z-[10000] pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          aria-hidden="true"
        >
          {hasTarget ? (
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
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
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                fill="rgba(0, 0, 0, 0.7)"
                mask="url(#tour-spotlight-mask)"
              />
            </svg>
          ) : (
            <div className="w-full h-full bg-black/70" />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
