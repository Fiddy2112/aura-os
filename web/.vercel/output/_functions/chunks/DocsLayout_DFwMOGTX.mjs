import { e as createComponent, g as addAttribute, o as renderHead, p as renderSlot, r as renderTemplate, h as createAstro } from './astro/server_C4W-8AKg.mjs';
import 'piccolore';
import 'clsx';
/* empty css                                  */

const $$Astro = createAstro();
const $$DocsLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$DocsLayout;
  const { title, description = "Aura OS Documentation" } = Astro2.props;
  return renderTemplate`<html lang="en" class="scroll-smooth"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="description"${addAttribute(description, "content")}><meta name="theme-color" content="#000000"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="icon" href="/favicon.ico"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"><link href="https://fonts.cdnfonts.com/css/geist-mono" rel="stylesheet"><meta name="generator"${addAttribute(Astro2.generator, "content")}><title>${title} | Aura OS Docs</title>${renderHead()}</head> <body class="bg-black text-zinc-100 font-sans antialiased"> <div class="min-h-screen flex"> <!-- Sidebar --> <aside class="w-64 border-r border-zinc-900 fixed h-screen overflow-y-auto hidden lg:block bg-black"> <div class="p-6"> <a href="/" class="flex items-center gap-3 mb-8"> <div class="w-8 h-8 rounded-lg bg-white flex items-center justify-center"> <span class="text-black font-bold text-sm">A</span> </div> <span class="font-bold text-lg text-white">Aura OS</span> </a> <nav class="space-y-6"> <div> <h4 class="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-3">Getting Started</h4> <ul class="space-y-1"> <li> <a href="/docs/getting-started" class="block py-2 px-3 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors">
Introduction
</a> </li> <li> <a href="/docs/installation" class="block py-2 px-3 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors">
Installation
</a> </li> <li> <a href="/docs/quickstart" class="block py-2 px-3 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors">
Quick Start
</a> </li> </ul> </div> <div> <h4 class="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-3">Core Commands</h4> <ul class="space-y-1"> <li> <a href="/docs/commands" class="block py-2 px-3 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors">
All Commands Reference
</a> </li> <li> <a href="/docs/commands/setup" class="block py-2 px-3 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors">
aura setup
</a> </li> <li> <a href="/docs/commands/chat" class="block py-2 px-3 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors">
aura chat
</a> </li> </ul> </div> <div> <h4 class="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-3">Research & Alpha</h4> <ul class="space-y-1"> <li> <a href="/docs/commands#research" class="block py-2 px-3 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors">
aura research
</a> </li> <li> <a href="/docs/commands#news" class="block py-2 px-3 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors">
aura news / watch
</a> </li> </ul> </div> <div> <h4 class="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-3">Security & Forensics</h4> <ul class="space-y-1"> <li> <a href="/docs/commands#analyze" class="block py-2 px-3 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors">
aura analyze / info
</a> </li> <li> <a href="/docs/commands#reset-password" class="block py-2 px-3 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors">
aura reset-password
</a> </li> </ul> </div> <div> <h4 class="text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-3">Core Concepts</h4> <ul class="space-y-1"> <li> <a href="/docs/ai-interpreter" class="block py-2 px-3 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors">
AI Interpreter
</a> </li> <li> <a href="/docs/vault" class="block py-2 px-3 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-zinc-900 transition-colors">
Secure Vault
</a> </li> </ul> </div> </nav> </div> </aside> <!-- Main Content --> <main class="flex-1 lg:ml-64"> <div class="max-w-4xl mx-auto px-6 py-16"> ${renderSlot($$result, $$slots["default"])} </div> </main> </div> </body></html>`;
}, "C:/workspace/Web3/aura-os/web/src/layouts/DocsLayout.astro", void 0);

export { $$DocsLayout as $ };
