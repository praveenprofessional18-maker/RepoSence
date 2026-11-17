# API Specification

## Authentication
- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

## Repository
- POST /api/repository/analyze
- GET /api/repository/:owner/:repo
- GET /api/repository/:owner/:repo/tree
- GET /api/repository/:owner/:repo/languages
- GET /api/repository/:owner/:repo/file?path=...

## AI
- POST /api/ai/explain
- POST /api/ai/code-quality
- POST /api/ai/readme

## History
- GET /api/history
- GET /api/history/:id
- DELETE /api/history/:id

Private routes must enforce authentication and ownership checks. Add validation, rate limiting, request-size limits and centralized error handling.
