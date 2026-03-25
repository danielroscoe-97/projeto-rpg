import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      <nav
        className="border-b border-white/10 h-14 flex items-center px-6"
        aria-label="Authentication navigation"
      >
        <Link
          href="/"
          className="font-bold text-lg tracking-tight min-h-[44px] inline-flex items-center"
        >
          RPG Tracker
        </Link>
      </nav>
      {children}
    </div>
  );
}
