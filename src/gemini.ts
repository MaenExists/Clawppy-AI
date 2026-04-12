import { GoogleGenerativeAI } from '@google/generative-ai';
import { Env, UserState, TopicState } from './types';

const SYSTEM_PROMPT = `
You are Clawppy, an AI tutor for Indian students (Grades 9–12, NEET).
Your core philosophy is "No answer-first, ever."
You use the Socratic method: ask questions that guide the student to the answer themselves.
Detect if a student is just asking for an answer or truly stuck.
Always encourage the student to explain what they already know.
Maintain a friendly, encouraging, and slightly informal tone suitable for WhatsApp.
Use a mix of Hindi and English (Hinglish) where appropriate to make it relatable.

Context:
- User Knowledge Map: \${USER_STATE_JSON}
- Current Topic: \${CURRENT_TOPIC}
- Pro Status: \${PRO_STATUS}

Guidelines:
1. If the user asks a question, don't give the answer. Ask a leading question.
2. If the user is stuck, provide a small hint or ask about a prerequisite concept.
3. If the user explains something, evaluate it and provide feedback.
4. Keep responses concise (WhatsApp messages should be readable).
5. If a topic is new, ask what they know about it first.
6. If the user mentions a subject or topic they want to study, acknowledge it.
`;

const INTENT_PROMPT = `
Analyze the following user message and current user state. 
Return a JSON object with:
- "newTopic": string | null (if the user wants to start/change a topic)
- "confidenceRating": number | null (1-10, if the user rated their confidence)
- "quizAnswers": { question: string, answer: string, correct: boolean }[] | null (if the user is answering a quiz)
- "evaluation": { topic: string, score: number, feedback: string } | null (if the user explained a concept)

User Message: "\${MESSAGE}"
User State: \${USER_STATE_JSON}

Respond ONLY with the JSON.
`;

export async function getGeminiResponse(userMessage: string, userState: UserState, env: Env) {
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const dynamicSystemPrompt = SYSTEM_PROMPT
    .replace('\${USER_STATE_JSON}', JSON.stringify(userState.knowledgeMap))
    .replace('\${CURRENT_TOPIC}', userState.currentTopic || 'None')
    .replace('\${PRO_STATUS}', userState.isPro ? 'Pro User' : 'Free User');

  const chat = model.startChat({
    history: [],
    generationConfig: {
      maxOutputTokens: 1000,
    },
  });

  const result = await chat.sendMessage([
    { text: dynamicSystemPrompt },
    { text: userMessage }
  ]);

  const response = await result.response;
  return response.text();
}

export async function analyzeIntent(userMessage: string, userState: UserState, env: Env) {
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = INTENT_PROMPT
    .replace('\${MESSAGE}', userMessage)
    .replace('\${USER_STATE_JSON}', JSON.stringify(userState));

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
const FEYNMAN_PROMPT = `
Evaluate the following explanation using the Feynman Technique.
Topic: "\${TOPIC}"
Student Explanation: "\${EXPLANATION}"

Criteria:
- Simplicity: Is it simple? (No jargon)
- Accuracy: Are core concepts correct?
- Completeness: Are major errors present?

Return a JSON object with:
- "score": number (0-100)
- "feedback": string (Constructive feedback in Hinglish)
- "pass": boolean (true if score > 70)

Respond ONLY with the JSON.
`;

export async function evaluateFeynman(topic: string, explanation: string, env: Env) {
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = FEYNMAN_PROMPT
    .replace('\${TOPIC}', topic)
    .replace('\${EXPLANATION}', explanation);

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
  try {
    const cleanJson = text.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (e) {
    console.error('Failed to parse Feynman evaluation JSON:', text);
    return null;
  }
}
