# RepoSense

RepoSense is a responsive React + Vite frontend for exploring public GitHub repositories. The API services are isolated behind a mock switch, so the interface can be connected to the planned backend without changing page components.

## Run locally

```bash
npm install
Copy-Item .env.example .env
npm run dev
```

Set `VITE_USE_MOCK=false` and configure `VITE_API_URL` to connect to the API. Never put API keys or secrets in this frontend.

## Create from scratch

```bash
npm create vite@latest reposense -- --template react
cd reposense
npm install
npm install axios react-router-dom recharts lucide-react react-hot-toast react-markdown remark-gfm react-syntax-highlighter
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Tailwind is configured in `tailwind.config.js` with `darkMode: "class"`; the app adds the `dark` class from persisted theme state.

## Routes

Public: `/`, `/login`, `/register`. Workspace: `/dashboard`, `/analyze`, `/analysis/:id` (and `/stack`, `/insights`, `/readme` tabs), `/history`, `/profile`.

All AI-generated content is advisory. Only public repositories are supported in the MVP.

The Health tab includes a client-side heuristic security and secrets scan. It never executes repository code, masks detected credential values, and stores only the masked scan report. The scan is not a full security audit; verify findings and rotate any credentials that may have been exposed.
