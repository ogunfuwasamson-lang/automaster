// next.js calls this for every uncaught error in a route, page or server action: the operator gets an email
export async function register() {}

export async function onRequestError(err: unknown, request: { path: string; method: string }, context: { routerKind: string; routePath: string; routeType: string }) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const e = err as { message?: string; digest?: string; stack?: string };
  const { alert } = await import("@/lib/alerts");
  await alert(`request:${context.routePath}:${(e.message ?? "").slice(0, 60)}`, `Server error on ${context.routePath}`, {
    path: `${request.method} ${request.path}`,
    error: e.message ?? String(err),
    digest: e.digest ?? "",
    stack: (e.stack ?? "").split("\n").slice(0, 6).join("\n"),
  });
}
