"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-[#1a1a2e] text-white min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="text-white/60 text-sm">
            An unexpected error occurred. The error has been reported automatically.
          </p>
          <button
            type="button"
            onClick={reset}
            className="px-4 py-2 bg-[#e94560] text-white rounded-md hover:bg-[#c73652] transition-colors text-sm min-h-[44px]"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
