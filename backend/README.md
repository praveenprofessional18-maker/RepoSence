# RepoSense API

Node.js 20+ ES-module API for RepoSense. It provides JWT authentication, public GitHub repository analysis, Gemini-powered assistance, and owner-scoped analysis history.

## Setup

1. From this directory, install dependencies with `npm install`.
2. Copy `.env.example` to `.env` and set `MONGODB_URI`, `JWT_SECRET` (at least 32 characters), and `GEMINI_API_KEY`. `GITHUB_TOKEN` is optional and raises GitHub API rate limits.
3. Ensure MongoDB is available at the configured URI.
4. Run `npm run dev` for development or `npm start` for production.

The server validates its environment before startup and exits without printing credential values if required configuration is missing. Do not commit `.env`; `.env.example` contains variable names only.

Default address: `http://localhost:5000`. The frontend should use `VITE_API_URL=http://localhost:5000` and `VITE_USE_MOCK=false`. The allowed browser origin defaults to `http://localhost:5173`.

## Response conventions

Health and GitHub/history endpoints generally respond with `{ "success": true, "data": ... }`. Auth endpoints return `{ "user": ..., "token": ... }`. AI endpoints return task-specific data (`explanation`, `summary`, `answer`, or generated Markdown). Errors use `{ "success": false, "message": "...", "errors": [...]? }`.

## Endpoints

### Health

- `GET /api/health`

### Authentication

- `POST /api/auth/register` — `{ "name": "...", "email": "...", "password": "..." }`
- `POST /api/auth/login` — `{ "email": "...", "password": "..." }`
- `GET /api/auth/me` — requires `Authorization: Bearer <JWT>`

### GitHub repositories

- `POST /api/github/analyze` — `{ "url": "https://github.com/owner/repo", "branch": "optional" }`; stores a history record when authenticated.
- `GET /api/github/metadata/:owner/:repo`
- `GET /api/github/tree/:owner/:repo?branch=main`
- `GET /api/github/languages/:owner/:repo`
- `GET /api/github/file?owner=:owner&repo=:repo&path=src/index.js`

Only public GitHub repositories are supported. File responses are text-only and capped at 200 KB.

### Gemini AI

- `POST /api/ai/explain`
- `POST /api/ai/code-quality`
- `POST /api/ai/readme`
- `POST /api/ai/summary`
- `POST /api/ai/chat`
- `POST /api/ai/compare` (also available at `/api/ai/compare-summary`)
- `POST /api/ai/document`
- `POST /api/ai/fix`

AI requests are rate limited. Repository/code content is treated as untrusted input and common credential formats are redacted before sending it to Gemini. The service does not execute repository code.

### History (authenticated)

- `GET /api/history?search=repo&bookmarked=true&sort=newest&page=1&limit=20`
- `GET /api/history/:id`
- `PATCH /api/history/:id/bookmark` — `{ "bookmarked": true }`
- `DELETE /api/history/:id` — deletes only the authenticated user's record and associated chat messages.
- `GET /api/history/activity`

Sort options: `newest`, `oldest`, `name`, and `stars`. Page size is limited to 100. Users can access or delete only their own history.

## Security notes

- Passwords are hashed with bcrypt; JWT secrets must be at least 32 characters.
- Helmet, configured CORS, JSON body limits, and API/auth/AI rate limits are enabled.
- Credentials must be supplied through local environment variables, never source code or request examples.
- GitHub credentials, when configured, are sent only by the server to `api.github.com`.
