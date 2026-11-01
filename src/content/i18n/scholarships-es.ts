import type { LocalScholarship } from "./scholarship-types";

// Spanish versions of the scholarship profiles. Slugs match the English profiles; facts mirror them (checked 31 Oct 2026).
export const SCHOLARSHIPS_ES: LocalScholarship[] = [
  {
    slug: "chevening",
    country: "Reino Unido",
    forWhom: "Ciudadanos de países elegibles para Chevening con al menos dos años de experiencia laboral",
    summary:
      "Chevening es la beca global del gobierno británico para futuros líderes. Financia una maestría de un año en cualquier universidad del Reino Unido: matrícula, asignación mensual, pasaje de ida y vuelta y tasa del visado. Se necesitan unos dos años de experiencia (2.800 horas), una admisión en una universidad británica y el compromiso de volver a tu país al menos dos años. Abre a inicios de agosto y cierra a inicios de octubre; la ronda 2027/28 cerró el 6 de octubre de 2026.",
    covers: ["Matrícula de una maestría de un año", "Asignación mensual", "Un pasaje de ida y vuelta", "Tasa del visado y prueba de tuberculosis"],
    eligibility: ["Ciudadano de un país elegible", "2.800 horas de experiencia tras el primer título", "Postular a tres maestrías británicas y tener una admisión definitiva antes de inicios de julio", "Volver a tu país al menos dos años"],
    deadline: "Abre a inicios de agosto y cierra a inicios de octubre, unos once meses antes del inicio.",
    howToApply: ["Postular en línea en el sitio de Chevening con cuatro ensayos (liderazgo, redes, estudiar en el Reino Unido, plan profesional)", "Postular por separado a las universidades", "Entrevistas entre marzo y abril en la embajada británica", "Resultados desde mediados de junio"],
  },
  {
    slug: "commonwealth-masters",
    country: "Reino Unido",
    forWhom: "Ciudadanos de países del Commonwealth elegibles, mediante la agencia nacional",
    summary:
      "Las becas de maestría del Commonwealth financian una maestría de un año en el Reino Unido para ciudadanos de países elegibles del Commonwealth (como Jamaica, Guyana, Belice, India, Nigeria o Kenia). Cubren matrícula, pasajes y una asignación de 1.712 £ al mes (2.000 £ en Londres). No se postula directamente: hay que pasar por la agencia nacional de nominación y luego completar el formulario de la Comisión, que cerró el 20 de octubre de 2026 para 2027/28.",
    covers: ["Matrícula", "Pasaje de ida y vuelta", "Asignación mensual de 1.712 £, o 2.000 £ en Londres", "Ayuda para viajes de estudio"],
    eligibility: ["Ciudadano y residente de un país del Commonwealth elegible", "Título con nota alta (2:1 o equivalente)", "No poder costear los estudios sin la beca", "No haber cursado ya una maestría en el Reino Unido"],
    deadline: "Las agencias nacionales cierran antes; el formulario de la Comisión cerró el 20 de octubre de 2026 para 2027/28.",
    howToApply: ["Contactar a la agencia nacional de nominación de tu país", "Si te nominan, completar la postulación en CSC Central", "Elegir hasta tres maestrías ligadas a los temas de desarrollo"],
  },
  {
    slug: "gates-cambridge",
    country: "Reino Unido",
    forWhom: "Cualquier persona no británica que postule a un posgrado a tiempo completo en Cambridge",
    summary:
      "Gates Cambridge financia el costo total de un posgrado en la Universidad de Cambridge para postulantes no británicos: tasas, asignación, pasajes y visado. Unas 80 becas al año. Se postula en el formulario normal de Cambridge marcando la casilla de Gates Cambridge: en octubre los estadounidenses y en diciembre o enero el resto.",
    covers: ["Tasas universitarias", "Asignación de manutención", "Pasajes de ida y vuelta", "Visado y recargo sanitario"],
    eligibility: ["Cualquier nacionalidad excepto británica", "Maestría de al menos un año o doctorado a tiempo completo en Cambridge", "Excelencia académica, liderazgo y compromiso social"],
    deadline: "Mediados de octubre para estadounidenses; inicios de diciembre o de enero para el resto.",
    howToApply: ["Postular al curso en el portal de Cambridge", "Completar la sección de Gates Cambridge en el mismo formulario", "Entrevistas para preseleccionados"],
  },
  {
    slug: "rhodes",
    country: "Reino Unido",
    forWhom: "Jóvenes graduados (a menudo 18-24 años) de las circunscripciones Rhodes o la ronda global",
    summary:
      "La beca Rhodes, la más antigua del mundo, financia un posgrado en Oxford: tasas, asignación, pasajes y visado, normalmente por dos años. La mayoría de las plazas se reparte por circunscripciones nacionales o regionales, cada una con su límite de edad y plazo (sobre todo de julio a octubre); el resto postula en la ronda global.",
    covers: ["Todas las tasas de Oxford", "Asignación", "Pasajes", "Visado y recargo sanitario"],
    eligibility: ["Pertenecer a una circunscripción Rhodes o a la ronda global", "Límite de edad de la circunscripción", "Expediente académico excelente", "Liderazgo y vocación de servicio"],
    deadline: "Fijado por cada circunscripción, sobre todo entre julio y octubre.",
    howToApply: ["Revisar la página de tu circunscripción", "Declaración personal, CV, notas y cinco a ocho referencias", "Entrevistas en octubre o noviembre"],
  },
  {
    slug: "clarendon",
    country: "Reino Unido",
    forWhom: "Postulantes a Oxford de cualquier nacionalidad, por mérito académico",
    summary:
      "Clarendon es la principal beca de posgrado de la Universidad de Oxford: matrícula completa y asignación de manutención. No hay postulación aparte: quien postula a un curso elegible antes del plazo de diciembre o enero es considerado automáticamente.",
    covers: ["Matrícula", "Asignación de manutención"],
    eligibility: ["Postular a un posgrado elegible en Oxford", "Cualquier nacionalidad"],
    deadline: "El plazo del curso en Oxford de diciembre o enero (el marcado para financiación).",
    howToApply: ["Postular al curso antes del plazo de financiación", "Evaluación automática, sin formulario aparte"],
  },
  {
    slug: "knight-hennessy",
    country: "Estados Unidos",
    forWhom: "Graduados recientes de cualquier nacionalidad que postulen a un posgrado en Stanford",
    summary:
      "Knight-Hennessy financia hasta tres años de cualquier posgrado en Stanford (MBA, JD, MD, maestría o doctorado) para cualquier nacionalidad: matrícula, estipendio y viajes. Se postula a Knight-Hennessy y, por separado, al programa de Stanford; el plazo es a inicios o mediados de octubre, un año antes del inicio. Ojo: desde el 1 de enero de 2026, los nuevos visados de estudiante de EE. UU. están restringidos para nacionales de varios países, entre ellos Cuba, Venezuela y Haití.",
    covers: ["Matrícula y tasas", "Estipendio de manutención", "Un viaje de ida y vuelta al año", "Programa de liderazgo"],
    eligibility: ["Cualquier nacionalidad", "Licenciatura obtenida en los últimos siete años aproximadamente", "Admisión a un posgrado de Stanford"],
    deadline: "Inicios a mediados de octubre, el año anterior al inicio.",
    howToApply: ["Ensayos cortos, video, CV y dos recomendaciones", "Postulación aparte al programa de Stanford", "Fin de semana de selección en febrero"],
  },
  {
    slug: "fulbright-foreign-student",
    country: "Estados Unidos",
    forWhom: "Graduados de más de 150 países, mediante la comisión Fulbright o la embajada de EE. UU. en su país",
    summary:
      "El programa Fulbright para estudiantes extranjeros financia maestrías y doctorados en EE. UU.: matrícula, estipendio, pasajes y seguro. Cada país organiza su concurso. El programa sufrió recortes en 2025, y los nacionales de países con restricciones de visado desde el 1 de enero de 2026 pueden no obtener el visado J-1. Revisa la página Fulbright de tu país.",
    covers: ["Matrícula (a menudo compartida con la universidad)", "Estipendio mensual", "Pasaje de ida y vuelta", "Seguro"],
    eligibility: ["Ciudadano de un país participante que postula desde allí", "Licenciatura y requisitos nacionales", "Compromiso de volver (regla de dos años del J-1)"],
    deadline: "Fijado por cada país, a menudo entre febrero y octubre, más de un año antes.",
    howToApply: ["Buscar la comisión o embajada de tu país", "Ensayos, referencias y notas", "Entrevista y ubicación por el IIE"],
  },
  {
    slug: "daad",
    country: "Alemania",
    forWhom: "Graduados internacionales, incluido EPOS para profesionales de países en desarrollo",
    summary:
      "El DAAD financia maestrías y doctorados en Alemania. Su programa EPOS (posgrados relacionados con el desarrollo) paga un estipendio mensual, seguro y viaje en maestrías seleccionadas y suele pedir dos años de experiencia. Como las universidades públicas alemanas casi no cobran matrícula, el estipendio cubre la manutención. Plazos por curso, sobre todo de agosto a octubre.",
    covers: ["Estipendio mensual", "Seguro de salud, accidentes y responsabilidad", "Ayuda para el viaje", "A veces un curso previo de alemán"],
    eligibility: ["Licenciatura (para EPOS, normalmente de menos de seis años)", "Para EPOS: ciudadano de un país en desarrollo con dos años de experiencia", "Requisitos de idioma del curso"],
    deadline: "Fijado por cada curso; para EPOS, a menudo de agosto a octubre.",
    howToApply: ["Buscar en la base de becas del DAAD", "Para EPOS, postular directamente al curso participante", "Carta de motivación, CV, referencias y prueba de experiencia"],
  },
  {
    slug: "erasmus-mundus",
    country: "Europa (varios países)",
    forWhom: "Estudiantes de cualquier nacionalidad admitidos en una maestría conjunta Erasmus Mundus",
    summary:
      "Las maestrías conjuntas Erasmus Mundus se imparten entre universidades de al menos dos países europeos, y sus becas cubren matrícula, viaje y una asignación de 1.400 € al mes durante todo el programa (uno o dos años). No hay postulación central: se postula a cada consorcio, normalmente entre octubre y febrero para empezar en septiembre.",
    covers: ["Costos de participación (matrícula, seguro)", "Asignación de 1.400 € al mes", "Contribución al viaje e instalación"],
    eligibility: ["Cualquier nacionalidad", "Licenciatura (o terminada antes del inicio)", "Requisitos del programa", "Solo una beca Erasmus Mundus por persona"],
    deadline: "Fijado por cada programa, sobre todo de octubre a febrero.",
    howToApply: ["Revisar el catálogo Erasmus Mundus de la EACEA", "Postular hasta a tres programas en el sitio de cada consorcio"],
  },
  {
    slug: "mastercard-foundation",
    country: "Varios países",
    forWhom: "Jóvenes africanos con necesidad económica y compromiso con su comunidad",
    summary:
      "El programa Mastercard Foundation Scholars financia los estudios de jóvenes africanos con necesidad económica en universidades aliadas de África y otros continentes (Edimburgo, Toronto, UBC, McGill…). Cubre matrícula, alojamiento, estipendio, viajes y formación en liderazgo. Se postula mediante el proceso de cada universidad aliada.",
    covers: ["Matrícula", "Alojamiento y estipendio", "Viajes", "Materiales y computadora según el aliado", "Mentoría y liderazgo"],
    eligibility: ["Ciudadano de un país africano", "Necesidad económica demostrada", "Buen expediente y potencial de liderazgo", "Compromiso de contribuir al desarrollo de África"],
    deadline: "Fijado por cada universidad aliada, a menudo de noviembre a marzo.",
    howToApply: ["Elegir una universidad aliada", "Postular a la admisión y al formulario Mastercard Foundation de esa universidad"],
  },
  {
    slug: "mext",
    country: "Japón",
    forWhom: "Postulantes internacionales menores de 35 años (estudiantes investigadores), vía embajada de Japón o universidad japonesa",
    summary:
      "La beca MEXT del gobierno japonés cubre matrícula, una asignación mensual y el pasaje de ida y vuelta. Hay dos vías: la recomendación de la embajada (postulación en la embajada de Japón, normalmente en abril-mayo) y la recomendación de una universidad japonesa.",
    covers: ["Matrícula y tasas de examen", "Asignación mensual", "Pasaje de ida y vuelta"],
    eligibility: ["Ciudadano de un país con relaciones diplomáticas con Japón", "Menor de 35 años como estudiante investigador", "Licenciatura para maestría"],
    deadline: "Vía embajada: abril-mayo, un año antes del inicio.",
    howToApply: ["Consultar la embajada de Japón en tu país", "Plan de investigación, notas y recomendación", "Exámenes, entrevista y aceptación de un profesor"],
  },
  {
    slug: "global-korea-scholarship",
    country: "Corea del Sur",
    forWhom: "Postulantes internacionales menores de 40 años en posgrado, vía embajada o universidad coreana",
    summary:
      "La Global Korea Scholarship (GKS) cubre matrícula, asignación mensual, pasajes, ayuda de instalación y un año de coreano antes del título. Se postula por la embajada de Corea o directamente en una universidad participante, normalmente entre febrero y marzo.",
    covers: ["Matrícula", "Asignación mensual", "Pasaje de ida y vuelta", "Ayuda de instalación", "Un año de coreano", "Seguro médico"],
    eligibility: ["No coreano", "Menor de 40 años en posgrado", "Promedio mínimo fijado cada año"],
    deadline: "Normalmente febrero-marzo.",
    howToApply: ["Elegir vía embajada o universidad (no ambas)", "Declaración personal, plan de estudios y recomendaciones"],
  },
  {
    slug: "chinese-government-scholarship",
    country: "China",
    forWhom: "Estudiantes internacionales, vía embajada de China (tipo A) o universidad (tipo B)",
    summary:
      "La beca del gobierno chino cubre matrícula, alojamiento en el campus, estipendio mensual y seguro médico. Se postula por la embajada de China (tipo A) o directamente en una universidad designada (tipo B), normalmente de enero a abril para septiembre. Muchas maestrías y doctorados se imparten en inglés.",
    covers: ["Exención de matrícula", "Alojamiento en el campus", "Estipendio mensual", "Seguro médico"],
    eligibility: ["No chino y con buena salud", "Licenciatura para maestría", "Normalmente menor de 35 años en maestría y 40 en doctorado"],
    deadline: "Normalmente enero a abril para septiembre.",
    howToApply: ["Postular en el portal Campus China", "Plan de estudios, dos recomendaciones, notas y examen médico", "Una carta de aceptación de un profesor refuerza la postulación"],
  },
  {
    slug: "stipendium-hungaricum",
    country: "Hungría",
    forWhom: "Ciudadanos de países socios de Hungría, nominados por su autoridad de envío",
    summary:
      "Stipendium Hungaricum es la beca del gobierno húngaro para estudiantes de países socios. Cubre matrícula, estipendio mensual, alojamiento o ayuda para vivienda y seguro médico. Se postula en línea y con nominación de la autoridad de envío de tu país; el plazo habitual es a mediados de enero.",
    covers: ["Exención de matrícula", "Estipendio mensual", "Alojamiento o ayuda de vivienda", "Seguro médico"],
    eligibility: ["Ciudadano de un país socio", "Nominado por la autoridad de envío", "Requisitos de admisión de la universidad"],
    deadline: "Normalmente mediados de enero para septiembre.",
    howToApply: ["Postular en la plataforma Stipendium Hungaricum (dos programas)", "Pedir la nominación a la autoridad de envío"],
  },
  {
    slug: "turkiye-burslari",
    country: "Turquía",
    forWhom: "Estudiantes internacionales de cualquier nacionalidad, dentro de los límites de edad",
    summary:
      "Türkiye Bursları, la beca del gobierno turco, cubre matrícula, estipendio, alojamiento, seguro, un pasaje de ida y vuelta y un año de turco. Con una sola postulación se eligen varias universidades. Abre en enero y cierra en febrero; límites de edad: menos de 30 años en maestría y menos de 35 en doctorado.",
    covers: ["Matrícula", "Estipendio mensual", "Alojamiento", "Seguro", "Un pasaje de ida y vuelta", "Un año de turco"],
    eligibility: ["No turco", "Menor de 30 años en maestría y de 35 en doctorado", "Promedio mínimo fijado cada año"],
    deadline: "Normalmente enero-febrero.",
    howToApply: ["Postular en el portal y ordenar hasta 12 programas", "Carta de motivación, notas y propuesta de investigación en doctorado", "Entrevista para preseleccionados"],
  },
  {
    slug: "swedish-institute-global-professionals",
    country: "Suecia",
    forWhom: "Profesionales de países elegibles con experiencia y liderazgo",
    summary:
      "Las becas del Instituto Sueco para profesionales globales (SISGP) financian una maestría en Suecia: matrícula, asignación mensual, viaje y seguro. Se necesitan al menos 3.000 horas de experiencia y liderazgo demostrado. Se postula a universidades suecas a mediados de enero y al Instituto Sueco en febrero.",
    covers: ["Matrícula", "Asignación mensual", "Ayuda para el viaje", "Seguro"],
    eligibility: ["Ciudadano de un país de la lista del año", "Al menos 3.000 horas de experiencia", "Liderazgo demostrado"],
    deadline: "Universidades: mediados de enero (universityadmissions.se); Instituto Sueco: febrero.",
    howToApply: ["Postular a hasta cuatro maestrías en universityadmissions.se", "Postular al Instituto Sueco en febrero"],
  },
  {
    slug: "eiffel-excellence",
    country: "Francia",
    forWhom: "Estudiantes internacionales propuestos por una institución francesa",
    summary:
      "El programa Eiffel del Ministerio de Europa y Asuntos Exteriores de Francia atrae a los mejores estudiantes internacionales de maestría y doctorado. Paga una asignación mensual, viaje, seguro y actividades culturales, pero no la matrícula. No se postula directamente: la institución francesa te propone ante Campus France, normalmente a inicios de enero.",
    covers: ["Asignación mensual (mayor en doctorado)", "Viaje internacional de ida y vuelta", "Seguro médico", "Actividades culturales"],
    eligibility: ["No francés", "Límites de edad (a menudo 30 años en maestría y 35 en doctorado)", "Propuesto por una institución francesa"],
    deadline: "Las instituciones envían las propuestas a inicios de enero; sus plazos internos son antes (noviembre-diciembre).",
    howToApply: ["Postular a una maestría o doctorado en Francia", "Pedir a la institución que te proponga para Eiffel", "Resultados en marzo"],
  },
  {
    slug: "joint-japan-world-bank",
    country: "Varios países",
    forWhom: "Profesionales del desarrollo a mitad de carrera de países en desarrollo miembros del Banco Mundial",
    summary:
      "El programa de becas Japón/Banco Mundial (JJ/WBGSP) financia maestrías relacionadas con el desarrollo en universidades aliadas. Cubre matrícula, asignación mensual, viaje y seguro. Se requieren al menos tres años de experiencia en desarrollo después de la licenciatura y una admisión en un programa elegible.",
    covers: ["Matrícula y seguro básico", "Asignación mensual", "Pasaje de ida y vuelta", "Ayuda para el viaje"],
    eligibility: ["Ciudadano de un país en desarrollo miembro del Banco Mundial", "Licenciatura obtenida al menos tres años antes", "Tres años de experiencia a tiempo completo en desarrollo", "Admisión a un programa aliado"],
    deadline: "Fijado cada año por el Banco Mundial; revisa la página oficial.",
    howToApply: ["Obtener admisión en un programa aliado", "Postular al Banco Mundial durante la convocatoria"],
  },
  {
    slug: "lester-b-pearson",
    country: "Canadá",
    forWhom: "Estudiantes internacionales de secundaria propuestos por su colegio que postulan a la Universidad de Toronto",
    summary:
      "La beca internacional Lester B. Pearson de la Universidad de Toronto cubre matrícula, libros, tasas y alojamiento durante cuatro años de licenciatura. Hay que ser propuesto por tu colegio y postular a la universidad antes de su plazo de noviembre.",
    covers: ["Matrícula", "Libros y tasas", "Alojamiento durante cuatro años"],
    eligibility: ["Estudiante internacional", "En último año de secundaria (o graduado desde junio anterior)", "Propuesto por tu colegio"],
    deadline: "Inicios a mediados de noviembre.",
    howToApply: ["Pedir la nominación al orientador en octubre", "Postular a la Universidad de Toronto en noviembre", "Completar el formulario Pearson"],
  },
];
