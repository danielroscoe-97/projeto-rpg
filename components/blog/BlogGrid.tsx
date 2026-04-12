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
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 flex flex-col">
      <button
        type="button"
        onClick={() => onFilter(filterCategory)}
        className="flex items-center gap-2 mb-3 group"
      >
        <span className="text-base">{icon}</span>
        <h2 className={`font-display text-sm tracking-wide ${accentClass} group-hover:brightness-125 transition-all`}>
          {title}
        </h2>
        <svg className="w-3 h-3 ml-auto text-muted-foreground/40 group-hover:text-foreground/60 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
      <div className="flex-1 space-y-1">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group/item flex items-start gap-2 py-1.5 px-2 -mx-2 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            <span className="text-gold/30 text-[8px] mt-[6px] shrink-0">&#9670;</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-foreground/75 group-hover/item:text-gold leading-snug transition-colors line-clamp-2">
                {post.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-muted-foreground/50">{post.readingTime}</span>
                {getPostLang(post.slug) === "en" && (
                  <span className="text-[8px] font-bold text-sky-400/60">EN</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ─── Compact Post Row (for grid below portal) ────────────── */
function PostRow({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex items-center gap-3 py-3 px-3 -mx-3 rounded-lg hover:bg-white/[0.03] transition-colors border-b border-white/[0.03] last:border-b-0"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <CategoryBadge category={post.category} />
          <LangBadge slug={post.slug} />
        </div>
        <h3 className="text-[14px] text-foreground/80 group-hover:text-gold transition-colors leading-snug">
          {post.title}
        </h3>
      </div>
      <div className="shrink-0 text-right">
        <span className="text-[11px] text-muted-foreground">{post.readingTime}</span>
        <p className="text-[10px] text-muted-foreground/50">{formatDate(post.date)}</p>
      </div>
    </Link>
  );
}

/* ─── Post Card (grid items) — with thumbnail ───────────── */
function PostCard({ post }: { post: BlogPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.015] hover:border-gold/20 hover:bg-white/[0.03] transition-all duration-300 h-full overflow-hidden"
    >
      {post.image && (
        <div className="relative w-full aspect-[16/9] overflow-hidden bg-black/20">
          <Image
            src={post.image}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>
      )}
      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-2">
          <CategoryBadge category={post.category} />
          <LangBadge slug={post.slug} />
          <span className="text-[10px] text-muted-foreground ml-auto">{post.readingTime}</span>
        </div>
        <h3 className="font-display text-[14px] text-foreground group-hover:text-gold transition-colors duration-200 mb-1.5 leading-snug flex-1">
          {post.title}
        </h3>
        <p className="text-[11px] text-foreground/45 leading-relaxed line-clamp-2">
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

  return (
    <div>
      {/* ─── Search + Filters (sticky on mobile) ─── */}
      <div className="sticky top-[64px] z-20 -mx-6 px-6 py-3 bg-[#0a0a0f]/95 backdrop-blur-md border-b border-white/[0.04] mb-6">
        <div className="relative mb-3">
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

      {/* ─── Wiki Portal ─── */}
      {!hasFilters && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
        <p className="text-xs text-muted-foreground mb-3">
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
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm">Nenhum artigo encontrado.</p>
          <button
            type="button"
            onClick={() => { setQuery(""); setActiveCategory(null); setLangFilter("all"); }}
            className="mt-2 text-gold text-sm hover:underline"
          >
            Limpar filtros
          </button>
        </div>
      ) : (
        <>
          {/* ─── Todos os Posts ─── */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-gradient-to-r from-white/[0.06] to-transparent" />
            <span className="text-[10px] text-muted-foreground/50 uppercase tracking-widest">
              {hasFilters ? "Resultados" : "Todos os artigos"}
            </span>
            <div className="flex-1 h-px bg-gradient-to-l from-white/[0.06] to-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sorted.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
