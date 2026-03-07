import OpenAI from 'openai';
import { zodResponseFormat } from "openai/helpers/zod";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";
import chalk from 'chalk';

// ── Intent Schema ─────────────────────────────────────────────────────────────

const IntentSchema = z.object({
  action: z.enum([
    "CHECK_BALANCE", "SEND_TOKEN", "SWAP_TOKEN", "GET_PRICE", "GET_GAS",
    "GET_ADDRESS", "GET_TRANSACTIONS", "RESEARCH", "NEWS", "PORTFOLIO",
    "TRACK_WALLET", "NFT_INFO", "READ_CONTRACT", "DECODE_TX", "ENS_LOOKUP",
    "GET_CONTRACT", "GENERATE_WALLET", "SIGN_MESSAGE", "REJECTED",
  ]),
  token:            z.string().nullable(),
  amount:           z.number().nullable(),
  target_address:   z.string().nullable(),
  chain:            z.string().nullable(),
  reason:           z.string().nullable(),
  topic:            z.string().nullable(),
  includePrice:     z.boolean().nullable(),
  contract_address: z.string().nullable(),
  function_name:    z.string().nullable(),
  tx_hash:          z.string().nullable(),
  ens_name:         z.string().nullable(),
  token_id:         z.string().nullable(),
  message:          z.string().nullable(),
});

export type Intent = z.infer<typeof IntentSchema>;

export interface WalletContext {
  isConnected: boolean;
  address?: string;
  balance?: string;
  chain?: string;
}

// ── Shared fallback helper ────────────────────────────────────────────────────
// Tries OpenAI → Groq → Gemini, returns the first that succeeds.

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

async function runWithFallback(
  openai: OpenAI | null,
  groq:   Groq   | null,
  genAI:  GoogleGenerativeAI | null,
  messages: ChatMessage[],
  temperature = 0.3,
): Promise<string> {
  const system = messages.find(m => m.role === 'system')?.content ?? '';
  const user   = messages.filter(m => m.role !== 'system').map(m => m.content).join('\n');

  if (openai) {
    try {
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature,
      });
      const text = res.choices[0].message.content;
      if (text) return text;
    } catch {}
  }

  if (groq) {
    try {
      const res = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        temperature,
      });
      const text = res.choices[0].message.content;
      if (text) return text;
    } catch {}
  }

  if (genAI) {
    try {
      const model  = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(`${system}\n\n${user}`);
      return result.response.text();
    } catch {}
  }

  throw new Error('All AI models failed.');
}

// ─────────────────────────────────────────────────────────────────────────────

