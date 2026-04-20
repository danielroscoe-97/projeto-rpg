"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface SidebarSectionProps {
  title: string;
  defaultOpen?: boolean;
  collapsed?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Collapsible section wrapper for sidebar groups (e.g. "Minhas campanhas",
 * "Campanha atual"). Hidden entirely when parent sidebar is collapsed (icon-only).
 */
export function SidebarSection({ title, defaultOpen = true, collapsed = false, children, className }: SidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  if (collapsed) return null;

  return (
    <div className={cn("px-2", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex items-center gap-1.5 w-full px-1 py-1 text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider hover:text-muted-foreground transition-colors"
      >
        <ChevronRight
          className={cn("w-3 h-3 shrink-0 transition-transform duration-150", open && "rotate-90")}
          aria-hidden="true"
        />
        <span>{title}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
