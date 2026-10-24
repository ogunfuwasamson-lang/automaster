import "server-only";
import type { Job } from "@/lib/jobs";
import { system } from "./system";

export type Handler = (job: Job) => Promise<Record<string, unknown> | void>;

// "<agent>.<task>" -> handler. each phase adds its agents here.
export const HANDLERS: Record<string, Handler> = {
  ...system,
};
