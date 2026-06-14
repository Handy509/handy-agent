# Kethura AI for HandyPay

Kethura is HandyPay's Node.js operations and customer-support agent. It powers
the public web chat/widget, WhatsApp webhook handling, optional Telegram alerts,
support tickets, and draft-only growth operations.

This repository mirrors the sanitized application source audited on the Kethura
VPS. Runtime data, environment files, logs, credentials, and private keys are
intentionally excluded.

## Main capabilities

- Public HandyPay web widget and full chat API
- WhatsApp Cloud API webhook receiver
- OpenAI or Anthropic response generation
- Controlled HandyPay support answers and escalation
- Local bounded chat sessions and support ticket records
- Optional Telegram admin alerts
- Optional email support monitor
- Draft-only growth reports and opportunity proposals
- Current HandyPay product knowledge loaded from `knowledge/`

## Architecture

```text
Customer browser / HandyPay app
        |
        v
Nginx: /handypay-agent/
        |
        v
Express service (PM2, internal port 3007)
        |
        +-- AI provider (OpenAI or Anthropic)
        +-- WhatsApp Cloud API
        +-- Telegram alerts
        +-- Email support monitor
        +-- HandyPay Laravel operations API
        +-- Local runtime data (ignored by Git)
```

Laravel remains the system of record for users, financial transactions,
approvals, campaigns, and administrative controls. Kethura must not directly
approve financial actions or publish social content without the Laravel admin
approval flow.

## Repository structure

- `src/server.js`: Express routes, widget, chat, and service startup
- `src/services/`: AI, support, integration, and operations services
- `src/knowledge/`: core response rules and knowledge loader
- `knowledge/`: current HandyPay product and release knowledge
- `scripts/`: maintenance and diagnostics utilities
- `docs/`: architecture, audit, risks, and upgrade notes
- `test/`: health, configuration, knowledge, and secret-safety tests
- `.env.example`: safe environment variable template

## Local setup

Requirements:

- Node.js 20 or newer
- npm

```bash
git clone git@github.com:Handy509/handy-agent.git
cd handy-agent
cp .env.example .env
npm install
npm test
npm start
```

The local health endpoint is:

```text
http://localhost:3007/health
```

## Configuration

Copy `.env.example` to `.env` and configure only the integrations needed in the
target environment. Never commit `.env`.

Important safe defaults:

- `GROWTH_AGENT_ENABLED=false`
- `EMAIL_SUPPORT_ENABLED=false`
- WhatsApp, Telegram, AI, and HandyPay API credentials are empty
- No social autopost executor is enabled

The current knowledge file is loaded automatically:

```text
knowledge/BASE_KONESANS_NOUVO_OPSYON_HANDYPAY_1_0_18.md
```

Set `KNOWLEDGE_BASE_PATH` only when a deployment needs a different trusted
knowledge file.

## Endpoints

- `GET /`
- `GET /health`
- `GET /widget.js`
- `GET /webhook/whatsapp`
- `POST /webhook/whatsapp`
- `POST /api/chat`
- `GET /api/chat/:sessionId/messages`
- `POST /api/tickets`

## Tests

```bash
npm test
npm audit
```

Tests verify:

- health endpoint behavior
- current HandyPay knowledge availability
- safe disabled integration defaults
- required environment template fields
- absence of common committed secret formats

## Production deployment

Production deployment is intentionally separate from repository synchronization.
Before deployment:

1. Review the diff and security scan.
2. Back up the current VPS project and runtime data.
3. Install dependencies with `npm ci --omit=dev`.
4. Validate environment variables without printing values.
5. Run tests and a local health check.
6. Obtain explicit administrator approval before restarting PM2.

Do not restart the live service merely because this repository changed.

## Security

- Never commit `.env`, tokens, passwords, private keys, certificates, or runtime
  customer data.
- Keep provider credentials server-side.
- Do not expose HandyPay API tokens in the widget or mobile app.
- Do not log full secrets or customer-sensitive payloads.
- Keep growth automation disabled unless explicitly approved.
- Social mode remains draft-only; no public autopost is configured here.
- Financial and high-risk operations require HandyPay admin approval.

## Server audit

See [docs/KETHURA_SERVER_PROJECT_AUDIT.md](docs/KETHURA_SERVER_PROJECT_AUDIT.md)
for the verified live/staging layout and operational risks found during the
June 2026 read-only SSH audit.
