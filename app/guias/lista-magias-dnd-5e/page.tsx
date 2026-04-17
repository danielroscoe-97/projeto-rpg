import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicFooter } from "@/components/public/PublicFooter";
import { articleLd, breadcrumbList, jsonLdScriptProps } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: "Lista de Magias D&D 5e — Grimório Completo por Classe e Nível",
  description:
    "Guia do grimório D&D 5e: magias por nível (truques a nível 9), por classe (Mago, Clérigo, Druida, Bardo, Paladino, Feiticeiro, Bruxo, Patrulheiro) e as icônicas — Fireball, Wish, Counterspell, Misty Step.",
  alternates: {
    canonical: "/guias/lista-magias-dnd-5e",
    languages: {
      "pt-BR": "/guias/lista-magias-dnd-5e",
    },
  },
  openGraph: {
    title: "Lista de Magias D&D 5e — Grimório Completo | Pocket DM",
    description:
      "Magias por classe e nível. Fireball, Wish, Cure Wounds, Misty Step, Counterspell — grátis, em PT-BR.",
    type: "article",
    url: "/guias/lista-magias-dnd-5e",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lista de Magias D&D 5e — Grimório Completo | Pocket DM",
    description:
      "Magias por classe e nível em D&D 5e. Em português, grátis, com descrições completas.",
  },
};

export const revalidate = 86400;

const BY_LEVEL: { level: string; label: string; blurb: string; examples: { slug: string; name: string }[] }[] = [
  {
    level: "0",
    label: "Truques (Cantrips)",
    blurb: "Magias ilimitadas, sem consumir espaço. O pão-com-manteiga de qualquer conjurador — dano a cada rodada sem fim.",
    examples: [
      { slug: "flecha-de-fogo", name: "Fire Bolt" },
      { slug: "explosao-sobrenatural", name: "Eldritch Blast" },
      { slug: "chama-sagrada", name: "Sacred Flame" },
      { slug: "toque-glacial", name: "Chill Touch" },
      { slug: "orientacao", name: "Guidance" },
      { slug: "mao-magica", name: "Mage Hand" },
    ],
  },
  {
    level: "1",
    label: "Nível 1",
    blurb: "Primeiras magias reais. Cada espaço conta — use com sabedoria.",
    examples: [
      { slug: "missil-magico", name: "Magic Missile" },
      { slug: "escudo", name: "Shield" },
      { slug: "curar-ferimentos", name: "Cure Wounds" },
      { slug: "palavra-de-cura", name: "Healing Word" },
      { slug: "maos-em-chamas", name: "Burning Hands" },
      { slug: "onda-trovejante", name: "Thunderwave" },
      { slug: "sono", name: "Sleep" },
      { slug: "abençoar", name: "Bless" },
      { slug: "detectar-magia", name: "Detect Magic" },
      { slug: "nuvem-de-nevoa", name: "Fog Cloud" },
    ],
  },
  {
    level: "2",
    label: "Nível 2",
    blurb: "Mudança de jogo. Misty Step e Invisibility começam a definir estilo.",
    examples: [
      { slug: "passo-nebuloso", name: "Misty Step" },
      { slug: "invisibilidade", name: "Invisibility" },
      { slug: "paralisar-pessoa", name: "Hold Person" },
      { slug: "borrao", name: "Blur" },
      { slug: "teia", name: "Web" },
      { slug: "oracao-de-cura", name: "Prayer of Healing" },
    ],
  },
  {
    level: "3",
    label: "Nível 3",
    blurb: "O tier clássico das grandes magias: Fireball, Counterspell, Haste.",
    examples: [
      { slug: "bola-de-fogo", name: "Fireball" },
      { slug: "contra-magia", name: "Counterspell" },
      { slug: "aceleracao", name: "Haste" },
      { slug: "raio", name: "Lightning Bolt" },
      { slug: "dissipar-magia", name: "Dispel Magic" },
      { slug: "animar-mortos", name: "Animate Dead" },
      { slug: "voar", name: "Fly" },
      { slug: "padrao-hipnotico", name: "Hypnotic Pattern" },
      { slug: "reviver", name: "Revivify" },
    ],
  },
  {
    level: "4",
    label: "Nível 4",
    blurb: "Controle de campo. Polymorph transforma o combate inteiro.",
    examples: [
      { slug: "polimorfar", name: "Polymorph" },
      { slug: "banimento", name: "Banishment" },
    ],
  },
  {
    level: "5",
    label: "Nível 5",
    blurb: "Alto nível de conjuração. Magias de dano massivo e controle fino.",
    examples: [
      { slug: "mata-nuvem", name: "Cloudkill" },
      { slug: "dominar-pessoa", name: "Dominate Person" },
    ],
  },
  {
    level: "6-9",
    label: "Níveis 6 a 9",
    blurb: "O reino dos magos lendários. Teleportation, Meteor Swarm, Wish — magias que mudam o mundo.",
    examples: [
      { slug: "teletransportar", name: "Teleport" },
      { slug: "chuva-de-meteoros", name: "Meteor Swarm" },
      { slug: "palavra-de-poder-matar", name: "Power Word Kill" },
      { slug: "desejo", name: "Wish" },
    ],
  },
];

