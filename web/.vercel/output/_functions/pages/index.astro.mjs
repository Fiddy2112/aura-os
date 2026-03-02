/* empty css                                */
import { e as createComponent, m as maybeRenderHead, k as renderComponent, r as renderTemplate } from '../chunks/astro/server_C4W-8AKg.mjs';
import 'piccolore';
import { $ as $$Layout } from '../chunks/Layout_D42uKeWZ.mjs';
import { $ as $$Navbar, a as $$Footer } from '../chunks/Footer_Dqj-grey.mjs';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { TypeAnimation } from 'react-type-animation';
import { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, CopyCheck, Copy, Languages, Lock, Zap } from 'lucide-react';
import 'clsx';
import { C as ChatWrapper } from '../chunks/ChatWrapper_BU5Ix-Ih.mjs';
export { renderers } from '../renderers.mjs';

function AnimatedCode({ sequence }) {
  return /* @__PURE__ */ jsx("span", { className: "text-green-400 whitespace-pre-wrap", children: /* @__PURE__ */ jsx(
    TypeAnimation,
    {
      sequence,
      wrapper: "span",
      cursor: true,
      repeat: Infinity,
      speed: 40,
      deletionSpeed: 60,
      style: { display: "inline-block" }
    }
  ) });
}

function PriceTracker() {
  const [prices, setPrices] = useState({
    eth: 0,
    sui: 0,
    ethChange: 2.4,
    suiChange: -1.2
  });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbols=["ETHUSDT","SUIUSDT"]');
        const data = await res.json();
        setPrices((prev) => ({
          eth: parseFloat(data.find((t) => t.symbol === "ETHUSDT")?.price || "0"),
          sui: parseFloat(data.find((t) => t.symbol === "SUIUSDT")?.price || "0"),
          ethChange: prev.ethChange,
          suiChange: prev.suiChange
        }));
        setLoading(false);
      } catch (e) {
        console.error("Failed to fetch prices");
        setLoading(false);
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 1e4);
    return () => clearInterval(interval);
  }, []);
  return /* @__PURE__ */ jsxs("div", { className: "flex flex-wrap gap-4 justify-center", children: [
    /* @__PURE__ */ jsxs("div", { className: "glass-card px-6 py-4 flex items-center gap-4 min-w-[180px]", children: [
      /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xl border border-zinc-700", children: /* @__PURE__ */ jsx("img", { src: "/ethereum.svg", alt: "ETH", className: "w-6 h-6" }) }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs text-zinc-500 uppercase tracking-wider font-medium", children: "ETH" }),
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: loading ? /* @__PURE__ */ jsx(RefreshCw, { className: "w-4 h-4 text-zinc-600 animate-spin" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("span", { className: "text-lg font-semibold text-white font-mono", children: [
            "$",
            prices.eth.toLocaleString(void 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          ] }),
          /* @__PURE__ */ jsxs("span", { className: `text-xs flex items-center gap-0.5 ${prices.ethChange >= 0 ? "text-zinc-400" : "text-zinc-500"}`, children: [
            prices.ethChange >= 0 ? /* @__PURE__ */ jsx(TrendingUp, { size: 12 }) : /* @__PURE__ */ jsx(TrendingDown, { size: 12 }),
            Math.abs(prices.ethChange),
            "%"
          ] })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "glass-card px-6 py-4 flex items-center gap-4 min-w-[180px]", children: [
      /* @__PURE__ */ jsx("div", { className: "w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xl border border-zinc-700", children: /* @__PURE__ */ jsx("img", { src: "/sui.svg", alt: "SUI", className: "w-6 h-6" }) }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "text-xs text-zinc-500 uppercase tracking-wider font-medium", children: "SUI" }),
        /* @__PURE__ */ jsx("div", { className: "flex items-center gap-2", children: loading ? /* @__PURE__ */ jsx(RefreshCw, { className: "w-4 h-4 text-zinc-600 animate-spin" }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("span", { className: "text-lg font-semibold text-white font-mono", children: [
            "$",
            prices.sui.toFixed(4)
          ] }),
          /* @__PURE__ */ jsxs("span", { className: `text-xs flex items-center gap-0.5 ${prices.suiChange >= 0 ? "text-zinc-400" : "text-zinc-500"}`, children: [
            prices.suiChange >= 0 ? /* @__PURE__ */ jsx(TrendingUp, { size: 12 }) : /* @__PURE__ */ jsx(TrendingDown, { size: 12 }),
            Math.abs(prices.suiChange),
            "%"
          ] })
        ] }) })
      ] })
    ] })
  ] });
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };
  return /* @__PURE__ */ jsx(
    "button",
    {
      onClick: handleCopy,
      className: "p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-500 hover:text-white",
      title: copied ? "Copied!" : "Copy to clipboard",
      children: copied ? /* @__PURE__ */ jsx(CopyCheck, { size: 18, className: "text-green-500" }) : /* @__PURE__ */ jsx(Copy, { size: 18 })
    }
  );
}

