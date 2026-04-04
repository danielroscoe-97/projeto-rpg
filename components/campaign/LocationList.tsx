"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { MapPin, Plus, Trash2, Eye, EyeOff, Castle, TreePine, Building, Mountain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useCampaignLocations } from "@/lib/hooks/use-campaign-locations";
import type { CampaignLocation, LocationType } from "@/lib/types/mind-map";
import { LOCATION_TYPES } from "@/lib/types/mind-map";

const TYPE_ICONS: Record<LocationType, React.ComponentType<{ className?: string }>> = {
  city: Castle,
  dungeon: Mountain,
  wilderness: TreePine,
  building: Building,
  region: MapPin,
};

interface LocationCardProps {
  location: CampaignLocation;
  onUpdate: (id: string, updates: Partial<Pick<CampaignLocation, "name" | "description" | "location_type" | "is_discovered">>) => void;
  onDelete: (id: string) => void;
}

function LocationCard({ location, onUpdate, onDelete }: LocationCardProps) {
  const t = useTranslations("locations");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const Icon = TYPE_ICONS[location.location_type] ?? MapPin;

  return (
    <>
      <div
        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
          location.is_discovered
            ? "border-cyan-400/30 bg-card"
            : "border-border bg-card/50 opacity-70"
        }`}
      >
        <Icon className="h-4 w-4 text-cyan-400 mt-1 flex-shrink-0" />

        <div className="flex-1 min-w-0 space-y-2">
          <Input
            defaultValue={location.name}
            className="h-7 text-sm font-semibold bg-transparent border-none px-0 focus-visible:ring-0"
            onBlur={(e) => {
              const val = e.target.value.trim();
              if (val && val !== location.name) onUpdate(location.id, { name: val });
            }}
          />
          <Textarea
            defaultValue={location.description}
            placeholder={t("description_placeholder")}
            className="min-h-[40px] text-xs bg-transparent border-none px-0 resize-none focus-visible:ring-0"
            onBlur={(e) => {
              if (e.target.value !== location.description)
                onUpdate(location.id, { description: e.target.value });
            }}
          />

          <div className="flex items-center gap-2">
            <Select
              defaultValue={location.location_type}
              onValueChange={(v) => onUpdate(location.id, { location_type: v as LocationType })}
            >
              <SelectTrigger className="h-7 w-[120px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_TYPES.map((lt) => (
                  <SelectItem key={lt} value={lt} className="text-xs">
                    {t(`type_${lt}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onUpdate(location.id, { is_discovered: !location.is_discovered })}
              title={location.is_discovered ? t("mark_undiscovered") : t("mark_discovered")}
            >
              {location.is_discovered ? (
                <Eye className="h-3.5 w-3.5 text-cyan-400" />
              ) : (
                <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 ml-auto text-destructive/60 hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("delete_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("delete_description", { name: location.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => onDelete(location.id)}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface LocationListProps {
  campaignId: string;
  isEditable?: boolean;
}

export function LocationList({ campaignId, isEditable = true }: LocationListProps) {
  const t = useTranslations("locations");
  const { locations, loading, fetchError, addLocation, updateLocation, deleteLocation } =
    useCampaignLocations(campaignId);
  const [newName, setNewName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    await addLocation(name);
    setNewName("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">{t("loading")}</div>
    );
  }

  if (fetchError) {
    return (
      <div className="text-sm text-red-400 py-4 text-center">
        {t("load_error")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Add form */}
      {isEditable && (
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("add_placeholder")}
            className="h-8 text-sm flex-1"
          />
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-3"
            onClick={handleAdd}
            disabled={!newName.trim()}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            {t("add")}
          </Button>
        </div>
      )}

      {/* Location list */}
      {locations.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">{t("empty")}</p>
      ) : (
        <div className="space-y-2">
          {locations.map((loc) => (
            <LocationCard
              key={loc.id}
              location={loc}
              onUpdate={updateLocation}
              onDelete={deleteLocation}
            />
          ))}
        </div>
      )}
    </div>
  );
}
