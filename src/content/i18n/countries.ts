import { COMMONWEALTH_ELIGIBLE, US_FULL, US_PARTIAL, fitsFor, origin, type Origin } from "../countries";
import type { Lang } from "./types";

// French pages for francophone countries, Spanish pages for Spanish-speaking ones, built from the same checked lists
// as the English country pages.
type LocalOrigin = { slug: string; en: string; name: string; adj: string; local?: string[]; art?: "Le" | "La" };

// "Le Sénégal", "La Côte d'Ivoire"; Spanish uses the bare name
export const the = (c: LocalOrigin) => (c.art ? `${c.art} ${c.name}` : c.name);

export const FR_COUNTRIES: LocalOrigin[] = [
  { art: "Le", slug: "senegal", en: "senegal", name: "Sénégal", adj: "sénégalais" },
  { art: "La", slug: "cote-d-ivoire", en: "cote-divoire", name: "Côte d'Ivoire", adj: "ivoiriens" },
  { art: "Le", slug: "cameroun", en: "cameroon", name: "Cameroun", adj: "camerounais" },
  { art: "Le", slug: "benin", en: "benin", name: "Bénin", adj: "béninois" },
  { art: "Le", slug: "togo", en: "togo", name: "Togo", adj: "togolais" },
  { art: "Le", slug: "maroc", en: "morocco", name: "Maroc", adj: "marocains" },
  { art: "La", slug: "tunisie", en: "tunisia", name: "Tunisie", adj: "tunisiens" },
];

export const ES_COUNTRIES: LocalOrigin[] = [
  { slug: "mexico", en: "mexico", name: "México", adj: "mexicanos" },
  { slug: "colombia", en: "colombia", name: "Colombia", adj: "colombianos", local: ["COLFUTURO (crédito-beca)"] },
  { slug: "peru", en: "peru", name: "Perú", adj: "peruanos", local: ["Becas PRONABEC"] },
  { slug: "chile", en: "chile", name: "Chile", adj: "chilenos", local: ["Becas Chile (ANID)"] },
];

export const localCountries = (lang: Lang) => (lang === "fr" ? FR_COUNTRIES : ES_COUNTRIES);
export const localCountry = (lang: Lang, slug: string) => localCountries(lang).find((c) => c.slug === slug);
export const baseOrigin = (c: LocalOrigin) => origin(c.en) as Origin;

const NAMES: Record<Lang, string[]> = {
  fr: ["Chevening (Royaume-Uni, master)", "Commonwealth Master's (Royaume-Uni)", "Gates Cambridge (Royaume-Uni)", "Clarendon (Oxford)", "Rhodes (Oxford)", "Erasmus Mundus (Europe)", "DAAD / EPOS (Allemagne)", "Mastercard Foundation", "Knight-Hennessy (Stanford)", "Fulbright (États-Unis)", "MEXT (Japon)", "GKS (Corée du Sud)", "Türkiye Bursları", "Bourse du gouvernement chinois", "Stipendium Hungaricum (Hongrie)", "JJ/WBGSP (master développement)"],
  es: ["Chevening (Reino Unido, maestría)", "Commonwealth Master's (Reino Unido)", "Gates Cambridge (Reino Unido)", "Clarendon (Oxford)", "Rhodes (Oxford)", "Erasmus Mundus (Europa)", "DAAD / EPOS (Alemania)", "Mastercard Foundation", "Knight-Hennessy (Stanford)", "Fulbright (EE. UU.)", "MEXT (Japón)", "GKS (Corea del Sur)", "Türkiye Bursları", "Beca del gobierno chino", "Stipendium Hungaricum (Hungría)", "JJ/WBGSP (maestría en desarrollo)"],
};

