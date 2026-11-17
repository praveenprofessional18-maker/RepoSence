# RepoSense Blueprint

## Product
RepoSense is an AI-powered GitHub repository analyzer for developers and engineering students.

## Screens
1. Landing
2. Login
3. Register
4. Dashboard
5. Repository Analyzer
6. Structure Explorer
7. Technology Stack
8. AI Insights
9. README Generator
10. Analysis History

The product includes nine main product/workspace areas plus the two authentication screens; the route inventory above lists every distinct screen.

## Design
- Dark and light themes
- Inter UI font; JetBrains Mono for code
- Navy/white surfaces with blue primary and violet AI accents
- Responsive sidebar and topbar
- Shared design tokens and reusable components

## Stack
React + Vite, Tailwind CSS, React Router, Axios, Recharts, Lucide React, Node.js, Express, Mongoose, MongoDB, GitHub REST API and Gemini API.

## Core workflow
User submits a GitHub URL -> backend validates it -> GitHub API fetches metadata/tree/languages -> analysis services prepare bounded context -> Gemini generates explanations/documentation -> MongoDB stores the result -> frontend renders reports.

## Safety and reliability
- Never execute repository code.
- Keep API credentials on the backend.
- Limit file count, file size, request rate and AI context.
- Treat repository content as untrusted data, not instructions.
- Validate all inputs and model outputs.
- Handle private repositories only with explicitly authorized credentials.
