import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicFooter } from "@/components/public/PublicFooter";
import { articleLd, breadcrumbList, jsonLdScriptProps } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: "Bestiário D&D 5e Completo — 1.122 Monstros com Stat Blocks",
  description:
    "Guia do bestiário D&D 5e: monstros por CR, por tipo e os icônicos (Tarrasca, Contemplador, Lich, Kraken). 1.122 criaturas do SRD 5.1 + Monster-a-Day com stat blocks completos, grátis.",
  alternates: {
    canonical: "/guias/bestiario-dnd-5e",
    languages: {
      "pt-BR": "/guias/bestiario-dnd-5e",
    },
  },
  openGraph: {
    title: "Bestiário D&D 5e — 1.122 Monstros com Stat Blocks | Pocket DM",
    description:
      "Monstros por CR, por tipo, icônicos. Tarrasca, Contemplador, Lich, Dragões Ancestrais — grátis, SRD 5.1 + Monster-a-Day.",
    type: "article",
    url: "/guias/bestiario-dnd-5e",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bestiário D&D 5e Completo — 1.122 Monstros | Pocket DM",
    description:
      "O guia mais completo do bestiário D&D 5e em português. Monstros por CR, tipo e os icônicos.",
  },
};

export const revalidate = 86400;

const CR_TIERS: { label: string; range: string; examples: { slug: string; name: string }[] }[] = [
  {
    label: "Minions (CR 0 – 1/2)",
    range: "Encontros tier 1, nível 1-3",
    examples: [
      { slug: "goblin", name: "Goblin" },
      { slug: "kobold", name: "Kobold" },
      { slug: "esqueleto", name: "Esqueleto" },
      { slug: "zumbi", name: "Zumbi" },
      { slug: "bandido", name: "Bandido" },
      { slug: "lobo", name: "Lobo" },
    ],
  },
  {
    label: "Low tier (CR 1 – 3)",
    range: "Nível 3-5",
    examples: [
      { slug: "hobgoblin", name: "Hobgoblin" },
      { slug: "orc", name: "Orc" },
      { slug: "gnoll", name: "Gnoll" },
      { slug: "aranha-gigante", name: "Aranha Gigante" },
      { slug: "armadura-animada", name: "Armadura Animada" },
      { slug: "urso-coruja", name: "Urso-Coruja" },
      { slug: "cranio-flamejante", name: "Crânio Flamejante" },
    ],
  },
  {
    label: "Mid tier (CR 4 – 9)",
    range: "Nível 5-10",
    examples: [
      { slug: "troll", name: "Troll" },
      { slug: "gigante-da-colina", name: "Gigante da Colina" },
      { slug: "displacer-besta", name: "Besta Deslocadora" },
      { slug: "dragao-vermelho-jovem", name: "Dragão Vermelho Jovem" },
      { slug: "cubo-gelatinoso", name: "Cubo Gelatinoso" },
      { slug: "manto-sombrio", name: "Manto Sombrio" },
      { slug: "lobisomem", name: "Lobisomem" },
    ],
  },
  {
    label: "High tier (CR 10 – 16)",
    range: "Nível 10-15",
    examples: [
      { slug: "contemplador", name: "Contemplador (Beholder)" },
      { slug: "mente-flayer", name: "Mind Flayer" },
      { slug: "cavaleiro", name: "Cavaleiro" },
      { slug: "harpia", name: "Harpia" },
      { slug: "dragao-vermelho-adulto", name: "Dragão Vermelho Adulto" },
    ],
  },
  {
    label: "Epic (CR 17+)",
    range: "Nível 15-20 (boss fights)",
    examples: [
      { slug: "tarrasca", name: "Tarrasca" },
      { slug: "lich", name: "Lich" },
      { slug: "kraken", name: "Kraken" },
      { slug: "arquimago", name: "Arquimago" },
      { slug: "dragao-vermelho-anciao", name: "Dragão Vermelho Ancião" },
      { slug: "dragao-ouro-anciao", name: "Dragão de Ouro Ancião" },
    ],
  },
];

