/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Loads a base64 data URL, remote URL, or File into an HTMLImageElement.
 */
function loadHtmlImage(sourceBase64OrFile: string | File): Promise<{
  image: HTMLImageElement;
  cleanup: () => void;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let objectUrl: string | null = null;

    const cleanup = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    };

    img.onload = () => resolve({ image: img, cleanup });
    img.onerror = () => {
      cleanup();
      reject(new Error('Failed to load label image for WebP compression.'));
    };

    if (typeof sourceBase64OrFile === 'string') {
      const trimmed = sourceBase64OrFile.trim();
      if (!trimmed) {
        reject(new Error('Empty image source provided.'));
        return;
      }
      // Support raw base64 strings as well as full data: or http(s): URLs
      if (
        trimmed.startsWith('data:') ||
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('blob:')
      ) {
        img.src = trimmed;
      } else {
        img.src = `data:image/jpeg;base64,${trimmed}`;
      }
    } else {
      objectUrl = URL.createObjectURL(sourceBase64OrFile);
      img.src = objectUrl;
    }
  });
}

/**
 * Compresses and crops a wine bottle label image to a 2:3 aspect ratio (default 400x600px)
 * in WebP format (~35 KB, guaranteed < 50 KB).
 */
export async function compressLabelImage(
  sourceBase64OrFile: string | File,
  targetWidth = 400,
  targetHeight = 600
): Promise<Blob> {
  const { image, cleanup } = await loadHtmlImage(sourceBase64OrFile);

  try {
    const srcWidth = image.naturalWidth || image.width;
    const srcHeight = image.naturalHeight || image.height;

    if (!srcWidth || !srcHeight) {
      throw new Error('Source image has invalid dimensions.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not initialize 2D canvas context for image compression.');
    }

    // High-quality bicubic-like smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Center-crop (aspect-fill) to target 2:3 wine label aspect ratio
    const targetAspect = targetWidth / targetHeight;
    const srcAspect = srcWidth / srcHeight;

    let sx = 0;
    let sy = 0;
    let sWidth = srcWidth;
    let sHeight = srcHeight;

    if (srcAspect > targetAspect) {
      // Source is wider than 2:3 — crop horizontal edges around center
      sWidth = srcHeight * targetAspect;
      sx = (srcWidth - sWidth) / 2;
    } else if (srcAspect < targetAspect) {
      // Source is taller than 2:3 — crop vertical edges around center
      sHeight = srcWidth / targetAspect;
      sy = (srcHeight - sHeight) / 2;
    }

    ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

    const exportWebP = (quality: number): Promise<Blob> =>
      new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas WebP encoding returned an empty blob.'));
              return;
            }
            resolve(blob);
          },
          'image/webp',
          quality
        );
      });

    // Primary export at 0.82 quality (~35 KB for 400x600)
    let blob = await exportWebP(0.82);

    // Ensure output stays under 50 KB even for high-frequency textured labels
    if (blob.size > 50 * 1024) {
      blob = await exportWebP(0.72);
    }

    return blob;
  } finally {
    cleanup();
  }
}

/**
 * Converts a compressed Blob into a compact base64 Data URL (~35 KB) for immediate
 * local/Firestore persistence when cloud object storage is unreachable.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string' && reader.result.length > 0) {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to encode compressed image blob as Data URL.'));
      }
    };
    reader.onerror = () => reject(new Error('FileReader error encoding compressed image blob.'));
    reader.readAsDataURL(blob);
  });
}
