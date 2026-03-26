"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { LoginForm } from "@/components/login-form";
import { SignUpForm } from "@/components/sign-up-form";

interface AuthPageContentProps {
  defaultTab: "login" | "signup";
}

export function AuthPageContent({ defaultTab }: AuthPageContentProps) {
  const t = useTranslations("auth");
  const [activeTab, setActiveTab] = useState<"login" | "signup">(defaultTab);

  return (
    <>
      {/* Mobile tab switcher — only visible below md */}
      <div className="md:hidden flex rounded-lg bg-white/[0.04] border border-white/[0.08] p-1 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab("login")}
          className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-200 min-h-[44px] ${
            activeTab === "login"
              ? "bg-gold text-surface-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tab_login")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("signup")}
          className={`flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-200 min-h-[44px] ${
            activeTab === "signup"
              ? "bg-gold text-surface-primary"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {t("tab_signup")}
        </button>
      </div>

      {/* Side-by-side cards — desktop */}
      <div className="hidden md:grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-white/[0.06] rounded-xl p-8">
          <LoginForm />
        </div>
        <div className="bg-card border border-white/[0.06] rounded-xl p-8">
          <SignUpForm />
        </div>
      </div>

      {/* Single card — mobile, based on active tab */}
      <div className="md:hidden">
        <div className="bg-card border border-white/[0.06] rounded-xl p-8">
          {activeTab === "login" ? <LoginForm /> : <SignUpForm />}
        </div>
      </div>
    </>
  );
}
