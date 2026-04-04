import type { Metadata } from "next";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicRulesReference } from "@/components/public/PublicRulesReference";
import { PublicCTA } from "@/components/public/PublicCTA";
import Link from "next/link";

// ── Metadata ───────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Regras D&D 5e — Combate, Descanso, Conjuracao | Pocket DM",
  description:
    "Referencia completa de regras D&D 5e: fluxo de combate, jogadas de ataque, dano & cura, cobertura, descanso, condicoes e basico de conjuracao. Conteudo gratuito do SRD 5.1.",
  openGraph: {
    title: "Regras D&D 5e — Combate, Descanso, Conjuracao | Pocket DM",
    description:
      "Referencia completa de regras D&D 5e com diagramas visuais, rastreador de testes contra a morte interativo e guia de cobertura. Conteudo gratuito do SRD 5.1.",
    type: "website",
    url: "https://www.pocketdm.com.br/regras",
  },
  twitter: {
    card: "summary_large_image",
    title: "Regras D&D 5e — Combate, Descanso, Conjuracao | Pocket DM",
    description:
      "Referencia completa de regras D&D 5e com diagramas visuais e ferramentas interativas. Conteudo gratuito do SRD 5.1.",
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
      a: "No inicio do combate, cada participante faz um teste de Destreza (iniciativa) para determinar a ordem dos turnos. No seu turno, voce pode mover ate sua velocidade, realizar uma acao (Atacar, Conjurar uma Magia, Disparada, Esquivar, Desengajar, Ajudar, Esconder-se, Preparar, Procurar ou Usar um Objeto), uma acao bonus se disponivel, e uma interacao com objetos gratuita. Voce tambem tem uma reacao por rodada.",
    },
    {
      q: "Como funcionam as jogadas de ataque no D&D 5e?",
      a: "Jogue um d20, adicione seu modificador de habilidade e bonus de proficiencia. Se o total for igual ou superior a Classe de Armadura (CA) do alvo, o ataque acerta. Um 20 natural e um acerto critico (dobra os dados de dano), e um 1 natural e uma falha automatica.",
    },
    {
      q: "Como funcionam os testes contra a morte no D&D 5e?",
      a: "Quando voce cai a 0 PV, jogue um d20 no inicio de cada turno sem modificadores. 10 ou mais e um sucesso, 9 ou menos e uma falha. Tres sucessos estabilizam voce, tres falhas significam morte. Um 20 natural significa que voce recupera 1 PV. Um 1 natural conta como duas falhas. Morte instantanea ocorre se o dano restante for igual ou superior ao maximo de PV.",
    },
    {
      q: "Quais tipos de cobertura existem no D&D 5e?",
      a: "Meia cobertura fornece +2 a CA e testes de DEX (muro baixo, mobilia, outra criatura). Tres quartos de cobertura fornece +5 a CA e testes de DEX (portcullis, seteira). Cobertura total significa que voce nao pode ser alvo direto de ataques ou magias.",
    },
    {
      q: "Qual a diferenca entre descanso curto e descanso longo no D&D 5e?",
      a: "Um descanso curto dura 1 ou mais horas onde voce pode gastar Dados de Vida para recuperar PV (jogue dado + modificador de CON por dado gasto). Um descanso longo dura 8 ou mais horas (6 de sono + 2 de atividade leve) onde voce recupera todos os PV, recupera Dados de Vida gastos (ate metade do total) e restaura espacos de magia. Voce so pode se beneficiar de um descanso longo por 24 horas.",
    },
    {
      q: "Como funciona a concentracao em magias no D&D 5e?",
      a: "Voce so pode se concentrar em uma magia por vez. Quando toma dano enquanto concentrado, faca um teste de CON (CD e 10 ou metade do dano, o que for maior). Falha significa que a magia termina. Ser incapacitado ou morto tambem encerra a concentracao.",
    },
    {
      q: "O que sao componentes de magia no D&D 5e?",
      a: "Magias podem requerer componentes Verbais (V) (falar palavras), Somaticos (S) (gestos com uma mao livre), ou Materiais (M) (itens especificos, que podem ser substituidos por um foco arcano ou bolsa de componentes).",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name: "Regras D&D 5e",
    description:
      "Referencia completa de regras de Dungeons & Dragons 5a Edicao, cobrindo combate, ataques, dano, cobertura, descanso, condicoes e conjuracao.",
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
            Pagina disponivel em{" "}
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
            Conteudo SRD utilizado sob{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              className="underline hover:text-gray-300"
              target="_blank"
              rel="noopener noreferrer"
            >
              Creative Commons Attribution 4.0
            </a>
            . D&amp;D e Dungeons &amp; Dragons sao marcas registradas da Wizards
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
