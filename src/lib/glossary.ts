export interface GlossaryEntry {
  /** Terme ou abréviation affiché */
  term: string;
  /** Variantes / formes fléchies détectées en plus du terme principal */
  aliases?: string[];
  /** Définition courte (1-2 phrases) */
  definition: string;
  /** Catégorie pour l'affichage */
  category?: string;
}

export const GLOSSARY: GlossaryEntry[] = [
  // --- Abréviations & sigles ---
  { term: "CEC", definition: "Catéchisme de l'Église catholique (1992) : exposé officiel et systématique de la foi catholique, cité par numéro de paragraphe.", category: "Abréviation" },
  { term: "PGMR", definition: "Présentation Générale du Missel Romain : document normatif qui règle la célébration de la messe selon le rite romain.", category: "Abréviation" },
  { term: "CIC", definition: "Codex Iuris Canonici, le Code de droit canonique (1983) qui régit la vie juridique de l'Église latine.", category: "Abréviation" },
  { term: "PGLH", definition: "Présentation Générale de la Liturgie des Heures : document qui organise la prière officielle quotidienne de l'Église.", category: "Abréviation" },
  { term: "AELF", definition: "Association Épiscopale Liturgique pour les pays Francophones : éditrice des textes liturgiques et bibliques officiels en français.", category: "Abréviation" },
  { term: "DS", definition: "Denzinger-Schönmetzer : recueil de référence des définitions dogmatiques et documents du Magistère.", category: "Abréviation" },
  { term: "LG", definition: "Lumen Gentium : constitution dogmatique de Vatican II sur l'Église.", category: "Vatican II" },
  { term: "DV", definition: "Dei Verbum : constitution dogmatique de Vatican II sur la Révélation divine.", category: "Vatican II" },
  { term: "SC", definition: "Sacrosanctum Concilium : constitution de Vatican II sur la sainte liturgie.", category: "Vatican II" },
  { term: "GS", definition: "Gaudium et Spes : constitution pastorale de Vatican II sur l'Église dans le monde de ce temps.", category: "Vatican II" },
  { term: "ST", aliases: ["Somme théologique"], definition: "Summa Theologiae de saint Thomas d'Aquin : synthèse majeure de la théologie scolastique.", category: "Œuvre" },

  // --- Théologie sacramentaire ---
  { term: "Transsubstantiation", aliases: ["transsubstantiel", "transsubstantielle"], definition: "Conversion de toute la substance du pain et du vin en substance du Corps et du Sang du Christ, les apparences (espèces) demeurant.", category: "Sacrements" },
  { term: "Espèces eucharistiques", aliases: ["espèces"], definition: "Les apparences du pain et du vin (goût, forme, couleur) qui subsistent après la consécration.", category: "Sacrements" },
  { term: "Épiclèse", definition: "Prière invoquant l'Esprit Saint sur les offrandes (et sur l'assemblée) au cœur de la prière eucharistique.", category: "Liturgie" },
  { term: "Anamnèse", definition: "Mémorial proclamé après la consécration, qui fait mémoire de la Passion, de la Résurrection et de l'Ascension du Christ.", category: "Liturgie" },
  { term: "Ex opere operato", definition: "« Par le fait même que l'acte est posé » : le sacrement produit sa grâce par l'action du Christ, indépendamment de la sainteté du ministre.", category: "Sacrements" },
  { term: "Caractère sacramentel", definition: "Marque spirituelle indélébile imprimée par le baptême, la confirmation et l'ordre, qui ne peut être réitérée.", category: "Sacrements" },
  { term: "Viatique", definition: "Communion eucharistique donnée au mourant comme nourriture pour le passage vers la vie éternelle.", category: "Sacrements" },

  // --- Christologie & Trinité ---
  { term: "Hypostatique", aliases: ["union hypostatique"], definition: "Union dans l'unique Personne du Verbe des deux natures, divine et humaine, sans confusion ni séparation (Chalcédoine, 451).", category: "Christologie" },
  { term: "Kénose", aliases: ["kénotique"], definition: "Abaissement volontaire du Fils de Dieu qui « s'est anéanti » en prenant la condition de serviteur (Ph 2,7).", category: "Christologie" },
  { term: "Homoousios", aliases: ["consubstantiel"], definition: "« De même substance » : terme du concile de Nicée affirmant que le Fils est de la même substance que le Père.", category: "Christologie" },
  { term: "Périchorèse", definition: "Interpénétration mutuelle des trois Personnes divines, chacune demeurant tout entière dans les autres.", category: "Trinité" },
  { term: "Filioque", definition: "Ajout latin au Credo affirmant que l'Esprit Saint procède du Père « et du Fils » ; point de divergence avec l'Orient.", category: "Trinité" },
  { term: "Théotokos", definition: "« Mère de Dieu » : titre marial défini au concile d'Éphèse (431) pour protéger l'unité de la Personne du Christ.", category: "Mariologie" },

  // --- Grâce, salut, eschatologie ---
  { term: "Sotériologie", aliases: ["sotériologique"], definition: "Partie de la théologie qui traite du salut opéré par le Christ.", category: "Théologie" },
  { term: "Eschatologie", aliases: ["eschatologique"], definition: "Traité des fins dernières : mort, jugement, ciel, purgatoire, enfer, retour du Christ.", category: "Théologie" },
  { term: "Justification", definition: "Acte par lequel Dieu rend l'homme juste et le sanctifie intérieurement par la grâce du Christ.", category: "Grâce" },
  { term: "Grâce sanctifiante", definition: "Don habituel de Dieu qui rend l'âme participante de la vie divine.", category: "Grâce" },
  { term: "Concupiscence", definition: "Inclination désordonnée des appétits humains, séquelle du péché originel, qui n'est pas en soi un péché.", category: "Anthropologie" },
  { term: "Péché originel", definition: "État de privation de la sainteté originelle transmis à toute l'humanité, effacé quant à la faute par le baptême.", category: "Anthropologie" },
  { term: "Parousie", definition: "Retour glorieux du Christ à la fin des temps.", category: "Eschatologie" },
  { term: "Béatifique", aliases: ["vision béatifique"], definition: "Contemplation immédiate de Dieu face à face, bonheur définitif des bienheureux.", category: "Eschatologie" },

  // --- Écriture & méthode ---
  { term: "Exégèse", aliases: ["exégétique", "exégèses"], definition: "Étude méthodique du texte biblique visant à en dégager le sens dans son contexte originel.", category: "Écriture" },
  { term: "Herméneutique", definition: "Théorie de l'interprétation : règles pour comprendre et actualiser un texte, notamment scripturaire.", category: "Écriture" },
  { term: "Typologie", aliases: ["typologique"], definition: "Lecture qui voit dans les figures de l'Ancien Testament l'annonce des réalités du Nouveau.", category: "Écriture" },
  { term: "Septante", aliases: ["LXX"], definition: "Traduction grecque de l'Ancien Testament (IIIe–IIe s. av. J.-C.), largement citée par le Nouveau Testament.", category: "Écriture" },
  { term: "Vulgate", definition: "Traduction latine de la Bible réalisée principalement par saint Jérôme, texte de référence de l'Église latine.", category: "Écriture" },
  { term: "Péricope", definition: "Unité littéraire délimitée d'un texte biblique, formant un ensemble cohérent pour la lecture.", category: "Écriture" },
  { term: "Sensus fidei", aliases: ["sensus fidelium"], definition: "Sens surnaturel de la foi du peuple de Dieu, qui adhère infailliblement à la foi lorsqu'il est uni aux pasteurs.", category: "Théologie" },

  // --- Magistère & Église ---
  { term: "Magistère", definition: "Autorité d'enseignement de l'Église exercée par le Pape et les évêques en communion avec lui.", category: "Ecclésiologie" },
  { term: "Ex cathedra", definition: "Mode solennel d'enseignement pontifical engageant l'infaillibilité en matière de foi et de mœurs.", category: "Ecclésiologie" },
  { term: "Collégialité", definition: "Union du collège des évêques avec le Pape dans la charge de gouverner l'Église universelle.", category: "Ecclésiologie" },
  { term: "Subsidiarité", definition: "Principe social selon lequel une instance supérieure n'intervient que si l'échelon inférieur ne peut agir seul.", category: "Doctrine sociale" },
  { term: "Motu proprio", definition: "Document pontifical promulgué de la propre initiative du Pape.", category: "Magistère" },
  { term: "Encyclique", definition: "Lettre solennelle du Pape adressée à l'Église (et parfois au monde) sur une question doctrinale ou sociale.", category: "Magistère" },
  { term: "Dicastère", definition: "Organisme de la Curie romaine chargé d'un domaine particulier du gouvernement de l'Église.", category: "Magistère" },
  { term: "Œcuménisme", aliases: ["œcuménique"], definition: "Effort de restauration de l'unité entre les chrétiens divisés.", category: "Ecclésiologie" },

  // --- Liturgie ---
  { term: "Lectionnaire", definition: "Livre liturgique contenant les lectures bibliques réparties selon le calendrier de l'Église.", category: "Liturgie" },
  { term: "Temps ordinaire", definition: "Période du calendrier liturgique hors des temps forts (Avent, Noël, Carême, Pâques).", category: "Liturgie" },
  { term: "Office divin", aliases: ["Liturgie des Heures"], definition: "Prière publique de l'Église rythmant la journée (laudes, vêpres, complies, etc.).", category: "Liturgie" },
  { term: "Antienne", definition: "Bref refrain chanté encadrant un psaume et en orientant l'interprétation.", category: "Liturgie" },
  { term: "Lex orandi, lex credendi", definition: "« La loi de la prière est la loi de la foi » : la liturgie exprime et nourrit la foi de l'Église.", category: "Liturgie" },
  { term: "Mystagogie", aliases: ["mystagogique"], definition: "Catéchèse qui introduit aux mystères célébrés, généralement après la réception des sacrements.", category: "Liturgie" },

  // --- Morale & spiritualité ---
  { term: "Casuistique", definition: "Méthode morale appliquant les principes généraux à des cas de conscience particuliers.", category: "Morale" },
  { term: "Loi naturelle", definition: "Participation de la créature raisonnable à la loi éternelle, inscrite dans la nature humaine et accessible à la raison.", category: "Morale" },
  { term: "Vertus théologales", definition: "Foi, espérance et charité : vertus infusées par Dieu qui ont Dieu lui-même pour objet.", category: "Morale" },
  { term: "Vertus cardinales", definition: "Prudence, justice, force et tempérance : vertus humaines pivots de la vie morale.", category: "Morale" },
  { term: "Ascèse", aliases: ["ascétique"], definition: "Effort spirituel de renoncement et de discipline en vue de la croissance dans la charité.", category: "Spiritualité" },
  { term: "Apophatique", definition: "Théologie négative, qui parle de Dieu en niant ce qu'il n'est pas, devant l'insuffisance des concepts.", category: "Théologie" },
  { term: "Kérygme", aliases: ["kérygmatique"], definition: "Annonce première et essentielle du salut en Jésus-Christ mort et ressuscité.", category: "Théologie" },
  { term: "Catéchumène", aliases: ["catéchuménat"], definition: "Personne adulte en préparation au baptême, accompagnée par un itinéraire liturgique et catéchétique.", category: "Sacrements" },
  { term: "Indulgence", definition: "Remise devant Dieu de la peine temporelle due pour des péchés déjà pardonnés, accordée par l'Église.", category: "Sacrements" },
  { term: "Schisme", definition: "Rupture de la communion avec l'Église, sans nécessairement de désaccord doctrinal (à la différence de l'hérésie).", category: "Droit canonique" },
  { term: "Hérésie", definition: "Négation ou doute obstiné, après le baptême, d'une vérité à croire de foi divine et catholique.", category: "Droit canonique" },
  { term: "Latae sententiae", definition: "Peine canonique encourue automatiquement du fait même de la commission du délit.", category: "Droit canonique" },
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Index (clé normalisée -> entrée) de tous les termes et alias. */
export const GLOSSARY_INDEX: Map<string, GlossaryEntry> = (() => {
  const map = new Map<string, GlossaryEntry>();
  for (const entry of GLOSSARY) {
    for (const form of [entry.term, ...(entry.aliases ?? [])]) {
      map.set(form.toLocaleLowerCase("fr"), entry);
    }
  }
  return map;
})();

/** Expression régulière détectant tous les termes (les plus longs d'abord). */
export const GLOSSARY_REGEX: RegExp = (() => {
  const forms = Array.from(GLOSSARY_INDEX.keys())
    .concat(GLOSSARY.flatMap((e) => [e.term, ...(e.aliases ?? [])]))
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => b.length - a.length)
    .map(escapeRe);
  return new RegExp(`(?<![\\p{L}\\p{N}])(${forms.join("|")})(?![\\p{L}\\p{N}])`, "giu");
})();

export function lookupGlossary(text: string): GlossaryEntry | undefined {
  return GLOSSARY_INDEX.get(text.toLocaleLowerCase("fr"));
}
