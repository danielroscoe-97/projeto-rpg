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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CampaignLocation, LocationType } from "@/lib/types/mind-map";

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
  onEdit: (location: CampaignLocation) => void;
  onDelete: (location: CampaignLocation) => void;
  onToggleVisibility: (location: CampaignLocation) => void;
}

export function LocationCard({ location, isEditable, onEdit, onDelete, onToggleVisibility }: LocationCardProps) {
  const t = useTranslations("locations");
  const [expanded, setExpanded] = useState(false);

  const Icon = TYPE_ICONS[location.location_type] ?? MapPin;
  const hasExpandableContent = !!location.description;

  return (
    <div
      className="group relative bg-card border border-border/40 rounded-xl overflow-hidden transition-all duration-300 hover:border-amber-400/30 hover:shadow-[0_0_20px_-8px_rgba(251,191,36,0.15)]"
      data-testid={`location-card-${location.id}`}
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
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    : "bg-zinc-800/30 text-zinc-400 border border-zinc-500/20"
                }`}
              >
                {location.is_discovered ? t("discovered") : t("hidden")}
              </span>
            </div>
          </div>

          {/* Actions */}
          {isEditable && (
            <div className="flex items-center gap-0.5 shrink-0 opacity-60 sm:opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-amber-400"
                onClick={() => onToggleVisibility(location)}
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
                onClick={() => onEdit(location)}
                title={t("form_title_edit")}
                data-testid={`location-edit-${location.id}`}
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-red-400"
                onClick={() => onDelete(location)}
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
            onClick={() => setExpanded((v) => !v)}
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
        {expanded && location.description && (
          <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {location.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
