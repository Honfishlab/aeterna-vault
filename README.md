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


### Video import pipeline

Google Photos and Google Drive videos are imported by the background worker rather than through the browser:

1. The selected provider item creates a PostgreSQL import job.
2. The worker downloads the original through the provider's authenticated API.
3. Large files are uploaded to private R2 in 8 MB multipart chunks.
4. Each confirmed R2 part, byte offset, and ETag is checkpointed in PostgreSQL.
5. Interrupted jobs resume from the last confirmed byte when the provider supports HTTP range requests.
6. The worker stores a separate video poster image in R2 and records available source metadata.
7. The app serves both the video and poster through authenticated `/api/media/...` endpoints.

Imports support files up to 5 GB. The progress panel shows transferred bytes, estimated time remaining, cancellation, retry, and the saved resume position. Completed entries retain original size, width, height, duration, capture time, and source provider when supplied by Google.

The `006_video_metadata_and_resumable_imports` migration adds the metadata, thumbnail, and multipart-checkpoint columns. Render applies it through the existing `npm run db:migrate` pre-deploy command. Multipart checkpoints and pending media are retained for 24 hours so deployments and temporary provider failures can recover.

### Deployment verification

After a Render deployment:

1. Confirm the pre-deploy log reports `Applied 006_video_metadata_and_resumable_imports` or that it is already applied.
2. Confirm both the web service and `aeterna-vault-import-worker` are live.
3. Import a Google Photos video larger than 8 MB and verify byte progress advances.
4. Open the resulting album card and confirm its stored poster appears.
5. Open the full-screen viewer and confirm playback, seeking, and range requests work.

Videos imported before migration `006` remain playable. Re-selecting an older Google video can backfill its stored poster and source metadata without duplicating the R2 original.
