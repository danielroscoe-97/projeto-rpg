"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Eye,
  EyeOff,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronUp,
  Castle,
  Mountain,
  TreePine,
  Building,
  MapPin,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CampaignLocation, LocationType } from "@/lib/types/mind-map";

interface EntityRefItem {
  id: string;
  name: string;
}

const TYPE_ICONS: Record<LocationType, React.ComponentType<{ className?: string }>> = {
  city: Castle,
  dungeon: Mountain,
  wilderness: TreePine,
  building: Building,
  region: MapPin,
};

const TYPE_BADGE_STYLES: Record<LocationType, string> = {
  city: "bg-amber-900/30 text-amber-400 border border-amber-500/20",
  dungeon: "bg-red-900/30 text-red-400 border border-red-500/20",
  wilderness: "bg-emerald-900/30 text-emerald-400 border border-emerald-500/20",
  building: "bg-blue-900/30 text-blue-400 border border-blue-500/20",
  region: "bg-purple-900/30 text-purple-400 border border-purple-500/20",
};

const TYPE_ICON_BG: Record<LocationType, string> = {
  city: "from-amber-400/15 to-amber-600/10 ring-amber-400/25",
  dungeon: "from-red-400/15 to-red-600/10 ring-red-400/25",
  wilderness: "from-emerald-400/15 to-emerald-600/10 ring-emerald-400/25",
  building: "from-blue-400/15 to-blue-600/10 ring-blue-400/25",
  region: "from-purple-400/15 to-purple-600/10 ring-purple-400/25",
};

const TYPE_ICON_COLOR: Record<LocationType, string> = {
  city: "text-amber-400/70",
  dungeon: "text-red-400/70",
  wilderness: "text-emerald-400/70",
  building: "text-blue-400/70",
  region: "text-purple-400/70",
};

interface LocationCardProps {
  location: CampaignLocation;
  isEditable: boolean;
  /** NPCs that have a `lives_in` edge pointing to this location (Fase 3c). */
  inhabitantNpcs?: EntityRefItem[];
  /** Factions with `headquarters_of` edge pointing to this location (Fase 3d). */
  hqFactions?: EntityRefItem[];
  onEdit: (location: CampaignLocation) => void;
  onDelete: (location: CampaignLocation) => void;
  onToggleVisibility: (location: CampaignLocation) => void;
  /** Called when the card body (outside action buttons) is clicked. */
  onCardClick?: (location: CampaignLocation) => void;
}

