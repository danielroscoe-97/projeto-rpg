export const dynamic = "force-dynamic";

import { MetricsDashboard } from "@/components/admin/MetricsDashboard";

export default function AdminPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Usage Metrics</h1>
        <p className="text-white/50 mt-1 text-sm">
          Monitor product health and user engagement.
        </p>
      </div>
      <MetricsDashboard />
    </div>
  );
}
