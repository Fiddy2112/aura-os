import { e as createComponent, g as addAttribute, o as renderHead, p as renderSlot, r as renderTemplate, h as createAstro } from './astro/server_C4W-8AKg.mjs';
import 'piccolore';
import 'clsx';
/* empty css                                  */

const $$Astro = createAstro();
const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Layout;
  const { title, description = "Your AI Commander for Web3 - Unlock the full potential of decentralized finance with intelligent automation and ironclad security." } = Astro2.props;
  return renderTemplate`<html lang="en" class="scroll-smooth"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="description"${addAttribute(description, "content")}><meta name="theme-color" content="#000000"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="icon" href="/favicon.ico"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet"><link href="https://fonts.cdnfonts.com/css/geist-mono" rel="stylesheet"><meta name="generator"${addAttribute(Astro2.generator, "content")}><title>${title}</title><meta property="og:title"${addAttribute(title, "content")}><meta property="og:description"${addAttribute(description, "content")}><meta property="og:type" content="website">${renderHead()}</head> <body class="bg-black text-zinc-100 font-sans antialiased overflow-x-hidden"> ${renderSlot($$result, $$slots["default"])} </body></html>`;
}, "C:/workspace/Web3/aura-os/web/src/layouts/Layout.astro", void 0);

export { $$Layout as $ };
