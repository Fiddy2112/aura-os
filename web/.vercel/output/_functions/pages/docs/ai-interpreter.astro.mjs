/* empty css                                   */
import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../chunks/astro/server_C4W-8AKg.mjs';
import 'piccolore';
import { $ as $$DocsLayout } from '../../chunks/DocsLayout_C9akpxX7.mjs';
export { renderers } from '../../renderers.mjs';

const $$AiInterpreter = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "DocsLayout", $$DocsLayout, { "title": "AI Interpreter" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<nav class="flex items-center gap-2 text-sm text-zinc-500 mb-8"> <a href="/docs" class="hover:text-white transition-colors">Docs</a> <span>/</span> <span class="text-white">AI Interpreter</span> </nav> <div class="mb-12"> <div class="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs font-mono inline-block mb-4">core concept</div> <h1 class="text-4xl md:text-5xl font-bold text-white mb-4">AI Interpreter</h1> <p class="text-xl text-zinc-400">
The brain behind Aura OS — understanding natural language and translating it to Web3 actions.
</p> </div> <section class="mb-16"> <h2 class="text-2xl font-bold text-white mb-4">Overview</h2> <p class="text-zinc-300 leading-relaxed mb-4">
The AI Interpreter is the core intelligence of Aura OS. It takes your natural language input, 
      understands the intent, and outputs a structured command that the blockchain executor can process.
</p> <div class="glass-card p-6 mb-6"> <div class="flex items-center gap-4 flex-wrap md:flex-nowrap"> <div class="flex-1 text-center p-4"> <div class="text-3xl mb-2">💬</div> <div class="text-sm text-zinc-400">Natural Language</div> <div class="text-xs text-zinc-500 mt-1">"Send 0.1 ETH to..."</div> </div> <div class="text-zinc-600 text-2xl">→</div> <div class="flex-1 text-center p-4 bg-purple-500/10 rounded-xl"> <div class="text-3xl mb-2">🧠</div> <div class="text-sm text-purple-400">AI Interpreter</div> <div class="text-xs text-zinc-500 mt-1">Parse & Validate</div> </div> <div class="text-zinc-600 text-2xl">→</div> <div class="flex-1 text-center p-4"> <div class="text-3xl mb-2">⛓️</div> <div class="text-sm text-zinc-400">Structured Intent</div> <div class="text-xs text-zinc-500 mt-1">SEND_TOKEN</div> </div> </div> </div> </section> <section class="mb-16"> <h2 class="text-2xl font-bold text-white mb-4">Two-Stage Parsing</h2> <p class="text-zinc-300 mb-6">
Aura uses a hybrid approach for maximum speed and accuracy:
</p> <div class="space-y-4"> <div class="glass-card p-6"> <div class="flex items-start gap-4"> <div class="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0"> <span class="text-green-400 text-xl">⚡</span> </div> <div> <h3 class="font-bold text-white text-lg mb-2">Stage 1: Quick Parse</h3> <p class="text-sm text-zinc-400 mb-3">
Instant regex-based matching for common patterns. No API calls needed.
</p> <div class="terminal"> <div class="p-3 font-mono text-xs"> <div class="text-zinc-500">// Matches patterns like:</div> <div class="text-green-400">"gas" → GET_GAS</div> <div class="text-green-400">"price eth" → GET_PRICE(ETH)</div> <div class="text-green-400">"my address" → GET_ADDRESS</div> <div class="text-green-400">"0x..." → GET_TRANSACTIONS</div> </div> </div> </div> </div> </div> <div class="glass-card p-6"> <div class="flex items-start gap-4"> <div class="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0"> <span class="text-purple-400 text-xl">🤖</span> </div> <div> <h3 class="font-bold text-white text-lg mb-2">Stage 2: AI Parse</h3> <p class="text-sm text-zinc-400 mb-3">
For complex queries, Aura uses LLMs with structured output (JSON schema).
</p> <div class="flex flex-wrap gap-2 mt-3"> <div class="px-3 py-2 bg-zinc-800 rounded-lg text-sm"> <span class="text-blue-400">1.</span> GPT-4o-mini
</div> <span class="text-zinc-600 self-center">→</span> <div class="px-3 py-2 bg-zinc-800 rounded-lg text-sm"> <span class="text-orange-400">2.</span> Groq (Llama 3.3)
</div> <span class="text-zinc-600 self-center">→</span> <div class="px-3 py-2 bg-zinc-800 rounded-lg text-sm"> <span class="text-cyan-400">3.</span> Gemini 1.5 Flash
</div> </div> <p class="text-xs text-zinc-500 mt-3">Automatic fallback chain for reliability</p> </div> </div> </div> </div> </section> <section class="mb-16"> <h2 class="text-2xl font-bold text-white mb-4">Intent Schema</h2> <p class="text-zinc-300 mb-4">
Every parsed command produces a structured Intent object:
</p> <div class="terminal"> <div class="terminal-header"> <div class="terminal-dot bg-red-500"></div> <div class="terminal-dot bg-yellow-500"></div> <div class="terminal-dot bg-green-500"></div> <span class="ml-4 text-xs text-zinc-500">Intent Schema (TypeScript)</span> </div> <div class="p-4 font-mono text-sm"> <div class="text-purple-400">interface Intent ${renderTemplate`<div class="ml-4"><span class="text-blue-400">action</span>: <span class="text-green-400">"CHECK_BALANCE" | "SEND_TOKEN" | ...</span></div>
        <div class="ml-4"><span class="text-blue-400">token</span>: <span class="text-yellow-400">string | null</span></div>
        <div class="ml-4"><span class="text-blue-400">amount</span>: <span class="text-yellow-400">number | null</span></div>
        <div class="ml-4"><span class="text-blue-400">target_address</span>: <span class="text-yellow-400">string | null</span></div>
        <div class="ml-4"><span class="text-blue-400">chain</span>: <span class="text-yellow-400">string | null</span></div>
        <div class="ml-4"><span class="text-blue-400">reason</span>: <span class="text-yellow-400">string | null</span></div>
        <div class="text-purple-400"></div>
      
    
  

  <section class="mb-16"> <h2 class="text-2xl font-bold text-white mb-4">Supported Actions</h2> <div class="grid gap-3"> <div class="glass-card p-4 flex items-center gap-4"> <code class="text-purple-400 font-mono text-sm w-36">CHECK_BALANCE</code> <span class="text-zinc-400 text-sm">Check token balance in wallet</span> </div> <div class="glass-card p-4 flex items-center gap-4"> <code class="text-blue-400 font-mono text-sm w-36">SEND_TOKEN</code> <span class="text-zinc-400 text-sm">Transfer tokens to address</span> </div> <div class="glass-card p-4 flex items-center gap-4"> <code class="text-green-400 font-mono text-sm w-36">SWAP_TOKEN</code> <span class="text-zinc-400 text-sm">Exchange one token for another</span> </div> <div class="glass-card p-4 flex items-center gap-4"> <code class="text-yellow-400 font-mono text-sm w-36">GET_PRICE</code> <span class="text-zinc-400 text-sm">Get current token price</span> </div> <div class="glass-card p-4 flex items-center gap-4"> <code class="text-orange-400 font-mono text-sm w-36">GET_GAS</code> <span class="text-zinc-400 text-sm">Get current gas price</span> </div> <div class="glass-card p-4 flex items-center gap-4"> <code class="text-cyan-400 font-mono text-sm w-36">GET_ADDRESS</code> <span class="text-zinc-400 text-sm">Show wallet address</span> </div> <div class="glass-card p-4 flex items-center gap-4"> <code class="text-pink-400 font-mono text-sm w-36">GET_TRANSACTIONS</code> <span class="text-zinc-400 text-sm">Fetch transaction history</span> </div> <div class="glass-card p-4 flex items-center gap-4"> <code class="text-red-400 font-mono text-sm w-36">REJECTED</code> <span class="text-zinc-400 text-sm">Non-Web3 request rejected</span> </div> </div> </section>

  <section class="mb-16"> <h2 class="text-2xl font-bold text-white mb-4">Multilingual Support</h2> <p class="text-zinc-300 mb-4">
The AI Interpreter understands multiple languages:
</p> <div class="grid gap-4 md:grid-cols-2"> <div class="terminal"> <div class="p-4 font-mono text-sm"> <div class="text-zinc-500 mb-2">English</div> <div class="text-green-400">"Check my ETH balance"</div> <div class="text-purple-400 mt-2">→ CHECK_BALANCE</div> </div> </div> <div class="terminal"> <div class="p-4 font-mono text-sm"> <div class="text-zinc-500 mb-2">Vietnamese</div> <div class="text-green-400">"Số dư ETH của tôi là bao nhiêu?"</div> <div class="text-purple-400 mt-2">→ CHECK_BALANCE</div> </div> </div> </div> </section>

  <section class="mb-16"> <h2 class="text-2xl font-bold text-white mb-4">Rejection Handling</h2> <p class="text-zinc-300 mb-4">
Non-Web3 requests are gracefully rejected with an explanation:
</p> <div class="terminal"> <div class="p-4 font-mono text-sm"> <div><span class="text-purple-400">❯</span> <span class="text-green-400">aura chat "How do I cook pasta?"</span></div> <div class="text-red-400 mt-2">✗ REJECTED</div> <div class="text-zinc-400 mt-1">Aura OS only supports Web3 tasks like checking balances, sending tokens, and tracking prices.</div> </div> </div> </section>

  <footer class="pt-8 border-t border-zinc-800/50"> <div class="flex items-center justify-between text-sm text-zinc-500"> <a href="/docs/commands/chat" class="hover:text-white transition-colors">← aura chat</a> <a href="/docs/commands" class="hover:text-white transition-colors">All Commands →</a> </div> </footer>`}</div></div></div></section>` })}`;
}, "C:/workspace/Web3/aura-os/web/src/pages/docs/ai-interpreter.astro", void 0);

const $$file = "C:/workspace/Web3/aura-os/web/src/pages/docs/ai-interpreter.astro";
const $$url = "/docs/ai-interpreter";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$AiInterpreter,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
