import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [
    react(), 
    tailwind()
  ],
  vite: {
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        external: ['openai', 'groq-sdk'],
        onwarn(warning, warn) {
          if (warning.code === 'MODULE_LEVEL_DIRECTIVE' || warning.message.includes('/*#__PURE__*/')) {
            return;
          }
          warn(warning);
        }
      }
    }
  } 
});