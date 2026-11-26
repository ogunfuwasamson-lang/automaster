// OpenAI's domain check for the Ivyward app in ChatGPT: the token from the app's submission page, set as
// OPENAI_APPS_CHALLENGE, served as plain text at /.well-known/openai-apps-challenge (next.config rewrite)
export function GET() {
  const token = process.env.OPENAI_APPS_CHALLENGE?.trim();
  if (!token) return new Response("not set", { status: 404 });
  return new Response(token, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
