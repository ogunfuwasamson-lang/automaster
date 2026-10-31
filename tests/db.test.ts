// runs the real migration against a throwaway postgres and checks the invariants
// that protect the user: RLS isolation, the submit floor, append-only events, job claiming.
// needs TEST_DATABASE_URL (superuser). skipped otherwise.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { Client } from "pg";
import { APP_STATUSES, TRANSITIONS } from "@/lib/app-state";

const url = process.env.TEST_DATABASE_URL;
const d = url ? describe : describe.skip;

const ALICE = "00000000-0000-0000-0000-00000000000a";
const BOB = "00000000-0000-0000-0000-00000000000b";

d("database invariants", () => {
  let db: Client;

  async function as<T>(uid: string, fn: () => Promise<T>): Promise<T> {
    await db.query("begin");
    await db.query("set local role authenticated");
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid]);
    try {
      return await fn();
    } finally {
      await db.query("rollback");
    }
  }

  beforeAll(async () => {
    db = new Client({ connectionString: url });
    await db.connect();
    await db.query("drop schema if exists public cascade; create schema public; drop schema if exists auth cascade;");
    await db.query(readFileSync("supabase/test/shim.sql", "utf8"));
    for (const f of readdirSync("supabase/migrations").filter((x) => x.endsWith(".sql") && !x.includes("storage")).sort()) {
      await db.query(readFileSync(`supabase/migrations/${f}`, "utf8"));
    }
    await db.query("grant usage on schema public to authenticated; grant select, insert, update, delete on all tables in schema public to authenticated;");
    await db.query(`insert into auth.users(id, email) values ($1, 'alice@x.com'), ($2, 'bob@x.com')`, [ALICE, BOB]);
    const school = await db.query(`insert into schools(slug, name) values ('test-u', 'Test U') returning id`);
    const prog = await db.query(
      `insert into programs(school_id, name, degree) values ($1, 'MS Finance', 'MS') returning id`,
      [school.rows[0].id],
    );
    await db.query(`insert into applications(user_id, program_id) values ($1, $2), ($3, $2)`, [ALICE, prog.rows[0].id, BOB]);
  });

  afterAll(async () => {
    await db?.end();
  });

  it("new users get a profile and the default dial", async () => {
    const { rows } = await db.query(`select capability, mode from grants where user_id = $1 order by capability`, [ALICE]);
    expect(rows.length).toBe(11);
    expect(rows.find((r) => r.capability === "sign").mode).toBe("approve");
    expect(rows.find((r) => r.capability === "email.new_contact").mode).toBe("auto_undo");
  });

  it("db transition table matches app-state.ts", async () => {
    const { rows } = await db.query(`select from_status, to_status from app_transitions`);
    const dbPairs = new Set(rows.map((r) => `${r.from_status}>${r.to_status}`));
    const tsPairs = new Set(APP_STATUSES.flatMap((f) => TRANSITIONS[f].map((t) => `${f}>${t}`)));
    expect(dbPairs).toEqual(tsPairs);
  });

  it("users only see their own rows", async () => {
    const n = await as(ALICE, async () => (await db.query(`select user_id from applications`)).rows);
    expect(n.length).toBe(1);
    expect(n[0].user_id).toBe(ALICE);
    const grants = await as(BOB, async () => (await db.query(`select distinct user_id from grants`)).rows);
    expect(grants).toEqual([{ user_id: BOB }]);
  });

  it("users cannot write events or flip their own applications from the client", async () => {
    await expect(
      as(ALICE, () => db.query(`insert into events(user_id, actor, action) values ($1, 'user', 'x')`, [ALICE])),
    ).rejects.toThrow(/row-level security/);
    const res = await as(ALICE, () => db.query(`update applications set status = 'shortlisted'`));
    expect(res.rowCount).toBe(0);
  });

  it("cannot submit without packet approval", async () => {
    const { rows } = await db.query(`select id from applications where user_id = $1`, [ALICE]);
    const id = rows[0].id;
    for (const s of ["shortlisted", "preparing", "ready_for_review"]) {
      await db.query(`update applications set status = $1 where id = $2`, [s, id]);
    }
    await expect(db.query(`update applications set status = 'submitted' where id = $1`, [id])).rejects.toThrow(/illegal/);
    // force the state without approval: trigger still blocks submit
    await db.query(`alter table applications disable trigger applications_transition`);
    await db.query(`update applications set status = 'packet_approved' where id = $1`, [id]);
    await db.query(`alter table applications enable trigger applications_transition`);
    await expect(db.query(`update applications set status = 'submitted' where id = $1`, [id])).rejects.toThrow(/packet not approved/);
    await db.query(`update applications set packet_approved_at = now() where id = $1`, [id]);
    await db.query(`update applications set status = 'submitted' where id = $1`, [id]);
    const after = await db.query(`select status, submitted_at from applications where id = $1`, [id]);
    expect(after.rows[0].status).toBe("submitted");
    expect(after.rows[0].submitted_at).not.toBeNull();
  });

  it("going back to preparing wipes the approval", async () => {
    const { rows } = await db.query(`select id from applications where user_id = $1`, [BOB]);
    const id = rows[0].id;
    for (const s of ["shortlisted", "preparing", "ready_for_review"]) {
      await db.query(`update applications set status = $1 where id = $2`, [s, id]);
    }
    await db.query(`update applications set status = 'packet_approved', packet_approved_at = now() where id = $1`, [id]);
    await db.query(`update applications set status = 'preparing' where id = $1`, [id]);
    const r = await db.query(`select packet_approved_at from applications where id = $1`, [id]);
    expect(r.rows[0].packet_approved_at).toBeNull();
  });

  it("users cannot raise their own plan, admin flag or budget from the browser", async () => {
    const res = await as(ALICE, () => db.query(`update profiles set plan = 'pro', is_admin = true, monthly_budget_usd = 1000`));
    expect(res.rowCount).toBe(0);
    const g = await as(ALICE, () => db.query(`update grants set ceiling_cents = 999999`));
    expect(g.rowCount).toBe(0);
    const a = await as(ALICE, () => db.query(`update approvals set status = 'approved'`));
    expect(a.rowCount).toBe(0);
  });

  it("mail tokens and runner tokens are invisible to users", async () => {
    await db.query(`insert into mail_accounts(user_id, email, refresh_token_enc) values ($1, 'a@x.com', 'enc')`, [ALICE]);
    await db.query(`insert into runner_tokens(user_id, token_hash) values ($1, 'h')`, [ALICE]);
    const m = await as(ALICE, async () => (await db.query(`select * from mail_accounts`)).rows);
    const t = await as(ALICE, async () => (await db.query(`select * from runner_tokens`)).rows);
    expect(m).toEqual([]);
    expect(t).toEqual([]);
  });

  it("going back to preparing clears the attestation and stops the runner", async () => {
    const { rows } = await db.query(`select id from applications where user_id = $1`, [BOB]);
    const id = rows[0].id;
    await db.query(`update applications set status = 'ready_for_review' where id = $1`, [id]);
    await db.query(
      `update applications set status = 'packet_approved', packet_approved_at = now(), attested_at = now(), attestation = 'x', runner_status = 'ready' where id = $1`,
      [id],
    );
    await db.query(`update applications set status = 'preparing' where id = $1`, [id]);
    const r = await db.query(`select attested_at, runner_status from applications where id = $1`, [id]);
    expect(r.rows[0].attested_at).toBeNull();
    expect(r.rows[0].runner_status).toBe("idle");
  });

  it("events are append-only", async () => {
    const { rows } = await db.query(`insert into events(user_id, actor, action) values ($1, 'agent:test', 'x') returning id`, [ALICE]);
    await expect(db.query(`update events set action = 'y' where id = $1`, [rows[0].id])).rejects.toThrow(/append-only/);
    await expect(db.query(`delete from events where id = $1`, [rows[0].id])).rejects.toThrow(/append-only/);
  });

  it("sign grant cannot be loosened", async () => {
    await expect(
      db.query(`update grants set mode = 'auto' where user_id = $1 and capability = 'sign'`, [ALICE]),
    ).rejects.toThrow(/sign must stay/);
  });

  it("claim_jobs hands each due job to exactly one worker", async () => {
    await db.query(
      `insert into jobs(user_id, agent, task) select $1, 'system', 'ping' from generate_series(1, 3)`,
      [ALICE],
    );
    await db.query(`insert into jobs(user_id, agent, task, run_at) values ($1, 'system', 'later', now() + interval '1 hour')`, [ALICE]);
    const a = await db.query(`select id from claim_jobs('w1', 2)`);
    const b = await db.query(`select id from claim_jobs('w2', 5)`);
    expect(a.rowCount).toBe(2);
    expect(b.rowCount).toBe(1);
    const ids = new Set([...a.rows, ...b.rows].map((r) => r.id));
    expect(ids.size).toBe(3);
  });

  it("browser jobs only go to the runner function", async () => {
    await db.query(`insert into jobs(user_id, agent, task) values ($1, 'runner', 'run'), ($1, 'writer', 'draft')`, [ALICE]);
    const general = await db.query(`select agent from claim_jobs_for('w', 10, null)`);
    expect(general.rows.map((r) => r.agent)).not.toContain("runner");
    const browser = await db.query(`select agent from claim_jobs_for('w', 10, 'runner')`);
    expect(browser.rows.map((r) => r.agent)).toEqual(["runner"]);
  });

  it("deleting an application unlinks its events but keeps them, and nothing else can be edited", async () => {
    const sch = await db.query(`select id from schools limit 1`);
    const s = await db.query(`insert into programs(school_id, name, degree) values ($1, 'MS Data', 'MS') returning id`, [sch.rows[0].id]);
    const app = await db.query(`insert into applications(user_id, program_id) values ($1, $2) returning id`, [ALICE, s.rows[0].id]);
    const art = await db.query(`insert into artifacts(user_id, application_id, kind, title) values ($1, $2, 'sop', 'SOP') returning id`, [ALICE, app.rows[0].id]);
    const ver = await db.query(`insert into artifact_versions(artifact_id, user_id, version, content, author) values ($1, $2, 1, 'x', 'agent:writer') returning id`, [art.rows[0].id, ALICE]);
    const ev = await db.query(`insert into events(user_id, actor, action, application_id, artifact_version_id) values ($1, 'agent:test', 'drafted', $2, $3) returning id`, [ALICE, app.rows[0].id, ver.rows[0].id]);
    await db.query(`delete from applications where id = $1`, [app.rows[0].id]);
    const left = await db.query(`select application_id, artifact_version_id, action from events where id = $1`, [ev.rows[0].id]);
    expect(left.rows[0]).toEqual({ application_id: null, artifact_version_id: null, action: "drafted" });
    await expect(db.query(`update events set application_id = null, action = 'z' where id = $1`, [ev.rows[0].id])).rejects.toThrow(/append-only/);
  });

  it("deleting a user cascades cleanly, events included", async () => {
    await db.query(`insert into events(user_id, actor, action) values ($1, 'agent:test', 'x')`, [BOB]);
    const bobApp = await db.query(`select id from applications where user_id = $1 limit 1`, [BOB]);
    await db.query(`insert into events(user_id, actor, action, application_id) values ($1, 'agent:test', 'y', $2)`, [BOB, bobApp.rows[0].id]);
    await db.query(`delete from auth.users where id = $1`, [BOB]);
    const { rows } = await db.query(`select count(*)::int as n from grants where user_id = $1`, [BOB]);
    expect(rows[0].n).toBe(0);
    const ev = await db.query(`select count(*)::int as n from events where user_id = $1`, [BOB]);
    expect(ev.rows[0].n).toBe(0);
  });
});
