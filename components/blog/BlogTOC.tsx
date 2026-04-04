"use client";

import { useEffect, useState } from "react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Shared hook: extract headings from <article> and track active via IntersectionObserver */
function useTOC() {
  const [items, setItems] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const article = document.querySelector("article");
    if (!article) return;

    const headings = article.querySelectorAll("h2, h3");
    const tocItems: TOCItem[] = [];

    headings.forEach((h, i) => {
      if (!h.id) {
        h.id = slugify(h.textContent || "") || `section-${i}`;
      }
      tocItems.push({
        id: h.id,
        text: h.textContent?.trim() ?? "",
        level: h.tagName === "H2" ? 2 : 3,
      });
    });

    setItems(tocItems);
  }, []);

  // Track active heading via IntersectionObserver
  useEffect(() => {
    if (items.length === 0) return;

    const headingElements = items
      .map((item) => document.getElementById(item.id))
      .filter(Boolean) as HTMLElement[];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "0px 0px -66% 0px" } // Active when in upper 1/3 of viewport
    );

    headingElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  return { items, activeId };
}

/** Renders the list of TOC links (reused in desktop sidebar + mobile sheet) */
function TOCList({
  items,
  activeId,
  onNavigate,
}: {
  items: TOCItem[];
  activeId: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="relative">
      <div className="absolute left-0 top-0 bottom-0 w-px bg-white/[0.06]" />
      <ul className="space-y-0.5">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(item.id);
                  if (el) {
                    const navHeight = 80;
                    const top = el.getBoundingClientRect().top + window.scrollY - navHeight - 16;
                    window.scrollTo({ top, behavior: "smooth" });
                  }
                  onNavigate?.();
                }}
                className={`block text-[12px] leading-relaxed py-1 border-l-2 transition-all duration-200 ${
                  item.level === 3 ? "pl-5" : "pl-3"
                } ${
                  isActive
                    ? "border-gold text-gold/90 font-medium"
                    : "border-transparent text-muted-foreground/50 hover:text-muted-foreground/80 hover:border-white/[0.15]"
                }`}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─── Desktop sidebar TOC (xl+) ─────────────────────────────── */
export function BlogTOC() {
  const { items, activeId } = useTOC();

  if (items.length < 2) return null;

  return (
    <nav aria-label="Table of contents" className="hidden xl:block sticky top-24 w-56 shrink-0 self-start">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">
        Neste artigo
      </p>
      <TOCList items={items} activeId={activeId} />
    </nav>
  );
}

/* ─── Mobile floating TOC button + bottom sheet (below xl) ──── */
export function BlogTOCMobile() {
  const { items, activeId } = useTOC();
  const [open, setOpen] = useState(false);

  // Hide after scrolling past all content (near footer)
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onScroll = () => {
      const article = document.querySelector("article");
      if (!article) return;
      const rect = article.getBoundingClientRect();
      // Hide when article bottom is above viewport
      setVisible(rect.bottom > 100);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (items.length < 2) return null;

  return (
    <div className={`xl:hidden ${visible ? "" : "pointer-events-none opacity-0"} transition-opacity duration-300`}>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-surface-primary/80 border border-gold/25 px-4 py-2.5 shadow-lg shadow-black/30 backdrop-blur-sm hover:border-gold/40 hover:bg-surface-primary/95 transition-all duration-200 opacity-70 hover:opacity-100"
            aria-label="Abrir índice do artigo"
          >
            {/* List icon */}
            <svg
              className="w-4 h-4 text-gold"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0ZM3.75 12h.007v.008H3.75V12Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-.375 5.25h.007v.008H3.75v-.008Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
              />
            </svg>
            <span className="text-xs font-medium text-gold/90">Índice</span>
          </button>
        </SheetTrigger>

        <SheetContent side="bottom" className="bg-surface-primary border-gold/10">
          <SheetHeader className="text-left pb-4 border-b border-white/[0.06]">
            <SheetTitle className="text-gold text-sm font-display">
              Neste artigo
            </SheetTitle>
          </SheetHeader>
          <nav className="pt-4 pb-2 max-h-[50vh] overflow-y-auto">
            <TOCList
              items={items}
              activeId={activeId}
              onNavigate={() => setOpen(false)}
            />
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
