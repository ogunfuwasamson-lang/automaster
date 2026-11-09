"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// mark an account as team/test (left out of the numbers) or as a real user. admins always count as team.
export function TeamToggle({ userId, team, admin = false }: { userId: string; team: boolean; admin?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  if (admin) return <span className="whitespace-nowrap rounded-full border border-line px-2.5 py-0.5 text-[12px] text-muted">Admin</span>;
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setFailed(false);
          const res = await fetch("/api/admin/team", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId, team: !team }) }).catch(() => null);
          setBusy(false);
          if (!res?.ok) return setFailed(true);
          router.refresh();
        }}
        className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[12px] transition disabled:opacity-50 ${team ? "border-line text-muted hover:text-foreground" : "border-foreground/20 hover:border-foreground/50"}`}
        title={team ? "Counted as a team or test account. Click to count as a real user." : "Counted as a real user. Click to mark as a team or test account."}
      >
        {busy ? "Saving" : team ? "Team / test" : "Real user"}
      </button>
      {failed && <span className="text-[12px] text-stop">Not saved. Try again.</span>}
    </span>
  );
}
