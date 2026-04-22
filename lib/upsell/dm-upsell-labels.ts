/**
 * Shared label dictionary for the `dm_upsell:*` analytics funnel
 * (Epic 04 Story 04-I). Consumed by `components/admin/MetricsDashboard`
 * (F7 section) and `app/admin/dm-upsell-funnel/DmUpsellFunnelClient`
 * (F6 standalone route).
 *
 * Why a shared file: adversarial review flagged that the dictionary was
 * copy-pasted in two places, inviting silent drift if a new event
 * shipped on one surface but not the other. Single source of truth.
 *
 * Unknown event_names (future emits shipped after this file is edited)
 * should fall back to the raw event_name at the call site — this
 * dictionary is additive, not authoritative.
 */

export const DM_UPSELL_LABELS: Record<string, string> = {
  "dm_upsell:cta_shown": "CTA Shown",
  "dm_upsell:cta_clicked": "CTA Clicked",
  "dm_upsell:cta_dismissed": "CTA Dismissed",
  "dm_upsell:wizard_started": "Wizard Started",
  "dm_upsell:wizard_failed": "Wizard Failed",
  "dm_upsell:role_upgraded_to_dm": "Role → DM",
  "dm_upsell:first_campaign_created": "First Campaign Created",
  "dm_upsell:tour_start_clicked": "Tour: Start",
  "dm_upsell:tour_start_skipped": "Tour: Skipped at Start",
  "dm_upsell:tour_completed": "Tour Completed",
  "dm_upsell:tour_skipped": "Tour Skipped Mid-way",
  "dm_upsell:past_companions_loaded": "Past Companions Loaded",
  "dm_upsell:past_companion_link_copied": "Past-companion Link Copied",
};
