# Stellar Anchoring And Anonymous Tipping Runbook

## Purpose
Provide a single operational workflow for support and engineering when handling:
- Confession anchoring transactions.
- Anonymous tipping transactions.
- Pending, failed, duplicate, and replay scenarios.

This runbook is written for production response and tabletop drills.

## Systems And Identifiers
- Backend API modules: `xconfess-backend/src/stellar` and tipping endpoints.
- Chain network: Stellar testnet/mainnet (must match environment).
- Key identifiers to collect early:
  - `requestId` (backend request correlation id).
  - `confessionId`.
  - `txHash` (on-chain transaction hash).
  - `tipId` (backend record id, if created).
  - User-facing timestamp and timezone.

## Normal Flow: Anchor Verification And Reconciliation
1. User submits confession with anchoring enabled.
2. Backend builds and submits chain transaction.
3. Backend stores pending state with `txHash` and confession reference.
4. Verification checks chain status and marks outcome:
   - `confirmed`: anchor recorded and immutable reference is final.
   - `pending`: transaction accepted but not yet final.
   - `failed`: transaction rejected or expired.
5. Reconciliation worker re-checks pending anchors until resolved or escalated.

Operator checks for healthy flow:
- Chain/network config matches deployment target.
- Transaction appears on chain explorer.
- Backend status transitions `pending -> confirmed|failed`.
- No duplicate anchor records for the same confession hash.

## Normal Flow: Anonymous Tip Verification And Reconciliation
1. Client signs and submits tip transaction in wallet.
2. Client sends `txHash` to backend verification endpoint.
3. Backend validates transaction and writes tip record idempotently.
4. If verify endpoint is retried, duplicate/replay requests must be safe:
   - Same `txHash` + `confessionId` should not create duplicate credit.
   - Duplicate/replay responses should return stable success semantics.
5. Reconciliation worker resolves delayed settlement outcomes.

Operator checks for healthy flow:
- Wallet network matches backend network.
- `txHash` settles on chain.
- Tip record exists once and only once.
- Retry requests do not increase credited amount.

## State Handling Matrix

### Pending
- Definition: chain transaction accepted or submitted, final confirmation not yet observed.
- Action:
  - Keep status as pending.
  - Requeue verification/reconciliation.
  - Do not manually refund unless pending exceeds SLA and failure is confirmed.
- Escalate when pending exceeds agreed threshold (example: 30 minutes for tip verify).

### Failed
- Definition: transaction rejected, malformed, expired, insufficient funds, or network failure.
- Action:
  - Capture precise failure code/message.
  - Confirm whether any chain side-effect occurred.
  - If no on-chain settlement, surface user-safe retry guidance.
  - If on-chain side-effect exists but backend failed to persist, run reconciliation before refund decisions.

### Replayed / Duplicate
- Definition: same tip/anchor verification is submitted multiple times.
- Action:
  - Treat as idempotent operation.
  - Return canonical existing record where available.
  - Never double-credit tip totals.

## Troubleshooting Playbooks

### Network Mismatch
Symptoms:
- Wallet submits on testnet while backend validates mainnet (or inverse).
- Verification cannot locate `txHash` on expected network.

Checks:
1. Confirm backend `STELLAR_NETWORK` and Horizon/RPC URL.
2. Confirm wallet network used at signing time.
3. Confirm explorer lookup network.

Recovery:
- Align wallet + backend network.
- Re-run verification after alignment.
- Do not mark failed until mismatch is corrected and a second verification is attempted.

### Failed Settlement
Symptoms:
- `txHash` exists but transaction failed/rolled back.
- Verify endpoint returns failure after chain check.

Checks:
1. Inspect transaction result code and operation codes.
2. Verify source account balance and sequence behavior.
3. Confirm destination account validity (for tips).

Recovery:
- Return explicit failure reason to client.
- Allow user retry with fresh transaction.
- Preserve failed record for audit, including request and tx identifiers.

### Stuck Pending Records
Symptoms:
- Backend record remains `pending` beyond SLA.
- Reconciliation not advancing status.

Checks:
1. Confirm worker/cron is running.
2. Confirm provider connectivity and rate-limit status.
3. Re-query chain state for `txHash`.
4. Check for lock/contention preventing status update.

Recovery:
- Manually trigger reconciliation for the specific record.
- If confirmed on-chain, patch state to `confirmed`.
- If definitively failed, patch to `failed` and attach evidence.
- Document operator action with request/record ids.

## Evidence Checklist Before Manual Intervention Or Refund
Collect all items before making a manual state change:
- Environment and network (`testnet`/`mainnet`).
- `requestId`, `confessionId`, `txHash`, `tipId` (if present).
- Raw verify endpoint response payload.
- Chain explorer link and observed status.
- Relevant backend logs covering submission and verification windows.
- Reason for intervention and approver identity.

If any item is missing, pause and gather it first.

## Manual Intervention Guardrails
- Prefer reconciliation and idempotent replay before direct DB edits.
- If DB correction is required:
  - Record before/after state.
  - Link change to incident ticket.
  - Include operator and timestamp.
- Refund decisions must confirm no successful on-chain transfer was credited already.

## Tabletop Exercise Scenarios
1. Delayed chain confirmation:
   - Force a pending state and walk through escalation + evidence capture.
2. Failed anonymous tip:
   - Simulate wallet/network mismatch and verify troubleshooting steps.
3. Replay-safe verify:
   - Submit same verify payload twice and confirm duplicate-safe outcome.

## Related Maintenance Work
- `maintainer/issues/170-fix-backend-tip-verification-idempotency-replay.md`
- `maintainer/issues/173-feat-backend-chain-reconciliation-worker.md`
