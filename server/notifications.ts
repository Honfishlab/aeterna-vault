import { execute } from "./db";

export async function notifyUser(userId: string, type: "error"|"warning"|"success"|"info", title: string, message: string, options: { actionView?: string; entityType?: string; entityId?: string } = {}) {
  await execute("INSERT INTO user_notifications(id,user_id,type,title,message,action_view,entity_type,entity_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)", [crypto.randomUUID(),userId,type,title.slice(0,160),message.slice(0,1000),options.actionView||null,options.entityType||null,options.entityId||null]);
}

export async function heartbeat(workerName: string, details: Record<string,unknown> = {}) {
  await execute("INSERT INTO worker_heartbeats(worker_name,status,details) VALUES($1,$$healthy$$,$2::jsonb) ON CONFLICT(worker_name) DO UPDATE SET status=$$healthy$$,details=EXCLUDED.details,last_seen_at=NOW()", [workerName,JSON.stringify(details)]);
}

export async function deadLetter(queueName: string, sourceJobId: string, userId: string | null, error: string, payload: unknown = {}) {
  await execute("INSERT INTO dead_letter_jobs(id,user_id,queue_name,source_job_id,error_message,payload) VALUES($1,$2,$3,$4,$5,$6::jsonb) ON CONFLICT(queue_name,source_job_id) DO UPDATE SET error_message=EXCLUDED.error_message,payload=EXCLUDED.payload,resolved_at=NULL", [crypto.randomUUID(),userId,queueName,sourceJobId,error.slice(0,1000),JSON.stringify(payload)]);
}
