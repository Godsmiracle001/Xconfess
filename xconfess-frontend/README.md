# xConfess

<div align="center">

![xConfess Banner](https://img.shields.io/badge/xConfess-Anonymous%20Confessions-blueviolet?style=for-the-badge)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)
[![Stellar](https://img.shields.io/badge/Built%20on-Stellar-7D00FF?style=for-the-badge&logo=stellar)](https://stellar.org)
[![Soroban](https://img.shields.io/badge/Soroban-Smart%20Contracts-00ADD8?style=for-the-badge)](https://soroban.stellar.org)

**A privacy-first anonymous confession platform leveraging Stellar blockchain for immutability, transparency, and trustless verification.**

[💬 Community](https://t.me/xconfess_Community) • [🐛 Report Bug](https://github.com/Godsmiracle001/Xconfess/issues)

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

## 🔐 Authentication Strategy

xConfess uses **custom JWT authentication** — NextAuth is not used in this project.

### How it works

- Anonymous features (posting confessions, reactions) require **no login**
- Optional login is available for premium features (tipping, badges)
- The NestJS backend issues JWT tokens via `POST /auth/login`
- Tokens are stored in `localStorage` and attached to requests via `Authorization: Bearer <token>`

### Frontend Auth Utilities

All auth logic lives in `xconfess-frontend/app/lib/api/auth.ts`:

| Function | Description |
|---|---|
| `login(credentials)` | Authenticates with backend, saves token |
| `logout()` | Removes stored token |
| `isAuthenticated()` | Returns true if a valid non-expired token exists |
| `getCurrentUser()` | Returns decoded JWT payload or null (null if expired) |
| `authFetch(path, options)` | Fetch wrapper that auto-attaches the token |
| `getToken()` | Returns raw JWT string from storage |
| `saveToken(token)` | Saves JWT to localStorage |
| `removeToken()` | Clears token from localStorage |

### Usage example

```typescript
import { login, logout, isAuthenticated, authFetch } from "@/lib/api/auth";

// Login
const user = await login({ email: "user@example.com", password: "secret" });

// Check auth
if (isAuthenticated()) {
  const res = await authFetch("/confessions", { method: "GET" });
}

// Logout
logout();
```

### Environment variables

```env
# xconfess-frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Note on /api/auth/* route

The file `app/api/auth/[...nextauth]/route.ts` exists but returns a `501 Not Implemented` response. It is **not** a NextAuth handler. If NextAuth is adopted in the future, replace its contents with the standard NextAuth handler.

---

## 🌐 Stellar Integration

Built for the **Stellar ecosystem** with first-class **Soroban** support:

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

```text
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
- **Next.js 16**: React framework with App Router
- **TailwindCSS**: Utility-first styling
- **Stellar SDK**: Blockchain interactions
- **Freighter Integration**: Wallet connectivity

### Blockchain
- **Soroban**: Stellar smart contract platform
- **Rust**: Smart contract development language
- **Stellar SDK**: JavaScript/TypeScript integration
- **Testnet**: Development and testing environment

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

   **Backend (.env)**
   ```env
   DATABASE_URL=postgresql://username:password@localhost:5432/xconfess
   JWT_SECRET=your-super-secret-jwt-key
   PORT=5000
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

7. **Start the frontend**
   ```bash
   cd xconfess-frontend
   npm run dev
   ```

8. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Docs: http://localhost:5000/api/docs

---

## 🤝 Contributing

We welcome contributions from the community! xConfess is participating in the **Stellar Wave Program** 🌊

### How to Contribute

1. **Find an Issue** — Browse [open issues](https://github.com/Godsmiracle001/Xconfess/issues)
2. **Fork & Branch** — `git checkout -b feat/your-feature-name`
3. **Make Your Changes** — Write clean, tested code
4. **Commit & Push** — `git commit -m "feat: add stellar wallet connection"`
5. **Submit a Pull Request** — Include `Closes #<issue-number>`

### 📋 Contribution Guidelines

- Join our [Telegram community](https://t.me/xconfess_Community)
- Get assigned to the issue first
- Ensure all tests pass
- Update documentation

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

### 🌟 Phase 4: Mainnet & Scale (Q3 2026)
- [ ] Deploy to Stellar Mainnet
- [ ] Advanced analytics dashboard
- [ ] Community governance
- [ ] Multi-language support

---

## 📜 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

<div align="center">

**Built with ❤️ for the Stellar ecosystem**

[Community](https://t.me/xconfess_Community) • [Contribute](CONTRIBUTING.md)

</div>
