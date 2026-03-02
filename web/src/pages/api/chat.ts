import type { APIRoute } from 'astro';
import { AIInterpreter } from '../../lib/ai/interpreter.ts';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json().catch(() => ({}));
    const { message, walletContext } = body;

    if (!message) {
      return new Response(JSON.stringify({ reply: "Yo, you didn't send a message!" }), { status: 400 });
    }

    const interpreter = new AIInterpreter();
    
    // Diagnostic logging
    console.log(`[Chat API] Processing message: "${message.slice(0, 50)}..."`);
    
    const intent = await interpreter.parse(message, walletContext).catch(err => {
      console.error("[Chat API] Interpreter error:", err);
      return null;
    });

    if (!intent) {
      return new Response(JSON.stringify({ 
        reply: "Aura's brain is offline. Check your API Key configuration in Vercel/Environment!",
        debug: "AI_PARSE_FAILED"
      }), { status: 500 });
    }

    let reply = "";

    if (intent.action === "REJECTED") {
      reply = intent.reason || "I only handle Web3 tasks, bro!";
    } else if (intent.action === "CHECK_BALANCE") {
      const balance = walletContext?.balance || '0';
      const isConnected = walletContext?.isConnected;
      
      reply = (isConnected) 
        ? `Your wallet has ${balance}. What else do you want to do?`
        : "Bro, you haven't connected your wallet, so I can't check the balance!";
    } else {
      const isConnected = walletContext?.isConnected;
      const status = isConnected ? "Do you want to execute?" : "Please connect wallet first.";
      const actionDesc = intent.action.replace(/_/g, ' ').toLowerCase();
      reply = `I understand. You want to ${actionDesc} ${intent.amount || ''} ${intent.token || ''}. ${status}`;
    }

    return new Response(JSON.stringify({ reply }), { status: 200 });
  } catch (error: any) {
    console.error("[Chat API] Critical failure:", error);
    return new Response(JSON.stringify({ 
      reply: "System error bro! Check server logs.",
      error: error.message 
    }), { status: 500 });
  }
};