import type { Metadata } from "next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { BlogGrid } from "@/components/blog/BlogGrid";
import { BlogNavAuthSlot } from "@/components/blog/BlogNavAuthSlot";

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
      <Navbar
        brand="Pocket DM"
        brandHref="/"
        links={[
          { href: "/blog", label: "Blog" },
          { href: "/monstros", label: "Monstros" },
          { href: "/magias", label: "Magias" },
          { href: "/pricing", label: "Preços" },
        ]}
        rightSlot={<BlogNavAuthSlot />}
      />

      <main className="flex-1 pt-[72px]">
        {/* Header — minimal Notion-style */}
        <div className="max-w-5xl mx-auto px-6 pt-16 pb-2">
          <h1 className="font-display text-4xl md:text-5xl text-foreground tracking-tight mb-3">
            Blog
          </h1>
          <p className="text-foreground/40 max-w-lg text-[15px] leading-relaxed">
            Guias, tutoriais e referências para mestres de D&D 5e.
          </p>
        </div>

        {/* Blog grid with filters */}
        <div className="max-w-5xl mx-auto px-6 pb-24">
          <BlogGrid posts={BLOG_POSTS} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
