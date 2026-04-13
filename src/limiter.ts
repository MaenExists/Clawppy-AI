import { Env } from './types';

export async function checkRateLimit(phone: string, isPro: boolean, env: Env): Promise<boolean> {
	const limit = isPro ? 100 : 10;
	const key = `limit:${phone}:${new Date().toISOString().split('T')[0]}`;

	const current = await env.CLAWPPY_KV.get(key);
	const count = current ? parseInt(current) : 0;

	if (count >= limit) {
		return false;
	}

	await env.CLAWPPY_KV.put(key, (count + 1).toString(), { expirationTtl: 86400 });
	return true;
}
