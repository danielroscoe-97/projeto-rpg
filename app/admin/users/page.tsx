export const dynamic = "force-dynamic";

import { UserManager } from "@/components/admin/UserManager";

export default function AdminUsersPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-white">User Management</h1>
        <p className="text-white/50 mt-1 text-sm">
          View and search user accounts.
        </p>
      </div>
      <UserManager />
    </div>
  );
}
