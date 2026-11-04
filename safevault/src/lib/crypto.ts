import type { EncryptedBlob, KdfParams } from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Coût du KDF. 600 000 itérations PBKDF2-SHA256 = recommandation OWASP 2024.
 * Première dérivation : ~0,3 à 1,5 s selon l'appareil (affichage d'un loader).
 */
export const KDF_ITERATIONS = 600_000;
/** Coût volontairement plus bas pour le code PIN de déverrouillage rapide (6 chiffres ≈ 20 bits). */
export const PIN_KDF_ITERATIONS = 600_000;

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function randomId(): string {
  return Array.from(randomBytes(12), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Paramètres KDF dédiés au code PIN de déverrouillage rapide. */
export function pinKdf(): KdfParams {
  return createKdf(PIN_KDF_ITERATIONS);
}

export function createKdf(iterations: number = KDF_ITERATIONS): KdfParams {
  return {
    name: "PBKDF2",
    hash: "SHA-256",
    iterations,
    salt: toBase64(randomBytes(16)),
  };
}

/** Dérive une clé AES-256-GCM (extractible pour permettre le déverrouillage rapide). */
export async function deriveAesKey(secret: string, kdf: KdfParams): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: fromBase64(kdf.salt) as unknown as BufferSource,
      iterations: kdf.iterations,
      hash: kdf.hash,
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBytes(key: CryptoKey, bytes: Uint8Array): Promise<EncryptedBlob> {
  const iv = randomBytes(12);
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    bytes as unknown as BufferSource,
  );
  return { iv: toBase64(iv), data: toBase64(new Uint8Array(data)) };
}

export async function decryptBytes(key: CryptoKey, blob: EncryptedBlob): Promise<Uint8Array> {
  const plain = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(blob.iv) as unknown as BufferSource,
    },
    key,
    fromBase64(blob.data) as unknown as BufferSource,
  );
  return new Uint8Array(plain);
}

export async function encryptJson(key: CryptoKey, value: unknown): Promise<EncryptedBlob> {
  return encryptBytes(key, encoder.encode(JSON.stringify(value)));
}

export async function decryptJson<T>(key: CryptoKey, blob: EncryptedBlob): Promise<T> {
  const bytes = await decryptBytes(key, blob);
  return JSON.parse(decoder.decode(bytes)) as T;
}

export async function exportRawKey(key: CryptoKey): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.exportKey("raw", key));
}

export async function importRawKey(raw: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", raw as unknown as BufferSource, { name: "AES-GCM" }, true, [
    "encrypt",
    "decrypt",
  ]);
}

/* ------------------------------------------------------------------ */
/*  Générateurs                                                        */
/* ------------------------------------------------------------------ */

const LOWER = "abcdefghijkmnopqrstuvwxyz"; // sans « l »
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // sans « I » ni « O »
const DIGITS = "23456789"; // sans 0 ni 1
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.?";
const AMBIGUOUS = "Il1O0o|`'\";:,.{}[]()/\\";

export interface PasswordOptions {
  length: number;
  lowercase: boolean;
  uppercase: boolean;
  digits: boolean;
  symbols: boolean;
  avoidAmbiguous: boolean;
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 20,
  lowercase: true,
  uppercase: true,
  digits: true,
  symbols: true,
  avoidAmbiguous: true,
};

function pick(pool: string): string {
  if (pool.length === 0) return "";
  const max = 0xffffffff - (0xffffffff % pool.length);
  let value = 0;
  do {
    value = crypto.getRandomValues(new Uint32Array(1))[0];
  } while (value >= max);
  return pool[value % pool.length];
}

function shuffle(items: string[]): string[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const value = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [copy[i], copy[value]] = [copy[value], copy[i]];
  }
  return copy;
}

