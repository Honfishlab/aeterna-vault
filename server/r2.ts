let clientPromise: Promise<any> | null = null;

function r2Env(name: string) {
  return process.env[name]?.trim();
}

export function r2Configured() {
  return Boolean(r2Env("R2_ACCOUNT_ID") && r2Env("R2_BUCKET_NAME") && r2Env("R2_ACCESS_KEY_ID") && r2Env("R2_SECRET_ACCESS_KEY"));
}

export function r2Bucket() {
  const bucket = r2Env("R2_BUCKET_NAME");
  if (!bucket) throw new Error("R2_NOT_CONFIGURED");
  return bucket;
}

export async function r2Modules() {
  if (!r2Configured()) throw new Error("R2_NOT_CONFIGURED");
  const clientPackage = "@aws-sdk/client-s3";
  const storagePackage = "@aws-sdk/lib-storage";
  const presignerPackage = "@aws-sdk/s3-request-presigner";
  const [{ S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, ListMultipartUploadsCommand, AbortMultipartUploadCommand }, { getSignedUrl }, { Upload }] = await Promise.all([import(/* @vite-ignore */ clientPackage), import(/* @vite-ignore */ presignerPackage), import(/* @vite-ignore */ storagePackage)]);
  if (!clientPromise) clientPromise = Promise.resolve(new S3Client({
    region: "auto",
    endpoint: "https://" + r2Env("R2_ACCOUNT_ID") + ".r2.cloudflarestorage.com",
    credentials: {
      accessKeyId: r2Env("R2_ACCESS_KEY_ID")!,
      secretAccessKey: r2Env("R2_SECRET_ACCESS_KEY")!,
    },
  }));
  return { client: await clientPromise, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand, ListMultipartUploadsCommand, AbortMultipartUploadCommand, getSignedUrl, Upload };
}

export function safeObjectName(name: string) {
  return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "media";
}

export function mediaTypeAllowed(type: string) {
  return /^(image\/(jpeg|png|webp|gif|avif)|video\/(mp4|webm|quicktime)|audio\/(mpeg|mp4|webm|wav)|application\/pdf)$/.test(type);
}
