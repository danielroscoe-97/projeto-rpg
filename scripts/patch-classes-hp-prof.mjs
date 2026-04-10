// Patch script: add hit_points, tool_proficiencies, skill_choices to all 12 classes
import { readFileSync, writeFileSync } from "fs";

const DATA = {
  barbarian: {
    hit_points_en: "Hit Dice: 1d12 per barbarian level\nHit Points at 1st Level: 12 + your Constitution modifier\nHit Points at Higher Levels: 1d12 (or 7) + your Constitution modifier per barbarian level after 1st",
    hit_points_pt: "Dado de Vida: 1d12 por nível de bárbaro\nPontos de Vida no 1º Nível: 12 + seu modificador de Constituição\nPontos de Vida em Níveis Superiores: 1d12 (ou 7) + seu modificador de Constituição por nível de bárbaro após o 1º",
    tool_proficiencies_en: "None",
    tool_proficiencies_pt: "Nenhuma",
    skill_choices_en: "Choose two from Animal Handling, Athletics, Intimidation, Nature, Perception, and Survival",
    skill_choices_pt: "Escolha duas entre Adestrar Animais, Atletismo, Intimidação, Natureza, Percepção e Sobrevivência",
  },
  bard: {
    hit_points_en: "Hit Dice: 1d8 per bard level\nHit Points at 1st Level: 8 + your Constitution modifier\nHit Points at Higher Levels: 1d8 (or 5) + your Constitution modifier per bard level after 1st",
    hit_points_pt: "Dado de Vida: 1d8 por nível de bardo\nPontos de Vida no 1º Nível: 8 + seu modificador de Constituição\nPontos de Vida em Níveis Superiores: 1d8 (ou 5) + seu modificador de Constituição por nível de bardo após o 1º",
    tool_proficiencies_en: "Three musical instruments of your choice",
    tool_proficiencies_pt: "Três instrumentos musicais de sua escolha",
    skill_choices_en: "Choose any three",
    skill_choices_pt: "Escolha quaisquer três",
  },
  cleric: {
    hit_points_en: "Hit Dice: 1d8 per cleric level\nHit Points at 1st Level: 8 + your Constitution modifier\nHit Points at Higher Levels: 1d8 (or 5) + your Constitution modifier per cleric level after 1st",
    hit_points_pt: "Dado de Vida: 1d8 por nível de clérigo\nPontos de Vida no 1º Nível: 8 + seu modificador de Constituição\nPontos de Vida em Níveis Superiores: 1d8 (ou 5) + seu modificador de Constituição por nível de clérigo após o 1º",
    tool_proficiencies_en: "None",
    tool_proficiencies_pt: "Nenhuma",
    skill_choices_en: "Choose two from History, Insight, Medicine, Persuasion, and Religion",
    skill_choices_pt: "Escolha duas entre História, Intuição, Medicina, Persuasão e Religião",
  },
  druid: {
    hit_points_en: "Hit Dice: 1d8 per druid level\nHit Points at 1st Level: 8 + your Constitution modifier\nHit Points at Higher Levels: 1d8 (or 5) + your Constitution modifier per druid level after 1st",
    hit_points_pt: "Dado de Vida: 1d8 por nível de druida\nPontos de Vida no 1º Nível: 8 + seu modificador de Constituição\nPontos de Vida em Níveis Superiores: 1d8 (ou 5) + seu modificador de Constituição por nível de druida após o 1º",
    tool_proficiencies_en: "Herbalism kit",
    tool_proficiencies_pt: "Kit de herbalismo",
    skill_choices_en: "Choose two from Arcana, Animal Handling, Insight, Medicine, Nature, Perception, Religion, and Survival",
    skill_choices_pt: "Escolha duas entre Arcanismo, Adestrar Animais, Intuição, Medicina, Natureza, Percepção, Religião e Sobrevivência",
  },
  fighter: {
    hit_points_en: "Hit Dice: 1d10 per fighter level\nHit Points at 1st Level: 10 + your Constitution modifier\nHit Points at Higher Levels: 1d10 (or 6) + your Constitution modifier per fighter level after 1st",
    hit_points_pt: "Dado de Vida: 1d10 por nível de guerreiro\nPontos de Vida no 1º Nível: 10 + seu modificador de Constituição\nPontos de Vida em Níveis Superiores: 1d10 (ou 6) + seu modificador de Constituição por nível de guerreiro após o 1º",
    tool_proficiencies_en: "None",
    tool_proficiencies_pt: "Nenhuma",
    skill_choices_en: "Choose two from Acrobatics, Animal Handling, Athletics, History, Insight, Intimidation, Perception, and Survival",
    skill_choices_pt: "Escolha duas entre Acrobacia, Adestrar Animais, Atletismo, História, Intuição, Intimidação, Percepção e Sobrevivência",
  },
  monk: {
    hit_points_en: "Hit Dice: 1d8 per monk level\nHit Points at 1st Level: 8 + your Constitution modifier\nHit Points at Higher Levels: 1d8 (or 5) + your Constitution modifier per monk level after 1st",
    hit_points_pt: "Dado de Vida: 1d8 por nível de monge\nPontos de Vida no 1º Nível: 8 + seu modificador de Constituição\nPontos de Vida em Níveis Superiores: 1d8 (ou 5) + seu modificador de Constituição por nível de monge após o 1º",
    tool_proficiencies_en: "Choose one type of artisan's tools or one musical instrument",
    tool_proficiencies_pt: "Escolha um tipo de ferramentas de artesão ou um instrumento musical",
    skill_choices_en: "Choose two from Acrobatics, Athletics, History, Insight, Religion, and Stealth",
    skill_choices_pt: "Escolha duas entre Acrobacia, Atletismo, História, Intuição, Religião e Furtividade",
  },
  paladin: {
    hit_points_en: "Hit Dice: 1d10 per paladin level\nHit Points at 1st Level: 10 + your Constitution modifier\nHit Points at Higher Levels: 1d10 (or 6) + your Constitution modifier per paladin level after 1st",
    hit_points_pt: "Dado de Vida: 1d10 por nível de paladino\nPontos de Vida no 1º Nível: 10 + seu modificador de Constituição\nPontos de Vida em Níveis Superiores: 1d10 (ou 6) + seu modificador de Constituição por nível de paladino após o 1º",
    tool_proficiencies_en: "None",
    tool_proficiencies_pt: "Nenhuma",
    skill_choices_en: "Choose two from Athletics, Insight, Intimidation, Medicine, Persuasion, and Religion",
    skill_choices_pt: "Escolha duas entre Atletismo, Intuição, Intimidação, Medicina, Persuasão e Religião",
  },
  ranger: {
    hit_points_en: "Hit Dice: 1d10 per ranger level\nHit Points at 1st Level: 10 + your Constitution modifier\nHit Points at Higher Levels: 1d10 (or 6) + your Constitution modifier per ranger level after 1st",
    hit_points_pt: "Dado de Vida: 1d10 por nível de patrulheiro\nPontos de Vida no 1º Nível: 10 + seu modificador de Constituição\nPontos de Vida em Níveis Superiores: 1d10 (ou 6) + seu modificador de Constituição por nível de patrulheiro após o 1º",
    tool_proficiencies_en: "None",
    tool_proficiencies_pt: "Nenhuma",
    skill_choices_en: "Choose three from Animal Handling, Athletics, Insight, Investigation, Nature, Perception, Stealth, and Survival",
    skill_choices_pt: "Escolha três entre Adestrar Animais, Atletismo, Intuição, Investigação, Natureza, Percepção, Furtividade e Sobrevivência",
  },
  rogue: {
    hit_points_en: "Hit Dice: 1d8 per rogue level\nHit Points at 1st Level: 8 + your Constitution modifier\nHit Points at Higher Levels: 1d8 (or 5) + your Constitution modifier per rogue level after 1st",
    hit_points_pt: "Dado de Vida: 1d8 por nível de ladino\nPontos de Vida no 1º Nível: 8 + seu modificador de Constituição\nPontos de Vida em Níveis Superiores: 1d8 (ou 5) + seu modificador de Constituição por nível de ladino após o 1º",
    tool_proficiencies_en: "Thieves' tools",
    tool_proficiencies_pt: "Ferramentas de ladrão",
    skill_choices_en: "Choose four from Acrobatics, Athletics, Deception, Insight, Intimidation, Investigation, Perception, Performance, Persuasion, Sleight of Hand, and Stealth",
    skill_choices_pt: "Escolha quatro entre Acrobacia, Atletismo, Enganação, Intuição, Intimidação, Investigação, Percepção, Atuação, Persuasão, Prestidigitação e Furtividade",
  },
  sorcerer: {
    hit_points_en: "Hit Dice: 1d6 per sorcerer level\nHit Points at 1st Level: 6 + your Constitution modifier\nHit Points at Higher Levels: 1d6 (or 4) + your Constitution modifier per sorcerer level after 1st",
    hit_points_pt: "Dado de Vida: 1d6 por nível de feiticeiro\nPontos de Vida no 1º Nível: 6 + seu modificador de Constituição\nPontos de Vida em Níveis Superiores: 1d6 (ou 4) + seu modificador de Constituição por nível de feiticeiro após o 1º",
    tool_proficiencies_en: "None",
    tool_proficiencies_pt: "Nenhuma",
    skill_choices_en: "Choose two from Arcana, Deception, Insight, Intimidation, Persuasion, and Religion",
    skill_choices_pt: "Escolha duas entre Arcanismo, Enganação, Intuição, Intimidação, Persuasão e Religião",
  },
  warlock: {
    hit_points_en: "Hit Dice: 1d8 per warlock level\nHit Points at 1st Level: 8 + your Constitution modifier\nHit Points at Higher Levels: 1d8 (or 5) + your Constitution modifier per warlock level after 1st",
    hit_points_pt: "Dado de Vida: 1d8 por nível de bruxo\nPontos de Vida no 1º Nível: 8 + seu modificador de Constituição\nPontos de Vida em Níveis Superiores: 1d8 (ou 5) + seu modificador de Constituição por nível de bruxo após o 1º",
    tool_proficiencies_en: "None",
    tool_proficiencies_pt: "Nenhuma",
    skill_choices_en: "Choose two from Arcana, Deception, History, Intimidation, Investigation, Nature, and Religion",
    skill_choices_pt: "Escolha duas entre Arcanismo, Enganação, História, Intimidação, Investigação, Natureza e Religião",
  },
  wizard: {
    hit_points_en: "Hit Dice: 1d6 per wizard level\nHit Points at 1st Level: 6 + your Constitution modifier\nHit Points at Higher Levels: 1d6 (or 4) + your Constitution modifier per wizard level after 1st",
    hit_points_pt: "Dado de Vida: 1d6 por nível de mago\nPontos de Vida no 1º Nível: 6 + seu modificador de Constituição\nPontos de Vida em Níveis Superiores: 1d6 (ou 4) + seu modificador de Constituição por nível de mago após o 1º",
    tool_proficiencies_en: "None",
    tool_proficiencies_pt: "Nenhuma",
    skill_choices_en: "Choose two from Arcana, History, Insight, Investigation, Medicine, and Religion",
    skill_choices_pt: "Escolha duas entre Arcanismo, História, Intuição, Investigação, Medicina e Religião",
  },
};

const file = "data/srd/classes-full.json";
const classes = JSON.parse(readFileSync(file, "utf-8"));

let patched = 0;
for (const cls of classes) {
  const patch = DATA[cls.id];
  if (patch) {
    Object.assign(cls, patch);
    patched++;
  }
}

writeFileSync(file, JSON.stringify(classes, null, 2));
console.log(`✅ Patched ${patched} classes with hit_points, tool_proficiencies, skill_choices`);
