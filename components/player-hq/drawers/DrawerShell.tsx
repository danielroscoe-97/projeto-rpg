"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface DrawerShellProps {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function DrawerShell({ title, icon, iconColor, onClose, children }: DrawerShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop — click to close */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        ref={panelRef}
        className="relative w-full max-w-md bg-surface-overlay border-l border-border shadow-2xl animate-in slide-in-from-right duration-200 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <span className={iconColor}>{icon}</span>
          <h2 className="text-sm font-semibold text-foreground flex-1 truncate">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-white/5"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}
