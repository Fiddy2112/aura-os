import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import Groq from 'groq-sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
export { renderers } from '../../renderers.mjs';

const IntentSchema = z.object({
  action: z.enum([
    "CHECK_BALANCE",
    "SEND_TOKEN",
    "SWAP_TOKEN",
    "GET_PRICE",
    "GET_GAS",
    "GET_ADDRESS",
    "GET_TRANSACTIONS",
    "RESEARCH",
    "NEWS",
    "PORTFOLIO",
    "ANALYZE",
    // Developer Actions
    "TRACK_WALLET",
    "NFT_INFO",
    "READ_CONTRACT",
    "DECODE_TX",
    "ENS_LOOKUP",
    "GET_CONTRACT",
    "GENERATE_WALLET",
    "SIGN_MESSAGE",
    "REJECTED"
  ]),
  token: z.string().nullable(),
  amount: z.number().nullable(),
  target_address: z.string().nullable(),
  chain: z.string().nullable(),
  reason: z.string().nullable(),
  topic: z.string().nullable(),
  includePrice: z.boolean().nullable(),
  // Developer fields
  contract_address: z.string().nullable(),
  function_name: z.string().nullable(),
  tx_hash: z.string().nullable(),
  ens_name: z.string().nullable(),
  token_id: z.string().nullable(),
  message: z.string().nullable()
});
class AIInterpreter {
  openai = null;
  groq = null;
  genAI = null;
  constructor() {
    const openaiKey = "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";
    const groqKey = "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";
    const geminiKey = "AIzaSyCtM7zM5t7qz_I8THBZPCY_pW75JjwObik";
    this.openai = new OpenAI({ apiKey: openaiKey });
    this.groq = new Groq({ apiKey: groqKey });
    this.genAI = new GoogleGenerativeAI(geminiKey);
  }
  async parse(userInput, walletContext) {
    if (!this.openai && !this.groq && !this.genAI) {
      console.error("[AIInterpreter] No AI providers initialized. Cannot parse intent.");
      return null;
    }
    const systemPrompt = `
      You are Aura OS, a professional AI Agent specializing in Web3 and Research.

      Task: Analyze user requests and convert them to JSON.

      CURRENT CONTEXT:
      • Wallet: ${walletContext?.isConnected ? "Connected" : "Disconnected"}
      • Address: ${walletContext?.address || "Not configured"}
      • Balance: ${walletContext?.balance || "Unknown"}
      • Network: ${walletContext?.chain || "Default"}

      SUPPORTED ACTIONS:

      1. GET_PRICE
         - Token/crypto price
         - Examples: "ETH price?", "giá Bitcoin"

      2. RESEARCH
         - Deep project analysis, structured reports, technical assessment
         - Use for: "Research Solana", "Analyze Ethereum", "Tell me about Arbitrum"
         - Keywords: research, analyze, deep dive, assessment, report
         - Returns comprehensive 7-section research report

      2.5. NEWS
         - Quick news updates, latest headlines, current events
         - Use for: "Crypto news today", "What's happening with ETH?", "Bitcoin news"
         - Keywords: news, headlines, updates, happening, latest
         - Returns quick news summary

      3. CHECK_BALANCE / SEND_TOKEN / SWAP_TOKEN / PORTFOLIO
         - Wallet operations
         - CHECK_BALANCE: "Check my ETH"
         - PORTFOLIO: "Show my portfolio"

      4. GET_GAS / GET_ADDRESS / GET_TRANSACTIONS
         - Utility queries

      5. DEVELOPER TOOLS:
         - TRACK_WALLET: Track/monitor a wallet address
           Example: "Track 0x123...", "theo dõi ví này"
         - NFT_INFO: Get NFT metadata, owner, floor price
           Example: "Check Bored Ape #1234", "NFT info 0x..."
         - READ_CONTRACT: Read smart contract data
           Example: "Read balanceOf on 0x... contract"
         - DECODE_TX: Decode transaction calldata
           Example: "Decode tx 0x..."
         - ENS_LOOKUP: Resolve ENS name to address or vice versa
           Example: "What's vitalik.eth address?", "ENS for 0x..."
         - GET_CONTRACT: Get contract info (ABI, source, verified)
           Example: "Show AAVE contract", "contract info 0x..."
         - GENERATE_WALLET: Create new wallet keypair
           Example: "Generate new wallet", "tạo ví mới"
         - SIGN_MESSAGE: Sign a message with wallet
           Example: "Sign message: Hello World"

      6. REJECTED
         - Non-Web3 requests

      RULES:
      - STRICTLY Web3 only. Reject general questions.
      - Return valid JSON only. No apologies or explanations.
      - Understand English and Vietnamese naturally.

      EXAMPLES:
      
      User: "ETH price"
      → { "action": "GET_PRICE", "token": "ETH" }
      
      User: "Track 0x742d35Cc6634C0532925a3b844Bc9e7595f"
      → { "action": "TRACK_WALLET", "target_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f" }

      User: "Check Bored Ape #1234"
      → { "action": "NFT_INFO", "token": "BAYC", "token_id": "1234" }

      User: "What's vitalik.eth address?"
      → { "action": "ENS_LOOKUP", "ens_name": "vitalik.eth" }

      User: "Decode tx 0xabc123..."
      → { "action": "DECODE_TX", "tx_hash": "0xabc123..." }

      User: "Generate new wallet"
      → { "action": "GENERATE_WALLET" }

      User: "Sign message: Hello Aura"
      → { "action": "SIGN_MESSAGE", "message": "Hello Aura" }

      User: "Read totalSupply on 0x1234 contract"
      → { "action": "READ_CONTRACT", "contract_address": "0x1234", "function_name": "totalSupply" }
    `;
    try {
      if (this.openai) {
        const completion = await this.openai.beta.chat.completions.parse({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userInput }
          ],
          response_format: zodResponseFormat(IntentSchema, "intent"),
          temperature: 0.1
        });
        return completion.choices[0].message.parsed;
      } else {
        throw new Error("OpenAI not initialized");
      }
    } catch (error) {
      console.log("OpenAI Parse failed or ran out of Quota, moving to Groq...", error);
      try {
        if (this.groq) {
          const groqResponse = await this.groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt + "\nIMPORTANT: You must output ONLY valid JSON." },
              { role: "user", content: userInput }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1
          });
          const content = groqResponse.choices[0].message.content;
          return content ? JSON.parse(content) : null;
        } else {
          throw new Error("Groq not initialized");
        }
      } catch (groqError) {
        console.log("Groq Parse failed, moving to Gemini...");
        try {
          if (this.genAI) {
            const model = this.genAI.getGenerativeModel({
              model: "gemini-1.5-flash",
              generationConfig: { responseMimeType: "application/json" }
            });
            const result = await model.generateContent(`${systemPrompt}

User input: ${userInput}`);
            const text = result.response.text();
            return JSON.parse(text);
          } else {
            throw new Error("Gemini not initialized");
          }
        } catch (geminiError) {
          console.error("All AI models failed to parse the command.");
          return null;
        }
      }
    }
  }
  quickParse(userInput, walletAddress) {
    const input = userInput.toLowerCase().trim();
    const baseIntent = {
      token: null,
      amount: null,
      target_address: null,
      chain: null,
      reason: null,
      topic: null,
      includePrice: null,
      contract_address: null,
      function_name: null,
      tx_hash: null,
      ens_name: null,
      token_id: null,
      message: null
    };
    const addrMatch = input.match(/0x[a-fA-F0-9]{40}/);
    const targetAddr = addrMatch ? addrMatch[0] : null;
    const ensMatch = input.match(/([a-z0-9-]+\.eth)/i);
    if (ensMatch) {
      return { ...baseIntent, action: "ENS_LOOKUP", ens_name: ensMatch[1] };
    }
    if (input.includes("generate") && input.includes("wallet") || input.includes("tạo") && input.includes("ví") || input.includes("new wallet")) {
      return { ...baseIntent, action: "GENERATE_WALLET" };
    }
    if (input.includes("sign message") || input.includes("ký")) {
      const msgMatch = userInput.match(/sign message[:\s]+(.+)/i);
      return { ...baseIntent, action: "SIGN_MESSAGE", message: msgMatch ? msgMatch[1].trim() : null };
    }
    const txMatch = input.match(/(?:decode|tx|transaction)\s*(0x[a-fA-F0-9]{64})/i);
    if (txMatch) {
      return { ...baseIntent, action: "DECODE_TX", tx_hash: txMatch[1] };
    }
    if (targetAddr && (input.includes("track") || input.includes("theo dõi") || input.includes("monitor"))) {
      return { ...baseIntent, action: "TRACK_WALLET", target_address: targetAddr };
    }
    if (targetAddr && (input.includes("contract") || input.includes("hợp đồng") || input.includes("analyze") || input.includes("phân tích"))) {
      const action = input.includes("analyze") || input.includes("phân tích") ? "ANALYZE" : "GET_CONTRACT";
      return { ...baseIntent, action, contract_address: targetAddr, target_address: targetAddr };
    }
    if (targetAddr) {
      if (walletAddress && targetAddr.toLowerCase() === walletAddress.toLowerCase()) {
        if (input.includes("giao dịch") || input.includes("lịch sử") || input.includes("history")) {
          return { ...baseIntent, action: "GET_TRANSACTIONS", target_address: targetAddr };
        }
        return { ...baseIntent, action: "CHECK_BALANCE", token: "ETH", target_address: targetAddr };
      }
      return { ...baseIntent, action: "GET_TRANSACTIONS", target_address: targetAddr };
    }
    if (input.includes("gas")) return { ...baseIntent, action: "GET_GAS" };
    if (input.includes("địa chỉ") || input.includes("my address")) return { ...baseIntent, action: "GET_ADDRESS" };
    const priceMatch = input.match(/(?:price|giá).*?(eth|btc|usdt|usdc)/i);
    if (priceMatch) return { ...baseIntent, action: "GET_PRICE", token: priceMatch[1].toUpperCase() };
    const balanceMatch = input.match(/(?:balance|số dư).*?(eth|usdt|usdc)?/i);
    if (balanceMatch && !input.includes("send")) {
      return { ...baseIntent, action: "CHECK_BALANCE", token: balanceMatch[1]?.toUpperCase() || "ETH" };
    }
    if (input.includes("research") || input.includes("nghiên cứu") || input.includes("analyze") && !targetAddr) {
      const topicMatch = userInput.match(/(?:research|nghiên cứu|analyze)\s+(?:about|on|for)?\s*(.+)/i);
      return { ...baseIntent, action: "RESEARCH", topic: topicMatch ? topicMatch[1].trim() : null };
    }
    if (input.includes("portfolio") || input.includes("tài sản") || input.includes("pnl")) {
      return { ...baseIntent, action: "PORTFOLIO" };
    }
    const newsKeywords = ["news", "tin tức", "headline", "happening", "update", "latest"];
    if (newsKeywords.some((kw) => input.includes(kw))) {
      const topicMatch = userInput.match(/(?:news|tin tức|headline|update|latest)\s+(?:about|on|for)?\s*(.+)/i);
      return { ...baseIntent, action: "NEWS", topic: topicMatch ? topicMatch[1].trim() : null };
    }
    return null;
  }
  async summarize(rawContext, topic) {
    const systemPrompt = `
      You are Aura OS, a Crypto Intelligence Researcher.

      Task: Analyze and summarize raw crypto data/news about "${topic || "the market"}".

      OUTPUT FORMAT:
        Overview: One powerful sentence summarizing the topic.
      
        Key Insights:
      • [3-5 bullet points covering trends, data, news]
      
        Aura's Alpha: A short, sharp perspective or recommendation.

      RULES:
      - Detect user language. Vietnamese input → Vietnamese output. Otherwise English.
      - Remove ads, spam, or marketing fluff.
      - Focus on factual data and actionable intelligence.
      - Keep it readable for Terminal (CLI) and Web.
      - Be concise but insightful.
    `;
    try {
      if (this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Let's summarize the following: ${rawContext}` }
          ],
          temperature: 0.3
        });
        return completion.choices[0].message.content || "This content cannot be summarized.";
      } else {
        throw new Error("OpenAI not initialized");
      }
    } catch (error) {
      try {
        if (this.groq) {
          const groqCompletion = await this.groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Summarize this: ${rawContext}` }
            ]
          });
          return groqCompletion.choices[0].message.content || "";
        } else {
          throw new Error("Groq not initialized");
        }
      } catch (groqError) {
        console.log("Groq error, switching to Gemini...");
        try {
          if (this.genAI) {
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const fullPrompt = `${systemPrompt}

Summarize this: ${rawContext}`;
            const result = await model.generateContent(fullPrompt);
            return result.response.text();
          } else {
            throw new Error("Gemini not initialized");
          }
        } catch (geminiError) {
          console.error("All AI models failed.");
          return "All AI models failed.";
        }
      }
    }
  }
}

const memoryStore = /* @__PURE__ */ new Map();
function checkRateLimit(identifier, config = { windowMs: 6e4, max: 10 }) {
  const now = Date.now();
  const userData = memoryStore.get(identifier);
  if (!userData || now > userData.resetTime) {
    const resetTime = now + config.windowMs;
    memoryStore.set(identifier, { count: 1, resetTime });
    return { success: true, remaining: config.max - 1 };
  }
  if (userData.count >= config.max) {
    return { success: false, remaining: 0 };
  }
  userData.count += 1;
  return { success: true, remaining: config.max - userData.count };
}

class Sanitizer {
  static PRIVATE_KEY_REGEX = /\b(0x)?[a-fA-F0-9]{64}\b/g;
  static SUI_KEY_REGEX = /suiprivkey[a-zA-Z0-9]+/g;
  static sanitize(data) {
    if (typeof data === "string") {
      return this.sanitizeString(data);
    }
    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }
    if (data !== null && typeof data === "object") {
      const sanitizedObj = {};
      for (const [key, value] of Object.entries(data)) {
        const sensitiveKeys = ["password", "privatekey", "secret", "key", "seed", "mnemonic"];
        const lowerKey = key.toLowerCase();
        if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
          sanitizedObj[key] = "[REDACTED]";
        } else {
          sanitizedObj[key] = this.sanitize(value);
        }
      }
      return sanitizedObj;
    }
    return data;
  }
  static sanitizeString(str) {
    if (typeof str !== "string") return String(str);
    let sanitized = str;
    sanitized = sanitized.replace(this.PRIVATE_KEY_REGEX, (match) => {
      return `${match.slice(0, 4)}...[REDACTED]...${match.slice(-4)}`;
    });
    sanitized = sanitized.replace(this.SUI_KEY_REGEX, "[REDACTED]");
    return sanitized;
  }
}

const POST = async ({ request, clientAddress }) => {
  try {
    const identifier = clientAddress || "unknown";
    const rate = checkRateLimit(identifier, { windowMs: 6e4, max: 5 });
    if (!rate.success) {
      return new Response(JSON.stringify({
        reply: "Cooldown active, bro! You're messaging too fast. Wait a minute.",
        error: "RATE_LIMIT_EXCEEDED"
      }), { status: 429 });
    }
    const body = await request.json().catch(() => ({}));
    const { message, walletContext } = body;
    if (!message) {
      return new Response(JSON.stringify({ reply: "Yo, you didn't send a message!" }), { status: 400 });
    }
    const interpreter = new AIInterpreter();
    console.log(`[Chat API] Processing message: "${message.slice(0, 50)}..."`);
    let intent = await interpreter.parse(message, walletContext).catch((err) => {
      console.error("[Chat API] Interpreter error, falling back to quickParse:", err);
      return null;
    });
    if (!intent) {
      intent = interpreter.quickParse(message, walletContext?.address);
    }
    if (!intent) {
      return new Response(JSON.stringify({
        reply: "Aura's brain is temporarily offline. Try a simpler command like 'price ETH' or 'gas'!",
        debug: "AI_PARSE_FAILED_NO_FALLBACK"
      }), { status: 500 });
    }
    let reply = "";
    if (intent.action === "REJECTED") {
      reply = intent.reason || "I only handle Web3 tasks, bro!";
    } else if (intent.action === "RESEARCH" || intent.action === "NEWS") {
      reply = `Searching for latest intelligence on ${intent.topic || "the market"}... Please check the research tab for the full report!`;
    } else if (intent.action === "CHECK_BALANCE") {
      const balance = walletContext?.balance || "0";
      const isConnected = walletContext?.isConnected;
      reply = isConnected ? `Your wallet has ${balance}. What else do you want to do?` : "Bro, you haven't connected your wallet, so I can't check the balance!";
    } else {
      const isConnected = walletContext?.isConnected;
      const status = isConnected ? "Do you want to execute?" : "Please connect wallet first.";
      const actionDesc = intent.action.replace(/_/g, " ").toLowerCase();
      const target = intent.token || intent.topic || intent.target_address || "";
      reply = `I understand. You want to ${actionDesc} ${intent.amount || ""} ${target}. ${status}`;
    }
    const sanitizedReply = Sanitizer.sanitize(reply);
    return new Response(JSON.stringify({ reply: sanitizedReply }), { status: 200 });
  } catch (error) {
    console.error("[Chat API] Critical failure:", error);
    return new Response(JSON.stringify({
      reply: "System error bro! Check server logs.",
      error: error.message
    }), { status: 500 });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
