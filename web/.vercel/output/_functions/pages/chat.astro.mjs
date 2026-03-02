/* empty css                                */
import { e as createComponent, k as renderComponent, l as renderScript, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_C4W-8AKg.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_D42uKeWZ.mjs';
import { $ as $$Navbar, a as $$Footer } from '../chunks/Footer_Dqj-grey.mjs';
import { C as ChatWrapper } from '../chunks/ChatWrapper_BU5Ix-Ih.mjs';
import { Languages, Lock, Zap } from 'lucide-react';
export { renderers } from '../renderers.mjs';

const $$Chat = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Chat - Aura OS" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "Navbar", $$Navbar, {})} ${maybeRenderHead()}<main class="pt-32 pb-20 bg-black min-h-screen"> <div class="section-container"> <div class="text-center mb-12"> <span class="inline-block px-4 py-1.5 mb-6 text-sm font-medium text-zinc-400 border border-zinc-800 rounded-full">
Command Center
</span> <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
Chat with Aura
</h1> <p class="text-xl text-zinc-500 max-w-2xl mx-auto">
Connect your wallet and start commanding the blockchain with natural language.
</p> </div> <div class="flex justify-center mb-16"> ${renderComponent($$result2, "ChatWrapper", ChatWrapper, { "client:load": true, "client:component-hydration": "load", "client:component-path": "C:/workspace/Web3/aura-os/web/src/components/ChatWrapper.tsx", "client:component-export": "default" })} </div> <div class="max-w-2xl mx-auto"> <h3 class="text-lg font-semibold text-white mb-4 text-center">Try these commands</h3> <div class="grid grid-cols-1 sm:grid-cols-2 gap-3"> <button class="quick-cmd glass-card p-4 text-left hover:border-zinc-700 transition-colors"> <span class="text-white font-medium">"Check my ETH balance"</span> <p class="text-sm text-zinc-500 mt-1">Query your wallet balance</p> </button> <button class="quick-cmd glass-card p-4 text-left hover:border-zinc-700 transition-colors"> <span class="text-white font-medium">"Send 0.1 ETH to 0x..."</span> <p class="text-sm text-zinc-500 mt-1">Transfer tokens</p> </button> <button class="quick-cmd glass-card p-4 text-left hover:border-zinc-700 transition-colors"> <span class="text-white font-medium">"Swap 100 USDC to ETH"</span> <p class="text-sm text-zinc-500 mt-1">Exchange tokens</p> </button> <button class="quick-cmd glass-card p-4 text-left hover:border-zinc-700 transition-colors"> <span class="text-white font-medium">"Kiểm tra số dư SUI"</span> <p class="text-sm text-zinc-500 mt-1">Vietnamese supported</p> </button> </div> </div> <div class="mt-24 grid md:grid-cols-3 gap-6 max-w-4xl mx-auto"> <div class="text-center p-6"> <div class="w-14 h-14 mx-auto mb-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl"> ${renderComponent($$result2, "Languages", Languages, { "size": 24 })} </div> <h3 class="text-lg font-semibold text-white mb-2">Natural Language</h3> <p class="text-sm text-zinc-500">
Just type what you want. Aura understands Vietnamese and English.
</p> </div> <div class="text-center p-6"> <div class="w-14 h-14 mx-auto mb-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl"> ${renderComponent($$result2, "Lock", Lock, { "size": 24 })} </div> <h3 class="text-lg font-semibold text-white mb-2">Secure by Design</h3> <p class="text-sm text-zinc-500">
Transaction signing happens locally. Your keys never leave your device.
</p> </div> <div class="text-center p-6"> <div class="w-14 h-14 mx-auto mb-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-2xl"> ${renderComponent($$result2, "Zap", Zap, { "size": 24 })} </div> <h3 class="text-lg font-semibold text-white mb-2">Instant Execution</h3> <p class="text-sm text-zinc-500">
From command to on-chain action in seconds. Fast, reliable, always.
</p> </div> </div> <div class="mt-24 max-w-2xl mx-auto"> <h3 class="text-lg font-semibold text-white mb-6 text-center">Supported Actions</h3> <div class="grid grid-cols-3 gap-4"> <div class="glass-card p-4 text-center"> <code class="text-sm text-white">CHECK_BALANCE</code> <p class="text-xs text-zinc-500 mt-2">Query balances</p> </div> <div class="glass-card p-4 text-center"> <code class="text-sm text-white">SEND_TOKEN</code> <p class="text-xs text-zinc-500 mt-2">Transfer tokens</p> </div> <div class="glass-card p-4 text-center"> <code class="text-sm text-white">SWAP_TOKEN</code> <p class="text-xs text-zinc-500 mt-2">Exchange tokens</p> </div> </div> <p class="text-center text-sm text-zinc-600 mt-4">
Supported tokens: ETH, SUI, USDT, USDC
</p> </div> </div> </main> ${renderComponent($$result2, "Footer", $$Footer, {})} ` })} ${renderScript($$result, "C:/workspace/Web3/aura-os/web/src/pages/chat.astro?astro&type=script&index=0&lang.ts")}`;
}, "C:/workspace/Web3/aura-os/web/src/pages/chat.astro", void 0);

const $$file = "C:/workspace/Web3/aura-os/web/src/pages/chat.astro";
const $$url = "/chat";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Chat,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
