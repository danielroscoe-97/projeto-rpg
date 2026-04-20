"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { captureError } from "@/lib/errors/capture";
import { acceptInviteAction } from "@/app/invite/actions";
import {
  CharacterPickerModal,
  type CharacterPickerResult,
  type PickerExistingCharacter,
  type PickerUnlinkedCharacter,
} from "@/components/character/CharacterPickerModal";

interface InviteAcceptClientProps {
  inviteId: string;
  campaignId: string;
  campaignName: string;
  dmName: string;
  userId: string;
  token: string;
  existingCharacters: PickerExistingCharacter[];
  /** DM-created characters in this campaign that have no user_id (available for claim) */
  unlinkedCharacters?: PickerUnlinkedCharacter[];
}

/**
 * Story 02-B prep (refactor-only): this client now delegates the 3-mode
 * (claim / pick / create) state machine to `CharacterPickerModal`. The
 * picker auto-opens on mount to preserve the "landing shows picker
 * immediately" UX at `/invite/[token]`.
 *
 * Submit logic (acceptInviteAction + toast/redirect) stays here so the
 * server interaction is identical to pre-refactor.
 */
export function InviteAcceptClient({
  inviteId,
  campaignId,
  campaignName,
  dmName,
  userId,
  token,
  existingCharacters,
  unlinkedCharacters = [],
}: InviteAcceptClientProps) {
  const t = useTranslations("campaign");
  const router = useRouter();

  // Auto-open on mount so the picker is immediately visible on the invite
  // landing (matches pre-refactor page-embedded behavior).
  const [open, setOpen] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelect = useCallback(
    async (result: CharacterPickerResult) => {
      setIsSubmitting(true);
      try {
        if (result.mode === "claimed") {
          await acceptInviteAction({
            inviteId,
            campaignId,
            token,
            claimCharacterId: result.characterId,
          });
        } else if (result.mode === "picked") {
          await acceptInviteAction({
            inviteId,
            campaignId,
            token,
            existingCharacterId: result.characterId,
          });
        } else {
          const { characterData } = result;
          await acceptInviteAction({
            inviteId,
            campaignId,
            token,
            name: characterData.name,
            maxHp: characterData.maxHp,
            currentHp: characterData.currentHp,
            ac: characterData.ac,
            spellSaveDc: characterData.spellSaveDc,
          });
        }

        toast.success(t("invite_accepted"));
        router.push("/app/dashboard");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (
          msg.includes("já foi escolhido") ||
          msg.includes("already chosen")
        ) {
          toast.error(t("invite_claim_already_taken"));
          // Refresh the page to get updated available characters.
          window.location.reload();
        } else {
          toast.error(t("invite_error"));
        }
        captureError(err, {
          component: "InviteAcceptClient",
          action: "acceptInvite",
          category: "network",
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [inviteId, campaignId, token, t, router],
  );

  return (
    <CharacterPickerModal
      campaignId={campaignId}
      playerIdentity={{ userId }}
      open={open}
      onOpenChange={setOpen}
      onSelect={handleSelect}
      existingCharacters={existingCharacters}
      unlinkedCharacters={unlinkedCharacters}
      campaignName={campaignName}
      dmName={dmName}
      isSubmitting={isSubmitting}
    />
  );
}
