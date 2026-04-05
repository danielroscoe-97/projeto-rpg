import { getTranslations } from "next-intl/server";
import { AuthPageContent } from "@/components/auth/AuthPageContent";

export default async function Page() {
  const t = await getTranslations("auth");

  return (
    <div className="flex flex-1 w-full items-start justify-center px-4 pt-6 md:px-6 md:pt-8">
      <div className="w-full max-w-lg">
        {/* Heading — Liberty RO style */}
        <div className="text-center mb-4">
          <h1 className="font-display text-3xl md:text-4xl text-foreground tracking-wide">
            {t("signup_heading_prefix")}{" "}
            <span className="text-gold">{t("signup_heading_accent")}</span>
          </h1>
          {/* Ornamental divider */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-gold/40" />
            <div className="w-2 h-2 rounded-full bg-gold/60" />
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-gold/40" />
          </div>
        </div>

        <AuthPageContent defaultTab="signup" />
      </div>
    </div>
  );
}
