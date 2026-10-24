import type { ReactNode } from "react";

// page title: one compact row. the title, an optional single line under it, actions on the right
export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <header className="relative flex flex-wrap items-center justify-between gap-x-4 gap-y-3 pb-5">
      <div className="min-w-0">
        {eyebrow ? <div className="mb-2">{eyebrow}</div> : null}
        <h1 className="text-[26px] font-bold leading-tight tracking-[-0.04em] sm:text-[30px]">{title}</h1>
        {description ? <p className="mt-0.5 max-w-3xl truncate text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Section({ title, description, action, children, className = "" }: { title: string; description?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`space-y-4 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-[-0.02em]">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// the card: white, generously rounded, a soft lifted shadow
export function Card({ children, className = "", hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return (
    <div className={`rounded-3xl border border-line bg-surface shadow-card ${hover ? "transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-lift" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function Panel({ children, className = "", tone = "plain" }: { children: ReactNode; className?: string; tone?: "plain" | "signal" | "go" | "stop" | "accent" }) {
  const t = {
    plain: "border-line bg-surface",
    signal: "border-signal/25 bg-[color-mix(in_oklab,var(--signal)_6%,var(--surface))]",
    go: "border-go/25 bg-[color-mix(in_oklab,var(--go)_6%,var(--surface))]",
    stop: "border-stop/25 bg-[color-mix(in_oklab,var(--stop)_6%,var(--surface))]",
    accent: "border-accent/25 bg-[color-mix(in_oklab,var(--accent)_6%,var(--surface))]",
  }[tone];
  return <div className={`rounded-3xl border shadow-card ${t} ${className}`}>{children}</div>;
}

export function Empty({ title, body, action, icon }: { title: string; body?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-neutral-300 bg-surface/60 px-6 py-12 text-center dark:border-neutral-700">
      {icon ? <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent">{icon}</div> : null}
      <p className="font-bold tracking-[-0.01em]">{title}</p>
      {body ? <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted">{body}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Notice({ tone = "signal", children }: { tone?: "signal" | "stop" | "go" | "plain" | "accent"; children: ReactNode }) {
  const t = {
    signal: "border-signal/25 bg-[color-mix(in_oklab,var(--signal)_7%,var(--surface))]",
    stop: "border-stop/25 bg-[color-mix(in_oklab,var(--stop)_7%,var(--surface))]",
    go: "border-go/25 bg-[color-mix(in_oklab,var(--go)_7%,var(--surface))]",
    accent: "border-accent/25 bg-[color-mix(in_oklab,var(--accent)_7%,var(--surface))]",
    plain: "border-line bg-surface text-muted",
  }[tone];
  return <div className={`rounded-2xl border px-4 py-3.5 text-sm leading-relaxed shadow-card ${t}`}>{children}</div>;
}
