# Aeterna Vault

Aeterna Vault is a standalone Vinext/React application with a PostgreSQL-backed account and vault API. Browser IndexedDB remains available as an offline fallback.

## Local setup

1. Run `npm install`.
2. Copy `.env.example` to `.env.local` and set `DATABASE_URL`.
3. Run `npm run db:migrate`.
4. Run `npm run dev`.

## Authentication and storage

Email registration uses PBKDF2-SHA-256 password hashes with per-user salts. Login sessions use random opaque tokens stored only as SHA-256 hashes in PostgreSQL and sent in secure, HTTP-only, same-site cookies. Each authenticated user has an isolated vault snapshot. Server writes require a same-origin request.

The Web3, JWK, and heir-access panels are prototype integrations and must not be treated as authenticated accounts until their signature/token verification endpoints are implemented.

## Production

Set `DATABASE_URL` in the deployment environment and run `npm run db:migrate` against that database before enabling registration. `GEMINI_API_KEY` is optional; the core vault does not require AI Studio or Gemini.
