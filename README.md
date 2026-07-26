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
## Cloudflare R2 media storage

Create a private R2 bucket named `aeterna-vault-media`, then create an Object Read & Write R2 API token scoped only to that bucket. Add `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, and `R2_SECRET_ACCESS_KEY` to the Render web service environment.

In the bucket Settings page, add the CORS policy from `r2-cors.json`. Keep public bucket access disabled. The app issues ten-minute presigned PUT URLs, verifies each uploaded object, and serves media only through authenticated same-origin endpoints.

After adding the variables, run a Render Blueprint sync or manual deploy. The pre-deploy migration creates the `media_objects` ownership table.

## Google Drive media import

Create a Google Cloud OAuth 2.0 Web application and enable the Google Drive API. Add this production redirect URI:

`https://aeterna-vault-zawj.onrender.com/api/integrations/google/callback`

Configure these Render environment variables:

- `APP_BASE_URL=https://aeterna-vault-zawj.onrender.com`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MEDIA_PROVIDER_TOKEN_KEY` — a private random value of at least 32 characters

The integration requests read-only Drive access. OAuth tokens are AES-GCM encrypted in PostgreSQL, selected images and videos are copied server-side into private R2 storage, and repeated imports reuse the existing vault object.

## Background imports and Google Photos

Enable the Google Photos Picker API in the same Google Cloud project and add `https://www.googleapis.com/auth/photospicker.mediaitems.readonly` to the consent screen Data Access scopes. Existing users must disconnect and reconnect Google once to grant this additional scope.

Set the same private `IMPORT_WORKER_SECRET` value on both the `aeterna-vault` web service and `aeterna-vault-import-worker`. The worker claims PostgreSQL jobs, streams provider downloads into multipart R2 uploads, reports byte progress, and retries failures up to three times.