const ICONIC: { slug: string; name: string; blurb: string }[] = [
  {
    slug: "tarrasca",
    name: "Tarrasca",
    blurb:
      "O monstro mais icônico do D&D. Criatura apocalíptica de CR 30, capaz de devastar cidades inteiras. Uma só na existência — o ideal para sua campanha de fim de mundo.",
  },
  {
    slug: "contemplador",
    name: "Contemplador (Beholder)",
    blurb:
      "Aberração com 10 olhos, cada um lançando uma magia diferente. Obcecado pela própria perfeição, considera todas as outras criaturas abominações.",
  },
  {
    slug: "lich",
    name: "Lich",
    blurb:
      "Um mago que derrotou a morte ligando sua alma a um filactério. Imortal, paciente, e sempre tramando algo em dimensões de magia que seus jogadores não imaginam.",
  },
  {
    slug: "mente-flayer",
    name: "Mind Flayer (Ilítide)",
    blurb:
      "Aberração psiônica do Subterrâneo. Drena cérebros e tem um Império Illitidiano abaixo da superfície. Inimigo clássico de campanhas cerebrais (trocadilho intencional).",
  },
  {
    slug: "kraken",
    name: "Kraken",
    blurb:
      "Uma das cinco criaturas ancestrais dos oceanos. Lendária, CR 23, ataques de tentáculo e raio. Perfeita para campanhas marítimas.",
  },
  {
    slug: "dragao-vermelho-anciao",
    name: "Dragão Vermelho Ancião",
    blurb:
      "O rei dos dragões cromáticos. Ganancioso, arrogante, e dono de um bafo de fogo capaz de torrar uma party em uma única ação.",
  },
];

const TYPES: { anchor: string; label: string; desc: string; examples: { slug: string; name: string }[] }[] = [
  {
    anchor: "dragoes",
    label: "Dragões",
    desc: "De filhotes a anciãos, cromáticos (malignos) ou metálicos (benignos). Os dragões são icônicos do D&D desde a 1ª edição.",
    examples: [
      { slug: "dragao-vermelho-anciao", name: "Dragão Vermelho Ancião" },
      { slug: "dragao-ouro-anciao", name: "Dragão de Ouro Ancião" },
      { slug: "dragao-azul-adulto", name: "Dragão Azul Adulto" },
      { slug: "dragao-verde-adulto", name: "Dragão Verde Adulto" },
      { slug: "dragao-vermelho-jovem", name: "Dragão Vermelho Jovem" },
      { slug: "filhote-dragao-vermelho", name: "Filhote de Dragão Vermelho" },
    ],
  },
  {
    anchor: "mortos-vivos",
    label: "Mortos-vivos",
    desc: "Esqueletos para encontros iniciais, liches para finais de campanha. Vulneráveis a radiante, imunes a veneno e mental.",
    examples: [
      { slug: "esqueleto", name: "Esqueleto" },
      { slug: "zumbi", name: "Zumbi" },
      { slug: "vampiro", name: "Vampiro" },
      { slug: "lich", name: "Lich" },
      { slug: "fantasma", name: "Fantasma" },
      { slug: "banshee", name: "Banshee" },
      { slug: "aparicao", name: "Aparição" },
      { slug: "espectro-negro", name: "Espectro Negro" },
    ],
  },
  {
    anchor: "humanoides",
    label: "Humanóides",
    desc: "Inimigos versáteis: goblins, orcs, hobgoblins. Servem para qualquer nível e qualquer tipo de campanha política ou militar.",
    examples: [
      { slug: "goblin", name: "Goblin" },
      { slug: "hobgoblin", name: "Hobgoblin" },
      { slug: "orc", name: "Orc" },
      { slug: "gnoll", name: "Gnoll" },
      { slug: "kobold", name: "Kobold" },
      { slug: "bandido", name: "Bandido" },
      { slug: "cavaleiro", name: "Cavaleiro" },
      { slug: "arquimago", name: "Arquimago" },
    ],
  },
  {
    anchor: "aberracoes",
    label: "Aberrações",
    desc: "Contempladores, mind flayers — criaturas de outros planos que desafiam a lógica dos elementos. Ótimas para horror cósmico.",
    examples: [
      { slug: "contemplador", name: "Contemplador" },
      { slug: "mente-flayer", name: "Mind Flayer" },
      { slug: "kraken", name: "Kraken" },
      { slug: "cubo-gelatinoso", name: "Cubo Gelatinoso" },
    ],
  },
  {
    anchor: "bestas",
    label: "Bestas & Monstruosidades",
    desc: "Aranhas gigantes, ursos-coruja, bestas deslocadoras. Encontros aleatórios em florestas e cavernas.",
    examples: [
      { slug: "lobo", name: "Lobo" },
      { slug: "aranha-gigante", name: "Aranha Gigante" },
      { slug: "urso-coruja", name: "Urso-Coruja" },
      { slug: "displacer-besta", name: "Besta Deslocadora" },
      { slug: "harpia", name: "Harpia" },
      { slug: "bestia-da-ferrugem", name: "Besta da Ferrugem" },
    ],
  },
];

