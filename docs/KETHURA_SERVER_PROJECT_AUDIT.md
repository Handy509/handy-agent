# Kethura Server Project Audit

Audit date: 2026-06-14

Scope: read-only SSH inspection of the Kethura VPS. No service, environment
variable, runtime file, or production configuration was modified.

## Active production service

- Host: `kethura.com`
- VPS hostname: `vmi3241932`
- Runtime manager: PM2
- PM2 application: `handypay-ai-agent`
- Project path: `/home/codex/handypay-ai-agent`
- Entrypoint: `/home/codex/handypay-ai-agent/src/server.js`
- Internal port: `3007`
- Runtime: Node.js `22.22.2`, npm `10.9.7`
- Health status during audit: HTTP 200, service online
- Public widget status: HTTP 200

The production source directory is not a Git working tree. It contained source,
documentation, package metadata, runtime data, logs, dependencies, temporary
uploads, and environment configuration.

## Staging service

- PM2 application: `handypay-ai-agent-staging`
- Project path: `/home/codex/handypay-ai-agent-staging`
- Internal port: `3101`
- Health status during audit: HTTP 200, staging environment online

Staging contains a newer internal-events implementation and test coverage that
are not present in the active production source. They were not silently merged
into this repository because the task was to synchronize the active project,
not deploy unvalidated staging behavior.

## Reverse proxy

Nginx routes:

- `/handypay-agent/` to `127.0.0.1:3007`
- `/handypay-agent-staging/` to `127.0.0.1:3101`
- root application traffic to the local n8n service
- WhatsApp webhook verification and event traffic through separate configured
  upstream behavior

The public widget is served from:

```text
https://kethura.com/handypay-agent/widget.js
```

## Scheduled tasks

The `codex` user has a 12-hour report cron that enters the active project and
runs `scripts/generate-report.js`. Cron output is written to a runtime log.

No dedicated systemd Kethura service was found; PM2 is the active process
manager.

## Source synchronization method

The active source was archived and copied with these exclusions:

- `.env` and environment variants
- `node_modules`
- runtime `data`
- logs
- temporary uploads and temporary directories
- caches and backups
- `.bak` files
- secret-setting helper scripts
- private keys and certificates

The private Git repository history was preserved while obsolete root files were
replaced with the sanitized active source.

## Security findings

1. The active source had a default WhatsApp verification token and phone-number
   identifier embedded in configuration.
2. Growth automation defaulted to enabled when its environment variable was
   missing.
3. The production PM2 process reported a very high historical restart count,
   although it was stable during this audit.
4. Production source is not linked to Git, which increases configuration drift.
5. Staging has newer internal-event functionality that requires a separate code
   review before promotion.
6. Some utility scripts accept configuration through command-line arguments,
   which can remain in shell history.

## Repository remediation

- Removed sensitive WhatsApp fallback values.
- Changed growth automation to disabled by default.
- Added a safe `.env.example`.
- Expanded `.gitignore` for runtime and credential files.
- Added automated health, knowledge, configuration, and secret checks.
- Added the current HandyPay 1.0.18 knowledge base to the AI system context.

## Operational recommendation

Do not replace or restart the live VPS application from this synchronization
alone. First review the repository diff, reconcile staging-only features,
investigate the historical PM2 restart count, back up runtime data, and obtain
explicit deployment approval.
