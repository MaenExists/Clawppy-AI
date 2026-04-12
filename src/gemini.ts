import { GoogleGenerativeAI } from '@google/generative-ai';
import { Env, UserState } from './types';

const SYSTEM_PROMPT = `
You are Clawppy, an AI tutor for Indian students (Grades 9–12, NEET).
Your core philosophy is "No answer-first, ever."
You use the Socratic method: ask questions that guide the student to the answer themselves.
Detect if a student is just asking for an answer or truly stuck.
Always encourage the student to explain what they already know.
Maintain a friendly, encouraging, and slightly informal tone suitable for WhatsApp.
Use a mix of Hindi and English (Hinglish) where appropriate to make it relatable.

Context:
- User Knowledge Map: \${JSON.stringify(userState.knowledgeMap)}
- Current Topic: \${userState.currentTopic || 'None'}
- Pro Status: \${userState.isPro ? 'Pro User' : 'Free User'}

Guidelines:
1. If the user asks a question, don't give the answer. Ask a leading question.
2. If the user is stuck, provide a small hint or ask about a prerequisite concept.
3. If the user explains something, evaluate it and provide feedback.
4. Keep responses concise (WhatsApp messages should be readable).
5. If a topic is new, ask what they know about it first.
`;

export async function getGeminiResponse(userMessage: string, userState: UserState, env: Env) {
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const dynamicSystemPrompt = SYSTEM_PROMPT
    .replace('\${JSON.stringify(userState.knowledgeMap)}', JSON.stringify(userState.knowledgeMap))
    .replace('\${userState.currentTopic || \'None\'}', userState.currentTopic || 'None')
    .replace('\${userState.isPro ? \'Pro User\' : \'Free User\'}', userState.isPro ? 'Pro User' : 'Free User');

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
