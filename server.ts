import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSommelierTastingNotes } from './src/domain/cellar/tastingGenerator';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProduction = process.env.NODE_ENV === 'production';

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  const httpOptions = { headers: { 'User-Agent': 'aistudio-build' } };
  return apiKey ? new GoogleGenAI({ apiKey, httpOptions }) : new GoogleGenAI({ httpOptions });
}

function formatGeminiErrorMessage(err: any): string {
  const raw = err?.message || String(err || 'Failed to parse wine label.');
  try {
    const parsed = JSON.parse(raw);
    const apiErr = parsed?.error;
    if (apiErr?.message) {
      if (
        apiErr.message.includes('API key not valid') ||
        apiErr.details?.some((d: any) => d?.reason === 'API_KEY_INVALID')
      ) {
        return 'Your attached Gemini API key is invalid or expired. Please select a valid API key in AI Studio Settings > Secrets.';
      }
      return apiErr.message;
    }
  } catch {
    // Not a JSON string
  }
  if (raw.includes('API key not valid') || raw.includes('API_KEY_INVALID')) {
    return 'Your attached Gemini API key is invalid or expired. Please select a valid API key in AI Studio Settings > Secrets.';
  }
  return raw;
}

function isValidPublicImageUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (
      hostname === 'localhost' ||
      hostname.startsWith('127.') ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname === '::' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('169.254.') ||
      hostname.startsWith('fc00:') ||
      hostname.startsWith('fd00:') ||
      hostname.startsWith('fe80:') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// In-memory rate limiter with periodic cleanup
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // 20 requests per minute per IP

// Periodically evict expired rate limit entries to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000).unref();

function rateLimiter(req: express.Request, res: express.Response, next: express.NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  let record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    record = { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS };
    rateLimitMap.set(ip, record);
  } else {
    record.count++;
    if (record.count > RATE_LIMIT_MAX_REQUESTS) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        error: 'Too many requests. Please wait a minute before trying again.',
      });
    }
  }
  next();
}

function generateFallbackTastingNotes(parsed: any): string {
  return generateSommelierTastingNotes(
    parsed.varietal || '',
    parsed.style || '',
    parsed.region || '',
    parsed.wineName || ''
  );
}

