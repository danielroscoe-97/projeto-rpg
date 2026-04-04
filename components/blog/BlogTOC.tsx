"use client";

import { useEffect, useState, useCallback } from "react";

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

export function BlogTOC() {
  const [items, setItems] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // Extract headings from article on mount
  useEffect(() => {
    const article = document.querySelector("article");
    if (!article) return;

    const headings = article.querySelectorAll("h2, h3");
    const tocItems: TOCItem[] = [];

    headings.forEach((h, i) => {
      // Generate ID if missing
      if (!h.id) {
        h.id = `section-${i}`;
      }
      tocItems.push({
        id: h.id,
        text: h.textContent?.trim() ?? "",
        level: h.tagName === "H2" ? 2 : 3,
      });
    });

    setItems(tocItems);
  }, []);

  // Track active heading on scroll
  const handleScroll = useCallback(() => {
    if (items.length === 0) return;

    const headingElements = items
      .map((item) => document.getElementById(item.id))
      .filter(Boolean) as HTMLElement[];

    // Find the heading that's currently at or above the viewport center
    let current = "";
    for (const el of headingElements) {
      const rect = el.getBoundingClientRect();
      if (rect.top <= 120) {
        current = el.id;
      }
    }
    setActiveId(current);
  }, [items]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  if (items.length < 2) return null;

  return (
    <nav className="hidden xl:block sticky top-24 w-56 shrink-0 self-start">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 mb-3">
        Neste artigo
      </p>
      <div className="relative">
        {/* Left line */}
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
                    document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    </nav>
  );
}
