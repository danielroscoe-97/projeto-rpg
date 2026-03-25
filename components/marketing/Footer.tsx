import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#13131e] py-8 px-6">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-white/50">
        <p>© {new Date().getFullYear()} Taverna do Mestre</p>
        <nav aria-label="Legal pages" className="flex gap-6">
          <Link
            href="/legal/attribution"
            className="hover:text-white transition-colors min-h-[44px] inline-flex items-center"
          >
            Attribution
          </Link>
          <Link
            href="/legal/privacy"
            className="hover:text-white transition-colors min-h-[44px] inline-flex items-center"
          >
            Privacy Policy
          </Link>
        </nav>
      </div>
      <div className="max-w-4xl mx-auto mt-4 text-xs text-white/30 text-center">
        This product uses the System Reference Document 5.1 and 5.2, available
        under the{" "}
        <a
          href="https://creativecommons.org/licenses/by/4.0/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-white/50"
        >
          Creative Commons Attribution 4.0 International License
        </a>
        .
      </div>
    </footer>
  );
}