export class AIInterpreter {
  private openai: OpenAI | null = null;
  private groq:   Groq   | null = null;
  private genAI:  GoogleGenerativeAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY)  this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    if (process.env.GROQ_API_KEY)    this.groq   = new Groq({ apiKey: process.env.GROQ_API_KEY });
    if (process.env.GEMINI_API_KEY)  this.genAI  = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    if (!this.openai && !this.groq && !this.genAI) {
      console.warn(chalk.yellow("\n [AI] Warning: No AI API keys detected."));
      console.warn(chalk.gray(" Run 'aura setup' to configure your AI providers.\n"));
    }
  }

  // ── parse: convert natural language → Intent ───────────────────────────────

  async parse(userInput: string, walletContext?: WalletContext): Promise<Intent | null> {
    if (!this.openai && !this.groq && !this.genAI) {
      console.error(chalk.red("\n [AI Error] No AI providers available. Run 'aura setup'."));
      return null;
    }

    const systemPrompt = `
    You are Aura OS, a professional AI Agent specializing in Web3 and Research.
    Task: Analyze user requests and convert them to JSON.

    CURRENT CONTEXT:
    • Wallet:  ${walletContext?.isConnected ? 'Connected' : 'Disconnected'}
    • Address: ${walletContext?.address || 'Not configured'}
    • Balance: ${walletContext?.balance || 'Unknown'}
    • Network: ${walletContext?.chain || 'Default'}

    SUPPORTED ACTIONS:
    GET_PRICE, CHECK_BALANCE, SEND_TOKEN, SWAP_TOKEN, PORTFOLIO, GET_GAS,
    GET_ADDRESS, GET_TRANSACTIONS, RESEARCH, NEWS,
    TRACK_WALLET, NFT_INFO, READ_CONTRACT, DECODE_TX,
    ENS_LOOKUP, GET_CONTRACT, GENERATE_WALLET, SIGN_MESSAGE, REJECTED

    RULES:
    - STRICTLY Web3 only. Reject general questions with REJECTED.
    - Return valid JSON only. No apologies or explanations.
    - Understand English and Vietnamese naturally.
    - NEWS = quick headlines. RESEARCH = deep structured analysis.

    EXAMPLES:
    User: "ETH price" → { "action": "GET_PRICE", "token": "ETH" }
    User: "vitalik.eth" → { "action": "ENS_LOOKUP", "ens_name": "vitalik.eth" }
    User: "Decode tx 0xabc" → { "action": "DECODE_TX", "tx_hash": "0xabc" }
    User: "Generate new wallet" → { "action": "GENERATE_WALLET" }
    User: "Sign message: Hello" → { "action": "SIGN_MESSAGE", "message": "Hello" }
    `.trim();

    // Try OpenAI with structured output first
    if (this.openai) {
      try {
        const completion = await this.openai.beta.chat.completions.parse({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: userInput },
          ],
          response_format: zodResponseFormat(IntentSchema, 'intent'),
          temperature: 0.1,
        });
        return completion.choices[0].message.parsed;
      } catch {}
    }

    // Groq fallback
    if (this.groq) {
      try {
        const res = await this.groq.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt + '\nIMPORTANT: Output ONLY valid JSON.' },
            { role: 'user',   content: userInput },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        });
        const content = res.choices[0].message.content;
        return content ? JSON.parse(content) : null;
      } catch {}
    }

    // Gemini fallback
    if (this.genAI) {
      try {
        const model  = this.genAI.getGenerativeModel({
          model: 'gemini-1.5-flash',
          generationConfig: { responseMimeType: 'application/json' },
        });
        const result = await model.generateContent(`${systemPrompt}\n\nUser: ${userInput}`);
        return JSON.parse(result.response.text());
      } catch {}
    }

    console.error(chalk.red(' All AI models failed to parse the command.'));
    return null;
  }

  // ── quickParse: regex/keyword fast path ────────────────────────────────────

  quickParse(userInput: string, walletAddress?: string): Intent | null {
    const input = userInput.toLowerCase().trim();
    const base = {
      token: null, amount: null, target_address: null, chain: null,
      reason: null, topic: null, includePrice: null,
      contract_address: null, function_name: null, tx_hash: null,
      ens_name: null, token_id: null, message: null,
    };

    const addrMatch = input.match(/0x[a-fA-F0-9]{40}/);
    const targetAddr = addrMatch ? addrMatch[0] : null;

    const ensMatch = input.match(/([a-z0-9-]+\.eth)/i);
    if (ensMatch) return { ...base, action: 'ENS_LOOKUP', ens_name: ensMatch[1] };

    if ((input.includes('generate') && input.includes('wallet')) ||
        (input.includes('tạo') && input.includes('ví')) ||
        input.includes('new wallet')) {
      return { ...base, action: 'GENERATE_WALLET' };
    }

    if (input.includes('sign message') || input.includes('ký')) {
      const msgMatch = userInput.match(/sign message[:\s]+(.+)/i);
      return { ...base, action: 'SIGN_MESSAGE', message: msgMatch?.[1]?.trim() ?? null };
    }

    const txMatch = input.match(/(?:decode|tx|transaction)\s*(0x[a-fA-F0-9]{64})/i);
    if (txMatch) return { ...base, action: 'DECODE_TX', tx_hash: txMatch[1] };

    if (targetAddr && (input.includes('track') || input.includes('theo dõi') || input.includes('monitor'))) {
      return { ...base, action: 'TRACK_WALLET', target_address: targetAddr };
    }

    if (targetAddr && (input.includes('contract') || input.includes('hợp đồng'))) {
      return { ...base, action: 'GET_CONTRACT', contract_address: targetAddr };
    }

    if (targetAddr) {
      if (walletAddress && targetAddr.toLowerCase() === walletAddress.toLowerCase()) {
        if (input.includes('giao dịch') || input.includes('lịch sử') || input.includes('history')) {
          return { ...base, action: 'GET_TRANSACTIONS', target_address: targetAddr };
        }
        return { ...base, action: 'CHECK_BALANCE', token: 'ETH', target_address: targetAddr };
      }
      return { ...base, action: 'GET_TRANSACTIONS', target_address: targetAddr };
    }

    if (input.includes('gas')) return { ...base, action: 'GET_GAS' };
    if (input.includes('địa chỉ') || input.includes('my address')) return { ...base, action: 'GET_ADDRESS' };

    const priceMatch = input.match(/(?:price|giá).*?(eth|btc|usdt|usdc)/i);
    if (priceMatch) return { ...base, action: 'GET_PRICE', token: priceMatch[1].toUpperCase() };

    const balanceMatch = input.match(/(?:balance|số dư).*?(eth|usdt|usdc)?/i);
    if (balanceMatch && !input.includes('send')) {
      return { ...base, action: 'CHECK_BALANCE', token: balanceMatch[1]?.toUpperCase() ?? 'ETH' };
    }

    const newsKeywords = ['news', 'tin tức', 'headline', 'happening', 'update', 'latest'];
    if (newsKeywords.some(kw => input.includes(kw))) {
      const topicMatch = userInput.match(/(?:news|tin tức|headline|update|latest)\s+(?:about|on|for)?\s*(.+)/i);
      return { ...base, action: 'NEWS', topic: topicMatch?.[1]?.trim() ?? null };
    }

    return null;
  }

  // ── chat: general freeform AI call (used by ask.ts, audit.ts, etc.) ─────────

  async chat(userMessage: string, systemPrompt?: string): Promise<string> {
    const messages: ChatMessage[] = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: userMessage });

    return runWithFallback(this.openai, this.groq, this.genAI, messages, 0.4);
  }

  // ── summarize ──────────────────────────────────────────────────────────────

  async summarize(rawContext: string, topic?: string): Promise<string> {
    const system = `
    You are Aura OS, a Crypto Intelligence Researcher.
    Task: Analyze and summarize raw crypto data/news about "${topic || 'the market'}".

    OUTPUT FORMAT:
      Overview: One powerful sentence summarizing the topic.

      Key Insights:
      • [3-5 bullet points covering trends, data, news]

      Aura's Alpha: A short, sharp perspective or recommendation.

    RULES:
    - Detect user language. Vietnamese input → Vietnamese output. Otherwise English.
    - Remove ads, spam, or marketing fluff.
    - Focus on factual data and actionable intelligence.
    - Be concise but insightful.
    `.trim();

    return runWithFallback(
      this.openai, this.groq, this.genAI,
      [
        { role: 'system', content: system },
        { role: 'user',   content: `Summarize: ${rawContext}` },
      ],
      0.3,
    );
  }

  // ── explainContract ────────────────────────────────────────────────────────

  async explainContract(info: any): Promise<string> {
    const system = `
    You are Aura OS, a smart contract security analyst.
    Task: Analyze contract metadata and provide a security-focused explanation.

    OUTPUT FORMAT:
      Contract Type: [EOA/Contract/Proxy] - Brief classification

      Analysis:
      • Code Size: What does the bytecode size indicate?
      • Proxy Pattern: If proxy, explain EIP-1967 and security implications.
      • Implementation: If proxy, note logic is in a separate contract.

      Security Assessment:
      • [2-3 bullet points on security considerations]
      • [Any red flags]

      Aura's Verdict: A concise security recommendation.

    RULES:
    - Be technical but accessible.
    - Focus on actionable security insights.
    - If isContract=false, explain it's an EOA.
    - Keep it concise.
    `.trim();

    return runWithFallback(
      this.openai, this.groq, this.genAI,
      [
        { role: 'system', content: system },
        { role: 'user',   content: `Analyze: ${JSON.stringify(info, null, 2)}` },
      ],
      0.3,
    );
  }
}