import Link from "next/link";

const SECTIONS_EN = [
  { label: "Monsters", href: "/monsters" },
  { label: "Spells", href: "/spells" },
  { label: "Classes", href: "/classes" },
  { label: "Races", href: "/races" },
  { label: "Conditions", href: "/conditions" },
  { label: "Damage Types", href: "/damage-types" },
  { label: "Rules", href: "/rules" },
  { label: "Dice", href: "/dice" },
  { label: "Actions", href: "/actions" },
];

const SECTIONS_PT = [
  { label: "Monstros", href: "/monstros" },
  { label: "Magias", href: "/magias" },
  { label: "Classes", href: "/classes-pt" },
  { label: "Raças", href: "/racas" },
  { label: "Condições", href: "/condicoes" },
  { label: "Tipos de Dano", href: "/tipos-de-dano" },
  { label: "Regras", href: "/regras" },
  { label: "Dados", href: "/dados" },
  { label: "Ações", href: "/acoes-em-combate" },
];

interface PublicFooterProps {
  locale?: "en" | "pt-BR";
}

export function PublicFooter({ locale = "en" }: PublicFooterProps) {
  const isPt = locale === "pt-BR";
  const sections = isPt ? SECTIONS_PT : SECTIONS_EN;

  return (
    <footer className="border-t border-border mt-16 py-8 px-4">
      {/* Compendium navigation */}
      <nav className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mb-6 max-w-3xl mx-auto">
        {sections.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="text-xs text-muted-foreground hover:text-[#D4A853] transition-colors"
          >
            {s.label}
          </Link>
        ))}
      </nav>

      {/* Attribution */}
      <div className="text-center text-muted-foreground text-xs space-y-1">
        <p>
          {isPt ? "Conteúdo SRD utilizado sob" : "SRD content used under the"}{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            className="underline hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            Creative Commons Attribution 4.0{isPt ? "" : " License"}
          </a>
          . D&amp;D {isPt ? "e" : "and"} Dungeons &amp; Dragons{" "}
          {isPt
            ? "são marcas registradas da Wizards of the Coast."
            : "are trademarks of Wizards of the Coast."}
        </p>
        <p>
          <Link href="/" className="underline hover:text-foreground">
            Pocket DM
          </Link>
          {" "}— {isPt ? "O rastreador de combate para" : "The combat tracker for"} D&amp;D 5e
        </p>
      </div>
    </footer>
  );
}
