import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicRulesReference } from "@/components/public/PublicRulesReference";
import { PublicCTA } from "@/components/public/PublicCTA";
import Link from "next/link";

// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Regras D&D 5e — Combate, Descanso, Conjuração",
  description:
    "Referência completa de regras D&D 5e: fluxo de combate, jogadas de ataque, dano & cura, cobertura, descanso, condições e básico de conjuração. Conteúdo gratuito do SRD 5.1.",
  openGraph: {
    title: "Regras D&D 5e — Combate, Descanso, Conjuração",
    description:
      "Referência completa de regras D&D 5e com diagramas visuais, rastreador de testes contra a morte interativo e guia de cobertura. Conteúdo gratuito do SRD 5.1.",
    type: "website",
    url: "https://www.pocketdm.com.br/regras",
  },
  twitter: {
    card: "summary_large_image",
    title: "Regras D&D 5e — Combate, Descanso, Conjuração",
    description:
      "Referência completa de regras D&D 5e com diagramas visuais e ferramentas interativas. Conteúdo gratuito do SRD 5.1.",
  },
  alternates: {
    canonical: "https://www.pocketdm.com.br/regras",
    languages: {
      en: "https://www.pocketdm.com.br/rules",
      "pt-BR": "https://www.pocketdm.com.br/regras",
    },
  },
};

export const revalidate = 86400;

// ── JSON-LD (FAQPage schema for rich snippets) ────────────────────
function RulesJsonLd() {
  const faqs = [
    {
      q: "Como funciona o fluxo de combate no D&D 5e?",
      a: "No início do combate, cada participante faz um teste de Destreza (iniciativa) para determinar a ordem dos turnos. No seu turno, você pode mover até sua velocidade, realizar uma ação (Atacar, Conjurar uma Magia, Disparada, Esquivar, Desengajar, Ajudar, Esconder-se, Preparar, Procurar ou Usar um Objeto), uma ação bônus se disponível, e uma interação com objetos gratuita. Você também tem uma reação por rodada.",
    },
    {
      q: "Como funcionam as jogadas de ataque no D&D 5e?",
      a: "Jogue um d20, adicione seu modificador de habilidade e bônus de proficiência. Se o total for igual ou superior à Classe de Armadura (CA) do alvo, o ataque acerta. Um 20 natural é um acerto crítico (dobra os dados de dano), e um 1 natural é uma falha automática.",
    },
    {
      q: "Como funcionam os testes contra a morte no D&D 5e?",
      a: "Quando você cai a 0 PV, jogue um d20 no início de cada turno sem modificadores. 10 ou mais é um sucesso, 9 ou menos é uma falha. Três sucessos estabilizam você, três falhas significam morte. Um 20 natural significa que você recupera 1 PV. Um 1 natural conta como duas falhas. Morte instantânea ocorre se o dano restante for igual ou superior ao máximo de PV.",
    },
    {
      q: "Quais tipos de cobertura existem no D&D 5e?",
      a: "Meia cobertura fornece +2 à CA e testes de DEX (muro baixo, mobília, outra criatura). Três quartos de cobertura fornece +5 à CA e testes de DEX (portcullis, seteira). Cobertura total significa que você não pode ser alvo direto de ataques ou magias.",
    },
    {
      q: "Qual a diferença entre descanso curto e descanso longo no D&D 5e?",
      a: "Um descanso curto dura 1 ou mais horas onde você pode gastar Dados de Vida para recuperar PV (jogue dado + modificador de CON por dado gasto). Um descanso longo dura 8 ou mais horas (6 de sono + 2 de atividade leve) onde você recupera todos os PV, recupera Dados de Vida gastos (até metade do total) e restaura espaços de magia. Você só pode se beneficiar de um descanso longo por 24 horas.",
    },
    {
      q: "Como funciona a concentração em magias no D&D 5e?",
      a: "Você só pode se concentrar em uma magia por vez. Quando toma dano enquanto concentrado, faça um teste de CON (CD é 10 ou metade do dano, o que for maior). Falha significa que a magia termina. Ser incapacitado ou morto também encerra a concentração.",
    },
    {
      q: "O que são componentes de magia no D&D 5e?",
      a: "Magias podem requerer componentes Verbais (V) (falar palavras), Somáticos (S) (gestos com uma mão livre), ou Materiais (M) (itens específicos, que podem ser substituídos por um foco arcano ou bolsa de componentes).",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name: "Regras D&D 5e",
    description:
      "Referência completa de regras de Dungeons & Dragons 5ª Edição, cobrindo combate, ataques, dano, cobertura, descanso, condições e conjuração.",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      url: "https://www.pocketdm.com.br",
    },
    inLanguage: "pt-BR",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ── Page ───────────────────────────────────────────────────────────
export default function RegrasPage() {
  return (
    <>
      <RulesJsonLd />

      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900">
        <PublicNav
          locale="pt-BR"
          breadcrumbs={[{ label: "Regras" }]}
        />

        <main className="mx-auto max-w-5xl px-4 py-8">
          {/* Language toggle */}
          <p className="text-xs text-gray-500 mb-4">
            Página disponível em{" "}
            <Link
              href="/rules"
              className="text-[#D4A853] hover:underline"
            >
              English
            </Link>
          </p>

          <PublicRulesReference locale="pt-BR" />

          <div className="mt-12">
            <PublicCTA entityName="Regras D&D 5e" locale="pt-BR" />
          </div>
        </main>

        <footer className="border-t border-gray-800 mt-16 py-8 text-center text-gray-500 text-xs">
          <p>
            Conteúdo SRD utilizado sob{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              className="underline hover:text-gray-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              Creative Commons Attribution 4.0
            </a>
            . D&amp;D e Dungeons &amp; Dragons são marcas registradas da Wizards
            of the Coast.
          </p>
          <p className="mt-1">
            <a
              href="https://www.pocketdm.com.br"
              className="underline hover:text-gray-300"
            >
              Pocket DM
            </a>
            {" "}&mdash; O rastreador de combate para D&amp;D 5e
          </p>
        </footer>
      </div>
    </>
  );
}