const $$HeroSection = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<section class="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden bg-black"> <div class="absolute inset-0 grid-pattern opacity-50"></div> <div class="absolute inset-0 bg-gradient-to-b from-zinc-900/20 via-transparent to-zinc-900/20"></div> <div class="relative z-10 max-w-5xl mx-auto text-center"> <div class="inline-flex items-center gap-2 px-4 py-2 mt-4 mb-8 rounded-full border border-zinc-800 bg-zinc-900/50 animate-fade-in-up" style="animation-delay: 0.1s;"> <span class="relative flex h-2 w-2"> <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span> <span class="relative inline-flex rounded-full h-2 w-2 bg-white"></span> </span> <span class="text-sm text-zinc-400">Now in Beta • v1.0.0</span> </div> <h1 class="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight mb-6 animate-fade-in-up text-balance" style="animation-delay: 0.2s;"> <span class="text-white">Aura OS</span> <br> <span class="text-zinc-500">Your AI Commander</span> <br> <span class="text-zinc-600 text-4xl sm:text-5xl md:text-6xl lg:text-7xl">for Web3</span> </h1> <p class="text-lg md:text-xl text-zinc-500 mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-in-up" style="animation-delay: 0.3s;">
Unlock the full potential of <span class="text-white">decentralized finance</span> with 
      intelligent automation and <span class="text-white">ironclad security</span>.
</p> <div class="w-full max-w-2xl mx-auto mb-10 animate-fade-in-up" style="animation-delay: 0.4s;"> <div class="terminal"> <div class="terminal-header"> <div class="terminal-dot bg-red-500"></div> <div class="terminal-dot bg-yellow-500"></div> <div class="terminal-dot bg-green-500"></div> <span class="ml-4 text-xs text-zinc-600 font-mono">aura-os ~ terminal</span> </div> <div class="p-6 font-mono text-sm md:text-base"> <div class="flex items-center justify-between gap-4"> <div class="flex items-start gap-3 flex-1 min-w-0"> <span class="text-zinc-500 select-none">$</span> ${renderComponent($$result, "AnimatedCode", AnimatedCode, { "client:load": true, "sequence": [
    "npm install -g aura-os",
    2e3,
    "aura setup --master-password ********",
    2e3,
    'aura chat "Check my ETH balance"',
    2500,
    "\u2713 Your balance: 2.847 ETH ($9,234.50)",
    3e3,
    'aura chat "Find new tokens with >$10k liquidity"',
    3e3,
    "\u2713 Found 12 tokens matching criteria...",
    2500,
    'aura agent start --task "monitor whales"',
    3e3,
    "\u2713 Agent deployed. Monitoring 847 wallets...",
    3e3
  ], "client:component-hydration": "load", "client:component-path": "C:/workspace/Web3/aura-os/web/src/components/AnimatedCode", "client:component-export": "default" })} </div> ${renderComponent($$result, "CopyButton", CopyButton, { "client:load": true, "text": "npm install -g aura-os", "client:component-hydration": "load", "client:component-path": "C:/workspace/Web3/aura-os/web/src/components/CopyButton", "client:component-export": "default" })} </div> </div> </div> </div> <div class="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16 animate-fade-in-up" style="animation-delay: 0.5s;"> <a href="/docs/getting-started" class="btn-primary group"> <span>Get Started</span> <svg class="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path> </svg> </a> <a href="https://github.com/aura-os" target="_blank" rel="noopener" class="btn-secondary group"> <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24"> <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"></path> </svg> <span>GitHub</span> </a> </div> <div class="animate-fade-in-up" style="animation-delay: 0.6s;"> ${renderComponent($$result, "PriceTracker", PriceTracker, { "client:load": true, "client:component-hydration": "load", "client:component-path": "C:/workspace/Web3/aura-os/web/src/components/PriceTracker", "client:component-export": "default" })} </div> </div> <div class="absolute bottom-8 left-1/2 -translate-x-1/2"> <div class="w-6 h-10 rounded-full border-2 border-zinc-800 flex items-start justify-center p-2"> <div class="w-1 h-2 bg-zinc-600 rounded-full animate-bounce"></div> </div> </div> </section>`;
}, "C:/workspace/Web3/aura-os/web/src/components/HeroSection.astro", void 0);

