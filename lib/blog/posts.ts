export type BlogCategory = "tutorial" | "guia" | "lista" | "comparativo" | "build" | "devlog";

export const BLOG_CATEGORIES: Record<BlogCategory, string> = {
  tutorial: "Tutorial",
  guia: "Guia",
  lista: "Lista",
  comparativo: "Comparativo",
  build: "Build",
  devlog: "Devlog",
};

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingTime: string;
  keywords: string[];
  ogTitle: string;
  category: BlogCategory;
  pinned?: boolean;
  image?: string;
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "diario-de-aventura",
    title: "Diário de Aventura — A Jornada do Pocket DM",
    description:
      "Da dor de gerenciar combate no caderno até um combat tracker completo para D&D 5e. A história do Pocket DM contada por quem viveu cada mesa, cada bug e cada decisão.",
    date: "2026-04-05",
    readingTime: "15 min",
    keywords: [
      "Pocket DM",
      "changelog",
      "devlog",
      "desenvolvimento",
      "combat tracker D&D",
      "indie dev",
      "RPG tools",
      "diário de desenvolvimento",
    ],
    ogTitle: "Diário de Aventura — A Jornada do Pocket DM",
    category: "devlog",
    pinned: true,
    image: "/art/blog/landing-hero.png",
  },
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
    category: "tutorial",
    image: "/art/blog/combat-active.png",
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
    category: "lista",
    image: "/art/blog/combat-setup.png",
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
    category: "comparativo",
    image: "/art/blog/combat-with-monsters.png",
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
    category: "guia",
    image: "/art/blog/combat-conditions.png",
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
    category: "tutorial",
    image: "/art/blog/combat-hp-panel.png",
  },
  {
    slug: "como-usar-pocket-dm-tutorial",
    title: "Como Usar o Pocket DM — Tutorial Completo para Mestres de D&D 5e",
    description:
      "Tutorial passo a passo do Pocket DM: como montar encontros, adicionar monstros, gerenciar combate, convidar jogadores e usar o bestiário e oráculo de magias. Guia completo com screenshots.",
    date: "2026-04-03",
    readingTime: "12 min",
    keywords: [
      "Pocket DM",
      "como usar Pocket DM",
      "Pocket DM tutorial",
      "combat tracker tutorial",
      "rastreador de combate D&D tutorial",
      "pocketdm",
      "pocket dm app",
    ],
    ogTitle: "Como Usar o Pocket DM — Tutorial Completo | Pocket DM",
    category: "tutorial",
    image: "/art/blog/monster-search.png",
  },
  {
    slug: "como-montar-encontro-balanceado-dnd-5e",
    title: "Como Montar um Encontro Balanceado no D&D 5e",
    description:
      "Guia completo para montar encontros balanceados no D&D 5e. Aprenda o método de orçamento de XP, o Lazy Encounter Benchmark, economia de ações, composição de monstros e como usar terreno a seu favor.",
    date: "2026-04-04",
    readingTime: "11 min",
    keywords: [
      "encontro balanceado D&D 5e",
      "como balancear encontro D&D",
      "encounter building D&D",
      "orçamento de XP D&D 5e",
      "economia de ações D&D",
      "dificuldade encontro D&D",
      "CR D&D 5e",
      "calculadora de encontro D&D",
    ],
    ogTitle:
      "Como Montar um Encontro Balanceado no D&D 5e | Pocket DM",
    category: "tutorial",
    image: "/art/blog/heroes/encounter-building.png",
  },
  {
    slug: "como-mestrar-dnd-primeira-vez",
    title: "Como Mestrar D&D pela Primeira Vez: Guia Completo para Iniciantes",
    description:
      "Guia prático para quem vai mestrar D&D 5e pela primeira vez. Aprenda a preparar sessões com o método Lazy DM, gerenciar combate, improvisar e evitar os erros mais comuns de mestres iniciantes.",
    date: "2026-04-04",
    readingTime: "11 min",
    keywords: [
      "como mestrar D&D",
      "mestre de RPG iniciante",
      "primeira sessão D&D",
      "dicas para mestre D&D 5e",
      "como ser DM",
      "lazy dungeon master",
      "guia mestre iniciante",
    ],
    ogTitle:
      "Como Mestrar D&D pela Primeira Vez — Guia Completo | Pocket DM",
    category: "tutorial",
    image: "/art/blog/heroes/first-time-dm.png",
  },
  {
    slug: "musica-ambiente-para-rpg",
    title: "Música Ambiente para RPG: Como Escolher a Trilha Sonora Certa para Cada Cena",
    description:
      "Guia completo de música ambiente para RPG e D&D 5e. Descubra como montar playlists por tipo de cena, as melhores fontes gratuitas (Tabletop Audio, YouTube, Spotify) e ferramentas como Syrinscape para transformar suas sessões.",
    date: "2026-04-04",
    readingTime: "10 min",
    keywords: [
      "música ambiente para RPG",
      "trilha sonora RPG",
      "música para D&D",
      "playlist RPG",
      "Tabletop Audio",
      "Syrinscape",
      "ambientação sonora RPG",
      "música mesa de RPG",
    ],
    ogTitle:
      "Música Ambiente para RPG — Trilha Sonora para Cada Cena | Pocket DM",
    category: "guia",
    image: "/art/blog/heroes/ambient-music.png",
  },
  {
    slug: "melhores-monstros-dnd-5e",
    title: "10 Monstros que Todo Mestre de D&D Deveria Usar",
    description:
      "Os 10 melhores monstros do D&D 5e para mestres — do Goblin ao Lich. Dicas táticas, quando usar cada criatura e links para fichas completas no compêndio gratuito.",
    date: "2026-04-04",
    readingTime: "11 min",
    keywords: [
      "melhores monstros D&D 5e",
      "monstros D&D",
      "bestiário D&D 5e",
      "goblin D&D",
      "beholder D&D",
      "lich D&D",
      "mind flayer D&D",
      "monstros para mestre RPG",
      "encontros D&D 5e",
    ],
    ogTitle: "10 Monstros que Todo Mestre de D&D Deveria Usar | Pocket DM",
    category: "lista",
    image: "/art/blog/bestiary-index.png",
  },
  {
    slug: "guia-challenge-rating-dnd-5e",
    title:
      "Guia de Challenge Rating: Como Calcular a Dificuldade de Encontros no D&D 5e",
    description:
      "Entenda o sistema de Challenge Rating do D&D 5e — tabelas de XP, multiplicadores, quando o CR mente e atalhos práticos. Guia completo com referências de Sly Flourish, The Angry GM e Blog of Holding.",
    date: "2026-04-04",
    readingTime: "10 min",
    keywords: [
      "challenge rating D&D 5e",
      "CR D&D",
      "dificuldade encontro D&D",
      "XP threshold D&D 5e",
      "como calcular CR",
      "encounter difficulty 5e",
      "tabela XP D&D",
    ],
    ogTitle:
      "Guia de Challenge Rating — Como Calcular a Dificuldade | Pocket DM",
    category: "guia",
    image: "/art/blog/heroes/challenge-rating.png",
  },
  {
    slug: "teatro-da-mente-vs-grid-dnd-5e",
    title:
      "Teatro da Mente vs Grid: Qual Estilo de Combate Usar no D&D 5e?",
    description:
      "Comparativo completo entre teatro da mente e combate com grid no D&D 5e. Prós, contras, abordagem híbrida com zonas, e quando usar cada estilo na sua mesa presencial.",
    date: "2026-04-04",
    readingTime: "9 min",
    keywords: [
      "teatro da mente D&D",
      "theater of mind 5e",
      "grid vs theater of mind",
      "combate D&D 5e",
      "zonas de combate D&D",
      "combat style D&D",
    ],
    ogTitle:
      "Teatro da Mente vs Grid — Qual Estilo de Combate? | Pocket DM",
    category: "comparativo",
    image: "/art/blog/heroes/theater-vs-grid.png",
  },
  {
    slug: "build-half-elf-order-cleric-divine-soul-sorcerer",
    title:
      "Build de Suporte Nível 10 — Meio-Elfo Clérigo da Ordem 1 / Feiticeiro de Alma Divina",
    description:
      "Build otimizada de Meio-Elfo (Drow) Clérigo da Ordem 1 / Feiticeiro de Alma Divina nível 10 para D&D 5e. Suporte tier S com Voz de Autoridade e Metamagia. Versão Point Buy e dados rolados.",
    date: "2026-04-04",
    readingTime: "14 min",
    keywords: [
      "build divine soul sorcerer D&D 5e",
      "order cleric divine soul sorcerer",
      "build sorcerer suporte D&D 5e",
      "divine soul sorcerer build",
      "order cleric multiclass",
      "voice of authority D&D 5e",
      "build half-elf sorcerer",
      "ficha pronta sorcerer D&D 5e",
      "point buy sorcerer D&D 5e",
      "build otimizada suporte D&D",
    ],
    ogTitle:
      "Build de Suporte Nível 10 — Clérigo da Ordem / Feiticeiro de Alma Divina | Pocket DM",
    category: "build",
    image: "/art/blog/capa-barsavi-portrait.png",
  },
  {
    slug: "build-half-elf-order-cleric-divine-soul-sorcerer-en",
    title:
      "Half-Elf Order Cleric 1 / Divine Soul Sorcerer — Level 10 Support Build",
    description:
      "Optimized Half-Elf (Drow) Order Cleric 1 / Divine Soul Sorcerer level 10 build for D&D 5e. S-tier support with Voice of Authority and Metamagic. Point Buy and rolled stats versions.",
    date: "2026-04-04",
    readingTime: "14 min",
    keywords: [
      "divine soul sorcerer build D&D 5e",
      "order cleric divine soul sorcerer",
      "support sorcerer build D&D 5e",
      "order cleric multiclass 5e",
      "voice of authority build",
      "half-elf sorcerer build",
      "sorcerer character sheet D&D 5e",
      "point buy sorcerer D&D 5e",
      "optimized support build D&D 5e",
      "cleric sorcerer multiclass",
    ],
    ogTitle:
      "Half-Elf Order Cleric / Divine Soul Sorcerer — Level 10 Build | Pocket DM",
    category: "build",
    image: "/art/blog/capa-barsavi-portrait.png",
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
