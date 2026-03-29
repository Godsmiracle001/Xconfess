# Realtime Degradation and Incident Triage Playbook

## Description
This PR addresses the need for a standardized realtime degradation and incident triage playbook for the xConfess backend. It introduces operational guidelines to diagnose and respond to WebSocket or live admin feature deteriorations in production environments.

## Changes Included
- **`docs/realtime-incident-playbook.md`**: Created a new runbook documenting:
  - Triage steps for subscription authorization failures (invalid auth loops, drops).
  - Triage steps for reconnect storms (spikes in concurrent connections, state overhead).
  - Triage steps for stale event fanout (missing/delayed emoji reactions, pub/sub queues).
  - Explicit safe degraded-mode responses for the admin queue and notification features to preserve core product stability.
  - Required logs, metrics (`/websocket/stats`, `/websocket/health`), and reproduction steps necessary for engineering escalations.

## Acceptance Criteria Met
- [x] Operators can follow the playbook to identify the likely realtime failure mode.
- [x] The runbook lists degraded-mode options that preserve core product safety.
- [x] Required evidence for escalation is explicit and actionable.

## How to Test
1. Review the generated `docs/realtime-incident-playbook.md`.
2. Run a conceptual tabletop exercise for a WebSocket reconnect storm or auth failure utilizing the outlined triage paths.
3. Validate that standard logs and metrics checks align with the backend's current capabilities (`websocket-health.controller.ts`).

Closes #462
