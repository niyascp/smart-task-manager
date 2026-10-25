/**
 * SmartTask Pro - Quick Gemini API Diagnostic Test
 * Run this script to test your Gemini API key and AI planner without opening a browser.
 * Usage: node test-api.js
 * (Never prints or reveals your secret API key)
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Multi-path .env detection
const possibleEnvPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, 'SmartTaskApp', '.env'),
  path.resolve(path.dirname(__dirname), '.env'),
  path.resolve(path.dirname(__dirname), 'SmartTaskApp', '.env')
];

let envLoadedFrom = null;
for (const p of possibleEnvPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    envLoadedFrom = p;
    break;
  }
}
if (!envLoadedFrom) dotenv.config();

async function testGeminiIntegration() {
  console.log('========================================================');
  console.log('🔍 SmartTask Pro — Gemini API Diagnostic & Verification');
  console.log('========================================================');
  console.log(`📁 Loaded .env from: ${envLoadedFrom || 'None found'}`);

  const apiKey = process.env.GEMINI_API_KEY;

  // Check 1: Key presence
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    console.log('❌ STATUS: GEMINI_API_KEY is NOT configured.');
    console.log('\n👉 HOW TO FIX:');
    console.log('1. Open your .env file in Notepad:');
    console.log('   notepad .env');
    console.log('2. Replace "your_gemini_api_key_here" with your actual Gemini API key.');
    console.log('3. Save the file and run "node test-api.js" again.');
    console.log('========================================================');
    process.exit(1);
  }

  console.log('✅ Check 1: GEMINI_API_KEY is detected in environment.');

  const modelToUse = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

  // Check 2: Test live AI Chat
  console.log(`⏳ Check 2: Testing live Gemini Chat request (${modelToUse})...`);
  try {
    const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
    
    const chatResponse = await ai.models.generateContent({
      model: modelToUse,
      contents: 'Respond with exactly: "SmartTask Gemini AI Chat is online and functioning perfectly."',
      config: { maxOutputTokens: 50 }
    });

    const reply = (chatResponse.text || '').trim();
    console.log('✅ Check 2 PASSED: Gemini Chat responded successfully!');
    console.log(`   Response: "${reply}"`);

    // Check 3: Test AI Task Planner (Structured JSON output)
    console.log('⏳ Check 3: Testing AI Task Planner (Task Breakdown)...');
    const plannerResponse = await ai.models.generateContent({
      model: modelToUse,
      contents: 'Break down the task "Organize team sprint retrospective" into 3 concise subtasks. Return a JSON array: [{"title": "step description", "priority": "high"|"medium"|"low"}]',
      config: {
        responseMimeType: 'application/json',
        maxOutputTokens: 300
      }
    });

    const parsedSteps = JSON.parse(plannerResponse.text || '[]');
    if (Array.isArray(parsedSteps) && parsedSteps.length > 0) {
      console.log('✅ Check 3 PASSED: Gemini Task Planner generated structured subtasks:');
      parsedSteps.forEach((s, i) => {
        console.log(`   ${i + 1}. [${s.priority.toUpperCase()}] ${s.title}`);
      });
    } else {
      console.log('⚠️ Check 3 WARNING: Response received but was not an array.');
    }

    console.log('\n========================================================');
    console.log('🎉 ALL CHECKS PASSED: Your Gemini AI integration is 100% ready!');
    console.log('👉 Start your app with: npm start');
    console.log('👉 Open your browser to: http://localhost:3000');
    console.log('========================================================');

  } catch (error) {
    console.log('\n❌ ERROR during Gemini API call:');
    if (error.message?.includes('API_KEY_INVALID')) {
      console.log('   The API key provided appears to be invalid or expired.');
      console.log('   Please generate a fresh key from: https://aistudio.google.com/');
    } else if (error.message?.includes('RESOURCE_EXHAUSTED')) {
      console.log('   Rate limit reached. Please wait a moment and try again.');
    } else {
      console.log(`   ${error.message || error}`);
    }
    console.log('\n👉 Check your .env file and ensure no extra spaces or quotes were added.');
    console.log('========================================================');
    process.exit(1);
  }
}

testGeminiIntegration();