function notes(lang: Lang, c: LocalOrigin, o: Origin): string[] {
  const cw = COMMONWEALTH_ELIGIBLE.has(o.name);
  const us = US_FULL.has(o.name) || US_PARTIAL.has(o.name);
  const africa = o.region === "Africa";
  const dev = o.name !== "Chile";
  if (lang === "fr")
    return [
      "Présente dans la plupart des pays ; vérifiez que le vôtre figure sur la liste Chevening",
      cw ? `${the(c)} figure sur la liste 2027/28` : `${the(c)} ne figure pas sur la liste 2027/28`,
      "Ouverte à tous les non-Britanniques",
      "Toutes nationalités, examen automatique",
      "Vérifiez s'il existe une circonscription pour votre pays, ou candidatez au tour Global",
      "Toutes nationalités",
      "EPOS vise les professionnels de pays en développement",
      africa ? "Pour les jeunes Africains en difficulté financière" : "Réservée aux Africains",
      us ? "Ouverte à tous, mais les nouveaux visas étudiants américains sont suspendus pour votre nationalité" : "Toutes nationalités",
      us ? "Son visa J-1 relève des restrictions américaines de 2026 pour votre nationalité" : "Gérée par la commission Fulbright ou l'ambassade américaine de votre pays",
      "Via l'ambassade du Japon",
      "Via l'ambassade ou une université",
      "Toutes nationalités, dans les limites d'âge",
      "Via l'ambassade de Chine ou une université",
      "Vérifiez que votre pays est partenaire cette année",
      "Trois ans d'expérience dans le développement",
    ];
  return [
    "Presente en la mayoría de los países; confirma que el tuyo está en la lista de Chevening",
    cw ? `${c.name} está en la lista 2027/28` : `${c.name} no está en la lista 2027/28`,
    "Abierta a todos los no británicos",
    "Todas las nacionalidades, evaluación automática",
    "Revisa si hay una circunscripción para tu país o postula en la ronda Global",
    "Todas las nacionalidades",
    dev ? "EPOS está dirigida a profesionales de países en desarrollo" : "Revisa la base de datos del DAAD para tu país",
    "Solo para ciudadanos africanos",
    us ? "Abierta a todos, pero los nuevos visados de estudiante de EE. UU. están restringidos para tu nacionalidad" : "Todas las nacionalidades",
    "La gestiona la comisión Fulbright o la embajada de EE. UU. en tu país; revisa la convocatoria",
    "Vía la embajada de Japón",
    "Vía embajada o universidad",
    "Todas las nacionalidades, dentro de los límites de edad",
    "Vía la embajada de China o una universidad",
    "Revisa si tu país es socio este año",
    dev ? "Tres años de experiencia en desarrollo" : "Para países miembros en desarrollo del Banco Mundial",
  ];
}

export function localFits(lang: Lang, c: LocalOrigin) {
  const o = baseOrigin(c);
  const base = fitsFor(o);
  const n = notes(lang, c, o);
  return base.map((f, i) => ({ href: f.href, status: f.status, name: NAMES[lang][i], note: n[i] }));
}

export function localUsLine(lang: Lang, c: LocalOrigin) {
  const o = baseOrigin(c);
  if (lang === "fr") {
    if (US_FULL.has(o.name)) return `${the(c)} est soumis à des restrictions d'entrée totales aux États-Unis depuis le 1er janvier 2026 : les nouveaux visas étudiants sont suspendus.`;
    if (US_PARTIAL.has(o.name)) return `${the(c)} est soumis à des restrictions partielles depuis le 1er janvier 2026 : les nouveaux visas F, M et J (études et échanges) sont suspendus pour les ressortissants ${c.adj}. Les étudiants qui ont déjà un visa valide ne sont pas concernés.`;
    return `${the(c)} ne figure pas sur les listes de restrictions américaines entrées en vigueur le 1er janvier 2026 : les étudiants ${c.adj} peuvent demander un visa F-1 normalement.`;
  }
  if (US_FULL.has(o.name)) return `${c.name} tiene restricción total de ingreso a EE. UU. desde el 1 de enero de 2026: los nuevos visados de estudiante están suspendidos.`;
  if (US_PARTIAL.has(o.name)) return `${c.name} tiene restricción parcial desde el 1 de enero de 2026: los nuevos visados F, M y J están suspendidos.`;
  return `${c.name} no está en las listas de restricción de EE. UU. que entraron en vigor el 1 de enero de 2026: los estudiantes ${c.adj} pueden solicitar el visado F-1 con normalidad.`;
}
