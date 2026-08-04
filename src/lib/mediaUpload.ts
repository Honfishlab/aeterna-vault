export interface StoredMedia {
  mediaId: string;
  mediaUrl: string;
}

export async function uploadMediaFile(file: File, onProgress?: (percent: number) => void, albumName?: string): Promise<StoredMedia | null> {
  const authorization = await fetch("/api/media/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, contentType: file.type, size: file.size, albumName }),
  });
  const authorized = await authorization.json();
  if (authorization.status === 503 && authorized.code === "R2_NOT_CONFIGURED") return null;
  if (!authorization.ok) throw new Error(authorized.error || "Unable to authorize media upload.");

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", authorized.uploadUrl);
    request.setRequestHeader("Content-Type", file.type);
    request.upload.onprogress = event => { if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100)); };
    request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error("Cloudflare R2 rejected the upload."));
    request.onerror = () => reject(new Error("The media upload was interrupted."));
    request.send(file);
  });

  const completion = await fetch("/api/media/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mediaId: authorized.mediaId }),
  });
  const completed = await completion.json();
  if (!completion.ok) throw new Error(completed.error || "Unable to verify media upload.");
  onProgress?.(100);
  return { mediaId: completed.mediaId, mediaUrl: completed.mediaUrl };
}
