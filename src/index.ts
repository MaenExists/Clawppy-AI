import { Env, TopicState } from './types';
import { getUserState, saveUserState, getOrCreateUser } from './user';
import { getAIResponse, analyzeIntent, evaluateFeynman } from './ai';
import { sendWhatsAppMessage, sendWhatsAppReplyButtons } from './twilio';
import { getDueReviews, calculateNextReview } from './scheduler';
import { createPaymentLink, createYearPlanLink, processPaymentWebhook } from './payments';
import { checkRateLimit } from './limiter';

// ============================================================================
// ROUTER - Handle different endpoints
// ============================================================================

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;

		// Route: Twilio WhatsApp Webhook
		if (request.method === 'POST' && path === '/') {
			return handleWebhook(request, env, ctx);
		}

		// Route: Razorpay Payment Callback
		if (request.method === 'GET' && path === '/payment-callback') {
			return handlePaymentCallback(request, env);
		}

		// Route: Razorpay Webhook
		if (request.method === 'POST' && path === '/webhook') {
			return handlePaymentWebhook(request, env);
		}

		// Route: Health Check
		if (request.method === 'GET' && path === '/health') {
			return new Response(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }), {
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Route: Not Found
		return new Response('Not Found', { status: 404 });
	},
} satisfies ExportedHandler<Env>;

// ============================================================================
// MAIN WEBHOOK HANDLER
// ============================================================================

async function handleWebhook(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	try {
		const formData = await request.formData();
		const from = formData.get('From') as string;
		const body = formData.get('Body') as string;

		if (!from || !body) {
			return new Response('Bad Request', { status: 400 });
		}

		const phone = from.replace('whatsapp:', '');
		console.log(`📩 Message from ${phone}: ${body}`);

		// Get or create user
		const userState = await getOrCreateUser(phone, env);

		// Check if user needs to confirm payment
		if (userState.pendingPayment) {
			return handlePaymentConfirmation(body, from, userState, env);
		}

		// Rate limiting
		const allowed = await checkRateLimit(phone, userState.isPro, env);
		if (!allowed) {
			await sendWhatsAppMessage(from, RATELIMIT_MESSAGE, env);
			return new Response('OK');
		}

		// Update streak
		updateStreak(userState);

		// Handle commands
		if (body.startsWith('/')) {
			return await handleCommand(body, from, userState, env);
		}

		// Handle greeting
		const greetingTerms = ['hi', 'hello', 'hey', 'start', 'hello clawppy'];
		if (greetingTerms.includes(body.toLowerCase().trim())) {
			return await handleGreeting(from, userState, env);
		}

		// Handle quiz answers
		if (userState.waitingForQuizAnswer && userState.currentTopic) {
			return await handleQuizAnswer(body, from, userState, env);
		}

		// Handle confidence rating
		if (userState.waitingForConfidence && userState.currentTopic) {
			return await handleConfidenceRating(body, from, userState, env);
		}

		// Handle Feynman explanation
		if (userState.waitingForFeynman && userState.currentTopic) {
			return await handleFeynmanExplanation(body, from, userState, env);
		}

		// Regular message - analyze intent and respond
		return await handleRegularMessage(body, from, userState, env);

	} catch (error) {
		console.error('❌ Webhook Error:', error);
		return new Response('Internal Server Error', { status: 500 });
	}
}

// ============================================================================
// COMMAND HANDLER
// ============================================================================

async function handleCommand(
	body: string,
	from: string,
	userState: ReturnType<typeof getUserState>,
	env: Env
): Promise<Response> {
	const parts = body.split(' ');
	const command = parts[0].toLowerCase();
	const args = parts.slice(1).join(' ');

	switch (command) {
		case '/map':
			return await showKnowledgeMap(from, userState, env);

		case '/streak':
			const streakMsg = `🔥 *Your Streak:* ${userState.streak} day${userState.streak !== 1 ? 's' : ''}\n\n` +
				(userState.isPro
					? '🛡️ Pro protected - streak safe!'
					: '💎 Upgrade to Pro for streak protection!');
			await sendWhatsAppMessage(from, streakMsg, env);
			return new Response('OK');

		case '/help':
			await sendWhatsAppMessage(from, HELP_MESSAGE, env);
			return new Response('OK');

		case '/reset':
			userState.knowledgeMap = {};
			userState.currentTopic = undefined;
			await saveUserState(userState, env);
			await sendWhatsAppMessage(from, '✅ Knowledge map reset! Fresh start.', env);
			return new Response('OK');

		case '/review':
			return await handleReviewCommand(args, from, userState, env);

		case '/upgrade':
			return await handleUpgradeCommand(from, userState, env);

		case '/practice':
			return await handlePracticeCommand(args, from, userState, env);

		default:
			await sendWhatsAppMessage(from, `Unknown command: ${command}. Type /help for options.`, env);
			return new Response('OK');
	}
}

