"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import type { BlogPost, BlogCategory } from "@/lib/blog/posts";
import { BLOG_CATEGORIES } from "@/lib/blog/posts";

type LangFilter = "all" | "pt" | "en";

function getPostLang(slug: string): "pt" | "en" {
  return slug.endsWith("-en") ? "en" : "pt";
}

const CATEGORY_COLORS: Record<BlogCategory, string> = {
  tutorial: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  guia: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  lista: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  comparativo: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  build: "bg-rose-500/15 text-rose-400 border-rose-500/20",
  devlog: "bg-gold/15 text-gold border-gold/25",
};

const CATEGORY_GRADIENT: Record<BlogCategory, string> = {
  tutorial: "from-blue-900/40 via-blue-950/20 to-surface-primary/90",
  guia: "from-emerald-900/40 via-emerald-950/20 to-surface-primary/90",
  lista: "from-amber-900/40 via-amber-950/20 to-surface-primary/90",
  comparativo: "from-purple-900/40 via-purple-950/20 to-surface-primary/90",
  build: "from-rose-900/40 via-rose-950/20 to-surface-primary/90",
  devlog: "from-gold/20 via-yellow-950/20 to-surface-primary/90",
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
}

function CategoryBadge({ category }: { category: BlogCategory }) {
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${CATEGORY_COLORS[category]}`}
    >
      {BLOG_CATEGORIES[category]}
    </span>
  );
}

function LangBadge({ slug }: { slug: string }) {
  const lang = getPostLang(slug);
  return (
    <span
      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${
        lang === "en"
          ? "bg-sky-500/10 text-sky-400 border-sky-500/20"
          : "bg-green-500/10 text-green-400 border-green-500/20"
      }`}
    >
      {lang === "en" ? "EN" : "PT"}
    </span>
  );
}

