import Link from "next/link";
import { BLOG_POSTS } from "@/lib/blog/posts";

/**
 * Shows a link to the counterpart language version of a blog post.
 * Convention: English posts have slug ending in "-en".
 * PT slug = base, EN slug = base + "-en".
 */
export function BlogLanguageSwitcher({ slug }: { slug: string }) {
  const isEnglish = slug.endsWith("-en");
  const counterpartSlug = isEnglish ? slug.slice(0, -3) : `${slug}-en`;
  const counterpartExists = BLOG_POSTS.some((p) => p.slug === counterpartSlug);

  if (!counterpartExists) return null;

  return (
    <Link
      href={`/blog/${counterpartSlug}`}
      className="inline-flex items-center gap-1.5 mt-4 text-xs font-medium text-gold/70 hover:text-gold transition-colors duration-200 group"
    >
      {/* Globe icon */}
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.466.73-3.558"
        />
      </svg>
      <span className="group-hover:underline underline-offset-2">
        {isEnglish ? "Ver em Português" : "View in English"}
      </span>
    </Link>
  );
}
