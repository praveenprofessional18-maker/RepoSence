# RepoSense

AI-powered GitHub repository analyzer.

## Stack
- Frontend: React, Vite, Tailwind CSS, React Router, Axios, Recharts, Lucide
- Backend: Node.js, Express, Mongoose
- Integrations: GitHub REST API, Google Gemini API
- Database: MongoDB

## Prerequisites
- Node.js 20+
- MongoDB connection string
- GitHub token (optional for public repositories; useful for higher API limits)
- Gemini API key

## Setup

### Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Configure `VITE_API_URL=http://localhost:5000/api` in `frontend/.env`.

## Current scaffold
This initial scaffold establishes the frontend, backend, theme switching, health endpoint and documentation. Repository analysis and AI endpoints are added in subsequent implementation phases.
