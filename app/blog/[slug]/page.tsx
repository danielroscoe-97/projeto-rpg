import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Footer } from "@/components/marketing/Footer";
import { BLOG_POSTS, BLOG_CATEGORIES, getPostBySlug } from "@/lib/blog/posts";
import { BlogNavbar } from "@/components/blog/BlogNavbar";
import {
  BlogPost1,
  BlogPost2,
  BlogPost3,
  BlogPost4,
  BlogPost5,
  BlogPost6,
  BlogPost7,
  BlogPost8,
  BlogPost9,
  BlogPost10,
  BlogPost11,
  BlogPost12,
  BlogPost13,
  BlogPost14,
  BlogPost15,
  BlogPost16,
  BlogPost17,
  BlogPost18,
  BlogPost19,
} from "@/components/blog/BlogPostContent";
import { ReadingProgress } from "@/components/blog/ReadingProgress";
import { BlogTOC, BlogTOCMobile } from "@/components/blog/BlogTOC";
import { BlogLanguageSwitcher } from "@/components/blog/BlogLanguageSwitcher";
import { CATEGORY_CTA } from "@/lib/blog/feature-links";
import { EbookCTA } from "@/components/blog/EbookCTA";


const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://pocketdm.com.br";

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  const pageTitle = post.ogTitle.replace(/ \| Pocket DM$/, "");

  return {
    title: pageTitle,
    description: post.description,
    keywords: post.keywords,
    alternates: {
      canonical: `/blog/${post.slug}`,
      languages: { "pt-BR": `/blog/${post.slug}`, en: `/blog/${post.slug}` },
    },
    openGraph: {
      title: post.ogTitle,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      authors: ["Pocket DM"],
    },
  };
}

const CONTENT_MAP: Record<string, React.ComponentType> = {
  "como-usar-combat-tracker-dnd-5e": BlogPost1,
  "ferramentas-essenciais-mestre-dnd-5e": BlogPost2,
  "combat-tracker-vs-vtt-diferenca": BlogPost3,
  "guia-condicoes-dnd-5e": BlogPost4,
  "como-agilizar-combate-dnd-5e": BlogPost5,
  "como-usar-pocket-dm-tutorial": BlogPost6,
  "como-montar-encontro-balanceado-dnd-5e": BlogPost7,
  "guia-challenge-rating-dnd-5e": BlogPost8,
  "melhores-monstros-dnd-5e": BlogPost9,
  "como-mestrar-dnd-primeira-vez": BlogPost10,
  "musica-ambiente-para-rpg": BlogPost11,
  "teatro-da-mente-vs-grid-dnd-5e": BlogPost12,
  "build-half-elf-order-cleric-divine-soul-sorcerer": BlogPost13,
  "build-half-elf-order-cleric-divine-soul-sorcerer-en": BlogPost14,
  "diario-de-aventura": BlogPost15,
  "guia-mestre-eficaz-combate-dnd-5e": BlogPost16,
  "como-gerenciar-hp-dnd-5e": BlogPost17,
  "7-erros-mestre-combate-dnd": BlogPost18,
  "iniciativa-dnd-5e-regras-variantes": BlogPost19,
};

