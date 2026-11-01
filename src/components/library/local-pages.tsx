import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LOCAL, countryUrl, guideUrl, localGuide } from "@/content/i18n";
import { L, localDate } from "@/content/i18n/labels";
import { baseOrigin, localCountries, localCountry, localFits, localUsLine, the } from "@/content/i18n/countries";
import { COMMONWEALTH_ELIGIBLE } from "@/content/countries";
import type { Lang } from "@/content/i18n/types";
import { renderMarkdown, readMinutes } from "@/lib/markdown";
import { LOCAL_SCHOLARSHIPS, localScholarship, localizeLinks, scholarshipHref, translationsOfScholarship } from "@/content/i18n/scholarships";
import { scholarship as enScholarship } from "@/content";
import { ArticleJsonLd, ItemListJsonLd } from "@/components/seo/json-ld";
import { LocalAnswer, LocalCrumbs, LocalCta, LocalFaq, LocalRelated, LocalShell, LocalSources } from "./local";

// ---------- guides ----------

export function localGuideMetadata(lang: Lang, slug: string): Metadata {
  const g = localGuide(lang, slug);
  if (!g) return {};
  const self = guideUrl(lang, g.slug);
  const languages: Record<string, string> = { [lang]: self };
  if (g.en) {
    languages.en = `/guides/${g.en}`;
    languages["x-default"] = `/guides/${g.en}`;
    for (const other of ["fr", "es", "pt", "ar"] as Lang[]) {
      if (other === lang) continue;
      const o = LOCAL[other].find((x) => x.en === g.en);
      if (o) languages[other] = guideUrl(other, o.slug);
    }
  }
  return {
    title: g.seoTitle ?? g.title,
    description: g.description,
    keywords: g.keywords,
    alternates: { canonical: self, languages },
    openGraph: { type: "article", title: g.title, description: g.description, url: self, locale: L[lang].locale, modifiedTime: g.updated },
  };
}

export function LocalGuidePage({ lang, slug }: { lang: Lang; slug: string }) {
  const g = localGuide(lang, slug);
  if (!g) notFound();
  const t = L[lang];
  const { html } = renderMarkdown(localizeLinks(lang, g.body));
  const path = guideUrl(lang, g.slug);
  const related = (g.related ?? []).map((s) => localGuide(lang, s)).filter((x) => !!x).map((x) => ({ href: guideUrl(lang, x.slug), title: x.title }));
  return (
    <LocalShell lang={lang} crumbs={[[t.library, t.home], [g.title, path]]} english={g.en ? `/guides/${g.en}` : "/guides"}>
      <ArticleJsonLd path={path} title={g.title} description={g.description} updated={g.updated} faq={g.faq} about={g.keywords.slice(0, 5)} />
      <div className="mx-auto max-w-[720px] px-5 pb-20 pt-10 sm:pt-14">
        <LocalCrumbs items={[["Ivyward", t.home], [t.library, t.home]]} />
        <h1 className="mt-5 text-[36px] leading-[1.08] sm:text-[50px]">{g.title}</h1>
        <p className="mt-4 text-[18px] leading-relaxed text-muted">{g.description}</p>
        <p className="mt-4 text-[13.5px] text-muted">
          {t.checked} {localDate(g.updated, lang)} <span aria-hidden>/</span> {readMinutes(g.body)} {t.minutes}
        </p>
        <LocalAnswer lang={lang}>{g.answer}</LocalAnswer>
        <div className="prose-iv mt-10" dangerouslySetInnerHTML={{ __html: html }} />
        <LocalCta lang={lang} />
        <LocalFaq lang={lang} items={g.faq} />
        <LocalSources lang={lang} items={g.sources} />
        <LocalRelated lang={lang} items={related} />
      </div>
    </LocalShell>
  );
}

// ---------- country pages ----------

