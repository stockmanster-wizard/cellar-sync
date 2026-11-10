/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const MAX_DIMENSION_OCR = 1024;
const JPEG_QUALITY_OCR = 0.75;
const FAST_PATH_MAX_BYTES = 200 * 1024; // 200KB

/**
 * Estimates the byte size of a File, Blob, or Data URL string.
 */
function getInputByteSize(input: File | Blob | string): number {
  if (typeof input !== 'string') {
    return input.size;
  }
  const base64Match = input.match(/^data:[^;]+;base64,(.*)$/);
  if (base64Match && base64Match[1]) {
    return Math.ceil((base64Match[1].length * 3) / 4);
  }
  return input.length;
}

/**
 * Converts a File, Blob, or string into a Data URL string.
 */
export function toDataUrl(input: File | Blob | string): Promise<string> {
  if (typeof input === 'string') {
    return Promise.resolve(input);
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert file to Data URL'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(input);
  });
}

/**
 * Converts a Blob or File to a Data URL string.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return toDataUrl(blob);
}

/**
 * Asynchronous client-side image resizer for OCR / Gemini analysis.
 */
export async function compressImageForOcr(
  file: File | Blob | string,
  maxDimension: number = MAX_DIMENSION_OCR,
  quality: number = JPEG_QUALITY_OCR
): Promise<string> {
  if (
    typeof file === 'string' &&
    (file.startsWith('/src/') || file.startsWith('/') || file.startsWith('http'))
  ) {
    return file;
  }

  const byteSize = getInputByteSize(file);
  const dataUrl = await toDataUrl(file);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let { width, height } = img;

      if (byteSize < FAST_PATH_MAX_BYTES && width <= maxDimension && height <= maxDimension) {
        resolve(dataUrl);
        return;
      }

      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch (err) {
        console.warn('OCR image compression failed, using original:', err);
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}

/**
 * Resizes and compresses a wine label image into a thumbnail JPEG.
 */
export async function compressImageToThumbnail(
  imageSource: string,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.78
): Promise<string> {
  if (imageSource.startsWith('/src/') || imageSource.startsWith('/') || imageSource.startsWith('http')) {
    return imageSource;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      let { width, height } = img;

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
        if (compressedDataUrl.length > 220000) {
          compressedDataUrl = canvas.toDataURL('image/jpeg', 0.62);
        }
        resolve(compressedDataUrl);
      } catch (err) {
        console.warn('Thumbnail export failed, using original:', err);
        resolve(imageSource);
      }
    };

    img.onerror = () => {
      resolve(imageSource);
    };

    img.src = imageSource;
  });
}

/**
 * Loads an image into HTMLImageElement.
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
      reject(new Error('Failed to load label image for compression.'));
    };

    if (typeof sourceBase64OrFile === 'string') {
      const trimmed = sourceBase64OrFile.trim();
      if (!trimmed) {
        reject(new Error('Empty image source provided.'));
        return;
      }
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
 * Compresses and crops a wine label image to a 2:3 aspect ratio in WebP format.
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

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const targetAspect = targetWidth / targetHeight;
    const srcAspect = srcWidth / srcHeight;

    let sx = 0;
    let sy = 0;
    let sWidth = srcWidth;
    let sHeight = srcHeight;

    if (srcAspect > targetAspect) {
      sWidth = srcHeight * targetAspect;
      sx = (srcWidth - sWidth) / 2;
    } else if (srcAspect < targetAspect) {
      sHeight = srcWidth / targetAspect;
      sy = (srcHeight - sHeight) / 2;
    }

    ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

    const exportWebP = (quality: number): Promise<Blob> =>
      new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas toBlob failed to produce a WebP blob.'));
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
