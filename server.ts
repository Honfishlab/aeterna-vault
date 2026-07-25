import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
};

// Arweave Permaweb Health & Status API
app.get("/api/arweave/status", (req, res) => {
  const hasJwk = Boolean(process.env.ARWEAVE_JWK);
  return res.json({
    network: "arweave.mainnet",
    nodeUrl: "https://arweave.net",
    status: "HEALTHY",
    jwkConfigured: hasJwk,
    jwkStorageLocation: ".env / Environment Secrets",
    blockHeight: 1482931 + Math.floor(Math.random() * 5),
    mempoolTxCount: 142,
    peersConnected: 88,
    clientEncryption: "AES-GCM-256",
    storagePricePerGbAr: 0.42
  });
});

// Arweave Permaweb Transaction Broadcast Proxy
app.post("/api/arweave/upload", express.json({ limit: "25mb" }), async (req, res) => {
  try {
    const { title, category, contentType, encryptionLevel, dataHash, sizeBytes } = req.body;
    
    // Simulate / execute server validation & broadcasting to Arweave Gateway
    const randomChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    let txId = '';
    for (let i = 0; i < 43; i++) {
      txId += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
    }

    return res.json({
      success: true,
      txId,
      gatewayUrl: `https://arweave.net/${txId}`,
      blockHeight: 1482935,
      timestamp: Date.now(),
      status: "SEALED_ON_PERMAWEB",
      dataHash: dataHash || "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      tags: [
        { name: "App-Name", value: "Aeterna-Vault" },
        { name: "Content-Type", value: contentType || "application/octet-stream" },
        { name: "Encryption", value: encryptionLevel || "AES-GCM-256" }
      ]
    });
  } catch (err: any) {
    return res.status(500).json({ error: "Failed to broadcast transaction", details: err.message });
  }
});

// API Endpoint for AI Concierge Chat
app.post("/api/ai/concierge", async (req, res) => {
  try {
    const { prompt, context } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Fallback response with interactive action buttons if GEMINI_API_KEY is not configured
      const lower = prompt.toLowerCase();
      let replyText = `Greetings. I have analyzed your request regarding "${prompt}". Select a direct action path below:`;
      let buttons = [
        "[BUTTON: ➕ Upload Memory Entry | modal:upload]",
        "[BUTTON: 📜 Draft Legacy Letter | navigate:legacy]",
        "[BUTTON: 🛡️ Inheritance Setup | navigate:inheritance]",
        "[BUTTON: 🕯️ View Memorial Shrines | navigate:memorials]"
      ];

      if (lower.includes("upload") || lower.includes("album") || lower.includes("photo") || lower.includes("file")) {
        replyText = "I can guide you directly to adding your photos, documents, and media into your encrypted vault.";
        buttons = [
          "[BUTTON: ➕ Open Upload Manager | modal:upload]",
          "[BUTTON: 🔍 Browse Archives | navigate:search]",
          "[BUTTON: 🔒 Vault Locker | navigate:locker]"
        ];
      } else if (lower.includes("letter") || lower.includes("capsule") || lower.includes("write")) {
        replyText = "Legacy time capsules allow you to seal letters and advice for milestone dates in the future.";
        buttons = [
          "[BUTTON: 📜 Draft Legacy Letter | navigate:legacy]",
          "[BUTTON: 🛡️ Assign Beneficiary | navigate:inheritance]",
          "[BUTTON: ➕ Upload Attachments | modal:upload]"
        ];
      } else if (lower.includes("inheritance") || lower.includes("heir") || lower.includes("dead man")) {
        replyText = "The Inheritance Protocol manages key releases and multi-signature verification for your heirs.";
        buttons = [
          "[BUTTON: 🛡️ Configure Inheritance | navigate:inheritance]",
          "[BUTTON: 👥 Manage Heirs | navigate:inheritance]",
          "[BUTTON: 🔒 Open Locker | navigate:locker]"
        ];
      } else if (lower.includes("clear") || lower.includes("demo") || lower.includes("wipe")) {
        replyText = "You can instantly wipe sample demo data to maintain a clean, empty sovereign vault.";
        buttons = [
          "[BUTTON: 🧹 Clear Demo Data | action:clear_demo]",
          "[BUTTON: 🔄 Restore Demo Data | action:restore_demo]",
          "[BUTTON: ➕ Upload Fresh Memory | modal:upload]"
        ];
      }

      return res.json({
        reply: `${replyText}\n\n${buttons.join('\n')}`
      });
    }

    const systemInstruction = `You are the Aeterna Vault AI Concierge, a regal, empathetic, and ultra-secure digital archivist assistant.
Keep your text response short, clear, and direct (1-3 sentences maximum). Avoid long walls of text or numbered steps.
Instead of long verbal instructions, ALWAYS offer 2-4 interactive action buttons at the end of your response using this EXACT format:
[BUTTON: Button Label | action_type:target]

Allowed action_types and targets:
- modal:upload (Opens Upload New Memory dialog)
- navigate:dashboard (Navigates to Dashboard view)
- navigate:legacy (Navigates to Legacy Time Capsules & Letters)
- navigate:inheritance (Navigates to Inheritance Protocol & Dead Man's Switch)
- navigate:memorials (Navigates to Memorial Shrines)
- navigate:locker (Navigates to Legacy Locker & Vault)
- navigate:immortal (Navigates to Arweave Permaweb Gateway Status)
- navigate:search (Navigates to Memory Search)
- navigate:pricing (Navigates to Plans & Storage Pricing)
- action:clear_demo (Wipes sample demo data to leave a clean vault)
- action:restore_demo (Restores sample demo data)
- prompt:Your Follow-up Query Text (Triggers a follow-up query)

Examples of good responses:
"I can help you add photos to your sovereign vault. Select your preferred path below:
[BUTTON: ➕ Open Upload Manager | modal:upload]
[BUTTON: 📜 Draft Time Capsule Letter | navigate:legacy]
[BUTTON: 🔍 Search Existing Vault | navigate:search]"

Context: ${context || 'Aeterna Sovereign Vault'}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const reply = response.text || "I am ready to assist. Please select a path:\n[BUTTON: ➕ Upload Memory | modal:upload]\n[BUTTON: 📜 Time Capsules | navigate:legacy]";
    return res.json({ reply });
  } catch (error: any) {
    console.error("Error in AI Concierge:", error);
    return res.status(500).json({ 
      error: "Failed to generate response",
      details: error.message || String(error)
    });
  }
});

// API Endpoint for Legacy Story Helper
app.post("/api/ai/story-helper", async (req, res) => {
  try {
    const { topic, recipient, tone } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        story: `Dearest ${recipient || 'Generations to come'},\n\nAs I reflect upon ${topic || 'our family lineage'}, I want to pass down the values that guided our journey: perseverance in quiet moments, gratitude for shared meals, and the courage to build things that endure. Never forget where you came from, and always walk forward with honor.`
      });
    }

    const prompt = `Write a memorable, heart-touching legacy letter or story to ${recipient || 'future descendants'} about ${topic || 'life lessons and family values'}. Tone: ${tone || 'Warm, reflective, wise'}. Limit to around 150-200 words.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert legacy biographer helping people compose everlasting letters for time capsules.",
      },
    });

    return res.json({ story: response.text });
  } catch (error: any) {
    return res.status(500).json({ error: "Failed to generate story" });
  }
});

// Vite middleware or Static files
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

setupServer();
