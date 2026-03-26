import { getTranslations } from "next-intl/server";
import { AuthPageContent } from "@/components/auth/AuthPageContent";

export default async function Page() {
  const t = await getTranslations("auth");

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-4xl">
        {/* Heading — Liberty RO style */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl md:text-4xl text-foreground tracking-wide">
            {t("page_heading_prefix")}{" "}
            <span className="text-gold">{t("page_heading_accent")}</span>
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
