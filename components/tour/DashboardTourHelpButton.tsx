"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { useDashboardTourStore } from "@/lib/stores/dashboard-tour-store";
import { createClient } from "@/lib/supabase/client";

export function DashboardTourHelpButton() {
  const { isActive, isCompleted, resetTour, startTour } = useDashboardTourStore();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const t = useTranslations("tour");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only show when tour is completed (not while active or before first run)
  if (!mounted || isActive || !isCompleted) return null;

  const handleRestart = async () => {
    setIsOpen(false);
    // Reset DB flag so server-side also knows
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("user_onboarding")
          .update({ dashboard_tour_completed: false })
          .eq("user_id", user.id);
      }
    } catch {
      // best-effort
    }
    resetTour();
    startTour();
  };

  return (
    <div className="fixed bottom-24 right-6 lg:bottom-6 z-[9999]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-14 right-0 bg-card border border-gold/30 rounded-lg shadow-2xl p-3 min-w-[180px]"
          >
            <button
              type="button"
              onClick={handleRestart}
              className="w-full text-left text-sm text-foreground/80 hover:text-gold transition-colors px-2 py-2 rounded-md hover:bg-white/[0.06] min-h-[44px] flex items-center gap-2"
            >
              <span aria-hidden="true">🔄</span>
              {t("restart_tour")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-11 h-11 rounded-full bg-gold/90 text-surface-primary font-bold text-lg shadow-lg hover:bg-gold hover:shadow-gold-glow transition-all duration-200 flex items-center justify-center"
        aria-label={t("help_button")}
        data-testid="dashboard-tour-help-btn"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        ?
      </motion.button>
    </div>
  );
}
