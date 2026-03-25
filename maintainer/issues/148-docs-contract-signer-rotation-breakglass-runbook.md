# [148] docs(contract): add signer key rotation and break-glass response runbook

## Summary
Document operational playbooks for planned signer rotation and emergency key compromise response.

## Problem
Lack of explicit signer rotation and break-glass procedures increases governance incident risk and recovery time.

## Scope
- Document routine signer rotation workflow and validation checks.
- Add emergency compromised-key response flow using pause/timelock/quorum controls.
- Include communication checklist and post-incident verification steps.

## Files
- `docs/contract-signer-rotation-runbook.md` (new)
- `xconfess-contracts/README.md`
- `maintainer/issues/117-feat-contract-emergency-pause-guard.md`
- `maintainer/issues/123-feat-contract-admin-role-transfer-timelock.md`
- `maintainer/issues/144-feat-contract-governance-quorum-critical-actions.md`

## Acceptance Criteria
- Team can execute signer rotation without ambiguity.
- Break-glass path clearly defines stop/contain/recover steps.
- Runbook is actionable for drills and audit evidence.

## Labels
`documentation` `contract` `security` `ops`

## How To Test
1. Run tabletop signer-rotation drill using the runbook.
2. Simulate compromised key scenario and follow break-glass checklist.
3. Confirm all required verification and communication steps are covered.