const $$BentoFeatures = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<section class="relative py-32 bg-black" id="features"> <div class="absolute inset-0 dot-pattern opacity-30"></div> <div class="section-container relative z-10"> <div class="text-center mb-20"> <span class="inline-block px-4 py-1.5 mb-6 text-sm font-medium text-zinc-400 border border-zinc-800 rounded-full">
Core Features
</span> <h2 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 text-balance">
Built for the
<span class="text-zinc-500">next generation</span> <br>of Web3 operators
</h2> <p class="text-lg text-zinc-500 max-w-2xl mx-auto">
Three powerful pillars designed to give you an unfair advantage in the decentralized economy.
</p> </div> <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> <div class="bento-card md:col-span-2 lg:col-span-2 group"> <div class="flex flex-col lg:flex-row gap-8 h-full"> <div class="flex-1"> <div class="inline-flex items-center justify-center w-14 h-14 mb-6 rounded-2xl bg-zinc-800 border border-zinc-700"> <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path> </svg> </div> <h3 class="text-2xl lg:text-3xl font-bold text-white mb-4">AI Brain</h3> <p class="text-zinc-400 text-lg leading-relaxed mb-6">
Powered by advanced LLM integration, Aura understands your commands in
<span class="text-white">natural language</span> — Vietnamese, English, or any language you prefer.
</p> <ul class="space-y-3"> <li class="flex items-center gap-3 text-zinc-300"> <span class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-zinc-800 border border-zinc-700"> <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"> <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path> </svg> </span>
On-chain intent analysis
</li> <li class="flex items-center gap-3 text-zinc-300"> <span class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-zinc-800 border border-zinc-700"> <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"> <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path> </svg> </span>
Smart contract interaction
</li> <li class="flex items-center gap-3 text-zinc-300"> <span class="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-zinc-800 border border-zinc-700"> <svg class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"> <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path> </svg> </span>
Multi-chain reasoning
</li> </ul> </div> <div class="flex-1 flex items-center justify-center"> <div class="relative w-full max-w-[200px] aspect-square"> <div class="absolute inset-0 rounded-full border border-zinc-800"></div> <div class="absolute inset-4 rounded-full border border-zinc-700 flex items-center justify-center"> <div class="text-5xl">🧠</div> </div> </div> </div> </div> </div> <div class="bento-card group"> <div class="inline-flex items-center justify-center w-14 h-14 mb-6 rounded-2xl bg-zinc-800 border border-zinc-700"> <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path> </svg> </div> <h3 class="text-2xl font-bold text-white mb-4">Secure Vault</h3> <p class="text-zinc-400 leading-relaxed mb-6">
Your private keys <span class="text-white font-medium">never leave your device</span>. 
          Military-grade AES-256 encryption protects your assets locally.
