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
| 1 (principal) | **Claude — Anthropic** (`claude-3-5-sonnet-20241022`) | toutes | `ANTHROPIC_API_KEY` (ou `CLAUDE_API_KEY`, `claude_api`) |
| 2 (secours) | DeepSeek | toutes les fonctions IA | `DEEPSEEK_API_KEY` (ou `deepseek_api_key`, `DEESEEK_API_KEY`, `deeseek_api_key`) |
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
  "claudeModel": "claude-3-5-sonnet-20241022"
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
supabase secrets set CLAUDE_API_KEY=sk-ant-...
supabase secrets set CLAUDE_MODEL=claude-3-5-sonnet-20241022
supabase secrets set CLAUDE_ROUTER_MODEL=claude-3-5-haiku-20241022
supabase secrets set DEEPSEEK_API_KEY=sk-...
```

### Déploiement des fonctions

Chaque fonction étant un fichier unique, elle se déploie aussi bien par la ligne de
commande que par l'éditeur web du tableau de bord Supabase.

```sh
supabase functions deploy catholic-orchestrator --no-verify-jwt
supabase functions deploy chatbot
supabase functions deploy liturgy-meditation
```

---

## 🔐 Coffre — gestionnaire de mots de passe, clés API & notes (PWA)

Le dossier [`safevault/`](./safevault) contient **Coffre**, une application **autonome** de gestion de
secrets : mots de passe, clés API et notes confidentielles, chiffrés localement (AES-256-GCM +
PBKDF2-SHA256 600 000 itérations, zéro connaissance), installable sur mobile et ordinateur.

- Application : `safevault/` (Vite + React + TypeScript, sans backend ni dépendance réseau)
- Guide complet, sécurité et déploiement : [`safevault/README.md`](./safevault/README.md)
- Déploiement Vercel : importer ce dépôt avec **Root Directory = `safevault`**

```sh
cd safevault
npm install
npm run dev     # http://localhost:5173
npm test
npm run build
```