export function generatePassword(options: PasswordOptions): string {
  const clean = (chars: string) =>
    options.avoidAmbiguous
      ? [...chars].filter((c) => !AMBIGUOUS.includes(c)).join("")
      : chars;

  const groups: string[] = [];
  if (options.lowercase) groups.push(clean(LOWER));
  if (options.uppercase) groups.push(clean(UPPER));
  if (options.digits) groups.push(clean(DIGITS));
  if (options.symbols) groups.push(clean(SYMBOLS));

  const pools = groups.filter((g) => g.length > 0);
  if (pools.length === 0) return generatePassword({ ...DEFAULT_PASSWORD_OPTIONS, symbols: false });

  const length = Math.max(options.length, pools.length);
  const chars: string[] = pools.map((pool) => pick(pool));
  const all = pools.join("");
  while (chars.length < length) chars.push(pick(all));
  return shuffle(chars).join("");
}

const WORDLIST = `abricot absent accent accord acheter acteur adresse aiguille aile aimant air
alarme album alizé allumer altesse amande amarante ambre ami ample ananas ancre âne ange
angle animal anneau antenne appel arbre arc ardoise argent arme arôme artichaut asile aspect
astre atlas atelier aube auberge audace auguste aurore avance avenir averse avion avocat
azur bagage bague baie balcon balle bambou banane banc bande banjo barque bassin bastion
bateau bâtiment baume beauté bécane beignet berger bésace besoin bibli buse bison blanc
blesse bleuet bloc bolide bonbon bonheur boréal bosquet bouche bouclier boue bougie boule
bourg bouton braise branche brave brise brique broche brume bruyère buisson bulle bureau
burin butin cabane cabas cacao cactus cadeau cadre café cage caillou caisse calice calme
calque caméra camp canal candeur canif canne canon cantine caoutchouc cap cape capitaine
capot carafe carbone cardan cargo carnet carotte carré carton case cascade casque caste
catégorie cause cavalier cavité cèdre ceinture céleste cellule cendre centre cerise cerne
cerveau cesse chaîne chair chaleur chambre champ chance chanson chant chapelle chapitre
charbon chardon charme charrette chassis château chaton chaud chaussée chemin chenil
chêne cher cheval cheveu chèvre chicane chiffre chimère chinois choc chocolat choix
chœur chose chute cible cigale cigare cil cime cinéma cintre cirage circuit cirque
ciseau citron civette clair clapier classe clé client cloche climat clou clown club
cobalt coca cochon cocon code cœur coffre cognac coiffe col colis colline colonne
combat comète commande comptoir concert conconduite confiance congé conque conseil
conte contour contrat coq coquille corail corde corne corps corbeau cornet cortège
costume coteau couleur coup coupe cour courbe couronne cours course court cousin
couteau coutume couvent couvercle crabe craie crâne craquer crayon crème crête creux
crevasse cri cristal crochet crocus croire croissant croix croûte cruche cube cuillère
cuir cuivre cuisine culasse culte cumulus cupidon cure curiosité cygne cyprès dahlia
daim dallage dame danger danse dard date dauphin dédain dédale dé débat débris début
décembre dédale déesse défi degré délai délice delta demande demain demeure dents
dépôt dérive dernier désert dessein dessein destin détail détour deuil deux devin
diable dialogue diamant dicton dinde dîner diode dire disque divan divers dogme doigt
dollar domaine dôme domino don donjon donjon dos dot dos dotation doute drapeau dressage
drogue droit dune duvet dynamo ébène écart échange écharpe échelle écho éclair éclat
école écorce écoute écran écrin écume écureuil éden édifice édition édredon efface
effet effort égide église élan élastique électro élégant élément éléphant émail emballage
embrun émeraude émission émotion empereur emploi emprise encens enclos encre endive
énergie enfance enfer enfin enigme ennui enseigne entente entier entonnoir entracte
entrepôt envie épais épaule épée épi épice épine épisode époque épouse épreuve éprouvette
épuisette équipe équité érable erreur escalier escargot espace espion espoir esprit
essai essence estuaire été étage étai étain étang étau été éternel étoffe étoile étrange
étude évasion éveil éventail évêque examen exemple excès excuse exil expert exploit
fable façade face facteur fagot faïence faille faim falaise falloir falon famille
fanion fantôme farce farine fascine fatale fatigue faune faucon faute fauvette faux
faveur fée fente fer ferme festin feu feuille fève fibre ficelle fiel fierté fièvre
figure filament filet fille film filou fin finale firme fisc fissure flacon flamme
flanc flèche fleur fleuve flocon floraison flore flot flûte flux focale foi foie
foin foire fois folie folio fond fontaine force forêt forge forme fornax fossé fossile
foudre fougère fouille four foulard fourche fourmi foyer fraise franc frappe frayeur
frère frimas frise frite froid fronde front fruit fuchsia fucus fuel fugue fuite fumée
fureur fusée fusil gabarit gage gagnant gaieté galaxie galerie galet galop gambade
gamme gant garage garance garçon garde gare gargouille garnison gaspillage gâteau
gauche gaulois gaz gazelle gazon geai géant gel gencive gendre génie genou genre
géographie géologie géranium gerbe germe geste geyser gibier givre glacis glace gladiateur
glaive gland glas glebe globe gloire glou gluon glyphe gnome goéland goinfre golfe gomme
gond gong gorge gorille gothique gouffre gourde gourmand goût goutte grâce grain graine
graisse gramme grand granit graphite gras gratin gravier grêle griffe gril grillage
grillon grimace gris grive grotesque groupe grue guêpe guêtre guérite guichet guide
guimauve guitare gulf gustave gymnase habile habit hache haie haine haleine halte
hamac hameau hampe hanche hangar hanter haras haricot harpe hasard hâte hausse havre
hélas hélianthe hélice hémisphère henné herbe hérisson héritage hermine héron hêtre
heure hibou hideur hiérarchie hiver hochet hollande homard homme honneur honte horde
horizon hormone horloge hors hôte houblon houle houppe housse hublot huile huis huit
humble humeur humour hune hurlement husky hutte hydrate hyène hymne hyperbole hypnose
iceberg ichtyose icône idéal idée identique idole île image impact impasse impôt
impression index indice infini informe infusion ingénu initial injure inné inondation
insecte instant institut insulte intact intense intérêt intuition inutile invité iode
iris ironie irrigation isoloir issue ivoire ivraie jade jaillir jais jalon jambe
jambon jardin jarre jasmin jatte jaune javel jet jeu jeudi jeune jockey joie jointure
joker joli jonquille joue jouet joug jour journal joute joyau jubé juge jujube juillet
jungle jument jupe jupon jurer jury jus justesse juteux kaiser kaki kangourou karaté
kayak kéa kelp kendo kermesse ketchup keynésien kiosque kiwi koala kopeck kraft
krypton kumquat label labeur lacis lacune lac laine laisse laitue lambeau lampe lance
langue lanière lanterne lapin laps large larme larve laser lasso lasting latin
laurier lavande laveuse leçon lecteur légal légende léger légion légume lessive
lettre levain levier lézard liage liaison liane liant libertaire libellule liberté
libre licence lichen licol liège lien lieu lièvre lifting ligament ligne ligue lilas
limace limaille limbe lime limite limon lin linge lion liquide lisière lisse liste
lit litre littoral livraison livre lobe local locataire loess logique loi loin loir
long loque lori loriot losange lot loteur louange louche louer loupe lourd loutre
loyer lueur luge lumière lune lunette lustre lutin luxe lycée lyre lys macaque
machine macis maçon madone magasin magma magnat magot mai maille maire maison
maître majorité mal malamute malice malin malle malt mammouth manche mandat
manège manière manoir manteau manuel marbre marge mari marin marque marteau
masque masse mastic mât matelas matière matin matou maussade maux mazout
mécanique mèche médecin médaille méduse meeting mégot méhari meilleur mélange mêlée
mélodie melon membrane mémoire menace ménage menthe menu mer mercure mère merise
mérite merle merlu mesange mesure métal méthode métier métrique meule meunier
miaou micro midi miel miette mieux mignon migration milice mille millier mimosa
mince mine minéral miniature minuit mirage miroir mise missile mission mitre mixte
mobile mode moelle mœurs mois moisson moitié molaire mollet moment monade monde
monnaie monotone monstre mont montagne monter montre monument moquerie morceau
mordant morille morne mort mosaïque mot motard motif moteur motif mouche moue moufle
mouillé moule moulin mousse moustache mouton mouvement moyen muet mulet mulot
multiple munition mur mûre murmure musc muscle musée musique musette mutant myosotis
mystère mythe nacre nageoire naïf nain naissance nappe narcisse nard narine
narrateur naseau natal natte nature nausée navet navire nazca néant nectar nèfle
neige nerf net nettoyage neuf neutre neveu niche nickel nid nielle nièce nielle
nimbe niobium nique nitrate niveau noble noces nœud noir noise noix nom nombre
nomade nombril non nonce nord normal norme notre nourrice nourriture nouveau
novembre noyau nuage nuance nubile nucléaire nudité nuit nul numéro nuque Nurse
nutrition oasis objet obélisque obier objectif obscur obstacle océan ocre octave
octet octobre odeur offrande office ogive oie oignon oiseau olive ombilic ombre
omelette omoplate once oncle onde ongle onyx opaque opale opéra option or orage
oraison orange orbe orchestre ordre oreille orge orgie orgue oriel orme ornement
orphelin orteil ortie os osier otarie ôter oubli ouate ouest oui ouïe ours
outil outre ouvert ouvrage ovale ovation ovin oxyde ozone pacage pacane pacifique
pacte pagaille page pagode paille pain paire paisible paître paix palais palet
pâle palette palier palmier palombe palourde pampa panache panier panne panneau
panorama pantalon panthère pantin paon papier papillon papyrus paquet paradis
parc parcelle pardon parfait parfum pari paroi parole parsemer part parti parti
parure parvis pas passage passereau passion pastel pastèque pataud pâte patelin
patience patin pâtir patois patrie patron patte pâture paume paupière pause
pauvre pavé pavot pays paysage péage peau pêche péché pécule pédale pédicure
peigne peindre peinture pèlerin pelle pellicule pelote pelouse peluche penalty
pencher pendule péniche péninsule pensée pension pente pénurie pépin pépinière
percale perche perdrix père perméable perroquet persil personnage perte pesanteur
peste pétale pétanque petit pétrole peu peuple peur phase phare pharmacie
phénix philosophe philtre phoque phrase physique piano pic pichet pie pièce
pied piège pierre piété piéton pieuvre pigeon pile pilier pilon pilote pilule
piment pin pince pinceau pinson pintade piolet pion pipe piquant pique piqûre
pirate pirogue piscine piste piton pivoine pivot place plafond plage plaie
plainte plaine plan planche plante plaque plastique plat plateau platine
plâtre plein plénière pleur pli plomb plongée pluie plume plupart pluriel
plus plutonium pneu poche poêle poids poil poing point pointe poirier pois
poison poisson poitrine poivre poli police polir pollen pollution pommade
pomme pommeau pompe pompon pont ponce poney ponton porc porcelaine poreux
port portail portée porter portrait portique poser position posséder poste
posture pot potage poteau poterie potiron pou pouce poudre poule poulet
poulie poumon poupe poupée pourpre pourtour pousse poussin poutre prairie
praline pratique pré préau précieux prédire préface préfet préfixe préjugé
prélude premier prendre prépa près prêtre preuve prier primaire prime
prince printemps prix probité procès proche prodige profil profit
profond projet promenade prompt pronostic proportion propos propre prospère
protéine protocole proue prune pruneau pseudonyme public puce pudeur
puer puits pull pulpe pulsion punch punition pupille pupitre pur pureté
pyjama pylône pyramide pyrèthre quai qualité quand quantique quart
quartier quasars quatre quenouille querelle quête queue quiche quiconque
quille quinine quintal quinte quittance quorum quota quotidien rabat
rabbin raboteuse racine raconter radar radeau radiateur radis rafale
rage ragoût rai rail raisin rajeunir râle ralenti ramage rame rampe
rance rayon raz réacteur réalité rebelle rebord rébus rebut recette
récif récit récolte record recours recrue rectangle reçu recyclage
rédaction redouter reflet refuge réfugié refus regain regard règle
régime région registre règle regret rein reine rejet relais relevé
relief relique remise rempart remède remous rendu renfort renne
renom rénovation rente repaire repas repère répétition réplique
réponse report repos reptile requête réseau résidu résine résistance
respiration ressac ressort ressource restaurant reste résultat résumé
retard retenue retrait retour réunion rêve revue rhume rideau
rien rigole rime ring rinçage rire ris riz robe robinet roc roche
rocket roi roitelet roman romarin ronce rond roseau rossignol
rotin rotule rouage roue rouge rouille rouleau route roux royale
ruban rubis ruche rude rue ruelle rugueux ruine ruisseau rumeur
rune rustique rythme sable sabot sabre sac sachet safran sage
sagesse saignée saillie sain saint saisie saison salade salaire
salle salon sel saluer salve samedi sanctuaire sandale sang
sangle sans sapin sarcelle sardine satellite satire saturne
sauge saule saumon sauter sauvage sauveur savane savant savon
saveur savoir savoureux saxon scandale scan scaphandre scarabée
sceau scène sceptre schéma science scie scorpion scribe script
scrupule sculpteur séance seau sec sécher second secret secte
seigle seigle sein séisme séjour sel selle semaine semelle
semence semer sénat sens sentier sentinelle sépale septembre
séquestre séquoia serf sergent série serment serpe serpent
serre serrure sésame seuil seve sévère sexe Short siamois
sibylle sicile siège sifflet sigle signal silence silex
silhouette sillon simoun simple simulacre singe sinistre
sinus sirène sirop site situer six skieur slogan soie soif
soigner soin soir soja sol solaire soldat solde soleil
solide soliste solitude solive sombre sommaire sommet sommier
somnolence sondage songe sonnette sonore sopha sophisme
sorbet sorcier sordide sorgho sortie sortilège sosie sot
sottise souche soudain souffle soufre soûl soulier soupçon
soupe souple source sourd sourcil sourire souris sous
soute soutien souvenir souvent soyeux spacieux spade
sparadrap spatial spécial sphère spolier sport spot
squelette stade stagiaire stand star statique statue
station steppe store stop strate stress strict structure
stuc studio stupide style suave subir subit sublime
substrat succès sucre sud sudation sueur suffire suie
suif suicide suite suivre sujet superbe supplice surface
surf surgir sursaut surtout surveiller survie suspect
svelte syllabe sylphe symbole symétrie synapse syntaxe
syrien système tabac table tablier tabou tache tact
tacticien taille taire talent talon talus tambour
tamise tampon tandem tanière tapage tape tapir tapis
taquin tard tarif tarot tartine tas tasse taureau
taux taxe teck teigne teindre teinture télécabine
téléphone telier témoin tempe tempête temple tempo
temps tenseur tenture tenue terme ternir terrasse
terre terrier tertre tesla testament tête tétine
texte texture théâtre thé thème tibia tige
tilleul timbre timidité timing tinter tirade tiran
tirelire tiroir tissu titre tituber toile toise
toit tomate tombe tonalité tondre tonnerre tonneau
topaze topic toque torche tordre torrent torsion
tortue tôt total totem touche touffe toujours
toupie tour tourbe tournesol tourte tousser tout
toxine tracas trace tracteur trafic tragédie
trahir train traire traiter trajet trame trampoline
tranchant tranche travail traverne travers trébucher
treize tremble trémie trempé trentaine trépied très
triangle tribu tribut triche tricot triomphe
triple triste triton trône tronc trop trophée
tropical trottoir trou trouble troupe trousse
truite truque tube tubercule tuer tulipe tumeur
tunique turban turf turquoise tutelle tuteur
tuyau type typhon typique tyrannie ubac ukulélé
ulcère ultime unanime unique unité univers
urbain urne usage usine usuel usure utile
vacance vache vague vaillant vainc val valise
vallée valve vampire vanille vantail vapeur
variable vase vaseux vaste vautour veau
vécu vedette veille veinard velours velu
vendredi venin vent vente ventre verre
verger vérité verrou vers vert vertu
vesce veste vétéran veto veuf vexer
viaduc viande vibreur vice victime vide
vieille vierge vif vigie vigne vil
village ville vin vingt violet violon
vipère virage vierge virement viseur vision
visite vison vitesse vitre vitrine vivant
vivre vocation vœu voile voir voisin
voiture voix vol volaille volant volcan
voler volet voleur volonté volume vomir
vorace vote vouloir voûte voyage voyelle
vrac vrai vrille vue wagon web week
western whisky yacht yaourt yeux yoga
zébu zèbre zénith zeste zeste zinc
zone zoo zoom`
  .split(/\s+/)
  .map((w) => w.normalize("NFC"))
  .filter((w) => w.length > 2);

