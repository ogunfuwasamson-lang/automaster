import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

// public pages are open to every crawler, AI assistants' included (that's how Ivyward shows up in their answers).
// the signed-in app, the api and admin stay out.
const PRIVATE = ["/api/", "/dashboard", "/applications", "/shortlist", "/messages", "/documents", "/profile", "/settings", "/logins", "/interview", "/connect-chrome", "/onboarding", "/admin", "/auth/"];
const AI_CRAWLERS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot", "Applebot-Extended", "Bingbot", "Googlebot", "DuckAssistBot", "meta-externalagent", "Meta-ExternalFetcher", "Amazonbot", "MistralAI-User", "cohere-ai", "YouBot", "CCBot", "Bytespider", "PetalBot"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: PRIVATE }, ...AI_CRAWLERS.map((userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE }))],
    sitemap: [`${SITE.url}/sitemap.xml`, `${SITE.url}/schools/sitemap.xml`],
    host: SITE.url,
  };
}
