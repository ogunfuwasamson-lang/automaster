import "server-only";
import { redirect } from "next/navigation";
import { me } from "./me";

// the tabs after the overview need an approved (or paused) creator; anyone else goes to the creator home
export async function liveCreator() {
  const who = await me();
  if (!who) redirect("/login?next=/creator");
  const c = who.creator;
  if (!c || (c.status !== "active" && c.status !== "paused")) redirect("/creator");
  return { user: who.user, creator: c };
}
