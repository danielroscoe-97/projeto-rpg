import Link from "next/link";
import { Fragment } from "react";
import { PublicNav } from "@/components/public/PublicNav";
import { PublicFooter } from "@/components/public/PublicFooter";
import {
  articleLd,
  breadcrumbList,
  jsonLdScriptProps,
} from "@/lib/seo/metadata";
import type { HubContent, HubRichParagraph, HubItem } from "@/lib/seo/hub-types";

function resolveItemHref(item: HubItem, linkPath: string): string {
  if (item.url) return item.url;
  return `${linkPath}/${item.slug}`;
}

/**
 * Render a rich paragraph with `{{placeholder}}` substituted for <Link> tags.
 * Placeholders that don't have a matching link are rendered as plain text
 * (sans the surrounding braces) — a safe fallback.
 */
function RichText({ para }: { para: HubRichParagraph }) {
  const { text, links = {} } = para;
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\{\{([^}]+)\}\}$/);
        if (!m) return <Fragment key={i}>{part}</Fragment>;
        const link = links[m[1]];
        if (!link) return <Fragment key={i}>{m[1]}</Fragment>;
        return (
          <Link
            key={i}
            href={link.href}
            className="text-gold underline underline-offset-2 hover:text-gold/70"
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}

function Section({ section }: { section: HubContent["sections"][number] }) {
  const isCard = section.style === "card";
  return (
    <section className="mb-12" id={section.anchor}>
      <div className="flex items-baseline justify-between flex-wrap gap-2 mb-2">
        <h2 className="font-[family-name:var(--font-cinzel)] text-2xl text-gold">
          {section.label}
        </h2>
        {section.subLabel && (
          <span className="text-xs text-gray-500">{section.subLabel}</span>
        )}
      </div>
      {section.desc && (
        <p className="text-gray-400 text-sm mb-6 leading-relaxed">{section.desc}</p>
      )}
      {isCard ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {section.items.map((item, i) => (
            <Link
              key={`${item.slug}-${i}`}
              href={resolveItemHref(item, section.linkPath)}
              className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 hover:border-gold/30 transition-colors"
            >
              <span className="text-sm text-gray-100">{item.name}</span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {section.items.map((item, i) => (
            <Link
              key={`${item.slug}-${i}`}
              href={resolveItemHref(item, section.linkPath)}
              className="text-sm rounded-md px-2.5 py-1 bg-gold/[0.06] border border-gold/15 text-gold hover:bg-gold/15 hover:border-gold/30 transition-colors"
            >
              {item.name}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function HubPageTemplate({ content }: { content: HubContent }) {
  const pathPrefix = content.locale === "pt-BR" ? "/guias" : "/guides";
  const selfPath = `${pathPrefix}/${content.slug}`;

  const article = {
    ...articleLd({
      name: content.metaTitle,
      description: content.metaDescription,
      path: selfPath,
      imagePath: "/opengraph-image",
      locale: content.locale,
    }),
    inLanguage: content.inLanguage ?? (content.locale === "pt-BR" ? "pt-BR" : "en"),
  };
  const crumbs = breadcrumbList(content.breadcrumbs);

  return (
    <div className="min-h-screen bg-background">
      <script {...jsonLdScriptProps(article)} />
      <script {...jsonLdScriptProps(crumbs)} />
      <PublicNav
        locale={content.locale}
        breadcrumbs={[{ label: content.breadcrumbs.at(-1)?.name ?? content.h1 }]}
      />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <header className="mb-10">
          <p className="text-xs uppercase tracking-widest text-gold/70 mb-3">
            {content.kicker}
          </p>
          <h1 className="font-[family-name:var(--font-cinzel)] text-3xl sm:text-4xl text-gold leading-tight mb-4">
            {content.h1}
          </h1>
          <p className="text-gray-300 text-base leading-relaxed">
            <RichText para={content.lead} />
          </p>
        </header>

        {content.introBlocks?.map((block, i) => (
          <section key={`intro-${i}`} className="mb-12">
            <h2 className="font-[family-name:var(--font-cinzel)] text-2xl text-gold mb-4">
              {block.label}
            </h2>
            {block.paragraphs.map((para, j) => (
              <p
                key={j}
                className="text-gray-300 leading-relaxed mb-3 last:mb-0"
              >
                <RichText para={para} />
              </p>
            ))}
          </section>
        ))}

        {content.sections.map((section, i) => (
          <Section key={`section-${i}`} section={section} />
        ))}

        {content.iconic && (
          <section className="mb-12">
            <h2 className="font-[family-name:var(--font-cinzel)] text-2xl text-gold mb-2">
              {content.iconic.label}
            </h2>
            {content.iconic.desc && (
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                {content.iconic.desc}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {content.iconic.items.map((item, i) => (
                <Link
                  key={`iconic-${item.slug}-${i}`}
                  href={resolveItemHref(item, content.sections[0]?.linkPath ?? "/")}
                  className="group rounded-xl border border-gold/15 bg-gradient-to-br from-gold/[0.04] to-transparent p-5 hover:border-gold/40 hover:-translate-y-0.5 transition-all"
                >
                  <h3 className="text-lg text-gold mb-2 group-hover:text-gold/90">
                    {item.name}
                    {item.level && (
                      <span className="ml-2 text-xs text-gold/60">{item.level}</span>
                    )}
                  </h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{item.blurb}</p>
                  <p className="text-xs text-gold/60 mt-3">
                    {content.locale === "pt-BR" ? "Ver detalhes" : "View details"} →
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {content.closing?.map((block, i) => (
          <section key={`closing-${i}`} className="mb-12">
            <h2 className="font-[family-name:var(--font-cinzel)] text-2xl text-gold mb-3">
              {block.label}
            </h2>
            {block.paragraphs.map((para, j) => (
              <p
                key={j}
                className="text-gray-300 leading-relaxed mb-3 last:mb-0"
              >
                <RichText para={para} />
              </p>
            ))}
          </section>
        ))}

        {content.internalLinkCluster && (
          <section className="mb-12">
            <h2 className="font-[family-name:var(--font-cinzel)] text-lg text-gold mb-3">
              {content.internalLinkCluster.label}
            </h2>
            <div className="flex flex-wrap gap-2">
              {content.internalLinkCluster.links.map((link, i) => (
                <Link
                  key={`cluster-${link.href}-${i}`}
                  href={link.href}
                  className="text-sm rounded-md px-2.5 py-1 bg-white/[0.04] border border-white/[0.08] text-gray-200 hover:bg-white/[0.08] hover:border-white/[0.16] transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="mb-12">
          <div className="rounded-xl bg-gradient-to-r from-gold/[0.08] to-gray-800/40 border border-gold/15 px-6 py-8 sm:flex sm:items-center sm:justify-between gap-4">
            <div className="mb-4 sm:mb-0">
              <p className="text-gray-100 font-semibold text-lg leading-snug">
                {content.ctaHeadline}
              </p>
              <p className="text-gray-400 text-sm mt-1">{content.ctaSub}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {content.ctaSecondaryHref && content.ctaSecondaryLabel && (
                <Link
                  href={content.ctaSecondaryHref}
                  className="rounded-lg border border-gold/30 bg-gold/[0.08] px-5 py-2.5 text-gold font-semibold text-sm hover:bg-gold/15 transition-colors"
                >
                  {content.ctaSecondaryLabel}
                </Link>
              )}
              <Link
                href={content.ctaPrimaryHref}
                className="rounded-lg bg-gold px-5 py-2.5 text-gray-950 font-semibold text-sm hover:bg-gold/90 transition-colors"
              >
                {content.ctaPrimaryLabel} →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
