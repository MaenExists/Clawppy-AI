import { TopicState } from './types';

export function calculateNextReview(state: TopicState): string {
	const now = new Date();
	let days = 1;

	if (state.status === 'unconscious_incompetence') {
		days = 0; // Immediately
	} else if (state.actualScore >= 85) {
		days = 7;
	} else if (state.actualScore >= 60) {
		days = 3;
	} else {
		days = 1;
	}

	const nextReviewDate = new Date(now.setDate(now.getDate() + days));
	return nextReviewDate.toISOString();
}

export function getDueReviews(knowledgeMap: Record<string, TopicState>): string[] {
	const now = new Date();
	return Object.entries(knowledgeMap)
		.filter(([_, state]) => new Date(state.nextReview) <= now)
		.map(([topic]) => topic);
}
