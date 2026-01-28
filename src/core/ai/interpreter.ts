import OpenAI from 'openai';
import { zodResponseFormat } from "openai/helpers/zod";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

// Enhanced Intent Schema with more actions
const IntentSchema = z.object({
  action: z.enum([
    "CHECK_BALANCE",
    "SEND_TOKEN",
    "SWAP_TOKEN",
    "GET_PRICE",
    "GET_GAS",
    "GET_ADDRESS",
    "GET_TRANSACTIONS",
    "REJECTED"
  ]),
  token: z.string().nullable(),
  amount: z.number().nullable(),
  target_address: z.string().nullable(),
  chain: z.string().nullable(),
  reason: z.string().nullable(),
  topic: z.string().nullable(),
});

export type Intent = z.infer<typeof IntentSchema>;

export interface WalletContext {
  isConnected: boolean;
  address?: string;
  balance?: string;
  chain?: string;
}

export class AIInterpreter {
  private openai = new OpenAI();
  private groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

  async parse(userInput: string, walletContext?: WalletContext): Promise<Intent | null> {
    const systemPrompt = `
      ═══════════════════════════════════════════════════════════
        AURA OS - CORE AI INTELLIGENCE
      ═══════════════════════════════════════════════════════════
      
      SYSTEM STATUS:
      • Wallet: ${walletContext?.isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      • Address: ${walletContext?.address || 'Not configured'}
      • Balance: ${walletContext?.balance || 'Unknown'}
      • Network: ${walletContext?.chain || 'Default'}

      ═══════════════════════════════════════════════════════════
      ROLE & IDENTITY
      ═══════════════════════════════════════════════════════════
      You are Aura, the AI brain of Aura OS - a powerful Web3 CLI agent.
      You understand commands in multiple languages (English, Vietnamese, etc.)
      Your job is to parse user intent and return a structured JSON response.

      ═══════════════════════════════════════════════════════════
      SUPPORTED ACTIONS
      ═══════════════════════════════════════════════════════════
      
      1. CHECK_BALANCE
         - Check wallet balance for any token
         - Examples: "Check my ETH", "What's my USDC balance?", "Số dư của tôi"
         - Required: token (default: ETH)
      
      2. SEND_TOKEN
         - Transfer tokens to another address
         - Examples: "Send 0.1 ETH to 0x123...", "Gửi 100 USDC cho 0xabc..."
         - Required: amount, token, target_address
      
      3. SWAP_TOKEN
         - Exchange one token for another
         - Examples: "Swap 100 USDC to ETH", "Đổi 1 ETH sang USDT"
         - Required: amount, token (from), target token in reason
      
      4. GET_PRICE
         - Get current token price in USD
         - Examples: "What's the price of ETH?", "Giá Bitcoin bao nhiêu?"
         - Required: token
      
      5. GET_GAS
         - Get current gas price on the network
         - Examples: "What's the gas price?", "Gas fees now?"
         - Required: none
      
      6. GET_ADDRESS
         - Show the user's wallet address
         - Examples: "What's my address?", "Show my wallet", "Địa chỉ của tôi"
         - Required: none

      7. REJECTED
         - Use this when the request is NOT related to Web3/Crypto
         - Examples: Cooking, jokes, general knowledge, coding non-web3 apps
         - Required: reason (explain why in user's language)

      ═══════════════════════════════════════════════════════════
      SUPPORTED TOKENS & CHAINS
      ═══════════════════════════════════════════════════════════
      
      Tokens: ETH, USDT, USDC, WETH, BTC (for price only)
      Chains: ethereum, sepolia, base, arbitrum
      
      ═══════════════════════════════════════════════════════════
      RULES
      ═══════════════════════════════════════════════════════════
      
      1. ONLY handle Web3/Crypto/Blockchain requests
      2. If missing required info, set action and leave fields empty - the executor will handle validation
      3. Always respond in valid JSON following the schema
      4. Understand common typos and abbreviations (eth, ethereum, etc.)
      5. When rejecting, explain in the USER's language
      
      ═══════════════════════════════════════════════════════════
      EXAMPLES
      ═══════════════════════════════════════════════════════════
      
      User: "Check my ETH"
      → { "action": "CHECK_BALANCE", "token": "ETH" }
      
      User: "Send 0.5 ETH to 0x742d35Cc6634C0532925a3b844Bc9e7595f"
      → { "action": "SEND_TOKEN", "amount": 0.5, "token": "ETH", "target_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f" }
      
      User: "What's the current gas price?"
      → { "action": "GET_GAS" }
      
      User: "ETH price?"
      → { "action": "GET_PRICE", "token": "ETH" }
      
      User: "What's my wallet address?"
      → { "action": "GET_ADDRESS" }
      
      User: "Làm sao để nấu cơm?"
      → { "action": "REJECTED", "reason": "Xin lỗi! Aura OS chỉ hỗ trợ các tác vụ Web3 như kiểm tra số dư, chuyển token, và theo dõi giá. Tôi không thể giúp bạn nấu ăn." }
    `;

    try {
      const completion = await this.openai.beta.chat.completions.parse({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInput },
        ],
        response_format: zodResponseFormat(IntentSchema, "intent"),
        temperature: 0.1, // Low temperature for more consistent parsing
      });

