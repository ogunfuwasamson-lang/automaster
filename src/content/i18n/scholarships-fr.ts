import type { LocalScholarship } from "./scholarship-types";

// French versions of the scholarship profiles. Slugs match the English profiles; facts mirror them (checked 31 Oct 2026).
export const SCHOLARSHIPS_FR: LocalScholarship[] = [
  {
    slug: "chevening",
    country: "Royaume-Uni",
    forWhom: "Citoyens des pays éligibles à Chevening, avec au moins deux ans d'expérience professionnelle",
    summary:
      "Chevening est la bourse mondiale du gouvernement britannique pour les futurs leaders. Elle finance un master d'un an dans n'importe quelle université britannique : frais de scolarité, allocation mensuelle, billet d'avion aller-retour et frais de visa. Il faut environ deux ans d'expérience (2 800 heures), une admission dans une université britannique et l'engagement de rentrer chez soi au moins deux ans. Les candidatures ouvrent début août et ferment début octobre ; le tour 2027/28 a fermé le 6 octobre 2026.",
    covers: ["Frais de scolarité d'un master d'un an", "Allocation mensuelle", "Un billet d'avion aller-retour", "Frais de visa et test de tuberculose"],
    eligibility: ["Citoyen d'un pays éligible", "2 800 heures d'expérience après le premier diplôme", "Candidater à trois masters britanniques et obtenir une admission définitive avant début juillet", "Rentrer dans son pays au moins deux ans après la bourse"],
    deadline: "Ouverture début août, clôture début octobre, environ onze mois avant la rentrée.",
    howToApply: ["Candidater en ligne sur le site Chevening avec quatre essais (leadership, réseau, études au Royaume-Uni, projet de carrière)", "Candidater séparément aux universités", "Entretiens entre mars et avril à l'ambassade britannique", "Résultats à partir de mi-juin"],
  },
  {
    slug: "commonwealth-masters",
    country: "Royaume-Uni",
    forWhom: "Citoyens de pays du Commonwealth éligibles, via l'agence nationale de nomination",
    summary:
      "Les bourses de master du Commonwealth financent un master d'un an au Royaume-Uni pour les citoyens de pays du Commonwealth éligibles (dont le Togo, le Gabon, la Gambie, le Nigeria, le Ghana, le Kenya, l'Inde et le Pakistan ; le Cameroun n'est pas sur la liste 2027/28). Elles couvrent les frais de scolarité, le voyage et une allocation de 1 712 £ par mois (2 000 £ à Londres). On ne candidate pas directement : il faut passer par l'agence nationale de nomination, puis remplir le formulaire de la Commission, clos le 20 octobre 2026 pour 2027/28.",
    covers: ["Frais de scolarité", "Billet d'avion aller-retour", "Allocation mensuelle de 1 712 £, ou 2 000 £ à Londres", "Aide aux déplacements d'études"],
    eligibility: ["Citoyen et résident d'un pays du Commonwealth éligible", "Au moins une mention bien (2:1) ou équivalent", "Ne pas pouvoir financer seul ses études au Royaume-Uni", "Ne pas avoir déjà fait un master au Royaume-Uni"],
    deadline: "Les agences nationales ferment d'abord (souvent août à octobre) ; formulaire de la Commission clos le 20 octobre 2026 pour 2027/28.",
    howToApply: ["Contacter l'agence nationale de nomination de votre pays", "Si vous êtes nominé, remplir la candidature sur CSC Central", "Choisir jusqu'à trois masters liés aux thèmes de développement"],
  },
  {
    slug: "gates-cambridge",
    country: "Royaume-Uni",
    forWhom: "Toute personne non britannique candidatant à un diplôme de troisième cycle à Cambridge",
    summary:
      "Gates Cambridge finance la totalité d'un diplôme de troisième cycle à l'université de Cambridge pour les candidats non britanniques : frais universitaires, allocation, billets d'avion et frais de visa. Environ 80 bourses par an. On candidate via le formulaire normal de Cambridge en cochant la case Gates Cambridge, en octobre pour les Américains et en décembre ou janvier pour les autres.",
    covers: ["Frais universitaires", "Allocation pour vivre", "Un billet d'avion à l'aller et au retour", "Visa et surtaxe santé"],
    eligibility: ["Toute nationalité sauf britannique", "Master d'au moins un an ou doctorat à temps plein à Cambridge", "Excellence académique, leadership et engagement envers les autres"],
    deadline: "Mi-octobre pour les citoyens américains ; début décembre ou début janvier pour les autres.",
    howToApply: ["Candidater à la formation via le portail de Cambridge", "Remplir la section Gates Cambridge dans le même formulaire", "Entretiens pour les présélectionnés"],
  },
  {
    slug: "rhodes",
    country: "Royaume-Uni",
    forWhom: "Jeunes diplômés (souvent 18-24 ans) des circonscriptions Rhodes ou du tour mondial",
    summary:
      "La bourse Rhodes, la plus ancienne bourse internationale, finance des études de troisième cycle à Oxford : frais, allocation, voyage et visa, généralement pour deux ans. La plupart des places sont réservées à des circonscriptions nationales ou régionales, chacune avec ses limites d'âge et ses dates (surtout de juillet à octobre) ; les autres candidats passent par le tour mondial (Global).",
    covers: ["Tous les frais d'Oxford", "Allocation", "Billets d'avion", "Visa et surtaxe santé"],
    eligibility: ["Relever d'une circonscription Rhodes ou du tour mondial", "Limite d'âge fixée par la circonscription", "Excellent dossier académique", "Leadership et sens du service"],
    deadline: "Fixée par chaque circonscription, surtout entre juillet et octobre.",
    howToApply: ["Consulter la page de votre circonscription", "Déclaration personnelle, CV, relevés et cinq à huit références", "Entretiens en octobre ou novembre"],
  },
  {
    slug: "clarendon",
    country: "Royaume-Uni",
    forWhom: "Candidats à Oxford de toute nationalité, sélectionnés sur l'excellence académique",
    summary:
      "Clarendon est la grande bourse de troisième cycle de l'université d'Oxford : frais de scolarité et allocation de vie. Aucune candidature séparée : toute personne qui candidate à une formation éligible avant la date de décembre ou janvier est automatiquement considérée.",
    covers: ["Frais de scolarité", "Allocation de vie"],
    eligibility: ["Candidater à une formation de troisième cycle éligible à Oxford", "Toute nationalité"],
    deadline: "Date de la formation à Oxford en décembre ou janvier (celle indiquée pour le financement).",
    howToApply: ["Candidater à la formation avant la date de financement", "Examen automatique, sans formulaire Clarendon"],
  },
  {
    slug: "knight-hennessy",
    country: "États-Unis",
    forWhom: "Jeunes diplômés de toute nationalité visant un diplôme de troisième cycle à Stanford",
    summary:
      "Knight-Hennessy finance jusqu'à trois ans de n'importe quel diplôme de troisième cycle à Stanford (MBA, JD, MD, master, doctorat) pour toute nationalité : frais de scolarité, allocation et voyage. On candidate à Knight-Hennessy et, séparément, au programme de Stanford ; la date limite tombe début à mi-octobre, environ un an avant la rentrée. Attention : les nouveaux visas étudiants américains sont suspendus pour les ressortissants de plusieurs pays depuis le 1er janvier 2026.",
    covers: ["Frais de scolarité", "Allocation de vie et d'études", "Un aller-retour par an", "Programme de leadership"],
    eligibility: ["Toute nationalité", "Licence obtenue dans les sept dernières années environ", "Admission à un programme de troisième cycle de Stanford"],
    deadline: "Début à mi-octobre, l'année précédant la rentrée.",
    howToApply: ["Essais courts, vidéo, CV et deux recommandations", "Candidature séparée au programme de Stanford", "Week-end de sélection en février"],
  },
  {
    slug: "fulbright-foreign-student",
    country: "États-Unis",
    forWhom: "Diplômés de plus de 150 pays, via la commission Fulbright ou l'ambassade américaine de leur pays",
    summary:
      "Le programme Fulbright pour étudiants étrangers finance des masters et doctorats aux États-Unis : frais, allocation, voyage et assurance. Chaque pays organise son concours. Le programme a subi des coupes en 2025, et les ressortissants des pays visés par les restrictions de visa du 1er janvier 2026 (dont le Sénégal, la Côte d'Ivoire, le Bénin et le Togo) pourraient ne pas obtenir le visa J-1. Vérifiez la page Fulbright de votre pays.",
    covers: ["Frais de scolarité (souvent partagés avec l'université)", "Allocation mensuelle", "Billet aller-retour", "Assurance"],
    eligibility: ["Citoyen d'un pays participant, candidatant depuis ce pays", "Licence et exigences nationales", "Engagement de retour au pays (règle des deux ans du J-1)"],
    deadline: "Fixée par chaque pays, souvent entre février et octobre, plus d'un an avant la rentrée.",
    howToApply: ["Trouver la commission ou l'ambassade de votre pays", "Essais, références et relevés", "Entretien puis placement par l'IIE"],
  },
  {
    slug: "daad",
    country: "Allemagne",
    forWhom: "Diplômés internationaux, dont le programme EPOS pour les professionnels des pays en développement",
    summary:
      "Le DAAD finance des masters et doctorats en Allemagne. Le programme EPOS (formations de troisième cycle liées au développement) verse une allocation mensuelle, une assurance et le voyage pour des masters sélectionnés, et demande généralement deux ans d'expérience. Comme les universités publiques allemandes ne font presque pas payer de frais de scolarité, l'allocation couvre la vie. Dates fixées par formation, surtout d'août à octobre.",
    covers: ["Allocation mensuelle", "Assurance santé, accident et responsabilité", "Aide au voyage", "Parfois un cours d'allemand préalable"],
    eligibility: ["Licence (pour EPOS, diplôme de moins de six ans en général)", "Pour EPOS : citoyen d'un pays en développement avec deux ans d'expérience", "Exigences de langue de la formation"],
    deadline: "Fixée par chaque formation ; pour EPOS, souvent août à octobre.",
    howToApply: ["Chercher dans la base de bourses du DAAD", "Pour EPOS, candidater directement à la formation participante", "Lettre de motivation, CV, références et preuve d'expérience"],
  },
  {
    slug: "erasmus-mundus",
    country: "Europe (plusieurs pays)",
    forWhom: "Étudiants de toute nationalité admis dans un master conjoint Erasmus Mundus",
    summary:
      "Les masters conjoints Erasmus Mundus sont enseignés par des groupes d'universités dans au moins deux pays européens. Leurs bourses couvrent les frais, le voyage et une allocation de 1 400 € par mois pendant tout le programme (un à deux ans). Pas de candidature centrale : on candidate à chaque consortium, en général d'octobre à février pour une rentrée en septembre.",
    covers: ["Frais de participation (scolarité, assurance)", "Allocation de 1 400 € par mois", "Contribution au voyage et à l'installation"],
    eligibility: ["Toute nationalité", "Licence (ou obtenue avant la rentrée)", "Exigences du programme", "Une seule bourse Erasmus Mundus par personne"],
    deadline: "Fixée par chaque programme, surtout d'octobre à février.",
    howToApply: ["Parcourir le catalogue Erasmus Mundus de l'EACEA", "Candidater à trois programmes maximum sur le site de chaque consortium"],
  },
  {
    slug: "mastercard-foundation",
    country: "Plusieurs pays",
    forWhom: "Jeunes Africains en difficulté financière, engagés envers leur communauté",
    summary:
      "Le programme Mastercard Foundation Scholars finance les études de jeunes Africains en difficulté financière dans des universités partenaires en Afrique et ailleurs (Édimbourg, Toronto, UBC, McGill…). Il couvre les frais, le logement, une allocation, le voyage et une formation au leadership. On candidate via le processus propre à chaque université partenaire.",
    covers: ["Frais de scolarité", "Logement et allocation", "Voyage", "Matériel, ordinateur selon le partenaire", "Accompagnement et leadership"],
    eligibility: ["Citoyen d'un pays africain", "Besoin financier démontré", "Bon dossier académique et potentiel de leadership", "Engagement à contribuer au développement de l'Afrique"],
    deadline: "Fixée par chaque université partenaire, souvent de novembre à mars.",
    howToApply: ["Choisir une université partenaire", "Candidater à l'admission et au formulaire Mastercard Foundation de l'université"],
  },
  {
    slug: "mext",
    country: "Japon",
    forWhom: "Candidats internationaux de moins de 35 ans (étudiants-chercheurs), via l'ambassade du Japon ou une université japonaise",
    summary:
      "La bourse MEXT du gouvernement japonais couvre les frais de scolarité, une allocation mensuelle et le voyage. Deux voies : la recommandation de l'ambassade (candidature à l'ambassade du Japon, en général en avril-mai) et la recommandation d'une université japonaise.",
    covers: ["Frais de scolarité et d'examen", "Allocation mensuelle", "Billet aller-retour"],
    eligibility: ["Citoyen d'un pays ayant des relations diplomatiques avec le Japon", "Moins de 35 ans pour les étudiants-chercheurs", "Licence pour le master"],
    deadline: "Voie ambassade : avril-mai, environ un an avant la rentrée.",
    howToApply: ["Consulter l'ambassade du Japon", "Projet de recherche, relevés, recommandation", "Examens et entretien, puis accord d'un professeur"],
  },
  {
    slug: "global-korea-scholarship",
    country: "Corée du Sud",
    forWhom: "Candidats internationaux de moins de 40 ans en troisième cycle, via l'ambassade ou une université coréenne",
    summary:
      "La Global Korea Scholarship (GKS) couvre les frais de scolarité, une allocation mensuelle, le voyage, une aide à l'installation et une année de coréen avant le diplôme. On candidate par l'ambassade de Corée ou directement auprès d'une université participante, en général entre février et mars.",
    covers: ["Frais de scolarité", "Allocation mensuelle", "Billet aller-retour", "Aide à l'installation", "Une année de coréen", "Assurance santé"],
    eligibility: ["Non coréen", "Moins de 40 ans en troisième cycle", "Moyenne minimale fixée chaque année"],
    deadline: "En général février-mars.",
    howToApply: ["Choisir la voie ambassade ou université (pas les deux)", "Déclaration personnelle, plan d'études, recommandations"],
  },
  {
    slug: "chinese-government-scholarship",
    country: "Chine",
    forWhom: "Étudiants internationaux, via l'ambassade de Chine (type A) ou une université (type B)",
    summary:
      "La bourse du gouvernement chinois couvre les frais de scolarité, le logement sur le campus, une allocation mensuelle et l'assurance. On candidate via l'ambassade de Chine (type A) ou directement auprès d'une université désignée (type B), en général de janvier à avril pour septembre. Beaucoup de masters et doctorats sont en anglais.",
    covers: ["Exonération des frais", "Logement sur le campus", "Allocation mensuelle", "Assurance maladie"],
    eligibility: ["Non chinois et en bonne santé", "Licence pour le master", "Généralement moins de 35 ans en master et 40 ans en doctorat"],
    deadline: "En général janvier à avril pour septembre.",
    howToApply: ["Candidater sur le portail Campus China", "Plan d'études, deux recommandations, relevés, examen médical", "Une lettre d'accueil d'un professeur renforce le dossier"],
  },
  {
    slug: "stipendium-hungaricum",
    country: "Hongrie",
    forWhom: "Citoyens des pays partenaires de la Hongrie, nominés par leur autorité d'envoi",
    summary:
      "Stipendium Hungaricum est la bourse du gouvernement hongrois pour les étudiants des pays partenaires. Elle couvre les frais, une allocation mensuelle, un logement ou une aide au logement et l'assurance. Candidature en ligne plus nomination par l'autorité d'envoi de votre pays ; date limite habituelle à la mi-janvier.",
    covers: ["Exonération des frais", "Allocation mensuelle", "Logement ou aide au logement", "Assurance maladie"],
    eligibility: ["Citoyen d'un pays partenaire", "Nominé par l'autorité d'envoi", "Conditions d'admission de l'université"],
    deadline: "En général mi-janvier pour septembre.",
    howToApply: ["Candidater sur la plateforme Stipendium Hungaricum (deux programmes)", "Demander la nomination à l'autorité d'envoi"],
  },
  {
    slug: "turkiye-burslari",
    country: "Turquie",
    forWhom: "Étudiants internationaux de toute nationalité, dans les limites d'âge",
    summary:
      "Türkiye Bursları, la bourse du gouvernement turc, couvre les frais, une allocation, le logement, l'assurance, un billet aller-retour et une année de turc. Une seule candidature permet de choisir plusieurs universités. Ouverture en janvier, clôture en février ; limites d'âge de moins de 30 ans en master et de moins de 35 ans en doctorat.",
    covers: ["Frais de scolarité", "Allocation mensuelle", "Logement", "Assurance", "Un billet aller-retour", "Une année de turc"],
    eligibility: ["Non turc", "Moins de 30 ans en master, moins de 35 ans en doctorat", "Moyenne minimale fixée chaque année"],
    deadline: "En général janvier-février.",
    howToApply: ["Candidater sur le portail et classer jusqu'à 12 programmes", "Lettre de motivation, relevés, projet de recherche en doctorat", "Entretien pour les présélectionnés"],
  },
  {
    slug: "swedish-institute-global-professionals",
    country: "Suède",
    forWhom: "Professionnels de pays éligibles, avec expérience et leadership",
    summary:
      "Les bourses de l'Institut suédois pour professionnels internationaux (SISGP) financent un master en Suède : frais, allocation mensuelle, voyage et assurance. Il faut au moins 3 000 heures d'expérience et un leadership démontré. On candidate aux universités suédoises à la mi-janvier, puis à l'Institut suédois en février.",
    covers: ["Frais de scolarité", "Allocation mensuelle", "Aide au voyage", "Assurance"],
    eligibility: ["Citoyen d'un pays de la liste de l'année", "Au moins 3 000 heures d'expérience", "Leadership démontré"],
    deadline: "Universités : mi-janvier (universityadmissions.se) ; Institut suédois : février.",
    howToApply: ["Candidater à quatre masters maximum sur universityadmissions.se", "Candidater à l'Institut suédois en février"],
  },
  {
    slug: "eiffel-excellence",
    country: "France",
    forWhom: "Étudiants internationaux proposés par un établissement français",
    summary:
      "Le programme Eiffel du ministère de l'Europe et des Affaires étrangères attire les meilleurs étudiants internationaux en master et doctorat. Il verse une allocation mensuelle, le voyage, l'assurance et des activités culturelles, mais pas les frais de scolarité. On ne candidate pas directement : l'établissement français vous propose à Campus France, en général début janvier.",
    covers: ["Allocation mensuelle (plus élevée en doctorat)", "Voyage international aller-retour", "Assurance santé", "Activités culturelles"],
    eligibility: ["Non français", "Limites d'âge (souvent 30 ans en master, 35 en doctorat)", "Proposé par un établissement français"],
    deadline: "Les établissements transmettent les dossiers début janvier ; dates internes plus tôt (novembre-décembre).",
    howToApply: ["Candidater à un master ou doctorat en France", "Demander à l'établissement de vous proposer pour Eiffel", "Résultats en mars"],
  },
  {
    slug: "joint-japan-world-bank",
    country: "Plusieurs pays",
    forWhom: "Professionnels du développement en milieu de carrière, de pays en développement membres de la Banque mondiale",
    summary:
      "Le programme de bourses Japon/Banque mondiale (JJ/WBGSP) finance des masters liés au développement dans des universités partenaires. Il couvre les frais, une allocation, le voyage et l'assurance. Il faut au moins trois ans d'expérience dans le développement après la licence et une admission dans un programme éligible.",
    covers: ["Frais de scolarité et assurance de base", "Allocation mensuelle", "Billet aller-retour", "Aide au voyage"],
    eligibility: ["Citoyen d'un pays en développement membre de la Banque mondiale", "Licence obtenue au moins trois ans avant", "Trois ans d'expérience à temps plein dans le développement", "Admission à un programme partenaire"],
    deadline: "Fixée chaque année par la Banque mondiale ; consultez la page officielle.",
    howToApply: ["Obtenir une admission dans un programme partenaire", "Candidater à la Banque mondiale pendant l'appel"],
  },
  {
    slug: "lester-b-pearson",
    country: "Canada",
    forWhom: "Lycéens internationaux proposés par leur établissement, candidatant à l'Université de Toronto",
    summary:
      "La bourse internationale Lester B. Pearson de l'Université de Toronto couvre les frais de scolarité, les livres, les frais annexes et le logement pendant quatre ans de licence. Il faut être proposé par son lycée et candidater à l'université avant sa date de novembre.",
    covers: ["Frais de scolarité", "Livres et frais annexes", "Logement pendant quatre ans"],
    eligibility: ["Étudiant international", "En dernière année de lycée (ou diplômé depuis juin dernier)", "Proposé par son établissement"],
    deadline: "Début à mi-novembre.",
    howToApply: ["Demander la nomination au conseiller d'orientation en octobre", "Candidater à l'Université de Toronto en novembre", "Remplir le dossier Pearson"],
  },
];
