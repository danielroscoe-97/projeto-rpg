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
} from "@/components/blog/BlogPostContent";

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

  return {
    title: post.ogTitle,
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
        url: "https://pocketdm.com.br/icons/icon-512x512.png",
      },
    },
    mainEntityOfPage: `https://pocketdm.com.br/blog/${post.slug}`,
    inLanguage: "pt-BR",
  };

  return (
    <div className="min-h-screen flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdArticle) }}
      />
      <Navbar brand="Pocket DM" brandHref="/" />

      <main className="flex-1 pt-[72px]">
        <article className="max-w-3xl mx-auto px-6 py-16">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
            <Link href="/" className="hover:text-foreground transition-colors">
              Pocket DM
            </Link>
            <span>/</span>
            <Link
              href="/blog"
              className="hover:text-foreground transition-colors"
            >
              Blog
            </Link>
            <span>/</span>
            <span className="text-foreground/60 truncate max-w-[200px]">
              {post.title}
            </span>
          </nav>

          {/* Header */}
          <div className="mb-10">
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
              <time dateTime={post.date}>
                {new Date(post.date).toLocaleDateString("pt-BR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </time>
              <span>&#183;</span>
              <span>{post.readingTime} de leitura</span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl text-gold leading-tight">
              {post.title}
            </h1>
            <p className="mt-3 text-foreground/70 leading-relaxed">
              {post.description}
            </p>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-10">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
            <span className="text-gold/40 text-xs">&#9670; &#9670; &#9670;</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
          </div>

          {/* Content */}
          <div className="prose-pocket-dm">
            <Content />
          </div>

          {/* CTA */}
          <div className="mt-16 p-8 rounded-xl border border-white/[0.08] bg-white/[0.02] text-center">
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
                Testar Gratis
              </Link>
              <Link
                href="/blog"
                className="border border-white/10 text-foreground/80 font-medium px-6 py-3 rounded-lg hover:border-white/20 hover:text-foreground transition-all duration-200 text-sm"
              >
                Mais artigos
              </Link>
            </div>
          </div>
        </article>
      </main>

      <Footer />
    </div>
  );
}
