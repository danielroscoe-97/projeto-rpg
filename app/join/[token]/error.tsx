"use client";

import { useEffect } from "react";
import { captureError } from "@/lib/errors/capture";

export default function JoinError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { component: "JoinPage", action: "render", category: "unknown" });
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        <h1 className="text-foreground text-xl font-semibold">
          Erro ao entrar na sessão
        </h1>
        <p className="text-muted-foreground text-sm">
          Não foi possível carregar a página. Verifique sua conexão e tente novamente.
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-gold text-background rounded-md text-sm font-medium min-h-[44px]"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
