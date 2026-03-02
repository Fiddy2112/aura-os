import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_frEQlUu1.mjs';
import { manifest } from './manifest_CX23rg1E.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/api/chat.astro.mjs');
const _page2 = () => import('./pages/chat.astro.mjs');
const _page3 = () => import('./pages/dashboard.astro.mjs');
const _page4 = () => import('./pages/docs/ai-interpreter.astro.mjs');
const _page5 = () => import('./pages/docs/commands/chat.astro.mjs');
const _page6 = () => import('./pages/docs/commands/setup.astro.mjs');
const _page7 = () => import('./pages/docs/commands.astro.mjs');
const _page8 = () => import('./pages/docs/getting-started.astro.mjs');
const _page9 = () => import('./pages/docs/installation.astro.mjs');
const _page10 = () => import('./pages/docs/quickstart.astro.mjs');
const _page11 = () => import('./pages/docs.astro.mjs');
const _page12 = () => import('./pages/features.astro.mjs');
const _page13 = () => import('./pages/login.astro.mjs');
const _page14 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/api/chat.ts", _page1],
    ["src/pages/chat.astro", _page2],
    ["src/pages/dashboard.astro", _page3],
    ["src/pages/docs/ai-interpreter.astro", _page4],
    ["src/pages/docs/commands/chat.astro", _page5],
    ["src/pages/docs/commands/setup.astro", _page6],
    ["src/pages/docs/commands.astro", _page7],
    ["src/pages/docs/getting-started.astro", _page8],
    ["src/pages/docs/installation.astro", _page9],
    ["src/pages/docs/quickstart.astro", _page10],
    ["src/pages/docs/index.astro", _page11],
    ["src/pages/features.astro", _page12],
    ["src/pages/login.astro", _page13],
    ["src/pages/index.astro", _page14]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "da3c31c0-e526-4f29-8c08-322ad662d139",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) ;

export { __astrojsSsrVirtualEntry as default, pageMap };