      return completion.choices[0].message.parsed;
    } catch (error) {
      console.log("OpenAI Parse failed or ran out of Quota, moving to Groq...");
      try {
        const groqResponse = await this.groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt + "\nIMPORTANT: You must output ONLY valid JSON." },
            { role: "user", content: userInput },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        });
        
        const content = groqResponse.choices[0].message.content;
        return content ? JSON.parse(content) : null;
      } catch (groqError) {
        console.log("Groq Parse failed, moving to Gemini...");

        try {
          const model = this.genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            generationConfig: { responseMimeType: "application/json" }
          });
          
          const result = await model.generateContent(`${systemPrompt}\n\nUser input: ${userInput}`);
          const text = result.response.text();
          return JSON.parse(text);
        } catch (geminiError) {
          console.error("All AI models failed to parse the command.");
          return null;
        }
      }
    }
  }

  quickParse(userInput: string, walletAddress?: string): Intent | null {
    const input = userInput.toLowerCase().trim();
    
    const addrMatch = input.match(/0x[a-fA-F0-9]{40}/);
    const targetAddr = addrMatch ? addrMatch[0] : null;

    if (targetAddr) {
      if (walletAddress && targetAddr.toLowerCase() === walletAddress.toLowerCase()) {

        if (input.includes('giao dịch') || input.includes('lịch sử') || input.includes('history')) {
          return { 
            action: 'GET_TRANSACTIONS', target_address: targetAddr, 
            token: null, amount: null, chain: null, reason: null, topic: null 
          };
        }
        return { 
          action: 'CHECK_BALANCE', token: 'ETH', target_address: targetAddr, 
          amount: null, chain: null, reason: null, topic: null 
        };
      }

      return { 
        action: 'GET_TRANSACTIONS', target_address: targetAddr, 
        token: null, amount: null, chain: null, reason: null, topic: null 
      };
    }

    if (input.includes('gas')) return { action: 'GET_GAS', token: null, amount: null, target_address: null, chain: null, reason: null, topic: null };
    
    if (input.includes('địa chỉ') || input.includes('my address')) return { action: 'GET_ADDRESS', token: null, amount: null, target_address: null, chain: null, reason: null, topic: null };

    const priceMatch = input.match(/(?:price|giá).*?(eth|btc|usdt|usdc)/i);
    if (priceMatch) return { action: 'GET_PRICE', token: priceMatch[1].toUpperCase(), amount: null, target_address: null, chain: null, reason: null, topic: null };

    const balanceMatch = input.match(/(?:balance|số dư).*?(eth|usdt|usdc)?/i);
    if (balanceMatch && !input.includes('send')) {
      return { action: 'CHECK_BALANCE', token: balanceMatch[1]?.toUpperCase() || 'ETH', amount: null, target_address: null, chain: null, reason: null, topic: null };
    }

    return null;
  }

  async summarize(rawContext:string, topic?:string):Promise<string>{
    const systemPrompt = `
      ═══════════════════════════════════════════════════════════
        AURA OS - INTELLIGENCE RESEARCHER (Bilingual Mode)
      ═══════════════════════════════════════════════════════════

      ROLE:
      You are an elite Crypto Intelligence Researcher for Aura OS. 
      Your mission is to analyze and summarize raw crypto data/news from the internet.

      CORE REQUIREMENTS (YÊU CẦU CỐT LÕI):
      1. Language (Ngôn ngữ): Detect user language. If Vietnamese, respond in Vietnamese. Otherwise, use English.
      2. Tone (Phong cách): Professional, concise, focusing on Alpha (valuable insights) and metrics.
      3. Structure (Cấu trúc phản hồi):
         - Overview (Tổng quan): One powerful sentence about ${topic || 'the market'}.
         - Key Insights (Ý chính): 3-5 bullet points covering trends, data, and news.
         - Aura's Alpha (Nhận định): A short, sharp AI perspective or recommendation.

      STRICT RULES:
      - Remove ads, spam, or irrelevant marketing fluff.
      - Focus on factual data and actionable intelligence.
      - Keep it readable for both Terminal (CLI) and Web interfaces.
    `

    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Let's summarize the following: ${rawContext}` },
        ],
        temperature: 0.3,
      });

      return completion.choices[0].message.content || "This content cannot be summarized.";
    } catch (error) {
      console.error('AI Summarizer error:', error);
      try {
        const groqCompletion = await this.groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Summarize this: ${rawContext}` },
          ],
        });
        return groqCompletion.choices[0].message.content || "";
      } catch (groqError) {
        console.log("Groq error, switching to Gemini...");

        try {
          const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
          const fullPrompt = `${systemPrompt}\n\nSummarize this: ${rawContext}`;
          const result = await model.generateContent(fullPrompt);
          return result.response.text();
        } catch (geminiError) {
          console.error("All AI models failed.");
          return "All AI models failed.";
        }
      }
    }
  }
}