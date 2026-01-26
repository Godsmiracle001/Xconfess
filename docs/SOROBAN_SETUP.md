# Soroban Development Environment Setup

Complete guide for setting up the Soroban development environment for xConfess smart contract development.

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required Software Checklist

- [ ] **Rust** (v1.74.0 or later)
- [ ] **Cargo** (comes with Rust)
- [ ] **Stellar CLI** (latest version)
- [ ] **Node.js** (v18.0.0 or later)
- [ ] **Git** (v2.30.0 or later)

### Verify Installation

```bash
# Check Rust version
rustc --version  # Should be 1.74.0+

# Check Cargo version
cargo --version

# Check Node.js version
node --version  # Should be v18.0.0+

# Check Git version
git --version
```

---

## Installation Steps

### macOS

#### 1. Install Rust

```bash
# Install Rust using rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Restart terminal or run:
source $HOME/.cargo/env

# Verify installation
rustc --version
```

#### 2. Install Stellar CLI

```bash
# Install Stellar CLI with optimizations
cargo install --locked stellar-cli --features opt

# Verify installation
stellar --version
```

#### 3. Add WebAssembly Target

```bash
# Add wasm32 target for Soroban
rustup target add wasm32-unknown-unknown

# Verify
rustup target list | grep wasm32
```

#### 4. Install Node.js (if needed)

```bash
# Using Homebrew
brew install node

# Verify
node --version
npm --version
```

---

### Linux

#### 1. Install Rust

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Add to PATH
source $HOME/.cargo/env

# Verify
rustc --version
```

#### 2. Install Build Dependencies

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y build-essential pkg-config libssl-dev

# Fedora
sudo dnf install gcc openssl-devel pkg-config

# Arch Linux
sudo pacman -S base-devel openssl pkg-config
```

#### 3. Install Stellar CLI

```bash
cargo install --locked stellar-cli 

# Verify
stellar --version
```

#### 4. Add WebAssembly Target

```bash
rustup target add wasm32-unknown-unknown
```

---

### Windows (WSL2)

**Note:** Soroban development on Windows requires WSL2.

#### 1. Install WSL2

```powershell
# In PowerShell (Administrator)
wsl --install -d Ubuntu-22.04

# Restart computer
```

#### 2. Inside WSL2

```bash
# Update package manager
sudo apt update && sudo apt upgrade -y

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env

# Install dependencies
sudo apt install -y build-essential pkg-config libssl-dev

# Install Stellar CLI
cargo install --locked stellar-cli --features opt

# Add wasm32 target
rustup target add wasm32-unknown-unknown
```

---

## Build Instructions

### Building the confession-anchor Contract

#### Step 1: Navigate to Contract Directory

```bash
cd contracts/soroban-xconfess/confession-anchor
```

#### Step 2: Build with Stellar CLI (Recommended)

```bash
# Build the contract
stellar contract build
```

Output location: `target/wasm32-unknown-unknown/release/confession_anchor.wasm`

#### Step 3: Alternative Build with Cargo

```bash
# Build for WebAssembly
cargo build --target wasm32-unknown-unknown --release
```

#### Using the Build Script

```bash
# From project root
./scripts/build-contracts.sh
```

---

## Testing Guide

### Running Tests

#### Step 1: Navigate to Contract Directory

```bash
cd contracts/soroban-xconfess/confession-anchor
```

#### Step 2: Run All Tests

```bash
# Run tests
cargo test

# Run with verbose output
cargo test -- --nocapture
```

#### Step 3: Run Specific Tests

```bash
# Run a specific test
cargo test anchor_and_verify_confession

# Run tests matching a pattern
cargo test verify
```

#### Using the Test Script

```bash
# From project root
./scripts/test-contracts.sh

# With verbose output
./scripts/test-contracts.sh --verbose
```

### Expected Test Output

```
running 4 tests
test test::anchor_and_verify_confession ... ok
test test::duplicate_hash_does_not_overwrite ... ok
test test::verify_nonexistent_confession_returns_none ... ok
test test::multiple_confessions_update_count_and_events ... ok

test result: ok. 4 passed; 0 failed
```

---

## Deployment Guide

### Deploy to Stellar Testnet

#### Step 1: Configure Testnet