function BestiarioJsonLd() {
  const article = articleLd({
    name: "Bestiário D&D 5e Completo — 1.122 Monstros com Stat Blocks",
    description:
      "Guia do bestiário D&D 5e: monstros por CR, por tipo e os icônicos (Tarrasca, Contemplador, Lich, Kraken). 1.122 criaturas do SRD 5.1 + Monster-a-Day com stat blocks completos, grátis.",
    path: "/guias/bestiario-dnd-5e",
    imagePath: "/opengraph-image",
    locale: "pt-BR",
  });
  const crumbs = breadcrumbList([
    { name: "Início", path: "/" },
    { name: "Guias", path: "/guias/bestiario-dnd-5e" },
    { name: "Bestiário D&D 5e", path: "/guias/bestiario-dnd-5e" },
  ]);
  return (
    <>
      <script {...jsonLdScriptProps(article)} />
      <script {...jsonLdScriptProps(crumbs)} />
    </>
  );
}

export default function BestiarioHubPage() {
  return (
    <div className="min-h-screen bg-background">
      <BestiarioJsonLd />
      <PublicNav locale="pt-BR" breadcrumbs={[{ label: "Bestiário D&D 5e" }]} />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-widest text-gold/70 mb-3">Guia · Bestiário</p>
          <h1 className="font-[family-name:var(--font-cinzel)] text-3xl sm:text-4xl text-gold leading-tight mb-4">
            Bestiário D&D 5e Completo — 1.122 Monstros com Stat Blocks
          </h1>
          <p className="text-gray-300 text-base leading-relaxed">
            O bestiário de Dungeons & Dragons 5ª Edição é o coração de qualquer campanha. Se você é mestre procurando o
            monstro certo para o próximo combate, ou jogador curioso sobre a ecologia de um dragão ancião, este guia
            organiza as <strong className="text-gold">1.122 criaturas disponíveis no Pocket DM</strong> por CR,
            por tipo, e destaca os ícones que todo mestre deveria conhecer. Tudo em português, com stat blocks
            interativos, rolador de dados e tokens — de graça, sem cadastro.
          </p>
        </header>

        {/* What's the SRD 5.1 */}
        <section className="mb-12">
          <h2 className="font-[family-name:var(--font-cinzel)] text-2xl text-gold mb-4">
            O que é o bestiário do SRD 5.1
          </h2>
          <p className="text-gray-300 leading-relaxed mb-3">
            O <strong>SRD 5.1</strong> (Systems Reference Document) é a versão aberta das regras de D&D 5e, liberada
            pela Wizards of the Coast sob a licença Creative Commons CC-BY-4.0. Isso significa que qualquer pessoa pode
            usar, traduzir e distribuir os monstros, magias e regras do SRD — inclusive nós. É por isso que o{" "}
            <Link href="/monstros" className="text-gold underline underline-offset-2 hover:text-gold/70">
              Compêndio de Monstros
            </Link>{" "}
            do Pocket DM é 100% gratuito e vive online pra sempre.
          </p>
          <p className="text-gray-300 leading-relaxed">
            Além das <strong>419 criaturas do SRD 5.1 (2014)</strong> e das{" "}
            <strong>346 criaturas do SRD 5.1 (2024)</strong>, incluímos as <strong>357 criaturas do Monster-a-Day</strong>{" "}
            (parceria com o subreddit r/monsteraday) — também em CC. Total: 1.122 criaturas, todas com descrição
            completa, ataques, ações lendárias quando aplicável, e traduções revisadas em PT-BR.
          </p>
        </section>

        {/* CR Tiers */}
        <section className="mb-12">
          <h2 className="font-[family-name:var(--font-cinzel)] text-2xl text-gold mb-2">
            Monstros por Challenge Rating (CR)
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Uma das dúvidas mais comuns de mestres novos: <em>qual CR usar pra meu grupo?</em> Aqui vai o atalho — e se
            quiser afinar o balanceamento depois do combate, vale dar uma olhada no{" "}
            <Link href="/calculadora-encontro" className="text-gold underline underline-offset-2 hover:text-gold/70">
              calculadora de encontros
            </Link>{" "}
            baseada em dados de combates reais.
          </p>
          <div className="space-y-5">
            {CR_TIERS.map((tier) => (
              <div
                key={tier.label}
                className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5"
              >
                <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
                  <h3 className="text-lg text-gray-100 font-semibold">{tier.label}</h3>
                  <span className="text-xs text-gray-500">{tier.range}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {tier.examples.map((m) => (
                    <Link
                      key={m.slug}
                      href={`/monstros/${m.slug}`}
                      className="text-sm rounded-md px-2.5 py-1 bg-gold/[0.06] border border-gold/15 text-gold hover:bg-gold/15 hover:border-gold/30 transition-colors"
                    >
                      {m.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Por tipo */}
        <section className="mb-12">
          <h2 className="font-[family-name:var(--font-cinzel)] text-2xl text-gold mb-2">
            Monstros por tipo
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Cada tipo de criatura tem comportamento, imunidades e sinergia com magias diferentes. Escolher pelo tipo é
            útil quando você já tem a estética do encontro em mente — uma tumba exige mortos-vivos, uma floresta
            antiga pede bestas e feéricos.
          </p>
          <div className="space-y-4">
            {TYPES.map((t) => (
              <div key={t.anchor} id={t.anchor} className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5">
                <h3 className="text-lg text-gray-100 font-semibold mb-2">{t.label}</h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-3">{t.desc}</p>
                <div className="flex flex-wrap gap-2">
                  {t.examples.map((m) => (
                    <Link
                      key={m.slug}
                      href={`/monstros/${m.slug}`}
                      className="text-sm rounded-md px-2.5 py-1 bg-white/[0.04] border border-white/[0.08] text-gray-200 hover:bg-white/[0.08] hover:border-white/[0.16] transition-colors"
                    >
                      {m.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Iconic */}
        <section className="mb-12">
          <h2 className="font-[family-name:var(--font-cinzel)] text-2xl text-gold mb-2">
            Os 6 monstros mais icônicos do D&D
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Se um dia você quiser fazer o jogador lembrar da campanha pra sempre, coloca uma dessas criaturas na mesa.
            Não precisa matar ninguém — só a aparição já basta.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {ICONIC.map((m) => (
              <Link
                key={m.slug}
                href={`/monstros/${m.slug}`}
                className="group rounded-xl border border-gold/15 bg-gradient-to-br from-gold/[0.04] to-transparent p-5 hover:border-gold/40 hover:-translate-y-0.5 transition-all"
              >
                <h3 className="text-lg text-gold mb-2 group-hover:text-gold/90">{m.name}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{m.blurb}</p>
                <p className="text-xs text-gold/60 mt-3">Ver stat block completo →</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Como usar no Pocket DM */}
        <section className="mb-12">
          <h2 className="font-[family-name:var(--font-cinzel)] text-2xl text-gold mb-3">
            Como usar o bestiário no Pocket DM
          </h2>
          <p className="text-gray-300 leading-relaxed mb-3">
            O Pocket DM foi desenhado pra tirar o maior atrito do combate: <strong>rolar ataques e salvamentos</strong>.
            Quando você coloca um monstro no combat tracker, todas as ações viram botões clicáveis. Um clique =
            rolagem automática com modificador certo. Dano, salvamento, crítico — tudo lá.
          </p>
          <p className="text-gray-300 leading-relaxed mb-3">
            Se você nunca usou um tracker antes, o tutorial é rápido:{" "}
            <Link href="/blog/como-usar-combat-tracker-dnd-5e" className="text-gold underline underline-offset-2 hover:text-gold/70">
              Como usar um combat tracker em D&D 5e
            </Link>
            . E se está montando o próximo encontro, dá uma olhada no guia de{" "}
            <Link href="/blog/guia-challenge-rating-dnd-5e" className="text-gold underline underline-offset-2 hover:text-gold/70">
              Challenge Rating (CR)
            </Link>
            .
          </p>
          <p className="text-gray-300 leading-relaxed">
            Pra quem quer ir direto ao ponto, o Pocket DM também tem:{" "}
            <Link href="/magias" className="text-gold underline underline-offset-2 hover:text-gold/70">
              lista de magias
            </Link>
            ,{" "}
            <Link href="/itens" className="text-gold underline underline-offset-2 hover:text-gold/70">
              itens mágicos
            </Link>
            ,{" "}
            <Link href="/condicoes" className="text-gold underline underline-offset-2 hover:text-gold/70">
              condições
            </Link>
            ,{" "}
            <Link href="/antecedentes" className="text-gold underline underline-offset-2 hover:text-gold/70">
              antecedentes
            </Link>
            ,{" "}
            <Link href="/racas" className="text-gold underline underline-offset-2 hover:text-gold/70">
              raças
            </Link>{" "}
            e{" "}
            <Link href="/classes-pt" className="text-gold underline underline-offset-2 hover:text-gold/70">
              classes
            </Link>
            . Tudo em português, livre, sob CC-BY-4.0.
          </p>
        </section>

        {/* CTA */}
        <section className="mb-12">
          <div className="rounded-xl bg-gradient-to-r from-gold/[0.08] to-gray-800/40 border border-gold/15 px-6 py-8 sm:flex sm:items-center sm:justify-between gap-4">
            <div className="mb-4 sm:mb-0">
              <p className="text-gray-100 font-semibold text-lg leading-snug">
                Pronto pra rodar o primeiro combate?
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Combat Tracker grátis · D&D 5e · sem cadastro
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link
                href="/monstros"
                className="rounded-lg border border-gold/30 bg-gold/[0.08] px-5 py-2.5 text-gold font-semibold text-sm hover:bg-gold/15 transition-colors"
              >
                Abrir Compêndio
              </Link>
              <Link
                href="/try"
                className="rounded-lg bg-gold px-5 py-2.5 text-gray-950 font-semibold text-sm hover:bg-gold/90 transition-colors"
              >
                Iniciar Combate →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
