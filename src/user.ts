import { UserState, Env } from './types';

export async function getUserState(phone: string, env: Env): Promise<UserState> {
  const data = await env.CLAWPPY_KV.get(`user:\${phone}`);
  if (data) {
    return JSON.parse(data);
  }
  return {
    phone,
    knowledgeMap: {},
    streak: 0,
    lastActive: new Date().toISOString(),
    isPro: false,
  };
}

export async function saveUserState(user: UserState, env: Env) {
  user.lastActive = new Date().toISOString();
  await env.CLAWPPY_KV.put(`user:\${user.phone}`, JSON.stringify(user));
}