/** Liste dédupliquée (≈ 2 000 mots) utilisée pour les phrases de passe. */
const UNIQUE_WORDS = Array.from(new Set(WORDLIST));

export function generatePassphrase(words: number, separator = "-"): string {
  const chosen: string[] = [];
  for (let i = 0; i < words; i += 1) {
    chosen.push(UNIQUE_WORDS[crypto.getRandomValues(new Uint32Array(1))[0] % WORDLIST.length]);
  }
  return chosen.join(separator);
}

export function passphraseWordsCount(): number {
  return UNIQUE_WORDS.length;
}

/* ------------------------------------------------------------------ */
/*  Évaluation de la force                                             */
/* ------------------------------------------------------------------ */

const COMMON_PASSWORDS = new Set([
  "password", "motdepasse", "123456", "12345678", "123456789", "azerty", "qwerty",
  "abc123", "iloveyou", "admin", "welcome", "monkey", "dragon", "soleil", "bonjour",
  "football", "letmein", "000000", "111111", "123123", "password1", "qwerty123",
  "amour", "dieu", "jesus", "catholic", "abidjan", "wifi", "orange", "test1234",
]);

export type StrengthLabel = "Très faible" | "Faible" | "Moyen" | "Solide" | "Excellent";

export interface Strength {
  /** 0 → 4 */
  score: number;
  label: StrengthLabel;
  entropyBits: number;
  advice: string[];
}

