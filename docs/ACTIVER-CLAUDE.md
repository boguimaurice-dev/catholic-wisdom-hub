# Activer Claude (Anthropic) — procédure manuelle

> Aucun mode Build ni abonnement Lovable n'est nécessaire.
> Comptez 10 minutes, tout se fait par clics depuis GitHub puis Supabase.

---

## À savoir avant de commencer

Trois choses sont indépendantes :

| # | Quoi | Où |
| --- | --- | --- |
| 1 | Le **code source** | GitHub |
| 2 | La **clé secrète** Anthropic | Supabase (jamais dans le code) |
| 3 | Les **fonctions déployées** | Supabase |

Modifier le code sur GitHub ne met pas à jour les fonctions déjà déployées :
l'étape 3 est obligatoire si la synchronisation automatique de Lovable ne
fonctionne plus (abonnement expiré). Elle prend 3 minutes.

Les 3 fonctions concernées sont **autonomes** (un seul fichier chacune) : elles
peuvent donc être collées directement dans l'éditeur web de Supabase, qui ne
gère qu'un fichier par fonction.

---

## Étape 1 — Récupérer le code

### Recommandé : fusionner la pull request (1 clic)

1. Ouvrir https://github.com/boguimaurice-dev/catholic-wisdom-hub/pull/16
2. **Merge pull request** → **Confirm merge**

Fichiers concernés :

| Fichier | Nature |
| --- | --- |
| `supabase/functions/catholic-orchestrator/index.ts` | modifié |
| `supabase/functions/chatbot/index.ts` | modifié |
| `supabase/functions/liturgy-meditation/index.ts` | modifié |
| `README.md` | documenté |
| `docs/ACTIVER-CLAUDE.md` | ce guide |

> ⚠️ **Ne pas** appliquer l'ancienne procédure « remplacer 2 lignes ».
> Dans ce dépôt, l'ordre des fournisseurs se trouve dans `callAI()` et
> `callLovableAI()` (pas à la ligne 235), et `chatbot` /
> `liturgy-meditation` n'appelaient **jamais** Claude. Deux fonctions sur trois
> resteraient sur Gemini.

### Alternative : copier-coller sur GitHub

Ouvrir chaque lien, cliquer sur **Raw**, tout sélectionner (Ctrl+A), copier, puis
dans le dépôt : ouvrir le fichier → ✏️ → tout sélectionner → coller →
**Commit changes**.

- https://github.com/boguimaurice-dev/catholic-wisdom-hub/blob/arena/7d08cdbe-catholic-wisdom-hub/supabase/functions/catholic-orchestrator/index.ts
- https://github.com/boguimaurice-dev/catholic-wisdom-hub/blob/arena/7d08cdbe-catholic-wisdom-hub/supabase/functions/chatbot/index.ts
- https://github.com/boguimaurice-dev/catholic-wisdom-hub/blob/arena/7d08cdbe-catholic-wisdom-hub/supabase/functions/liturgy-meditation/index.ts

---

## Étape 2 — Enregistrer la clé Claude

1. Ouvrir https://supabase.com/dashboard/project/xfbjowupnffoykyhaqoz
2. Menu **Project Settings** → **Edge Functions** → section **Secrets**
   (ou **Edge Functions** → onglet **Secrets** selon la version du tableau de bord)
3. **Add new secret** :
   - Name : `ANTHROPIC_API_KEY`
   - Value : votre clé `sk-ant-...`
4. Valider.

> Si vous voyez déjà un secret `claude_api` (ancien nom), il fonctionne aussi.
> `ANTHROPIC_API_KEY` reste préféré.

---

## Étape 3 — Déployer les 3 fonctions

### A. Vérifier d'abord si c'est déjà fait

Poser une question dans l'application, puis vérifier la réponse de la fonction
(étape 4). Si `claudeActive` vaut déjà `true`, la synchronisation automatique a
fait le travail : passez directement à l'étape 4.

