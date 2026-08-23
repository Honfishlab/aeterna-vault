# Arweave permanent-storage integration

## Architecture

R2 remains the private operational store for viewing copies, thumbnails, playback variants, recovery, and staging. For local uploads, the permanent-storage path now creates and queues an AES-256-GCM ciphertext before the secondary operational copy is uploaded. Only ciphertext is placed in the archive staging prefix or submitted to Arweave.

The initial mainnet path uses an application-funded service wallet. Confirmed payloads must match through both `ARWEAVE_GATEWAY_URL` (default `https://arweave.net`) and `ARWEAVE_SECONDARY_GATEWAY_URL` (default `https://ardrive.net`). User JWK files are never uploaded or stored. `ARWEAVE_WALLET_JWK` must contain the service JWK JSON or its base64 encoding and must exist only in Render secret storage.

## Activation

1. Create a dedicated, low-balance Arweave service wallet and back it up offline.
2. Fund it only with the amount required for the proof.
3. Add `ARWEAVE_WALLET_JWK` to the **web service** in Render.
4. Give `aeterna-vault-arweave-worker` the same `IMPORT_WORKER_SECRET` as the web service.
5. Deploy and confirm `/api/health` reports a fresh `arweave-worker` heartbeat.
6. In Account Management, select an image under 1 MB, enter a unique 12+ character archival passphrase, and queue it.
7. Wait for `confirmed`, then use **Verify & decrypt**. The app downloads the ciphertext from the gateway, verifies SHA-256, decrypts it locally, and downloads the recovered original.

Never use a production family file for the first transaction. Arweave data is permanent. Never put names, emails, locations, stories, raw encryption keys, passphrases, or private wallet material in public transaction tags.

## Direct-upload boundary

Encrypted payloads up to 100 MB use the Arweave SDK chunk uploader. Ciphertext moves from the browser to a signed R2 staging URL and then through the archive worker; media bytes never travel in JSON request bodies. Once `/api/arweave/archive/complete` returns a receipt, submission, retry, and confirmation no longer depend on the browser remaining open. `/api/arweave/archive/link` subsequently associates the permanent handoff with the secondary private viewing copy.

Every queued job exposes an authenticated JSON receipt at `/api/arweave/archive/receipt/:jobId`. The receipt contains the immutable ciphertext SHA-256, byte size, encryption algorithm, job identifier, current state, and—after submission—the Arweave transaction and gateway reference. If viewing-copy setup is interrupted after permanent handoff, the browser retains only this non-secret receipt reference for recovery.

## Transaction tags

Only concise technical tags are published: application and schema version, archive job ID, optional opaque media ID, encryption algorithm, ciphertext SHA-256, and original MIME type.

## Recovery

The user must retain the archival passphrase. The database stores salt, IV, KDF algorithm, and iteration count, but never the passphrase or derived encryption key. Losing the passphrase makes the permanent ciphertext unrecoverable.



## Normal media uploads

The upload form requires the unlocked permanent-vault passphrase. Every accepted local or imported file is first preserved as an operational original in private R2, encrypted in the browser, and linked to an Arweave job before the save is reported as complete. The viewer reads the latest job from PostgreSQL and displays `queued`, `uploading`, `submitted`, `confirmed`, or `failed`; `r2_only` remains only for uploads created before automatic archiving. It never constructs or displays a transaction ID unless the worker has returned one from an accepted Arweave submission.


## Immortal Gateway console

The Immortal Gateway view is an authenticated projection of `arweave_storage_jobs`; it contains no generated transactions or demo block data. Gateway links, local decryption, recovered-file downloads, and proof-manifest downloads remain disabled until the selected submitted transaction passes the server dual-gateway ciphertext hash check.


## Arweave-hosted collection viewer

A vault owner can publish a standalone collection viewer from the Immortal Gateway after at least one archive is confirmed. Publication creates a new `text/html` Arweave transaction and records it in `arweave_collection_viewers`. The page embeds a manifest containing only confirmed archive transaction IDs, ciphertext hashes, MIME types, sizes, filenames, and public encryption parameters. It never references R2 or an Aeterna API. Each item is fetched from Arweave, SHA-256 verified, and decrypted with Web Crypto in the visitor browser. Collection publication is permanent and requires explicit acknowledgement that filenames and transaction metadata become public.
