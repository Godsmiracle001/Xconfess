# xConfess Soroban Smart Contracts

This directory contains the Soroban smart contracts for the xConfess platform, built on the Stellar blockchain.

## 📁 Project Structure

```
contracts/
├── confession-anchor/      # Manages confession anchoring and verification
├── reputation-badges/      # Handles user reputation and badge system
└── anonymous-tipping/      # Enables anonymous tipping functionality
```

## 🚀 Quick Start

### Prerequisites

- **Rust** 1.74.0 or later ([Install Rust](https://rustup.rs/))
- **Stellar CLI** 21.x or later
- **Soroban SDK** 21.x or later
- **Node.js** 18.0.0 or later (for integration testing)

### Installation

1. **Install Rust (if not already installed)**

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

2. **Install Stellar CLI**

```bash
cargo install --locked stellar-cli --features opt
stellar --version  # Should be 21.x or later
```

3. **Add WebAssembly Target**

```bash
rustup target add wasm32-unknown-unknown
```

4. **Verify Installation**

```bash
# From the xconfess-contracts directory
cargo --version
stellar --version
```

## 🔨 Building Contracts

### Build All Contracts

```bash
# Build all contracts in release mode
stellar contract build

# Or use cargo directly
cargo build --release --target wasm32-unknown-unknown
```

### Build Individual Contract

```bash
# Build a specific contract
cd contracts/confession-anchor
stellar contract build

# Or from root
cargo build --release --target wasm32-unknown-unknown -p confession-anchor
```

### Build with Logs (Debug)

```bash
# Build with debug information
cargo build --profile release-with-logs --target wasm32-unknown-unknown
```

## 🧪 Testing

### Run Unit Tests

```bash
# Run all tests
cargo test

# Run tests for a specific contract
cargo test -p confession-anchor

# Run tests with output
cargo test -- --nocapture
```

### Test Contract Locally

```bash
# Test contract invocation
stellar contract invoke \
  --id 1 \
  --source-account account-id \
  --network testnet \
  -- init

# Or use the helper scripts
bash ../scripts/test-contracts.sh
```

## 📦 Contract Details

### 1. Confession Anchor (`confession-anchor`)

Manages confession anchoring and verification on the Stellar blockchain.

**Key Features:**
- Anchor confessions with timestamp verification
- Proof-of-existence for confessions
- Tamper-proof record storage

**Version:** 0.1.0

### 2. Reputation Badges (`reputation-badges`)

Implements a reputation and badge system for users.

**Key Features:**
- Award badges based on community engagement
- Track user reputation scores
- Implement tiered badge system

**Version:** 0.1.0

### 3. Anonymous Tipping (`anonymous-tipping`)

Enables anonymous tipping functionality for confessions.

**Key Features:**
- Send anonymous tips
- Track tip history
- Support multiple token types

**Version:** 0.1.0

## 🌐 Network Configuration

### Testnet Deployment

1. **Configure Network**

```bash
stellar network add-remote testnet https://horizon-testnet.stellar.org
stellar network use testnet
```

2. **Create Test Account**

```bash
stellar account create --signer <your-public-key>
```

3. **Deploy Contract**

```bash
stellar contract deploy \
  --wasm contracts/confession-anchor/target/wasm32-unknown-unknown/release/confession_anchor.wasm \
  --source-account <account-id> \
  --network testnet
```

See [deployments/testnet.json](../deployments/testnet.json) for deployment configurations.

## 📚 Documentation

- [Soroban Documentation](https://soroban.stellar.org/)
- [Stellar CLI Reference](https://developers.stellar.org/docs/tools/stellar-cli)
- [Soroban Setup Guide](../docs/SOROBAN_SETUP.md)

## 🔧 Development Workflow

### 1. Create a New Contract

```bash
# Create contract structure
mkdir contracts/new-contract/src
touch contracts/new-contract/Cargo.toml
touch contracts/new-contract/src/lib.rs
```

### 2. Update Workspace Cargo.toml

Add your contract to the workspace in the root `Cargo.toml`:

```toml
[workspace]
members = [
  "contracts/new-contract",
]
```

### 3. Implement Contract

Edit `contracts/new-contract/src/lib.rs` with your contract logic.

### 4. Test & Build

```bash
cargo test -p new-contract
stellar contract build -p new-contract
```

## 🐛 Troubleshooting

### Build Failures

**Error: `failed to parse manifest`**
- Ensure `Cargo.toml` is properly formatted
- Check that all dependencies are listed in workspace

**Error: `wasm32-unknown-unknown target not found`**
```bash
rustup target add wasm32-unknown-unknown
```

### Runtime Issues

**Contract not found after deployment**
- Verify the contract ID in your configuration
- Check network connectivity to testnet
- Ensure account has sufficient balance

### Build Performance

For faster builds during development:

```bash
# Use debug mode
cargo build --target wasm32-unknown-unknown

# Or build with fewer optimizations
cargo build --release --target wasm32-unknown-unknown -C opt-level=1
```

## 📝 Additional Resources

- [Soroban Examples](https://github.com/stellar/rs-soroban-sdk/tree/main/soroban-sdk/examples)
- [Stellar CLI Commands](https://developers.stellar.org/docs/tools/stellar-cli)
- [Soroban SDK API Reference](https://docs.rs/soroban-sdk)

## 📋 Build Checklist

Before deploying to production:

- [ ] All contracts build successfully (`stellar contract build`)
- [ ] All tests pass (`cargo test`)
- [ ] Code reviewed for security issues
- [ ] Contract deployed to testnet and tested
- [ ] Deployment configuration documented in `deployments/`
- [ ] Contract ABIs exported and documented
- [ ] Integration tests pass
- [ ] Documentation updated

## 🤝 Contributing

When adding new contracts or features:

1. Create contract in `contracts/new-contract/`
2. Add comprehensive tests
3. Update workspace `Cargo.toml`
4. Document in this README
5. Test build and deployment
6. Submit pull request with changes

## 📄 License

This project is licensed under the same license as the main xConfess project. See [LICENSE](../LICENSE) for details.
