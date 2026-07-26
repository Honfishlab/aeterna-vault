const MAX_BODY_BYTES = 16 * 1024 * 1024;

const securityHeaders = {
  'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'none'",
  'X-Content-Type-Options': 'nosniff',
};

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: securityHeaders });
}

function routeName(request: Request) {
  return new URL(request.url).pathname.replace(/^\/api\//, '').replace(/\/$/, '');
}

function parseJwk(input?: unknown): Record<string, any> | null {
  if (!input) return null;
  if (typeof input === 'object') return input as Record<string, any>;
  if (typeof input !== 'string') return null;
  try {
    const parsed = JSON.parse(input.trim());
    return parsed?.kty === 'RSA' && parsed?.n && parsed?.e ? parsed : null;
  } catch {
    return null;
  }
}

function base64UrlBytes(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function walletAddress(jwk: Record<string, any>) {
  const digest = await crypto.subtle.digest('SHA-256', base64UrlBytes(jwk.n));
  return bytesToBase64Url(new Uint8Array(digest));
}

function gemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return {
    models: {
      async generateContent(input: any) {
        const config = input.config || {};
        const parts = typeof input.contents === 'string'
          ? [{ text: input.contents }]
          : (input.contents?.parts || [{ text: String(input.contents || '') }]);
        const payload: any = { contents: [{ role: 'user', parts }] };
        if (config.systemInstruction) payload.systemInstruction = { parts: [{ text: config.systemInstruction }] };
        if (config.responseMimeType) payload.generationConfig = { responseMimeType: config.responseMimeType };
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(`Gemini API returned ${response.status}`);
        const data: any = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.map((part: any) => part.text || '').join('') || '';
        return { text };
      }
    }
  };
}

function modelName() {
  return process.env.GEMINI_MODEL || 'gemini-3.6-flash';
}

async function requestBody(request: Request) {
  const length = Number(request.headers.get('content-length') || '0');
  if (length > MAX_BODY_BYTES) throw new Error('REQUEST_TOO_LARGE');
  return request.json();
}

export async function GET(request: Request) {
  const route = routeName(request);

  if (route === 'health') {
    return json({ ok: true, service: 'aeterna-vault', storage: 'local-first', aiConfigured: Boolean(gemini()) });
  }

  if (route === 'arweave/status' || route === 'arweave/wallet-info') {
    let info: any = null;
    try {
      const response = await fetch('https://arweave.net/info', { headers: { Accept: 'application/json' } });
      if (response.ok) info = await response.json();
    } catch {
      // The endpoint still reports a degraded state below.
    }

    const data = {
      configured: false,
      network: 'arweave.mainnet',
      nodeUrl: 'https://arweave.net',
      status: info ? 'HEALTHY' : 'DEGRADED',
      blockHeight: info?.height ?? null,
      peersConnected: info?.peers ?? null,
      walletAddress: null,
      balanceAr: null,
      clientEncryption: 'AES-GCM-256',
      keyPolicy: 'Browser-session keys are never persisted by Aeterna Vault.',
    };
    return json(data, info ? 200 : 503);
  }

  return json({ error: 'API route not found' }, 404);
}

export async function POST(request: Request) {
  const route = routeName(request);
  let body: any;
  try {
    body = await requestBody(request);
  } catch (error: any) {
    return json({ error: error?.message === 'REQUEST_TOO_LARGE' ? 'Request exceeds the 16 MB service limit.' : 'Invalid JSON request.' }, error?.message === 'REQUEST_TOO_LARGE' ? 413 : 400);
  }

  if (route === 'arweave/import-jwk') {
    const jwk = parseJwk(body.jwk);
    if (!jwk) return json({ error: 'Invalid RSA Arweave JWK structure.' }, 400);
    try {
      const address = await walletAddress(jwk);
      const balanceResponse = await fetch(`https://arweave.net/wallet/${address}/balance`);
      const winston = balanceResponse.ok ? await balanceResponse.text() : '0';
      return json({
        success: true,
        address,
        balanceAr: String(Number(winston) / 1_000_000_000_000),
        persisted: false,
        message: 'Wallet validated. The private key remains in this browser tab only.',
      });
    } catch {
      return json({ error: 'The wallet could not be validated against Arweave.' }, 400);
    }
  }

  if (route === 'arweave/upload') {
    const payload = typeof body.payloadBase64 === 'string'
      ? body.payloadBase64.replace(/^data:[^;]+;base64,/, '')
      : btoa(`Aeterna Vault: ${body.title || 'Untitled'}`);
    const sizeBytes = Math.floor(payload.length * 0.75);
    if (sizeBytes > MAX_BODY_BYTES) return json({ error: 'Encrypted payload exceeds the 16 MB broadcast limit.' }, 413);
    try {
      const priceResponse = await fetch(`https://arweave.net/price/${sizeBytes}`);
      const winston = priceResponse.ok ? await priceResponse.text() : '0';
      return json({
        success: true,
        broadcastMethod: 'CLIENT_SIGNING_REQUIRED',
        status: 'SIGNING_KEY_REQUIRED',
        txId: null,
        rewardAr: String(Number(winston) / 1_000_000_000_000),
        sizeBytes,
        message: 'Payload prepared and priced. Connect an Arweave JWK wallet in this browser tab to broadcast it.',
      });
    } catch {
      return json({ error: 'Unable to retrieve Arweave transaction pricing.' }, 502);
    }
  }

  if (route === 'ai/concierge') {
    const prompt = String(body.prompt || '').trim();
    if (!prompt) return json({ error: 'Prompt is required.' }, 400);
    const ai = gemini();
    if (!ai) {
      return json({
        aiConfigured: false,
        reply: 'I can guide you through the local vault while AI is not configured.\n\n[BUTTON: ➕ Upload Memory | modal:upload]\n[BUTTON: 📜 Legacy Letters | navigate:legacy]\n[BUTTON: 🛡️ Inheritance Setup | navigate:inheritance]',
      });
    }
    try {
      const response = await ai.models.generateContent({
        model: modelName(),
        contents: prompt,
        config: {
          systemInstruction: 'You are the Aeterna Vault concierge. Be concise, empathetic, and privacy-conscious. Never claim data is on Arweave unless the context confirms a signed transaction. End with up to three action buttons using [BUTTON: Label | navigate:target] or [BUTTON: Label | modal:upload].',
        },
      });
      return json({ aiConfigured: true, reply: response.text || 'How may I help with your vault?' });
    } catch {
      return json({ error: 'The AI concierge is temporarily unavailable.' }, 502);
    }
  }

  if (route === 'ai/story-helper') {
    const ai = gemini();
    const recipient = String(body.recipient || 'future generations');
    const topic = String(body.topic || 'family values');
    if (!ai) {
      return json({ aiConfigured: false, story: `Dearest ${recipient},\n\nAs I reflect on ${topic}, I want to preserve the lessons, kindness, and courage that shaped our family. May this letter remind you that legacy lives in the care we show one another and in the stories we choose to carry forward.` });
    }
    try {
      const response = await ai.models.generateContent({
        model: modelName(),
        contents: `Write a warm 150-word legacy letter to ${recipient} about ${topic}. Tone: ${body.tone || 'reflective and sincere'}.`,
        config: { systemInstruction: 'You help people write authentic legacy letters. Do not invent personal facts.' },
      });
      return json({ aiConfigured: true, story: response.text || '' });
    } catch {
      return json({ error: 'The story helper is temporarily unavailable.' }, 502);
    }
  }

  if (route === 'ai/auto-tag') {
    const ai = gemini();
    if (!ai) {
      const words = [body.title, body.description, body.category].filter(Boolean).join(' ').toLowerCase().match(/[a-z]{4,}/g) || [];
      const tags = [...new Set(words)].slice(0, 6);
      return json({ autoTagged: true, aiConfigured: false, isFallback: true, category: body.category || 'Personal', people: [], location: '', tags, description: body.description || '', confidence: 0.35 });
    }
    try {
      const parts: any[] = [];
      if (typeof body.imageData === 'string') {
        const match = body.imageData.match(/^data:([^;]+);base64,(.+)$/);
        if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }
      parts.push({ text: `Title: ${body.title || 'Untitled'}\nDescription: ${body.description || ''}\nCategory hint: ${body.category || ''}` });
      const response = await ai.models.generateContent({
        model: modelName(),
        contents: { parts },
        config: {
          systemInstruction: 'Return JSON with category, people, location, tags, and description. Do not identify unknown people or infer sensitive traits.',
          responseMimeType: 'application/json',
        },
      });
      const parsed = JSON.parse(response.text || '{}');
      return json({ autoTagged: true, aiConfigured: true, ...parsed, confidence: 0.9 });
    } catch {
      return json({ error: 'Media analysis is temporarily unavailable.' }, 502);
    }
  }

  if (route === 'ai/transcribe-audio') {
    const ai = gemini();
    if (!ai) return json({ error: 'Audio transcription requires GEMINI_API_KEY configuration.', aiConfigured: false }, 503);
    const match = typeof body.audioData === 'string' ? body.audioData.match(/^data:([^;]+);base64,(.+)$/) : null;
    if (!match) return json({ error: 'A base64 audio recording is required.' }, 400);
    try {
      const response = await ai.models.generateContent({
        model: modelName(),
        contents: { parts: [{ inlineData: { mimeType: body.mimeType || match[1], data: match[2] } }, { text: 'Transcribe this family history recording accurately. Return only the transcript.' }] },
      });
      return json({ transcription: response.text?.trim() || '', aiConfigured: true });
    } catch {
      return json({ error: 'Audio transcription failed.' }, 502);
    }
  }

  if (route.startsWith('vault/')) {
    return json({ success: true, localOnly: true, message: 'Vault contents are stored only in this browser.' });
  }

  return json({ error: 'API route not found' }, 404);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: securityHeaders });
}
