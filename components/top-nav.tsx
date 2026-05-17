import Link from "next/link";

import type { SessionUser } from "@/lib/models";
import { LogoutButton } from "@/components/logout-button";
import { isAdminUser } from "@/lib/repositories";

export function TopNav({ user }: { user: SessionUser }) {
  const canSeeAdmin = isAdminUser(user.id);
  return (
    <header className="top-nav">
      <div>
        <Link href="/dashboard">Dashboard</Link>
        {canSeeAdmin ? <Link href="/admin">Admin</Link> : null}
      </div>
      <div>
        <span className="muted" style={{ marginRight: "0.65rem" }}>
          {user.displayName ?? user.email}
        </span>
        <LogoutButton />
      </div>
    </header>
  );
}
