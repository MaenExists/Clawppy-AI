import { UserState, Env } from './types';

const DEFAULT_USER: Omit<UserState, 'phone'> = {
	knowledgeMap: {},
	currentTopic: undefined,
	streak: 0,
	streakFreezes: 0,
	lastActive: new Date().toISOString(),
	isPro: false,
	proExpiresAt: undefined,
	questionsToday: 0,
	joinedAt: new Date().toISOString(),
	waitingForQuizAnswer: false,
	waitingForConfidence: false,
	waitingForFeynman: false,
	pendingPayment: undefined,
};

// Extend UserState interface to include new fields
export interface UserStateFull extends UserState {
	waitingForQuizAnswer: boolean;
	waitingForConfidence: boolean;
	waitingForFeynman: boolean;
	pendingPayment?: 'monthly' | 'yearly';
}

export async function getUserState(phone: string, env: Env): Promise<UserStateFull> {
	const data = await env.CLAWPPY_KV.get(`user:${phone}`);
	if (data) {
		return JSON.parse(data);
	}
	return createDefaultUser(phone);
}

export async function getOrCreateUser(phone: string, env: Env): Promise<UserStateFull> {
	const existing = await getUserState(phone, env);
	if (existing.joinedAt) {
		return existing;
	}
	return createDefaultUser(phone);
}

function createDefaultUser(phone: string): UserStateFull {
	return {
		phone,
		knowledgeMap: {},
		currentTopic: undefined,
		streak: 0,
		streakFreezes: 0,
		lastActive: new Date().toISOString(),
		isPro: false,
		proExpiresAt: undefined,
		questionsToday: 0,
		joinedAt: new Date().toISOString(),
		waitingForQuizAnswer: false,
		waitingForConfidence: false,
		waitingForFeynman: false,
		pendingPayment: undefined,
	};
}

export async function saveUserState(user: UserStateFull, env: Env): Promise<void> {
	user.lastActive = new Date().toISOString();
	await env.CLAWPPY_KV.put(`user:${user.phone}`, JSON.stringify(user));
}

// Admin functions
export async function getAllUsers(env: Env): Promise<UserStateFull[]> {
	// List would require a separate index - for now return empty
	// In production, maintain a user index in KV
	return [];
}

export async function getUserStats(env: Env): Promise<{ total: number; pro: number; active: number }> {
	// This would require scanning KV or maintaining stats
	// For now return placeholder
	return { total: 0, pro: 0, active: 0 };
}