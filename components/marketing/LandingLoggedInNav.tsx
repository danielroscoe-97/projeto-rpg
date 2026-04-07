"use client";

import Link from "next/link";
import { ChevronDown, LayoutDashboard, Swords, Users, LogOut, ArrowRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useRoleStore } from "@/lib/stores/role-store";
import { useSubscriptionStore } from "@/lib/stores/subscription-store";

interface Props {
  displayName: string;
}

export function LandingLoggedInNav({ displayName }: Props) {
  const router = useRouter();
  const resetRole = useRoleStore((s) => s.reset);
  const resetSubscription = useSubscriptionStore((s) => s.reset);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    resetRole();
    resetSubscription();
    router.push("/");
    router.refresh();
  };

  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="group text-muted-foreground hover:text-foreground transition-all duration-[200ms] min-h-[44px] inline-flex items-center gap-1.5 text-sm px-2 rounded-lg hover:bg-white/[0.06]"
          >
            <span className="w-6 h-6 rounded-full bg-gold/20 border border-gold/30 inline-flex items-center justify-center text-gold text-xs font-bold shrink-0">
              {initial}
            </span>
            <span className="max-w-[120px] truncate">{displayName}</span>
            <ChevronDown className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="bg-surface-secondary border-white/10 shadow-xl backdrop-blur-none w-48"
        >
          <DropdownMenuItem asChild>
            <Link
              href="/app/dashboard/campaigns"
              className="flex items-center gap-2 text-foreground/80 hover:text-foreground"
            >
              <LayoutDashboard className="w-4 h-4 opacity-60" />
              Campanhas
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href="/app/dashboard/combats"
              className="flex items-center gap-2 text-foreground/80 hover:text-foreground"
            >
              <Swords className="w-4 h-4 opacity-60" />
              Combates
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href="/app/dashboard/characters"
              className="flex items-center gap-2 text-foreground/80 hover:text-foreground"
            >
              <Users className="w-4 h-4 opacity-60" />
              Personagens
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/[0.08]" />
          <DropdownMenuItem
            onClick={handleLogout}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <LogOut className="w-4 h-4 opacity-60" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Link
        href="/app/dashboard"
        className="group bg-gold text-surface-primary font-semibold px-4 rounded-lg min-h-[44px] inline-flex items-center gap-1.5 text-sm hover:shadow-gold-glow hover:-translate-y-[1px] active:translate-y-0 transition-all duration-[200ms]"
      >
        Dashboard
        <ArrowRight className="w-3.5 h-3.5 opacity-80 group-hover:translate-x-0.5 transition-transform duration-200" />
      </Link>
    </div>
  );
}
