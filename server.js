import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// Robust Multi-Path .env Loading
// Ensures .env is found whether started from root or SmartTaskApp
// ==========================================
const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, 'SmartTaskApp', '.env'),
  path.resolve(path.dirname(__dirname), '.env'),
  path.resolve(path.dirname(__dirname), 'SmartTaskApp', '.env')
];

let loadedEnvPath = null;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    loadedEnvPath = envPath;
    break;
  }
}

// Fallback to default dotenv if not explicitly loaded
if (!loadedEnvPath) {
  dotenv.config();
}

const app = express();
const PORT = process.env.PORT || 3000;

// High-speed, free-tier supported models
const PRIMARY_MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
const FALLBACK_MODEL = 'gemini-3.8-flash';

// Disable all HTTP caching on API routes so browsers never show stale status
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// JSON body parser with payload size limit
app.use(express.json({ limit: '500kb' }));

// Serve frontend static files from the project directory
app.use(express.static(__dirname));

/**
 * Helper to get an authenticated GoogleGenAI client instance
 */
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    return null;
  }
  return new GoogleGenAI({ apiKey: apiKey.trim() });
}

/**
 * Robust Gemini model caller with automatic high-demand fallback
 */
async function generateWithFallback(ai, { contents, config = {} }) {
  try {
    return await ai.models.generateContent({
      model: PRIMARY_MODEL,
      contents,
      config
    });
  } catch (primaryErr) {
    const isOverloaded = primaryErr.message?.includes('503') || 
                         primaryErr.message?.includes('high demand') || 
                         primaryErr.message?.includes('RESOURCE_EXHAUSTED');
    if (isOverloaded && PRIMARY_MODEL !== FALLBACK_MODEL) {
      console.warn(`Primary model ${PRIMARY_MODEL} overloaded, attempting fallback to ${FALLBACK_MODEL}...`);
      return await ai.models.generateContent({
        model: FALLBACK_MODEL,
        contents,
        config
      });
    }
    throw primaryErr;
  }
}

// ==========================================
// API Endpoints
// ==========================================

/**
 * Safe Diagnostic Endpoint
 * Reports whether GEMINI_API_KEY is configured (true/false) and environment details.
 * NEVER prints, logs, or returns the actual secret key.
 */
app.get('/api/debug-status', (req, res) => {
  const rawKey = process.env.GEMINI_API_KEY;
  const isConfigured = Boolean(
    rawKey && 
    rawKey.trim() !== '' && 
    rawKey !== 'your_gemini_api_key_here'
  );

  res.json({
    status: 'ok',
    serverRunning: true,
    hasGeminiApiKey: isConfigured,
    keyCharCount: isConfigured ? rawKey.trim().length : 0,
    loadedEnvFile: loadedEnvPath || 'Default environment',
    workingDirectory: process.cwd(),
    serverDirectory: __dirname,
    activeModel: PRIMARY_MODEL,
    fallbackModel: FALLBACK_MODEL,
    checkedPaths: possibleEnvPaths.map(p => ({
      path: p,
      found: fs.existsSync(p)
    })),
    serverTimestamp: new Date().toISOString()
  });
});

/**
 * Health check & configuration status
 * Never reveals the actual API key value to the client
 */
app.get('/api/health', (req, res) => {
  const rawKey = process.env.GEMINI_API_KEY;
  const hasKey = Boolean(
    rawKey && 
    rawKey.trim() !== '' && 
    rawKey !== 'your_gemini_api_key_here'
  );

  res.json({
    status: 'ok',
    hasApiKey: hasKey,
    model: PRIMARY_MODEL,
    envLoaded: Boolean(loadedEnvPath),
    envPath: loadedEnvPath || null
  });
});

/**
 * 1. AI Productivity Chat
 * Answers user questions on time management, productivity, and organization
 */