// ============================================================================
// SPECIFIC HANDLERS
// ============================================================================

async function handleGreeting(from: string, userState: ReturnType<typeof getUserState>, env: Env): Promise<Response> {
	const isNewUser = userState.joinedAt === userState.lastActive;
	
	let msg = isNewUser
		? `🐾 *Welcome to Clawppy!* Your AI study buddy.\n\n`
		: `Welcome back! 🔥 Streak: ${userState.streak} days\n\n`;

	msg += `I teach using the *Socratic Method* - asking questions to help YOU find the answers.\n\n`;
	msg += `🎯 Your learning goals:\n`;
	msg += `• Understand concepts deeply\n`;
	msg += `• Spot false confidence\n`;
	msg += `• Remember with spaced repetition\n\n`;
	msg += `What would you like to learn today?`;

	await sendWhatsAppMessage(from, msg, env);
	return new Response('OK');
}

async function showKnowledgeMap(from: string, userState: ReturnType<typeof getUserState>, env: Env): Promise<Response> {
	let mapText = '*📚 Your Knowledge Map*\n\n';
	const topics = Object.entries(userState.knowledgeMap);

	if (topics.length === 0) {
		mapText += "🕳️ Empty! Let's start learning.\n\nWhat subject interests you?";
	} else {
		for (const [topic, state] of topics) {
			const emoji = state.status === 'mastered' ? '✅' : state.status === 'struggling' ? '🔴' : '🟡';
			const scoreEmoji = state.actualScore >= 85 ? '🌟' : state.actualScore >= 60 ? '👍' : '💪';
			mapText += `${emoji} *${topic}*\n   ${scoreEmoji} Score: ${state.actualScore}% | Confidence: ${Math.round(state.confidence * 10)}/10\n\n`;
		}
	}

	mapText += `\n🔥 *Streak:* ${userState.streak} days`;
	if (userState.isPro) {
		mapText += ` | 🛡️ Pro Protected`;
	}

	await sendWhatsAppMessage(from, mapText, env);
	return new Response('OK');
}

async function handleReviewCommand(args: string, from: string, userState: ReturnType<typeof getUserState>, env: Env): Promise<Response> {
	// Specific topic review
	if (args && userState.knowledgeMap[args]) {
		userState.currentTopic = args;
		await saveUserState(userState, env);
		await sendWhatsAppMessage(from, `📝 Review: *${args}*\n\nWhat do you remember about this topic?`, env);
		return new Response('OK');
	}

	// Check for due reviews
	const due = getDueReviews(userState.knowledgeMap);
	if (due.length > 0) {
		const topic = due[0];
		const state = userState.knowledgeMap[topic];
		userState.currentTopic = topic;
		await saveUserState(userState, env);

		const msg = `⏰ *Review Time!*\n\n*${topic}* - Last score: ${state.actualScore}%\n\nQuick question: What's the key concept you remember?`;
		await sendWhatsAppMessage(from, msg, env);
		return new Response('OK');
	}

	await sendWhatsAppMessage(from, '✅ No reviews due! Great job keeping up.', env);
	return new Response('OK');
}

async function handleUpgradeCommand(from: string, userState: ReturnType<typeof getUserState>, env: Env): Promise<Response> {
	if (userState.isPro) {
		await sendWhatsAppMessage(from, "🎉 You're already a Pro user! Thanks for supporting Clawppy.", env);
		return new Response('OK');
	}

	const monthlyLink = await createPaymentLink(userState, env);
	const yearlyLink = await createYearPlanLink(userState, env);

	const msg = `💎 *Clawppy Pro* 💎\n\n` +
		`*Monthly:* ₹49/month\n` +
		`• Unlimited questions\n` +
		`• False confidence detection\n` +
		`• Streak protection (never lose!)\n` +
		`• Priority AI responses\n\n` +
		`*Yearly:* ₹499 (Save 15%)\n\n` +
		`Monthly: ${monthlyLink}\n` +
		`Yearly: ${yearlyLink}\n\n` +
		`Reply with "MONTHLY" or "YEARLY" to confirm.`;

	await sendWhatsAppMessage(from, msg, env);
	return new Response('OK');
}

