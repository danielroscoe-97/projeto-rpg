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

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ─── Featured Hero Card ─────────────────────────────────── */
function FeaturedCard({ post }: { post: BlogPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group block mb-10">
      <div className="relative w-full aspect-[3/1] rounded-2xl overflow-hidden mb-5">
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
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
      </div>
      <div className="max-w-2xl">
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-[11px] font-semibold uppercase tracking-widest ${CATEGORY_COLORS[post.category]}`}>
            {BLOG_CATEGORIES[post.category]}
          </span>
          <span className="text-[11px] text-foreground/50">{formatDate(post.date)}</span>
        </div>
        <h2 className="font-display text-2xl sm:text-3xl text-foreground group-hover:text-gold transition-colors duration-200 leading-tight mb-2">
          {post.title}
        </h2>
        <p className="text-[15px] text-foreground/65 leading-relaxed line-clamp-2">
          {post.description}
        </p>
      </div>
    </Link>
  );
}

/* ─── Large Card (2-column recent) ───────────────────────── */
function LargeCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 overflow-hidden h-full"
    >
      <div className="relative w-full aspect-[16/9] overflow-hidden">
        {post.image && (
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-[10px] font-semibold uppercase tracking-widest ${CATEGORY_COLORS[post.category]}`}>
            {BLOG_CATEGORIES[post.category]}
          </span>
          {getPostLang(post.slug) === "en" && (
            <span className="text-[9px] font-bold text-sky-400/60 uppercase">EN</span>
          )}
        </div>
        <h3 className="font-display text-lg text-foreground group-hover:text-gold transition-colors duration-200 leading-snug mb-2 flex-1">
          {post.title}
        </h3>
        <p className="text-[13px] text-foreground/60 leading-relaxed line-clamp-2 mb-3">
          {post.description}
        </p>
        <div className="flex items-center gap-2 text-[11px] text-foreground/45">
          <span>{formatDate(post.date)}</span>
          <span className="text-foreground/25">&middot;</span>
          <span>{post.readingTime}</span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Standard Card (3-column grid) ──────────────────────── */
function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col h-full rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all duration-300 overflow-hidden"
    >
      <div className="relative w-full aspect-[16/10] overflow-hidden">
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
      <div className="flex flex-col flex-1 p-4">
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-[10px] font-semibold uppercase tracking-widest ${CATEGORY_COLORS[post.category]}`}>
            {BLOG_CATEGORIES[post.category]}
          </span>
          {getPostLang(post.slug) === "en" && (
            <span className="text-[9px] font-bold text-sky-400/60 uppercase">EN</span>
          )}
        </div>
        <h3 className="font-display text-[15px] text-foreground group-hover:text-gold transition-colors duration-200 leading-snug mb-2 flex-1">
          {post.title}
        </h3>
        <div className="flex items-center gap-2 text-[11px] text-foreground/45">
          <span>{formatDate(post.date)}</span>
          <span className="text-foreground/25">&middot;</span>
          <span>{post.readingTime}</span>
        </div>
      </div>
    </Link>
  );
}

/* ─── Horizontal Card (sidebar/list style) ───────────────── */
function HorizontalCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex gap-4 items-start py-4 border-b border-white/[0.04] last:border-b-0 hover:bg-white/[0.02] -mx-3 px-3 rounded-lg transition-colors"
    >
      <div className="relative w-24 h-16 sm:w-28 sm:h-[72px] rounded-lg overflow-hidden shrink-0">
        {post.image && (
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="120px"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <span className={`text-[9px] font-semibold uppercase tracking-widest ${CATEGORY_COLORS[post.category]}`}>
          {BLOG_CATEGORIES[post.category]}
        </span>
        <h4 className="text-[14px] text-foreground/90 group-hover:text-gold transition-colors leading-snug mt-0.5 line-clamp-2">
          {post.title}
        </h4>
        <span className="text-[10px] text-foreground/45 mt-1 block">{post.readingTime}</span>
      </div>
    </Link>
  );
}

/* ─── Section Header ─────────────────────────────────────── */
function SectionHeader({ title, action }: { title: string; action?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="font-display text-lg text-foreground">{title}</h2>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="text-[11px] text-foreground/45 hover:text-foreground/60 transition-colors"
        >
          {action.label} &rarr;
        </button>
      )}
    </div>
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

  // Layout sections (only when no filters active)
  const featuredPost = !hasFilters ? sorted.find((p) => p.pinned) : undefined;
  const nonFeatured = featuredPost ? sorted.filter((p) => p !== featuredPost) : sorted;
  const recentPosts = !hasFilters ? nonFeatured.slice(0, 2) : [];
  const guides = !hasFilters ? nonFeatured.filter((p) => p.category === "tutorial" || p.category === "guia").slice(0, 4) : [];
  const guideSlugs = new Set(guides.map((p) => p.slug));
  const recentSlugs = new Set(recentPosts.map((p) => p.slug));
  const remainingPosts = !hasFilters
    ? nonFeatured.filter((p) => !recentSlugs.has(p.slug) && !guideSlugs.has(p.slug))
    : sorted;

  return (
    <div>
      {/* ─── Search + Filters ─── */}
      <div className="py-4 mb-8">
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
            className="w-full h-10 pl-10 pr-4 rounded-lg bg-white/[0.04] border border-white/[0.06] text-sm text-foreground placeholder:text-foreground/45 focus:outline-none focus:border-white/[0.15] focus:bg-white/[0.06] transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
              !activeCategory
                ? "bg-foreground/10 text-foreground"
                : "text-foreground/45 hover:text-foreground/70"
            }`}
          >
            Todos
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                activeCategory === cat
                  ? "bg-foreground/10 text-foreground"
                  : "text-foreground/45 hover:text-foreground/70"
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
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
                    langFilter === l
                      ? "bg-foreground/10 text-foreground"
                      : "text-foreground/45 hover:text-foreground/70"
                  }`}
                >
                  {l === "all" ? "Todos" : l.toUpperCase()}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* ─── Filtered Results ─── */}
      {hasFilters && (
        <>
          <p className="text-xs text-foreground/45 mb-6">
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
          {sorted.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-foreground/45 text-sm">Nenhum artigo encontrado.</p>
              <button
                type="button"
                onClick={() => { setQuery(""); setActiveCategory(null); setLangFilter("all"); }}
                className="mt-3 text-foreground/50 text-sm hover:text-foreground underline underline-offset-2"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {sorted.map((post) => (
                <PostCard key={post.slug} post={post} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ─── Home Layout (no filters) ─── */}
      {!hasFilters && (
        <>
          {/* 1. Featured Post */}
          {featuredPost && <FeaturedCard post={featuredPost} />}

          {/* 2. Recent — 2 large cards */}
          {recentPosts.length > 0 && (
            <section className="mb-12">
              <SectionHeader title="Recentes" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {recentPosts.map((post) => (
                  <LargeCard key={post.slug} post={post} />
                ))}
              </div>
            </section>
          )}

          {/* 3. Guides + Sidebar */}
          {guides.length > 0 && (
            <section className="mb-12">
              <SectionHeader
                title="Guias & Tutoriais"
                action={{ label: "Ver todos", onClick: () => setActiveCategory("tutorial") }}
              />
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
                {/* Main: 2-col grid of guides */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {guides.slice(0, 4).map((post) => (
                    <PostCard key={post.slug} post={post} />
                  ))}
                </div>
                {/* Sidebar: quick links */}
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                  <h3 className="text-[11px] font-semibold uppercase tracking-widest text-foreground/40 mb-4">
                    Populares
                  </h3>
                  {nonFeatured.slice(0, 5).map((post) => (
                    <HorizontalCard key={post.slug} post={post} />
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* 4. Remaining posts */}
          {remainingPosts.length > 0 && (
            <section>
              <SectionHeader title="Mais artigos" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {remainingPosts.map((post) => (
                  <PostCard key={post.slug} post={post} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
