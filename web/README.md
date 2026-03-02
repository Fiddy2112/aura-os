<div align="center">
  <img src="public/logo.svg" alt="Aura OS Logo" width="80" height="80" />
  
  # AURA_STREAM
  
  **The Cloud Intelligence Dashboard for Aura OS**
  
  A premium, real-time interface to monitor your terminal activity, manage wallets, and track decentralized intelligence.
</div>

---

## 🚀 Overview

**AURA_STREAM** is the web component of the Aura OS ecosystem. It provides a high-fidelity, real-time visualization of everything happening in your CLI.

- **Real-time Sync**: Powered by Supabase Realtime logic.
- **Trader Mode**: High-level risk scores and sentiment analysis.
- **Developer Mode**: Forensic bytecode analysis and deep contract intelligence.
- **Unified Auth**: Secure connection via MetaMask, Google, or GitHub.

## 🛠️ Tech Stack

- **Framework**: [Astro](https://astro.build/) (v5.x)
- **UI Components**: React + Tailwind CSS
- **Authentication**: RainbowKit + Supabase Auth
- **Real-time Engine**: Supabase PostgREST + Realtime
- **Design System**: Custom **Aura Glassmorphism** (Neon accents, Backdrop blurs)

## 🧞 Getting Started

Navigate to the `web` directory and install dependencies:

```bash
cd web
npm install
```

### Environment Setup

Create a `.env` file in the `web` folder:

```env
PUBLIC_SUPABASE_URL=your_supabase_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
```

### Development

```bash
npm run dev
```
The dashboard will be available at `http://localhost:4321/dashboard`.

## 🔒 Security

This dashboard handles sensitive Web3 data using a **Zero-Knowledge Sync** philosophy:
- **Redaction**: Secrets (keys/passwords) are scrubbed on the CLI side before being synced.
- **Rate Limiting**: Built-in protection to prevent AI credit abuse.
- **RLS**: Row-Level Security in Supabase ensures you only see your own activity.

---
<div align="center">
  <sub>Aura OS - Built for the Sovereign Web3 Citizen</sub>
</div>
