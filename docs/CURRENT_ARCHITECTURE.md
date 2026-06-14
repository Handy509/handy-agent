# Current Architecture

## Customer conversation path

1. HandyPay website/app opens the Kethura widget or chat screen.
2. Express validates and rate-limits the request.
3. The AI service generates a response using the configured provider and HandyPay knowledge rules.
4. Session history is stored locally with bounded retention.
5. Sensitive support intents create a ticket and alert the human support channel.

## Operations path

1. The Kethura growth scheduler generates drafts and opportunities.
2. Requests are sent server-to-server to Laravel with `X-HandyPay-Agent-Token`.
3. Laravel validates and stores the action.
4. Public or medium/high-risk actions enter `pending_approval`.
5. An administrator approves or rejects the proposal in the HandyPay admin panel.
6. Approval changes ledger state only. A separate, credentialed executor is required for future publishing.

## Data ownership

- Kethura VPS: conversation runtime, tickets, local state, provider orchestration.
- Laravel: approvals, action audit trail, reports, opportunities, social drafts, World Cup campaign data.
- Flutter: authenticated customer-facing World Cup experience.
