/**
 * Helper to compress large uploaded image files before converting to data URL.
 * Resizes images down to max 1920px dimension and converts to JPEG at 0.85 quality.
 * Reduces 15MB raw camera photos to ~300KB data URLs for lightning performance.
 */
export function compressImageFile(file: File, maxDimension = 1920, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    // If file is not an image or is already small (< 250KB), read directly
    if (!file.type.startsWith('image/')) {
      resolve(URL.createObjectURL(file));
      return;
    }

    if (file.size < 250 * 1024) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string || '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const srcDataUrl = event.target?.result as string;
      if (!srcDataUrl) {
        resolve('');
        return;
      }

      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(srcDataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.onerror = () => {
        resolve(srcDataUrl);
      };

      img.src = srcDataUrl;
    };

    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}