export const revalidate = 86400;

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const Content = CONTENT_MAP[slug];
  if (!Content) notFound();

  // Sort posts by date for consistent ordering
  const sortedPosts = [...BLOG_POSTS].sort((a, b) => a.date.localeCompare(b.date));

  // Related posts (same category first, then others, exclude current)
  const sameCategory = sortedPosts.filter((p) => p.slug !== slug && p.category === post.category);
  const otherPosts = sortedPosts.filter((p) => p.slug !== slug && p.category !== post.category);
  const relatedPosts = [...sameCategory, ...otherPosts].slice(0, 3);

  // Prev/Next navigation (chronological)
  const currentIndex = sortedPosts.findIndex((p) => p.slug === slug);
  const prevPost = currentIndex > 0 ? sortedPosts[currentIndex - 1] : null;
  const nextPost = currentIndex < sortedPosts.length - 1 ? sortedPosts[currentIndex + 1] : null;

  const jsonLdBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Pocket DM",
        item: BASE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${BASE_URL}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `${BASE_URL}/blog/${post.slug}`,
      },
    ],
  };

  const jsonLdArticle = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { "@type": "Organization", name: "Pocket DM" },
    publisher: {
      "@type": "Organization",
      name: "Pocket DM",
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/icons/icon-512.png`,
      },
    },
    image: `${BASE_URL}/blog/${post.slug}/opengraph-image`,
    mainEntityOfPage: `${BASE_URL}/blog/${post.slug}`,
    inLanguage: slug.endsWith("-en") ? "en-US" : "pt-BR",
  };

  return (
    <div className="min-h-screen flex flex-col">
      <ReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
      />
      <BlogNavbar />

      <main className="flex-1 pt-[72px]">
        {/* Hero header with glow */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gold/[0.03] rounded-full blur-[100px]" />
          </div>

          <div className="relative max-w-3xl mx-auto xl:max-w-5xl px-6 pt-12 pb-8">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-xs text-muted-foreground/70 mb-8">
              <Link href="/" className="hover:text-foreground transition-colors">
                Pocket DM
              </Link>
              <span className="text-gold/30">/</span>
              <Link
                href="/blog"
                className="hover:text-foreground transition-colors"
              >
                Blog
              </Link>
              <span className="text-gold/30">/</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-gold/60 bg-gold/[0.08] px-1.5 py-0.5 rounded">
                {BLOG_CATEGORIES[post.category]}
              </span>
            </nav>

            {/* Meta */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4 xl:max-w-3xl">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-gold/50" />
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString("pt-BR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </time>
              </div>
              <span className="text-gold/30">&#183;</span>
              <span>{post.readingTime} de leitura</span>
            </div>

            {/* Title */}
            <h1 className="font-display text-2xl md:text-[2rem] text-gold leading-tight tracking-tight xl:max-w-3xl">
              {post.title}
            </h1>
            <p className="mt-4 text-foreground/65 leading-relaxed max-w-2xl text-[15px]">
              {post.description}
            </p>

            {/* Language switcher */}
            <BlogLanguageSwitcher slug={slug} />

            {/* Divider */}
            <div className="flex items-center gap-3 mt-10 xl:max-w-3xl">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
              <span className="text-gold/30 text-xs">&#9670; &#9670; &#9670;</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
            </div>
          </div>
        </div>

        {/* Article content + TOC sidebar */}
        <div className="max-w-3xl mx-auto xl:max-w-5xl px-6 pb-16 flex gap-10">
          <article className="flex-1 min-w-0 pb-16 xl:pb-0">
            <div className="prose-pocket-dm">
              <Content />
            </div>

            {/* Prev/Next Navigation */}
            {(prevPost || nextPost) && (
              <div className="mt-14 pt-8 border-t border-white/[0.06]">
                <div className="grid grid-cols-2 gap-4">
                  {prevPost ? (
                    <Link
                      href={`/blog/${prevPost.slug}`}
                      className="group rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 hover:border-gold/20 hover:bg-white/[0.03] transition-all duration-300"
                    >
                      <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                        </svg>
                        Anterior
                      </span>
                      <p className="text-sm text-foreground/70 group-hover:text-gold transition-colors mt-1.5 leading-snug line-clamp-2">
                        {prevPost.title}
                      </p>
                    </Link>
                  ) : <div />}
                  {nextPost ? (
                    <Link
                      href={`/blog/${nextPost.slug}`}
                      className="group rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 hover:border-gold/20 hover:bg-white/[0.03] transition-all duration-300 text-right"
                    >
                      <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider flex items-center gap-1 justify-end">
                        Próximo
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                        </svg>
                      </span>
                      <p className="text-sm text-foreground/70 group-hover:text-gold transition-colors mt-1.5 leading-snug line-clamp-2">
                        {nextPost.title}
                      </p>
                    </Link>
                  ) : <div />}
                </div>
              </div>
            )}

            {/* Proxima Aventura — Related posts (Notion style) */}
            {relatedPosts.length > 0 && (
              <div className="mt-14 pt-10 border-t border-white/[0.06]">
                <h2 className="font-display text-xl text-foreground mb-6">
                  Continue lendo
                </h2>
                <div className="grid gap-6 sm:grid-cols-3">
                  {relatedPosts.map((rp) => (
                    <Link
                      key={rp.slug}
                      href={`/blog/${rp.slug}`}
                      className="group"
                    >
                      <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden mb-3">
                        {rp.image && (
                          <Image
                            src={rp.image}
                            alt={rp.title}
                            fill
                            className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
                            sizes="(max-width: 640px) 100vw, 33vw"
                          />
                        )}
                      </div>
                      <span className={`text-[10px] font-semibold uppercase tracking-widest ${
                        rp.category === "tutorial" ? "text-blue-400" :
                        rp.category === "guia" ? "text-emerald-400" :
                        rp.category === "lista" ? "text-amber-400" :
                        rp.category === "comparativo" ? "text-purple-400" :
                        rp.category === "build" ? "text-rose-400" :
                        "text-gold"
                      }`}>
                        {BLOG_CATEGORIES[rp.category]}
                      </span>
                      <p className="text-sm text-foreground/90 group-hover:text-gold transition-colors leading-snug mt-1.5 line-clamp-2">
                        {rp.title}
                      </p>
                      <p className="text-[11px] text-foreground/45 mt-1.5">
                        {rp.readingTime}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* E-book CTA — lead magnet */}
            <EbookCTA variant="banner" />

            {/* CTA — contextual per post category */}
            {(() => {
              const lang = slug.endsWith("-en") ? "en" : "pt";
              const preset = CATEGORY_CTA[post.category]?.[lang];
              const ctaHref = preset?.href ?? "/try";
              const ctaBtn = preset?.btn ?? (lang === "en" ? "Try Free \u2192" : "Testar Grátis");
              return (
                <div className="mt-12 p-8 sm:p-10 rounded-xl border border-gold/25 bg-gradient-to-br from-gold/[0.06] to-transparent text-center relative overflow-hidden">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[150px] bg-gold/[0.08] rounded-full blur-[80px]" aria-hidden="true" />
                  <div className="relative">
                    <p className="font-display text-xl sm:text-2xl text-gold mb-2">
                      {lang === "en" ? "Try Pocket DM" : "Experimente o Pocket DM"}
                    </p>
                    <p className="text-muted-foreground text-sm sm:text-base mb-6">
                      {preset?.msg ?? (lang === "en"
                        ? "Free combat tracker for D&D 5e \u2014 no signup, no download."
                        : "Combat tracker gratuito para D&D 5e \u2014 sem cadastro, sem download.")}
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                      <Link
                        href={ctaHref}
                        className="bg-gold text-surface-primary font-semibold px-6 py-3 rounded-lg hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-200 text-sm"
                      >
                        {ctaBtn}
                      </Link>
                      <Link
                        href="/blog"
                        className="border border-white/10 text-foreground/80 font-medium px-6 py-3 rounded-lg hover:border-white/20 hover:text-foreground transition-all duration-200 text-sm"
                      >
                        {lang === "en" ? "More articles" : "Mais artigos"}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })()}
          </article>

          {/* TOC Sidebar — desktop only */}
          <BlogTOC />

          {/* TOC — mobile floating button + bottom sheet */}
          <BlogTOCMobile />
        </div>
      </main>

      <Footer />
    </div>
  );
}
