import Link from "next/link";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface-primary py-10 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              <Image src="/art/icons/pet-poring.png" alt="" width={22} height={22} className="pixel-art opacity-60" aria-hidden="true" unoptimized />
              <span className="font-display text-gold text-lg">Taverna do Mestre</span>
            </div>
            <p className="text-muted-foreground text-xs mt-1">
              Combat tracker para mestres de D&D 5e
            </p>
          </div>

          {/* Links */}
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link
              href="/auth/sign-up"
              className="text-muted-foreground hover:text-foreground transition-all duration-[250ms] min-h-[44px] inline-flex items-center"
            >
              Criar Conta
            </Link>
            <Link
              href="/legal/attribution"
              className="text-muted-foreground hover:text-foreground transition-all duration-[250ms] min-h-[44px] inline-flex items-center"
            >
              Attribution
            </Link>
            <Link
              href="/legal/privacy"
              className="text-muted-foreground hover:text-foreground transition-all duration-[250ms] min-h-[44px] inline-flex items-center"
            >
              Privacidade
            </Link>
          </nav>
        </div>

        {/* Attribution + copyright */}
        <div className="mt-8 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground/60">
          <p>&copy; {new Date().getFullYear()} Taverna do Mestre</p>
          <p>
            Uses the System Reference Document 5.1 and 5.2 under the{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-muted-foreground transition-colors"
            >
              CC-BY-4.0 License
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
