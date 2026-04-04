import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { BLOG_POSTS, getPostBySlug } from "@/lib/blog/posts";
import {
  BlogPost1,
  BlogPost2,
  BlogPost3,
  BlogPost4,
  BlogPost5,
  BlogPost6,
} from "@/components/blog/BlogPostContent";

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

  // Related posts (exclude current)
  const relatedPosts = BLOG_POSTS.filter((p) => p.slug !== slug).slice(0, 3);

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
        url: `${BASE_URL}/icons/icon-512x512.png`,
      },
    },
    mainEntityOfPage: `${BASE_URL}/blog/${post.slug}`,
    inLanguage: "pt-BR",
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdBreadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
      />
      <Navbar
        brand="Pocket DM"
        brandHref="/"
        links={[
          { href: "/blog", label: "Blog" },
          { href: "/monsters", label: "Monstros" },
          { href: "/spells", label: "Magias" },
          { href: "/pricing", label: "Preços" },
        ]}
        rightSlot={
          <>
            <Link
              href="/auth/login"
              className="text-muted-foreground hover:text-foreground transition-all duration-[250ms] min-h-[44px] inline-flex items-center text-sm"
            >
              Login
            </Link>
            <Link
              href="/try"
              className="bg-gold text-surface-primary font-semibold px-4 rounded-lg min-h-[44px] inline-flex items-center text-sm hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-[250ms]"
            >
              Testar Grátis
            </Link>
          </>
        }
      />

      <main className="flex-1 pt-[72px]">
        {/* Hero header with glow */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gold/[0.03] rounded-full blur-[100px]" />
          </div>

          <div className="relative max-w-3xl mx-auto px-6 pt-12 pb-8">
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
              <span className="text-foreground/50 truncate max-w-[200px]">
                {post.title}
              </span>
            </nav>

            {/* Meta */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4">
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
            <h1 className="font-display text-2xl md:text-[2rem] text-gold leading-tight tracking-tight">
              {post.title}
            </h1>
            <p className="mt-4 text-foreground/65 leading-relaxed max-w-2xl text-[15px]">
              {post.description}
            </p>

            {/* Divider */}
            <div className="flex items-center gap-3 mt-10">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
              <span className="text-gold/30 text-xs">&#9670; &#9670; &#9670;</span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
            </div>
          </div>
        </div>

        {/* Article content */}
        <article className="max-w-3xl mx-auto px-6 pb-16">
          <div className="prose-pocket-dm">
            <Content />
          </div>

          {/* Related posts */}
          {relatedPosts.length > 0 && (
            <div className="mt-16 pt-10 border-t border-white/[0.06]">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-5 rounded-full bg-gold/50" />
                <h2 className="font-display text-lg text-gold/80">
                  Leia também
                </h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {relatedPosts.map((rp) => (
                  <Link
                    key={rp.slug}
                    href={`/blog/${rp.slug}`}
                    className="group rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 hover:border-gold/20 hover:bg-white/[0.03] transition-all duration-300"
                  >
                    <p className="text-sm font-medium text-foreground group-hover:text-gold transition-colors leading-snug">
                      {rp.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {rp.readingTime} de leitura
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-12 p-8 rounded-xl border border-gold/15 bg-gradient-to-br from-gold/[0.04] to-transparent text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[150px] bg-gold/[0.06] rounded-full blur-[80px]" aria-hidden="true" />
            <div className="relative">
              <p className="font-display text-xl text-gold mb-2">
                Experimente o Pocket DM
              </p>
              <p className="text-muted-foreground text-sm mb-6">
                Combat tracker gratuito para D&D 5e — sem cadastro, sem download.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/try"
                  className="bg-gold text-surface-primary font-semibold px-6 py-3 rounded-lg hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-200 text-sm"
                >
                  Testar Grátis
                </Link>
                <Link
                  href="/blog"
                  className="border border-white/10 text-foreground/80 font-medium px-6 py-3 rounded-lg hover:border-white/20 hover:text-foreground transition-all duration-200 text-sm"
                >
                  Mais artigos
                </Link>
              </div>
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
