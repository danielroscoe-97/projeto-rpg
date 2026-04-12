import type { Metadata } from "next";
import { Footer } from "@/components/marketing/Footer";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { BlogGrid } from "@/components/blog/BlogGrid";
import { BlogNavbar } from "@/components/blog/BlogNavbar";

export const metadata: Metadata = {
  title: "Blog — Dicas para Mestres de D&D 5e",
  description:
    "Dicas, guias e tutoriais para mestres e jogadores de D&D 5e. Combat tracker, condições, ferramentas, e como agilizar suas sessões de RPG presencial.",
  keywords: [
    "blog D&D 5e",
    "dicas mestre RPG",
    "guia D&D",
    "ferramentas RPG",
    "combat tracker dicas",
    "como mestrar D&D",
  ],
  alternates: {
    canonical: "/blog",
    languages: { "pt-BR": "/blog", en: "/blog" },
  },
};

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <BlogNavbar />

      <main className="flex-1 pt-[72px]">
        {/* Header + Quick Nav */}
        <div className="max-w-6xl mx-auto px-6 pt-14 pb-2">
          <h1 className="font-display text-4xl md:text-5xl text-foreground tracking-tight mb-3">
            Blog
          </h1>
          <p className="text-foreground/60 max-w-lg text-lg leading-relaxed">
            Guias, tutoriais e referências para mestres de D&D 5e.
          </p>
        </div>

        {/* Blog grid */}
        <div className="max-w-6xl mx-auto px-6 pb-24">
          <BlogGrid posts={BLOG_POSTS} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
