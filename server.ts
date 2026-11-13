import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '2mb' }));

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

app.get('/api/health', (_req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY');
  res.json({ ok: true, geminiConfigured: hasKey });
});

app.post('/api/ai/reply-drafts', async (req, res) => {
  try {
    const ai = getAiClient();
    if (!ai) {
      return res.status(200).json({ fallback: true });
    }
    const { contactName, contactTitle, tags, messages } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `You are an AI assistant for PulseCRM Social. Read the conversation thread and CRM contact profile, then write 3 concise, high-converting reply options.
Contact: ${contactName} (${contactTitle || 'Lead'}), Tags: ${(tags || []).join(', ')}
Conversation:\n${(messages || []).map((m: { senderName: string; text: string }) => `${m.senderName}: ${m.text}`).join('\n')}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            professional: { type: Type.STRING },
            friendly: { type: Type.STRING },
            concise: { type: Type.STRING },
          },
          required: ['professional', 'friendly', 'concise'],
        },
      },
    });
    return res.json({ fallback: false, data: JSON.parse(response.text || '{}') });
  } catch (error) {
    console.error('AI reply-drafts error:', error);
    return res.status(200).json({ fallback: true });
  }
});

app.post('/api/ai/summarize-thread', async (req, res) => {
  try {
    const ai = getAiClient();
    if (!ai) return res.status(200).json({ fallback: true });
    const { messages } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Analyze this social media conversation thread and extract a 1-sentence summary, sentiment, intent, suggested CRM tags (max 3), and sentimentScore (0 to 1).
Thread:\n${(messages || []).map((m: { senderName: string; text: string }) => `${m.senderName}: ${m.text}`).join('\n')}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            sentiment: { type: Type.STRING },
            intent: { type: Type.STRING },
            suggestedTags: { type: Type.ARRAY, items: { type: Type.STRING } },
            sentimentScore: { type: Type.NUMBER },
          },
          required: ['summary', 'sentiment', 'intent', 'suggestedTags', 'sentimentScore'],
        },
      },
    });
    return res.json({ fallback: false, data: JSON.parse(response.text || '{}') });
  } catch (error) {
    console.error('AI summarize-thread error:', error);
    return res.status(200).json({ fallback: true });
  }
});

app.post('/api/ai/score-lead', async (req, res) => {
  try {
    const ai = getAiClient();
    if (!ai) return res.status(200).json({ fallback: true });
    const { name, notes, tags, ltv, lifecycleStage } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Score this Social CRM lead from 0 to 100 and recommend the next best action and follow-up DM.
Name: ${name}
Lifecycle: ${lifecycleStage}
LTV: ${ltv}
Tags: ${(tags || []).join(', ')}
Notes: ${notes}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            reasoning: { type: Type.STRING },
            nextBestAction: { type: Type.STRING },
            followUpMessage: { type: Type.STRING },
          },
          required: ['score', 'reasoning', 'nextBestAction', 'followUpMessage'],
        },
      },
    });
    return res.json({ fallback: false, data: JSON.parse(response.text || '{}') });
  } catch (error) {
    console.error('AI score-lead error:', error);
    return res.status(200).json({ fallback: true });
  }
});

app.post('/api/ai/repurpose', async (req, res) => {
  try {
    const ai = getAiClient();
    if (!ai) return res.status(200).json({ fallback: true });
    const { topic, tone } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Repurpose this topic into platform-native social posts in a ${tone || 'Professional'} tone:
Topic: ${topic}
Include LinkedIn, X, Instagram, TikTok script hook, and 4 concise hashtags.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            linkedin: { type: Type.STRING },
            x: { type: Type.STRING },
            instagram: { type: Type.STRING },
            tiktok: { type: Type.STRING },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['linkedin', 'x', 'instagram', 'tiktok', 'hashtags'],
        },
      },
    });
    return res.json({ fallback: false, data: JSON.parse(response.text || '{}') });
  } catch (error) {
    console.error('AI repurpose error:', error);
    return res.status(200).json({ fallback: true });
  }
});

app.post('/api/ai/bulk-drafts', async (req, res) => {
  try {
    const ai = getAiClient();
    if (!ai) return res.status(200).json({ fallback: true });
    const { topic, audience, tone, platforms } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Generate 5 distinct, ready-to-publish social media drafts.
Topic: ${topic}
Audience: ${audience}
Tone: ${tone}
Platforms: ${(platforms || []).join(', ')}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            drafts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  platform: { type: Type.STRING },
                  content: { type: Type.STRING },
                },
                required: ['platform', 'content'],
              },
            },
          },
          required: ['drafts'],
        },
      },
    });
    return res.json({ fallback: false, data: JSON.parse(response.text || '{}') });
  } catch (error) {
    console.error('AI bulk-drafts error:', error);
    return res.status(200).json({ fallback: true });
  }
});

app.post('/api/ai/ad-copy', async (req, res) => {
  try {
    const ai = getAiClient();
    if (!ai) return res.status(200).json({ fallback: true });
    const { platform, objective, audience } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Generate 3 high-converting paid ad variations for ${platform}.
Objective: ${objective}
Audience: ${audience}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            variations: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  headline: { type: Type.STRING },
                  primaryText: { type: Type.STRING },
                  cta: { type: Type.STRING },
                  creativeConcept: { type: Type.STRING },
                },
                required: ['headline', 'primaryText', 'cta', 'creativeConcept'],
              },
            },
          },
          required: ['variations'],
        },
      },
    });
    return res.json({ fallback: false, data: JSON.parse(response.text || '{}') });
  } catch (error) {
    console.error('AI ad-copy error:', error);
    return res.status(200).json({ fallback: true });
  }
});

app.post('/api/ai/analyst', async (req, res) => {
  try {
    const ai = getAiClient();
    if (!ai) return res.status(200).json({ fallback: true });
    const { summary, query } = req.body;
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `You are an expert Social CRM Strategist. Answer the user's question concisely using the workspace metrics below (under 70 words, cite specific numbers).
Workspace Summary: ${JSON.stringify(summary)}
Question: ${query}`,
    });
    return res.json({ fallback: false, data: { answer: response.text || '' } });
  } catch (error) {
    console.error('AI analyst error:', error);
    return res.status(200).json({ fallback: true });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PulseCRM Social server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