const COPY = {
  fr: {
    title: (c: string) => `Étudier à l'étranger depuis ${c} : bourses, admissions et visas pour 2027`,
    seo: (adj: string, name: string) => `Bourses pour étudiants ${adj} : étudier à l'étranger (${name}, 2027)`,
    desc: (adj: string) => `Les bourses entièrement financées ouvertes aux étudiants ${adj} pour la licence, le master et le doctorat à l'étranger, les exonérations de frais de dossier et les règles de visa 2026-2027.`,
    table: (adj: string) => `Bourses entièrement financées pour les étudiants ${adj}`,
    col: ["Bourse", "Pour vous", "Pourquoi"],
    visa: "Règles de visa 2026-2027",
    uk: "Royaume-Uni : à partir du 30 novembre 2026, 1 570 £ par mois à Londres ou 1 203 £ ailleurs (jusqu'à neuf mois) ; visa post-études ramené à 18 mois à partir du 1er janvier 2027.",
    ca: "Canada : maîtrises et doctorats dans les établissements publics exemptés du plafond ; preuve de fonds de 23 448 $ hors Québec, CAQ pour le Québec.",
    fr: "France : procédure Études en France via Campus France ; hausse des frais pour les non-Européens annoncée pour 2026-2027.",
    de: "Allemagne : compte bloqué de 11 904 € par an.",
    levels: "Licence, master ou doctorat ?",
    levelText: [
      ["Licence", "/fr/guides/licence-a-l-etranger"],
      ["Master", "/fr/guides/bourses-master-entierement-financees"],
      ["Doctorat", "/fr/guides/doctorat-finance"],
    ],
    fees: "Frais de dossier : beaucoup d'universités les exonèrent en cas de difficulté financière, de participation à une séance d'information ou sur demande polie.",
    feesLink: ["Comment obtenir une exonération", "/fr/guides/exoneration-frais-de-dossier"],
    local: "Dans votre pays :",
    price: "En Afrique, préparer ses candidatures avec Ivyward est gratuit ; chaque candidature soumise coûte environ 1,90 $ en monnaie locale.",
    faqQ: [(adj: string) => `Quelles bourses entièrement financées sont ouvertes aux étudiants ${adj} ?`, (adj: string) => `Les étudiants ${adj} peuvent-ils étudier aux États-Unis en 2027 ?`, (n: string) => `${n} est-il éligible aux bourses Commonwealth ?`],
    cwYes: (n: string) => `Oui. ${n} figure sur la liste des pays éligibles aux bourses de master Commonwealth pour 2027/28.`,
    cwNo: (n: string) => `Non. ${n} ne figure pas sur la liste des pays éligibles aux bourses de master Commonwealth pour 2027/28.`,
    hub: "Étudier à l'étranger : guides et bourses en français",
    hubDesc: "Guides vérifiés sur les bourses entièrement financées, les exonérations de frais de dossier, le doctorat financé, les études en France et au Canada, et les pages par pays pour l'Afrique francophone.",
    hubH1: "Étudier à l'étranger, et le financer.",
    hubLead: "Des réponses vérifiées sur les bourses entièrement financées, les exonérations de frais de dossier et les candidatures en licence, master et doctorat. Choisissez un guide ou votre pays.",
    guidesH: "Guides",
    countriesH: "Par pays",
  },
  es: {
    title: (c: string) => `Estudiar en el extranjero desde ${c}: becas, admisiones y visados para 2027`,
    seo: (adj: string, name: string) => `Becas para estudiantes ${adj}: estudiar en el extranjero (${name}, 2027)`,
    desc: (adj: string) => `Las becas totalmente financiadas abiertas a estudiantes ${adj} para licenciatura, maestría y doctorado en el extranjero, exenciones de tasas y las reglas de visado 2026-2027.`,
    table: (adj: string) => `Becas totalmente financiadas para estudiantes ${adj}`,
    col: ["Beca", "Para ti", "Por qué"],
    visa: "Reglas de visado 2026-2027",
    uk: "Reino Unido: desde el 30 de noviembre de 2026, 1.570 £ al mes en Londres o 1.203 £ fuera (hasta nueve meses); el visado de posgrado baja a 18 meses para solicitudes desde el 1 de enero de 2027.",
    ca: "Canadá: maestrías y doctorados en instituciones públicas exentos del tope de permisos; prueba de fondos de 23.448 $ fuera de Quebec.",
    fr: "España y Europa: muchas maestrías en inglés; becas Erasmus Mundus con 1.400 € al mes.",
    de: "Alemania: cuenta bloqueada de 11.904 € al año.",
    levels: "¿Licenciatura, maestría o doctorado?",
    levelText: [
      ["Licenciatura", "/es/guias/estudiar-licenciatura-en-el-extranjero"],
      ["Maestría", "/es/guias/becas-maestria-totalmente-financiadas"],
      ["Doctorado", "/es/guias/doctorado-financiado"],
    ],
    fees: "Tasas de solicitud: muchas universidades las eximen por dificultad económica, por asistir a una sesión informativa o ante una solicitud cortés.",
    feesLink: ["Cómo conseguir la exención", "/es/guias/exencion-tasa-de-solicitud"],
    local: "En tu país:",
    price: "Preparar con Ivyward es gratis; tus tres primeros envíos también. Después, Pro cuesta 20 dólares al mes por hasta diez envíos.",
    faqQ: [(adj: string) => `¿Qué becas totalmente financiadas están abiertas a estudiantes ${adj}?`, (adj: string) => `¿Pueden los estudiantes ${adj} estudiar en EE. UU. en 2027?`, (n: string) => `¿${n} es elegible para las becas Commonwealth?`],
    cwYes: (n: string) => `Sí. ${n} está en la lista de países elegibles para 2027/28.`,
    cwNo: (n: string) => `No. ${n} no está en la lista de países elegibles para las becas de maestría Commonwealth 2027/28.`,
    hub: "Estudiar en el extranjero: guías y becas en español",
    hubDesc: "Guías verificadas sobre becas totalmente financiadas, exención de tasas de solicitud, doctorados financiados, estudiar en Alemania y páginas por país para América Latina.",
    hubH1: "Estudiar afuera, y financiarlo.",
    hubLead: "Respuestas verificadas sobre becas totalmente financiadas, exenciones de tasas y postulaciones a licenciatura, maestría y doctorado. Elige una guía o tu país.",
    guidesH: "Guías",
    countriesH: "Por país",
  },
  pt: {
    title: (c: string) => `Estudar no exterior saindo ${c}: bolsas, admissões e vistos para 2027`,
    seo: (adj: string, name: string) => `Bolsas para estudantes ${adj}: estudar no exterior (${name}, 2027)`,
    desc: (adj: string) => `As bolsas totalmente financiadas abertas a estudantes ${adj} para graduação, mestrado e doutorado no exterior, isenção de taxas e as regras de visto de 2026-2027.`,
    table: (adj: string) => `Bolsas totalmente financiadas para estudantes ${adj}`,
    col: ["Bolsa", "Para você", "Por quê"],
    visa: "Regras de visto 2026-2027",
    uk: "Reino Unido: a partir de 30 de novembro de 2026, 1.570 £ por mês em Londres ou 1.203 £ fora (até nove meses); visto pós-estudo de 18 meses para pedidos a partir de 1º de janeiro de 2027.",
    ca: "Canadá: mestrados e doutorados em instituições públicas isentos do teto; prova de fundos de 23.448 dólares canadenses fora de Quebec.",
    fr: "Portugal e Europa: cursos em português em Portugal e muitos mestrados em inglês; Erasmus Mundus paga 1.400 € por mês.",
    de: "Alemanha: conta bloqueada de 11.904 € por ano.",
    levels: "Graduação, mestrado ou doutorado?",
    levelText: [
      ["Mestrado", "/pt/guias/bolsas-mestrado-totalmente-financiadas"],
      ["Doutorado", "/pt/guias/doutorado-financiado"],
      ["Alemanha sem anuidade", "/pt/guias/estudar-na-alemanha-de-graca"],
    ],
    fees: "Taxas de inscrição: muitas universidades dispensam a taxa por dificuldade financeira, participação em sessão informativa ou mediante pedido educado.",
    feesLink: ["Como conseguir a isenção", "/pt/guias/isencao-taxa-de-inscricao"],
    local: "No seu país:",
    price: "Na África, cada envio custa cerca de 1,90 dólar em moeda local; nos demais países, os três primeiros envios são grátis.",
    faqQ: [(adj: string) => `Quais bolsas totalmente financiadas estão abertas a estudantes ${adj}?`, (adj: string) => `Estudantes ${adj} podem estudar nos EUA em 2027?`, (n: string) => `${n} é elegível para as bolsas Commonwealth?`],
    cwYes: (n: string) => `Sim. ${n} está na lista de países elegíveis de 2027/28.`,
    cwNo: (n: string) => `Não. ${n} não está na lista de países elegíveis para as bolsas de mestrado Commonwealth de 2027/28.`,
    hub: "Estudar no exterior: guias e bolsas em português",
    hubDesc: "Guias verificados sobre bolsas totalmente financiadas, isenção de taxas de inscrição, doutorado financiado, Alemanha sem anuidade e páginas para Brasil e Moçambique.",
    hubH1: "Estudar fora, e pagar por isso.",
    hubLead: "Respostas verificadas sobre bolsas totalmente financiadas, isenção de taxas e candidaturas a mestrado e doutorado. Escolha um guia ou o seu país.",
    guidesH: "Guias",
    countriesH: "Por país",
  },
  ar: {
    title: (c: string) => `الدراسة في الخارج من ${c}: المنح والقبول والتأشيرات لعام 2027`,
    seo: (adj: string, name: string) => `منح دراسية للطلاب ${adj}: الدراسة في الخارج (${name}، 2027)`,
    desc: (adj: string) => `المنح الممولة بالكامل المتاحة للطلاب ${adj} للبكالوريوس والماجستير والدكتوراه في الخارج، والإعفاء من رسوم التقديم، وقواعد التأشيرات لعامي 2026 و2027.`,
    table: (adj: string) => `منح ممولة بالكامل للطلاب ${adj}`,
    col: ["المنحة", "بالنسبة لك", "السبب"],
    visa: "قواعد التأشيرات 2026-2027",
    uk: "بريطانيا: من 30 نوفمبر 2026 يلزم 1570 جنيهًا شهريًا في لندن أو 1203 جنيهات خارجها (حتى تسعة أشهر)، وتُختصر تأشيرة ما بعد الدراسة إلى 18 شهرًا للطلبات من 1 يناير 2027.",
    ca: "كندا: طلاب الماجستير والدكتوراه في المؤسسات الحكومية مستثنون من الحد الأقصى، وإثبات الأموال 23448 دولارًا كنديًا خارج كيبيك.",
    fr: "فرنسا وكيبيك: خيارات واسعة للناطقين بالفرنسية، ومنحة إيفل للمتفوقين.",
    de: "ألمانيا: حساب مغلق بقيمة 11904 يورو سنويًا.",
    levels: "ماجستير أم دكتوراه؟",
    levelText: [
      ["منح الماجستير الممولة بالكامل", "/ar/guides/fully-funded-masters"],
      ["الدكتوراه الممولة", "/ar/guides/funded-phd"],
      ["الدراسة في ألمانيا مجانًا", "/ar/guides/study-in-germany"],
    ],
    fees: "رسوم التقديم: تعفي جامعات كثيرة منها عند وجود صعوبات مالية أو حضور جلسة تعريفية أو بطلب مهذب.",
    feesLink: ["كيف تحصل على الإعفاء", "/ar/guides/application-fee-waivers"],
    local: "في بلدك:",
    price: "في أفريقيا، تكلفة كل طلب مُرسل نحو 1.90 دولار بالعملة المحلية؛ وفي غيرها، أول ثلاثة طلبات مجانية.",
    faqQ: [(adj: string) => `ما المنح الممولة بالكامل المتاحة للطلاب ${adj}؟`, (adj: string) => `هل يمكن للطلاب ${adj} الدراسة في الولايات المتحدة في 2027؟`, (n: string) => `هل تشمل منح الكومنولث ${n}؟`],
    cwYes: (n: string) => `نعم. تشمل قائمة الدول المؤهلة لعام 2027/2028 ${n}.`,
    cwNo: (n: string) => `لا. لا تشمل قائمة الدول المؤهلة لمنح الكومنولث للماجستير 2027/2028 ${n}.`,
    hub: "الدراسة في الخارج: أدلة ومنح بالعربية",
    hubDesc: "أدلة موثّقة عن المنح الممولة بالكامل والإعفاء من رسوم التقديم والدكتوراه الممولة والدراسة في ألمانيا، وصفحات لمصر والمغرب وتونس والأردن.",
    hubH1: "ادرس في الخارج، واحصل على التمويل.",
    hubLead: "إجابات موثّقة عن المنح الممولة بالكامل والإعفاء من الرسوم والتقديم للماجستير والدكتوراه. اختر دليلًا أو بلدك.",
    guidesH: "الأدلة",
    countriesH: "حسب البلد",
  },
} as const;

