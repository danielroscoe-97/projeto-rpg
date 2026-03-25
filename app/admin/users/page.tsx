export const dynamic = "force-dynamic";

import { UserManager } from "@/components/admin/UserManager";

export default function AdminUsersPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          View and search user accounts.
        </p>
      </div>
      <UserManager />
    </div>
  );
}
