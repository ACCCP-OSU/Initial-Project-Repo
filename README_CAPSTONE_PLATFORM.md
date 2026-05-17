# Capstone MVP: SSO Self-Service DOCX to Canvas HTML Platform

This implementation adds a full web platform alongside the original local scripts:

- `Next.js` app (frontend + backend API)
- `SAML SSO` authentication flow
- Async DOCX conversion worker with OpenAI
- Downloadable HTML and review JSON artifacts
- Uploader-only job access
- Read-only admin metrics
- 30-day retention cleanup script

## Architecture

### Web App
- `app/` contains App Router pages and API handlers.
- Users sign in at `/login`, upload DOCX on `/dashboard`, then review job details at `/jobs/{jobId}`.

### API Endpoints
- `POST /api/jobs` upload and queue conversion job.
- `GET /api/jobs` list current user jobs.
- `GET /api/jobs/{jobId}` job detail and warnings.
- `GET /api/jobs/{jobId}/artifacts/html` download HTML.
- `GET /api/jobs/{jobId}/artifacts/review` download review JSON.
- `GET /api/admin/metrics` admin-only aggregate metrics.

### Data Model
SQLite tables are auto-created in `lib/db.ts`:
- `users`
- `sessions`
- `jobs`
- `job_artifacts`
- `job_events`
- `admin_roles`

### Worker + Retention
- `npm run worker` claims queued jobs and processes them.
- `npm run retention` expires old jobs/artifacts and clears expired sessions.

## Local Setup

1. Install Node.js 20+.
2. Install dependencies:
   ```powershell
   npm install
   ```
3. Configure environment:
   ```powershell
   Copy-Item .env.example .env
   ```
4. Fill required vars in `.env`:
   - `OPENAI_API_KEY`
   - `SAML_*` settings for your institution IdP
5. Run app and worker in separate terminals:
   ```powershell
   npm run dev
   npm run worker
   ```

## SAML Notes

- ACS endpoint is `POST /api/auth/saml/callback`.
- Assertion must include:
  - Stable user identifier (`SAML_ATTRIBUTE_UID`)
  - Email (`SAML_ATTRIBUTE_EMAIL`)
- Admin users are controlled by `ADMIN_EMAILS`.

## User Review Responsibility

The platform always emits a warning panel and review JSON, but does not block downloads. Users are responsible for final accessibility/content review before publishing to Canvas.
