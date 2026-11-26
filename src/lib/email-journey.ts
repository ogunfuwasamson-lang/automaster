import type { Block } from "@/lib/email-layout";
import type { JourneyMap } from "@/lib/journey-map";

// the dashboard's journey map as the email's strip: which of the ten stops they're at. pure, so it's tested.
export function journeyBlock(map: Pick<JourneyMap, "stages" | "current" | "done"> | null | undefined): Extract<Block, { t: "progress" }> | null {
  if (!map?.stages?.length || !map.current) return null;
  const at = map.stages.findIndex((s) => s.id === map.current!.id) + 1;
  if (at < 1) return null;
  return { t: "progress", at, of: map.stages.length, label: map.current.label, done: at - 1 };
}