async function handlePracticeCommand(args: string, from: string, userState: ReturnType<typeof getUserState>, env: Env): Promise<Response> {
	const topic = args || userState.currentTopic || 'General';
	
	// In production, this would generate actual practice questions
	const msg = `📝 *Practice: ${topic}*\n\n` +
		`Try this question:\n\n` +
		`"Explain ${topic} in your own words as if teaching a friend."\n\n` +
		`Then I'll evaluate your understanding!`;

	await sendWhatsAppMessage(from, msg, env);
	return new Response('OK');
}

async function handlePaymentConfirmation(body: string, from: string, userState: ReturnType<typeof getUserState>, env: Env): Promise<Response> {
	const choice = body.toUpperCase().trim();

	if (choice === 'MONTHLY' || choice === 'YES') {
		const link = await createPaymentLink(userState, env);
		userState.pendingPayment = 'monthly';
		await saveUserState(userState, env);
		await sendWhatsAppMessage(from, `💳 Click to pay: ${link}\n\nComplete payment and reply "DONE"`, env);
	} else if (choice === 'YEARLY') {
		const link = await createYearPlanLink(userState, env);
		userState.pendingPayment = 'yearly';
		await saveUserState(userState, env);
		await sendWhatsAppMessage(from, `💳 Click to pay: ${link}\n\nComplete payment and reply "DONE"`, env);
	} else if (choice === 'DONE') {
		// In production, verify with Razorpay API
		userState.isPro = true;
		userState.pendingPayment = undefined;
		userState.proExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
		await saveUserState(userState, env);
		await sendWhatsAppMessage(from, `🎉 *Pro Activated!*\n\nWelcome to the club! Your streak is now protected.`, env);
	} else {
		await sendWhatsAppMessage(from, `Reply MONTHLY, YEARLY, or DONE`, env);
	}

	return new Response('OK');
}

// ============================================================================
// QUIZ & INTERACTION HANDLERS
// ============================================================================

async function handleQuizAnswer(body: string, from: string, userState: ReturnType<typeof getUserState>, env: Env): Promise<Response> {
	if (!userState.currentTopic || !userState.knowledgeMap[userState.currentTopic]) {
		userState.waitingForQuizAnswer = false;
		await saveUserState(userState, env);
		return await handleRegularMessage(body, from, userState, env);
	}

	// Analyze the answer
	const intent = await analyzeIntent(body, userState, env);

	if (intent?.evaluation) {
		const topic = userState.currentTopic;
		userState.knowledgeMap[topic].actualScore = intent.evaluation.score;
		userState.knowledgeMap[topic].lastReviewed = new Date().toISOString();
		userState.knowledgeMap[topic].nextReview = calculateNextReview(userState.knowledgeMap[topic]);

		// False confidence detection
		const conf = userState.knowledgeMap[topic].confidence;
		const score = intent.evaluation.score;

		if (conf >= 0.7 && score < 50) {
			userState.knowledgeMap[topic].status = 'unconscious_incompetence';
			await sendWhatsAppMessage(from, `⚠️ *False Confidence Detected!*\n\nYou rated yourself ${Math.round(conf * 10)}/10 but scored ${score}%.\n\nLet's rebuild from basics.`, env);
		} else if (score >= 85) {
			userState.knowledgeMap[topic].status = 'mastered';
			await sendWhatsAppMessage(from, `🎉 *Great job!*\n\n${score}% on "${topic}"! Ready for the Feynman challenge?`, env);
			userState.waitingForFeynman = true;
			await saveUserState(userState, env);
			return new Response('OK');
		} else if (score < 50) {
			userState.knowledgeMap[topic].status = 'struggling';
		}

		await saveUserState(userState, env);
	}

	userState.waitingForQuizAnswer = false;
	return await handleRegularMessage(body, from, userState, env);
}

async function handleConfidenceRating(body: string, from: string, userState: ReturnType<typeof getUserState>, env: Env): Promise<Response> {
	const match = body.match(/(\d+)/);
	if (!match) {
		await sendWhatsAppMessage(from, "Please reply with a number 1-10", env);
		return new Response('OK');
	}

	const rating = Math.min(10, Math.max(1, parseInt(match[1])));
	
	if (userState.currentTopic) {
		userState.knowledgeMap[userState.currentTopic].confidence = rating / 10;
		
		// Ask a quick quiz question to validate
		userState.waitingForQuizAnswer = true;
		await saveUserState(userState, env);
		
		await sendWhatsAppMessage(from, `Got it! ${rating}/10 confidence.\n\nQuick check: What's the key concept from what we learned?`, env);
	}

	userState.waitingForConfidence = false;
	return new Response('OK');
}

