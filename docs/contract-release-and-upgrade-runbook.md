# Contract Release and Upgrade Runbook

This is the canonical runbook for planning, building, deploying, and upgrading xConfess smart contracts to Stellar networks.

**Key principle:** All contract releases follow a single deterministic flow using `./scripts/contracts-release.sh`. Never manually invoke `stellar contract deploy` or `cargo build` outside this script.

---

## Table of Contents

- [Overview](#overview)
- [Pre-Release Checklist](#pre-release-checklist)
- [Toolchain Verification](#toolchain-verification)
- [Build Phase](#build-phase)
- [Deployment Phase](#deployment-phase)
- [Post-Deployment Verification](#post-deployment-verification)
- [Contract Reference](#contract-reference)
- [Upgrade and Rollback](#upgrade-and-rollback)
- [Troubleshooting](#troubleshooting)

---

## Overview

### Contracts in Active Release

The xconfess-contracts workspace contains four contracts deployed as a unit:

| Contract | Crate | Purpose | Deployed | Upgradeable |
|----------|-------|---------|----------|-------------|
| **ConfessionAnchor** | `confession-anchor` | Tamper-proof hash anchoring on-chain | Yes | No (immutable once deployed) |
| **ConfessionRegistry** | `confession-registry` | Registry and lifecycle management of confessions with governance | Yes | Limited (governance controls) |
| **ReputationBadges** | `reputation-badges` | User badges and reputation tracking | Yes | No (badge types are fixed) |
| **AnonymousTipping** | `anonymous-tipping` | Anonymous tip distribution and settlement tracking | Yes | No (settlement logic is fixed) |

All four contracts are built and deployed together in a single release window. They share a common `Cargo.lock` snapshot for reproducibility.

### Network Support

- **Testnet**: Uses Stellar testnet (https://horizon-testnet.stellar.org)
- **Futurenet**: Uses Stellar futurenet (https://horizon-futurenet.stellar.org)
- **Public/Mainnet**: Uses Stellar public network (https://horizon.stellar.org)

---

## Pre-Release Checklist

Before beginning a contract release or upgrade:

**Code Readiness**
- [ ] All contract source changes reviewed and approved in pull request
- [ ] Security review completed for any contract API or storage changes
- [ ] Contract versioning updated in `xconfess-contracts/contracts/*/Cargo.toml` according to [VERSIONING.md](../xconfess-contracts/VERSIONING.md)
- [ ] `xconfess-contracts/Cargo.lock` committed and reflects final dependency state
- [ ] All Rust lints pass locally: `cargo clippy --all-targets --all-features`

**Infrastructure Readiness**
- [ ] Testnet deployer account is funded with sufficient XLM for all deployments
- [ ] Production/Mainnet deployer account exists and is properly secured (only if moving to mainnet)
- [ ] Backend and frontend teams confirmed they can consume new contract IDs if contract addresses change
- [ ] Required environment variables prepared for the target network
- [ ] Network status verified at https://status.stellar.org
- [ ] Rollback plan defined (what will you do if deployment fails)

**Documentation**
- [ ] Release notes drafted with contract version changes and compatibility notes
- [ ] Any new contract functions documented for downstream consumers
- [ ] Breaking changes (if any) flagged with migration guidance

---

## Toolchain Verification

Ensure your local environment is ready for building and deploying.

### Required Versions

| Tool | Minimum | Current Spec |
|------|---------|--------------|
| **Rust** (stable) | 1.81 | Use `rustc --version` |
| **Cargo** | — | Comes with Rust |
| **wasm32-unknown-unknown** target | — | Install via `rustup target add wasm32-unknown-unknown` |
| **Stellar CLI** | 22.0.0 | Check version carefully; older `soroban` CLI is deprecated |
| **Node.js** | 18.0.0 | For npm scripts in workspace |
| **Python 3** | 3.7+ | Used by build manifest generation script |

### Verification Script

Run this before any release:

```bash
#!/usr/bin/env bash

echo "=== Toolchain Verification ==="
echo

echo "Rust version:"
rustc --version

echo
echo "Cargo version:"
cargo --version

echo
echo "Stellar CLI version (must be 22.0.0 or later):"
stellar --version

echo
echo "Node.js version:"
node --version

echo
echo "WASM target installed:"
rustup target list | grep wasm32-unknown-unknown

echo
echo "Python version:"
python3 --version

echo
echo "=== Toolchain Ready ===" 
```

### Upgrade Toolchain If Needed

```bash
# Upgrade Rust to latest stable
rustup update stable

# Add WASM target (idempotent)
rustup target add wasm32-unknown-unknown

# Upgrade Stellar CLI to 22.0.0
cargo install --locked stellar-cli --version 22.0.0 --features opt

# Verify installed version
stellar --version  # Should report: stellar 22.0.0
```

---

## Build Phase

### Step 1: Prepare the Environment

From the repository root:

```bash
# Navigate to repo root (if not already)
cd "$(git rev-parse --show-toplevel)"

# Verify you are on the correct branch with the intended changes
git branch -v
git log --oneline -5

# Confirm all changes are committed (no dirty working tree)
git status

# Double-check Cargo.lock reflects the final state
git show HEAD:xconfess-contracts/Cargo.lock | head -20
```

### Step 2: Run the Build

```bash
# From repository root, run the canonical build script
./scripts/contracts-release.sh build
```

**What this does:**
1. Verifies `cargo` and `rustup` are available
2. Adds the WASM target if missing (idempotent)
3. Builds all four contracts using `cargo build --locked --workspace --release --target wasm32-unknown-unknown`
4. Generates `deployments/contract-wasm-manifest.json` with SHA-256 hashes and version metadata
5. Returns exit code 0 on success

**Expected output:**

```
[build output omitted]
Build complete. Manifest: ./deployments/contract-wasm-manifest.json
```

### Step 3: Verify Build Artifacts

```bash
# Check the manifest was generated
cat deployments/contract-wasm-manifest.json | jq .

# Verify all four WASM files exist
ls -lh xconfess-contracts/target/wasm32-unknown-unknown/release/*.wasm

# Expected files:
#   confession_anchor.wasm
#   confession_registry.wasm
#   reputation_badges.wasm
#   anonymous_tipping.wasm

# Record the manifest SHA-256 hashes for later verification
jq '.contracts | keys' deployments/contract-wasm-manifest.json
```

### Step 4: Commit Build Metadata (if applicable)

For release branches or snapshots, you may want to commit the manifest:

```bash
git add deployments/contract-wasm-manifest.json
git commit -m "build: contract release manifest for version X.Y.Z"
```

---

## Deployment Phase

### Step 1: Configure the Target Network

Before deploying, ensure the Stellar CLI has the target network configured:

```bash
# For Testnet (example)
stellar network add-remote testnet https://horizon-testnet.stellar.org
stellar network use testnet
stellar network list
```

**Common networks:**

```bash
# Testnet
stellar network add-remote testnet https://horizon-testnet.stellar.org

# Futurenet
stellar network add-remote futurenet https://horizon-futurenet.stellar.org

# Public/Mainnet
stellar network add-remote public https://horizon.stellar.org
```

### Step 2: Ensure Deployer Account is Funded

```bash
# Check account balance on testnet (example)
export DEPLOYER_KEY="your-named-key"
stellar keys show "$DEPLOYER_KEY"

# Fund the account:
# - Testnet: Use faucet at https://laboratory.stellar.org/#account-creator?network=testnet
# - Mainnet: Transfer XLM from your holdings
# Recommended minimum: 2 XLM (for transaction fees across all four contracts)
```

### Step 3: Deploy All Contracts

```bash
# Run the canonical deploy script
# Arguments: network (testnet/futurenet/public) and source key name
./scripts/contracts-release.sh deploy --network testnet --source "$DEPLOYER_KEY"
```

Replace:
- `testnet` with the target network (futurenet, public, etc.)
- `"$DEPLOYER_KEY"` with the name of the Stellar CLI key to use for signing

**What this does:**
1. Verifies the WASM artifacts exist and match the manifest
2. Deploys each contract in sequence using `stellar contract deploy`
3. Records each returned contract ID
4. Writes deployment metadata to `deployments/testnet.json` (or `<network>.json`)
5. Returns exit code 0 on success

**Expected output:**

```
Deploying confession-anchor (confession_anchor.wasm) to testnet...
Deploying confession-registry (confession_registry.wasm) to testnet...
Deploying reputation-badges (reputation_badges.wasm) to testnet...
Deploying anonymous-tipping (anonymous_tipping.wasm) to testnet...
Deployment metadata written to: ./deployments/testnet.json
```

### Step 4: Verify Deployment Metadata

```bash
# Check the deployment output
cat deployments/testnet.json | jq .

# Extract and record each contract ID:
jq '.contracts | to_entries[] | {name: .key, id: .value.contract_id}' deployments/testnet.json

# Example output:
# {
#   "name": "confession-anchor",
#   "id": "CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB5C"
# }
```

**Save these contract IDs.** Backend and frontend services will reference them in configuration.

### Step 5: Commit Deployment Record

```bash
git add deployments/testnet.json
git commit -m "deploy: contracts deployed to testnet, version X.Y.Z"
```

---

## Post-Deployment Verification

### Step 1: Confirm Contracts Are On-Chain

```bash
# Verify each contract exists on the network
export CONFESSION_ANCHOR_ID="<id-from-deployment-metadata>"

stellar contract info --id "$CONFESSION_ANCHOR_ID" --network testnet
```

Expected output includes contract code hash and other metadata.

### Step 2: Test Contract Invocation

Test at least one read-only function from each contract to confirm they are callable:

```bash
# Test ConfessionAnchor::get_version
stellar contract invoke \
  --id "$CONFESSION_ANCHOR_ID" \
  --source "$DEPLOYER_KEY" \
  --network testnet \
  -- get_version

# Test ConfessionRegistry::governance with a query (if applicable)
export CONFESSION_REGISTRY_ID="<id-from-deployment-metadata>"
stellar contract invoke \
  --id "$CONFESSION_REGISTRY_ID" \
  --source "$DEPLOYER_KEY" \
  --network testnet \
  -- get_config

# Test ReputationBadges::get_badge_count
export REPUTATION_BADGES_ID="<id-from-deployment-metadata>"
stellar contract invoke \
  --id "$REPUTATION_BADGES_ID" \
  --source "$DEPLOYER_KEY" \
  --network testnet \
  -- get_badge_count

# Test AnonymousTipping::init or query
export ANONYMOUS_TIPPING_ID="<id-from-deployment-metadata>"
stellar contract invoke \
  --id "$ANONYMOUS_TIPPING_ID" \
  --source "$DEPLOYER_KEY" \
  --network testnet \
  -- init
```

### Step 3: Check Event Emission (if applicable)

For contracts that emit events, verify events are being recorded:

```bash
# Fetch recent events from ConfessionAnchor
stellar contract events \
  --id "$CONFESSION_ANCHOR_ID" \
  --network testnet \
  --limit 10
```

### Step 4: Backend and Frontend Integration

Once contract IDs are confirmed:

1. **Backend team**: Update `.env` or configuration to reference new contract IDs.
2. **Frontend team**: If contract ABIs or function signatures changed, regenerate TypeScript bindings.
3. **Integration test**: Run end-to-end smoke tests against the newly deployed contracts.

---

## Contract Reference

### ConfessionAnchor (`confession-anchor`)

**Purpose:** Stores tamper-proof 32-byte hashes of confessions on-chain.

**Key Functions:**
- `anchor_confession(hash: BytesN<32>, timestamp: u64) -> Symbol` — Anchor a new confession hash. Returns "anchored" or "exists".
- `verify_confession_hash(hash: BytesN<32>) -> bool` — Check if a hash has been anchored.
- `get_confession_count() -> u64` — Total number of anchored confessions.
- `get_version() -> ContractVersionInfo` — Semantic version and build metadata.
- `get_capabilities() -> ContractCapabilityInfo` — Supported features and schema versions.

**No admin functions.** Contract is immutable once deployed.

### ConfessionRegistry (`confession-registry`)

**Purpose:** Lifecycle management and registry of confessions with governance controls.

**Key Functions:**
- `initialize(admin: Address)` — Set up contract with initial admin (call once at deployment).
- `set_quorum(threshold: u32)` — Configure governance quorum threshold (admin only).
- `gov_propose(proposer: Address, action: CriticalAction) -> u64` — Submit governance proposal.
- `get_config() -> GovernanceConfig` — Query current governance configuration.

**Important:** Registry is governance-controlled. Updates to critical settings require proposals.

### ReputationBadges (`reputation-badges`)

**Purpose:** Award and track user reputation badges on-chain.

**Key Functions:**
- `mint_badge(recipient: Address, badge_type: BadgeType) -> Result<u64, Error>` — Issue a badge to a user.
- `revoke_badge(badge_id: u64)` — Remove a badge from the chain.
- `get_user_badges(user: Address) -> Vec<u64>` — List all badges owned by a user.
- `get_badge_count() -> u64` — Total badges in circulation.

**Badge Types (fixed):**
- `ConfessionStarter` — First confession posted
- `PopularVoice` — 100+ reactions received
- `GenerousSoul` — Tipped 10+ confessions
- `CommunityHero` — 50+ confessions posted
- `TopReactor` — 500+ reactions given

### AnonymousTipping (`anonymous-tipping`)

**Purpose:** Decentralized, anonymous tip settlement and tracking.

**Key Functions:**
- `init(env: Env)` — Initialize the settlement nonce (call once at deployment).
- `send_tip(recipient: Address, amount: i128) -> u64` — Send an anonymous tip, returns settlement ID.
- `send_tip_with_proof(recipient: Address, amount: i128, proof_metadata: Option<String>) -> u64` — Send tip with optional proof metadata (max 128 chars).
- `get_tips(recipient: Address) -> i128` — Query total tips received by address.
- `latest_settlement_nonce() -> u64` — Get the current settlement nonce.

**No admin functions.** Contract is fully decentralized (no admin controls).

---

## Upgrade and Rollback

### Contract Upgrade Limitations

**Important:** None of the four contracts support in-place upgrades on Stellar/Soroban. Contracts are immutable once deployed.

To deploy a new contract version:

1. **Build** the new version with updated Cargo.toml versions.
2. **Deploy** the new WASM as a new contract ID (separate from the old contract).
3. **Migrate** backend and frontend to reference the new contract IDs.
4. **Archive** the old contract metadata for reference.

### Rollback Procedure

If a contract deployment fails or causes issues:

1. **Halt the release.** Stop all downstream services from consuming the new contract ID.
2. **Revert deployment records.**  Use the previous `deployments/<network>.json` file to identify the working contract IDs.
3. **Restore backend/frontend config** to reference the old contract IDs.
4. **Post-rollback analysis**: Review logs and contract invocation failures to understand what went wrong.

### Version Signaling

Each contract includes version metadata accessible at runtime:

```bash
# Get version info from deployed contract
stellar contract invoke \
  --id "$CONTRACT_ID" \
  --source "$DEPLOYER_KEY" \
  --network testnet \
  -- get_version
```

Returns a `ContractVersionInfo` struct with:
- `major`, `minor`, `patch` — Semantic version (see [VERSIONING.md](../xconfess-contracts/VERSIONING.md))
- `build_metadata` — Build identifier and timestamp

Use these values to confirm which version is running on each network.

---

## Troubleshooting

### Build Failures

**Error: "Missing required command: cargo"**

```bash
# Rust is not installed or not in PATH
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
```

**Error: "cargo build --locked" fails with dependency issues**

```bash
# Cargo.lock is out of sync
# Delete it and run build again (will regenerate lock)
rm xconfess-contracts/Cargo.lock
./scripts/contracts-release.sh build
```

**Error: WASM target not found**

```bash
# wasm32-unknown-unknown target not installed
rustup target add wasm32-unknown-unknown
./scripts/contracts-release.sh build
```

### Deployment Failures

**Error: "Account not found"**

```bash
# Deployer account does not exist or is not funded on the target network
stellar network use testnet
stellar keys fund "$DEPLOYER_KEY"  # Use testnet faucet if available
# Or manually fund via https://laboratory.stellar.org
```

**Error: "stellar: command not found"**

```bash
# Stellar CLI is not installed or not in PATH
cargo install --locked stellar-cli --version 22.0.0 --features opt
stellar --version
```

**Error: "Invalid network"**

```bash
# Network not configured in Stellar CLI
stellar network add-remote testnet https://horizon-testnet.stellar.org
stellar network use testnet
stellar network list
```

**Error: "Contract deploy timeout"**

```bash
# Network congestion; wait and retry
sleep 10
./scripts/contracts-release.sh deploy --network testnet --source "$DEPLOYER_KEY"
```

### Verification Failures

**Contract invocation returns error code**

```bash
# The contract is deployed but rejects the function call
# Possible causes:
# 1. Wrong function name (typo in CLI command)
# 2. Function requires specific arguments (check Contract Reference)
# 3. Contract not yet initialized (some functions require init() first)

# Verify the contract exists
stellar contract fetch --id "$CONTRACT_ID" --network testnet --out-file check.wasm
# If this succeeds, the contract is on-chain and can be invoked
```

---

## References

- [VERSIONING.md](../xconfess-contracts/VERSIONING.md) — Contract versioning policy and SemVer rules
- [README.md](../xconfess-contracts/README.md) — Toolchain setup and project structure
- [DEPLOYMENT.md](../xconfess-contracts/DEPLOYMENT.md) — Manual deployment steps (use scripts-release.sh instead)
- [CONTRACT_LIFECYCLE.md](../xconfess-contracts/CONTRACT_LIFECYCLE.md) — Contract initialization details (outdated; prefer this runbook)
- [Stellar Contract Docs](https://developers.stellar.org/docs/smart-contracts/) — Stellar Soroban documentation
- [Stellar CLI Docs](https://developers.stellar.org/docs/tools-and-sdks#cli) — Stellar CLI reference

---

**Last updated:** 2026-03-28  
**Owner:** XConfess Platform Team  
**Status:** Canonical — All releases use this runbook
