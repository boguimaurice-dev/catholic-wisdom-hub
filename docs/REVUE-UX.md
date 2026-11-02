# Revue UX et pistes d’optimisation

## Changements appliqués dans cette passe

- **Lisibilité** : texte courant désormais en sans-sérif, taille de base de 16 px et interlignage plus confortable. Les réponses de consultation sont plus grandes, les cartes de thèmes et les détails des spécialistes ne descendent plus à 9–11 px.
- **Mobile** : barre d’en-tête qui peut s’organiser sur deux lignes, spécialités consultables dans une rangée à défilement horizontal, champ de saisie adapté au clavier mobile et aux zones de sécurité des téléphones.
- **Noms des agents** : retrait des noms de personnes historiques/arbitraires au profit de fonctions explicites, avec libellés localisés en français, anglais, espagnol et portugais. Les anciennes consultations sont également affichées avec le nom de fonction correspondant à leur clé.
- **Accessibilité** : focus clavier plus visible, prise en compte de la préférence « réduire les animations », cibles tactiles plus confortables.
- **Export HTML** : échappement des contenus dynamiques (question, synthèse, contributions, etc.) avant leur insertion dans le fichier exporté.
- **Mise en page globale** : suppression des règles de l’ancien starter Vite qui auraient contraint l’application à une largeur de 1 280 px et ajouté un padding global si `App.css` était chargé.

## Constats et recommandations restantes

### Priorité haute

1. **Réduire le JavaScript livré au premier chargement.** Le build de production signale un chunk principal minifié d’environ **728 kB** (et déclenche l’avertissement Vite au-delà de 500 kB). Mesurer le poids avec un analyseur de bundle, puis découper les dépendances lourdes par route/fonctionnalité et examiner notamment les bibliothèques d’animation et de visualisation.
2. **Ajouter des tests d’interface responsive et d’accessibilité.** Le dépôt ne contient actuellement qu’un test unitaire très simple. Couvrir au minimum les écrans étroits, le clavier, le zoom/agrandissement du texte, le thème sombre et les états de chargement/erreur.
3. **Valider les citations et les limites des réponses théologiques.** Afficher les références vérifiables et une indication claire quand une réponse est une synthèse d’IA, pas un avis pastoral ou canonique faisant autorité.

### Priorité moyenne

4. **Clarifier la navigation mobile.** L’en-tête concentre plusieurs actions. Tester sur de vrais écrans 320–390 px ; si elle reste trop chargée, regrouper les liens secondaires dans un menu accessible.
5. **Mieux gérer les erreurs d’enregistrement.** La consultation peut réussir alors que sa sauvegarde ou la mise à jour du quota échoue. Distinguer explicitement « réponse reçue » et « historique/quota mis à jour », avec une possibilité de réessayer.
6. **Vérifier le budget de performance de chaque page.** Fixer des objectifs de poids et mesurer LCP/CLS/INP sur mobile lent, plutôt que d’optimiser seulement le temps du build.
7. **Rendre l’installation reproductible.** `npm ci` échoue actuellement : le `package-lock.json` ne correspond pas au `package.json`, et `vite-plugin-pwa@0.21.1` annonce une plage de versions de Vite qui n’inclut pas Vite 8. Aligner les versions et régénérer le lockfile avec la stratégie retenue avant le prochain déploiement.
8. **Revoir la documentation projet.** Le README contient encore des références de modèle Lovable (`REPLACE_WITH_PROJECT_ID`) et des instructions génériques ; les remplacer par les étapes réelles de configuration, de lancement et de déploiement du produit.

## Vérifications de cette passe

- `npm run build` : réussi ; avertissement de bundle principal volumineux encore présent.
- `npm test -- --reporter=dot` : 1 test réussi.
- `npm run lint` : échoue sur des erreurs déjà présentes dans plusieurs fichiers non modifiés (types `any`, interfaces vides, règle `require`, etc.). Il faudra une passe dédiée de remise en état du lint ; ces erreurs ne sont pas corrigées dans cette refonte UX.
