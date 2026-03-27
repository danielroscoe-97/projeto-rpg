export const metadata = {
  title: "Attribution | Pocket DM",
  description: "Content licensing and SRD attribution for Pocket DM.",
};

export default function AttributionPage() {
  return (
    <div className="py-16 px-4">
      <article className="max-w-2xl mx-auto prose prose-invert">
        <h1 className="text-3xl font-bold text-foreground mb-2">Attribution</h1>
        <p className="text-muted-foreground text-sm mb-8">Content Licensing</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">
            System Reference Document
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            This product uses the{" "}
            <strong className="text-foreground">
              System Reference Document 5.1 and 5.2
            </strong>
            , available under the{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold underline underline-offset-4"
            >
              Creative Commons Attribution 4.0 International License
            </a>
            .
          </p>
          <p className="text-foreground/80 leading-relaxed mt-3">
            The SRD 5.1 is © 2016 Wizards of the Coast LLC. The SRD 5.2 is ©
            2025 Wizards of the Coast LLC. All content derived from the SRD is
            used in accordance with the CC-BY-4.0 license.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold text-foreground mb-3">
            What is covered
          </h2>
          <ul className="text-foreground/80 space-y-1 list-disc list-inside">
            <li>Monster stat blocks (SRD 5.1 and 5.2)</li>
            <li>Spell descriptions (SRD 5.1 and 5.2)</li>
            <li>Condition rules text</li>
            <li>Core rules referenced in encounter tracking</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">
            What is not covered
          </h2>
          <p className="text-foreground/80 leading-relaxed">
            Content not included in the SRD (proprietary monsters, spells,
            settings, and characters) is not present in this application. The
            Pocket DM software itself, interface design, and original
            code are © 2026 Pocket DM and are not covered by the
            CC-BY-4.0 license.
          </p>
        </section>
      </article>
    </div>
  );
}
