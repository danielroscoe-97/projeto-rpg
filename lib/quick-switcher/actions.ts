/**
 * Global quick actions surfaced inside the CommandPalette (Ctrl+K / Cmd+K).
 * Each action is filtered by context (DM-only, inside-campaign) in the hook
 * that consumes this list.
 */

export interface QuickAction {
  /** Stable id, used as cmdk `value` */
  id: string;
  /** Lucide icon name — resolved to the component at render time */
  icon: "Plus" | "UserPlus" | "Swords" | "Settings" | "BookOpen";
  /** i18n key inside namespace `command_palette` */
  labelKey: string;
  /** If present, navigate to this href on select */
  href?: string;
  /** If true, only available when hasDmAccess is true */
  dmOnly?: boolean;
  /** If true, only shown when user is inside /app/campaigns/:id */
  requiresCurrentCampaign?: boolean;
  /** If true, only shown when user is NOT inside a campaign (dashboard context) */
  excludedInsideCampaign?: boolean;
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "action-start-combat",
    icon: "Plus",
    labelKey: "action_start_combat",
    href: "/app/combat/new",
    dmOnly: true,
  },
  {
    id: "action-new-campaign",
    icon: "Swords",
    labelKey: "action_new_campaign",
    href: "/app/dashboard/campaigns?new=1",
    excludedInsideCampaign: true,
  },
  {
    id: "action-open-settings",
    icon: "Settings",
    labelKey: "action_open_settings",
    href: "/app/dashboard/settings",
  },
  {
    id: "action-open-compendium",
    icon: "BookOpen",
    labelKey: "action_open_compendium",
    href: "/app/compendium",
  },
];

export interface QuickActionContext {
  hasDmAccess?: boolean;
  currentCampaignId?: string | null;
}

export function filterQuickActions(ctx: QuickActionContext): QuickAction[] {
  return QUICK_ACTIONS.filter((a) => {
    if (a.dmOnly && !ctx.hasDmAccess) return false;
    if (a.requiresCurrentCampaign && !ctx.currentCampaignId) return false;
    if (a.excludedInsideCampaign && ctx.currentCampaignId) return false;
    return true;
  });
}
