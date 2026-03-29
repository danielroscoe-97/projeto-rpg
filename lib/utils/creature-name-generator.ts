/**
 * Creature Name Generator — anti-metagaming display names.
 * Generates thematic fake names based on creature type.
 * Used to auto-fill display_name when DM adds monsters.
 */

const NAMES_BY_TYPE: Record<string, string[]> = {
  aberration: [
    "Ser Distorcido", "Coisa do Além", "Horror Profundo",
    "Forma Impossível", "Ser Aberrante", "Alien Voraz",
  ],
  beast: [
    "Fera Selvagem", "Besta Sombria", "Predador", "Criatura Feroz",
    "Caçador Feroz", "Animal Hostil",
  ],
  celestial: [
    "Ser Radiante", "Guardião Divino", "Luz Celestial",
    "Servo dos Céus", "Anjo Velado", "Ser Luminoso",
  ],
  construct: [
    "Autômato", "Construto", "Sentinela",
    "Guardião Arcano", "Forma Artificial", "Máquina Viva",
  ],
  dragon: [
    "Wyrm Antigo", "Besta Alada", "Grande Escama",
    "Serpente Ígnea", "Terror Voador", "Dragão Velado",
  ],
  elemental: [
    "Ser Elemental", "Fúria Viva", "Força Primal",
    "Caos Elemental", "Turbilhão Vivo", "Essência Bruta",
  ],
  fey: [
    "Ser Feérico", "Vulto Encantado", "Fada Sombria",
    "Ser Silvestre", "Presença Arcana", "Ente Feérico",
  ],
  fiend: [
    "Ser Infernal", "Demônio Menor", "Horror das Trevas",
    "Ente Sombrio", "Ser Abissal", "Vulto Maligno",
  ],
  giant: [
    "Colosso", "Titã Antigo", "Montanha Viva",
    "Grande Imenso", "Gigante Hostil", "Titã Bruto",
  ],
  humanoid: [
    "Vulto Armado", "Figura Hostil", "Estranho",
    "Silhueta Hostil", "Vulto Sombrio", "Encapuzado",
  ],
  monstrosity: [
    "Besta Grotesca", "Horror Vivo", "Fera Mutante",
    "Monstruosidade", "Ser Grotesco", "Terror Vivo",
  ],
  ooze: [
    "Gosma Viva", "Lodo Animado", "Massa Amorfa",
    "Bolha Ácida", "Forma Viscosa", "Lodo Hostil",
  ],
  plant: [
    "Planta Viva", "Flora Hostil", "Raiz Viva",
    "Esporo Animado", "Trepadeira", "Vegetal Hostil",
  ],
  undead: [
    "Morto-Vivo", "Sombra Errante", "Cadáver Animado",
    "Ser Necrótico", "Espírito Hostil", "Vulto Maldito",
  ],
};

const GENERIC_NAMES = [
  "Ser Misterioso", "Inimigo Oculto", "Ente Hostil",
  "Vulto Sinistro", "Ameaça Oculta", "Forma Estranha",
  "Ser Desconhecido", "Vulto Hostil", "Ente Sombrio",
];

/**
 * Generate a thematic fake name for a creature, avoiding duplicates.
 * Exhausts the pool before reusing names, then appends numbers.
 *
 * @param creatureType - The creature's type (e.g. "dragon", "undead")
 * @param existingNames - Display names already in use (for dedup)
 * @returns A unique thematic display name
 */
export function generateCreatureName(
  creatureType?: string | null,
  existingNames: string[] = []
): string {
  const key = creatureType?.toLowerCase();
  const pool = (key && Object.prototype.hasOwnProperty.call(NAMES_BY_TYPE, key) && NAMES_BY_TYPE[key]) || GENERIC_NAMES;

  // Find names from this pool not yet used
  const usedSet = new Set(existingNames);
  const available = pool.filter((n) => !usedSet.has(n));

  if (available.length > 0) {
    // Pick random from available (unused) names
    return available[Math.floor(Math.random() * available.length)];
  }

  // Pool exhausted — pick random and append number
  const base = pool[Math.floor(Math.random() * pool.length)];
  let suffix = 2;
  while (usedSet.has(`${base} ${suffix}`)) suffix++;
  return `${base} ${suffix}`;
}
