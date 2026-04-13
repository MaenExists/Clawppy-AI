export interface TopicState {
	status: 'struggling' | 'mastered' | 'unconscious_incompetence';
	confidence: number;
	actualScore: number;
	lastReviewed: string;
	nextReview: string;
}

export interface UserState {
	phone: string;
	name?: string;
	knowledgeMap: Record<string, TopicState>;
	currentTopic?: string;
	streak: number;
	streakFreezes: number;
	lastActive: string;
	isPro: boolean;
	proExpiresAt?: string;
	questionsToday: number;
	joinedAt: string;
	// Interaction state
	waitingForQuizAnswer?: boolean;
	waitingForConfidence?: boolean;
	waitingForFeynman?: boolean;
	pendingPayment?: 'monthly' | 'yearly';
}

export interface Env {
	// KV Storage
	CLAWPPY_KV: KVNamespace;

	// Twilio WhatsApp
	TWILIO_ACCOUNT_SID: string;
	TWILIO_AUTH_TOKEN: string;
	TWILIO_PHONE_NUMBER: string;

	// AI (OpenCode / OpenAI Compatible)
	OPENCODE_ZEN_API_KEY: string;
	OPENCODE_ZEN_BASE_URL: string;
	OPENCODE_ZEN_MODEL: string;
	DISABLE_AI?: string; // Set to 'true' to disable AI and use mock responses

	// Payments (Razorpay)
	RAZORPAY_KEY_ID: string;
	RAZORPAY_KEY_SECRET: string;
	RAZORPAY_WEBHOOK_SECRET: string;
}

export interface EnvDev extends Env {
	CLAWPPY_KV: KVNamespace;
}