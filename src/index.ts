import { Env } from './types';
import { getUserState, saveUserState } from './user';
import { getGeminiResponse } from './gemini';
import { sendWhatsAppMessage } from './twilio';

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

			// Handle commands
			if (body.startsWith('/')) {
				const command = body.split(' ')[0].toLowerCase();
				if (command === '/map') {
					// TODO: Implement map display
					await sendWhatsAppMessage(from, 'Your knowledge map is coming soon!', env);
					return new Response('OK');
				}
				if (command === '/reset') {
					userState.knowledgeMap = {};
					await saveUserState(userState, env);
					await sendWhatsAppMessage(from, 'Your knowledge map has been reset.', env);
					return new Response('OK');
				}
			}

			// Get response from Gemini
			const responseText = await getGeminiResponse(body, userState, env);

			// Update user state if needed (this will be more complex later)
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
