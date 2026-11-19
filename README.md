# RepoSense

AI-powered GitHub repository analyzer.

## Overview

RepoSense helps developers analyze GitHub repositories and understand their project structure, technologies, development activity, and insights using AI.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, React Router, Axios, Recharts, Lucide
- **Backend:** Node.js, Express, Mongoose
- **Integrations:** GitHub REST API, Google Gemini API
- **Database:** MongoDB

## Frontend Pages

- Home Page
- Dashboard
- Login Page
- Register Page
- Repository Analysis Page
- Repository Explorer Page
- Repository History Page
- Repository Insights Page
- Technologies Page

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

Configure the API URL in `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

## Features

- GitHub repository analysis interface
- Repository exploration
- Repository history
- Repository insights
- Technology overview
- User login and registration interfaces
- Theme switching

## Development Status

The project includes the frontend pages, backend scaffold, theme switching, health endpoint, and documentation. Repository analysis and AI endpoints are being developed in subsequent implementation phases.

## License

See the repository for license information.

## Frontend Pages

RepoSense includes the following frontend pages:

- Home
- Dashboard
- Login and Registration
- Repository Analysis
- Repository Explorer
- Repository History
- Repository Insights
- Technologies