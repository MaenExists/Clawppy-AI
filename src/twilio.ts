import { Env } from './types';

export async function sendWhatsAppMessage(to: string, body: string, env: Env) {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_PHONE_NUMBER;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const basicAuth = btoa(`${accountSid}:${authToken}`);

  const formData = new URLSearchParams();
  formData.append('To', to);
  formData.append('From', from);
  formData.append('Body', body);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

export async function sendWhatsAppInteractive(to: string, body: string, buttons: string[], env: Env) {
  const accountSid = env.TWILIO_ACCOUNT_SID;
  const authToken = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_PHONE_NUMBER;

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const basicAuth = btoa(`${accountSid}:${authToken}`);

  // Twilio interactive messages require Content SID or a complex JSON.
  // For simplicity in this demo, we'll use a placeholder that the user can later replace with actual Twilio Templates
  // or use the specialized interactive parameter if their account supports it.
  // Here we'll stick to basic text for now but structure it for future use.
  
  const formData = new URLSearchParams();
  formData.append('To', to);
  formData.append('From', from);
  
  let interactiveBody = body;
  if (buttons.length > 0) {
    interactiveBody += '\n\n' + buttons.map((b, i) => `\${i+1}. \${b}`).join('\n');
  }
  
  formData.append('Body', interactiveBody);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  return response.json();
}
