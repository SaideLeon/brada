import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import typography from '@tailwindcss/typography';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()], // typography is a tailwind plugin, usually configured in tailwind.config.js, but with @tailwindcss/vite it might be different.
    // Actually, with @tailwindcss/vite, we don't pass plugins to the vite plugin itself usually?
    // Wait, the documentation for @tailwindcss/vite says it detects the config.
    // But I don't have a tailwind.config.js.
    // I should create a tailwind.config.js or put it in the CSS @theme?
    // Tailwind v4 uses CSS-first configuration.
    // To use typography plugin in v4:
    // @import "tailwindcss/utilities";
    // @plugin "@tailwindcss/typography";
    
    // So I should edit index.css instead of vite.config.ts for the plugin.
    
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
