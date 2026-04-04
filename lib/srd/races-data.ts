// Server-safe race data and helpers for static generation / metadata
// Extracted from PublicRaceDetail.tsx to avoid "use client" boundary issues

export interface RaceTrait {
  nameEn: string;
  namePt: string;
  descriptionEn: string;
  descriptionPt: string;
}

export interface RaceSubrace {
  nameEn: string;
  namePt: string;
  abilityBonuses: { ability: string; bonus: string }[];
  traits: RaceTrait[];
}

export interface RaceData {
  slug: string;
  nameEn: string;
  namePt: string;
  icon: string;
  abilityBonuses: { ability: string; bonus: string }[];
  size: "Small" | "Medium";
  speed: number;
  darkvision: number | null;
  languagesEn: string;
  languagesPt: string;
  traits: RaceTrait[];
  subrace: RaceSubrace | null;
}

const RACE_DATA: Record<string, RaceData> = {
  dwarf: { slug: "dwarf", nameEn: "Dwarf", namePt: "Anao", icon: "\u26CF\uFE0F", abilityBonuses: [{ ability: "CON", bonus: "+2" }], size: "Medium", speed: 25, darkvision: 60, languagesEn: "Common, Dwarvish", languagesPt: "Comum, Anao", traits: [{ nameEn: "Dwarven Resilience", namePt: "Resiliencia Ana", descriptionEn: "You have advantage on saving throws against poison, and you have resistance against poison damage.", descriptionPt: "Voce tem vantagem em testes de resistencia contra veneno e tem resistencia contra dano de veneno." }, { nameEn: "Stonecunning", namePt: "Especialista em Rochas", descriptionEn: "Whenever you make an Intelligence (History) check related to the origin of stonework, you are considered proficient in the History skill and add double your proficiency bonus to the check.", descriptionPt: "Sempre que fizer um teste de Inteligencia (Historia) relacionado a origem de trabalhos em pedra, voce e considerado proficiente na pericia Historia e adiciona o dobro do seu bonus de proficiencia ao teste." }], subrace: { nameEn: "Hill Dwarf", namePt: "Anao da Colina", abilityBonuses: [{ ability: "WIS", bonus: "+1" }], traits: [{ nameEn: "Dwarven Toughness", namePt: "Robustez Ana", descriptionEn: "Your hit point maximum increases by 1, and it increases by 1 every time you gain a level.", descriptionPt: "Seu maximo de pontos de vida aumenta em 1 e aumenta em 1 cada vez que voce ganha um nivel." }] } },
  elf: { slug: "elf", nameEn: "Elf", namePt: "Elfo", icon: "\uD83E\uDDDD", abilityBonuses: [{ ability: "DEX", bonus: "+2" }], size: "Medium", speed: 30, darkvision: 60, languagesEn: "Common, Elvish", languagesPt: "Comum, Elfico", traits: [{ nameEn: "Keen Senses", namePt: "Sentidos Aguados", descriptionEn: "You have proficiency in the Perception skill.", descriptionPt: "Voce tem proficiencia na pericia Percepcao." }, { nameEn: "Fey Ancestry", namePt: "Ancestralidade Ferica", descriptionEn: "You have advantage on saving throws against being charmed, and magic can't put you to sleep.", descriptionPt: "Voce tem vantagem em testes de resistencia contra ser encantado e magia nao pode coloca-lo para dormir." }, { nameEn: "Trance", namePt: "Transe", descriptionEn: "Elves don't need to sleep. Instead, they meditate deeply for 4 hours a day.", descriptionPt: "Elfos nao precisam dormir. Em vez disso, meditam profundamente por 4 horas por dia." }], subrace: { nameEn: "High Elf", namePt: "Alto Elfo", abilityBonuses: [{ ability: "INT", bonus: "+1" }], traits: [{ nameEn: "Cantrip", namePt: "Truque", descriptionEn: "You know one cantrip of your choice from the wizard spell list.", descriptionPt: "Voce conhece um truque a sua escolha da lista de magias de mago." }] } },
  halfling: { slug: "halfling", nameEn: "Halfling", namePt: "Halfling", icon: "\uD83C\uDF40", abilityBonuses: [{ ability: "DEX", bonus: "+2" }], size: "Small", speed: 25, darkvision: null, languagesEn: "Common, Halfling", languagesPt: "Comum, Halfling", traits: [{ nameEn: "Lucky", namePt: "Sortudo", descriptionEn: "When you roll a 1 on the d20 for an attack roll, ability check, or saving throw, you can reroll the die and must use the new roll.", descriptionPt: "Quando voce rolar um 1 no d20 para uma jogada de ataque, teste de habilidade ou teste de resistencia, voce pode rolar o dado novamente e deve usar a nova rolagem." }, { nameEn: "Brave", namePt: "Corajoso", descriptionEn: "You have advantage on saving throws against being frightened.", descriptionPt: "Voce tem vantagem em testes de resistencia contra ser amedrontado." }], subrace: { nameEn: "Lightfoot", namePt: "Pes Leves", abilityBonuses: [{ ability: "CHA", bonus: "+1" }], traits: [{ nameEn: "Naturally Stealthy", namePt: "Naturalmente Furtivo", descriptionEn: "You can attempt to hide even when you are obscured only by a creature that is at least one size larger than you.", descriptionPt: "Voce pode tentar se esconder mesmo quando esta obscurecido apenas por uma criatura que seja pelo menos um tamanho maior que voce." }] } },
  human: { slug: "human", nameEn: "Human", namePt: "Humano", icon: "\uD83D\uDC64", abilityBonuses: [{ ability: "ALL", bonus: "+1" }], size: "Medium", speed: 30, darkvision: null, languagesEn: "Common, one extra language", languagesPt: "Comum, um idioma adicional", traits: [{ nameEn: "Ability Score Increase", namePt: "Aumento de Atributo", descriptionEn: "Your ability scores each increase by 1.", descriptionPt: "Todos os seus atributos aumentam em 1." }], subrace: null },
  dragonborn: { slug: "dragonborn", nameEn: "Dragonborn", namePt: "Draconato", icon: "\uD83D\uDC09", abilityBonuses: [{ ability: "STR", bonus: "+2" }, { ability: "CHA", bonus: "+1" }], size: "Medium", speed: 30, darkvision: null, languagesEn: "Common, Draconic", languagesPt: "Comum, Draconico", traits: [{ nameEn: "Breath Weapon", namePt: "Arma de Sopro", descriptionEn: "You can use your action to exhale destructive energy. Damage: 2d6 scaling to 5d6.", descriptionPt: "Voce pode usar sua acao para exalar energia destrutiva. Dano: 2d6 escalando para 5d6." }, { nameEn: "Damage Resistance", namePt: "Resistencia a Dano", descriptionEn: "You have resistance to the damage type associated with your draconic ancestry.", descriptionPt: "Voce tem resistencia ao tipo de dano associado a sua ancestralidade draconica." }], subrace: null },
  gnome: { slug: "gnome", nameEn: "Gnome", namePt: "Gnomo", icon: "\uD83D\uDD27", abilityBonuses: [{ ability: "INT", bonus: "+2" }], size: "Small", speed: 25, darkvision: 60, languagesEn: "Common, Gnomish", languagesPt: "Comum, Gnomico", traits: [{ nameEn: "Gnome Cunning", namePt: "Esperteza Gnomida", descriptionEn: "You have advantage on all Intelligence, Wisdom, and Charisma saving throws against magic.", descriptionPt: "Voce tem vantagem em todos os testes de resistencia de Inteligencia, Sabedoria e Carisma contra magia." }], subrace: { nameEn: "Rock Gnome", namePt: "Gnomo das Rochas", abilityBonuses: [{ ability: "CON", bonus: "+1" }], traits: [{ nameEn: "Tinker", namePt: "Engenhoqueiro", descriptionEn: "You have proficiency with artisan's tools (tinker's tools).", descriptionPt: "Voce tem proficiencia com ferramentas de artesao (ferramentas de funileiro)." }] } },
  "half-elf": { slug: "half-elf", nameEn: "Half-Elf", namePt: "Meio-Elfo", icon: "\uD83C\uDF19", abilityBonuses: [{ ability: "CHA", bonus: "+2" }, { ability: "ALL", bonus: "+1 x2" }], size: "Medium", speed: 30, darkvision: 60, languagesEn: "Common, Elvish, one extra", languagesPt: "Comum, Elfico, um adicional", traits: [{ nameEn: "Fey Ancestry", namePt: "Ancestralidade Ferica", descriptionEn: "Advantage on saves vs charmed, immune to magical sleep.", descriptionPt: "Vantagem em testes contra encantamento, imune a sono magico." }, { nameEn: "Skill Versatility", namePt: "Versatilidade em Pericias", descriptionEn: "You gain proficiency in two skills of your choice.", descriptionPt: "Voce ganha proficiencia em duas pericias a sua escolha." }], subrace: null },
  "half-orc": { slug: "half-orc", nameEn: "Half-Orc", namePt: "Meio-Orc", icon: "\uD83D\uDCAA", abilityBonuses: [{ ability: "STR", bonus: "+2" }, { ability: "CON", bonus: "+1" }], size: "Medium", speed: 30, darkvision: 60, languagesEn: "Common, Orc", languagesPt: "Comum, Orc", traits: [{ nameEn: "Relentless Endurance", namePt: "Resistencia Incansavel", descriptionEn: "When reduced to 0 HP, drop to 1 HP instead (1/long rest).", descriptionPt: "Quando reduzido a 0 PV, caia para 1 PV (1/descanso longo)." }, { nameEn: "Savage Attacks", namePt: "Ataques Selvagens", descriptionEn: "Extra damage die on melee critical hits.", descriptionPt: "Dado de dano extra em criticos corpo a corpo." }], subrace: null },
  tiefling: { slug: "tiefling", nameEn: "Tiefling", namePt: "Tiefling", icon: "\uD83D\uDE08", abilityBonuses: [{ ability: "CHA", bonus: "+2" }, { ability: "INT", bonus: "+1" }], size: "Medium", speed: 30, darkvision: 60, languagesEn: "Common, Infernal", languagesPt: "Comum, Infernal", traits: [{ nameEn: "Hellish Resistance", namePt: "Resistencia Infernal", descriptionEn: "You have resistance to fire damage.", descriptionPt: "Voce tem resistencia a dano de fogo." }, { nameEn: "Infernal Legacy", namePt: "Legado Infernal", descriptionEn: "You know thaumaturgy. At 3rd level: hellish rebuke. At 5th: darkness.", descriptionPt: "Voce conhece taumaturgia. No 3o nivel: repreensao infernal. No 5o: escuridao." }], subrace: null },
};

export function getRaceSlugs(): string[] {
  return Object.keys(RACE_DATA);
}

export function getRaceData(slug: string): RaceData | undefined {
  return RACE_DATA[slug];
}
