"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

export type UpsellTrigger = "save" | "export" | "player-link";

interface GuestUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: UpsellTrigger;
}

export function GuestUpsellModal({ isOpen, onClose }: GuestUpsellModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus trap: focus the close button when modal opens
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upsell-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-5">
        {/* Close */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground/60 hover:text-muted-foreground transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Fechar"
        >
          ×
        </button>

        {/* Icon */}
        <div className="text-3xl text-center">🏰</div>

        {/* Title */}
        <div className="text-center space-y-2">
          <h2
            id="upsell-modal-title"
            className="font-display text-xl text-foreground"
          >
            Seu combate merece ser lembrado.
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Crie uma conta gratuita para salvar encontros, carregar grupos de
            jogadores e gerar links para seus jogadores.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-1">
          <Link
            href="/auth/sign-up"
            className="w-full text-center px-6 py-3 bg-gold text-surface-primary font-semibold rounded-lg hover:shadow-gold-glow hover:-translate-y-[1px] transition-all duration-[250ms] min-h-[48px] flex items-center justify-center"
          >
            Criar Conta Grátis
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="w-full text-center px-6 py-3 bg-white/[0.06] text-muted-foreground rounded-lg hover:bg-white/[0.1] transition-all duration-[250ms] min-h-[48px] text-sm"
          >
            Continuar sem salvar
          </button>
        </div>
      </div>
    </div>
  );
}
