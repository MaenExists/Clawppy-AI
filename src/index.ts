import { Env, TopicState } from './types';
import { getUserState, saveUserState } from './user';
import { getGeminiResponse, analyzeIntent, evaluateFeynman } from './gemini';
import { sendWhatsAppMessage } from './twilio';
import { getDueReviews, calculateNextReview } from './scheduler';
import { createPaymentLink } from './payments';

export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method !== 'POST') {
			return new Response('Method Not Allowed', { status: 405 });
		}

		try {
			const formData = await request.formData();
			const from = formData.get('From') as string;
			const body = formData.get('Body') as string;

			if (!from || !body) {
				return new Response('Bad Request', { status: 400 });
			}

			// Clean up phone number (whatsapp:+91...)
			const phone = from.replace('whatsapp:', '');

			// Get user state
			const userState = await getUserState(phone, env);

			// Update streak logic
			const today = new Date().toISOString().split('T')[0];
			const lastActiveDate = userState.lastActive.split('T')[0];
			if (lastActiveDate !== today) {
				const yesterday = new Date(new Date().setDate(new Date().getDate() - 1)).toISOString().split('T')[0];
				if (lastActiveDate === yesterday) {
					userState.streak += 1;
				} else {
					userState.streak = 1;
				}
			}

			// Handle "Hi" or similar for first-time or greeting
			const greetingTerms = ['hi', 'hello', 'hey', 'start'];
			if (greetingTerms.includes(body.toLowerCase())) {
				const welcomeMsg = `Welcome to Clawppy! 🐾 I'm your AI tutor.\n\n` +
					`- I teach via Socratic method (no direct answers!)\n` +
					`- Track your progress via /map\n` +
					`- Maintain your streak: \${userState.streak} days 🔥\n\n` +
					`What subject would you like to study today?`;
				await sendWhatsAppMessage(from, welcomeMsg, env);
				return new Response('OK');
			}

			// Handle commands
			if (body.startsWith('/')) {
				const commandParts = body.split(' ');
				const command = commandParts[0].toLowerCase();
				if (command === '/map') {
					let mapText = '*Your Knowledge Map* 🗺️\n\n';
					const topics = Object.entries(userState.knowledgeMap);
					if (topics.length === 0) {
						mapText += "Your map is empty. Let's fix that! What subject do you want to study first?";
					} else {
						for (const [topic, state] of topics) {
							const emoji = state.status === 'mastered' ? '✅' : state.status === 'struggling' ? '🔴' : '🟡';
							mapText += `\${emoji} *[\${topic}]*\n   - Status: \${state.status}\n   - Confidence: \${Math.round(state.confidence * 10)}/10\n   - Mastery: \${Math.round(state.actualScore)}%\n\n`;
						}
					}
					mapText += '\n*Streak:* ' + userState.streak + ' days 🔥';
					await sendWhatsAppMessage(from, mapText, env);
					return new Response('OK');
				}
				if (command === '/reset') {
					userState.knowledgeMap = {};
					userState.currentTopic = undefined;
					await saveUserState(userState, env);
					await sendWhatsAppMessage(from, 'Your knowledge map has been reset.', env);
					return new Response('OK');
				}
				if (command === '/review') {
					const topic = commandParts.slice(1).join(' ');
					if (topic && userState.knowledgeMap[topic]) {
						userState.currentTopic = topic;
						await saveUserState(userState, env);
						await sendWhatsAppMessage(from, `Starting review for *\${topic}*. What do you remember?`, env);
					} else {
						const due = getDueReviews(userState.knowledgeMap);
						if (due.length > 0) {
							const firstDue = due[0];
							userState.currentTopic = firstDue;
							await saveUserState(userState, env);
							await sendWhatsAppMessage(from, `⏰ Review time: *\${firstDue}*. You scored \${Math.round(userState.knowledgeMap[firstDue].actualScore)}% last time. Quick question: [question placeholder]`, env);
						} else {
							await sendWhatsAppMessage(from, 'No reviews due! Want to learn something new?', env);
						}
					}
					return new Response('OK');
				}
				if (command === '/upgrade') {
					const link = await createPaymentLink(userState, env);
					const upgradeMsg = `*Clawppy Pro* is ₹49/month.\n\n` +
						`- Unlimited questions\n` +
						`- False confidence detection\n` +
						`- Streak protection\n` +
						`- Priority Feynman evaluation\n\n` +
						`Click here to upgrade: \${link}\n\n` +
						`Type 'YES' to confirm you want to proceed!`;
					await sendWhatsAppMessage(from, upgradeMsg, env);
					return new Response('OK');
				}
			}

			// Feynman evaluation logic (if current topic is set and user message is long)
			if (userState.currentTopic && body.length > 100) {
				const feynman = await evaluateFeynman(userState.currentTopic, body, env);
				if (feynman) {
					userState.knowledgeMap[userState.currentTopic].actualScore = feynman.score;
					userState.knowledgeMap[userState.currentTopic].lastReviewed = new Date().toISOString();
					userState.knowledgeMap[userState.currentTopic].nextReview = calculateNextReview(userState.knowledgeMap[userState.currentTopic]);
					
					if (feynman.pass) {
						userState.knowledgeMap[userState.currentTopic].status = 'mastered';
					} else if (feynman.score < 50) {
						userState.knowledgeMap[userState.currentTopic].status = 'struggling';
					}
					
					await saveUserState(userState, env);
					await sendWhatsAppMessage(from, feynman.feedback, env);
					return new Response('OK');
				}
			}

			// Analyze intent
			const intent = await analyzeIntent(body, userState, env);
			if (intent) {
				if (intent.newTopic) {
					userState.currentTopic = intent.newTopic;
					if (!userState.knowledgeMap[intent.newTopic]) {
						userState.knowledgeMap[intent.newTopic] = {
							status: 'unconscious_incompetence',
							confidence: 0,
							actualScore: 0,
							lastReviewed: new Date().toISOString(),
							nextReview: new Date().toISOString(),
						};
					}
				}
				if (intent.confidenceRating !== null && userState.currentTopic) {
					userState.knowledgeMap[userState.currentTopic].confidence = intent.confidenceRating / 10;
				}
				if (intent.evaluation && userState.currentTopic) {
					const topic = intent.evaluation.topic || userState.currentTopic;
					if (!userState.knowledgeMap[topic]) {
						userState.knowledgeMap[topic] = {
							status: 'struggling',
							confidence: 0,
							actualScore: 0,
							lastReviewed: new Date().toISOString(),
							nextReview: new Date().toISOString(),
						};
					}
					userState.knowledgeMap[topic].actualScore = intent.evaluation.score;
					userState.knowledgeMap[topic].lastReviewed = new Date().toISOString();
					userState.knowledgeMap[topic].nextReview = calculateNextReview(userState.knowledgeMap[topic]);
					
					// False confidence detection
					if (userState.knowledgeMap[topic].confidence >= 0.7 && userState.knowledgeMap[topic].actualScore < 50) {
						userState.knowledgeMap[topic].status = 'unconscious_incompetence';
					} else if (userState.knowledgeMap[topic].actualScore >= 85) {
						userState.knowledgeMap[topic].status = 'mastered';
					} else if (userState.knowledgeMap[topic].actualScore < 50) {
						userState.knowledgeMap[topic].status = 'struggling';
					}
				}
			}

			// Get response from Gemini
			const responseText = await getGeminiResponse(body, userState, env);

			// Update user state and save
			await saveUserState(userState, env);

			// Send response back via Twilio
			await sendWhatsAppMessage(from, responseText, env);

			return new Response('OK');
		} catch (error) {
			console.error('Error handling webhook:', error);
			return new Response('Internal Server Error', { status: 500 });
		}
	},
} satisfies ExportedHandler<Env>;
