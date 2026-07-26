import { Buffer } from 'node:buffer';
import { GoogleGenAI } from '@google/genai';
import Arweave from 'arweave';

const arweave = Arweave.init({ host: 'arweave.net', port: 443, protocol: 'https' });
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

function parseJwk(input?: unknown): Record<string, unknown> | null {
  if (!input) return null;
  if (typeof input === 'object') return input as Record<string, unknown>;
  if (typeof input !== 'string') return null;
  try {
    const raw = input.trim().startsWith('{')
      ? input.trim()
      : Buffer.from(input.trim(), 'base64').toString('utf8');
    const parsed = JSON.parse(raw);
    return parsed?.kty === 'RSA' && parsed?.n && parsed?.e ? parsed : null;
  } catch {
    return null;
  }
}

function configuredJwk() {
  return parseJwk(process.env.ARWEAVE_JWK);
}

function gemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({ apiKey });
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

    const jwk = configuredJwk();
    let walletAddress: string | null = null;
    let balanceAr: string | null = null;
    if (jwk) {
      try {
        walletAddress = await arweave.wallets.jwkToAddress(jwk as any);
        const balance = await arweave.wallets.getBalance(walletAddress);
        balanceAr = arweave.ar.winstonToAr(balance);
      } catch {
        // Never expose key material or internal parsing details.
      }
    }

    const data = {
      configured: Boolean(jwk),
      network: 'arweave.mainnet',
      nodeUrl: 'https://arweave.net',
      status: info ? 'HEALTHY' : 'DEGRADED',
      blockHeight: info?.height ?? null,
      peersConnected: info?.peers ?? null,
      walletAddress,
      balanceAr,
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
      const address = await arweave.wallets.jwkToAddress(jwk as any);
      const balance = await arweave.wallets.getBalance(address);
      return json({
        success: true,
        address,
        balanceAr: arweave.ar.winstonToAr(balance),
        persisted: false,
        message: 'Wallet validated. The private key remains in this browser tab only.',
      });
    } catch {
      return json({ error: 'The wallet could not be validated against Arweave.' }, 400);
    }
  }

  if (route === 'arweave/upload') {
    const jwk = parseJwk(body.jwk) || configuredJwk();
    const payload = typeof body.payloadBase64 === 'string'
      ? body.payloadBase64.replace(/^data:[^;]+;base64,/, '')
      : Buffer.from(`Aeterna Vault: ${body.title || 'Untitled'}`, 'utf8').toString('base64');
    let buffer: Buffer;
    try {
      buffer = Buffer.from(payload, 'base64');
    } catch {
      return json({ error: 'Invalid base64 payload.' }, 400);
    }
    if (buffer.byteLength > MAX_BODY_BYTES) return json({ error: 'Encrypted payload exceeds the 16 MB broadcast limit.' }, 413);

    if (!jwk) {
      const price = await arweave.transactions.getPrice(buffer.byteLength);
      return json({
        success: true,
        broadcastMethod: 'PREVIEW_ONLY',
        status: 'SIGNING_KEY_REQUIRED',
        txId: null,
        rewardAr: arweave.ar.winstonToAr(price),
        sizeBytes: buffer.byteLength,
        message: 'Payload prepared and priced. Connect an Arweave JWK wallet in this browser tab to broadcast it.',
      });
    }

    try {
      const transaction = await arweave.createTransaction({ data: buffer }, jwk as any);
      const tags: Array<[string, string]> = [
        ['App-Name', 'Aeterna-Vault'],
        ['App-Version', '1.0.0'],
        ['Content-Type', body.contentType || 'application/octet-stream'],
        ['Title', body.title || 'Untitled Memory'],
        ['Category', body.category || 'Personal'],
        ['Encryption-Level', body.encryptionLevel || 'AES-GCM-256'],
      ];
      if (body.dataHash) tags.push(['Data-SHA256', String(body.dataHash)]);
      for (const [name, value] of tags) transaction.addTag(name, value);
      await arweave.transactions.sign(transaction, jwk as any);
      const posted = await arweave.transactions.post(transaction);
      const accepted = posted.status === 200 || posted.status === 202;
      return json({
        success: accepted,
        broadcastMethod: 'ARWEAVE_MAINNET_JWK_SIGNED',
        status: accepted ? 'SEALED_ON_PERMAWEB' : 'PENDING_PROPAGATION',
        txId: transaction.id,
        gatewayUrl: `https://arweave.net/${transaction.id}`,
        httpStatus: posted.status,
        rewardAr: arweave.ar.winstonToAr(transaction.reward),
        sizeBytes: buffer.byteLength,
      }, accepted ? 200 : 502);
    } catch (error: any) {
      return json({ error: 'Arweave broadcast failed.', details: error?.message || 'Unknown gateway error' }, 502);
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
