<div align="center">
  <img src="https://cdn.jsdelivr.net/gh/Fiddy2112/aura-os@main/web/public/logo.svg" alt="Aura OS Logo" width="100" height="100" />
  
  # AURA_OS
  
  **The Sovereign AI Commander for Web3**
  
  A premium, AI-native operating system for your terminal and cloud dashboard.  
  Natural language command execution. Military-grade vault. Real-time alpha synchronization.
  
  [![License](https://img.shields.io/badge/license-MIT-6366f1.svg)](LICENSE)
  [![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-06b6d4.svg)](https://nodejs.org)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-8b5cf6.svg)](https://www.typescriptlang.org/)
  [![Web3](https://img.shields.io/badge/Web3-EVM--Sui-ec4899.svg)](https://aura-os-self.vercel.app)

  [Website](https://aura-os-self.vercel.app) · [Dashboard](https://aura-os-self.vercel.app/dashboard) · [Documentation](https://aura-os-self.vercel.app/docs)
</div>

---

## Features

### Multi-AI Brain (BYOK)
Fully personalizable. Input your own keys for OpenAI, Groq, and Google Gemini. Experience automatic fallback logic and multi-language support (English, Vietnamese, etc.).

### Military-Grade Security
Built with **Aura Vault (AES-256)**. Features **Silent Security** (Linux-style hidden input) and a built-in **Privacy Sanitizer** that redacts secrets before they ever leave your machine.

### Premium Experience
Stunning high-end aesthetics across terminal and web. Glassmorphism, neon accents, and micro-animations for a first-class developer experience.

### Real-time Ledger Sync
Every terminal interaction is instantly synchronized to your **AURA_STREAM** cloud dashboard via Supabase Realtime, tagged with your wallet identity.

### Pro-Grade Analysis
AI-powered contract security analysis with specialized **Trader** (Risk/Verdict) and **Developer** (Forensic/Bytecode) modes.

---

## Quick Start

### Prerequisites

- Node.js v18.0 or higher
- npm or pnpm
- API Keys: OpenAI (required), Groq/Gemini (optional), Tavily (for research)

### Installation

```bash
# Clone the repository
git clone https://github.com/Fiddy2112/aura-os.git
cd aura-os

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your API keys to .env 

# Install globally to your system
npm install -g @felizz23/aura-os

# Run the CLI from anywhere
aura help
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
BASE_RPC_URL=https://mainnet.base.org
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
OPTIMISM_RPC_URL=https://optimism.llamarpc.com
BSC_RPC_URL=https://bsc.llamarpc.com
POLYGON_RPC_URL=https://polygon.llamarpc.com
AVALANCHE_RPC_URL=https://avalanche.llamarpc.com
DEFAULT_CHAIN=ethereum

# Explorer / Tax Export (for aura export command)
ETHERSCAN_API_KEY=your_etherscan_key

# Supabase (for dashboard sync)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_DATABASE_NAME=aura_os
```

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `aura setup` | Interactive onboarding: Wallet Vault + BYOK AI Key setup |
| `aura login` | Sync your CLI with the cloud dashboard via browser OAuth |
| `aura chat "msg"` | Natural language commander (Send, Swap, Check Portfolio) |
| `aura analyze` | Security triage for smart contracts (Trader/Dev modes) |
| `aura research` | Deep ecosystem analysis with 25+ trusted sources |
| `aura news` | Real-time global crypto alpha aggregator |
| `aura watch` | Background alpha hunting mode (auto-refreshing news) |
| `aura wallet` | Manage encrypted accounts (show, export, portfolio) |
| `aura debank` | Open DeBank portfolio for any wallet address |
| `aura reset-password`| Securely change or recover vault master password |
| `aura dashboard` | Launch your AURA_STREAM real-time web interface |
| `aura status` | Diagnostic check of vault and AI system health |
| `aura script` | Manage custom scripts (list, create) |
| `aura help` | Show available commands and shortcuts |
| `aura gas` | Real-time gas prices across multiple networks |
| `aura approve` | Scan and revoke ERC-20 token approvals interactively |
| `aura convert` | Convert tokens |
| `aura honeypot`| Scan for honeypot tokens and malicious contracts |
| `aura abi`     | Fetch and display smart contract ABIs |
| `aura send`    | Send ETH and ERC-20 tokens easily |
| `aura ens`     | Look up and resolve ENS domains |
| `aura call`    | Read smart contracts directly without ABIs |
| `aura wrap`    | Wrap or unwrap ETH to WETH |
| `aura simulate`| Safely test and preview transactions via Tenderly |
| `aura bridge`  | Bridge assets cross-chain via Across Protocol |
| `aura audit`   | Full security audit with vulnerability scan |
| `aura summarize`| AI-powered plain-English explanations of contracts |
| `aura nft`     | View NFT collection details and metadata |
| `aura stake` | Stake ETH via Lido (stETH) or Rocket Pool (rETH) liquid staking |
| `aura export` | Export full tx history as CSV/JSON for tax tools (Koinly, TaxBit, etc.) |
| `aura pnl` | On-chain P&L tracker — invested, current value, ROI per wallet |
| `aura swap` | Swap tokens via Uniswap V3 directly from the terminal |
| `aura multicall` | Batch multiple contract reads into one RPC request (Multicall3) |
| `aura decode` | Decode raw transaction calldata into human-readable arguments |
| `aura logs` | Fetch and inspect on-chain event logs for any contract |
| `aura gashistory` | Display historical gas price trends and percentiles |
| `aura alert` | Set real-time price, gas, and balance threshold alerts |
| `aura risk` | Rapid ERC-20 token risk scoring (liquidity, concentration, upgradability) |
| `aura price` | Real-time token prices and market data |

### System Commands

| Command | Description | Example |
|---------|-------------|---------|
| `aura info <address> [--json] [--explain]` | Get contract information (proxy detection, code size, bytecode hash) | `aura info 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| `aura chain [current\|list\|<chain-name>]` | Manage blockchain chain (view current, list all, or switch) | `aura chain base` |
| `aura run <script>` | Run custom TypeScript scripts | `aura run whale-watch` |
| `aura tx <hash>` | Analyze a transaction by hash (status, fees, events) | `aura tx 0x...` |

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
| Multi-AI Engine | OpenAI, Groq, & Gemini with intelligent fallback |
| Aura Vault | AES-256 local encryption for private keys |
| Silent Security | Invisible terminal input for all passwords |
| Privacy Sanitizer| Auto-redaction of secrets before cloud sync |
| Viem | Core blockchain interaction engine |
| Supabase | Real-time history & identity synchronization |
| Tavily AI | Deep research and market data gathering |
| Inquirer/Chalk | Premium interactive CLI terminal experience |

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
│       │   ├── vault.ts          # AES-256 encrypted storage
│       │   └── sanitizer.ts      # Privacy redaction engine
│       └── utils/
│           └── supabase.ts       # Real-time sync & fallback
│
├── web/                          # Astro Website (AURA_STREAM)
│   ├── src/
│   │   ├── components/           # React & Astro components
│   │   ├── lib/
│   │   │   ├── security/
│   │   │   │   ├── ratelimit.ts  # API protection mechanism
│   │   │   │   └── sanitizer.ts  # Web-side privacy scrub
│   │   │   └── ai/
│   │   │       └── interpreter.ts # Web-side AI logic
│   │   ├── pages/
│   │   │   ├── index.astro       # Premium Landing Page
│   │   │   ├── login.astro       # Unified Authentication
│   │   │   └── dashboard.astro   # AURA_STREAM UI
│   │   └── styles/               # Global CSS
│   └── public/                   # Static assets
│
├── package.json
└── tsconfig.json
```

---

## Security
- **Local-only storage** — Private keys never leave your device, encrypted in machine-specific config folders.
- **AES-256 encryption** — Industry-standard encryption with a user-defined Master Password.
- **Silent Security** — All password/key inputs are invisible in the terminal (Linux-style) to prevent shoulder surfing.
- **Privacy Sanitizer** — Automatically redacts private keys and passwords before syncing history to the dashboard.
- **Rate Limiting** — Intelligent API protection on web endpoints to prevent abuse and protect AI credits.
- **Zero-Knowledge Sync** — Sync only results and intents, never your raw decrypted secrets.

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
    <a href="https://github.com/Fiddy2112/aura-os">GitHub</a> ·
    <a href="https://twitter.com/auraos">Twitter</a> ·
    <a href="https://discord.gg/auraos">Discord</a>
  </p>
  <br/>
  <sub>Aura OS - Your AI Commander for Web3</sub>
</div>
