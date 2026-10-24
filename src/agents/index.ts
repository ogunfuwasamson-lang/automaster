import "server-only";
import type { Job } from "@/lib/queue";
import { system } from "./system";
import { intake } from "./intake";
import { curator } from "./curator";
import { recon } from "./recon";

export type Handler = (job: Job) => Promise<Record<string, unknown> | void>;

// "<agent>.<task>" -> handler. each phase adds its agents here.
export const HANDLERS: Record<string, Handler> = {
  ...system,
  ...intake,
  ...curator,
  ...recon,
};
