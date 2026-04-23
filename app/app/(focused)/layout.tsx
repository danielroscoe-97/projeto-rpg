import { ErrorBoundary } from "@/components/ui/ErrorBoundary";

/**
 * Focused layout — minimal chrome for full-attention screens (active combat).
 * Auth, side-effects, and skip-link are handled by the parent root layout at
 * `app/app/layout.tsx`. This layout only owns the `<main>` wrapper.
 */
export default function FocusedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main id="main-content" className="flex-1 p-6 pb-28 lg:pb-6">
      <ErrorBoundary name="MainContent">{children}</ErrorBoundary>
    </main>
  );
}