function isAiPlaceholder(notes: string): boolean {
  if (!notes) return true;
  const lower = notes.toLowerCase().trim();
  return (
    lower === '' ||
    lower === 'n/a' ||
    lower === 'none' ||
    lower === '-' ||
    lower.includes('not visible') ||
    lower.includes('not provided') ||
    lower.includes('not on label') ||
    lower.includes('unknown')
  );
}

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Trust proxy for correct IP resolution behind load balancers / reverse proxies
  app.set('trust proxy', 1);

  // Apply rate limiter BEFORE heavy body parsing on AI/proxy endpoints
  app.use(['/api/parse-label', '/api/search-label-candidates', '/api/proxy-label-image'], rateLimiter);

  // Allow parsing base64 image uploads up to 20MB
  app.use(express.json({ limit: '20mb' }));

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // POST /api/parse-label
  app.post('/api/parse-label', async (req, res) => {
    try {
      const { imageBase64, mimeType = 'image/jpeg' } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: 'imageBase64 string is required.' });
      }

      // Strip data URL scheme prefix if sent by browser FileReader
      const detectedMatch = imageBase64.match(/^data:([a-zA-Z0-9/+-]+);base64,/);
      const effectiveMimeType = detectedMatch?.[1] || mimeType || 'image/jpeg';
      const cleanBase64 = imageBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');

      const systemPrompt =
        "Extract wine metadata from the label. Identify producer, wine name, vintage (use 'NV' if none), region/appellation, country, predominant grape varietal, style (must be one of: Sparkling Wine, Light-Bodied White Wine, Full-Bodied White Wine, Aromatic (Sweet) White Wine, Rosé Wine, Light-Bodied Red Wine, Medium-Bodied Red Wine, Full-Bodied Red Wine, Dessert Wine), alcohol percentage as a number if visible (e.g. 14.5), and estimated drinking window formatted as 'YYYY - YYYY'. For tastingNotes, synthesize an expert 1-2 sentence sommelier tasting profile (aromas, palate structure, and tannins) appropriate for this specific wine producer, varietal, and region. Output strictly according to schema.";

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: systemPrompt },
              {
                inlineData: {
                  mimeType: effectiveMimeType,
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              producer: { type: Type.STRING },
              wineName: { type: Type.STRING },
              vintage: { type: Type.STRING },
              region: { type: Type.STRING },
              country: { type: Type.STRING },
              varietal: { type: Type.STRING },
              style: { type: Type.STRING },
              alcoholPercent: { type: Type.NUMBER },
              tastingNotes: { type: Type.STRING },
              drinkingWindow: { type: Type.STRING },
            },
            required: ['producer', 'vintage', 'region', 'country', 'varietal', 'tastingNotes'],
          },
          temperature: 0.2,
          maxOutputTokens: 1000,
        },
      });

      const outputText = response?.text;
      if (!outputText) {
        throw new Error('Gemini returned an empty response.');
      }

      const parsedData = JSON.parse(outputText);
      if (isAiPlaceholder(parsedData.tastingNotes)) {
        parsedData.tastingNotes = generateFallbackTastingNotes(parsedData);
      }
      return res.json({ success: true, data: parsedData });
    } catch (err: any) {
      console.error('Error parsing wine label with Gemini:', err);
      return res.status(500).json({
        error: formatGeminiErrorMessage(err),
      });
    }
  });

  // POST /api/search-label-candidates
  app.post('/api/search-label-candidates', async (req, res) => {
    try {
      const { producer, wineName, varietal, customQuery } = req.body;

      if (!process.env.SERPER_API_KEY || !process.env.SERPER_API_KEY.trim()) {
        return res.status(400).json({
          success: false,
          candidates: [],
          error: 'SERPER_API_KEY is not configured in environment secrets.',
        });
      }

      const executeSerper = async (q: string): Promise<string[]> => {
        const response = await fetch('https://google.serper.dev/images', {
          method: 'POST',
          headers: {
            'X-API-KEY': process.env.SERPER_API_KEY!.trim(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ q, num: 6 }),
        });
        if (!response.ok) return [];
        const data: any = await response.json();
        return (data.images || [])
          .map((img: any) => img.imageUrl || img.thumbnailUrl)
          .filter(Boolean);
      };

      // 1. If user typed or edited a search in the UI, use their exact query
      if (customQuery && customQuery.trim()) {
        const cleanCustom = customQuery.trim();
        const results = await executeSerper(`${cleanCustom} wine bottle`);
        const unique = Array.from(new Set(results)).slice(0, 4);
        return res.json({ success: true, candidates: unique });
      }

      if (!producer) {
        return res.status(400).json({ error: 'Producer name is required.' });
      }

      const cleanProducer = producer.trim();
      const secondary = (wineName || varietal || '').trim();

      // 2. TIER 1: Strict quotes around producer and cuvée/varietal + "wine"
      // Example: "Whitman Cellars" "Killer Cab" wine  OR  "Loop de Loop" "Tannat" wine
      const tier1Query =
        secondary && secondary.toLowerCase() !== cleanProducer.toLowerCase()
          ? `"${cleanProducer}" "${secondary}" wine`
          : `"${cleanProducer}" wine bottle label`;

      let candidates = await executeSerper(tier1Query);

      // 3. TIER 2: Fallback if cuvée was too narrow (Producer + Wine bottle)
      // Example: "Jacob Williams" "Cabernet" wine
      if (candidates.length === 0 && secondary) {
        const firstWordOfSecondary = secondary.split(' ')[0];
        const tier2Query = `"${cleanProducer}" ${firstWordOfSecondary} wine bottle`;
        candidates = await executeSerper(tier2Query);
      }

      const unique = Array.from(new Set(candidates)).slice(0, 4);
      return res.json({ success: true, candidates: unique });
    } catch (err: any) {
      console.error('Error in search-label-candidates:', err);
      return res.status(500).json({ error: 'Failed to search for label candidates.' });
    }
  });

  // POST /api/proxy-label-image
  app.post('/api/proxy-label-image', async (req, res) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const { imageUrl } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ error: 'imageUrl is required.' });
      }

      if (!isValidPublicImageUrl(imageUrl)) {
        return res.status(400).json({ error: 'Invalid or restricted image URL.' });
      }

      const response = await fetch(imageUrl, {
        signal: controller.signal,
        redirect: 'error',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });

      if (!response.ok) {
        return res.status(response.status).json({
          error: `Source image host returned HTTP ${response.status}`,
        });
      }

      const rawContentType = response.headers.get('content-type') || '';
      const mimeMatch = rawContentType.trim().match(/^(image\/[a-z0-9.+-]+)(?:\s*;|$)/i);
      if (!mimeMatch) {
        return res.status(400).json({ error: 'Requested URL did not return a valid image type.' });
      }
      const cleanMimeType = mimeMatch[1];

      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > 15 * 1024 * 1024) {
        return res.status(400).json({ error: 'Image exceeds maximum allowed size of 15MB.' });
      }

      const arrayBuffer = await response.arrayBuffer();
      if (arrayBuffer.byteLength > 15 * 1024 * 1024) {
        return res.status(400).json({ error: 'Image exceeds maximum allowed size of 15MB.' });
      }

      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const dataUrl = `data:${cleanMimeType};base64,${base64}`;

      return res.json({ success: true, dataUrl });
    } catch (err: any) {
      console.error('Error proxying label image:', err);
      const isTimeout = err.name === 'AbortError';
      return res.status(500).json({
        error: isTimeout
          ? 'Image host timed out. Please try another candidate.'
          : 'Failed to download selected label image.',
      });
    } finally {
      clearTimeout(timeoutId);
    }
  });

  // Mount Vite dev middleware or serve production assets
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`CellarSync AI server running at http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});
