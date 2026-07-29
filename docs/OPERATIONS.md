# Production operations

## Monitoring

- Render health check: `GET /api/health`
- Authenticated queue detail: `GET /api/operations/health`
- Healthy workers update `worker_heartbeats` at least once every two minutes.
- Alert when either worker heartbeat is older than two minutes, dead-letter count is non-zero, or a queue grows continuously for 15 minutes.
- The scheduled GitHub smoke test verifies the public endpoint every 15 minutes. Configure a separate external uptime monitor for independent coverage.

## Backups and recovery

1. Enable Render PostgreSQL point-in-time recovery and record the retention period.
2. Enable Cloudflare R2 object versioning or cross-bucket replication.
3. Quarterly, restore PostgreSQL into an isolated database and verify users, vault snapshots, import jobs, notifications, and audit events.
4. Restore representative image, video source, playback variant, and thumbnail objects from R2.
5. Run the application against the isolated restore, sign in with a test account, and verify album browsing and playback.
6. Record recovery-point and recovery-time results in the incident log.

The application recycle bin is not a backup. Its scheduled 30-day purge must remain independent from provider backup retention.

## Queue operations

- Failed jobs after three attempts are copied into `dead_letter_jobs`.
- Stalled imports are requeued after ten minutes.
- Stalled video processing is requeued after sixty minutes.
- Completed/cancelled import history is retained for 90 days.
- User notifications are retained for 180 days.
- Resolve a dead letter only after the source job has been retried successfully or intentionally abandoned.

## Secrets

Rotate database, R2, OAuth, provider-token encryption, worker, session, and email credentials following exposure or staff access changes. Update web and worker services together so shared worker secrets never diverge.

