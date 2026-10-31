# 🔐 Coffre

**Gestionnaire de mots de passe, de clés API et de notes confidentielles** — application web progressive (PWA),
chiffrée de bout en bout sur l'appareil, sans serveur ni compte.

> Un seul mot de passe maître. Zéro connaissance. Zéro requête réseau.

---

## Sommaire

1. [Fonctionnalités](#fonctionnalités)
2. [Modèle de sécurité](#modèle-de-sécurité)
3. [Démarrage local](#démarrage-local)
4. [Déploiement sur Vercel](#déploiement-sur-vercel)
5. [Installer la PWA](#installer-la-pwa)
6. [Utiliser plusieurs appareils](#utiliser-plusieurs-appareils)
7. [Structure du projet](#structure-du-projet)
8. [Tests](#tests)
9. [Limites connues](#limites-connues)

---

## Fonctionnalités

| | |
|---|---|
| 🔑 **Connexions** | Identifiant, mot de passe, site web, notes, champs personnalisés |
| 🧩 **Clés API** | Service, clé, documentation, notes — copie en un geste |
| 📝 **Notes confidentielles** | Codes de secours, phrases de récupération, textes privés |
| ⚙️ **Générateur** | Mots de passe (8 à 64 caractères) et phrases de passe (3 à 10 mots) |
| 🛡️ **Audit local** | Détecte les secrets faibles, réutilisés ou trop anciens, avec un indice /100 |
| 🔍 **Recherche instantanée** | Titre, identifiant, URL, étiquettes, notes, champs personnalisés |
| ⭐ **Favoris & étiquettes** | Retrouvez vos accès les plus utilisés |
| 🔒 **Verrouillage automatique** | Après 1 à 60 min d'inactivité, à la mise en arrière-plan |
| 📱 **Code PIN de déverrouillage rapide** | La clé du coffre est emballée par le PIN (désactivable) |
| 🧹 **Presse-papiers auto-nettoyé** | Le secret copié est effacé après 15 s à 2 min |
| 💾 **Sauvegarde chiffrée** | Export/import d'un fichier `.json` déjà chiffré (transfert multi-appareils) |
| 🌓 **Thèmes sombre & clair** | Préférence enregistrée localement |
| 📲 **PWA installable** | Plein écran, hors connexion, Android / iOS / ordinateur |
| ♿ **Accessibilité** | Navigation clavier, `Ctrl/⌘ + K` (recherche), `Ctrl/⌘ + L` (verrouiller) |

---

## Modèle de sécurité

### Chiffrement

- **AES-256-GCM** pour le coffre (confidentialité **et** intégrité).
- Clé dérivée du mot de passe maître par **PBKDF2-HMAC-SHA-256, 600 000 itérations**, avec un **sel aléatoire
  de 16 octets** propre au coffre (recommandation OWASP 2024).
- **IV aléatoire de 12 octets** régénéré à chaque écriture (pas de réutilisation).
- Le PIN de déverrouillage rapide utilise sa propre dérivation PBKDF2 (sel dédié) et **emballe** la clé du
  coffre : le coffre n'est jamais re-chiffré avec un code court.
- Les sauvegardes exportées **excluent** la copie emballée par le PIN : seul le mot de passe maître permet de
  restaurer un fichier.

### Ce qui est stocké où

| Donnée | Emplacement | Chiffrée |
|---|---|---|
| Coffre (tout le contenu) | IndexedDB (`coffre-db`) ou repli `localStorage` | ✅ |
| Sel, IV, KDF, dates | avec l'enveloppe chiffrée | — (non sensibles) |
| Réglages (thème, verrouillage, presse-papiers) | `localStorage` | — (non sensibles) |
| Clé dérivée | **mémoire uniquement** | jamais persistée en clair |

Aucune requête réseau n'est effectuée par l'application : elle fonctionne en mode avion, et la politique de
sécurité (`Content-Security-Policy: connect-src 'self'`) bloque les connexions sortantes en production.

### Ce que Coffre **ne** protège pas

- Un appareil compromis (malware, navigateur piégé, root/jailbreak) : le déchiffrement a lieu dans la page.
- Un mot de passe maître faible ou réutilisé.
- Un code PIN court : 6 chiffres ≈ 20 bits. Il est pratique, pas équivalent au mot de passe maître —
  c'est pourquoi il est optionnel et désactivable.
- La perte du mot de passe maître : **aucune récupération n'existe**. Exportez des sauvegardes.

### Bonnes pratiques

1. Mot de passe maître long (phrase de passe de 5–6 mots) et unique.
2. Exportez une sauvegarde chiffrée après chaque ajout important, conservez-la hors ligne.
3. Activez le verrouillage automatique (5 minutes par défaut).
4. Protégez l'appareil par un code/biométrie et gardez-le à jour.

---

## Démarrage local

Prérequis : **Node.js ≥ 20.19** (ou 22.12+) et npm.

```bash
cd safevault
npm install
npm run dev          # http://localhost:5173
```

Autres scripts :

```bash
npm run build        # build de production (dist/) + service worker
npm run preview      # prévisualise le build (SW actif)
npm test             # tests unitaires + parcours applicatif (Vitest / jsdom)
npm run typecheck    # vérification TypeScript
```

> ⚠️ WebCrypto (`crypto.subtle`) n'est disponible qu'en **HTTPS** ou sur `localhost`. En local c'est bon,
> sur un serveur il faut du HTTPS (Vercel le fournit automatiquement).

---

## Déploiement sur Vercel

Le projet est autonome (`safevault/`), avec son propre `package.json` et son `vercel.json`.

### Option A — Depuis le tableau de bord (recommandée)

1. **vercel.com/new** → importez le dépôt GitHub `catholic-wisdom-hub`.
2. Dans **Configure Project** :
   - **Root Directory** : `safevault` *(obligatoire)*
   - **Framework Preset** : `Vite` *(détecté automatiquement)*
   - **Build Command** : `npm run build`
   - **Output Directory** : `dist`
3. **Deploy**. L'URL de production ressemble à `https://coffre-xxxx.vercel.app`.

Le fichier [`safevault/vercel.json`](./vercel.json) applique déjà : réécriture SPA, en-têtes de sécurité
(CSP, `nosniff`, `no-referrer`, `Permissions-Policy`) et cache adapté au service worker.

### Option B — En ligne de commande

```bash
npm i -g vercel
cd safevault
vercel              # préversion (preview)
vercel --prod       # production
```

### Option C — Domaine personnalisé

Dans Vercel → **Project → Settings → Domains** → ajoutez votre domaine, puis créez l'enregistrement DNS
indiqué (`CNAME` vers `cname.vercel-dns.com`). Le HTTPS est automatique.

---

## Installer la PWA

| Plateforme | Procédure |
|---|---|
| **Android (Chrome / Edge)** | Bandeau « Installer » dans l'app, ou menu ⋮ → *Installer l'application* |
| **iPhone / iPad (Safari)** | Bouton **Partager** → *Sur l'écran d'accueil* |
| **Windows / macOS / ChromeOS** | Icône d'installation dans la barre d'adresse, ou menu ⋮ → *Installer Coffre* |
| **Ordinateur (Chrome)** | Paramètres → Réglages, section *Installer l'application* |

Une fois installée : lancement en plein écran, fonctionnement **hors ligne**, icône dédiée.

> Sur iOS, l'installation n'est possible que depuis **Safari** (pas Chrome/Firefox iOS).

---

## Utiliser plusieurs appareils

Coffre n'a **pas de serveur de synchronisation** (c'est un choix de sécurité et de simplicité) : chaque
appareil possède son propre coffre chiffré.

Pour retrouver vos secrets sur un second appareil :

1. Sur l'appareil 1 : **Réglages → Exporter le coffre** → un fichier `coffre-sauvegarde-AAAA-MM-JJ.json`
   (déjà chiffré) est téléchargé.
2. Transférez ce fichier (AirDrop, câble, cloud privé, e-mail à soi-même…).
3. Sur l'appareil 2 : écran de verrouillage → **Restaurer une sauvegarde** (ou Réglages → Importer), puis
   saisissez le mot de passe maître.

Le fichier reste inutilisable sans le mot de passe maître, même s'il est intercepté.

---

## Structure du projet

```
safevault/
├─ public/
│  ├─ icons/                  icônes PWA (192, 512, maskable, Apple)
│  ├─ favicon.svg
│  └─ robots.txt              indexation désactivée
├─ src/
│  ├─ lib/
│  │  ├─ crypto.ts            KDF, AES-GCM, générateurs, évaluation de force
│  │  ├─ storage.ts           IndexedDB + repli localStorage, validation d'enveloppe
│  │  ├─ backup.ts            export / import de sauvegarde chiffrée
│  │  ├─ clipboard.ts         copie + effacement automatique
│  │  ├─ toast.ts             notifications
│  │  └─ types.ts             modèle de données
│  ├─ context/VaultContext.tsx  état du coffre, verrouillage, migrations de clé
│  ├─ components/             écrans et composants (auth, liste, détail, éditeur,
│  │                          générateur, audit, réglages…)
│  ├─ hooks/                  PWA install, media queries
│  ├─ App.tsx · main.tsx      point d'entrée + enregistrement du service worker
│  └─ index.css               design system (thèmes sombre/clair, responsive)
├─ tests/                     tests Vitest (crypto, parcours applicatif)
├─ vercel.json
└─ vite.config.ts             Vite + vite-plugin-pwa (manifest, Workbox)
```

---

## Tests

```bash
npm test
```

Couverture :

- **crypto** : aller-retour de chiffrement, rejet d'un mauvais mot de passe, déverrouillage par PIN,
  unicité des sels/IV, encodage base64 sur gros volumes, générateurs, évaluation de force ;
- **parcours applicatif** (jsdom) : création du coffre, ajout d'un secret, absence de clair dans le stockage,
  verrouillage, rejet d'un mauvais mot de passe, déverrouillage, générateur.

---

## Limites connues

- Un seul coffre par navigateur/appareil (pas de multi-utilisateurs).
- Pas de synchronisation temps réel entre appareils (voir [plusieurs appareils](#utiliser-plusieurs-appareils)).
- Pas d'autofill/extension navigateur : copier-coller sécurisé uniquement.
- Le presse-papiers n'est pas accessible dans certains contextes (iframe non autorisée, onglet non focalisé) :
  un repli `execCommand` est utilisé, et l'effacement automatique est « au mieux ».
- Sauvegarder un champ personnalisé « secret » le masque, mais **tous** les champs sont chiffrés dans le
  coffre de toute façon.

---

## Licence

Projet privé — usage personnel. Fourni tel quel, sans garantie.
