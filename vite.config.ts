import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // Supports either Zhipu or Gemini API keys.
  const zhipuKey = env.VITE_ZHIPU_API_KEY || env.ZHIPU_API_KEY;
  const geminiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;
  const aiProvider = env.VITE_AI_PROVIDER || 'zhipu';
  const basePath = env.VITE_BASE_PATH && env.VITE_BASE_PATH !== 'undefined'
    ? env.VITE_BASE_PATH
    : '/';

  // Validate the key required by the selected AI provider.
  if (mode === 'production') {
    if (aiProvider === 'zhipu' && (!zhipuKey || zhipuKey === 'undefined')) {
      throw new Error('ZHIPU_API_KEY (or VITE_ZHIPU_API_KEY) must be provided for production builds.');
    } else if ((aiProvider === 'gemini' || aiProvider === 'gemini-proxy') && (!geminiKey || geminiKey === 'undefined')) {
      throw new Error('GEMINI_API_KEY (or VITE_GEMINI_API_KEY) must be provided for production builds.');
    }
  }

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(geminiKey),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiKey),
      'process.env.ZHIPU_API_KEY': JSON.stringify(zhipuKey),
      'import.meta.env.VITE_ZHIPU_API_KEY': JSON.stringify(zhipuKey),
      'import.meta.env.VITE_AI_PROVIDER': JSON.stringify(aiProvider),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    // Use root-relative assets by default for cet6-simulator.com.
    // Set VITE_BASE_PATH=/cet-6-oral-simulator/ only when deploying to a repo subpath.
    base: basePath,
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
    },
  };
});
