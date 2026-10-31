"use client";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/ui/confirm-delete";

const SENT = new Set(["submitted", "under_review", "interview", "waitlisted", "admitted", "accepted"]);

export function DeleteApplication({ id, school, status }: { id: string; school: string; status: string }) {
  const router = useRouter();
  const lines = [
    "Essays, drafts, the strategy brief and fee and funding plans for this application",
    "The agents' progress on the portal, and any questions they were waiting on",
    "Anything the agents had queued for it stops now",
    "Portal logins and emails with the school stay in Portal logins and Messages",
  ];
  if (SENT.has(status)) lines.unshift(`This only removes it from Ivyward. It doesn't withdraw the application you already sent to ${school}.`);
  return (
    <ConfirmDelete
      title={`Delete your ${school} application?`}
      lines={lines}
      word="delete"
      action="Delete application"
      trigger={
        <Button size="sm" variant="ghost" className="text-muted hover:text-stop" aria-label="Delete application">
          <Trash2 className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Delete</span>
        </Button>
      }
      onConfirm={async () => {
        const r = await fetch(`/api/applications/${id}`, { method: "DELETE" });
        if (!r.ok) throw new Error(((await r.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't delete it");
        toast.success(`${school} application deleted`);
        router.replace("/applications");
        router.refresh();
      }}
    />
  );
}
