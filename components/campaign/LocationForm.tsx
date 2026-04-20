"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Castle, Mountain, TreePine, Building, MapPin } from "lucide-react";
import type { CampaignLocation, LocationType } from "@/lib/types/mind-map";
import { LOCATION_TYPES } from "@/lib/types/mind-map";
import type { LocationFormData } from "@/lib/hooks/use-campaign-locations";

const TYPE_ICONS: Record<LocationType, React.ComponentType<{ className?: string }>> = {
  city: Castle,
  dungeon: Mountain,
  wilderness: TreePine,
  building: Building,
  region: MapPin,
};

interface LocationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId?: string | null;
  location?: CampaignLocation | null;
  onSave: (data: LocationFormData) => Promise<void>;
  /**
   * When true, dialog opens in read-only mode (inputs disabled, Save hidden).
   * If `canEdit` is also true, an "Edit" button lets the user flip to edit mode.
   * Defaults to false (always editable).
   */
  readOnly?: boolean;
  /**
   * When true + `readOnly`, an "Edit" button is shown that flips into edit mode.
   * Ignored if `readOnly` is false. Defaults to true (DM can always edit their own).
   */
  canEdit?: boolean;
}

export function LocationForm({
  open,
  onOpenChange,
  location,
  onSave,
  readOnly = false,
  canEdit = true,
}: LocationFormProps) {
  const t = useTranslations("locations");
  const tCommon = useTranslations("common");

  const [name, setName] = useState(location?.name ?? "");
  const [description, setDescription] = useState(location?.description ?? "");
  const [locationType, setLocationType] = useState<LocationType>(location?.location_type ?? "building");
  const [imageUrl, setImageUrl] = useState(location?.image_url ?? "");
  const [isDiscovered, setIsDiscovered] = useState(location?.is_discovered ?? true);
  const [visibleToPlayers, setVisibleToPlayers] = useState(location?.is_visible_to_players ?? true);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  // Internal view/edit toggle — starts from the `readOnly` prop, user can flip.
  const [viewOnly, setViewOnly] = useState(readOnly);

  // Sync when prop changes (e.g., reopening from a different entry point).
  useEffect(() => {
    setViewOnly(readOnly);
  }, [readOnly, open]);

  const isDirty = useMemo(() => {
    const init = location;
    if (!init) {
      return !!(name || description || locationType !== "building" || imageUrl || !isDiscovered || !visibleToPlayers);
    }
    return (
      name !== (init.name ?? "") ||
      description !== (init.description ?? "") ||
      locationType !== (init.location_type ?? "building") ||
      imageUrl !== (init.image_url ?? "") ||
      isDiscovered !== (init.is_discovered ?? true) ||
      visibleToPlayers !== (init.is_visible_to_players ?? true)
    );
  }, [location, name, description, locationType, imageUrl, isDiscovered, visibleToPlayers]);

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen && isDirty) {
      setDiscardOpen(true);
      return;
    }
    onOpenChange(nextOpen);
  }, [isDirty, onOpenChange]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmedName = name.trim();
      if (!trimmedName) {
        setNameError(true);
        return;
      }

      const data: LocationFormData = {
        name: trimmedName,
        description: description.trim() || undefined,
        location_type: locationType,
        is_discovered: isDiscovered,
        image_url: imageUrl.trim() || null,
        is_visible_to_players: visibleToPlayers,
      };

      setSaving(true);
      setSaveError(false);
      try {
        await onSave(data);
        onOpenChange(false);
      } catch {
        setSaveError(true);
      } finally {
        setSaving(false);
      }
    },
    [name, description, locationType, isDiscovered, imageUrl, visibleToPlayers, onSave, onOpenChange]
  );

  const isEdit = !!location;

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("form_title_edit") : t("form_title_new")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4" data-testid="location-form">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="location-name">{t("field_name")} *</Label>
            <Input
              id="location-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) setNameError(false);
              }}
              placeholder={t("field_name")}
              data-testid="location-name-input"
              aria-invalid={nameError}
              disabled={viewOnly}
              readOnly={viewOnly}
            />
            {nameError && (
              <p className="text-xs text-red-400" data-testid="location-name-error">
                {t("name_required")}
              </p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-1.5">
            <Label htmlFor="location-type">{t("field_type")}</Label>
            <Select
              value={locationType}
              onValueChange={(v) => setLocationType(v as LocationType)}
              disabled={viewOnly}
            >
              <SelectTrigger className="w-full" data-testid="location-type-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCATION_TYPES.map((lt) => {
                  const Icon = TYPE_ICONS[lt];
                  return (
                    <SelectItem key={lt} value={lt}>
                      <Icon className="w-4 h-4 inline-block mr-2" />
                      {t(`type_${lt}`)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="location-description">{t("field_description")}</Label>
            <textarea
              id="location-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("description_placeholder")}
              rows={3}
              className="flex w-full rounded-lg border border-input bg-surface-tertiary px-3 py-2 text-base text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background resize-none md:text-sm disabled:cursor-not-allowed disabled:opacity-70"
              data-testid="location-description-input"
              disabled={viewOnly}
              readOnly={viewOnly}
            />
          </div>

          {/* Image URL */}
          <div className="space-y-1.5">
            <Label htmlFor="location-image">{t("field_image")}</Label>
            <Input
              id="location-image"
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              data-testid="location-image-input"
              disabled={viewOnly}
              readOnly={viewOnly}
            />
          </div>

          {/* Discovered toggle */}
          <div className="flex items-center justify-between py-2">
            <Label htmlFor="location-discovered" className="cursor-pointer">
              {t("field_discovered")}
            </Label>
            <button
              id="location-discovered"
              type="button"
              role="switch"
              aria-checked={isDiscovered}
              onClick={() => !viewOnly && setIsDiscovered((v) => !v)}
              disabled={viewOnly}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70 ${
                isDiscovered ? "bg-cyan-500" : "bg-muted"
              }`}
              data-testid="location-discovered-toggle"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${
                  isDiscovered ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Visibility toggle */}
          <div className="flex items-center justify-between py-2">
            <Label htmlFor="location-visible" className="cursor-pointer">
              {t("field_visibility")}
            </Label>
            <button
              id="location-visible"
              type="button"
              role="switch"
              aria-checked={visibleToPlayers}
              onClick={() => !viewOnly && setVisibleToPlayers((v) => !v)}
              disabled={viewOnly}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-70 ${
                visibleToPlayers ? "bg-emerald-500" : "bg-muted"
              }`}
              data-testid="location-visible-toggle"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ${
                  visibleToPlayers ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Save error */}
          {saveError && (
            <p className="text-xs text-red-400" data-testid="location-save-error">
              {t("save_error")}
            </p>
          )}

          {/* Submit / View actions */}
          <div className="flex justify-end gap-2 pt-2">
            {viewOnly ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                >
                  {tCommon("close")}
                </Button>
                {canEdit && (
                  <Button
                    type="button"
                    variant="gold"
                    onClick={() => setViewOnly(false)}
                    data-testid="location-edit-toggle"
                  >
                    <Pencil className="w-4 h-4 mr-1.5" />
                    {tCommon("edit")}
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleOpenChange(false)}
                  disabled={saving}
                >
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" variant="gold" disabled={saving} data-testid="location-submit">
                  {saving ? tCommon("saving") : tCommon("save")}
                </Button>
              </>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tCommon("discard_title")}</AlertDialogTitle>
          <AlertDialogDescription>{tCommon("discard_description")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{tCommon("discard_cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setDiscardOpen(false);
              setName(location?.name ?? "");
              setDescription(location?.description ?? "");
              setLocationType(location?.location_type ?? "building");
              setImageUrl(location?.image_url ?? "");
              setIsDiscovered(location?.is_discovered ?? true);
              setVisibleToPlayers(location?.is_visible_to_players ?? true);
              onOpenChange(false);
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {tCommon("discard_confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
