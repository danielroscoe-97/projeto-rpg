export const dynamic = "force-dynamic";

import { ContentEditor } from "@/components/admin/ContentEditor";

export default function AdminMonstersPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Monster Content</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Search and edit SRD monster data. Changes propagate to active sessions.
        </p>
      </div>
      <ContentEditor entityType="monsters" />
    </div>
  );
}