/* ─── Portal Section (wiki column) ────────────────────────── */
function PortalSection({
  title,
  icon,
  posts,
  accentClass,
  filterCategory,
  onFilter,
}: {
  title: string;
  icon: string;
  posts: BlogPost[];
  accentClass: string;
  filterCategory: BlogCategory | null;
  onFilter: (cat: BlogCategory | null) => void;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col hover:border-white/[0.10] transition-colors duration-300">
      <button
        type="button"
        onClick={() => onFilter(filterCategory)}
        className="flex items-center gap-2.5 mb-4 group"
      >
        <span className="text-lg">{icon}</span>
        <h2 className={`font-display text-sm tracking-wide ${accentClass} group-hover:brightness-125 transition-all`}>
          {title}
        </h2>
        <svg className="w-3.5 h-3.5 ml-auto text-muted-foreground/30 group-hover:text-foreground/60 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
      <div className="flex-1 space-y-0.5">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group/item flex items-start gap-2.5 py-2 px-2.5 -mx-2.5 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            <span className="text-gold/25 text-[7px] mt-[7px] shrink-0">&#9670;</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-foreground/70 group-hover/item:text-gold leading-snug transition-colors line-clamp-2">
                {post.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-muted-foreground/40">{post.readingTime}</span>
                {getPostLang(post.slug) === "en" && (
                  <span className="text-[8px] font-bold text-sky-400/50">EN</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── Featured Post (hero card for pinned) ───────────────── */
function FeaturedCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group relative block rounded-xl border border-white/[0.08] overflow-hidden mb-8 hover:border-gold/25 transition-all duration-500"
    >
      <div className="relative w-full aspect-[21/9] sm:aspect-[21/8] overflow-hidden">
        {post.image ? (
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-[1.03] transition-transform duration-700"
            sizes="100vw"
            priority
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${CATEGORY_GRADIENT[post.category]}`} />
        )}
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-transparent" />
      </div>

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-3">
          <CategoryBadge category={post.category} />
          <LangBadge slug={post.slug} />
          <span className="text-[11px] text-white/50 ml-1">{post.readingTime}</span>
        </div>
        <h2 className="font-display text-xl sm:text-2xl md:text-3xl text-white group-hover:text-gold transition-colors duration-300 leading-tight max-w-2xl">
          {post.title}
        </h2>
        <p className="text-sm text-white/60 mt-2 max-w-xl leading-relaxed line-clamp-2 hidden sm:block">
          {post.description}
        </p>
      </div>

      {/* Pinned badge */}
      {post.pinned && (
        <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gold/20 border border-gold/30 backdrop-blur-sm">
          <svg className="w-3 h-3 text-gold" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-[10px] font-semibold text-gold uppercase tracking-wider">Destaque</span>
        </div>
      )}
    </Link>
  );
}

/* ─── Post Card (grid items) — with thumbnail ───────────── */
function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-gold/20 hover:bg-white/[0.04] transition-all duration-300 h-full overflow-hidden"
    >
      {/* Image area */}
      <div className="relative w-full aspect-[16/9] overflow-hidden">
        {post.image ? (
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${CATEGORY_GRADIENT[post.category]}`} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Category badge on image */}
        <div className="absolute top-3 left-3">
          <CategoryBadge category={post.category} />
        </div>

        {/* Date on image */}
        <div className="absolute bottom-3 right-3">
          <span className="text-[10px] text-white/50 font-medium">{formatDate(post.date)}</span>
        </div>
      </div>

      {/* Text area */}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <LangBadge slug={post.slug} />
          <span className="text-[10px] text-muted-foreground/50 ml-auto">{post.readingTime}</span>
        </div>
        <h3 className="font-display text-[15px] text-foreground/90 group-hover:text-gold transition-colors duration-200 mb-2 leading-snug flex-1">
          {post.title}
        </h3>
        <p className="text-[12px] text-foreground/40 leading-relaxed line-clamp-2">
          {post.description}
        </p>
      </div>
    </Link>
  );
}

/* ─── Main Grid ──────────────────────────────────────────── */
export function BlogGrid({ posts }: { posts: BlogPost[] }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<BlogCategory | null>(null);
  const [langFilter, setLangFilter] = useState<LangFilter>("all");

  const categories = useMemo(() => {
    const cats = new Set(posts.map((p) => p.category));
    return Array.from(cats) as BlogCategory[];
  }, [posts]);

  const hasMultipleLanguages = useMemo(() => {
    const langs = new Set(posts.map((p) => getPostLang(p.slug)));
    return langs.size > 1;
  }, [posts]);

  // Article categories (tutorials, guias, listas, comparativos)
  const articleCats: BlogCategory[] = ["tutorial", "guia", "lista", "comparativo"];
  const articles = useMemo(
    () => posts.filter((p) => articleCats.includes(p.category)).sort((a, b) => b.date.localeCompare(a.date)),
    [posts]
  );
  const builds = useMemo(
    () => posts.filter((p) => p.category === "build").sort((a, b) => b.date.localeCompare(a.date)),
    [posts]
  );
  const devlogs = useMemo(
    () => posts.filter((p) => p.category === "devlog").sort((a, b) => b.date.localeCompare(a.date)),
    [posts]
  );

  const filtered = useMemo(() => {
    let result = posts;
    if (langFilter !== "all") {
      result = result.filter((p) => getPostLang(p.slug) === langFilter);
    }
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    if (activeCategory) {
      result = result.filter((p) => p.category === activeCategory);
    }
    return result;
  }, [posts, query, activeCategory, langFilter]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.date.localeCompare(a.date);
      }),
    [filtered]
  );

  const hasFilters = !!(query || activeCategory || langFilter !== "all");

  // Separate pinned/featured from regular posts
  const featuredPost = !hasFilters ? sorted.find((p) => p.pinned) : undefined;
  const regularPosts = featuredPost ? sorted.filter((p) => p !== featuredPost) : sorted;

  return (
    <div>
      {/* ─── Search + Filters (sticky) ─── */}
      <div className="sticky top-[64px] z-20 -mx-6 px-6 py-3 bg-background/95 backdrop-blur-md border-b border-white/[0.06] mb-8">
        <div className="relative mb-3">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
            />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar artigos..."
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-white/[0.05] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/30 focus:bg-white/[0.06] transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none -mx-1 px-1">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              !activeCategory
                ? "bg-gold/15 text-gold border border-gold/25"
                : "bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:text-foreground hover:border-white/[0.12]"
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeCategory === cat
                  ? "bg-gold/15 text-gold border border-gold/25"
                  : "bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:text-foreground hover:border-white/[0.12]"
              }`}
            >
              {BLOG_CATEGORIES[cat]}
            </button>
          ))}

          {hasMultipleLanguages && (
            <>
              <span className="w-px h-5 bg-white/[0.08] mx-1 shrink-0" />
              {(["all", "pt", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLangFilter(l)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    langFilter === l
                      ? "bg-gold/15 text-gold border border-gold/25"
                      : "bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:text-foreground hover:border-white/[0.12]"
                  }`}
                >
                  {l === "all" ? "All" : l === "pt" ? "PT" : "EN"}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ─── Featured Post ─── */}
      {featuredPost && <FeaturedCard post={featuredPost} />}

      {/* ─── Wiki Portal ─── */}
      {!hasFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <PortalSection
            title="Artigos & Guias"
            icon="📜"
            posts={articles.slice(0, 5)}
            accentClass="text-blue-400"
            filterCategory="tutorial"
            onFilter={() => setActiveCategory("tutorial")}
          />
          <PortalSection
            title="Builds"
            icon="⚔️"
            posts={builds.slice(0, 5)}
            accentClass="text-rose-400"
            filterCategory="build"
            onFilter={() => setActiveCategory("build")}
          />
          <PortalSection
            title="Diário de Aventura"
            icon="📖"
            posts={devlogs.slice(0, 5)}
            accentClass="text-gold"
            filterCategory="devlog"
            onFilter={() => setActiveCategory("devlog")}
          />
        </div>
      )}

      {/* Results count when filtered */}
      {hasFilters && (
        <p className="text-xs text-muted-foreground mb-4">
          {sorted.length} {sorted.length === 1 ? "artigo encontrado" : "artigos encontrados"}
          {activeCategory && ` em ${BLOG_CATEGORIES[activeCategory]}`}
          <button
            type="button"
            onClick={() => { setQuery(""); setActiveCategory(null); setLangFilter("all"); }}
            className="ml-2 text-gold/70 hover:text-gold hover:underline"
          >
            Limpar
          </button>
        </p>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">Nenhum artigo encontrado.</p>
          <button
            type="button"
            onClick={() => { setQuery(""); setActiveCategory(null); setLangFilter("all"); }}
            className="mt-3 text-gold text-sm hover:underline"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <>
          {/* ─── Todos os Posts ─── */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-gradient-to-r from-white/[0.08] to-transparent" />
            <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest font-medium">
              {hasFilters ? "Resultados" : "Todos os artigos"}
            </span>
            <div className="flex-1 h-px bg-gradient-to-l from-white/[0.08] to-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularPosts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
