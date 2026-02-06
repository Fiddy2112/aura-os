import type { APIRoute } from 'astro';
import { AIInterpreter } from '../../lib/ai/interpreter.ts';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { message, walletContext } = await request.json();
    const interpreter = new AIInterpreter();
    
    const intent = await interpreter.parse(message, walletContext);

    if (!intent) {
      return new Response(JSON.stringify({ reply: "Aura's brain is offline. Check API Key!" }), { status: 500 });
    }

    let reply = "";
    

    if (intent.action === "REJECTED") {
      reply = intent.reason || "I only handle Web3 tasks, bro!";
    } else if (intent.action === "CHECK_BALANCE") {
      reply = walletContext.isConnected 
        ? `Your wallet has ${walletContext.balance}. What else do you want to do?`
        : "Bro, you haven't connected your wallet, so I can't check your balance!";
    } else {
      const status = walletContext.isConnected ? "Do you want to execute?" : "Please connect wallet first.";
      reply = `I understand. You want to ${intent.action} ${intent.amount || ''} ${intent.token || ''}. ${status}`;
    }

    return new Response(JSON.stringify({ reply }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ reply: "System error bro!" }), { status: 500 });
  }
};