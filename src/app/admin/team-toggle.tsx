"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// mark an account as team/test (left out of the numbers) or as a real user
export function TeamToggle({ userId, team }: { userId: string; team: boolean }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/api/admin/team", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, team: !team }) }).catch(() => null);
        setBusy(false);
        router.refresh();
      }}
      className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] transition disabled:opacity-50 ${team ? "border-line text-muted hover:text-foreground" : "border-foreground/20 hover:border-foreground/50"}`}
      title={team ? "Counted as a team or test account. Click to count as a real user." : "Counted as a real user. Click to mark as a team or test account."}
    >
      {team ? "Team / test" : "Real user"}
    </button>
  );
}
