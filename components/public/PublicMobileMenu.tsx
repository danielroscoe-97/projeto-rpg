"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";

type Locale = "en" | "pt-BR";

interface MenuSection {
  title: string;
  links: { label: string; href: string }[];
}

function getSections(locale: Locale): MenuSection[] {
  const isPt = locale === "pt-BR";
  return [
    {
      title: isPt ? "Referência" : "Reference",
      links: [
        { label: isPt ? "Monstros" : "Monsters", href: isPt ? "/monstros" : "/monsters" },
        { label: isPt ? "Magias" : "Spells", href: isPt ? "/magias" : "/spells" },
        { label: isPt ? "Condições" : "Conditions", href: isPt ? "/condicoes" : "/conditions" },
        { label: isPt ? "Itens" : "Items", href: isPt ? "/itens" : "/items" },
      ],
    },
    {
      title: isPt ? "Jogador" : "Player",
      links: [
        { label: "Classes", href: isPt ? "/classes-pt" : "/classes" },
        { label: isPt ? "Raças" : "Races", href: isPt ? "/racas" : "/races" },
        { label: isPt ? "Talentos" : "Feats", href: isPt ? "/talentos" : "/feats" },
        { label: isPt ? "Antecedentes" : "Backgrounds", href: isPt ? "/antecedentes" : "/backgrounds" },
      ],
    },
    {
      title: isPt ? "Ferramentas" : "Tools",
      links: [
        { label: isPt ? "Dados" : "Dice", href: isPt ? "/dados" : "/dice" },
        { label: isPt ? "Regras" : "Rules", href: isPt ? "/regras" : "/rules" },
        { label: isPt ? "Ações" : "Actions", href: isPt ? "/acoes-em-combate" : "/actions" },
        {
          label: isPt ? "Calculadora de Encontro" : "Encounter Builder",
          href: isPt ? "/calculadora-encontro" : "/encounter-builder",
        },
        { label: "Combat Tracker", href: "/try" },
      ],
    },
  ];
}

interface PublicMobileMenuProps {
  open: boolean;
  onClose: () => void;
  locale: Locale;
}

export function PublicMobileMenu({ open, onClose, locale }: PublicMobileMenuProps) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Close on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // P4: Lock body scroll when open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // P5: Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  // Keep mounted during exit animation so the slide-out is visible
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (open) {
      setVisible(true);
    } else if (visible) {
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [open, visible]);

  if (!visible || !mounted) return null;

  const sections = getSections(locale);
  const isPt = locale === "pt-BR";

  return createPortal(
    <>
      {/* Backdrop fade */}
      <div
        className={`fixed inset-0 z-[54] bg-black/60 lg:hidden transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Drawer slide from top */}
      <div
        className={`fixed inset-x-0 top-0 bottom-0 z-[55] bg-gray-950 lg:hidden overflow-y-auto pt-14 transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "-translate-y-full"
        }`}
      >
      <div className="p-4 flex flex-col gap-1">
        {sections.map((section) => (
          <div key={section.title || "quick"}>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium px-4 pt-3 pb-1 block">
              {section.title}
            </span>
            {section.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={onClose}
                className={`text-sm font-medium px-4 py-3 rounded-lg min-h-[44px] flex items-center transition-all duration-200 ${
                  pathname === link.href
                    ? "text-gold bg-gold/[0.08]"
                    : "text-gray-300 hover:text-foreground hover:bg-white/[0.06]"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}

        {/* P7: Auth links for mobile users */}
        <div className="border-t border-white/[0.06] mt-3 pt-3">
          <div className="flex flex-col gap-2 px-4">
            <Link
              href="/try"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg bg-gold px-4 py-3 text-sm font-semibold text-gray-950 hover:bg-gold/90 transition-colors min-h-[44px]"
            >
              {isPt ? "Testar Grátis" : "Try Free"}
            </Link>
            <Link
              href="/auth/sign-up"
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-lg border border-gold/30 px-4 py-3 text-sm font-semibold text-gold hover:bg-gold/10 transition-colors min-h-[44px]"
            >
              {isPt ? "Criar Conta" : "Sign Up"}
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom tagline */}
      <div className="mt-auto pb-8 pt-4 text-center">
        <p className="text-xs text-gray-600 leading-relaxed">
          Pocket DM — {isPt ? "O rastreador de combate para" : "The combat tracker for"} D&amp;D 5e
        </p>
      </div>
    </div>
    </>,
    document.body,
  );
}
