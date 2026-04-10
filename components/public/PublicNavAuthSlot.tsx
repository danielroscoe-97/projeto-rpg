"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LandingLoggedInNav } from "@/components/marketing/LandingLoggedInNav";

interface Props {
  locale?: "en" | "pt-BR";
}

const LABELS = {
  en: { tryFree: "Try Free", signUp: "Sign Up" },
  "pt-BR": { tryFree: "Testar Grátis", signUp: "Cadastrar" },
} as const;

function LoggedOutButtons({ locale = "en" }: Props) {
  const l = LABELS[locale];
  return (
    <>
      <Link
        href="/try"
        className="hidden sm:inline-flex items-center gap-1.5 rounded-md bg-gold px-3 py-1.5 text-white text-sm font-semibold hover:bg-gold/90 transition-colors"
      >
        {l.tryFree}
      </Link>
      <Link
        href="/auth/sign-up"
        className="inline-flex items-center gap-1.5 rounded-md border border-gold/30 px-3 py-1.5 text-gold text-sm font-semibold hover:bg-gold/10 transition-colors"
      >
        {l.signUp}
      </Link>
    </>
  );
}

export function PublicNavAuthSlot({ locale = "en" }: Props) {
  const [auth, setAuth] = useState<{
    loggedIn: boolean;
    name: string;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user && !session.user.is_anonymous) {
        setAuth({
          loggedIn: true,
          name:
            (session.user.user_metadata?.display_name as string | null) ??
            session.user.email?.split("@")[0] ??
            (locale === "pt-BR" ? "Mestre" : "User"),
        });
      } else {
        setAuth({ loggedIn: false, name: "" });
      }
    });
  }, [locale]);

  if (auth?.loggedIn) {
    return <LandingLoggedInNav displayName={auth.name} />;
  }

  return <LoggedOutButtons locale={locale} />;
}
