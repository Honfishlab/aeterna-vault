# Arweave permanent-storage integration

## Architecture

R2 remains the private operational store for originals, thumbnails, playback variants, recovery, and staging. The permanent-storage path creates a separate AES-256-GCM ciphertext in the browser. Only that ciphertext is staged and submitted to Arweave.

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

This proof deliberately limits encrypted payloads to 10 MB. Larger media must use a reviewed bundling/manifest adapter in a later phase. Do not raise the limit or route video originals through JSON request bodies.

## Transaction tags

Only concise technical tags are published: application and schema version, archive job ID, optional opaque media ID, encryption algorithm, ciphertext SHA-256, and original MIME type.

## Recovery

The user must retain the archival passphrase. The database stores salt, IV, KDF algorithm, and iteration count, but never the passphrase or derived encryption key. Losing the passphrase makes the permanent ciphertext unrecoverable.

