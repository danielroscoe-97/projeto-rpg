"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { BlogPost, BlogCategory } from "@/lib/blog/posts";
import { BLOG_CATEGORIES } from "@/lib/blog/posts";

type LangFilter = "all" | "pt" | "en";

/** Determine post language from slug convention: -en suffix = English, otherwise Portuguese */
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

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
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

/* ─── Featured Card (latest post) ───────────────────────────── */
function FeaturedCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block rounded-xl border border-gold/15 bg-gradient-to-br from-gold/[0.04] to-transparent p-6 sm:p-8 hover:border-gold/30 hover:from-gold/[0.07] transition-all duration-300"
    >
      <div className="flex items-center gap-3 mb-3">
        {post.pinned && (
          <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border bg-gold/20 text-gold border-gold/30">
            Fixo
          </span>
        )}
        <CategoryBadge category={post.category} />
        <LangBadge slug={post.slug} />
        <span className="text-xs text-muted-foreground">{formatDate(post.date)}</span>
        <span className="text-xs text-muted-foreground">·</span>
        <span className="text-xs text-muted-foreground">{post.readingTime}</span>
      </div>
      <h2 className="font-display text-xl sm:text-2xl text-foreground group-hover:text-gold transition-colors duration-200 mb-3 leading-tight">
        {post.title}
      </h2>
      <p className="text-sm text-foreground/55 leading-relaxed max-w-2xl">
        {post.description}
      </p>
      <div className="mt-4 flex items-center gap-1.5 text-gold/70 text-sm font-medium group-hover:text-gold transition-colors">
        Ler artigo
        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
        </svg>
      </div>
    </Link>
  );
}

/* ─── Post Card (grid items) ─────────────────────────────── */
function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.015] p-5 hover:border-gold/20 hover:bg-white/[0.03] transition-all duration-300 h-full"
    >
      <div className="flex items-center gap-2 mb-3">
        <CategoryBadge category={post.category} />
        <LangBadge slug={post.slug} />
        <span className="text-[11px] text-muted-foreground ml-auto">{post.readingTime}</span>
      </div>
      <h3 className="font-display text-[15px] text-foreground group-hover:text-gold transition-colors duration-200 mb-2 leading-snug flex-1">
        {post.title}
      </h3>
      <p className="text-xs text-foreground/50 leading-relaxed line-clamp-2 mb-3">
        {post.description}
      </p>
      <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/[0.04]">
        <time className="text-[11px] text-muted-foreground" dateTime={post.date}>
          {formatDate(post.date)}
        </time>
        <span className="text-xs text-gold/50 group-hover:text-gold/80 transition-colors">
          Ler &rarr;
        </span>
      </div>
    </Link>
  );
}

/* ─── Main Grid ──────────────────────────────────────────── */
export function BlogGrid({ posts }: { posts: BlogPost[] }) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<BlogCategory | null>(null);
  const [langFilter, setLangFilter] = useState<LangFilter>("all");

  // Language detection removed — default is "all", user filters manually

  const categories = useMemo(() => {
    const cats = new Set(posts.map((p) => p.category));
    return Array.from(cats) as BlogCategory[];
  }, [posts]);

  // Check if there are posts in multiple languages (to decide whether to show the filter)
  const hasMultipleLanguages = useMemo(() => {
    const langs = new Set(posts.map((p) => getPostLang(p.slug)));
    return langs.size > 1;
  }, [posts]);

  const filtered = useMemo(() => {
    let result = posts;
    // Language filter
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

  // Sort: pinned first, then by date descending
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return b.date.localeCompare(a.date);
      }),
    [filtered]
  );

  const [featured, ...rest] = sorted;
  const hasFilters = !!(query || activeCategory || langFilter !== "all");

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        {/* Search */}
        <div className="relative flex-1">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50 pointer-events-none"
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
            className="w-full h-10 pl-9 pr-4 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/30 transition-colors"
          />
        </div>

        {/* Category chips + language toggle */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-gold/15 text-gold border border-gold/25"
                  : "bg-white/[0.04] text-muted-foreground border border-white/[0.06] hover:text-foreground hover:border-white/[0.12]"
              }`}
            >
              {BLOG_CATEGORIES[cat]}
            </button>
          ))}

          {/* Language toggle */}
          {hasMultipleLanguages && (
            <>
              <span className="w-px h-5 bg-white/[0.08] mx-1 hidden sm:block" />
              {(["all", "pt", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLangFilter(l)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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

      {/* Results count when filtered */}
      {hasFilters && (
        <p className="text-xs text-muted-foreground mb-4">
          {sorted.length} {sorted.length === 1 ? "artigo encontrado" : "artigos encontrados"}
          {activeCategory && ` em ${BLOG_CATEGORIES[activeCategory]}`}
        </p>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">Nenhum artigo encontrado.</p>
          <button
            type="button"
            onClick={() => { setQuery(""); setActiveCategory(null); setLangFilter("all"); }}
            className="mt-3 text-gold text-sm hover:underline"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Featured post */}
          {featured && !hasFilters && <FeaturedCard post={featured} />}

          {/* Grid */}
          {(hasFilters ? sorted : rest).length > 0 && (
            <>
              {!hasFilters && (
                <div className="flex items-center gap-3 pt-2">
                  <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
                  <span className="text-[11px] text-muted-foreground/50 uppercase tracking-widest">
                    Mais artigos
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-l from-white/[0.06] to-transparent" />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(hasFilters ? sorted : rest).map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