async function handleFeynmanExplanation(body: string, from: string, userState: ReturnType<typeof getUserState>, env: Env): Promise<Response> {
	if (!userState.currentTopic) {
		userState.waitingForFeynman = false;
		return await handleRegularMessage(body, from, userState, env);
	}

	const result = await evaluateFeynman(userState.currentTopic, body, env);

	if (result) {
		userState.knowledgeMap[userState.currentTopic].actualScore = result.score;
		userState.knowledgeMap[userState.currentTopic].lastReviewed = new Date().toISOString();
		userState.knowledgeMap[userState.currentTopic].nextReview = calculateNextReview(userState.knowledgeMap[userState.currentTopic]);

		if (result.pass) {
			userState.knowledgeMap[userState.currentTopic].status = 'mastered';
			await sendWhatsAppMessage(from, `🎉 *Feynman Master!*\n\n${result.feedback}`, env);
		} else {
			await sendWhatsAppMessage(from, `📚 ${result.feedback}\n\nTry again - explain simpler!`, env);
		}

		await saveUserState(userState, env);
	}

	userState.waitingForFeynman = false;
	return new Response('OK');
}

// ============================================================================
// REGULAR MESSAGE HANDLER
// ============================================================================

async function handleRegularMessage(body: string, from: string, userState: ReturnType<typeof getUserState>, env: Env): Promise<Response> {
	// Analyze intent
	const intent = await analyzeIntent(body, userState, env);

	if (intent?.newTopic) {
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

	// Get AI response
	const responseText = await getAIResponse(body, userState, env);
	await saveUserState(userState, env);

	// Send response
	await sendWhatsAppMessage(from, responseText, env);

	// Ask for confidence check after some teaching
	if (Math.random() < 0.3 && userState.currentTopic) {
		userState.waitingForConfidence = true;
		await saveUserState(userState, env);
	}

	return new Response('OK');
}

// ============================================================================
// STREAK MANAGEMENT
// ============================================================================

function updateStreak(userState: ReturnType<typeof getUserState>): void {
	const today = new Date().toISOString().split('T')[0];
	const lastDate = userState.lastActive.split('T')[0];

	if (lastDate === today) return;

	const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

	if (lastDate === yesterday) {
		userState.streak += 1;
	} else if (lastDate !== today && !userState.isPro) {
		userState.streak = 1;
	}
	// Pro users keep their streak protected

	userState.lastActive = new Date().toISOString();
}

// ============================================================================
// PAYMENT HANDLERS
// ============================================================================

async function handlePaymentCallback(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const phone = url.searchParams.get('phone');

	if (phone) {
		const msg = `✅ Payment successful! Welcome to Pro!\n\n` +
			`Your streak is now protected forever!`;
		await sendWhatsAppMessage(`whatsapp:${phone}`, msg, env);
	}

	return new Response('<html><body><h1>Payment Successful!</h1><p>Return to WhatsApp.</p></body></html>', {
		headers: { 'Content-Type': 'text/html' },
	});
}

async function handlePaymentWebhook(request: Request, env: Env): Promise<Response> {
	try {
		const payload = await request.json();
		const result = await processPaymentWebhook(payload, env);

		if (result.success && result.phone) {
			const userState = await getUserState(result.phone, env);
			userState.isPro = true;
			userState.proExpiresAt = result.plan === 'pro_yearly'
				? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
				: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
			await saveUserState(userState, env);

			await sendWhatsAppMessage(`whatsapp:${result.phone}`, `🎉 Payment confirmed! Pro activated!`, env);
		}

		return new Response('OK');
	} catch (error) {
		console.error('Webhook Error:', error);
		return new Response('Error', { status: 500 });
	}
}

// ============================================================================
// CONSTANTS
// ============================================================================

const HELP_MESSAGE = `📋 *Clawppy Commands*\n\n` +
	`/map - View your knowledge map\n` +
	`/streak - See your streak count\n` +
	`/review [topic] - Review a specific topic\n` +
	`/practice [topic] - Practice questions\n` +
	`/upgrade - Go Pro!\n` +
	`/help - Show this menu\n` +
	`/reset - Reset your progress\n\n` +
	`Just chat normally to learn!`;

const RATELIMIT_MESSAGE = `⚠️ *Daily limit reached!*\n\n` +
	`Free users: 10 questions/day\n` +
	`Upgrade to Pro for unlimited!\n\n` +
	`Type /upgrade to go Pro - just ₹49/month`;