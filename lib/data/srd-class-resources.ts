import srdResourcesData from "./srd-resources-index.json";

export interface SrdResource {
  id: string;
  name: string;
  class: string;
  category: string;
  description: string;
  reset_type: "short_rest" | "long_rest" | "dawn" | "manual";
  uses_by_level: Record<string, number> | string;
}

export const SRD_RESOURCES: SrdResource[] = srdResourcesData as SrdResource[];

export function searchSrdResources(query: string): SrdResource[] {
  const q = query.toLowerCase().trim();
  if (!q) return SRD_RESOURCES;
  return SRD_RESOURCES.filter(
    (r) =>
      r.name.toLowerCase().includes(q) ||
      r.class.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
  );
}

export function getPrefilledValues(
  resource: SrdResource,
  characterLevel?: number | null,
  chaModifier?: number | null
): { maxUses: number; resetType: SrdResource["reset_type"] } {
  let maxUses = 1;

  if (resource.uses_by_level === "= level") {
    maxUses = characterLevel ?? 1;
  } else if (resource.uses_by_level === "= level * 5") {
    maxUses = (characterLevel ?? 1) * 5;
  } else if (resource.uses_by_level === "= charisma_modifier") {
    maxUses = Math.max(1, chaModifier ?? 1);
  } else if (typeof resource.uses_by_level === "object") {
    const level = characterLevel ?? 1;
    const keys = Object.keys(resource.uses_by_level)
      .filter((k) => k !== "default")
      .map(Number)
      .sort((a, b) => a - b);
    const applicableLevel = keys.filter((k) => k <= level).pop();
    maxUses = applicableLevel
      ? resource.uses_by_level[String(applicableLevel)]
      : (resource.uses_by_level["default"] ?? 1);
  }

  return { maxUses, resetType: resource.reset_type };
}
