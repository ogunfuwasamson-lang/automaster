-- per-user monthly AI budget override (null = platform default, $25)
alter table profiles add column if not exists monthly_budget_usd numeric(8,2);
-- agent_runs.cost_usd needs more precision for cheap calls
alter table agent_runs alter column cost_usd type numeric(12,6);
create index if not exists agent_runs_user_month_idx on agent_runs(user_id, started_at) where cost_usd is not null;
-- plan: free | pro | season. billing sets it; until then it's changed by hand.
alter table profiles add column if not exists plan text not null default 'free' check (plan in ('free', 'pro', 'season'));
alter table profiles add column if not exists plan_renews_at timestamptz;
