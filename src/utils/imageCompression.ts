/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.75;
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
function toDataUrl(input: File | Blob | string): Promise<string> {
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
 * Asynchronous client-side image resizer using HTMLCanvasElement.
 * - Accepts File | Blob | string (Data URL)
 * - Max width/height = 1024px, preserving aspect ratio
 * - Outputs compressed JPEG Data URL ('image/jpeg', quality 0.75)
 * - Returns immediately if input is already under 200KB and within 1024px dimensions
 */
export async function compressImageForOcr(
  file: File | Blob | string,
  maxDimension: number = MAX_DIMENSION,
  quality: number = JPEG_QUALITY
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

      // Fast-path: already under 200KB and within max dimensions
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
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      } catch (err) {
        console.warn('Canvas compression failed, returning original data URL:', err);
        resolve(dataUrl);
      }
    };

    img.onerror = () => {
      resolve(dataUrl);
    };

    img.src = dataUrl;
  });
}

export default compressImageForOcr;
