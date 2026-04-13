.PHONY: help install dev test lint format build deploy deploy-staging deploy-prod secrets clean

help:
	@echo "Clawppy Development Commands"
	@echo "==========================="
	@echo "make install        - Install dependencies"
	@echo "make dev            - Start local dev server"
	@echo "make test           - Run tests"
	@echo "make lint           - Run ESLint"
	@echo "make format         - Format code with Prettier"
	@echo "make build          - Build worker (dry-run)"
	@echo "make deploy         - Deploy to production"
	@echo "make deploy-staging - Deploy to staging"
	@echo "make secrets        - List secrets that need to be set"
	@echo "make clean          - Clean build artifacts"

install:
	npm install

dev:
	npm run dev

test:
	npm run test

lint:
	npm run lint

format:
	npm run format

build:
	npm run build

deploy:
	npm run deploy

deploy-staging:
	wrangler deploy --env staging

deploy-prod:
	wrangler deploy --env production

secrets:
	@echo "Secrets to configure:"
	@echo "====================="
	@echo "wrangler secret put TWILIO_ACCOUNT_SID"
	@echo "wrangler secret put TWILIO_AUTH_TOKEN"
	@echo "wrangler secret put TWILIO_PHONE_NUMBER"
	@echo "wrangler secret put OPENCODE_ZEN_API_KEY"

clean:
	rm -rf .wrangler dist
	find . -name "*.tsbuildinfo" -delete
	find . -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true