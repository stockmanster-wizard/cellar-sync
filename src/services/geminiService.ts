/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ParsedWineDraft, normalizeWineStyle, normalizeVarietal } from '../types/cellar';
import { compressImageForOcr } from '../utils/imageCompression';
import { generateSommelierTastingNotes } from '../domain/cellar/tastingGenerator';

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
    const compressedBase64 =
      typeof Image !== 'undefined'
        ? await compressImageForOcr(imageInput)
        : typeof imageInput === 'string'
          ? imageInput
          : '';

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

    const data = await res.json().catch(() => null);
    if (res.ok && data?.success && data?.data) {
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

      const rawNotes = parsed.tastingNotes ? String(parsed.tastingNotes).trim() : '';
      const isPlaceholder =
        !rawNotes ||
        rawNotes.toLowerCase() === 'n/a' ||
        rawNotes.toLowerCase() === 'none' ||
        rawNotes.toLowerCase() === 'null' ||
        rawNotes.toLowerCase() === '-' ||
        rawNotes.toLowerCase().includes('not visible') ||
        rawNotes.toLowerCase().includes('not provided') ||
        rawNotes.toLowerCase().includes('not on label') ||
        rawNotes.toLowerCase().includes('impossible to provide');

      const resolvedNotes = isPlaceholder
        ? generateSommelierTastingNotes(normalizedVarietal, inferredStyle, parsed.region, parsed.wineName)
        : rawNotes;

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
          alcoholPercent:
            typeof parsed.alcoholPercent === 'number' && parsed.alcoholPercent > 0
              ? parsed.alcoholPercent
              : undefined,
          tastingNotes: resolvedNotes,
          drinkingWindow: parsed.drinkingWindow || '2025 - 2035',
        },
      };
    }

    return {
      success: false,
      error: data?.error || `Server responded with ${res.status}`,
    };
  } catch (err: any) {
    console.warn('Gemini label parse request error:', err);
    return {
      success: false,
      error: err?.message || 'Unable to reach label scanning service.',
    };
  }
}
