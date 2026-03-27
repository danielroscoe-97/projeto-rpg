"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { captureError } from "@/lib/errors/capture";
import { Button } from "@/components/ui/button";
import { Swords, Shield, Users } from "lucide-react";

type UserRole = "player" | "dm" | "both";

interface RoleOption {
  value: UserRole;
  icon: React.ReactNode;
  labelKey: string;
}

const ROLE_OPTIONS: RoleOption[] = [
  { value: "player", icon: <Swords className="w-8 h-8" />, labelKey: "role_player" },
  { value: "dm", icon: <Shield className="w-8 h-8" />, labelKey: "role_dm" },
  { value: "both", icon: <Users className="w-8 h-8" />, labelKey: "role_both" },
];

interface RoleSelectionCardsProps {
  userId: string;
}

export function RoleSelectionCards({ userId }: RoleSelectionCardsProps) {
  const t = useTranslations("signup");
  const [selected, setSelected] = useState<UserRole>("both");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("users")
        .update({ role: selected })
        .eq("id", userId);
      if (error) throw error;
      router.push("/app/dashboard");
    } catch (err) {
      toast.error(t("role_save_error"));
      captureError(err, { component: "RoleSelectionCards", action: "saveRole", category: "database" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Default is 'both' — just navigate
    router.push("/app/dashboard");
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="font-display text-2xl text-foreground tracking-wide mb-2">
          {t("role_selection_title")}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t("role_selection_subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {ROLE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setSelected(option.value)}
            className={`flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 min-h-[120px] ${
              selected === option.value
                ? "border-gold bg-gold/10 text-gold"
                : "border-white/[0.08] bg-white/[0.02] text-muted-foreground hover:border-white/[0.15]"
            }`}
            data-testid={`role-card-${option.value}`}
          >
            {option.icon}
            <span className="text-sm font-medium">
              {t(option.labelKey as Parameters<typeof t>[0])}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <Button
          variant="gold"
          className="w-full min-h-[44px]"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? t("role_saving") : t("role_continue")}
        </Button>
        <button
          type="button"
          onClick={handleSkip}
          className="w-full text-sm text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          {t("role_skip")}
        </button>
      </div>
    </div>
  );
}
