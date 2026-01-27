import OpenAI from 'openai';
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

const IntentSchema = z.object({
  action: z.enum(["CHECK_BALANCE", "SEND_TOKEN", "SWAP_TOKEN", "REJECTED"]),
  token: z.string().optional(),
  amount: z.number().optional(),
  target_address: z.string().optional(),
  reason: z.string().optional()
});

export class AIInterpreter {
  private openai = new OpenAI();

  async parse(userInput: string, walletContext?: any) {
    const systemPrompt = `
      You are Aura OS Core AI. 
      User Wallet Status: ${walletContext?.isConnected ? 'Connected' : 'Disconnected'}
      Address: ${walletContext?.address || 'None'}
      Balance: ${walletContext?.balance || '0'}
      ROLE: You are the Core Intelligence of Aura OS, a specialized Web3 CLI Agent.
      STRICT SCOPE: You ONLY handle tasks related to Blockchain, Crypto, and Wallet Management.
      
      RULES:
      1. If the user asks about ANYTHING outside of Web3 (e.g., cooking, jokes, general knowledge, coding non-web3 apps), you MUST set action to "REJECTED".
      2. If the request is a Web3 task but missing info, ask for it in the "reason" field.
      3. Support tokens: ETH, SUI, USDT, USDC.
      4. Support actions: CHECK_BALANCE, SEND_TOKEN, SWAP_TOKEN.

      OUTPUT: Always return a JSON object following the provided schema.
      
      EXAMPLES:
      - "Check my ETH" -> { "action": "CHECK_BALANCE", "token": "ETH" }
      - "Gửi 0.1 ETH cho 0x123..." -> { "action": "SEND_TOKEN", "amount": 0.1, "token": "ETH", "target_address": "0x123..." }
      - "Làm sao để nấu cơm?" -> { "action": "REJECTED", "reason": "Aura OS chỉ hỗ trợ các tác vụ Web3. Tôi không thể giúp bạn nấu ăn." }
    `;

    const completion = await this.openai.beta.chat.completions.parse({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput },
      ],
      response_format: zodResponseFormat(IntentSchema, "intent"),
    });

    return completion.choices[0].message.parsed;
  }
}