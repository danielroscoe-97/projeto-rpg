export const metadata = {
  title: "Atribuição / Attribution | Pocket DM",
  description:
    "Licenciamento de conteúdo e atribuição SRD do Pocket DM. Content licensing and SRD attribution.",
};

export default function AttributionPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 pt-16 pb-16">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/art/brand/logo-icon.svg"
            alt=""
            width={36}
            height={36}
            className="opacity-90 drop-shadow-[0_0_10px_rgba(212,168,83,0.4)]"
            aria-hidden="true"
          />
          <h1 className="font-display text-3xl md:text-4xl text-gold">
            Atribuição
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          Licenciamento de conteúdo / Content Licensing
        </p>

        {/* Divider */}
        <div className="flex items-center gap-3 mt-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
          <span className="text-gold/40 text-xs">&#9670; &#9670; &#9670;</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        </div>
      </div>

      {/* Bilingual sections */}
      <div className="space-y-5">
        {/* SRD — PT-BR */}
        <section className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 md:p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-7 h-7 rounded-md bg-gold/10 flex items-center justify-center text-sm shrink-0">
              &#128214;
            </span>
            <h2 className="font-display text-lg text-foreground/90">
              System Reference Document
            </h2>
          </div>
          <p className="text-gold/50 text-[11px] uppercase tracking-wider font-medium mb-3">
            Português
          </p>
          <div className="text-foreground/65 text-sm leading-relaxed space-y-3">
            <p>
              Este produto utiliza o{" "}
              <strong className="text-foreground/80">
                System Reference Document 5.1 e 5.2
              </strong>
              , disponível sob a{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold underline underline-offset-4 hover:text-gold/80 transition-colors"
              >
                Licença Creative Commons Atribuição 4.0 Internacional
              </a>
              .
            </p>
            <p>
              O SRD 5.1 é &copy; 2016 Wizards of the Coast LLC. O SRD 5.2 é &copy;
              2025 Wizards of the Coast LLC. Todo o conteúdo derivado do SRD é
              utilizado de acordo com a licença CC-BY-4.0.
            </p>
          </div>
        </section>

        {/* SRD — EN */}
        <section className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 md:p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-7 h-7 rounded-md bg-gold/10 flex items-center justify-center text-sm shrink-0">
              &#128214;
            </span>
            <h2 className="font-display text-lg text-foreground/90">
              System Reference Document
            </h2>
          </div>
          <p className="text-gold/50 text-[11px] uppercase tracking-wider font-medium mb-3">
            English
          </p>
          <div className="text-foreground/65 text-sm leading-relaxed space-y-3">
            <p>
              This product uses the{" "}
              <strong className="text-foreground/80">
                System Reference Document 5.1 and 5.2
              </strong>
              , available under the{" "}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold underline underline-offset-4 hover:text-gold/80 transition-colors"
              >
                Creative Commons Attribution 4.0 International License
              </a>
              .
            </p>
            <p>
              The SRD 5.1 is &copy; 2016 Wizards of the Coast LLC. The SRD 5.2 is &copy;
              2025 Wizards of the Coast LLC. All content derived from the SRD is
              used in accordance with the CC-BY-4.0 license.
            </p>
          </div>
        </section>

        {/* Monster a Day */}
        <section className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 md:p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-7 h-7 rounded-md bg-gold/10 flex items-center justify-center text-sm shrink-0">
              &#128009;
            </span>
            <h2 className="font-display text-lg text-foreground/90">
              Monster a Day
            </h2>
          </div>
          <p className="text-gold/50 text-[11px] uppercase tracking-wider font-medium mb-3">
            Compêndio comunitário / Community compendium
          </p>
          <div className="text-foreground/65 text-sm leading-relaxed space-y-3">
            <p>
              O Pocket DM inclui monstros do compêndio{" "}
              <a
                href="https://www.reddit.com/r/monsteraday"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold underline underline-offset-4 hover:text-gold/80 transition-colors"
              >
                Monster a Day (r/monsteraday)
              </a>
              , uma coleção comunitária de criaturas homebrew para D&D 5e com fichas
              já implementadas e prontas para uso no combat tracker.
            </p>
            <p className="text-foreground/45 text-xs">
              Pocket DM includes monsters from the{" "}
              <a
                href="https://www.reddit.com/r/monsteraday"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold underline underline-offset-4 hover:text-gold/80 transition-colors"
              >
                Monster a Day (r/monsteraday)
              </a>{" "}
              community compendium — a collection of homebrew D&D 5e creatures with
              stat blocks ready to use in the combat tracker.
            </p>
          </div>
        </section>

        {/* O que é coberto / What is covered */}
        <section className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 md:p-6">
          <h2 className="font-display text-lg text-foreground/90 mb-4 flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-gold/10 flex items-center justify-center text-sm shrink-0">
              &#9989;
            </span>
            Conteúdo coberto / Content covered
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { pt: "Stat blocks de monstros (SRD 5.1 e 5.2)", en: "Monster stat blocks (SRD 5.1 & 5.2)" },
              { pt: "Monstros do compêndio Monster a Day", en: "Monster a Day compendium creatures" },
              { pt: "Descrições de magias (SRD 5.1 e 5.2)", en: "Spell descriptions (SRD 5.1 & 5.2)" },
              { pt: "Texto de regras de condições", en: "Condition rules text" },
              { pt: "Regras básicas de combate", en: "Core combat rules" },
            ].map((item) => (
              <div key={item.en} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white/[0.02]">
                <span className="text-gold text-xs mt-0.5">&#9670;</span>
                <div className="text-sm">
                  <p className="text-foreground/70">{item.pt}</p>
                  <p className="text-foreground/40 text-xs">{item.en}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* O que NÃO é coberto / What is NOT covered */}
        <section className="rounded-xl border border-gold/10 bg-gradient-to-br from-gold/[0.03] to-transparent p-5 md:p-6">
          <h2 className="font-display text-lg text-foreground/90 mb-3 flex items-center gap-2">
            <span className="w-7 h-7 rounded-md bg-gold/10 flex items-center justify-center text-sm shrink-0">
              &#128274;
            </span>
            O que não é coberto / What is not covered
          </h2>
          <div className="text-foreground/65 text-sm leading-relaxed space-y-3">
            <p>
              Conteúdo não incluído no SRD (monstros proprietários, magias,
              cenários e personagens) não está presente nesta aplicação.
              O software Pocket DM, design da interface e código original
              são &copy; 2026 Pocket DM e não são cobertos pela licença CC-BY-4.0.
            </p>
            <p className="text-foreground/45 text-xs">
              Content not included in the SRD (proprietary monsters, spells,
              settings, and characters) is not present in this application.
              The Pocket DM software, interface design, and original code
              are &copy; 2026 Pocket DM and are not covered by the CC-BY-4.0 license.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
