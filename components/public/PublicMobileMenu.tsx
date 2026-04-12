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
        className={`fixed inset-x-0 top-0 bottom-0 z-[55] bg-gray-950 lg:hidden overflow-y-auto transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "-translate-y-full"
        }`}
      >
      {/* Header: brand + close */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-white/[0.06]">
        <Link href="/" onClick={onClose} className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/art/brand/logo-icon.svg" alt="" width={24} height={24} className="pointer-events-none" aria-hidden="true" />
          <span className="text-gold font-semibold font-[family-name:var(--font-cinzel)] tracking-wide text-sm">Pocket DM</span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2 text-gray-400 hover:text-foreground transition-colors"
          aria-label={isPt ? "Fechar menu" : "Close menu"}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 flex flex-col gap-1">
        {/* Quick navigation — home links */}
        <div className="mb-1">
          <Link
            href="/"
            onClick={onClose}
            className={`text-sm font-medium px-4 py-3 rounded-lg min-h-[44px] flex items-center gap-2 transition-all duration-200 ${
              pathname === "/" ? "text-gold bg-gold/[0.08]" : "text-gray-300 hover:text-foreground hover:bg-white/[0.06]"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
            {isPt ? "Página Inicial" : "Home"}
          </Link>
          <Link
            href="/app/dashboard"
            onClick={onClose}
            className="text-sm font-medium px-4 py-3 rounded-lg min-h-[44px] flex items-center gap-2 transition-all duration-200 text-gray-300 hover:text-foreground hover:bg-white/[0.06]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
            </svg>
            {isPt ? "Minha Área" : "My Dashboard"}
          </Link>
        </div>

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
