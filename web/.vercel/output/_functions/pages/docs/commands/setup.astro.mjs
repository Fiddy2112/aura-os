/* empty css                                      */
import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../../../chunks/astro/server_C4W-8AKg.mjs';
import 'piccolore';
import { $ as $$DocsLayout } from '../../../chunks/DocsLayout_C9akpxX7.mjs';
import { Lock, Save } from 'lucide-react';
export { renderers } from '../../../renderers.mjs';

const $$Setup = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "DocsLayout", $$DocsLayout, { "title": "aura setup" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<nav class="flex items-center gap-2 text-sm text-zinc-500 mb-8"> <a href="/docs" class="hover:text-white transition-colors">Docs</a> <span>/</span> <a href="/docs/commands" class="hover:text-white transition-colors">Commands</a> <span>/</span> <span class="text-white">aura setup</span> </nav> <div class="mb-12"> <div class="px-3 py-1 rounded-full bg-zinc-800 text-xs font-mono text-zinc-400 inline-block mb-4">command</div> <h1 class="text-4xl md:text-5xl font-bold text-white mb-4 font-mono">aura setup</h1> <p class="text-xl text-zinc-400">Initialize your wallet and configure Aura OS.</p> </div> <div class="glass-card p-6 mb-12"> <h3 class="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-4">Synopsis</h3> <div class="terminal"> <div class="p-4 font-mono text-sm"> <span class="text-green-400">aura setup</span> </div> </div> </div> <section class="mb-16"> <h2 class="text-2xl font-bold text-white mb-4">Description</h2> <p class="text-zinc-300 leading-relaxed mb-4">
The <code class="px-2 py-1 bg-zinc-800 rounded text-purple-400">aura setup</code> command securely stores your wallet's private key. Required before using wallet features.
</p> <p class="text-zinc-300">During setup, you'll provide:</p> <ol class="list-decimal list-inside text-zinc-300 mt-4 space-y-2 ml-4"> <li><strong class="text-white">Private Key</strong> — Your EVM wallet private key</li> <li><strong class="text-white">Master Password</strong> — A password to encrypt your key</li> </ol> </section> <section class="mb-16"> <h2 class="text-2xl font-bold text-white mb-4">Usage</h2> <div class="terminal mb-6"> <div class="terminal-header"> <div class="terminal-dot bg-red-500"></div> <div class="terminal-dot bg-yellow-500"></div> <div class="terminal-dot bg-green-500"></div> </div> <div class="p-4 font-mono text-sm space-y-2"> <div><span class="text-purple-400">❯</span> <span class="text-green-400">aura setup</span></div> <div class="text-blue-400 mt-4">Welcome to Aura OS - AI Agent Manager</div> <div class="text-zinc-400 mt-2">? Enter your private key: ********</div> <div class="text-zinc-400">? Set Master Password: ********</div> <div class="text-green-400 mt-2">✓ Setup complete! Protected by AES-256.</div> </div> </div> </section> <section class="mb-16"> <h2 class="text-2xl font-bold text-white mb-4">Security</h2> <div class="space-y-4"> <div class="glass-card p-5 flex items-start gap-4"> <span class="text-green-400 text-2xl">${renderComponent($$result2, "Lock", Lock, { "size": 24 })}</span> <div> <h3 class="font-semibold text-white mb-1">AES-256 Encryption</h3> <p class="text-sm text-zinc-400">Private key encrypted with PBKDF2-derived key (100k iterations).</p> </div> </div> <div class="glass-card p-5 flex items-start gap-4"> <span class="text-blue-400 text-2xl">${renderComponent($$result2, "Save", Save, { "size": 24 })}</span> <div> <h3 class="font-semibold text-white mb-1">Local Storage Only</h3> <p class="text-sm text-zinc-400">Stored at <code class="px-1 bg-zinc-800 rounded">~/.aura/vault.enc</code>. Never sent to any server.</p> </div> </div> </div> </section> <section class="mb-16"> <h2 class="text-2xl font-bold text-white mb-4">Best Practices</h2> <div class="glass-card p-4 border-l-4 border-yellow-500 bg-yellow-500/5"> <ul class="text-sm text-zinc-400 space-y-2"> <li>• Use a <strong class="text-white">dedicated wallet</strong> for testing</li> <li>• Use a <strong class="text-white">strong master password</strong> (12+ characters)</li> <li>• Backup your <strong class="text-white">seed phrase</strong> separately</li> </ul> </div> </section> <footer class="pt-8 border-t border-zinc-800/50"> <div class="flex items-center justify-between text-sm text-zinc-500"> <a href="/docs/commands" class="hover:text-white transition-colors">← All Commands</a> <a href="/docs/commands/chat" class="hover:text-white transition-colors">aura chat →</a> </div> </footer> ` })}`;
}, "C:/workspace/Web3/aura-os/web/src/pages/docs/commands/setup.astro", void 0);

const $$file = "C:/workspace/Web3/aura-os/web/src/pages/docs/commands/setup.astro";
const $$url = "/docs/commands/setup";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Setup,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
