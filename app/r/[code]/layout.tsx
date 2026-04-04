export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-[#0a0a0f] flex items-center justify-center p-4">
      {children}
    </div>
  );
}