```bash
# Add testnet network
stellar network add \
  --global testnet \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015"

# Verify
stellar network ls
```

#### Step 2: Create Identity

```bash
# Generate new keypair
stellar keys generate --global deployer --network testnet

# Get public key
stellar keys address deployer
```

#### Step 3: Fund Account

```bash
# Fund using Friendbot
curl "https://friendbot.stellar.org?addr=$(stellar keys address deployer)"
```

#### Step 4: Deploy Contract

```bash
# Navigate to contract directory
cd contracts/soroban-xconfess/confession-anchor

# Deploy
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/confession_anchor.wasm \
  --source deployer \
  --network testnet
```

Save the returned contract ID (e.g., `CCHDY246UUPY6VUGIDVSK266KXA64CXM6RR2QLTKJD7E7IGV74ZP5XFB`)

#### Using the Deploy Script

```bash
# From project root
./scripts/deploy-contracts.sh
```

---

## Environment Variables Setup

### Backend (.env)

Create `.env` in `xconfess-backend/`:

```env
# Stellar Configuration
STELLAR_NETWORK=testnet
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
STELLAR_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org:443
STELLAR_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Contract IDs
CONFESSION_ANCHOR_CONTRACT=CCHDY246UUPY6VUGIDVSK266KXA64CXM6RR2QLTKJD7E7IGV74ZP5XFB

# Deployer (NEVER commit this!)
DEPLOYER_SECRET_KEY=SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Frontend (.env.local)

Create `.env.local` in `xconfess-frontend/`:

```env
# Stellar
NEXT_PUBLIC_STELLAR_NETWORK=testnet
NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_STELLAR_SOROBAN_RPC_URL=https://soroban-testnet.stellar.org:443
NEXT_PUBLIC_NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# Contracts
NEXT_PUBLIC_CONFESSION_ANCHOR_CONTRACT=CCHDY246UUPY6VUGIDVSK266KXA64CXM6RR2QLTKJD7E7IGV74ZP5XFB
```

---

## Troubleshooting Common Issues

### 1. "stellar: command not found"

**Problem:** Stellar CLI not in PATH

**Solution:**
```bash
# Add Cargo bin to PATH
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Or for bash
echo 'export PATH="$HOME/.cargo/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### 2. "error: linker `cc` not found"

**Problem:** Missing build tools

**Solution:**
```bash
# Ubuntu/Debian
sudo apt install build-essential

# macOS
xcode-select --install

# Fedora
sudo dnf install gcc
```

### 3. "error: target 'wasm32-unknown-unknown' not found"

**Problem:** WebAssembly target not installed

**Solution:**
```bash
rustup target add wasm32-unknown-unknown
```

### 4. Contract deployment fails with "account not found"

**Problem:** Account not funded on testnet

**Solution:**
```bash
# Fund your account
curl "https://friendbot.stellar.org?addr=$(stellar keys address deployer)"

# Wait 5-10 seconds and try again
```

### 5. "Transaction simulation failed"

**Problem:** Contract parameters incorrect or network issue

**Solution:**
- Verify contract parameters match expected types
- Check network connectivity
- Ensure contract is deployed correctly
- Try increasing transaction timeout

### 6. Build fails with memory errors

**Problem:** Insufficient memory

**Solution:**
```bash
# Build with less parallelism
cargo build --target wasm32-unknown-unknown --release -j 1
```

---

## Contract Interaction Examples

### JavaScript/TypeScript

#### Install Dependencies

```bash
npm install @stellar/stellar-sdk
```

#### Anchor a Confession

