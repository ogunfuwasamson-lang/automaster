// the auditor's rulebook. every agent action goes through decide() before it fires.
// pure function so it's trivially testable; callers load grants/ripcords from the db.

export const CAPABILITIES = [
  "research",
  "draft",
  "prefill",
  "school.add_drop",
  "email.follow_up",
  "email.new_contact",
  "submit",
  "spend.app_fee",
  "spend.deposit",
  "state_fact",
  "sign",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

export type GrantMode = "auto" | "auto_undo" | "approve" | "deny";

export interface Grant {
  capability: Capability;
  mode: GrantMode;
  undo_seconds: number;
  ceiling_cents: number | null;
  rate_limit: Record<string, number> | null;
}

export interface Ripcord {
  scope_kind: "all" | "agent" | "capability" | "school";
  scope_value: string | null;
  active: boolean;
}

export interface ActionContext {
  agent: string;
  schoolId?: string | null;
  // submit
  packetApproved?: boolean;
  // spend
  amountCents?: number;
  spentSoFarCents?: number;
  // rate limits: counts of prior actions in the matching window, keyed like the grant's rate_limit
  rateCounts?: Record<string, number>;
}

export type Verdict =
  | { kind: "allow"; reason: string }
  | { kind: "allow_with_undo"; undoSeconds: number; reason: string }
  | { kind: "needs_approval"; reason: string }
  | { kind: "blocked"; reason: string };

// these never run without the user, whatever the grant table says
const ALWAYS_HUMAN: Capability[] = ["sign", "state_fact", "spend.deposit"];

export function decide(
  capability: Capability,
  grants: Grant[],
  ripcords: Ripcord[],
  ctx: ActionContext,
): Verdict {
  const pulled = ripcords.find(
    (r) =>
      r.active &&
      (r.scope_kind === "all" ||
        (r.scope_kind === "agent" && r.scope_value === ctx.agent) ||
        (r.scope_kind === "capability" && r.scope_value === capability) ||
        (r.scope_kind === "school" && !!ctx.schoolId && r.scope_value === ctx.schoolId)),
  );
  if (pulled) {
    return { kind: "blocked", reason: `ripcord pulled (${pulled.scope_kind}${pulled.scope_value ? `:${pulled.scope_value}` : ""})` };
  }

  // hard floor: nothing reaches a school the user hasn't reviewed. db enforces this too.
  if (capability === "submit" && !ctx.packetApproved) {
    return { kind: "blocked", reason: "packet not reviewed and approved by user" };
  }

  if (ALWAYS_HUMAN.includes(capability)) {
    return { kind: "needs_approval", reason: `${capability} always needs the user` };
  }

  const grant = grants.find((g) => g.capability === capability);
  if (!grant) return { kind: "needs_approval", reason: "no grant on file" };
  if (grant.mode === "deny") return { kind: "blocked", reason: "user denied this capability" };
  if (grant.mode === "approve") return { kind: "needs_approval", reason: "grant set to approve" };

  if (capability.startsWith("spend.")) {
    const amount = ctx.amountCents ?? 0;
    const spent = ctx.spentSoFarCents ?? 0;
    const ceiling = grant.ceiling_cents ?? 0;
    if (amount <= 0) return { kind: "blocked", reason: "invalid spend amount" };
    if (spent + amount > ceiling) {
      return { kind: "needs_approval", reason: `over fee envelope ($${(spent + amount) / 100} > $${ceiling / 100})` };
    }
  }

  if (grant.rate_limit) {
    for (const [key, limit] of Object.entries(grant.rate_limit)) {
      const used = ctx.rateCounts?.[key] ?? 0;
      if (used >= limit) return { kind: "needs_approval", reason: `rate limit hit: ${key} (${used}/${limit})` };
    }
  }

  if (grant.mode === "auto_undo") {
    return { kind: "allow_with_undo", undoSeconds: grant.undo_seconds, reason: "auto with undo window" };
  }
  return { kind: "allow", reason: "auto" };
}
