# Incident response

1. **Identify:** confirm health endpoint, worker heartbeats, queue depth, dead letters, Render events, PostgreSQL metrics, and R2 availability.
2. **Contain:** pause imports for provider incidents, rotate compromised credentials, revoke affected sessions, and preserve logs.
3. **Recover:** deploy the last known-good commit or restore into an isolated environment before changing production data.
4. **Verify:** test login, upload, import, image display, video processing, deletion, restore, notifications, and export.
5. **Communicate:** record affected users, start/end time, data impact, remediation, and follow-up owner.
6. **Review:** publish an internal post-incident report and add a regression test.

Never permanently purge media during diagnosis. Preserve `audit_events`, `dead_letter_jobs`, provider logs, Render deploy logs, and relevant request identifiers.

