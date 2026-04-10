"use client";

import type { ReactNode } from "react";

interface CollapseSectionProps {
  open: boolean;
  children: ReactNode;
  className?: string;
}

export function CollapseSection({ open, children, className = "" }: CollapseSectionProps) {
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-300 ease-out ${className}`}
      style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
    >
      <div className="overflow-hidden">
        {children}
      </div>
    </div>
  );
}
