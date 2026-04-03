import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function Footer() {
  const t = await getTranslations("nav");
  return (
    <footer className="border-t border-border bg-surface-primary py-10 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/art/brand/logo-icon.svg" alt="" width={22} height={22} className="opacity-80 drop-shadow-[0_0_6px_rgba(212,168,83,0.3)]" aria-hidden="true" />
              <span className="font-display text-gold text-lg">{t("footer_brand")}</span>
            </div>
            <p className="text-muted-foreground text-xs mt-1">
              {t("footer_subtitle")}
            </p>
          </div>

          {/* Links */}
          <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link
              href="/about"
              className="text-muted-foreground hover:text-foreground transition-all duration-[250ms] min-h-[44px] inline-flex items-center"
            >
              {t("footer_about")}
            </Link>
            <Link
              href="/faq"
              className="text-muted-foreground hover:text-foreground transition-all duration-[250ms] min-h-[44px] inline-flex items-center"
            >
              {t("footer_faq")}
            </Link>
            <Link
              href="/auth/sign-up"
              className="text-muted-foreground hover:text-foreground transition-all duration-[250ms] min-h-[44px] inline-flex items-center"
            >
              {t("footer_signup")}
            </Link>
            <Link
              href="/pricing"
              className="text-muted-foreground hover:text-foreground transition-all duration-[250ms] min-h-[44px] inline-flex items-center"
            >
              {t("footer_pricing")}
            </Link>
            <Link
              href="/legal/attribution"
              className="text-muted-foreground hover:text-foreground transition-all duration-[250ms] min-h-[44px] inline-flex items-center"
            >
              {t("attribution")}
            </Link>
            <Link
              href="/legal/privacy"
              className="text-muted-foreground hover:text-foreground transition-all duration-[250ms] min-h-[44px] inline-flex items-center"
            >
              {t("privacy")}
            </Link>
            <Link
              href="/legal/terms"
              className="text-muted-foreground hover:text-foreground transition-all duration-[250ms] min-h-[44px] inline-flex items-center"
            >
              {t("terms")}
            </Link>
          </nav>
        </div>

        {/* Attribution + copyright */}
        <div className="mt-8 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground/60">
          <p>&copy; {new Date().getFullYear()} {t("footer_brand")}</p>
          <p>
            {t("footer_srd_notice")}{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-muted-foreground transition-colors min-h-[44px] inline-flex items-center"
            >
              {t("footer_srd_license")}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
