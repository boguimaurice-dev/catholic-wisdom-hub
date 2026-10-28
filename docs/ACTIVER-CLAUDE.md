# Activer Claude (Anthropic) — procédure manuelle

> Cette procédure ne demande **aucun mode Build** ni abonnement Lovable.
> Tout se fait depuis GitHub, puis depuis Supabase (une seule fois).

---

## À savoir avant de commencer

Modifier un fichier sur GitHub met à jour **le code source**, pas la fonction
déployée. Il y a donc deux étapes distinctes :

1. **le code** → sur GitHub (étape 1 ci-dessous) ;
2. **le déploiement** → dans Supabase (étape 3).

Si votre projet Lovable se synchronise encore automatiquement avec Supabase,
l'étape 3 peut se faire seule. Sinon, elle prend 2 minutes.

---

## Étape 1 — Récupérer les modifications du code

### Option A — recommandée : fusionner la pull request (1 clic)

1. Ouvrir : https://github.com/boguimaurice-dev/catholic-wisdom-hub/pull/16
2. Cliquer sur **Merge pull request**, puis **Confirm merge**.

Les 5 fichiers sont appliqués d'un coup, sans risque de faute de frappe :

| Fichier | Nature |
| --- | --- |
| `supabase/functions/_shared/claude.ts` | nouveau (client Claude commun) |
| `supabase/functions/catholic-orchestrator/index.ts` | modifié |
| `supabase/functions/chatbot/index.ts` | modifié |
| `supabase/functions/liturgy-meditation/index.ts` | modifié |
| `README.md` | documenté |

> ⚠️ **Ne pas** appliquer l'ancienne procédure « remplacer 2 lignes ».
> Elle ne suffit pas : dans ce dépôt, l'ordre des fournisseurs est dans
> `callAI()` et `callLovableAI()`, et `chatbot` / `liturgy-meditation`
> n'appelaient jamais Claude. Deux des trois fonctions resteraient sur Gemini.

### Option B — copier-coller manuel (si vous ne pouvez pas fusionner)

1. **Créer le fichier partagé** : dans le dépôt, ouvrir le dossier
   `supabase/functions/`, cliquer **Add file → Create new file**, nommer
   `_shared/claude.ts`, puis coller le contenu de
   https://raw.githubusercontent.com/boguimaurice-dev/catholic-wisdom-hub/arena/7d08cdbe-catholic-wisdom-hub/supabase/functions/_shared/claude.ts
   → **Commit changes**.
2. **Remplacer les 3 fonctions** : pour chacune, ouvrir le fichier → icône ✏️ →
   sélectionner tout (Ctrl+A) → coller le contenu du lien correspondant →
   **Commit changes**.
   - https://raw.githubusercontent.com/boguimaurice-dev/catholic-wisdom-hub/arena/7d08cdbe-catholic-wisdom-hub/supabase/functions/catholic-orchestrator/index.ts
   - https://raw.githubusercontent.com/boguimaurice-dev/catholic-wisdom-hub/arena/7d08cdbe-catholic-wisdom-hub/supabase/functions/chatbot/index.ts
   - https://raw.githubusercontent.com/boguimaurice-dev/catholic-wisdom-hub/arena/7d08cdbe-catholic-wisdom-hub/supabase/functions/liturgy-meditation/index.ts

   Le dossier `_shared` est le motif officiel Supabase : il est empaqueté
   automatiquement avec chaque fonction au déploiement.

---

## Étape 2 — Enregistrer la clé Claude

La clé ne doit **jamais** être dans le code : elle se place dans les secrets
Supabase de la fonction.

**Via le tableau de bord** (le plus simple) :

1. https://supabase.com/dashboard/project/xfbjowupnffoykyhaqoz
2. **Project Settings → Edge Functions → Secrets** (ou *Functions → Secrets*)
3. **Add new secret** :
   - Name : `ANTHROPIC_API_KEY`
   - Value : votre clé `sk-ant-...`
4. Enregistrer.

**Via la ligne de commande** (si vous l'utilisez) :

```sh
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
```

---

## Étape 3 — Redéployer les 3 fonctions

Le code modifié doit être publié pour être actif.

**Via le tableau de bord Supabase :**

1. **Edge Functions** → `catholic-orchestrator` → onglet **Code**
2. Vérifier que le code correspond au nouveau (présence de `../_shared/claude.ts`)
3. Si votre projet est relié à GitHub, utiliser **Deploy / Redeploy**
4. Répéter pour `chatbot` et `liturgy-meditation`

**Via la ligne de commande :**

```sh
supabase link --project-ref xfbjowupnffoykyhaqoz
supabase functions deploy catholic-orchestrator --no-verify-jwt
supabase functions deploy chatbot
supabase functions deploy liturgy-meditation
```

> `--no-verify-jwt` est nécessaire pour l'orchestrateur : il gère lui-même
> l'authentification et les quotas (déjà configuré dans `supabase/config.toml`).

---

## Étape 4 — Vérifier que Claude répond

1. Ouvrir l'application et poser une question dans l'onglet de consultation.
2. Ouvrir la console du navigateur (F12 → onglet **Network**) → cliquer sur
   l'appel `catholic-orchestrator` → onglet **Response**.
3. Chercher le bloc `meta` :

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
| `"providers": ["gemini"]` | Claude a échoué → repli automatique. Voir l'étape 5. |
| `"providers": ["deepseek"]` | Claude a échoué → repli DeepSeek. Voir l'étape 5. |

Les logs de la fonction affichent aussi une ligne
`Consultation servie par : claude`.

---

## Étape 5 — Si Claude n'est pas utilisé

Consulter les logs : **Edge Functions → catholic-orchestrator → Logs**
(ou `supabase functions logs catholic-orchestrator`). Le message exact y figure :

| Message dans les logs | Cause | Correction |
| --- | --- | --- |
| `ANTHROPIC_API_KEY (ou claude_api) n'est pas configurée` | Secret absent | Étape 2 |
| `Claude a refusé l'appel. 401` | Clé invalide / révoquée | Régénérer la clé sur console.anthropic.com |
| `Claude a refusé l'appel. 404` | Modèle inexistant ou retiré | Corriger le secret `CLAUDE_MODEL` |
| `Claude a refusé l'appel. 400` | Requête mal formée | Signaler le message d'erreur complet |
| `429` / `5xx` | Limite ou incident Anthropic | Réessayer ; le repli protège l'application |

---

## Changer de modèle plus tard (sans toucher au code)

Il suffit d'ajouter un secret Supabase, puis de redéployer (ou d'attendre le
prochain déploiement) :

```sh
supabase secrets set CLAUDE_MODEL=claude-sonnet-5-5
```

`claude-sonnet-4-5-20250929` est en fin de vie sur l'API Anthropic (retrait
annoncé au 30 novembre 2026). Le jour venu, ce simple réglage suffit.
