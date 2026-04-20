import Link from "next/link";
import Image from "next/image";
import {
  type FeatureKey,
  resolveFeatureHref,
  CATEGORY_CTA,
} from "@/lib/blog/feature-links";

/* ─── Shared styling helpers ───────────────────────────────────── */
export function Img({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="my-10 -mx-2 sm:mx-0 rounded-xl overflow-hidden border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      <Image
        src={src}
        alt={alt}
        width={1280}
        height={800}
        className="w-full h-auto"
        unoptimized
      />
      <figcaption className="text-[11px] text-muted-foreground/70 text-center py-2.5 px-4 bg-white/[0.02] border-t border-white/[0.04] italic">
        {alt}
      </figcaption>
    </figure>
  );
}
export function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-gold/90 underline underline-offset-2 decoration-gold/30 hover:text-gold hover:decoration-gold/60 transition-colors"
    >
      {children}
    </a>
  );
}
export function IntLink({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <Link
      href={`/blog/${slug}`}
      className="text-gold/90 underline underline-offset-2 decoration-gold/30 hover:text-gold hover:decoration-gold/60 transition-colors"
    >
      {children}
    </Link>
  );
}
export function ProdLink({
  href,
  feature,
  lang,
  children,
}: {
  href?: string;
  feature?: FeatureKey;
  lang?: "pt" | "en";
  children: React.ReactNode;
}) {
  const resolved = feature
    ? resolveFeatureHref(feature, lang ?? "pt")
    : href ?? "/try";
  return (
    <Link
      href={resolved}
      className="text-gold/90 underline underline-offset-2 decoration-gold/30 hover:text-gold hover:decoration-gold/60 transition-colors"
    >
      {children}
    </Link>
  );
}
export function H2({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-12 mb-5">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-1 h-6 rounded-full bg-gold/60" />
        <h2 className="font-display text-lg sm:text-xl text-gold">{children}</h2>
      </div>
      <div className="ml-4 h-px bg-gradient-to-r from-gold/15 to-transparent" />
    </div>
  );
}
export function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-display text-lg text-foreground mt-9 mb-3">{children}</h3>
  );
}
export function P({ children }: { children: React.ReactNode }) {
  return <p className="text-foreground/80 leading-[1.8] mb-5 text-[15px]">{children}</p>;
}
export function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-foreground/80 leading-[1.8] text-[15px]">
      <span className="text-gold/70 mt-[2px] shrink-0 text-xs">&#9670;</span>
      <span>{children}</span>
    </li>
  );
}
export function Ul({ children }: { children: React.ReactNode }) {
  return <ul className="space-y-3 mb-5 ml-1 pl-1">{children}</ul>;
}
export function Tip({
  children,
  linkHref,
  linkText,
}: {
  children: React.ReactNode;
  linkHref?: string;
  linkText?: string;
}) {
  return (
    <div className="rounded-xl border border-gold/25 bg-gold/[0.05] p-5 my-8 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-gold/50 rounded-l-xl" />
      <p className="text-sm text-foreground/85 leading-relaxed pl-3">
        <strong className="text-gold font-display text-xs uppercase tracking-wider">Dica do Mestre</strong>
        <br />
        <span className="mt-1 block">{children}</span>
        {linkHref && linkText && (
          <Link
            href={linkHref}
            className="mt-2 inline-flex items-center gap-1 text-gold/80 text-xs hover:text-gold transition-colors"
          >
            {linkText} <span aria-hidden="true">&rarr;</span>
          </Link>
        )}
      </p>
    </div>
  );
}
export function CTA({
  message,
  buttonText,
  href,
  category,
  lang = "pt",
}: {
  message?: string;
  buttonText?: string;
  href?: string;
  category?: string;
  lang?: "pt" | "en";
} = {}) {
  const preset = category ? CATEGORY_CTA[category]?.[lang] : undefined;
  const msg = message ?? preset?.msg ?? "Quer testar um combat tracker gratuito agora?";
  const btn = buttonText ?? preset?.btn ?? "Experimentar o Pocket DM \u2192";
  const dest = href ?? preset?.href ?? "/try";
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-5 my-8 text-center">
      <p className="text-sm text-foreground/70 mb-3">{msg}</p>
      <Link
        href={dest}
        className="inline-flex items-center gap-1 bg-gold text-surface-primary font-semibold px-5 py-2.5 rounded-lg text-sm hover:shadow-gold-glow transition-all duration-200"
      >
        {btn}
      </Link>
    </div>
  );
}

/* ─── Visual enrichment helpers ───────────────────────────────── */

/**
 * FloatingArt — decorative character PNG positioned at the edge of a
 * text section, low opacity, like RPG book margin illustrations.
 * `side` controls left/right placement.  Hidden on mobile (<md).
 */
export function FloatingArt({
  src,
  alt,
  side = "right",
}: {
  src: string;
  alt: string;
  side?: "left" | "right";
}) {
  return (
    <div
      className={`hidden md:block pointer-events-none select-none absolute top-0 ${
        side === "right" ? "-right-16 xl:-right-24" : "-left-16 xl:-left-24"
      } w-[220px] xl:w-[260px] h-full`}
      aria-hidden="true"
    >
      <div className="sticky top-32">
        <Image
          src={src}
          alt={alt}
          width={260}
          height={400}
          className={`w-full h-auto opacity-[0.07] ${
            side === "left" ? "-scale-x-100" : ""
          }`}
          unoptimized
        />
      </div>
    </div>
  );
}

/**
 * SectionDivider — thematic break between major sections with a
 * character silhouette at very low opacity behind a gradient fade.
 */
export function SectionDivider({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="relative my-14 flex flex-col items-center" aria-hidden="true">
      {/* Top line */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-gold/15 to-transparent mb-4" />
      {/* Character — clean, no extra effects */}
      <Image
        src={src}
        alt={alt}
        width={400}
        height={500}
        className="w-56 sm:w-72 md:w-80 h-auto object-contain opacity-60"
        unoptimized
      />
      {/* Bottom diamond line */}
      <div className="flex items-center gap-3 mt-4 w-full">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold/20" />
        <span className="text-gold/25 text-[10px]">&#9670;</span>
        <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold/20" />
      </div>
    </div>
  );
}

/**
 * ArtCallout — a highlighted box with a character image on one side
 * and rich text content on the other (like an NPC quote or feature
 * highlight).  Stacks vertically on mobile.
 */
export function ArtCallout({
  src,
  alt,
  children,
  side = "left",
}: {
  src: string;
  alt: string;
  children: React.ReactNode;
  side?: "left" | "right";
}) {
  return (
    <div
      className={`my-10 rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden flex flex-col ${
        side === "right" ? "md:flex-row-reverse" : "md:flex-row"
      }`}
    >
      <div className="relative w-full md:w-40 lg:w-48 shrink-0 flex items-center justify-center py-6 md:py-0">
        <div className="absolute inset-0 bg-gradient-to-b md:bg-gradient-to-r from-gold/[0.04] to-transparent" />
        <Image
          src={src}
          alt={alt}
          width={180}
          height={280}
          className="relative w-auto h-28 md:h-40 lg:h-48 object-contain opacity-60"
          unoptimized
        />
      </div>
      <div className="flex-1 p-5 md:p-6 flex flex-col justify-center text-foreground/80 text-[15px] leading-[1.8] [&>p]:mb-0">
        {children}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   BLOG POST 1 — Como Usar um Combat Tracker na Mesa de D&D 5e
   ═══════════════════════════════════════════════════════════════════ */
