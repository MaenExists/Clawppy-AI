import { Env } from './types';

// ============================================================================
// TWILIO WHATSAPP API
// ============================================================================

export async function sendWhatsAppMessage(to: string, body: string, env: Env): Promise<any> {
	const isMock = env.TWILIO_ACCOUNT_SID === 'placeholder';

	if (isMock) {
		console.log(`[MOCK TWILIO] → ${to}: ${body.substring(0, 100)}...`);
		return { sid: 'SM_MOCK', status: 'sent' };
	}

	const credentials = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');

	const response = await fetch(
		`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
		{
			method: 'POST',
			headers: {
				'Authorization': `Basic ${credentials}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				To: to,
				From: env.TWILIO_PHONE_NUMBER,
				Body: body,
			}),
		}
	);

	if (!response.ok) {
		const error = await response.text();
		console.error('❌ Twilio Error:', error);
		throw new Error(`Twilio failed: ${response.status}`);
	}

	return response.json();
}

// Reply buttons using Twilio's Content API (requires template approval)
// For now, we simulate with numbered options
export async function sendWhatsAppReplyButtons(
	to: string,
	body: string,
	buttons: string[],
	env: Env
): Promise<any> {
	// Twilio WhatsApp doesn't support inline buttons natively
	// Use the list message approach or just text with numbered options
	const buttonText = buttons.map((btn, i) => `${i + 1}. ${btn}`).join('\n');
	return sendWhatsAppMessage(to, `${body}\n\n${buttonText}`, env);
}

// Send a list message (more structured selection)
export async function sendWhatsAppList(
	to: string,
	body: string,
	items: { id: string; title: string; description?: string }[],
	env: Env
): Promise<any> {
	const isMock = env.TWILIO_ACCOUNT_SID === 'placeholder';

	if (isMock) {
		console.log(`[MOCK LIST] → ${to}: ${body}`);
		const list = items.map(i => `${i.id}. ${i.title}`).join('\n');
		console.log(`[MOCK LIST] Items: ${list}`);
		return { sid: 'SM_MOCK_LIST' };
	}

	const credentials = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');

	// For production, you'd use Twilio's Content API or Interactive Message
	// For now, fall back to regular message
	return sendWhatsAppMessage(to, `${body}\n\n${items.map(i => `${i.id}. ${i.title}`).join('\n')}`, env);
}

// Send media (images, documents)
export async function sendWhatsAppMedia(
	to: string,
	body: string,
	mediaUrl: string,
	env: Env
): Promise<any> {
	const isMock = env.TWILIO_ACCOUNT_SID === 'placeholder';

	if (isMock) {
		console.log(`[MOCK MEDIA] → ${to}: ${body} (${mediaUrl})`);
		return { sid: 'SM_MOCK_MEDIA' };
	}

	const credentials = Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');

	const response = await fetch(
		`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
		{
			method: 'POST',
			headers: {
				'Authorization': `Basic ${credentials}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				To: to,
				From: env.TWILIO_PHONE_NUMBER,
				Body: body,
				MediaUrl: mediaUrl,
			}),
		}
	);

	return response.json();
}