const ICONIC: { slug: string; name: string; level: string; blurb: string }[] = [
  {
    slug: "desejo",
    name: "Wish (Desejo)",
    level: "Nível 9",
    blurb:
      "A magia mais poderosa do jogo. Replica qualquer magia de até 8º nível sem componentes — ou altera a realidade dentro de limites específicos. Risco: efeitos não-padronizados podem te impedir de lançar Wish de novo.",
  },
  {
    slug: "bola-de-fogo",
    name: "Fireball",
    level: "Nível 3",
    blurb:
      "O clássico dos clássicos. 8d6 de fogo em um cubo de 6m — e as regras foram escritas pra essa magia específica (daí ela ser tão bem balanceada no tier dela). Se você é mago, cleriga-feiticeira ou bruxo, você quer Fireball.",
  },
  {
    slug: "curar-ferimentos",
    name: "Cure Wounds",
    level: "Nível 1",
    blurb:
      "A magia de cura mais básica do 5e. 1d8 + mod de conjuração, contato. Não é a mais eficiente (Healing Word é melhor em emergência), mas é a que todo mundo sabe lançar.",
  },
  {
    slug: "passo-nebuloso",
    name: "Misty Step",
    level: "Nível 2",
    blurb:
      "Ação bônus, teletransporta 9 metros. Uma das magias mais buscadas do 5e. Tira você de cair de precipício, escapa de grapple, se reposiciona pro próximo turno. Mago de 5 anos ainda usa Misty Step.",
  },
  {
    slug: "contra-magia",
    name: "Counterspell",
    level: "Nível 3",
    blurb:
      "A magia que define a diplomacia mágica entre grupos de conjuradores. Reação pra cancelar outra magia sendo lançada. Regra de ouro: sempre mantém um espaço de 3+ reservado.",
  },
  {
    slug: "escudo",
    name: "Shield",
    level: "Nível 1",
    blurb:
      "Reação, +5 CA até o início do seu próximo turno. A magia mais usada em qualquer build de Mago. Você vê o ataque vindo, você lança Shield, o ataque erra.",
  },
];

