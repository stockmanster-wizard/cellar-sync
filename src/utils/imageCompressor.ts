/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Resizes and compresses a wine label image data URL into a crisp, Firestore-safe JPEG
 * (max 800px longest edge at 0.78 JPEG quality, ~60KB - 100KB).
 * Reduces 12MP–48MP mobile camera photos by ~98%, keeping every bottle document well under
 * Firestore's 1 MiB limit and preventing browser localStorage QuotaExceededError.
 */
export async function compressImageToThumbnail(
  imageSource: string,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.78
): Promise<string> {
  // If it's already a lightweight asset path (e.g. /src/assets/images/...)
  if (imageSource.startsWith('/src/') || imageSource.startsWith('/') || imageSource.startsWith('http')) {
    return imageSource;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let { width, height } = img;

      // Calculate aspect-preserving scale ratio within 800px box
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(imageSource);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      try {
        let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        // Secondary safety guard: ensure payload stays well below Firestore & localStorage limits
        if (compressedDataUrl.length > 220000) {
          compressedDataUrl = canvas.toDataURL('image/jpeg', 0.62);
        }
        resolve(compressedDataUrl);
      } catch (err) {
        console.warn('Canvas export failed, using original:', err);
        resolve(imageSource);
      }
    };

    img.onerror = () => {
      resolve(imageSource);
    };

    img.src = imageSource;
  });
}

export { compressImageForOcr } from './imageCompression';

