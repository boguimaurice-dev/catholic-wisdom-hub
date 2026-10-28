# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
## Moteur IA : Claude (Anthropic) en priorité

Les Edge Functions qui produisent du texte (`catholic-orchestrator`, `chatbot`,
`liturgy-meditation`) intègrent chacune le même bloc client Claude (identique dans les
trois fichiers : toute correction doit être reportée ailleurs). Elles restent
**autonomes, en un seul fichier**, afin de pouvoir être déployées depuis l'éditeur web
de Supabase, qui ne gère qu'un fichier par fonction (le dossier `_shared` n'y est pas
visible et les fichiers ajoutés sont écrasés au déploiement).

**Claude est le moteur principal**, avec repli automatique si Anthropic est indisponible :

| Ordre | Fournisseur | Fonctions concernées | Secret requis |
| --- | --- | --- | --- |
| 1 (principal) | **Claude — Anthropic** (`claude-sonnet-4-5-20250929`) | toutes | `ANTHROPIC_API_KEY` (ou `claude_api`) |
| 2 (secours) | DeepSeek | `catholic-orchestrator` | `DEEPSEEK_API_KEY` (ou `deeseek_api_key`) |
| 3 (dernier recours) | Lovable AI Gateway (Gemini) | toutes | `LOVABLE_API_KEY` |

Si Claude répond, aucun autre fournisseur n'est appelé. En cas d'erreur transitoire
(408, 429, 5xx), l'appel Claude est retenté une fois avant de passer au secours.
Les erreurs définitives (401 clé invalide, 404 modèle inexistant, 400 requête
invalide) ne sont pas retentées : le repli s'applique immédiatement, l'application
reste donc disponible.

### Mise en forme des messages (important)

L'API Anthropic est stricte : elle rejette en 400 les conversations qui ne commencent
pas par un message `user` et les rôles qui ne s'alternent pas. `normalizeClaudeMessages()`
applique donc systématiquement : consignes système concaténées en un seul `system`,
contenus vides supprimés, messages consécutifs de même rôle fusionnés, premier
message forcé en `user`, historique borné à 40 messages (puis re-nettoyé).

### Vérifier que Claude répond vraiment

La réponse de `catholic-orchestrator` contient un bloc `meta` :

```json
"meta": {
  "providers": ["claude"],
  "primaryProvider": "claude",
  "claudeActive": true,
  "claudeModel": "claude-sonnet-4-5-20250929"
}
```

- `claudeActive: true` → la réponse a bien été générée par Claude.
- `providers: ["gemini"]` → Claude a échoué et le secours a pris le relais :
  consulter les logs de la fonction (`supabase functions logs catholic-orchestrator`),
  la cause exacte y est écrite (`Claude a refusé l'appel`, `ANTHROPIC_API_KEY … n'est pas configurée`).

Les logs de la fonction affichent aussi `Consultation servie par : claude`.

### Secrets à configurer

```sh
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
# optionnel : changer de modèle sans toucher au code
supabase secrets set CLAUDE_MODEL=claude-sonnet-4-5-20250929
# optionnel : modèle (plus rapide/économique) utilisé pour le routage des experts
supabase secrets set CLAUDE_ROUTER_MODEL=claude-haiku-4-5-20251001
```

### Déploiement des fonctions

Chaque fonction étant un fichier unique, elle se déploie aussi bien par la ligne de
commande que par l'éditeur web du tableau de bord Supabase.

```sh
supabase functions deploy catholic-orchestrator --no-verify-jwt
supabase functions deploy chatbot
supabase functions deploy liturgy-meditation
```

> `claude-sonnet-4-5-20250929` est annoncé en fin de vie sur l'API Anthropic
> (retrait prévu le 30 novembre 2026). Le jour venu, il suffit de modifier le secret
> `CLAUDE_MODEL` (par exemple `CLAUDE_MODEL=claude-sonnet-5-5`) : aucun changement de
> code ni redéploiement n'est nécessaire.