const LABELS: StrengthLabel[] = ["Très faible", "Faible", "Moyen", "Solide", "Excellent"];

export function estimateStrength(password: string): Strength {
  const advice: string[] = [];
  if (!password) {
    return { score: 0, label: LABELS[0], entropyBits: 0, advice: ["Saisissez un mot de passe."] };
  }

  const lower = /[a-z]/.test(password);
  const upper = /[A-Z]/.test(password);
  const digits = /\d/.test(password);
  const symbols = /[^A-Za-z0-9]/.test(password);

  let pool = 0;
  if (lower) pool += 26;
  if (upper) pool += 26;
  if (digits) pool += 10;
  if (symbols) pool += 33;
  if (pool === 0) pool = 26;

  let entropy = password.length * Math.log2(pool);

  // Pénalités simples : répétitions, séquences, clavier.
  const unique = new Set(password.toLowerCase()).size;
  if (unique <= 4 && password.length > 6) entropy *= 0.55;
  if (/(.)\1{2,}/.test(password)) {
    entropy *= 0.8;
    advice.push("Évitez les caractères répétés.");
  }
  if (/(1234|abcd|qwer|azerty|0000|1111)/i.test(password)) {
    entropy *= 0.7;
    advice.push("Évitez les suites logiques (1234, azerty…).");
  }

  const plain = password.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (COMMON_PASSWORDS.has(plain)) {
    entropy = Math.min(entropy, 16);
    advice.push("Ce mot de passe figure dans les listes les plus utilisées.");
  }

  if (password.length < 12) advice.push("Utilisez au moins 12 caractères.");
  if (!upper) advice.push("Ajoutez des majuscules.");
  if (!digits) advice.push("Ajoutez des chiffres.");
  if (!symbols) advice.push("Ajoutez un symbole (!, %, #…).");

  let score = 0;
  if (entropy >= 82) score = 4;
  else if (entropy >= 62) score = 3;
  else if (entropy >= 42) score = 2;
  else if (entropy >= 26) score = 1;
  else score = 0;

  if (password.length < 8) score = Math.min(score, 1);
  if (COMMON_PASSWORDS.has(plain)) score = 0;

  return {
    score,
    label: LABELS[score],
    entropyBits: Math.round(entropy),
    advice: advice.slice(0, 3),
  };
}
