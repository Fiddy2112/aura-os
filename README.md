<div align="center">
  <img src="web/public/logo.svg" alt="Aura OS Logo" width="80" height="80" />
  
  # Aura OS
  
  **Your AI Commander for Web3**
  
  The most powerful AI-native CLI for blockchain developers and crypto enthusiasts.  
  Natural language commands. Multi-chain support. Developer tools built-in.

  [![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

  [Website](https://auraos.dev) · [Documentation](https://auraos.dev/docs) · [Discord](https://discord.gg/auraos)

</div>

---

## Features

### Multi-AI Brain
Powered by OpenAI GPT-4, Groq, and Google Gemini with automatic fallback. Understands Vietnamese, English, and more.

### Secure Vault
Military-grade AES-256 encryption. Your private keys never leave your device.

### CLI Power
Background automation that browsers can't handle. Perfect for power users and developers.

### Multi-Chain
Ethereum, Base, Arbitrum, and Sepolia testnet from a single interface.

### Developer Tools
ENS lookup, wallet tracking, NFT info, contract reading, transaction decoding, and more.

### Real-time Dashboard
Live activity stream synced via Supabase. See everything in one place.

### Crypto Research
AI-powered market research with 25+ trusted sources including Messari, The Block, CoinDesk, and more.

---

## Quick Start

### Prerequisites

- Node.js v18.0 or higher
- npm or pnpm
- API Keys: OpenAI (required), Groq/Gemini (optional), Tavily (for research)

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

```env
# AI Providers (at least one required)
OPENAI_API_KEY=your_openai_key
GROQ_API_KEY=your_groq_key        # Optional fallback
GEMINI_API_KEY=your_gemini_key    # Optional fallback

# Research
TAVILY_API_KEY=your_tavily_key    # For crypto research

# Blockchain RPC URLs
ETH_RPC_URL=https://eth.llamarpc.com
SEPOLIA_RPC_URL=https://rpc.sepolia.org
BASE_RPC_URL=https://mainnet.base.org
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
DEFAULT_CHAIN=sepolia

# Supabase (for dashboard sync)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_DATABASE_NAME=aura_os
```

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `aura setup` | Initialize your wallet with encrypted key storage |
| `aura login` | Login via browser (MetaMask/Google/GitHub) |
| `aura chat "message"` | Send a natural language command to Aura |
| `aura research [topic]` | Research crypto market news and trends |
| `aura watch [minutes]` | Start auto-monitoring alpha news (default: 15m) |
| `aura status` | Check configuration status |
| `aura logout` | Disconnect from dashboard |
| `aura help` | Show available commands |

---

## Supported Actions

### Wallet Operations

| Action | Example Command |
|--------|-----------------|
| Check Balance | `"Check my ETH balance"` |
| Send Tokens | `"Send 0.5 ETH to 0x742d..."` |
| Get Address | `"What's my wallet address?"` |
| Portfolio | `"Show my portfolio"` |
| Sign Message | `"Sign message: Hello World"` |

### Market Data

| Action | Example Command |
|--------|-----------------|
| Token Price | `"ETH price?"` |
| Gas Price | `"Current gas price?"` |
| Research | `"Research Solana ecosystem"` |

### Developer Tools

| Action | Example Command |
|--------|-----------------|
| **ENS Lookup** | `"vitalik.eth address"` |
| **Generate Wallet** | `"Generate new wallet"` |
| **Track Wallet** | `"Track 0xd8dA6BF..."` |
| **NFT Info** | `"Check Bored Ape #1234"` |
| **Decode TX** | `"Decode tx 0xabc123..."` |
| **Read Contract** | `"Read totalSupply on 0x..."` |
| **Contract Info** | `"Contract 0x1234..."` |

### NFT Collections

Built-in support for:
- Bored Ape Yacht Club (BAYC)
- Mutant Ape Yacht Club (MAYC)
- Azuki
- Doodles
- CryptoPunks
- Pudgy Penguins

---

## Supported Chains

| Chain | Network ID | Status |
|-------|------------|--------|
| Ethereum Mainnet | 1 | ✅ Production |
| Sepolia Testnet | 11155111 | ✅ Default |
| Base | 8453 | ✅ Production |
| Arbitrum One | 42161 | ✅ Production |

---

## Research Sources

Aura OS aggregates news from 25+ trusted sources:

| Category | Sources |
|----------|---------|
| **News** | CoinDesk, Cointelegraph, The Block, Decrypt, Bitcoin Magazine |
| **Research** | Messari, Delphi Digital, Nansen, Glassnode |
| **Market** | CoinGecko, CoinMarketCap, TradingView, CryptoQuant |
| **DeFi** | DeFiLlama, Dune, Mirror.xyz, Paragraph |
| **Vietnamese** | Coin98, 5PhutCrypto, BlogTienAo, TapChiBitcoin |
| **Alpha** | CryptoSlate, CoinCodex, Blockworks, The Defiant |

---

## Real-time Dashboard

Every command you run syncs to your personal dashboard:

1. **Login:**
   ```bash
   npm run cli:dev login
   ```
   Opens browser → Connect with MetaMask, Google, or GitHub

2. **Start the dashboard:**
   ```bash
   cd web && npm run dev
   # Navigate to http://localhost:4321/dashboard
   ```

3. **See activity in real-time** via Supabase Realtime

---

## Tech Stack

### CLI

| Technology | Purpose |
|------------|---------|
| TypeScript | Type-safe development |
| OpenAI / Groq / Gemini | Multi-model AI with fallback |
| Viem | Ethereum & EVM chain interactions |
| Zod | Schema validation for AI responses |
| CryptoJS | AES-256 encryption |
| Tavily | Real-time crypto research |
| Supabase | Real-time activity sync |
| Inquirer | Interactive prompts |
| Chalk | Terminal styling |

### Website

| Technology | Purpose |
|------------|---------|
| Astro | Static site generation |
| React | Interactive components |
| Tailwind CSS | Minimal dark theme styling |
| RainbowKit | Wallet connections |
| Wagmi | React hooks for Ethereum |

---

## Project Structure

```
aura-os/
├── src/                          # CLI Application
│   ├── index.ts                  # CLI entry point
│   ├── commands/
│   │   ├── setup.ts              # Wallet setup
│   │   ├── chat.ts               # AI chat command
│   │   ├── research.ts           # Crypto research
│   │   ├── login.ts              # Browser OAuth login
│   │   └── watch.ts              # Auto-monitoring
│   └── core/
│       ├── ai/
│       │   ├── interpreter.ts    # Multi-model AI parser
│       │   └── researcher.ts     # Tavily-powered research
│       ├── blockchain/
│       │   ├── chains.ts         # Multi-chain config
│       │   ├── executor.ts       # TX executor + dev tools
│       │   └── explorer.ts       # Block explorer utils
│       ├── security/
│       │   └── vault.ts          # AES-256 encrypted storage
│       └── utils/
│           └── supabase.ts       # Real-time sync
│
├── web/                          # Astro Website
│   ├── src/
│   │   ├── components/           # React & Astro components
│   │   ├── pages/
│   │   │   ├── index.astro       # Homepage
│   │   │   ├── chat.astro        # Web chat interface
│   │   │   └── dashboard.astro   # Real-time dashboard
│   │   └── styles/               # Global CSS
│   └── public/                   # Static assets
│
├── package.json
└── tsconfig.json
```

---

## Security

- **Local-only storage** — Private keys encrypted on your device only
- **AES-256 encryption** — Military-grade protection
- **Offline capable** — Key operations work without internet
- **Open source** — Full transparency
- **Password protected** — Master password required

> **Important**: Always use a dedicated wallet for testing. Never use your main wallet with any new software.

---

## CI/CD

| Workflow | Trigger | Description |
|----------|---------|-------------|
| **CI** | Push/PR to `main`, `develop` | Type check, build, security audit |
| **Preview** | PR to `main` | Deploy preview to Vercel |
| **Deploy** | Push to `main` | Deploy web, publish CLI on version tags |

### Releasing a New Version

```bash
npm version patch  # or minor, major
git push origin main --tags
```

---

## Contributing

We welcome contributions! 

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">
  <p><strong>Built with ❤️ for the Web3 community</strong></p>
  <p>
    <a href="https://github.com/aura-os">GitHub</a> ·
    <a href="https://twitter.com/auraos">Twitter</a> ·
    <a href="https://discord.gg/auraos">Discord</a>
  </p>
  <br/>
  <sub>Aura OS - Your AI Commander for Web3</sub>
</div>
