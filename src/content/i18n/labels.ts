import type { Lang } from "./types";

// interface words for the French and Spanish library pages
export const L = {
  fr: {
    locale: "fr_FR",
    home: "/fr",
    guidesPath: "/fr/guides",
    countriesPath: "/fr/etudier-a-l-etranger",
    library: "Guides en français",
    countries: "Par pays",
    shortAnswer: "En bref",
    faq: "Questions fréquentes",
    sources: "Sources",
    sourcesNote: "Les dates, montants et règles changent. Vérifiez toujours sur la page officielle avant de postuler.",
    readNext: "À lire aussi",
    checked: "Vérifié auprès des sources officielles le",
    minutes: "min de lecture",
    start: "Commencer gratuitement",
    signIn: "Se connecter",
    english: "English",
    ctaTitle: "Laissez les agents faire le travail",
    ctaBody:
      "Ivyward établit votre liste de programmes, rédige et vérifie vos essais à partir de votre propre parcours, demande les exonérations de frais de dossier, trouve des financements et remplit chaque portail de candidature. Vous relisez et signez. La préparation est gratuite. (L'interface d'Ivyward est en anglais pour l'instant ; les agents remplissent les portails dans la langue de chaque université.)",
    footer: "Ivyward : des agents IA qui gèrent vos candidatures universitaires, de la liste de programmes à la soumission. Vous relisez et signez tout.",
    breadcrumbRoot: "Ivyward",
    open: "Ouvert",
    check: "À vérifier",
    no: "Non ouvert",
  },
  es: {
    locale: "es_ES",
    home: "/es",
    guidesPath: "/es/guias",
    countriesPath: "/es/estudiar-en-el-extranjero",
    library: "Guías en español",
    countries: "Por país",
    shortAnswer: "En resumen",
    faq: "Preguntas frecuentes",
    sources: "Fuentes",
    sourcesNote: "Las fechas, montos y reglas cambian. Confirma siempre en la página oficial antes de postular.",
    readNext: "Sigue leyendo",
    checked: "Verificado con fuentes oficiales el",
    minutes: "min de lectura",
    start: "Empieza gratis",
    signIn: "Iniciar sesión",
    english: "English",
    ctaTitle: "Deja que los agentes hagan el trabajo",
    ctaBody:
      "Ivyward arma tu lista de programas, redacta y verifica tus ensayos a partir de tu propia trayectoria, pide exenciones de la tasa de solicitud, busca financiamiento y llena cada portal de admisión. Tú revisas y firmas. Preparar es gratis. (Por ahora la interfaz de Ivyward está en inglés; los agentes llenan los portales en el idioma de cada universidad.)",
    footer: "Ivyward: agentes de IA que gestionan tus postulaciones universitarias, desde la lista de programas hasta el envío. Tú revisas y firmas todo.",
    breadcrumbRoot: "Ivyward",
    open: "Abierta",
    check: "Por verificar",
    no: "No abierta",
  },
} satisfies Record<Lang, Record<string, string>>;

export function localDate(iso: string, lang: Lang) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(lang === "fr" ? "fr-FR" : "es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}
