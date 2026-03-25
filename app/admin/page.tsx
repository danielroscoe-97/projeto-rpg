export const dynamic = "force-dynamic";

import { MetricsDashboard } from "@/components/admin/MetricsDashboard";

export default function AdminPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Usage Metrics</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Monitor product health and user engagement.
        </p>
      </div>
      <MetricsDashboard />
    </div>
  );
}