### B. Sinon : coller le code dans l'éditeur Supabase

Pour chacune des 3 fonctions :

1. **Edge Functions** → sélectionner la fonction (`catholic-orchestrator`,
   puis `chatbot`, puis `liturgy-meditation`)
2. Onglet **Code** (ou bouton **Edit**)
3. Dans l'éditeur, tout sélectionner (Ctrl+A) puis **supprimer**
4. Coller le contenu correspondant (récupéré à l'étape 1)
5. Cliquer sur **Deploy updates** (ou **Save & Deploy**)
6. Attendre le message de succès avant de passer à la suivante

Fichiers à coller :

| Fonction Supabase | Contenu à coller |
| --- | --- |
| `catholic-orchestrator` | `supabase/functions/catholic-orchestrator/index.ts` |
| `chatbot` | `supabase/functions/chatbot/index.ts` |
| `liturgy-meditation` | `supabase/functions/liturgy-meditation/index.ts` |

> **Réglage à conserver** : pour `catholic-orchestrator`, l'option
> **Enforce JWT verification** doit rester **désactivée** (`verify_jwt = false`
> dans `supabase/config.toml`), car la fonction gère elle-même
> l'authentification et les quotas.

### C. Variante ligne de commande (si vous l'avez un jour)

```sh
supabase link --project-ref xfbjowupnffoykyhaqoz
supabase functions deploy catholic-orchestrator --no-verify-jwt
supabase functions deploy chatbot
supabase functions deploy liturgy-meditation
```

---

## Étape 4 — Vérifier que Claude répond

1. Ouvrir l'application et poser une question de foi dans la consultation.
2. Ouvrir la console du navigateur : **F12** → onglet **Network**
3. Cliquer sur l'appel `catholic-orchestrator` → onglet **Response** (ou **Preview**)
4. Chercher le bloc `meta` :

```json
"meta": {
  "providers": ["claude"],
  "primaryProvider": "claude",
  "claudeActive": true,
  "claudeModel": "claude-sonnet-4-5-20250929"
}
```

| Ce que vous voyez | Signification |
| --- | --- |
| `"claudeActive": true` | ✅ Claude répond. C'est terminé. |
| `"providers": ["gemini"]` | Claude a échoué → repli automatique. Étape 5. |
| `"providers": ["deepseek"]` | Claude a échoué → repli DeepSeek. Étape 5. |

Pour le chatbot (bulle de discussion) et la méditation du jour, le résultat de
Claude est visible directement dans la réponse affichée ; en cas d'échec,
consulter les logs (étape 5).

---

## Étape 5 — Si Claude n'est pas utilisé

**Edge Functions → la fonction → onglet Logs**. Le message exact y figure :

| Message dans les logs | Cause | Correction |
| --- | --- | --- |
| `ANTHROPIC_API_KEY (ou claude_api) n'est pas configurée` | Secret absent sur la fonction | Étape 2, puis redéployer |
| `Claude a refusé l'appel. 401` | Clé invalide ou révoquée | Régénérer la clé sur console.anthropic.com |
| `Claude a refusé l'appel. 404` | Modèle inexistant ou retiré | Corriger le secret `CLAUDE_MODEL` |
| `Claude a refusé l'appel. 400` | Requête mal formée | Noter le message complet et le signaler |
| `429` / `5xx` | Limite ou incident Anthropic | Réessayer ; le repli protège l'application |

Un log `Consultation servie par : claude` confirme le bon fonctionnement.

---

## Changer de modèle plus tard (sans toucher au code)

```sh
# ou via le tableau de bord : Project Settings → Edge Functions → Secrets
supabase secrets set CLAUDE_MODEL=claude-sonnet-5-5
```

`claude-sonnet-4-5-20250929` est en fin de vie sur l'API Anthropic (retrait
annoncé au 30 novembre 2026). Ce simple réglage suffira, sans redéploiement.
