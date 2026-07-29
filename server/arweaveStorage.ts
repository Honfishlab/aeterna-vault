import { createHash } from "node:crypto";

const MAX_DIRECT_BYTES = 10 * 1024 * 1024;

async function client() {
  const { default: Arweave } = await import("arweave");
  return Arweave.init({
    host: process.env.ARWEAVE_HOST || "arweave.net",
    port: Number(process.env.ARWEAVE_PORT || 443),
    protocol: process.env.ARWEAVE_PROTOCOL || "https",
    timeout: 60_000,
    logging: false,
  });
}

function wallet() {
  const value = process.env.ARWEAVE_WALLET_JWK?.trim();
  if (!value) throw new Error("ARWEAVE_WALLET_NOT_CONFIGURED");
  const decoded = value.startsWith("{") ? value : Buffer.from(value,"base64").toString("utf8");
  const parsed = JSON.parse(decoded);
  if (parsed?.kty !== "RSA" || !parsed.n || !parsed.d) throw new Error("ARWEAVE_WALLET_INVALID");
  return parsed;
}

export function arweaveConfigured() {
  return Boolean(process.env.ARWEAVE_WALLET_JWK?.trim());
}

export async function arweaveWalletInfo() {
  if (!arweaveConfigured()) return { configured:false,address:null,balanceAr:null };
  const api=await client();
  const address=await api.wallets.jwkToAddress(wallet());
  const balance=await api.wallets.getBalance(address);
  return { configured:true,address,balanceAr:api.ar.winstonToAr(balance) };
}

export function sha256Hex(data: Uint8Array) {
  return createHash("sha256").update(data).digest("hex");
}

export async function arweavePrice(bytes: number) {
  const api = await client();
  const winston = await api.transactions.getPrice(bytes);
  return { winston: String(winston), ar: api.ar.winstonToAr(String(winston)) };
}

export async function uploadEncryptedArchive(input: { data: Uint8Array; jobId: string; mediaId?: string | null; payloadHash: string; contentType: string }) {
  if (input.data.byteLength > MAX_DIRECT_BYTES) throw new Error("ARWEAVE_DIRECT_UPLOAD_LIMIT");
  if (sha256Hex(input.data) !== input.payloadHash.toLowerCase()) throw new Error("ARCHIVE_HASH_MISMATCH");
  const api = await client();
  const jwk = wallet();
  const transaction = await api.createTransaction({ data: input.data }, jwk);
  const tags: Array<[string,string]> = [
    ["App-Name","Aeterna-Vault"],
    ["App-Version","1"],
    ["Content-Type","application/octet-stream"],
    ["Archive-Job-Id",input.jobId],
    ["Encryption","AES-256-GCM"],
    ["Payload-SHA256",input.payloadHash],
    ["Original-Content-Type",input.contentType.slice(0,100)],
    ["Schema-Version","1"],
  ];
  if (input.mediaId) tags.push(["Media-Id",input.mediaId]);
  for (const [name,value] of tags) transaction.addTag(name,value);
  await api.transactions.sign(transaction,jwk);
  const response = await api.transactions.post(transaction);
  if (![200,202].includes(response.status)) throw new Error("ARWEAVE_POST_" + response.status);
  return { transactionId: transaction.id, rewardWinston: String(transaction.reward), owner: await api.wallets.jwkToAddress(jwk) };
}

export async function uploadArweaveCollectionPage(input: { html: string; collectionId: string; title: string; manifestHash: string; itemCount: number }) {
  const data = new TextEncoder().encode(input.html);
  if (data.byteLength > MAX_DIRECT_BYTES) throw new Error("ARWEAVE_COLLECTION_PAGE_TOO_LARGE");
  const api = await client();
  const jwk = wallet();
  const transaction = await api.createTransaction({ data }, jwk);
  const tags: Array<[string,string]> = [
    ["App-Name","Aeterna-Vault"], ["App-Version","1"], ["Content-Type","text/html; charset=utf-8"],
    ["Type","Aeterna-Archive-Collection"], ["Collection-Id",input.collectionId], ["Manifest-SHA256",input.manifestHash],
    ["Item-Count",String(input.itemCount)], ["Title",input.title.slice(0,100)], ["Schema-Version","1"],
  ];
  for (const [name,value] of tags) transaction.addTag(name,value);
  await api.transactions.sign(transaction,jwk);
  const response = await api.transactions.post(transaction);
  if (![200,202].includes(response.status)) throw new Error("ARWEAVE_COLLECTION_POST_" + response.status);
  return { transactionId:transaction.id,rewardWinston:String(transaction.reward),sizeBytes:data.byteLength };
}

export async function arweaveTransactionStatus(transactionId: string) {
  const api = await client();
  const status = await api.transactions.getStatus(transactionId);
  return { status: status.status, confirmed: status.status === 200 && Boolean(status.confirmed), blockHeight: status.confirmed?.block_height || null, confirmations: status.confirmed?.number_of_confirmations || 0 };
}

export async function verifyArweavePayload(transactionId: string, expectedHash: string) {
  const gateways = [
    process.env.ARWEAVE_GATEWAY_URL || "https://arweave.net",
    process.env.ARWEAVE_SECONDARY_GATEWAY_URL || "https://ardrive.net",
  ].map(value => value.endsWith("/") ? value.slice(0, -1) : value);
  const expected = expectedHash.toLowerCase();
  const results = await Promise.all(gateways.map(async gateway => {
    try {
      const response = await fetch(gateway + "/" + encodeURIComponent(transactionId));
      if (!response.ok) return { gateway, verified:false, status:response.status, hash:null, size:null };
      const data = new Uint8Array(await response.arrayBuffer());
      const hash = sha256Hex(data);
      return { gateway, verified:hash === expected, status:response.status, hash, size:data.byteLength };
    } catch (error:any) {
      return { gateway, verified:false, status:null, hash:null, size:null, error:String(error?.message || "GATEWAY_FETCH_FAILED") };
    }
  }));
  return {
    verified:results.length === 2 && results.every(result => result.verified),
    hash:results.find(result => result.hash)?.hash || null,
    size:results.find(result => result.size !== null)?.size || null,
    gateways:results,
  };
}
