import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/marketing/Footer";
import { BLOG_POSTS } from "@/lib/blog/posts";
import { BlogGrid } from "@/components/blog/BlogGrid";

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
        rightSlot={
          <>
            <Link
              href="/auth/login"
              className="text-muted-foreground hover:text-foreground transition-all duration-[250ms] min-h-[44px] inline-flex items-center text-sm"
            >
              Login
            </Link>
            <Link
              href="/try"
              className="bg-gold text-surface-primary font-semibold px-4 rounded-lg min-h-[44px] inline-flex items-center text-sm hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-[250ms]"
            >
              Testar Grátis
            </Link>
          </>
        }
      />

      <main className="flex-1 pt-[72px]">
        {/* Hero */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gold/[0.04] rounded-full blur-[100px]" />
          </div>

          <div className="relative max-w-5xl mx-auto px-6 pt-16 pb-6">
            <div className="flex items-center gap-3 mb-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/art/brand/logo-icon.svg"
                alt=""
                width={32}
                height={32}
                className="opacity-90 drop-shadow-[0_0_10px_rgba(212,168,83,0.4)]"
                aria-hidden="true"
              />
              <h1 className="font-display text-3xl md:text-4xl text-gold">
                Blog
              </h1>
            </div>
            <p className="text-muted-foreground max-w-lg text-[15px]">
              Guias, tutoriais e referências para mestres de D&D 5e. Conteúdo
              prático para melhorar suas sessões presenciais.
            </p>
          </div>
        </div>

        {/* Blog grid with filters */}
        <div className="max-w-5xl mx-auto px-6 pb-20">
          <BlogGrid posts={BLOG_POSTS} />
        </div>
      </main>

      <Footer />
    </div>
  );
}