const BY_CLASS: { slug: string; name: string; color: string; top: { slug: string; name: string }[] }[] = [
  {
    slug: "wizard",
    name: "Mago (Wizard)",
    color: "text-blue-400",
    top: [
      { slug: "escudo", name: "Shield" },
      { slug: "missil-magico", name: "Magic Missile" },
      { slug: "bola-de-fogo", name: "Fireball" },
      { slug: "contra-magia", name: "Counterspell" },
      { slug: "aceleracao", name: "Haste" },
      { slug: "polimorfar", name: "Polymorph" },
      { slug: "desejo", name: "Wish" },
    ],
  },
  {
    slug: "cleric",
    name: "Clérigo (Cleric)",
    color: "text-amber-400",
    top: [
      { slug: "abençoar", name: "Bless" },
      { slug: "palavra-de-cura", name: "Healing Word" },
      { slug: "curar-ferimentos", name: "Cure Wounds" },
      { slug: "chama-sagrada", name: "Sacred Flame" },
      { slug: "oracao-de-cura", name: "Prayer of Healing" },
      { slug: "reviver", name: "Revivify" },
    ],
  },
  {
    slug: "druid",
    name: "Druida (Druid)",
    color: "text-emerald-400",
    top: [
      { slug: "orientacao", name: "Guidance" },
      { slug: "curar-ferimentos", name: "Cure Wounds" },
      { slug: "teia", name: "Web" },
      { slug: "polimorfar", name: "Polymorph" },
    ],
  },
  {
    slug: "bard",
    name: "Bardo (Bard)",
    color: "text-rose-400",
    top: [
      { slug: "padrao-hipnotico", name: "Hypnotic Pattern" },
      { slug: "contra-magia", name: "Counterspell" },
      { slug: "palavra-de-cura", name: "Healing Word" },
      { slug: "desejo", name: "Wish" },
    ],
  },
  {
    slug: "sorcerer",
    name: "Feiticeiro (Sorcerer)",
    color: "text-purple-400",
    top: [
      { slug: "flecha-de-fogo", name: "Fire Bolt" },
      { slug: "escudo", name: "Shield" },
      { slug: "bola-de-fogo", name: "Fireball" },
      { slug: "aceleracao", name: "Haste" },
      { slug: "polimorfar", name: "Polymorph" },
    ],
  },
  {
    slug: "warlock",
    name: "Bruxo (Warlock)",
    color: "text-violet-400",
    top: [
      { slug: "explosao-sobrenatural", name: "Eldritch Blast" },
      { slug: "passo-nebuloso", name: "Misty Step" },
      { slug: "banimento", name: "Banishment" },
    ],
  },
  {
    slug: "paladin",
    name: "Paladino (Paladin)",
    color: "text-yellow-300",
    top: [
      { slug: "abençoar", name: "Bless" },
      { slug: "curar-ferimentos", name: "Cure Wounds" },
    ],
  },
  {
    slug: "ranger",
    name: "Patrulheiro (Ranger)",
    color: "text-green-300",
    top: [
      { slug: "curar-ferimentos", name: "Cure Wounds" },
      { slug: "nuvem-de-nevoa", name: "Fog Cloud" },
    ],
  },
];

function MagiasJsonLd() {
  const article = articleLd({
    name: "Lista de Magias D&D 5e — Grimório Completo por Classe e Nível",
    description:
      "Guia do grimório D&D 5e: magias por nível, por classe e as icônicas — Fireball, Wish, Counterspell, Misty Step.",
    path: "/guias/lista-magias-dnd-5e",
    imagePath: "/opengraph-image",
    locale: "pt-BR",
  });
  const crumbs = breadcrumbList([
    { name: "Início", path: "/" },
    { name: "Guias", path: "/guias/lista-magias-dnd-5e" },
    { name: "Lista de Magias D&D 5e", path: "/guias/lista-magias-dnd-5e" },
  ]);
  return (
    <>
      <script {...jsonLdScriptProps(article)} />
      <script {...jsonLdScriptProps(crumbs)} />
    </>
  );
}

