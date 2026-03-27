import { Navbar } from "@/components/layout/Navbar";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Navbar brand="Pocket DM" brandHref="/" />
      <div className="pt-[72px]">{children}</div>
    </div>
  );
}
