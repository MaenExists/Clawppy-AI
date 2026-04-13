# Deployment Guide

## Overview

This document describes the CI/CD pipeline, deployment processes, and environment setup for Clawppy.

## Environments

| Environment | URL | Description |
|-------------|-----|-------------|
| Development | `localhost:8787` | Local development with `npm run dev` |
| Staging | `https://clawppy-staging.workers.dev` | Testing branch deploys |
| Production | `https://clawppy.workers.dev` | Main branch deploys |

## Git Workflow

```
main (production)
  ↑
develop (staging)
  ↑
feature/xxx (development)
```

- **Feature branches**: Create from `develop`, PR into `develop`
- **Staging**: Push to `develop` triggers automatic staging deployment
- **Production**: PR `develop` → `main` triggers production deployment

## CI/CD Pipeline

The pipeline (`.github/workflows/ci.yml`) runs:

1. **Lint & Type Check** - TypeScript validation + ESLint
2. **Tests** - Vitest unit/integration tests
3. **Build** - Wrangler build verification
4. **Deploy** - Cloudflare Workers deployment

### Secrets Required

Add these secrets in GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Workers write permission |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |

### Creating Cloudflare API Token

1. Go to Cloudflare Dashboard → Profile → API Tokens
2. Create Custom Token with:
   - **Permissions**: Zone - Workers:Edit, User - Workers:Edit
   - **Account Resources**: Include your account
3. Copy the token and add it to GitHub secrets

## Local Development

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev

# Run tests
npm run test

# Check types
npx tsc --noEmit

# Lint
npm run lint
```

## Configuration

### Environment Variables

Copy `.dev.vars.example` to `.dev.vars` and fill in:

```
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=whatsapp:+14155238886
OPENCODE_ZEN_API_KEY=your_api_key
OPENCODE_ZEN_BASE_URL=https://api.opencode.ai/v1
OPENCODE_ZEN_MODEL=opencode/gpt-4o
```

### Secrets for Production

Set these via `wrangler secret put`:

```bash
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_PHONE_NUMBER
wrangler secret put OPENCODE_ZEN_API_KEY
```

## Deployment Commands

```bash
# Deploy to production
npm run deploy

# Deploy to staging
wrangler deploy --env staging

# Deploy to specific environment
wrangler deploy --env production
```

## Twilio WhatsApp Setup

1. Create Twilio Account
2. Get WhatsApp Sandbox credentials
3. Configure Sandbox in Twilio Console
4. Point webhook to your Worker URL:
   - Staging: `https://clawppy-staging.workers.dev/`
   - Production: `https://clawppy.workers.dev/`

## Monitoring

- **Cloudflare Dashboard**: Check Worker metrics, errors
- **GitHub Actions**: View CI/CD run logs
- **Wrangler Logs**: `wrangler tail` for real-time logs

## Rollback

If something goes wrong in production:

1. Go to Cloudflare Dashboard → Workers
2. Select the deployment
3. Click "Rollback" to previous version