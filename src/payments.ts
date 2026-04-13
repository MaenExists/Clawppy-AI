import { Env, UserState } from './types';

// Razorpay API base URL
const RAZORPAY_API = 'https://api.razorpay.com/v1';

interface PaymentLinkResponse {
	id: string;
	short_url: string;
}

export async function createPaymentLink(
	user: UserState,
	env: Env
): Promise<string> {
	const isMock = env.RAZORPAY_KEY_ID === 'placeholder';

	if (isMock) {
		// Mock payment link for development
		const userLast4 = user.phone.slice(-4);
		return `https://rzp.io/i/clawppy${userLast4}`;
	}

	const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');

	const response = await fetch(`${RAZORPAY_API}/payment_links`, {
		method: 'POST',
		headers: {
			'Authorization': `Basic ${auth}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			amount: 4900, // ₹49.00 in paise
			currency: 'INR',
			description: 'Clawppy Pro - Monthly Subscription',
			contact: user.phone.replace('whatsapp:', ''),
			notify: {
				sms: true,
				email: true,
			},
			notes: {
				phone: user.phone,
				plan: 'pro_monthly',
			},
			callback_url: `https://clawppy.workers.dev/payment-callback?phone=${encodeURIComponent(user.phone)}`,
			callback_method: 'get',
		}),
	});

	if (!response.ok) {
		const error = await response.text();
		console.error('Razorpay Error:', error);
		throw new Error('Failed to create payment link');
	}

	const data: PaymentLinkResponse = await response.json();
	return data.short_url;
}

export async function verifyPaymentSignature(
	razorpayOrderId: string,
	razorpayPaymentId: string,
	razorpaySignature: string,
	env: Env
): Promise<boolean> {
	// For webhook verification, you can use Razorpay's webhook secret
	// This is a simplified version
	return !!(
		razorpayOrderId &&
		razorpayPaymentId &&
		razorpaySignature
	);
}

export async function processPaymentWebhook(
	payload: any,
	env: Env
): Promise<{ success: boolean; phone?: string; plan?: string }> {
	try {
		const event = payload.event;
		
		if (event === 'payment_link.paid') {
			const payloadData = payload.payload?.payment_link?.notes;
			if (payloadData?.phone && payloadData?.plan === 'pro_monthly') {
				return {
					success: true,
					phone: payloadData.phone,
					plan: 'pro_monthly',
				};
			}
		}

		return { success: false };
	} catch (error) {
		console.error('Webhook Error:', error);
		return { success: false };
	}
}

// Generate year plan payment link
export async function createYearPlanLink(
	user: UserState,
	env: Env
): Promise<string> {
	const isMock = env.RAZORPAY_KEY_ID === 'placeholder';

	if (isMock) {
		const userLast4 = user.phone.slice(-4);
		return `https://rzp.io/i/clawppy_year${userLast4}`;
	}

	const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString('base64');

	const response = await fetch(`${RAZORPAY_API}/payment_links`, {
		method: 'POST',
		headers: {
			'Authorization': `Basic ${auth}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			amount: 49900, // ₹499.00 in paise (15% discount)
			currency: 'INR',
			description: 'Clawppy Pro - Yearly Plan (Save 15%)',
			contact: user.phone.replace('whatsapp:', ''),
			notify: {
				sms: true,
				email: true,
			},
			notes: {
				phone: user.phone,
				plan: 'pro_yearly',
			},
		}),
	});

	const data: PaymentLinkResponse = await response.json();
	return data.short_url;
}