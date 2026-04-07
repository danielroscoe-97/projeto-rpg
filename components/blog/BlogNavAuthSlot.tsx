"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LandingLoggedInNav } from "@/components/marketing/LandingLoggedInNav";

function LoggedOutButtons() {
  return (
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
  );
}

export function BlogNavAuthSlot() {
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
            "Mestre",
        });
      } else {
        setAuth({ loggedIn: false, name: "" });
      }
    });
  }, []);

  if (auth?.loggedIn) {
    return <LandingLoggedInNav displayName={auth.name} />;
  }

  return <LoggedOutButtons />;
}