app.post('/api/chat', async (req, res) => {
  try {
    const ai = getGenAIClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Please add your GEMINI_API_KEY to the .env file and restart the server.'
      });
    }

    const { message, history } = req.body;

    // Input Validation
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'A valid message string is required.' });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: 'Message exceeds maximum length of 2000 characters.' });
    }

    // Build context with optional recent history (max 4 turns to respect free-tier limits)
    let promptContents = [];
    if (Array.isArray(history) && history.length > 0) {
      const recentHistory = history.slice(-4).map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${String(h.text || '').slice(0, 500)}`).join('\n');
      promptContents.push(`Recent conversation:\n${recentHistory}\n`);
    }
    promptContents.push(`User Question: ${message.trim()}`);

    const response = await generateWithFallback(ai, {
      contents: promptContents.join('\n'),
      config: {
        systemInstruction: `You are SmartTask AI, a high-performance productivity coach and task strategist inside the SmartTask Pro dashboard.
Your goal is to provide concise, practical, highly actionable advice on time management, prioritization, overcoming procrastination, and organizing workflows.
Guidelines:
- Keep answers concise and direct (under 250 words when possible).
- Use clear bullet points and bold highlights for readability.
- Never ask for personal passwords, tokens, or API keys.
- Be encouraging, realistic, and focused on immediate action.`,
        temperature: 0.7,
        maxOutputTokens: 600
      }
    });

    const reply = response.text || 'I could not generate a response. Please try asking again.';
    res.json({ reply });
  } catch (error) {
    console.error('Error in /api/chat:', error.message || error);
    res.status(500).json({
      error: error.message?.includes('API_KEY_INVALID') 
        ? 'Invalid Gemini API key. Please check your GEMINI_API_KEY in the .env file.'
        : 'Failed to communicate with Gemini AI. Please check your connection or quota.'
    });
  }
});

/**
 * 2. Break Down a Task into Subtasks
 * Takes a single task title and generates 3-5 manageable steps
 */
app.post('/api/ai/breakdown', async (req, res) => {
  try {
    const ai = getGenAIClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured in .env'
      });
    }

    const { taskTitle, priority, dueDate } = req.body;

    if (!taskTitle || typeof taskTitle !== 'string' || taskTitle.trim().length === 0) {
      return res.status(400).json({ error: 'Valid task title is required.' });
    }

    const sanitizedTitle = taskTitle.trim().slice(0, 150);
    const sanitizedPriority = ['high', 'medium', 'low'].includes(priority) ? priority : 'medium';

    const prompt = `You are a productivity task breakdown specialist.
Task to break down: "${sanitizedTitle}"
Current priority: ${sanitizedPriority}
Due date: ${dueDate || 'Not specified'}

Break this task down into 3 to 5 realistic, concrete, chronological subtasks that make progress simple and frictionless.
Return a valid JSON array of objects conforming to this schema:
[
  {
    "title": "Clear action verb + description (under 80 chars)",
    "priority": "high" | "medium" | "low"
  }
]`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
        maxOutputTokens: 600
      }
    });

    let steps = [];
    try {
      const parsed = JSON.parse(response.text || '[]');
      steps = Array.isArray(parsed) ? parsed : (parsed.steps || []);
    } catch (parseErr) {
      console.warn('Could not parse JSON output directly, falling back:', parseErr);
      steps = [
        { title: `Prepare and outline resources for ${sanitizedTitle}`, priority: 'medium' },
        { title: `Execute core phase of ${sanitizedTitle}`, priority: 'high' },
        { title: `Review and finalize ${sanitizedTitle}`, priority: 'low' }
      ];
    }

    res.json({
      originalTask: sanitizedTitle,
      steps: steps.map(s => ({
        title: String(s.title || '').trim().slice(0, 120),
        priority: ['high', 'medium', 'low'].includes(s.priority) ? s.priority : 'medium'
      }))
    });
  } catch (error) {
    console.error('Error in /api/ai/breakdown:', error.message || error);
    res.status(500).json({ error: 'Failed to break down task with Gemini AI.' });
  }
});

/**
 * 3. Analyze Pending Task Queue & Recommend Priorities
 * Takes user's pending tasks and recommends priority adjustments
 */
app.post('/api/ai/analyze-queue', async (req, res) => {
  try {
    const ai = getGenAIClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured in .env'
      });
    }

    const { tasks } = req.body;

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'An array of tasks is required.' });
    }

    // Sanitize and limit to only pending tasks (up to 20 to protect free-tier quotas)
    const pendingTasks = tasks
      .filter(t => !t.completed && t.title)
      .slice(0, 20)
      .map(t => ({
        id: String(t.id),
        title: String(t.title).slice(0, 100),
        priority: t.priority || 'medium',
        dueDate: t.dueDate || 'none'
      }));

    if (pendingTasks.length === 0) {
      return res.json({
        summary: 'You have no pending tasks to analyze! Your queue is completely clear.',
        adjustments: []
      });
    }

    const prompt = `Analyze this list of pending tasks and provide priority optimization advice.
Tasks:
${JSON.stringify(pendingTasks, null, 2)}

Return a JSON object with:
1. "summary": A brief 1-2 sentence executive assessment of their workload.
2. "topFocusTask": The single most critical task they should work on right now.
3. "adjustments": An array of any tasks whose priority should be adjusted (e.g. upgraded to "high" due to proximity/importance or downgraded to "low").
Format:
{
  "summary": "string",
  "topFocusTask": "string",
  "adjustments": [
    {
      "id": "task id from input",
      "title": "task title",
      "suggestedPriority": "high" | "medium" | "low",
      "reason": "short explanation"
    }
  ]
}`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
        maxOutputTokens: 800
      }
    });

    let result = { summary: '', topFocusTask: '', adjustments: [] };
    try {
      result = JSON.parse(response.text || '{}');
    } catch (parseErr) {
      console.warn('JSON parse error in analyze-queue:', parseErr);
    }

    res.json(result);
  } catch (error) {
    console.error('Error in /api/ai/analyze-queue:', error.message || error);
    res.status(500).json({ error: 'Failed to analyze task queue with Gemini AI.' });
  }
});

/**
 * 4. Generate Daily Time-Blocked Schedule
 * Takes pending tasks and produces a proposed daily schedule
 */
app.post('/api/ai/schedule', async (req, res) => {
  try {
    const ai = getGenAIClient();
    if (!ai) {
      return res.status(503).json({
        error: 'Gemini API key is not configured in .env'
      });
    }

    const { tasks, startTime = '09:00', endTime = '17:00' } = req.body;

    if (!Array.isArray(tasks)) {
      return res.status(400).json({ error: 'An array of tasks is required.' });
    }

    const pendingTasks = tasks
      .filter(t => !t.completed && t.title)
      .slice(0, 15)
      .map(t => ({
        title: String(t.title).slice(0, 100),
        priority: t.priority || 'medium',
        dueDate: t.dueDate || 'none'
      }));

    if (pendingTasks.length === 0) {
      return res.json({
        overview: 'No pending tasks to schedule. You are all caught up!',
        blocks: []
      });
    }

    const prompt = `Create a realistic, balanced time-blocked daily schedule between ${startTime} and ${endTime}.
Allocate high-priority and due-soon tasks during peak focus windows, with short buffer breaks.
Tasks to schedule:
${JSON.stringify(pendingTasks, null, 2)}

Return a JSON object conforming strictly to:
{
  "overview": "Brief 1-sentence schedule strategy",
  "blocks": [
    {
      "time": "e.g. 09:00 AM - 10:30 AM",
      "activity": "task title or break name",
      "focusTip": "short focus guidance"
    }
  ]
}`;

    const response = await generateWithFallback(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
        maxOutputTokens: 900
      }
    });

    let result = { overview: '', blocks: [] };
    try {
      result = JSON.parse(response.text || '{}');
    } catch (parseErr) {
      console.warn('JSON parse error in schedule:', parseErr);
    }

    res.json(result);
  } catch (error) {
    console.error('Error in /api/ai/schedule:', error.message || error);
    res.status(500).json({ error: 'Failed to generate schedule with Gemini AI.' });
  }
});

// ==========================================
// Vercel & Standalone Server Export
// ==========================================
export default app;

// Start Local Server only when running standalone (not in Vercel serverless environment)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    const hasKey = Boolean(
      process.env.GEMINI_API_KEY && 
      process.env.GEMINI_API_KEY.trim() !== '' && 
      process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here'
    );

    console.log(`=======================================================`);
    console.log(`🚀 SmartTask Pro server running at: http://localhost:${PORT}`);
    console.log(`📁 Loaded .env from: ${loadedEnvPath || 'None'}`);
    console.log(`🤖 Gemini AI Status: ${hasKey ? 'ACTIVE (Key Configured)' : 'KEY MISSING (Set GEMINI_API_KEY in .env)'}`);
    console.log(`⚡ Model: ${PRIMARY_MODEL} (Fallback: ${FALLBACK_MODEL})`);
    console.log(`🔍 Diagnostic URL: http://localhost:${PORT}/api/debug-status`);
    console.log(`=======================================================`);
  });
}
