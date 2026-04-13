import OpenAI from 'openai';
import { Env, UserState } from './types';

function getClient(env: Env): OpenAI {
	return new OpenAI({
		apiKey: env.OPENCODE_ZEN_API_KEY,
		baseURL: env.OPENCODE_ZEN_BASE_URL || 'https://opencode.ai/zen/v1',
	});
}

// Check if we should use mock mode
function isMockMode(env: Env): boolean {
	// Use mock mode if key is literally "placeholder" or if it's empty/missing
	// Also use mock if the user explicitly sets DISABLE_AI=true
	return !env.OPENCODE_ZEN_API_KEY || 
	       env.OPENCODE_ZEN_API_KEY === 'placeholder' ||
	       env.OPENCODE_ZEN_API_KEY === '' ||
	       env.DISABLE_AI === 'true';
}

const SYSTEM_PROMPT = `You are Clawppy 🐾, an AI Socratic Tutor for Indian students (Grades 9-12, NEET/JEE).

PERSONALITY:
- Friendly, encouraging, patient
- Speaks clear English with occasional Hindi words
- Uses emojis appropriately

METHODOLOGY (NEVER DEVIATE):
1. Socratic Questions: Ask what they know first, never give direct answers
2. Micro-hints: When stuck, give tiny hints or relatable analogies (cricket, chai, etc.)
3. Confidence Check: Ask "How confident are you? (1-10)" then validate with a quick question
4. Feynman Test: To master a topic, they explain it simply like you're a 10-year-old

RULES:
- NEVER give the final answer directly
- If they ask for answer, say: "Let your brain exercise! Try explaining what you know..."
- Keep responses under 300 characters for WhatsApp
- Detect false confidence: high confidence + wrong answers = gap to fill

CONTEXT:
- Current Topic: {currentTopic}
- Knowledge Map: {knowledgeMap}
- Pro Status: {isPro}`;

export async function getAIResponse(
	userMessage: string,
	userState: UserState,
	env: Env
): Promise<string> {
	try {
		const client = getClient(env);
		const mockMode = isMockMode(env);

		if (mockMode) {
			// Development mode responses
			const lower = userMessage.toLowerCase();
			if (lower.includes('what is') || lower.includes('explain')) {
				return "Great question! Before I explain, tell me - what do you already know about this? 🤔";
			}
			if (lower.includes('dont know') || lower.includes('don\'t know') || lower.length < 5) {
				return "No worries! Let's break it down. Can you think of a real-life example related to this?";
			}
			return "I'm Clawppy! Let's learn together. What concept would you like to explore?";
		}

		const knowledgeMap = Object.entries(userState.knowledgeMap)
			.map(([topic, state]) => `${topic}: ${state.status} (${Math.round(state.actualScore)}%)`)
			.join(', ') || 'None yet';

		const prompt = SYSTEM_PROMPT
			.replace('{currentTopic}', userState.currentTopic || 'None')
			.replace('{knowledgeMap}', knowledgeMap)
			.replace('{isPro}', userState.isPro ? 'Pro ✅' : 'Free');

		const response = await client.chat.completions.create({
			model: env.OPENCODE_ZEN_MODEL || 'minimax-m2.5',
			messages: [
				{ role: 'system', content: prompt },
				{ role: 'user', content: userMessage }
			],
			temperature: 0.7,
			max_tokens: 300,
		});

		return response.choices[0]?.message?.content || "Let's try that again! What's your question?";
	} catch (error: any) {
		console.error('AI Error:', error?.message || error);
		
		// If API fails (no credits, invalid key, etc.), fall back to mock mode
		if (error?.message?.includes('CreditsError') || 
			error?.message?.includes('No payment method') ||
			error?.message?.includes('401') ||
			error?.message?.includes('Invalid API key')) {
			console.log('⚠️ API unavailable, falling back to mock mode');
			const lower = userMessage.toLowerCase();
			if (lower.includes('what is') || lower.includes('explain')) {
				return "Great question! Before I explain, tell me - what do you already know about this? 🤔";
			}
			if (lower.includes('dont know') || lower.includes('don\'t know') || lower.length < 5) {
				return "No worries! Let's break it down. Can you think of a real-life example related to this?";
			}
			return "I'm Clawppy! Let's learn together. What concept would you like to explore?";
		}
		
		return "Something went wrong! Try again or /start fresh.";
	}
}

