# Soroban Contract Deployment Guide

Complete guide for deploying xConfess smart contracts to Stellar networks.

## 📋 Prerequisites

Before deploying contracts, ensure you have:

1. ✅ Soroban development environment set up (see [README.md](./README.md))
2. ✅ All contracts built successfully with `stellar contract build`
3. ✅ Stellar account with testnet XLM (for testing)
4. ✅ Stellar CLI v21.x or later

### Quick Setup Check

```bash
# From xconfess-contracts directory
source $HOME/.cargo/env

# Verify tools
rustc --version  # Should be 1.74.0+
cargo --version
stellar --version  # Should be 21.x+
```

## 🌐 Network Configuration

### Add Testnet Network

```bash
# Configure testnet network
stellar network add-remote testnet https://horizon-testnet.stellar.org
stellar network use testnet

# Verify configuration
stellar network list
```

### Create/Fund Test Account

```bash
# Create a new account (if needed)
stellar keys generate --name mykey

# Get public key
stellar keys show mykey

# Fund account (use Stellar testnet faucet)
# Visit: https://laboratory.stellar.org/#account-creator?network=testnet
```

## 🚀 Building Contracts

### Build All Contracts

```bash
cd /workspaces/Xconfess/xconfess-contracts

# Build all for WebAssembly
cargo build --release --target wasm32-unknown-unknown
```

### Build for Testing

```bash
# Build with debug info (faster for development)
cargo build --target wasm32-unknown-unknown
```

## 📦 Contract Locations

After building, compiled contracts are at:

```
target/wasm32-unknown-unknown/release/
├── confession_anchor.wasm
├── reputation_badges.wasm
└── anonymous_tipping.wasm
```

## 🚁 Deployment Steps

### 1. Prepare Account

```bash
# Use your test account
export STELLAR_ACCOUNT="your-public-key"
export STELLAR_SECRET="your-secret-key"

# Set network
stellar network use testnet
```

### 2. Deploy Confession Anchor Contract

```bash
# Build contract
cargo build --release --target wasm32-unknown-unknown -p confession-anchor

# Deploy contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/confession_anchor.wasm \
  --source-account $STELLAR_ACCOUNT \
  --network testnet

# Note: Save the returned CONTRACT_ID
export CONFESSION_ANCHOR_ID="contract-id-from-output"
```

### 3. Deploy Reputation Badges Contract

```bash
# Build contract
cargo build --release --target wasm32-unknown-unknown -p reputation-badges

# Deploy contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/reputation_badges.wasm \
  --source-account $STELLAR_ACCOUNT \
  --network testnet

export REPUTATION_BADGES_ID="contract-id-from-output"
```

### 4. Deploy Anonymous Tipping Contract

```bash
# Build contract
cargo build --release --target wasm32-unknown-unknown -p anonymous-tipping

# Deploy contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/anonymous_tipping.wasm \
  --source-account $STELLAR_ACCOUNT \
  --network testnet

export ANONYMOUS_TIPPING_ID="contract-id-from-output"
```

## 🧪 Testing Contracts

### Unit Tests

```bash
# Run all contract tests
cargo test

# Run specific contract tests
cargo test -p confession-anchor
cargo test -p reputation-badges
cargo test -p anonymous-tipping

# Run with output
cargo test -- --nocapture
```

### Integration Tests

```bash
# Test contract invocation locally
stellar contract invoke \
  --id $CONFESSION_ANCHOR_ID \
  --source-account $STELLAR_ACCOUNT \
  --network testnet \
  -- init_contract
```

### Test Script

```bash
# From project root
bash xconfess-contracts/scripts/test-contracts.sh
```

## 📝 Configuration Storage

Save deployed contract IDs:

Create `deployments/testnet.json`:

```json
{
  "network": "testnet",
  "deployed_at": "2024-01-25T00:00:00Z",
  "contracts": {
    "confession_anchor": {
      "id": "CXXXXXXXXX...",
      "wasm": "confession_anchor.wasm",
      "version": "0.1.0"
    },
    "reputation_badges": {
      "id": "CYYYYYYYYY...",
      "wasm": "reputation_badges.wasm",
      "version": "0.1.0"
    },
    "anonymous_tipping": {
      "id": "CZZZZZZZZZZ...",
      "wasm": "anonymous_tipping.wasm",
      "version": "0.1.0"
    }
  }
}
```

## 🔍 Verify Deployment

### Check Contract on Network

```bash
# Get contract info
stellar contract info \
  --id $CONFESSION_ANCHOR_ID \
  --network testnet
```

### View Contract Source

```bash
# Download and view contract WASM
stellar contract fetch \
  --id $CONFESSION_ANCHOR_ID \
  --network testnet \
  --out-file confession_anchor_deployed.wasm
```

## 🐛 Troubleshooting

### Error: "Account not found"

```bash
# Account not funded on testnet
# Use Stellar Testnet Faucet:
# https://laboratory.stellar.org/#account-creator?network=testnet
```

### Error: "Invalid wasm"

```bash
# Rebuild contract with correct target
cargo build --release --target wasm32-unknown-unknown --all
```

### Error: "Contract already exists"

```bash
# Use different contract ID or create new account
# Check existing deployments in deployments/testnet.json
```

### Slow Deployment

```bash
# Testnet may be slow
# Wait 5-10 seconds between deployments
# Check network status: https://status.stellar.org
```

## 📊 Deployment Checklist

Before deploying to production:

- [ ] All contracts build without warnings
- [ ] All tests pass (`cargo test`)
- [ ] Code reviewed for security
- [ ] Testnet deployment successful
- [ ] Contract functions tested via CLI
- [ ] Contract IDs saved to `deployments/`
- [ ] Documentation updated
- [ ] Network is correct (testnet vs mainnet)
- [ ] Account has sufficient balance
- [ ] Backup of secret keys created

## 🔐 Production Deployment

### Mainnet Deployment (Use with Caution!)

```bash
# Configure mainnet
stellar network add-remote mainnet https://horizon.stellar.org
stellar network use mainnet

# Deploy with additional safety checks
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/confession_anchor.wasm \
  --source-account $PRODUCTION_ACCOUNT \
  --network mainnet
```

**⚠️ WARNING:** Only deploy to mainnet after thorough testing on testnet!

## 📚 Additional Resources

- [Stellar Contract Deploy Docs](https://developers.stellar.org/docs/build/smart-contracts)
- [Soroban CLI Reference](https://soroban.stellar.org/docs/learn/storing-data)
- [Stellar Laboratory](https://laboratory.stellar.org/)
- [Horizon API Docs](https://developers.stellar.org/api/)

## 📞 Support

For issues or questions:

1. Check [README.md](./README.md) for setup help
2. Review Soroban documentation
3. Test on testnet first
4. Report issues to project maintainers
