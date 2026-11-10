/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParsedWineDraft, normalizeWineStyle, normalizeVarietal } from '../types/cellar';
import { compressImageForOcr } from '../utils/imageCompression';

export interface ParseLabelResult {
  success: boolean;
  draft?: ParsedWineDraft;
  error?: string;
  isFallback?: boolean;
}

export async function parseWineLabelImage(
  imageInput: File | Blob | string,
  mimeType: string = 'image/jpeg'
): Promise<ParseLabelResult> {
  try {
    // Compress the captured image using compressImageForOcr BEFORE encoding the payload
    const compressedBase64 = await compressImageForOcr(imageInput);

    let resolvedMimeType = mimeType;
    const match = compressedBase64.match(/^data:([a-zA-Z0-9/+-]+);base64,/);
    if (match && match[1]) {
      resolvedMimeType = match[1];
    }

    const res = await fetch('/api/parse-label', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        imageBase64: compressedBase64,
        mimeType: resolvedMimeType,
      }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || `Server responded with ${res.status}`);
    }

    const data = await res.json();
    if (data.success && data.data) {
      const parsed = data.data;
      const normalizedVarietal = normalizeVarietal(parsed.varietal, {
        region: parsed.region,
        country: parsed.country,
        wineName: parsed.wineName,
        producer: parsed.producer,
        style: parsed.style,
      });
      const inferredStyle = normalizeWineStyle(
        `${parsed.style || ''} ${normalizedVarietal} ${parsed.region || ''} ${parsed.wineName || ''}`
      );

      return {
        success: true,
        draft: {
          producer: parsed.producer || 'Unknown Estate',
          wineName: parsed.wineName || '',
          varietal: normalizedVarietal,
          vintage: parsed.vintage ? String(parsed.vintage) : 'NV',
          style: inferredStyle,
          country: parsed.country || '',
          region: parsed.region || '',
          alcoholPercent: typeof parsed.alcoholPercent === 'number' ? parsed.alcoholPercent : undefined,
          tastingNotes: parsed.tastingNotes || '',
          drinkingWindow: parsed.drinkingWindow || '',
        },
      };
    }

    throw new Error('Invalid JSON received from Gemini label parser.');
  } catch (err: any) {
    console.warn('Backend Gemini API call error:', err);
    return {
      success: false,
      error: err.message || 'Could not parse label image via Gemini. Please review draft fields.',
    };
  }
}
