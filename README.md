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
Ethereum, Base, Arbitrum, Optimism, BSC, Polygon, Avalanche, and Sepolia testnet from a single interface. Easy chain switching with `aura chain`.

### Developer Tools
ENS lookup, wallet tracking, NFT info, contract reading, transaction decoding, contract analysis (proxy detection, bytecode hash, code size), and more. Use `aura info` for detailed contract inspection.

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
OPTIMISM_RPC_URL=https://optimism.llamarpc.com
BSC_RPC_URL=https://bsc.llamarpc.com
POLYGON_RPC_URL=https://polygon.llamarpc.com
AVALANCHE_RPC_URL=https://avalanche.llamarpc.com
DEFAULT_CHAIN=ethereum

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
| `aura news [topic]` | Get real-time crypto news and headlines |
| `aura watch [minutes]` | Start auto-monitoring alpha news (default: 15m) |
| `aura status` | Check configuration status |
| `aura logout` | Disconnect from dashboard |
| `aura wallet [action]` | Manage accounts (show, export) |
| `aura dashboard` | Launch the real-time Web UI |
| `aura help` | Show available commands |

### Developer Commands

| Command | Description | Example |
|---------|-------------|---------|
| `aura info <address> [--json] [--explain]` | Get contract information (proxy detection, code size, bytecode hash) | `aura info 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| `aura chain [current\|list\|<chain-name>]` | Manage blockchain chain (view current, list all, or switch) | `aura chain base` |
| `aura run <script>` | Run custom TypeScript scripts | `aura run whale-watch` |

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
| **Contract Info** | `"Contract 0x1234..."` or `aura info 0x1234...` |

#### Contract Info Command

The `info` command provides detailed contract analysis:

```bash
# Basic contract info
aura info 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48

# JSON output for scripting
aura info 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 --json

# AI-powered security analysis
aura info 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 --explain
```

**Features:**
- ✅ Address validation
- ✅ Contract detection (EOA vs Contract)
- ✅ Code size calculation
- ✅ Proxy detection (EIP-1967)
- ✅ Implementation address extraction
- ✅ Bytecode hash (keccak256)
- ✅ Chain information
- ✅ JSON output mode
- ✅ AI security analysis

### NFT Collections

Built-in support for:
- Bored Ape Yacht Club (BAYC)
- Mutant Ape Yacht Club (MAYC)
- Azuki
- Doodles
- CryptoPunks
- Pudgy Penguins

---

## Scripting & Automation

Aura OS allows you to extend the CLI by writing your own scripts in TypeScript.

### Running Scripts
```bash
# Run a script from the ./scripts folder
npm run cli:dev run whale-watch
```

### Creating Custom Scripts
Create a `.ts` file in the `./scripts` folder (e.g., `scripts/my-bot.ts`):

```typescript
import { type ScriptContext } from '../src/core/scripting/types.js';

export default async function(context: ScriptContext) {
  const { ui, executor } = context;
  
  ui.log('🚀 Starting my bot...');
  
  // Interact with blockchain
  const result = await executor.execute({
    action: 'CHECK_BALANCE',
    target_address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', // Vitalik
    token: 'ETH',
    amount: null,
    chain: null,
    reason: null,
    topic: null, 
    includePrice: null
  });

  if (result.success) {
    ui.log(`Vitalik's Balance: ${result.data.balance} ETH`);
  }
}
```

Scripts have access to:
- **executor**: Blockchain interaction tools (read/write)
- **ai**: AI Interpreter for processing text
- **ui**: Terminal UI tools (inquirer, ora, chalk)

---

## Supported Chains

| Chain | Network ID | Status |
|-------|------------|--------|
| Ethereum Mainnet | 1 | ✅ Production |
| Sepolia Testnet | 11155111 | ✅ Default |
| Base | 8453 | ✅ Production |
| Arbitrum One | 42161 | ✅ Production |
| Optimism | 10 | ✅ Production |
| BSC (Binance Smart Chain) | 56 | ✅ Production |
| Polygon | 137 | ✅ Production |
| Avalanche | 43114 | ✅ Production |

**Switching Chains:**
```bash
# View current chain
aura chain current

# List all supported chains
aura chain list

# Switch to a specific chain
aura chain base
aura chain arbitrum
aura chain polygon
```

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
│   │   ├── news.ts               # Real-time news aggregator
│   │   ├── login.ts              # Browser OAuth login
│   │   ├── watch.ts              # Auto-monitoring
│   │   ├── wallet.ts             # Wallet management
│   │   ├── dashboard.ts          # Dashboard launcher
│   │   ├── info.ts               # Contract info command
│   │   ├── chain.ts              # Chain management
│   │   ├── run.ts                # Script runner
│   │   └── registry.ts           # Command registry
│   └── core/
│       ├── ai/
│       │   ├── interpreter.ts    # Multi-model AI parser
│       │   └── researcher.ts     # Tavily-powered research
│       ├── blockchain/
│       │   ├── chains.ts         # Multi-chain config
│       │   ├── executor.ts       # TX executor + dev tools
│       │   └── explorer.ts       # Block explorer utils
│       ├── engine/
│       │   └── info.ts           # Contract analysis engine
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
- **Local-only storage** — Private keys encrypted locally on your device (`%APPDATA%` / `~/.config`).
- **AES-256 encryption** — Keys are encrypted with your Master Password before saving.
- **Zero-Knowledge** — Your private key is NEVER sent to any server (OpenAI, AuraOS, etc.).
- **Password protected** — Master password required for every sensitive action.

> **Note**: Your project files (code) are safe to save anywhere. Your *secrets* (keys) are stored separately by the system in a secure configuration file, not in your project folder.

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
