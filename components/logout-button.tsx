"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useRoleStore } from "@/lib/stores/role-store";

export function LogoutButton() {
  const router = useRouter();
  const resetRole = useRoleStore((s) => s.reset);

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    resetRole();
    router.push("/");
  };

  return (
    <Button
      onClick={logout}
      variant="ghost"
      className="min-h-[44px]"
    >
      Logout
    </Button>
  );
}
