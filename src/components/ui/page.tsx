import type { ReactNode } from "react";

// page title: the display face, big and condensed like terminal signage
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4 pb-6">
      <div className="min-w-0">
        <h1 className="font-display text-4xl font-semibold leading-none tracking-tight sm:text-5xl">{title}</h1>
        {description ? <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

export function Section({ title, description, action, children, className = "" }: { title: string; description?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Panel({ children, className = "", tone = "plain" }: { children: ReactNode; className?: string; tone?: "plain" | "signal" | "go" | "stop" }) {
  const t = {
    plain: "border-line bg-surface",
    signal: "border-signal/60 bg-signal/10",
    go: "border-go/40 bg-go/8",
    stop: "border-stop/40 bg-stop/8",
  }[tone];
  return <div className={`rounded-xl border ${t} ${className}`}>{children}</div>;
}

export function Empty({ title, body, action }: { title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center">
      <p className="font-medium">{title}</p>
      {body ? <p className="mx-auto mt-1 max-w-md text-sm text-muted">{body}</p> : null}
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Notice({ tone = "signal", children }: { tone?: "signal" | "stop" | "go" | "plain"; children: ReactNode }) {
  const t = {
    signal: "border-signal/60 bg-signal/12 text-foreground",
    stop: "border-stop/40 bg-stop/8 text-foreground",
    go: "border-go/40 bg-go/8 text-foreground",
    plain: "border-line bg-surface text-muted",
  }[tone];
  return <div className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${t}`}>{children}</div>;
}
