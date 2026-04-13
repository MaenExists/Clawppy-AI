# 🚀 Clawppy Quick Start Guide

## Prerequisites

1. **Node.js** 18+ installed
2. **Cloudflare Account** - https://dash.cloudflare.com
3. **Twilio Account** - https://console.twilio.com (for WhatsApp)
4. **OpenCode Account** - https://platform.opencode.ai (for AI)
5. **Razorpay Account** - https://dashboard.razorpay.com (for payments - India only)

---

## Step 1: Clone & Install

```bash
# Clone your repo
cd clawppy

# Install dependencies
npm install

# Copy environment file
cp .dev.vars.example .dev.vars
```

---

## Step 2: Configure Environment Variables

Edit `.dev.vars` with your actual API keys:

```bash
# Twilio WhatsApp
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=whatsapp:+14155238886

# OpenCode AI
OPENCODE_ZEN_API_KEY=sk-xxxxxxxxxxxxxxx
OPENCODE_ZEN_BASE_URL=https://api.opencode.ai/v1
OPENCODE_ZEN_MODEL=opencode/gpt-4o

# Razorpay (India Payments)
RAZORPAY_KEY_ID=rzp_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_secret
```

---

## Step 3: Local Development

```bash
# Start local dev server
npm run dev

# In another terminal, test with curl:
curl -X POST http://localhost:8787 \
  -d "From=whatsapp:+1234567890" \
  -d "Body=Hi"
```

---

## Step 4: Run Tests

```bash
npm run test
```

---

## Step 5: Deploy to Cloudflare

### Option A: Production (from main branch)
```bash
npm run deploy
```

### Option B: Staging
```bash
wrangler deploy --env staging
```

---

## Step 6: Configure Twilio WhatsApp

1. Go to **Twilio Console → Messaging → Try it out → Send a WhatsApp message**
2. Send `join <your-sandbox-code>` to the Twilio WhatsApp number
3. Go to **Messaging → Settings → WhatsApp Sandbox Settings**
4. Set **Incoming webhook** to your Worker URL:
   - Production: `https://clawppy.workers.dev/`
   - Staging: `https://clawppy-staging.workers.dev/`

---

## Step 7: Configure Razorpay Webhook

1. Go to **Razorpay Dashboard → Settings → Webhooks**
2. Add new webhook:
   - **URL**: `https://clawppy.workers.dev/webhook`
   - **Events**: `payment_link.paid`
3. Copy the webhook secret to your secrets

---

## Step 8: Set Production Secrets

```bash
# Set each secret (won't show in terminal)
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_PHONE_NUMBER
wrangler secret put OPENCODE_ZEN_API_KEY
wrangler secret put RAZORPAY_KEY_SECRET
```

---

## 🎉 That's It!

Your AI WhatsApp tutor is now live. Users can:
- Message your Twilio WhatsApp number to start
- Use `/map` to see their knowledge progress
- Use `/upgrade` to subscribe to Pro
- Learn via Socratic questioning (no direct answers!)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Messages not arriving | Check Twilio webhook URL is correct |
| AI not responding | Verify OpenCode API key |
| Payments not working | Check Razorpay webhook |
| Rate limited | Upgrade to Pro |
| Worker errors | Check `wrangler tail` for logs |