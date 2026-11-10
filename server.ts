import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

async function startServer() {
  const app = express();
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

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
        "Extract wine metadata from the label. Identify producer, wine name, vintage (use 'NV' if none), region/appellation, country, and predominant grape varietal. Output strictly according to schema.";

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
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
            },
            required: ['producer', 'vintage', 'region', 'country', 'varietal'],
          },
          temperature: 0.1,
          maxOutputTokens: 250,
        },
      });

      const outputText = response?.text;
      if (!outputText) {
        throw new Error('Gemini returned an empty response.');
      }

      const parsedData = JSON.parse(outputText);
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
    try {
      const { imageUrl } = req.body;
      if (!imageUrl) {
        return res.status(400).json({ error: 'imageUrl is required.' });
      }

      // Enforce an 8-second timeout so requests never hang indefinitely
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(imageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return res.status(response.status).json({
          error: `Source image host returned HTTP ${response.status}`,
        });
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const dataUrl = `data:${contentType};base64,${base64}`;

      return res.json({ success: true, dataUrl });
    } catch (err: any) {
      console.error('Error proxying label image:', err);
      const isTimeout = err.name === 'AbortError';
      return res.status(500).json({
        error: isTimeout
          ? 'Image host timed out. Please try another candidate.'
          : 'Failed to download selected label image.',
      });
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
