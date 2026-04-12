import OpenAI from 'openai';
import { Env, UserState } from './types';

const SYSTEM_PROMPT = `
You are Clawppy, an AI Socratic Tutor for Indian students (Grades 9–12, NEET/JEE).
Your mission is to help students learn actively, not just provide answers.

CORE IDENTITY:
- Name: Clawppy
- Personality: Friendly, encouraging, patient, and culturally resonant.
- Language: Fluent, professional, and warm English.
- Motto: "Master the concepts, own your future."

THE CLAWPPY WAY:
1. Socratic Hook: Always start by asking what the student already knows about a topic.
2. The Struggle: If they are stuck, give a tiny hint or an analogy.
3. Calibration: After a small victory, ask "How confident are you (1-10)?" and then test them.
4. Feynman Boss: To master a topic, they must explain it to you like you're a 10-year-old.

RULES:
- NEVER give the final answer directly.
- Keep responses concise for WhatsApp.
- If they ask for an answer, say "If I give you the answer, your brain will go on a vacation. Let's exercise it instead!"
- Detect "False Confidence" (High rating + low quiz score).

CONTEXT:
- User Map: \${USER_STATE_JSON}
- Current Topic: \${CURRENT_TOPIC}
- Pro Status: \${PRO_STATUS}
`;

function getClient(env: Env) {
  return new OpenAI({
    apiKey: env.OPENCODE_ZEN_API_KEY,
    baseURL: env.OPENCODE_ZEN_BASE_URL,
  });
}

export async function getAIResponse(userMessage: string, userState: UserState, env: Env) {
  const openai = getClient(env);
  
  const dynamicSystemPrompt = SYSTEM_PROMPT
    .replace('\${USER_STATE_JSON}', JSON.stringify(userState.knowledgeMap))
    .replace('\${CURRENT_TOPIC}', userState.currentTopic || 'None')
    .replace('\${PRO_STATUS}', userState.isPro ? 'Pro User' : 'Free User');

  const response = await openai.chat.completions.create({
    model: env.OPENCODE_ZEN_MODEL,
    messages: [
      { role: 'system', content: dynamicSystemPrompt },
      { role: 'user', content: userMessage }
    ],
  });

  return response.choices[0].message.content || "Sorry, I'm a bit sleepy. Can you say that again?";
}

export async function analyzeIntent(userMessage: string, userState: UserState, env: Env) {
  const openai = getClient(env);

  const prompt = `
Analyze the user message and state. Return ONLY JSON.
- "newTopic": string | null
- "confidenceRating": number | null (1-10)
- "evaluation": { topic: string, score: number, feedback: string } | null

User Message: "\${userMessage}"
User State: \${JSON.stringify(userState)}
`.trim();

  const response = await openai.chat.completions.create({
    model: env.OPENCODE_ZEN_MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  });

  try {
    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (e) {
    return null;
  }
}

export async function evaluateFeynman(topic: string, explanation: string, env: Env) {
  const openai = getClient(env);

  const prompt = `
Evaluate as Clawppy (Socratic/English). Topic: "\${topic}". Explanation: "\${explanation}".
Criteria: Simplicity (no jargon), Accuracy, Completeness.
Return ONLY JSON:
- "score": number (0-100)
- "feedback": string (English)
- "pass": boolean (score > 70)
`.trim();

  const response = await openai.chat.completions.create({
    model: env.OPENCODE_ZEN_MODEL,
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' }
  });

  try {
    return JSON.parse(response.choices[0].message.content || '{}');
  } catch (e) {
    return null;
  }
}