export interface IntentResult {
	newTopic?: string;
	confidenceRating?: number | null;
	evaluation?: {
		topic: string;
		score: number;
		feedback: string;
	} | null;
}

export async function analyzeIntent(
	userMessage: string,
	userState: UserState,
	env: Env
): Promise<IntentResult | null> {
	try {
		const client = getClient(env);
		const mockMode = isMockMode(env);

		// Simple intent detection for mock mode
		if (mockMode) {
			const lower = userMessage.toLowerCase();
			const topics = ['physics', 'chemistry', 'maths', 'biology', 'thermodynamics', 'calculus', 'algebra'];
			
			for (const topic of topics) {
				if (lower.includes(topic)) {
					return { newTopic: topic.charAt(0).toUpperCase() + topic.slice(1) };
				}
			}

			// Detect confidence rating
			const confidenceMatch = userMessage.match(/(\d+)\/10|confidence\s*(\d+)/i);
			if (confidenceMatch) {
				const rating = parseInt(confidenceMatch[1] || confidenceMatch[2]);
				if (rating >= 1 && rating <= 10) {
					return { confidenceRating: rating };
				}
			}

			return { newTopic: null };
		}

		const prompt = `Analyze this WhatsApp message from a student. Return ONLY valid JSON:

{
  "newTopic": "string or null - subject/topic they're asking about",
  "confidenceRating": "number 1-10 or null - if they rate their understanding",
  "evaluation": "object or null - if they answered a quiz question {topic, score, feedback}"
}

Message: "${userMessage}"
Current Topic: ${userState.currentTopic || 'none'}
Previous Quiz Score: ${userState.currentTopic ? userState.knowledgeMap[userState.currentTopic]?.actualScore || 'none' : 'none'}`;

		const response = await client.chat.completions.create({
			model: env.OPENCODE_ZEN_MODEL || 'minimax-m2.5',
			messages: [{ role: 'user', content: prompt }],
			response_format: { type: 'json_object' },
			temperature: 0.3,
		});

		const content = response.choices[0]?.message?.content;
		return content ? JSON.parse(content) : null;
	} catch (error: any) {
		console.error('Intent Analysis Error:', error?.message || error);
		return null;
	}
}

export interface FeynmanResult {
	score: number;
	feedback: string;
	pass: boolean;
}

export async function evaluateFeynman(
	topic: string,
	explanation: string,
	env: Env
): Promise<FeynmanResult | null> {
	try {
		const client = getClient(env);
		const mockMode = isMockMode(env);

		if (mockMode) {
			// Mock evaluation
			const wordCount = explanation.split(' ').length;
			const hasJargon = /\b(equation|formula|therefore|thus|hence)\b/i.test(explanation);
			
			let score = Math.min(100, wordCount * 2);
			if (hasJargon) score -= 20;
			
			return {
				score,
				feedback: score > 70 
					? `Great explanation of ${topic}! 🎉 You made it simple. Topic mastered!`
					: `Good try on ${topic}! Try explaining it simpler, like to a 5-year-old.`,
				pass: score > 70
			};
		}

		const prompt = `Evaluate this student's explanation of "${topic}" as if you're a curious 10-year-old.
Return ONLY valid JSON:

{
  "score": "number 0-100",
  "feedback": "string - encouraging feedback in English",
  "pass": "boolean - true if score > 70"
}

Explanation: "${explanation}"`;

		const response = await client.chat.completions.create({
			model: env.OPENCODE_ZEN_MODEL || 'minimax-m2.5',
			messages: [{ role: 'user', content: prompt }],
			response_format: { type: 'json_object' },
			temperature: 0.3,
		});

		const content = response.choices[0]?.message?.content;
		return content ? JSON.parse(content) : null;
	} catch (error: any) {
		console.error('Feynman Evaluation Error:', error?.message || error);
		return null;
	}
}