```javascript
import * as StellarSDK from '@stellar/stellar-sdk';

const CONTRACT_ID = 'CCHDY246UUPY6VUGIDVSK266KXA64CXM6RR2QLTKJD7E7IGV74ZP5XFB';
const RPC_URL = 'https://soroban-testnet.stellar.org:443';
const NETWORK_PASSPHRASE = 'Test SDF Network ; September 2015';

const server = new StellarSDK.SorobanRpc.Server(RPC_URL);

async function anchorConfession(confessionHash, userSecretKey) {
  const sourceKeypair = StellarSDK.Keypair.fromSecret(userSecretKey);
  const sourceAccount = await server.getAccount(sourceKeypair.publicKey());
  
  const contract = new StellarSDK.Contract(CONTRACT_ID);
  
  // Convert hash to BytesN<32>
  const hashBuffer = Buffer.from(confessionHash, 'hex');
  const hashScVal = StellarSDK.nativeToScVal(hashBuffer, { type: 'bytes' });
  
  // Current timestamp
  const timestamp = Date.now();
  const timestampScVal = StellarSDK.nativeToScVal(timestamp, { type: 'u64' });
  
  // Build transaction
  const transaction = new StellarSDK.TransactionBuilder(sourceAccount, {
    fee: StellarSDK.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('anchor_confession', hashScVal, timestampScVal))
    .setTimeout(30)
    .build();
  
  // Simulate
  const simulateResponse = await server.simulateTransaction(transaction);
  
  // Prepare and sign
  const preparedTx = StellarSDK.SorobanRpc.assembleTransaction(
    transaction,
    simulateResponse
  );
  preparedTx.sign(sourceKeypair);
  
  // Submit
  const sendResponse = await server.sendTransaction(preparedTx);
  
  // Poll for result
  let getResponse = await server.getTransaction(sendResponse.hash);
  while (getResponse.status === 'NOT_FOUND') {
    await new Promise(resolve => setTimeout(resolve, 1000));
    getResponse = await server.getTransaction(sendResponse.hash);
  }
  
  return sendResponse.hash;
}
```

#### Verify a Confession

```javascript
async function verifyConfession(confessionHash) {
  const contract = new StellarSDK.Contract(CONTRACT_ID);
  const keypair = StellarSDK.Keypair.random();
  const account = await server.getAccount(keypair.publicKey());
  
  const hashBuffer = Buffer.from(confessionHash, 'hex');
  const hashScVal = StellarSDK.nativeToScVal(hashBuffer, { type: 'bytes' });
  
  const transaction = new StellarSDK.TransactionBuilder(account, {
    fee: StellarSDK.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('verify_confession', hashScVal))
    .setTimeout(30)
    .build();
  
  const simulateResponse = await server.simulateTransaction(transaction);
  
  if (StellarSDK.SorobanRpc.Api.isSimulationSuccess(simulateResponse)) {
    const result = simulateResponse.result?.retval;
    return result ? Number(StellarSDK.scValToNative(result)) : null;
  }
  
  return null;
}
```

### How to Call Contracts from Frontend

```typescript
// src/lib/stellar/contract.ts
import * as StellarSDK from '@stellar/stellar-sdk';
import crypto from 'crypto';

export async function anchorConfessionFromFrontend(
  confessionText: string,
  secretKey: string
): Promise<string> {
  // Create SHA-256 hash
  const hash = crypto.createHash('sha256')
    .update(confessionText)
    .digest('hex');
  
  // Call anchor function
  const txHash = await anchorConfession(hash, secretKey);
  
  return txHash;
}

export async function verifyConfessionFromFrontend(
  confessionText: string
): Promise<number | null> {
  // Create SHA-256 hash
  const hash = crypto.createHash('sha256')
    .update(confessionText)
    .digest('hex');
  
  // Call verify function
  const timestamp = await verifyConfession(hash);
  
  return timestamp;
}
```

### How to Verify Transactions

```javascript
async function getTransactionStatus(txHash) {
  const response = await server.getTransaction(txHash);
  
  switch (response.status) {
    case 'SUCCESS':
      console.log('Transaction successful!');
      return response;
    case 'FAILED':
      console.error('Transaction failed:', response.resultXdr);
      return null;
    case 'NOT_FOUND':
      console.log('Transaction not found (still pending)');
      return null;
    default:
      console.log('Unknown status:', response.status);
      return null;
  }
}

// Usage
const txHash = await anchorConfession(hash, secretKey);
const result = await getTransactionStatus(txHash);
```

---

## Additional Resources

### Official Documentation

- **Soroban Documentation**: https://soroban.stellar.org/docs
- **Stellar CLI**: https://developers.stellar.org/docs/tools/developer-tools
- **Stellar SDK**: https://stellar.github.io/js-stellar-sdk/

### Getting Help

- **Stellar Discord**: https://discord.gg/stellardev
- **Stellar Stack Exchange**: https://stellar.stackexchange.com/
- **xConfess Community**: https://t.me/xconfess_Community

---

*Last updated: January 24, 2026*