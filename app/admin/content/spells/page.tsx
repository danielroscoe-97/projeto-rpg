export const dynamic = "force-dynamic";

import { ContentEditor } from "@/components/admin/ContentEditor";

export default function AdminSpellsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">Spell Content</h1>
        <p className="text-white/50 mt-1 text-sm">
          Search and edit SRD spell data. Changes propagate to active sessions.
        </p>
      </div>
      <ContentEditor entityType="spells" />
    </div>
  );
}