export function LocationCard({
  location,
  isEditable,
  inhabitantNpcs,
  hqFactions,
  onEdit,
  onDelete,
  onToggleVisibility,
  onCardClick,
}: LocationCardProps) {
  const t = useTranslations("locations");
  const [expanded, setExpanded] = useState(false);

  const Icon = TYPE_ICONS[location.location_type] ?? MapPin;
  const inhabitantCount = inhabitantNpcs?.length ?? 0;
  const hqCount = hqFactions?.length ?? 0;
  const hasRelations = inhabitantCount > 0 || hqCount > 0;
  const hasExpandableContent = !!location.description || hasRelations;

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget && (e.target as HTMLElement).closest("button")) return;
    onCardClick?.(location);
  };
  const handleCardKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!onCardClick) return;
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onCardClick(location);
    }
  };
  const stop = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className={`group relative bg-card border border-white/[0.04] rounded-xl overflow-hidden transition-all duration-300 hover:border-amber-400/30 hover:shadow-[0_0_20px_-8px_rgba(251,191,36,0.15)] ${
        onCardClick ? "cursor-pointer focus-within:ring-2 focus-within:ring-amber-400/40" : ""
      }`}
      data-testid={`location-card-${location.id}`}
      role={onCardClick ? "button" : undefined}
      tabIndex={onCardClick ? 0 : undefined}
      onClick={onCardClick ? handleCardClick : undefined}
      onKeyDown={onCardClick ? handleCardKeyDown : undefined}
      aria-label={onCardClick ? location.name : undefined}
    >
      {/* Subtle top accent line */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      <div className="p-4">
        {/* Image thumbnail */}
        {location.image_url && (
          <div className="mb-3 -mx-4 -mt-4">
            <img
              src={location.image_url}
              alt={location.name}
              className="w-full h-32 object-cover"
            />
          </div>
        )}

        {/* Header row */}
        <div className="flex items-start gap-3">
          {/* Type icon avatar */}
          <div className="shrink-0 relative">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${TYPE_ICON_BG[location.location_type]} ring-2 flex items-center justify-center shadow-inner`}>
              <Icon className={`w-5 h-5 ${TYPE_ICON_COLOR[location.location_type]}`} />
            </div>
            {/* Visibility dot */}
            <div
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${
                location.is_visible_to_players ? "bg-emerald-400" : "bg-zinc-600"
              }`}
            />
          </div>

          {/* Name + badges */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-foreground line-clamp-2 break-words leading-tight">
              {location.name}
            </h3>

            {/* Type + discovery badges */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${TYPE_BADGE_STYLES[location.location_type]}`}>
                <Icon className="w-3 h-3" />
                {t(`type_${location.location_type}`)}
              </span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium ${
                  location.is_discovered
                    ? "bg-green-500/10 text-green-400 border border-green-500/20"
                    : "bg-zinc-800/30 text-zinc-400 border border-zinc-500/20"
                }`}
              >
                {location.is_discovered ? t("discovered") : t("hidden")}
              </span>
              {inhabitantCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20"
                  data-testid={`location-inhabitant-count-${location.id}`}
                  title={t("habitantes_label")}
                >
                  <User className="w-3 h-3" />
                  {inhabitantCount}
                </span>
              )}
              {hqCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-violet-500/10 text-violet-300 border border-violet-500/20"
                  data-testid={`location-hq-count-${location.id}`}
                  title={t("facoes_sediadas_label")}
                >
                  <Users className="w-3 h-3" />
                  {hqCount}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          {isEditable && (
            <div
              className="flex items-center gap-0.5 shrink-0 opacity-100 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200"
              onClick={stop}
              onKeyDown={stop}
            >
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-amber-400"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleVisibility(location);
                }}
                title={location.is_visible_to_players ? t("field_visibility") : t("field_visibility")}
                data-testid={`location-visibility-${location.id}`}
              >
                {location.is_visible_to_players ? (
                  <Eye className="w-3.5 h-3.5" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-amber-400"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(location);
                }}
                title={t("form_title_edit")}
                data-testid={`location-edit-${location.id}`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-red-400"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(location);
                }}
                title={t("delete_title")}
                data-testid={`location-delete-${location.id}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        {/* Expand/collapse toggle */}
        {hasExpandableContent && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors w-full"
          >
            <div className="flex-1 h-px bg-border/50" />
            {expanded ? (
              <ChevronUp className="w-3 h-3 shrink-0" />
            ) : (
              <ChevronDown className="w-3 h-3 shrink-0" />
            )}
            <span className="shrink-0">
              {expanded
                ? t("field_description")
                : location.description.slice(0, 50) + (location.description.length > 50 ? "..." : "")}
            </span>
            <div className="flex-1 h-px bg-border/50" />
          </button>
        )}

        {/* Expanded content */}
        {expanded && (
          <div className="mt-3 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
            {location.description && (
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {location.description}
              </p>
            )}
            {inhabitantCount > 0 && (
              <div data-testid={`location-inhabitants-${location.id}`}>
                <p className="text-[11px] font-medium text-muted-foreground/60 mb-1.5">
                  {t("habitantes_label")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {inhabitantNpcs!.map((npc) => (
                    <span
                      key={npc.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-amber-500/5 text-amber-300 border border-amber-500/15"
                    >
                      <User className="w-3 h-3" />
                      {npc.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {hqCount > 0 && (
              <div data-testid={`location-hqs-${location.id}`}>
                <p className="text-[11px] font-medium text-muted-foreground/60 mb-1.5">
                  {t("facoes_sediadas_label")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {hqFactions!.map((f) => (
                    <span
                      key={f.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-violet-500/5 text-violet-300 border border-violet-500/15"
                    >
                      <Users className="w-3 h-3" />
                      {f.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
