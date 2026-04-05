"use client";

import { type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CampaignViewTransitionProps {
  /** Unique key to trigger the transition (e.g. section name or "overview") */
  viewKey: string;
  children: ReactNode;
}

/**
 * Thin client wrapper that applies AnimatePresence fade between
 * the Overview and Focus views in the Campaign Hub page (Server Component).
 */
export function CampaignViewTransition({ viewKey, children }: CampaignViewTransitionProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={viewKey}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
