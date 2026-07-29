import { execute, query } from "./db";
import { arweaveConfigured, arweaveTransactionStatus, uploadEncryptedArchive, verifyArweavePayload } from "./arweaveStorage";
import { r2Bucket, r2Modules } from "./r2";
import { deadLetter, heartbeat, notifyUser } from "./notifications";

let busy = false;

export function startArweaveWorker() {
  if (busy) return { accepted:false,busy:true };
  busy=true;
  void processNextArweaveJob().catch(error=>console.error("Arweave worker failed",error)).finally(()=>{busy=false;});
  return { accepted:true,busy:false };
}

export async function processNextArweaveJob() {
  await heartbeat("arweave-worker",{configured:arweaveConfigured()});
  if (!arweaveConfigured()) return { configured:false };

  const submitted = await query<any>("SELECT * FROM arweave_storage_jobs WHERE status=$$submitted$$ AND next_attempt_at<=NOW() ORDER BY submitted_at LIMIT 1");
  if (submitted[0]) {
    const job=submitted[0];
    const status=await arweaveTransactionStatus(job.transaction_id);
    if (status.confirmed) {
      const verification=await verifyArweavePayload(job.transaction_id,job.payload_sha256);
      if (!verification.verified) throw new Error("ARWEAVE_CONFIRMATION_HASH_MISMATCH");
      await execute("UPDATE arweave_storage_jobs SET status=$$confirmed$$,block_height=$1,confirmations=$2,confirmed_at=NOW(),updated_at=NOW(),error_message=NULL WHERE id=$3",[status.blockHeight,status.confirmations,job.id]);
      await notifyUser(job.user_id,"success","Permanent archive confirmed",job.original_name+" is confirmed on Arweave.",{actionView:"audit",entityType:"arweave_storage_job",entityId:job.id});
      return {id:job.id,status:"confirmed"};
    }
    await execute("UPDATE arweave_storage_jobs SET confirmations=$1,next_attempt_at=NOW()+INTERVAL $$1 minute$$,updated_at=NOW() WHERE id=$2",[status.confirmations,job.id]);
    return {id:job.id,status:"submitted"};
  }

  const rows=await query<any>("UPDATE arweave_storage_jobs SET status=$$uploading$$,attempts=attempts+1,updated_at=NOW() WHERE id=(SELECT id FROM arweave_storage_jobs WHERE status=$$queued$$ AND attempts<3 AND next_attempt_at<=NOW() ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *");
  const job=rows[0];
  if(!job)return null;
  try {
    const {client,GetObjectCommand}=await r2Modules();
    const object=await client.send(new GetObjectCommand({Bucket:r2Bucket(),Key:job.r2_object_key}));
    const data=new Uint8Array(await object.Body.transformToByteArray());
    const result=await uploadEncryptedArchive({data,jobId:job.id,mediaId:job.media_object_id,payloadHash:job.payload_sha256,contentType:job.original_content_type});
    await execute("UPDATE arweave_storage_jobs SET status=$$submitted$$,transaction_id=$1,reward_winston=$2,submitted_at=NOW(),next_attempt_at=NOW()+INTERVAL $$1 minute$$,updated_at=NOW(),error_message=NULL WHERE id=$3",[result.transactionId,result.rewardWinston,job.id]);
    await notifyUser(job.user_id,"info","Permanent archive submitted",job.original_name+" was submitted to Arweave and is awaiting confirmation.",{actionView:"audit",entityType:"arweave_storage_job",entityId:job.id});
    return {id:job.id,status:"submitted",transactionId:result.transactionId};
  } catch(error:any) {
    const retry=Number(job.attempts||0)<3;
    const message=String(error?.message||"ARWEAVE_UPLOAD_FAILED").slice(0,500);
    await execute("UPDATE arweave_storage_jobs SET status=$1,error_message=$2,next_attempt_at=NOW()+($3*INTERVAL $$1 second$$),updated_at=NOW() WHERE id=$4",[retry?"queued":"failed",message,Math.min(600,30*2**Number(job.attempts||0)),job.id]);
    if(!retry){await deadLetter("arweave",job.id,job.user_id,message,{name:job.original_name});await notifyUser(job.user_id,"error","Permanent archive failed",job.original_name+": "+message,{actionView:"audit",entityType:"arweave_storage_job",entityId:job.id});}
    return {id:job.id,status:retry?"queued":"failed"};
  }
}
