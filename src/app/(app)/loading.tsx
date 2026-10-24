// shown while a server page loads: the layout's shape, so nothing jumps when content arrives
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl animate-pulse space-y-8" aria-busy="true" aria-label="Loading">
      <div className="space-y-3">
        <div className="h-11 w-56 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-4 w-80 max-w-full rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
      <div className="h-56 rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-neutral-200/70 dark:bg-neutral-800/70" />
        ))}
      </div>
    </div>
  );
}