const UPDATED = "2026-11-01";

// how the country reads inside the page title in each language
function placeFor(lang: Lang, c: { slug: string; name: string; art?: "Le" | "La" }) {
  if (lang === "fr") return `${c.art === "La" ? "la" : "le"} ${c.name}`;
  if (lang === "pt") return c.slug === "brasil" ? "do Brasil" : `de ${c.name}`;
  return c.name;
}

export function localCountryMetadata(lang: Lang, slug: string): Metadata {
  const c = localCountry(lang, slug);
  if (!c) return {};
  const k = COPY[lang];
  const self = countryUrl(lang, c.slug);
  return {
    title: k.seo(c.adj, c.name),
    description: k.desc(c.adj),
    alternates: { canonical: self, languages: { [lang]: self, en: `/study-abroad/${c.en}`, "x-default": `/study-abroad/${c.en}` } },
    openGraph: { type: "article", title: k.title(placeFor(lang, c)), description: k.desc(c.adj), url: self, locale: L[lang].locale },
  };
}

export function LocalCountryPage({ lang, slug }: { lang: Lang; slug: string }) {
  const c = localCountry(lang, slug);
  if (!c) notFound();
  const t = L[lang];
  const k = COPY[lang];
  const o = baseOrigin(c);
  const fits = localFits(lang, c);
  const open = fits.filter((f) => f.status === "open");
  const path = countryUrl(lang, c.slug);
  const place = placeFor(lang, c);
  const pretty = k.title(place);
  const local = c.local ?? o.local;
  const answer =
    lang === "fr"
      ? `Les étudiants ${c.adj} peuvent postuler à ${open.length} des ${fits.length} grandes bourses entièrement financées que nous suivons, dont ${open.slice(0, 5).map((f) => f.name.replace(/ \(.*\)/, "")).join(", ")}. ${localUsLine(lang, c)}`
      : `Los estudiantes ${c.adj} pueden postular a ${open.length} de las ${fits.length} grandes becas totalmente financiadas que seguimos, entre ellas ${open.slice(0, 5).map((f) => f.name.replace(/ \(.*\)/, "")).join(", ")}${local?.length ? `, además de programas nacionales como ${local[0]}` : ""}. ${localUsLine(lang, c)}`;
  const cw = COMMONWEALTH_ELIGIBLE.has(o.name);
  const faq: [string, string][] = [
    [k.faqQ[0](c.adj), `${open.map((f) => f.name).join(" ; ")}.`],
    [k.faqQ[1](c.adj), localUsLine(lang, c)],
    [k.faqQ[2](the(c)), cw ? k.cwYes(the(c)) : k.cwNo(the(c))],
  ];
  const peers = localCountries(lang).filter((x) => x.slug !== c.slug).map((x) => ({ href: countryUrl(lang, x.slug), title: x.name }));
  return (
    <LocalShell lang={lang} crumbs={[[t.library, t.home], [c.name, path]]} english={`/study-abroad/${c.en}`}>
      <ArticleJsonLd path={path} title={pretty} description={answer} updated={UPDATED} faq={faq} about={[k.table(c.adj)]} />
      <div className="mx-auto max-w-[780px] px-5 pb-20 pt-10 sm:pt-14">
        <LocalCrumbs items={[["Ivyward", t.home], [t.countries, `${t.home}#pays`]]} />
        <h1 className="mt-5 text-[34px] leading-[1.1] sm:text-[48px]">{pretty}</h1>
        <p className="mt-4 text-[13.5px] text-muted">
          {t.checked} {localDate(UPDATED, lang)}
        </p>
        <LocalAnswer lang={lang}>{answer}</LocalAnswer>
        <section className="mt-10">
          <h2 className="font-serif text-[27px]">{k.table(c.adj)}</h2>
          <div className="mt-4 overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-[14.5px]">
              <thead className="bg-surface text-start">
                <tr>
                  {k.col.map((h) => (
                    <th key={h} className="px-4 py-2.5 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fits.map((f) => (
                  <tr key={f.name} className="border-t border-line align-top">
                    <td className="px-4 py-2.5">
                      <Link href={f.href.startsWith("/scholarships/") ? scholarshipHref(lang, f.href.slice(14)) : f.href} className="text-brand underline decoration-current/30 underline-offset-4">
                        {f.name}
                      </Link>
                    </td>
                    <td className={`px-4 py-2.5 font-medium ${f.status === "open" ? "text-go" : f.status === "no" ? "text-muted" : ""}`}>{t[f.status]}</td>
                    <td className="px-4 py-2.5 text-muted">{f.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {local?.length ? (
            <p className="mt-4 text-[15px]">
              <strong>{k.local}</strong> {local.join(" ; ")}.
            </p>
          ) : null}
        </section>
        <div className="prose-iv mt-10">
          <h2>{k.visa}</h2>
          <ul>
            <li>{localUsLine(lang, c)}</li>
            <li>{k.uk}</li>
            <li>{k.ca}</li>
            <li>{k.fr}</li>
            <li>{k.de}</li>
          </ul>
          <h2>{k.levels}</h2>
          <ul>
            {k.levelText.map(([label, href]) => (
              <li key={href}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>
          <p>
            {k.fees} <Link href={k.feesLink[1]}>{k.feesLink[0]}</Link>.
          </p>
        </div>
        <LocalCta lang={lang} body={`${t.ctaBody} ${k.price}`} />
        <LocalFaq lang={lang} items={faq} />
        <LocalRelated lang={lang} items={peers} />
      </div>
    </LocalShell>
  );
}

// ---------- hub ----------

export function localHubMetadata(lang: Lang): Metadata {
  const k = COPY[lang];
  return {
    title: k.hub,
    description: k.hubDesc,
    alternates: { canonical: L[lang].home, languages: { en: "/guides", fr: "/fr", es: "/es", pt: "/pt", ar: "/ar", "x-default": "/guides" } },
    openGraph: { title: k.hub, description: k.hubDesc, url: L[lang].home, locale: L[lang].locale },
  };
}

export function LocalHub({ lang }: { lang: Lang }) {
  const t = L[lang];
  const k = COPY[lang];
  const guides = LOCAL[lang];
  const countries = localCountries(lang);
  return (
    <LocalShell lang={lang} crumbs={[[t.library, t.home]]} english="/guides">
      <ItemListJsonLd path={t.home} name={k.hub} items={[...guides.map((g) => [g.title, guideUrl(lang, g.slug)] as [string, string]), ...countries.map((c) => [c.name, countryUrl(lang, c.slug)] as [string, string])]} />
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-12 sm:pt-16">
        <header className="max-w-3xl">
          <h1 className="text-[42px] leading-[1.05] sm:text-[60px]">{k.hubH1}</h1>
          <p className="mt-5 text-[18px] leading-relaxed text-muted">{k.hubLead}</p>
        </header>
        <section className="mt-14" aria-labelledby="g-h">
          <h2 id="g-h" className="border-b border-line pb-3 font-serif text-[30px]">
            {k.guidesH}
          </h2>
          <ul className="mt-2 divide-y divide-line">
            {guides.map((g) => (
              <li key={g.slug}>
                <Link href={guideUrl(lang, g.slug)} className="group grid gap-1 py-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:gap-8">
                  <span className="font-serif text-[21px] leading-snug group-hover:text-brand">{g.title}</span>
                  <span className="text-[15px] leading-relaxed text-muted">{g.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        {(LOCAL_SCHOLARSHIPS[lang] ?? []).length > 0 && (
          <section className="mt-14" aria-labelledby="s-h">
            <h2 id="s-h" className="border-b border-line pb-3 font-serif text-[30px]">
              {lang === "fr" ? "Bourses" : "Becas"}
            </h2>
            <ul className="mt-3 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
              {(LOCAL_SCHOLARSHIPS[lang] ?? []).map((x) => (
                <li key={x.slug}>
                  <Link href={scholarshipHref(lang, x.slug)} className="flex items-baseline justify-between gap-3 border-b border-line py-3 hover:text-brand">
                    <span className="font-serif text-[18px]">{enScholarship(x.slug)?.name ?? x.slug}</span>
                    <span className="shrink-0 text-[13px] text-muted">{x.country}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section id="pays" className="mt-14 scroll-mt-24" aria-labelledby="c-h">
          <h2 id="c-h" className="border-b border-line pb-3 font-serif text-[30px]">
            {k.countriesH}
          </h2>
          <ul className="mt-3 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
            {countries.map((c) => (
              <li key={c.slug}>
                <Link href={countryUrl(lang, c.slug)} className="block border-b border-line py-3 font-serif text-[18.5px] hover:text-brand">
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <div className="max-w-3xl">
          <LocalCta lang={lang} />
        </div>
      </div>
    </LocalShell>
  );
}

// ---------- scholarship profiles (French and Spanish) ----------

const SCH = {
  fr: { root: "Bourses", title: (n: string) => `${n} : conditions, ce qu'elle couvre et comment postuler`, desc: "Qui peut postuler, ce que la bourse finance, la date limite habituelle et la procédure.", facts: ["Pays d'études", "Pour qui", "Date limite habituelle", "Financement"], covers: "Ce qu'elle couvre", elig: "Qui peut postuler", how: "Comment postuler", official: "Page officielle :", disclaimer: (f: string) => `Les règles, montants et dates changent à chaque cycle. Vérifiez sur la page officielle. Ivyward n'est pas affilié à ${f}.`, full: "Entièrement financée", partial: "Financement partiel", varies: "Variable", cta: (n: string) => `Postulez à ${n} avec Ivyward`, ctaBody: "Ivyward vérifie votre éligibilité, rédige vos essais à partir de votre parcours en signalant toute affirmation non justifiée, suit chaque date limite et dépose les candidatures universitaires nécessaires. Vous relisez et signez tout." },
  es: { root: "Becas", title: (n: string) => `${n}: requisitos, qué cubre y cómo postular`, desc: "Quién puede postular, qué financia la beca, el plazo habitual y cómo postular.", facts: ["País de estudio", "Para quién", "Plazo habitual", "Financiación"], covers: "Qué cubre", elig: "Quién puede postular", how: "Cómo postular", official: "Página oficial:", disclaimer: (f: string) => `Las reglas, montos y fechas cambian en cada ciclo. Confirma en la página oficial. Ivyward no está afiliado a ${f}.`, full: "Totalmente financiada", partial: "Financiación parcial", varies: "Variable", cta: (n: string) => `Postula a ${n} con Ivyward`, ctaBody: "Ivyward revisa tu elegibilidad, redacta tus ensayos a partir de tu trayectoria señalando cualquier afirmación sin respaldo, sigue cada plazo y envía las postulaciones universitarias necesarias. Tú revisas y firmas todo." },
} as const;

type SchLang = keyof typeof SCH;

export function localScholarshipMetadata(lang: SchLang, slug: string): Metadata {
  const ls = localScholarship(lang, slug);
  const en = enScholarship(slug);
  if (!ls || !en) return {};
  const self = `${lang === "fr" ? "/fr/bourses" : "/es/becas"}/${slug}`;
  const languages: Record<string, string> = { en: `/scholarships/${slug}`, "x-default": `/scholarships/${slug}`, ...translationsOfScholarship(slug) };
  return {
    title: SCH[lang].title(en.name),
    description: `${ls.summary.split(". ")[0]}. ${SCH[lang].desc}`.slice(0, 300),
    alternates: { canonical: self, languages },
    openGraph: { type: "article", title: SCH[lang].title(en.name), url: self, locale: L[lang].locale },
  };
}

export function LocalScholarshipPage({ lang, slug }: { lang: SchLang; slug: string }) {
  const ls = localScholarship(lang, slug);
  const en = enScholarship(slug);
  if (!ls || !en) notFound();
  const k = SCH[lang];
  const t = L[lang];
  const path = `${lang === "fr" ? "/fr/bourses" : "/es/becas"}/${slug}`;
  const funding = en.funding === "Fully funded" ? k.full : en.funding === "Partly funded" ? k.partial : k.varies;
  const facts: [string, string][] = [
    [k.facts[0], ls.country],
    [k.facts[1], ls.forWhom],
    [k.facts[2], ls.deadline],
    [k.facts[3], funding],
  ];
  const others = (LOCAL_SCHOLARSHIPS[lang] ?? []).filter((x) => x.slug !== slug && x.country === ls.country).slice(0, 4);
  const list = (title: string, items: string[]) => (
    <section className="mt-10">
      <h2 className="font-serif text-[26px] leading-tight">{title}</h2>
      <ul className="prose-iv mt-3">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </section>
  );
  return (
    <LocalShell lang={lang} crumbs={[[k.root, t.home], [en.name, path]]} english={`/scholarships/${slug}`}>
      <ArticleJsonLd path={path} title={k.title(en.name)} description={ls.summary} updated={en.updated} about={[en.name]} />
      <div className="mx-auto max-w-[760px] px-5 pb-20 pt-10 sm:pt-14">
        <LocalCrumbs items={[["Ivyward", t.home], [k.root, t.home]]} />
        <h1 className="mt-5 text-[38px] leading-[1.08] sm:text-[50px]">{en.name}</h1>
        <p className="mt-4 text-[13.5px] text-muted">
          {t.checked} {localDate(en.updated, lang)}
        </p>
        <LocalAnswer lang={lang}>{ls.summary}</LocalAnswer>
        <dl className="mt-8 grid overflow-hidden rounded-2xl border border-line sm:grid-cols-2">
          {facts.map(([a, b]) => (
            <div key={a} className="border-b border-line p-4 sm:[&:nth-child(odd)]:border-e">
              <dt className="text-[12.5px] text-muted">{a}</dt>
              <dd className="mt-0.5 text-[15px] font-medium leading-snug">{b}</dd>
            </div>
          ))}
        </dl>
        {list(k.covers, ls.covers)}
        {list(k.elig, ls.eligibility)}
        {list(k.how, ls.howToApply)}
        <p className="mt-8 text-[15px]">
          {k.official}{" "}
          <a href={en.url} target="_blank" rel="noopener" className="break-all text-brand underline decoration-current/30 underline-offset-4">
            {en.url.replace(/^https?:\/\//, "")}
          </a>
        </p>
        <LocalCta lang={lang} title={k.cta(en.name)} body={k.ctaBody} />
        <p className="mt-6 text-[13.5px] leading-relaxed text-muted">{k.disclaimer(en.funder)}</p>
        <LocalRelated lang={lang} items={others.map((o) => ({ href: `${lang === "fr" ? "/fr/bourses" : "/es/becas"}/${o.slug}`, title: enScholarship(o.slug)?.name ?? o.slug }))} />
      </div>
    </LocalShell>
  );
}