</p> <div class="p-4 rounded-xl bg-zinc-950 border border-zinc-800 font-mono text-sm"> <div class="flex items-center gap-2 text-white mb-2"> <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"> <path fill-rule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clip-rule="evenodd"></path> </svg> <span>vault.encrypted</span> </div> <div class="text-zinc-600 text-xs truncate">
0x7f3a...encrypted...b4c2
</div> </div> </div> <div class="bento-card group"> <div class="inline-flex items-center justify-center w-14 h-14 mb-6 rounded-2xl bg-zinc-800 border border-zinc-700"> <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path> </svg> </div> <h3 class="text-2xl font-bold text-white mb-4">CLI Power</h3> <p class="text-zinc-400 leading-relaxed mb-6">
Runs silently in the background, automating complex tasks that browsers simply cannot handle.
</p> <div class="space-y-2"> <div class="flex items-center gap-2 text-sm"> <span class="px-2 py-1 rounded bg-zinc-800 text-zinc-300 font-mono text-xs">aura agent</span> <span class="text-zinc-500">24/7 automation</span> </div> <div class="flex items-center gap-2 text-sm"> <span class="px-2 py-1 rounded bg-zinc-800 text-zinc-300 font-mono text-xs">aura watch</span> <span class="text-zinc-500">real-time alerts</span> </div> </div> </div> <div class="bento-card group"> <div class="inline-flex items-center justify-center w-14 h-14 mb-6 rounded-2xl bg-zinc-800 border border-zinc-700"> <svg class="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"> <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path> </svg> </div> <h3 class="text-2xl font-bold text-white mb-4">Multi-Chain</h3> <p class="text-zinc-400 leading-relaxed mb-6">
Seamlessly operate across Ethereum, Sui, and more chains from a single unified interface.
</p> <div class="flex items-center gap-3"> <div class="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xl border border-zinc-700"> <img src="/ethereum.svg" alt="ETH" class="w-6 h-6"> </div> <div class="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-xl border border-zinc-700"> <img src="/sui.svg" alt="SUI" class="w-6 h-6"> </div> <div class="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm text-zinc-500 border border-dashed border-zinc-700">+5</div> </div> </div> <div class="bento-card md:col-span-2 group"> <div class="grid grid-cols-3 gap-8 text-center"> <div> <div class="text-4xl md:text-5xl font-bold text-white mb-2">99.9%</div> <div class="text-zinc-500 text-sm">Uptime SLA</div> </div> <div> <div class="text-4xl md:text-5xl font-bold text-white mb-2">&lt;50ms</div> <div class="text-zinc-500 text-sm">Response Time</div> </div> <div> <div class="text-4xl md:text-5xl font-bold text-white mb-2">256-bit</div> <div class="text-zinc-500 text-sm">Encryption</div> </div> </div> </div> </div> </div> </section>`;
}, "C:/workspace/Web3/aura-os/web/src/components/BentoFeatures.astro", void 0);

const $$ChatSection = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<section class="relative py-32 bg-black" id="chat"> <div class="section-container relative z-10"> <div class="text-center mb-16"> <span class="inline-block px-4 py-1.5 mb-6 text-sm font-medium text-zinc-400 border border-zinc-800 rounded-full">
Command Center
</span> <h2 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 text-balance">
Chat with your
<span class="text-zinc-500">AI Commander</span> </h2> <p class="text-lg text-zinc-500 max-w-2xl mx-auto">
Connect your wallet and start commanding the blockchain. Natural language, infinite possibilities.
</p> </div> <div class="flex justify-center"> ${renderComponent($$result, "ChatWrapper", ChatWrapper, { "client:load": true, "client:component-hydration": "load", "client:component-path": "C:/workspace/Web3/aura-os/web/src/components/ChatWrapper", "client:component-export": "default" })} </div> <div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"> <div class="text-center p-6"> <div class="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-zinc-900 border border-zinc-800"> <span class="text-xl">${renderComponent($$result, "Languages", Languages, { "size": 24 })}</span> </div> <h3 class="text-lg font-semibold text-white mb-2">Natural Language</h3> <p class="text-sm text-zinc-500">Just type what you want to do. Aura understands Vietnamese and English.</p> </div> <div class="text-center p-6"> <div class="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-zinc-900 border border-zinc-800"> <span class="text-xl">${renderComponent($$result, "Lock", Lock, { "size": 24 })}</span> </div> <h3 class="text-lg font-semibold text-white mb-2">Secure by Design</h3> <p class="text-sm text-zinc-500">Transaction signing happens locally. Your keys never leave your device.</p> </div> <div class="text-center p-6"> <div class="inline-flex items-center justify-center w-12 h-12 mb-4 rounded-xl bg-zinc-900 border border-zinc-800"> <span class="text-xl">${renderComponent($$result, "Zap", Zap, { "size": 24 })}</span> </div> <h3 class="text-lg font-semibold text-white mb-2">Instant Execution</h3> <p class="text-sm text-zinc-500">From command to on-chain action in seconds. Fast, reliable, always.</p> </div> </div> </div> </section>`;
}, "C:/workspace/Web3/aura-os/web/src/components/ChatSection.astro", void 0);

const $$Index = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "Layout", $$Layout, { "title": "Aura OS - Your AI Commander for Web3" }, { "default": ($$result2) => renderTemplate` ${renderComponent($$result2, "Navbar", $$Navbar, {})} ${maybeRenderHead()}<main> ${renderComponent($$result2, "HeroSection", $$HeroSection, {})} ${renderComponent($$result2, "BentoFeatures", $$BentoFeatures, {})} ${renderComponent($$result2, "ChatSection", $$ChatSection, {})} </main> ${renderComponent($$result2, "Footer", $$Footer, {})} ` })}`;
}, "C:/workspace/Web3/aura-os/web/src/pages/index.astro", void 0);

const $$file = "C:/workspace/Web3/aura-os/web/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Index,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