export default function MagiasHubPage() {
  return (
    <div className="min-h-screen bg-background">
      <MagiasJsonLd />
      <PublicNav locale="pt-BR" breadcrumbs={[{ label: "Lista de Magias D&D 5e" }]} />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-widest text-gold/70 mb-3">Guia · Grimório</p>
          <h1 className="font-[family-name:var(--font-cinzel)] text-3xl sm:text-4xl text-gold leading-tight mb-4">
            Lista de Magias D&D 5e — Grimório Completo por Classe e Nível
          </h1>
          <p className="text-gray-300 text-base leading-relaxed">
            Mais de 600 magias do D&D 5ª Edição, organizadas por <strong>nível</strong> (de truques a Wish), por{" "}
            <strong>classe conjuradora</strong> (Mago, Clérigo, Druida, Bardo, Paladino, Feiticeiro, Bruxo,
            Patrulheiro) e pelas <strong>magias icônicas</strong> que todo jogador deveria conhecer. Tudo em português,
            com descrições completas, componentes, duração, concentração — do SRD 5.1, grátis.
          </p>
        </header>

        {/* What is magic */}
        <section className="mb-12">
          <h2 className="font-[family-name:var(--font-cinzel)] text-2xl text-gold mb-4">
            Como funciona magia no D&D 5e
          </h2>
          <p className="text-gray-300 leading-relaxed mb-3">
            O sistema de magia do D&D 5e é baseado em <strong>espaços de magia (spell slots)</strong>: você tem X
            espaços por nível e pode gastar um espaço maior pra lançar uma magia menor com efeito ampliado. Truques
            (nível 0) não consomem espaço — são ilimitados.
          </p>
          <p className="text-gray-300 leading-relaxed mb-3">
            Cada magia tem <strong>componentes</strong> (verbal, somático, material), <strong>alcance</strong>,{" "}
            <strong>duração</strong> e pode exigir <strong>concentração</strong> (máximo uma magia de concentração por
            vez — levou dano? Teste de Constituição pra não perder a magia).
          </p>
          <p className="text-gray-300 leading-relaxed">
            As magias são divididas em <strong>8 escolas de magia</strong>: Abjuração (defesa), Conjuração
            (criação/teleporte), Adivinhação (informação), Encantamento (mente), Evocação (dano elemental), Ilusão
            (engano), Necromancia (morte/não-vida), Transmutação (mudança de matéria). Se você joga mago de Escola, essa
            distinção define seu estilo.
          </p>
        </section>

        {/* Por nível */}
        <section className="mb-12">
          <h2 className="font-[family-name:var(--font-cinzel)] text-2xl text-gold mb-2">Magias por nível</h2>
          <p className="text-gray-400 text-sm mb-6">
            Cada nível tem seu ícone — as magias que todo mundo decora. Aqui vão as 30+ mais importantes de cada tier.
          </p>
          <div className="space-y-5">
            {BY_LEVEL.map((lv) => (
              <div key={lv.level} className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5">
                <div className="flex items-baseline gap-3 mb-2 flex-wrap">
                  <h3 className="text-lg text-gray-100 font-semibold">{lv.label}</h3>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed mb-3">{lv.blurb}</p>
                <div className="flex flex-wrap gap-2">
                  {lv.examples.map((s) => (
                    <Link
                      key={s.slug}
                      href={`/magias/${s.slug}`}
                      className="text-sm rounded-md px-2.5 py-1 bg-gold/[0.06] border border-gold/15 text-gold hover:bg-gold/15 hover:border-gold/30 transition-colors"
                    >
                      {s.name}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Por classe */}
        <section className="mb-12">
          <h2 className="font-[family-name:var(--font-cinzel)] text-2xl text-gold mb-2">Magias por classe</h2>
          <p className="text-gray-400 text-sm mb-6">
            Cada classe conjuradora tem uma lista de magias distinta — algumas se sobrepõem (Cure Wounds é de 4
            classes), outras são únicas. Veja as mais icônicas de cada classe.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {BY_CLASS.map((c) => (
              <div key={c.slug} className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5">
                <h3 className={`text-lg font-semibold mb-3 ${c.color}`}>
                  <Link href={`/classes-pt/${c.slug}`} className="hover:underline">
                    {c.name}
                  </Link>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {c.top.map((s) => (
                    <Link
                      key={s.slug}
                      href={`/magias/${s.slug}`}
                      className="text-sm rounded-md px-2.5 py-1 bg-white/[0.04] border border-white/[0.08] text-gray-200 hover:bg-white/[0.08] hover:border-white/[0.16] transition-colors"
                    >
                      {s.name}
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
            As 6 magias mais icônicas do D&D 5e
          </h2>
          <p className="text-gray-400 text-sm mb-6">
            Se você só precisa decorar seis magias do grimório inteiro, são essas. Cada uma tem história, contexto de
            uso e faz parte da cultura do D&D.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {ICONIC.map((s) => (
              <Link
                key={s.slug}
                href={`/magias/${s.slug}`}
                className="group rounded-xl border border-gold/15 bg-gradient-to-br from-gold/[0.04] to-transparent p-5 hover:border-gold/40 hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-baseline justify-between mb-2 flex-wrap gap-1">
                  <h3 className="text-lg text-gold group-hover:text-gold/90">{s.name}</h3>
                  <span className="text-xs text-gold/60">{s.level}</span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{s.blurb}</p>
                <p className="text-xs text-gold/60 mt-3">Ver detalhes completos →</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Como usar no tracker */}
        <section className="mb-12">
          <h2 className="font-[family-name:var(--font-cinzel)] text-2xl text-gold mb-3">
            Usando magias no Pocket DM
          </h2>
          <p className="text-gray-300 leading-relaxed mb-3">
            O Pocket DM tem um <strong>oráculo de magias</strong> integrado ao combat tracker. Durante o combate, você
            pode pesquisar qualquer magia (em português ou inglês), ver componentes, duração, alcance e texto completo
            sem sair do jogo. Isso elimina o maior atrito da conjuração: parar de jogar pra abrir o PHB.
          </p>
          <p className="text-gray-300 leading-relaxed mb-3">
            Se você é mestre, confira também nossa{" "}
            <Link href="/methodology/spell-tiers" className="text-gold underline underline-offset-2 hover:text-gold/70">
              metodologia de spell tiers
            </Link>{" "}
            — rankeamos as magias por força real (baseado em dados de combate), não pela opinião do autor do PHB.
          </p>
          <p className="text-gray-300 leading-relaxed">
            Mais guias:{" "}
            <Link href="/guias/bestiario-dnd-5e" className="text-gold underline underline-offset-2 hover:text-gold/70">
              Bestiário D&D 5e
            </Link>
            ,{" "}
            <Link href="/monstros" className="text-gold underline underline-offset-2 hover:text-gold/70">
              Compêndio de Monstros
            </Link>
            ,{" "}
            <Link href="/condicoes" className="text-gold underline underline-offset-2 hover:text-gold/70">
              Condições
            </Link>
            ,{" "}
            <Link href="/itens" className="text-gold underline underline-offset-2 hover:text-gold/70">
              Itens Mágicos
            </Link>
            ,{" "}
            <Link href="/talentos" className="text-gold underline underline-offset-2 hover:text-gold/70">
              Talentos
            </Link>
            ,{" "}
            <Link href="/classes-pt" className="text-gold underline underline-offset-2 hover:text-gold/70">
              Classes
            </Link>
            ,{" "}
            <Link href="/racas" className="text-gold underline underline-offset-2 hover:text-gold/70">
              Raças
            </Link>
            ,{" "}
            <Link href="/atributos" className="text-gold underline underline-offset-2 hover:text-gold/70">
              Atributos
            </Link>
            .
          </p>
        </section>

        {/* CTA */}
        <section className="mb-12">
          <div className="rounded-xl bg-gradient-to-r from-gold/[0.08] to-gray-800/40 border border-gold/15 px-6 py-8 sm:flex sm:items-center sm:justify-between gap-4">
            <div className="mb-4 sm:mb-0">
              <p className="text-gray-100 font-semibold text-lg leading-snug">
                Abrir o grimório no Pocket DM
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Combat tracker grátis com oráculo de magias integrado · D&D 5e
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Link
                href="/magias"
                className="rounded-lg border border-gold/30 bg-gold/[0.08] px-5 py-2.5 text-gold font-semibold text-sm hover:bg-gold/15 transition-colors"
              >
                Ver Compêndio
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
