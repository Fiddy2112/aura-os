<div align="center">
  <img src="web/public/logo.svg" alt="Aura OS Logo" width="80" height="80" />
  
  # Aura OS
  
  **Your AI Commander for Web3**
  
  Unlock the full potential of decentralized finance with intelligent automation and ironclad security.

  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

  [Website](https://auraos.dev) · [Documentation](https://auraos.dev/docs) · [Discord](https://discord.gg/auraos)

</div>

---

## ✨ Features

- **🧠 Multi-AI Brain** — Powered by OpenAI GPT-4, Groq, and Google Gemini for natural language understanding (Vietnamese, English, and more)
- **🔐 Secure Vault** — Military-grade AES-256 encryption. Your private keys never leave your device
- **⚡ CLI Power** — Background automation that browsers can't handle
- **🌐 Multi-Chain** — Ethereum, Base, Arbitrum, and Sepolia testnet from a single interface
- **📊 Real-time Dashboard** — Live activity stream synced via Supabase
- **📰 Crypto Research** — AI-powered market research and news aggregation with Tavily

---

## 🚀 Quick Start

### Prerequisites

- Node.js v18.0 or higher
- npm or pnpm
- OpenAI API Key (for AI features)
- Optional: Groq API Key, Gemini API Key for multi-model support

### Installation

```bash
# Clone the repository
git clone https://github.com/aura-os/aura-os.git
cd aura-os

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your API keys to .env

# Run the CLI
npm run cli:dev help
```

### Environment Variables

Create a `.env` file with the following:

```env
# AI Providers (at least one required)
OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key        # Optional
GEMINI_API_KEY=your_gemini_key    # Optional

# Blockchain RPC URLs (optional - defaults provided)
ETH_RPC_URL=https://eth.llamarpc.com
SEPOLIA_RPC_URL=https://rpc.sepolia.org
BASE_RPC_URL=https://mainnet.base.org
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
DEFAULT_CHAIN=sepolia

# Supabase (for dashboard sync)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_DATABASE_NAME=aura_os
```

### Setup Your Wallet

```bash
npm run cli:dev setup
```

You'll be prompted to:
1. Enter your private key (encrypted locally with AES-256)
2. Set a master password to protect your vault

### Start Chatting

```bash
npm run cli:dev chat "Check my ETH balance"
npm run cli:dev chat "Send 0.1 ETH to 0x742d35Cc..."
npm run cli:dev chat "What's the current gas price?"
npm run cli:dev chat "ETH price?"
```

---

## 📂 Project Structure

```
aura-os/
├── src/                          # CLI Application
│   ├── index.ts                  # CLI entry point
│   ├── commands/
│   │   ├── setup.ts              # Wallet setup command
│   │   ├── chat.ts               # AI chat command
│   │   ├── research.ts           # Crypto research command
│   │   └── login.ts              # Dashboard login command
│   ├── core/
│   │   ├── ai/
│   │   │   ├── interpreter.ts    # Multi-model AI intent parser
│   │   │   └── researcher.ts     # Tavily-powered crypto researcher
│   │   ├── blockchain/
│   │   │   ├── chains.ts         # Multi-chain configuration
│   │   │   ├── executor.ts       # Blockchain transaction executor
│   │   │   └── explorer.ts       # Block explorer utilities
│   │   ├── security/
│   │   │   └── vault.ts          # AES-256 encrypted key storage
│   │   └── utils/
│   │       └── supabase.ts       # Real-time activity sync
│   └── ui/                       # Terminal UI components
│
├── web/                          # Astro Website
│   ├── src/
│   │   ├── components/           # React & Astro components
│   │   ├── layouts/              # Page layouts
│   │   ├── pages/
│   │   │   ├── index.astro       # Homepage
│   │   │   ├── features.astro    # Features showcase
│   │   │   ├── chat.astro        # Web chat interface
│   │   │   ├── dashboard.astro   # Real-time activity dashboard
│   │   │   └── docs/             # Documentation
│   │   └── styles/               # Global CSS
│   └── public/                   # Static assets
│
├── package.json
└── tsconfig.json
```

---

## 🛠️ Tech Stack

### CLI
| Technology | Purpose |
|------------|---------|
| **TypeScript** | Type-safe development |
| **OpenAI / Groq / Gemini** | Multi-model AI intent parsing |
| **Viem** | Ethereum & EVM chain interactions |
| **Zod** | Schema validation for AI responses |
| **CryptoJS** | AES-256 encryption |
| **Tavily** | Real-time crypto research |
| **Supabase** | Real-time activity sync |
| **Inquirer** | Interactive prompts |
| **Chalk** | Terminal styling |

### Website
| Technology | Purpose |
|------------|---------|
| **Astro** | Static site generation |
| **React** | Interactive components |
| **Tailwind CSS** | Styling |
| **RainbowKit** | Wallet connections |
| **Wagmi** | React hooks for Ethereum |
| **Supabase Realtime** | Live dashboard updates |

---

## 📖 CLI Commands

| Command | Description |
|---------|-------------|
| `aura setup` | Initialize your wallet with encrypted key storage |
| `aura chat "message"` | Send a natural language command to Aura |
| `aura research [topic]` | Research crypto market news and trends |
| `aura login <address>` | Link your wallet to the dashboard |
| `aura status` | Check configuration status |
| `aura help` | Show available commands |

### Supported Actions

| Action | Description | Example |
|--------|-------------|---------|
| `CHECK_BALANCE` | Query token balance | "Check my ETH balance" |
| `SEND_TOKEN` | Transfer tokens | "Send 0.5 ETH to 0x..." |
| `SWAP_TOKEN` | Exchange tokens | "Swap 100 USDC to ETH" |
| `GET_ADDRESS` | Show wallet address | "What's my wallet address?" |
| `GET_GAS_PRICE` | Current gas price | "Current gas price?" |
| `GET_PRICE` | Token price lookup | "ETH price?" |
| `GET_TRANSACTIONS` | Transaction history | "Show recent transactions" |

**Supported Tokens:** ETH, USDT, USDC, WETH

### Supported Chains

| Chain | Network ID | Status |
|-------|------------|--------|
| Ethereum Mainnet | 1 | ✅ Production |
| Sepolia Testnet | 11155111 | ✅ Default |
| Base | 8453 | ✅ Production |
| Arbitrum One | 42161 | ✅ Production |

---

## 📊 Real-time Dashboard

Aura OS includes a real-time dashboard that syncs your CLI activity:

1. **Login from CLI:**
   ```bash
   npm run cli:dev login 0xYourWalletAddress
   ```

2. **Open the dashboard:**
   ```bash
   cd web && npm run dev
   # Navigate to http://localhost:4321/dashboard
   ```

3. **See activity in real-time** — Every command you run in the CLI appears instantly on your dashboard via Supabase Realtime.

---

## 📰 Crypto Research

Get AI-powered market research and news:

```bash
# Default research (market summary)
npm run cli:dev research

# Specific topic
npm run cli:dev research "Bitcoin ETF news"
npm run cli:dev research "Ethereum Layer 2 comparison"
```

The research command uses Tavily to fetch real-time data and AI to summarize findings with trusted source citations.

---

## 🌐 Running the Website

```bash
cd web

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The website will be available at `http://localhost:4321`

---

## 🔒 Security

Aura OS takes security seriously:

- **🔐 Local-only storage**: Your private keys are encrypted and stored only on your device
- **🛡️ AES-256 encryption**: Military-grade encryption for all sensitive data
- **📡 Zero server dependency**: The CLI works completely offline for key operations
- **👁️ Open source**: Full transparency in how your data is handled
- **🔑 Password protected**: Master password required to access your vault

> ⚠️ **Important**: Always use a dedicated wallet for testing. Never use your main wallet with any new software.

---

## 🚦 CI/CD

Aura OS uses GitHub Actions for continuous integration and deployment.

### Workflows

| Workflow | Trigger | Description |
|----------|---------|-------------|
| **CI** | Push/PR to `main`, `develop` | Type check, build, security audit |
| **Preview** | PR to `main` | Deploy preview to Vercel with PR comment |
| **Deploy** | Push to `main` | Deploy web to Vercel, publish CLI on version tags |

### Required Secrets

Configure these in your GitHub repository settings:

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel deployment token |
| `NPM_TOKEN` | npm publish token (for CLI releases) |
| `PUBLIC_SUPABASE_URL` | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |

### Releasing a New Version

```bash
# Update version in package.json, then:
git tag v1.0.0
git push origin v1.0.0
```

This will automatically:
1. Publish the CLI to npm
2. Create a GitHub release with auto-generated notes

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- [Website](https://auraos.dev)
- [Documentation](https://auraos.dev/docs)
- [Discord Community](https://discord.gg/auraos)
- [Twitter](https://twitter.com/auraos)

---

<div align="center">
  <p>Built with ♥ for the Web3 community</p>
  <p>
    <a href="https://github.com/aura-os">GitHub</a> ·
    <a href="https://twitter.com/auraos">Twitter</a> ·
    <a href="https://discord.gg/auraos">Discord</a>
  </p>
</div>
