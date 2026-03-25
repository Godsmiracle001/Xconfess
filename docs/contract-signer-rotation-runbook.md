# Contract Signer Key Rotation & Break-Glass Response Runbook

**Scope:** XConfess Soroban smart contract on Stellar  
**Roles covered:** Owner, Admin  
**Related issues:** [#117 Emergency Pause Guard](../maintainer/issues/117-feat-contract-emergency-pause-guard.md) · [#123 Admin Role Transfer Timelock](../maintainer/issues/123-feat-contract-admin-role-transfer-timelock.md) · [#144 Governance Quorum](../maintainer/issues/144-feat-contract-governance-quorum-critical-actions.md)

---

## Table of Contents

1. [Role Reference](#1-role-reference)
2. [Routine Signer Rotation](#2-routine-signer-rotation)
3. [Break-Glass: Compromised Key Response](#3-break-glass-compromised-key-response)
4. [Communication Checklist](#4-communication-checklist)
5. [Post-Incident Verification](#5-post-incident-verification)
6. [Drill Schedule](#6-drill-schedule)

---

## 1. Role Reference

| Role | Storage Key | Capabilities | Minimum Signers |
|------|-------------|--------------|-----------------|
| Owner | `OWNER` | Assign/revoke admins, transfer ownership, pause/unpause, update config | 1 (+ quorum for critical actions) |
| Admin | `ADMINS` map | Resolve confessions, moderate content | 1 per action |

**Critical actions** (require quorum per issue #144): pause, config updates, admin role changes, ownership transfer.

---

## 2. Routine Signer Rotation

Use this procedure for **planned** key rotation (scheduled key expiry, personnel change, hardware security module refresh).

### 2.1 Pre-rotation Checklist

- [ ] New keypair generated and stored in HSM / secrets manager
- [ ] New address funded with sufficient XLM for transaction fees
- [ ] At least one other admin/owner available as quorum co-signer
- [ ] Maintenance window communicated to team (see [§4](#4-communication-checklist))
- [ ] Current contract state snapshot taken (`get_version`, `get_capabilities`, `get_confession_count`)

### 2.2 Admin Key Rotation

```bash
# Step 1 — Grant admin role to new key (executed by Owner)
stellar contract invoke \
  --id $CONTRACT_ID \
  --network $STELLAR_NETWORK \
  --source $OWNER_KEY \
  -- assign_admin \
  --new_admin $NEW_ADMIN_ADDRESS

# Step 2 — Verify new admin appears in admin set
stellar contract invoke \
  --id $CONTRACT_ID \
  --network $STELLAR_NETWORK \
  --source $OWNER_KEY \
  -- is_admin \
  --address $NEW_ADMIN_ADDRESS
# Expected: true

# Step 3 — Smoke-test new admin key can perform a read
stellar contract invoke \
  --id $CONTRACT_ID \
  --network $STELLAR_NETWORK \
  --source $NEW_ADMIN_KEY \
  -- get_confession_count

# Step 4 — Revoke old admin key (executed by Owner)
stellar contract invoke \
  --id $CONTRACT_ID \
  --network $STELLAR_NETWORK \
  --source $OWNER_KEY \
  -- revoke_admin \
  --admin $OLD_ADMIN_ADDRESS

# Step 5 — Confirm old key is no longer admin
stellar contract invoke \
  --id $CONTRACT_ID \
  --network $STELLAR_NETWORK \
  --source $OWNER_KEY \
  -- is_admin \
  --address $OLD_ADMIN_ADDRESS
# Expected: false
```

**Validation:** Check Stellar Horizon for `admin_granted` and `admin_revoked` events on the contract.

```bash
curl "https://horizon-testnet.stellar.org/accounts/$CONTRACT_ID/operations" \
  | jq '.._embedded.records[] | select(.type == "invoke_host_function")'
```

### 2.3 Owner Key Rotation (Two-Step Timelock)

Owner rotation uses the staged transfer flow from issue #123. The timelock window must elapse before the new owner can accept.

```bash
# Step 1 — Propose transfer (current Owner)
stellar contract invoke \
  --id $CONTRACT_ID \
  --network $STELLAR_NETWORK \
  --source $CURRENT_OWNER_KEY \
  -- propose_admin_transfer \
  --new_owner $NEW_OWNER_ADDRESS

# Record the proposal ledger sequence for timelock tracking
echo "Proposal submitted at ledger: $(stellar network status --network $STELLAR_NETWORK | jq .sequence)"

# Step 2 — Wait for timelock window to elapse
# Timelock duration is set in contract config (default: 24h / ~17,280 ledgers)
# Do NOT proceed until the window has passed.

# Step 3 — Accept transfer (new Owner key)
stellar contract invoke \
  --id $CONTRACT_ID \
  --network $STELLAR_NETWORK \
  --source $NEW_OWNER_KEY \
  -- accept_admin_transfer

# Step 4 — Verify ownership transferred
stellar contract invoke \
  --id $CONTRACT_ID \
  --network $STELLAR_NETWORK \
  --source $NEW_OWNER_KEY \
  -- get_owner
# Expected: $NEW_OWNER_ADDRESS
```

> **Cancellation:** If the rotation must be aborted before acceptance, the current owner calls `cancel_admin_transfer`. This invalidates the pending proposal.

### 2.4 Post-rotation Validation

- [ ] New key confirmed active via `is_admin` / `get_owner`
- [ ] Old key confirmed inactive
- [ ] `ownership_xfer` or `admin_granted`/`admin_revoked` events visible on Horizon
- [ ] Backend `.env` updated with new key references
- [ ] Secrets manager entry for old key revoked/archived
- [ ] Rotation logged in audit trail

---

## 3. Break-Glass: Compromised Key Response

Use this procedure when a signer key is **suspected or confirmed compromised**. Speed matters — follow steps in order without skipping.

### 3.1 STOP — Pause the Contract

Immediately halt all write operations to prevent further damage.

```bash
# Pause contract (Owner or quorum of Admins)
stellar contract invoke \
  --id $CONTRACT_ID \
  --network $STELLAR_NETWORK \
  --source $RESPONDING_KEY \
  -- pause \
  --reason "Suspected key compromise — incident YYYY-MM-DD"
```

**Verify pause is active:**

```bash
stellar contract invoke \
  --id $CONTRACT_ID \
  --network $STELLAR_NETWORK \
  --source $RESPONDING_KEY \
  -- is_paused
# Expected: true
```

> If the compromised key IS the Owner and no other quorum signers are available, escalate immediately to the Stellar Development Foundation support channel and the core team. Do not attempt further contract calls until a quorum is assembled.

### 3.2 CONTAIN — Revoke Compromised Key

```bash
# If compromised key is an Admin (executed by Owner or remaining quorum)
stellar contract invoke \
  --id $CONTRACT_ID \
  --network $STELLAR_NETWORK \
  --source $SAFE_OWNER_KEY \
  -- revoke_admin \
  --admin $COMPROMISED_ADDRESS

# If compromised key is the Owner — initiate emergency ownership transfer
# Requires quorum approval per issue #144
stellar contract invoke \
  --id $CONTRACT_ID \
  --network $STELLAR_NETWORK \
  --source $QUORUM_SIGNER_1 \
  -- propose_admin_transfer \
  --new_owner $EMERGENCY_OWNER_ADDRESS

# Collect quorum approvals
stellar contract invoke \
  --id $CONTRACT_ID \
  --network $STELLAR_NETWORK \
  --source $QUORUM_SIGNER_2 \
  -- approve_governance_action \
  --action_id $PROPOSAL_ID
```

**Containment checklist:**

- [ ] Compromised key revoked from contract
- [ ] Compromised key revoked from all backend `.env` files and CI secrets
- [ ] Compromised key revoked from secrets manager / HSM
- [ ] Stellar account for compromised key merged or flagged (if possible)
- [ ] All sessions/tokens signed by compromised key invalidated in backend

### 3.3 RECOVER — Restore Operations

```bash
# Step 1 — Grant replacement key admin/owner role (see §2.2 / §2.3)

# Step 2 — Verify replacement key is operational

# Step 3 — Unpause contract (Owner or quorum)
stellar contract invoke \
  --id $CONTRACT_ID \
  --network $STELLAR_NETWORK \
  --source $NEW_OWNER_KEY \
  -- unpause \
  --reason "Key rotation complete — incident resolved YYYY-MM-DD"

# Step 4 — Verify contract is unpaused
stellar contract invoke \
  --id $CONTRACT_ID \
  --network $STELLAR_NETWORK \
  --source $NEW_OWNER_KEY \
  -- is_paused
# Expected: false
```

**Recovery checklist:**

- [ ] Replacement key active and verified
- [ ] Contract unpaused
- [ ] Backend services reconnected with new key
- [ ] Confession anchoring pipeline smoke-tested end-to-end
- [ ] No unexpected state mutations detected (compare confession count before/after pause)

---

## 4. Communication Checklist

### Planned Rotation

| Step | Action | Owner |
|------|--------|-------|
| T-48h | Notify team in `#ops` channel with rotation window | On-call lead |
| T-24h | Confirm quorum signers are available | On-call lead |
| T-0 | Begin rotation, post status update | Executing engineer |
| T+1h | Confirm completion, post summary | Executing engineer |

### Break-Glass Incident

| Step | Action | Owner |
|------|--------|-------|
| Immediate | Post incident alert in `#incidents` channel | First responder |
| < 15 min | Assemble quorum signers | Incident commander |
| < 30 min | Pause contract and revoke compromised key | Incident commander |
| < 2h | Complete key rotation and restore service | On-call engineer |
| < 24h | Publish incident report | Engineering lead |

**Escalation contacts:**

- Core team: `#incidents` Telegram/Discord channel
- Stellar support: https://developers.stellar.org/support
- Community notice (if service disruption > 1h): post in `#announcements`

---

## 5. Post-Incident Verification

Run these checks after any rotation or break-glass response before closing the incident.

### 5.1 Contract State Integrity

```bash
# Confirm confession count unchanged (no writes during pause)
stellar contract invoke \
  --id $CONTRACT_ID \
  --network $STELLAR_NETWORK \
  --source $NEW_OWNER_KEY \
  -- get_confession_count
# Compare against pre-incident snapshot

# Confirm contract version unchanged
stellar contract invoke \
  --id $CONTRACT_ID \
  --network $STELLAR_NETWORK \
  --source $NEW_OWNER_KEY \
  -- get_version

# Confirm capabilities unchanged
stellar contract invoke \
  --id $CONTRACT_ID \
  --network $STELLAR_NETWORK \
  --source $NEW_OWNER_KEY \
  -- get_capabilities
```

### 5.2 Access Control Audit

```bash
# Verify current owner
stellar contract invoke \
  --id $CONTRACT_ID \
  --network $STELLAR_NETWORK \
  --source $NEW_OWNER_KEY \
  -- get_owner

# Verify admin set contains only expected addresses
# Cross-reference against secrets manager inventory
```

### 5.3 Event Log Review

Pull all governance events from Horizon for the incident window and confirm:

- [ ] `admin_granted` event present for new key
- [ ] `admin_revoked` event present for old/compromised key
- [ ] `ownership_xfer` event present if owner was rotated
- [ ] `contract_paused` and `contract_unpaused` events present (break-glass only)
- [ ] No unexpected `admin_granted` events from unknown addresses

### 5.4 Backend Integration Check

- [ ] Backend can successfully call `anchor_confession` with new key
- [ ] Backend can successfully call `verify_confession`
- [ ] Audit log in Postgres reflects the key rotation action
- [ ] No error spikes in backend logs post-rotation

### 5.5 Incident Report

Document the following before closing:

- Timeline of events (detection → pause → revoke → restore)
- Root cause of compromise or reason for rotation
- Actions taken and by whom
- Any state mutations that occurred before containment
- Follow-up tasks (e.g., security review, tooling improvements)

---

## 6. Drill Schedule

This runbook should be exercised regularly to ensure team readiness.

| Drill Type | Frequency | Participants |
|------------|-----------|--------------|
| Tabletop signer rotation | Quarterly | All engineers with contract access |
| Live rotation on testnet | Semi-annually | On-call lead + one co-signer |
| Break-glass simulation on testnet | Annually | Full incident response team |

**Drill pass criteria:**

- Rotation completed within 30 minutes on testnet
- Break-glass pause achieved within 5 minutes of simulated compromise
- All post-incident verification checks pass
- No steps skipped or improvised

After each drill, update this runbook with any gaps or improvements found.
