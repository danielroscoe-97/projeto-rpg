"use client";

import { PlayerMindMap } from "../PlayerMindMap";
import type { PlayerHqV2TabProps } from "./HeroiTab";

/**
 * Mapa needs `campaignName` for PlayerMindMap, which is not part of the
 * canonical PlayerHqV2TabProps shape. Extend instead of forking — the
 * shared base remains the canonical contract; Mapa adds the one extra
 * field it needs.
 */
export interface MapaTabProps extends PlayerHqV2TabProps {
  campaignName: string;
}

/**
 * MapaTab — Sprint 3 Track B · Story B2d (1 pt).
 *
 * Wraps PlayerMindMap unchanged per
 * [09-implementation-plan.md §B2](../../../_bmad-output/party-mode-2026-04-22/09-implementation-plan.md)
 * + [06-wireframe-mapa.md](../../../_bmad-output/party-mode-2026-04-22/06-wireframe-mapa.md):
 *
 *   "Mapa hoje é a tab mais polida do Player HQ ... mantém arquitetura
 *    atual; ajustes cosméticos no §6."
 *
 * The only addition vs. the B1 stub is a wrapper div with `data-testid=
 * "mapa-tab-content"` for E2E gating. PlayerMindMap and the entire drawer
 * family stay verbatim — they ship 707 LOC of carry-over per the reuse
 * matrix, with the `onNavigateTab` callback wired to a no-op since V2
 * tab navigation is owned by PlayerHqShellV2 not the mind map.
 *
 * The §6.2 cosmetic ajustes ("Ver no Diário" link inline) and §2.3
 * "halo gold em entidades atualizadas" land in Story D4 (cross-nav) and
 * are intentionally NOT included here to keep B2d scope at 1 point.
 */
export function MapaTab({
  characterId,
  campaignId,
  campaignName,
  userId,
}: MapaTabProps) {
  return (
    <div data-testid="mapa-tab-content">
      <PlayerMindMap
        campaignId={campaignId}
        campaignName={campaignName}
        characterId={characterId}
        userId={userId}
      />
    </div>
  );
}
