export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingTime: string;
  keywords: string[];
  ogTitle: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "como-usar-combat-tracker-dnd-5e",
    title: "Como Usar um Combat Tracker na sua Mesa de D&D 5e",
    description:
      "Guia prático para mestres que querem gerenciar combate de forma rápida e organizada. Aprenda a rastrear iniciativa, HP e condições sem perder o ritmo da sessão.",
    date: "2026-04-03",
    readingTime: "8 min",
    keywords: [
      "combat tracker D&D",
      "rastreador de combate",
      "como usar combat tracker",
      "gerenciar combate D&D 5e",
      "iniciativa D&D",
    ],
    ogTitle: "Como Usar um Combat Tracker na Mesa de D&D 5e | Pocket DM",
  },
  {
    slug: "ferramentas-essenciais-mestre-dnd-5e",
    title: "5 Ferramentas Essenciais para Mestres de D&D 5e",
    description:
      "As ferramentas que todo mestre de D&D 5e precisa para rodar sessões incríveis — do bestiário digital ao combat tracker gratuito.",
    date: "2026-04-03",
    readingTime: "7 min",
    keywords: [
      "ferramentas mestre RPG",
      "ferramentas DM D&D 5e",
      "app para mestre de RPG",
      "DM tools D&D",
      "ferramentas para mestre de RPG",
    ],
    ogTitle: "5 Ferramentas Essenciais para Mestres de D&D 5e | Pocket DM",
  },
  {
    slug: "combat-tracker-vs-vtt-diferenca",
    title: "Combat Tracker vs VTT: Qual a Diferença e Qual Usar?",
    description:
      "Entenda a diferença entre um combat tracker e um Virtual Tabletop (VTT). Descubra qual ferramenta é ideal para sua mesa presencial ou online de D&D 5e.",
    date: "2026-04-03",
    readingTime: "6 min",
    keywords: [
      "combat tracker vs VTT",
      "virtual tabletop vs combat tracker",
      "Roll20 alternativa",
      "Foundry VTT alternativa",
      "mesa presencial D&D",
    ],
    ogTitle: "Combat Tracker vs VTT — Qual a Diferença? | Pocket DM",
  },
  {
    slug: "guia-condicoes-dnd-5e",
    title: "Guia Completo de Condições do D&D 5e — Todas as 15 Condições Explicadas",
    description:
      "Referência rápida com todas as 15 condições do D&D 5e explicadas em português. Blinded, Charmed, Frightened, Stunned e mais — com exemplos práticos de quando aplicar cada uma.",
    date: "2026-04-03",
    readingTime: "10 min",
    keywords: [
      "condições D&D 5e",
      "conditions D&D 5e",
      "blinded D&D",
      "stunned D&D",
      "guia condições RPG",
      "conditions cheat sheet",
    ],
    ogTitle: "Guia Completo de Condições D&D 5e | Pocket DM",
  },
  {
    slug: "como-agilizar-combate-dnd-5e",
    title: "Como Agilizar o Combate no D&D 5e — 10 Dicas Práticas",
    description:
      "Combate lento é o maior inimigo de uma boa sessão de D&D. Aprenda 10 dicas práticas para acelerar combates sem perder a diversão — do dano fixo ao combat tracker digital.",
    date: "2026-04-03",
    readingTime: "9 min",
    keywords: [
      "agilizar combate D&D",
      "combate lento D&D",
      "speed up combat D&D",
      "dicas combate D&D 5e",
      "combate rápido RPG",
    ],
    ogTitle: "Como Agilizar o Combate no D&D 5e | Pocket DM",
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
