"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { X, Plus, Search } from "lucide-react";
import type { CampaignNpc } from "@/lib/types/campaign-npcs";

interface NpcTagSelectorProps {
  availableNpcs: CampaignNpc[];
  linkedNpcIds: string[];
  onLink: (npcId: string) => void;
  onUnlink: (npcId: string) => void;
}

export function NpcTagSelector({
  availableNpcs,
  linkedNpcIds,
  onLink,
  onUnlink,
}: NpcTagSelectorProps) {
  const t = useTranslations("links");
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const linkedNpcs = availableNpcs.filter((npc) => linkedNpcIds.includes(npc.id));
  const unlinkedNpcs = availableNpcs
    .filter((npc) => !linkedNpcIds.includes(npc.id))
    .filter((npc) =>
      search.length === 0 || npc.name.toLowerCase().includes(search.toLowerCase()),
    );

  // Close dropdown on click outside
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  return (
    <div className="space-y-2" data-testid="npc-tag-selector">
      {/* Linked NPC chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        {linkedNpcs.map((npc) => (
          <span
            key={npc.id}
            className="inline-flex items-center gap-1 bg-purple-400/10 text-purple-400 rounded-full px-2 py-0.5 text-xs"
            data-testid={`npc-chip-${npc.id}`}
          >
            {npc.name}
            <button
              type="button"
              onClick={() => onUnlink(npc.id)}
              className="hover:text-purple-200 transition-colors"
              title={t("unlink_npc")}
              data-testid={`npc-chip-remove-${npc.id}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        {/* Add button */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-purple-400 transition-colors px-1.5 py-0.5 rounded border border-dashed border-border hover:border-purple-400/30"
            data-testid="npc-tag-add"
          >
            <Plus className="w-3 h-3" />
            {t("link_npc")}
          </button>

          {/* Dropdown */}
          {open && (
            <div className="absolute z-50 top-full left-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
                <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t("select_npc")}
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                  data-testid="npc-tag-search"
                />
              </div>

              {/* NPC list */}
              <div className="max-h-40 overflow-y-auto">
                {unlinkedNpcs.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">
                    {t("no_links")}
                  </p>
                ) : (
                  unlinkedNpcs.map((npc) => (
                    <button
                      key={npc.id}
                      type="button"
                      onClick={() => {
                        onLink(npc.id);
                        setSearch("");
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-accent/10 transition-colors"
                      data-testid={`npc-tag-option-${npc.id}`}
                    >
                      {npc.name}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
