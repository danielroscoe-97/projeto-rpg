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
  tutorial: "text-blue-400",
  guia: "text-emerald-400",
  lista: "text-amber-400",
  comparativo: "text-purple-400",
  build: "text-rose-400",
  devlog: "text-gold",
};

const CATEGORY_BG: Record<BlogCategory, string> = {
  tutorial: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  guia: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  lista: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  comparativo: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  build: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  devlog: "bg-gold/10 text-gold border-gold/20",
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ─── Featured Post (Notion-style hero) ──────────────────── */
function FeaturedCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group block mb-12"
    >
      {/* Image — large, rounded, prominent */}
      <div className="relative w-full aspect-[2.2/1] rounded-2xl overflow-hidden mb-5">
        {post.image && (
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-[1.02] transition-transform duration-700"
            sizes="100vw"
            priority
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
      </div>

      {/* Content — below image, clean */}
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-3">
          <span className={`text-[11px] font-semibold uppercase tracking-widest ${CATEGORY_COLORS[post.category]}`}>
            {BLOG_CATEGORIES[post.category]}
          </span>
          <span className="text-[11px] text-foreground/25">
            {formatDate(post.date)}
          </span>
        </div>
        <h2 className="font-display text-2xl sm:text-3xl text-foreground group-hover:text-gold transition-colors duration-200 leading-tight mb-3">
          {post.title}
        </h2>
        <p className="text-[15px] text-foreground/45 leading-relaxed line-clamp-2">
          {post.description}
        </p>
      </div>
    </Link>
  );
}

/* ─── Post Card (Notion/Framer style — image top, text bottom) ── */
function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col h-full"
    >
      {/* Image — rounded, clean */}
      <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden mb-4 bg-surface-primary/50">
        {post.image && (
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        )}
      </div>

      {/* Text — below image */}
      <div className="flex flex-col flex-1">
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-[10px] font-semibold uppercase tracking-widest ${CATEGORY_COLORS[post.category]}`}>
            {BLOG_CATEGORIES[post.category]}
          </span>
          {getPostLang(post.slug) === "en" && (
            <span className="text-[9px] font-bold text-sky-400/60 uppercase">EN</span>
          )}
        </div>
        <h3 className="font-display text-[16px] text-foreground/90 group-hover:text-gold transition-colors duration-200 leading-snug mb-2 flex-1">
          {post.title}
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-foreground/30">
          <span>{formatDate(post.date)}</span>
          <span className="text-foreground/15">&middot;</span>
          <span>{post.readingTime}</span>
        </div>
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
      {/* ─── Search + Filters ─── */}
      <div className="sticky top-[64px] z-20 -mx-6 px-6 py-4 bg-background/80 backdrop-blur-xl border-b border-white/[0.04] mb-10">
        <div className="relative mb-3">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/25 pointer-events-none"
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
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all whitespace-nowrap shrink-0 ${
              !activeCategory
                ? "bg-foreground/10 text-foreground"
                : "text-foreground/35 hover:text-foreground/60"
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all whitespace-nowrap shrink-0 ${
                activeCategory === cat
                  ? "bg-foreground/10 text-foreground"
                  : "text-foreground/35 hover:text-foreground/60"
              }`}
            >
              {BLOG_CATEGORIES[cat]}
            </button>
          ))}

          {hasMultipleLanguages && (
            <>
              <span className="w-px h-4 bg-white/[0.06] mx-1 shrink-0" />
              {(["all", "pt", "en"] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLangFilter(l)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all whitespace-nowrap shrink-0 ${
                    langFilter === l
                      ? "bg-foreground/10 text-foreground"
                      : "text-foreground/35 hover:text-foreground/60"
                  }`}
                >
                  {l === "all" ? "Todos" : l.toUpperCase()}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ─── Featured Post ─── */}
      {featuredPost && <FeaturedCard post={featuredPost} />}

      {/* Results count when filtered */}
      {hasFilters && (
        <p className="text-xs text-foreground/30 mb-6">
          {sorted.length} {sorted.length === 1 ? "artigo" : "artigos"}
          {activeCategory && ` em ${BLOG_CATEGORIES[activeCategory]}`}
          <button
            type="button"
            onClick={() => { setQuery(""); setActiveCategory(null); setLangFilter("all"); }}
            className="ml-2 text-foreground/50 hover:text-foreground underline underline-offset-2"
          >
            Limpar
          </button>
        </p>
      )}

      {sorted.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-foreground/30 text-sm">Nenhum artigo encontrado.</p>
          <button
            type="button"
            onClick={() => { setQuery(""); setActiveCategory(null); setLangFilter("all"); }}
            className="mt-3 text-foreground/50 text-sm hover:text-foreground underline underline-offset-2"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
          {regularPosts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      )}
    </div>
  );
}
