import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const basePath = env.VITE_BASE_PATH && env.VITE_BASE_PATH !== 'undefined'
    ? env.VITE_BASE_PATH
    : '/';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
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
