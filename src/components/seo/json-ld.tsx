import { FACTS, PLAN_OFFERS, SITE } from "@/lib/site";

// structured data (schema.org JSON-LD): tells search engines and AI assistants what Ivyward is, what it costs,
// and the answers to common questions, in a form they read directly.
function Script({ data }: { data: unknown }) {
  // escape "<" so nothing in the data can close the script tag
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

const ORG = { "@type": "Organization", "@id": `${SITE.url}/#org`, name: SITE.name, url: SITE.url, logo: `${SITE.url}/icon.svg`, slogan: SITE.tagline };

export function SiteJsonLd({ faq }: { faq?: [string, string][] }) {
  const graph: unknown[] = [
    ORG,
    { "@type": "WebSite", "@id": `${SITE.url}/#site`, url: SITE.url, name: SITE.name, description: SITE.short, publisher: { "@id": `${SITE.url}/#org` }, inLanguage: "en" },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE.url}/#app`,
      name: SITE.name,
      url: SITE.url,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      description: SITE.description,
      featureList: FACTS.join(" "),
      publisher: { "@id": `${SITE.url}/#org` },
      offers: PLAN_OFFERS.map((o) => ({ "@type": "Offer", name: o.name, price: o.price, priceCurrency: "USD", description: o.description, url: `${SITE.url}/pricing` })),
    },
  ];
  if (faq?.length)
    graph.push({
      "@type": "FAQPage",
      "@id": `${SITE.url}/#faq`,
      mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    });
  return <Script data={{ "@context": "https://schema.org", "@graph": graph }} />;
}

export function BreadcrumbJsonLd({ items }: { items: [string, string][] }) {
  return (
    <Script
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: `${SITE.url}${path}` })),
      }}
    />
  );
}
