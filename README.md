# xConfess

<div align="center">

![xConfess Banner](https://img.shields.io/badge/xConfess-Anonymous%20Confessions-blueviolet?style=for-the-badge)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![Stellar](https://img.shields.io/badge/Built%20on-Stellar-7D00FF?style=for-the-badge&logo=stellar)](https://stellar.org)
[![Soroban](https://img.shields.io/badge/Soroban-Smart%20Contracts-00ADD8?style=for-the-badge)](https://soroban.stellar.org)

**A privacy-first anonymous confession platform leveraging Stellar blockchain for immutability, transparency, and trustless verification.**

[🚀 Live Demo](#) • [📖 Documentation](#) • [💬 Community](https://t.me/xconfess_Community) • [🐛 Report Bug](https://github.com/Godsmiracle001/Xconfess/issues)

</div>

---

## 🌟 What is xConfess?

xConfess is an anonymous confession platform where users can share their thoughts, react to confessions, and engage privately—all while maintaining complete anonymity. By integrating Stellar blockchain technology, we ensure confessions are verifiable, immutable, and censorship-resistant.

### ✨ Key Features

- 🔐 **100% Anonymous**: No login required, complete privacy guaranteed
- ⛓️ **Blockchain-Verified**: Confessions anchored on Stellar for immutability
- 💬 **Real-time Interactions**: Live reactions, comments, and messaging
- 🏆 **Achievement System**: Earn on-chain badges (NFTs) for community participation
- 💰 **Micro-Tipping**: Reward quality confessions with XLM
- 🎨 **Modern UI**: Beautiful, responsive interface built with Next.js & TailwindCSS
- ⚡ **Lightning Fast**: Powered by Stellar's fast finality and low fees

---

## 🌐 Stellar Integration

Built for the **Stellar ecosystem** with first-class **Soroban** support:

## 🔗 Stellar Smart Contracts

### Quick Start

```bash
# 1. Install Stellar CLI
cargo install --locked stellar-cli --features opt

# 2. Add WebAssembly target
rustup target add wasm32-unknown-unknown

# 3. Build contracts
./scripts/build-contracts.sh

# 4. Run tests
./scripts/test-contracts.sh

# 5. Deploy to testnet
./scripts/deploy-contracts.sh
```

📖 **For detailed setup instructions, see [docs/SOROBAN_SETUP.md](docs/SOROBAN_SETUP.md)**

### Development Setup

1. **Install Stellar CLI**
   ```bash
   cargo install --locked stellar-cli
   ```

2. **Navigate to contracts directory**
   ```bash
   cd contracts/soroban-xconfess/confession-anchor
   ```

3. **Build contracts**
   ```bash
   stellar contract build
   ```

4. **Run tests**
   ```bash
   cargo test
   ```

5. **Deploy to Testnet**
   ```bash
   stellar contract deploy \
     --wasm target/wasm32-unknown-unknown/release/confession_anchor.wasm \
     --source deployer \
     --network testnet
   ```

### Contract Interaction Examples

**Anchor a Confession (JavaScript)**
```javascript
import * as StellarSDK from '@stellar/stellar-sdk';

const contract = new StellarSDK.Contract(CONFESSION_ANCHOR_CONTRACT_ID);

// Create confession hash
const confessionHash = hashConfession(confessionText);

// Anchor on Stellar
const tx = await contract.call(
  'anchor_confession',
  StellarSDK.nativeToScVal(confessionHash, { type: 'bytes' }),
  StellarSDK.nativeToScVal(Date.now(), { type: 'u64' })
);
```

**Verify a Confession (JavaScript)**
```javascript
// Check if confession exists on-chain
const timestamp = await contract.call(
  'verify_confession',
  StellarSDK.nativeToScVal(confessionHash, { type: 'bytes' })
);
```

For complete examples and integration guides, see [docs/SOROBAN_SETUP.md](docs/SOROBAN_SETUP.md).


### 🔷 Smart Contract Features

- **Confession Anchoring** 
  - Store immutable confession hashes with timestamps on Stellar
  - Cryptographic proof of existence and authenticity
  - Trustless verification without revealing content

- **Reputation & Badges (NFTs)**
  - On-chain achievement system powered by Soroban
  - Earn badges like "Confession Starter", "Top Reactor", "Community Hero"
  - NFT-based, tradeable, and verifiable reputation

- **Anonymous Tipping System**
  - Send XLM tips to confessions you appreciate
  - Support quality content creators anonymously
  - Microtransactions with minimal fees

- **Wallet Integration**
  - Seamless connection with Freighter wallet
  - Optional wallet login for premium features
  - Privacy-preserving transaction signing

### 📦 Smart Contract Architecture

```
contracts/soroban-xconfess/
├── confession-anchor/     # Anchoring confession hashes
├── reputation-badges/     # NFT badge minting & management
└── anonymous-tipping/     # XLM tipping functionality
```

**Deployed Contracts** (Stellar Testnet):
- Confession Anchor: `Coming Soon`
- Reputation Badges: `Coming Soon`
- Tipping System: `Coming Soon`

---

## 🛠️ Tech Stack

### Backend
- **NestJS**: Robust, scalable Node.js framework
- **PostgreSQL**: Reliable relational database
- **WebSockets**: Real-time communication
- **JWT**: Secure session management

### Frontend
- **Next.js 14**: React framework with App Router
- **TailwindCSS**: Utility-first styling
- **Stellar SDK**: Blockchain interactions
- **Freighter Integration**: Wallet connectivity

### Blockchain
- **Soroban**: Stellar smart contract platform
- **Rust**: Smart contract development language
- **Stellar SDK**: JavaScript/TypeScript integration
- **Testnet**: Development and testing environment

---

## 📁 Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Stellar Smart Contracts](#stellar-smart-contracts)
- [Contributing](#contributing)
- [Stellar Wave Program](#stellar-wave-program)
- [Roadmap](#roadmap)
- [License](#license)

---

## ⚙️ Installation

### Prerequisites

- **Node.js** (v18+)
- **PostgreSQL** (v14+)
- **pnpm** or **npm**
- **Rust** (for Soroban development)
- **Stellar CLI** (optional, for contract deployment)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Godsmiracle001/xconfess.git
   cd xconfess
   ```

2. **Install backend dependencies**
   ```bash
   cd xconfess-backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../xconfess-frontend
   npm install
   ```

4. **Set up environment variables**
   
   Create a `.env` file in both `xconfess-backend` and `xconfess-frontend`:
   
   **Backend (.env)**
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/xconfess
   JWT_SECRET=your-super-secret-jwt-key
   PORT=5000
   
   # Stellar Configuration
   STELLAR_NETWORK=testnet
   STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
   CONFESSION_ANCHOR_CONTRACT=<contract-id>
   ```
   
   **Frontend (.env.local)**
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000
   NEXT_PUBLIC_STELLAR_NETWORK=testnet
   NEXT_PUBLIC_STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org
   ```

5. **Set up the database**
   ```bash
   cd xconfess-backend
   npm run migration:run
   ```

6. **Start the backend**
   ```bash
   npm run start:dev
   ```

7. **Start the frontend** (in a new terminal)
   ```bash
   cd xconfess-frontend
   npm run dev
   ```

8. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Docs: http://localhost:5000/api/docs

---

## 🧲 Usage

### For Users

1. **Post an Anonymous Confession**
   - Visit the homepage
   - Type your confession (no login required)
   - Optionally anchor it on Stellar for immutability
   - Share with the community

2. **React to Confessions**
   - Browse confessions
   - React with emojis: 😂 Funny, 😢 Sad, ❤️ Love, 🤯 Shocking
   - Tip confessions with XLM (requires Freighter wallet)

3. **Earn Badges**
   - Post your first confession → "Confession Starter" badge
   - Get 100 reactions → "Popular Voice" badge
   - Tip 10 confessions → "Generous Soul" badge
   - All badges are NFTs on Stellar!

4. **Send Anonymous Messages** (Coming Soon)
   - Private, end-to-end encrypted messaging
   - No identity required

### For Developers

Run the project locally and start contributing! See [Contributing](#contributing) section.

---

## 🔗 Stellar Smart Contracts

### Development Setup

1. **Install Stellar CLI**
   ```bash
   cargo install --locked stellar-cli --features opt
   ```

2. **Navigate to contracts directory**
   ```bash
   cd contracts/soroban-xconfess
   ```

3. **Build contracts**
   ```bash
   stellar contract build
   ```

4. **Run tests**
   ```bash
   cargo test
   ```

5. **Deploy to Testnet**
   ```bash
   stellar contract deploy \
     --wasm target/wasm32-unknown-unknown/release/confession_anchor.wasm \
     --source <your-secret-key> \
     --network testnet
   ```

### Contract Interaction Examples

**Anchor a Confession (JavaScript)**
```javascript
import * as StellarSDK from '@stellar/stellar-sdk';

const contract = new StellarSDK.Contract(CONFESSION_ANCHOR_CONTRACT_ID);

// Create confession hash
const confessionHash = hashConfession(confessionText);

// Anchor on Stellar
const tx = await contract.call(
  'anchor_confession',
  StellarSDK.nativeToScVal(confessionHash, { type: 'bytes' }),
  StellarSDK.nativeToScVal(Date.now(), { type: 'u64' })
);
```

**Mint a Badge NFT (Soroban)**
```rust
pub fn mint_badge(env: Env, user: Address, badge_type: Symbol) -> Result<(), Error> {
    // Mint achievement badge as NFT
    let token_id = env.storage().instance().get(&symbol_short!("counter"))?;
    env.storage().instance().set(&user, &badge_type);
    
    // Emit event
    env.events().publish((symbol_short!("badge"), user.clone()), badge_type);
    Ok(())
}
```

---

## 🤝 Contributing

We welcome contributions from the community! xConfess is participating in the **Stellar Wave Program** 🌊

### How to Contribute

1. **Find an Issue**
   - Browse [open issues](https://github.com/Godsmiracle001/Xconfess/issues)
   - Look for `good first issue`, `help wanted`, or `stellar-wave` labels
   - Comment to get assigned

2. **Fork & Branch**
   ```bash
   git checkout -b feat/your-feature-name
   ```

3. **Make Your Changes**
   - Write clean, tested code
   - Follow existing code style
   - Update documentation if needed

4. **Commit & Push**
   ```bash
   git commit -m "feat: add stellar wallet connection"
   git push origin feat/your-feature-name
   ```

5. **Submit a Pull Request**
   - Include `Closes #<issue-number>` in description
   - Fill out the PR template
   - Wait for review

### 📋 Contribution Guidelines

✅ **Before Submitting:**
- Join our [Telegram community](https://t.me/xconfess_Community)
- Get assigned to the issue first
- Read our [Code of Conduct](CODE_OF_CONDUCT.md)
- Ensure all tests pass
- Update documentation

✅ **Code Quality:**
- Write unit tests for new features
- Follow TypeScript/Rust best practices
- Use meaningful variable names
- Comment complex logic

✅ **Commit Messages:**
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- Keep messages clear and concise
- Reference issue numbers

### 🎯 Good First Issues

Perfect for newcomers:
- Add loading spinners to confession cards
- Improve error messages
- Write additional unit tests
- Update documentation
- Add accessibility features

[View all good first issues →](https://github.com/Godsmiracle001/Xconfess/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)

---

## 🌊 Stellar Wave Program

xConfess is proud to participate in the **Stellar Development Foundation's Wave Program**!

### What is Stellar Wave?

Stellar Wave is a contributor rewards program that funds open-source development on the Stellar ecosystem. Contributors earn points and rewards for solving issues on participating projects.

### How to Participate

1. **Browse Wave Issues**: Look for issues tagged with `stellar-wave`
2. **Apply to Work**: Comment on the issue to express interest
3. **Get Assigned**: Maintainers will review and assign you
4. **Submit Quality Work**: Create a PR that meets acceptance criteria
5. **Earn Rewards**: Get points and rewards from the Stellar Development Foundation

### Issue Complexity & Points

- 🟢 **Trivial (100 points)**: Documentation, small fixes, typos
- 🟡 **Medium (150 points)**: Features, bug fixes, moderate complexity
- 🔴 **High (200 points)**: Complex features, smart contract development

### Wave Resources

- [Stellar Wave Documentation](https://docs.drips.network/wave)
- [Drips Wave App](https://www.drips.network/wave)
- [Soroban Documentation](https://soroban.stellar.org/docs)

---

## 🗺️ Roadmap

### ✅ Phase 1: Core Platform (Current)
- [x] Anonymous confession posting
- [x] Emoji reactions
- [x] Real-time updates
- [x] Modern UI/UX
- [ ] Complete backend API

### 🚧 Phase 2: Stellar Integration (In Progress)
- [ ] Soroban smart contract development
- [ ] Confession anchoring on Stellar
- [ ] Freighter wallet integration
- [ ] XLM tipping functionality
- [ ] Deploy to Stellar Testnet

### 🔮 Phase 3: Advanced Features (Q2 2026)
- [ ] NFT badge system
- [ ] Anonymous messaging (E2E encrypted)
- [ ] Reputation scoring
- [ ] Content moderation tools
- [ ] Mobile app (React Native)

### 🌟 Phase 4: Mainnet & Scale (Q3 2026)
- [ ] Deploy to Stellar Mainnet
- [ ] Advanced analytics dashboard
- [ ] Community governance
- [ ] Multi-language support
- [ ] Premium features

---

## 🏗️ Project Structure

```
xconfess/
├── xconfess-backend/          # NestJS backend
│   ├── src/
│   │   ├── confessions/       # Confession module
│   │   ├── reactions/         # Reactions module
│   │   ├── stellar/           # Stellar integration
│   │   └── auth/              # Authentication
│   └── test/
├── xconfess-frontend/         # Next.js frontend
│   ├── src/
│   │   ├── app/               # App router pages
│   │   ├── components/        # React components
│   │   ├── lib/               # Utilities
│   │   └── stellar/           # Stellar SDK integration
│   └── public/
├── contracts/                 # Soroban smart contracts
│   └── soroban-xconfess/
│       ├── confession-anchor/
│       ├── reputation-badges/
│       └── anonymous-tipping/
└── docs/                      # Additional documentation
```

---

## 📊 Statistics

- 🚀 **Contributors**: 10+
- ⭐ **GitHub Stars**: Growing daily
- 🔧 **Open Issues**: [View Issues](https://github.com/Godsmiracle001/Xconfess/issues)
- 📦 **Pull Requests**: [View PRs](https://github.com/Godsmiracle001/Xconfess/pulls)

---

## 🤝 Community & Support

### Join the Conversation

- 💬 **Discord**: [xConfess Community](https://discord.gg/5qVnXvzd)
- 💬 **Telegram**: [xConfess Community](https://t.me/xconfess_Community)
- 🐛 **Issues**: [GitHub Issues](https://github.com/Godsmiracle001/Xconfess/issues)
- 🌐 **Website**: Coming Soon

### Get Help

- Check existing [issues](https://github.com/Godsmiracle001/Xconfess/issues) and [discussions](https://github.com/Godsmiracle001/Xconfess/discussions)
- Join our Telegram for real-time support
- Read the [documentation](docs/)

---

## 📜 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgments

- **Stellar Development Foundation** for supporting this project through the Wave Program
- **OnlyDust** for contribution management
- All our amazing **contributors** and **community members**
- The **Soroban** team for excellent smart contract tooling

---

## 🌟 Star History

If you find xConfess valuable, please give us a ⭐ on GitHub!

[![Star History Chart](https://api.star-history.com/svg?repos=Godsmiracle001/Xconfess&type=Date)](https://star-history.com/#Godsmiracle001/Xconfess&Date)

---

<div align="center">

**Built with ❤️ for the Stellar ecosystem**

[Website](#) • [Documentation](#) • [Community](https://t.me/xconfess_Community) • [Contribute](CONTRIBUTING.md)

</div>
