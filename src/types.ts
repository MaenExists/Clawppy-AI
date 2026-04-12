export interface TopicState {
  status: 'struggling' | 'mastered' | 'unconscious_incompetence';
  confidence: number;
  actualScore: number;
  lastReviewed: string; // ISO string
  nextReview: string; // ISO string
}

export interface UserState {
  phone: string;
  name?: string;
  knowledgeMap: Record<string, TopicState>;
  currentTopic?: string;
  streak: number;
  lastActive: string; // ISO string
  isPro: boolean;
}

export interface Env {
  CLAWPPY_KV: KVNamespace;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  OPENCODE_ZEN_API_KEY: string;
  OPENCODE_ZEN_BASE_URL: string;
  OPENCODE_ZEN_MODEL: string;
  TWILIO_PHONE_NUMBER: string;
}
