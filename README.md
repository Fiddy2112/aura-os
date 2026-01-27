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

- **🧠 AI Brain** — Powered by GPT-4, understands your commands in natural language (Vietnamese, English, and more)
- **🔐 Secure Vault** — Military-grade AES-256 encryption. Your private keys never leave your device
- **⌨️ CLI Power** — Background automation that browsers can't handle
- **🔗 Multi-Chain** — Ethereum, Sui, Base, Arbitrum, and more from a single interface

## 🚀 Quick Start

### Prerequisites

- Node.js v18.0 or higher
- npm or pnpm
- OpenAI API Key (for AI features)

### Installation

```bash
# Clone the repository
git clone https://github.com/aura-os/aura-os.git
cd aura-os

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Add your OPENAI_API_KEY to .env

# Run the CLI
npm run cli:dev help
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
npm run cli:dev chat "Swap 100 USDC to ETH"
```

## 📂 Project Structure

```
aura-os/
├── src/                      # CLI Application
│   ├── index.ts              # CLI entry point
│   ├── commands/
│   │   ├── setup.ts          # Wallet setup command
│   │   └── chat.ts           # AI chat command
│   └── core/
│       ├── ai/
│       │   └── interpreter.ts # GPT-4 powered intent parser
│       └── security/
│           └── vault.ts      # AES-256 encrypted key storage
│
├── web/                      # Astro Website
│   ├── src/
│   │   ├── components/       # React & Astro components
│   │   ├── layouts/          # Page layouts
│   │   ├── pages/            # Routes
│   │   │   ├── index.astro   # Homepage
│   │   │   ├── features.astro
│   │   │   ├── chat.astro
│   │   │   └── docs/         # Documentation
│   │   └── styles/           # Global CSS
│   └── public/               # Static assets
│
├── package.json
└── tsconfig.json
```

## 🛠️ Tech Stack

### CLI
| Technology | Purpose |
|------------|---------|
| **TypeScript** | Type-safe development |
| **OpenAI** | AI-powered intent parsing |
| **Viem** | Ethereum interactions |
| **Zod** | Schema validation |
| **CryptoJS** | AES-256 encryption |
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

## 📖 CLI Commands

| Command | Description |
|---------|-------------|
| `aura setup` | Initialize your wallet with encrypted key storage |
| `aura chat "message"` | Send a natural language command to Aura |
| `aura status` | Check configuration status |
| `aura help` | Show available commands |

### Supported Actions

| Action | Description | Example |
|--------|-------------|---------|
| `CHECK_BALANCE` | Query token balance | "Check my ETH" |
| `SEND_TOKEN` | Transfer tokens | "Send 0.5 ETH to 0x..." |
| `SWAP_TOKEN` | Exchange tokens | "Swap 100 USDC to ETH" |

**Supported tokens:** ETH, SUI, USDT, USDC

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

## 🔒 Security

Aura OS takes security seriously:

- **Local-only storage**: Your private keys are encrypted and stored only on your device
- **AES-256 encryption**: Military-grade encryption for all sensitive data
- **Zero server dependency**: The CLI works completely offline for key operations
- **Open source**: Full transparency in how your data is handled

> ⚠️ **Important**: Always use a dedicated wallet for testing. Never use your main wallet with any new software.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

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
