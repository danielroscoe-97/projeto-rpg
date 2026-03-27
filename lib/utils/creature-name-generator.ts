/**
 * Creature Name Generator — anti-metagaming display names.
 * Generates thematic fake names based on creature type.
 * Used to auto-fill display_name when DM adds monsters.
 */

const NAMES_BY_TYPE: Record<string, string[]> = {
  aberration: [
    "Entidade Distorcida", "Ser Aberrante", "Coisa do Além",
    "Horror Profundo", "Criatura Alienígena", "Forma Impossível",
  ],
  beast: [
    "Fera Selvagem", "Besta das Sombras", "Predador Antigo",
    "Criatura Rastejante", "Animal Monstruoso", "Caçador Feroz",
  ],
  celestial: [
    "Ser Radiante", "Emissário Celestial", "Guardião Divino",
    "Entidade Luminosa", "Servo dos Céus", "Presença Sagrada",
  ],
  construct: [
    "Autômato Antigo", "Máquina Arcana", "Construto Animado",
    "Sentinela de Pedra", "Guardião Mecânico", "Forma Artificial",
  ],
  dragon: [
    "Wyrm Ancestral", "Besta Alada", "Serpente de Fogo",
    "Grande Escama", "Dragão das Brumas", "Terror Voador",
  ],
  elemental: [
    "Espírito Elemental", "Fúria dos Elementos", "Essência Primordial",
    "Manifestação Caótica", "Força da Natureza", "Turbilhão Vivo",
  ],
  fey: [
    "Criatura Feérica", "Espírito da Floresta", "Ser do Crepúsculo",
    "Encantador Silvestre", "Presença Arcana", "Vulto Encantado",
  ],
  fiend: [
    "Entidade Sombria", "Demônio Menor", "Ser Infernal",
    "Horror das Trevas", "Criatura Abissal", "Presença Maligna",
  ],
  giant: [
    "Colosso Antigo", "Gigante das Terras", "Titã Primitivo",
    "Montanha Viva", "Destroçador Imenso", "Grande Ancestral",
  ],
  humanoid: [
    "Figura Encapuzada", "Guerreiro Misterioso", "Estranho Armado",
    "Silhueta Hostil", "Combatente Desconhecido", "Vulto Sombrio",
  ],
  monstrosity: [
    "Monstruosidade", "Besta Antinatural", "Criatura Grotesca",
    "Aberração da Natureza", "Terror Rastejante", "Horror Vivo",
  ],
  ooze: [
    "Gosma Rastejante", "Lodo Animado", "Massa Amorfa",
    "Criatura Viscosa", "Bolha Corrosiva", "Forma Gelatinosa",
  ],
  plant: [
    "Vegetação Animada", "Planta Carnívora", "Raiz Viva",
    "Esporo Ambulante", "Flora Predadora", "Trepadeira Hostil",
  ],
  undead: [
    "Morto-Vivo", "Espírito Atormentado", "Cadáver Animado",
    "Sombra Errante", "Presença Necrótica", "Resquício Maldito",
  ],
};

const GENERIC_NAMES = [
  "Criatura Misteriosa", "Inimigo Desconhecido", "Entidade Hostil",
  "Ser Misterioso", "Presença Ameaçadora", "Vulto Sinistro",
  "Ameaça Oculta", "Forma Indistinta", "Adversário Enigmático",
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
