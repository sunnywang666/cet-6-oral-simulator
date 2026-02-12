import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    // 支持智谱 API Key 或 Gemini API Key
    const zhipuKey = env.VITE_ZHIPU_API_KEY || env.ZHIPU_API_KEY;
    const geminiKey = env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY;
    const aiProvider = env.VITE_AI_PROVIDER || 'zhipu';

    // 根据选择的 AI 提供商检查对应的 Key
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
        'import.meta.env.VITE_AI_PROVIDER': JSON.stringify(aiProvider)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      // 部署路径配置：可通过环境变量 VITE_BASE_PATH 覆盖
      // 默认：GitHub Pages 使用子路径，其他部署使用根路径
      base: env.VITE_BASE_PATH || (process.env.NODE_ENV === 'production' ? '/cet-6-oral-simulator/' : '/'),
      build: {
        outDir: 'dist',
        assetsDir: 'assets',
      }
    };
});
