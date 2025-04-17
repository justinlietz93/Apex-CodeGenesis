/// <reference types="vitest/config" />

import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setupTests.ts'],
    coverage: {
      provider: 'v8',
      reportOnFailure: true,
    },
  },
  build: {
    outDir: 'build',
    // Optimize for memory usage in CI/Codespace environments
    minify: 'esbuild',
    sourcemap: false,
    // Split chunks more aggressively to reduce memory pressure
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          'react-libs': ['react-use', 'react-virtuoso', 'react-remark'],
          'ui-toolkit': ['@vscode/webview-ui-toolkit'],
          mermaid: ['mermaid'],
          vendor: ['fast-deep-equal', 'fuse.js', 'dompurify'],
        },
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,
      },
    },
    chunkSizeWarningLimit: 100000,
    // Reduce memory usage during build
    emptyOutDir: true,
    target: 'es2020',
  },
  server: {
    port: 25463,
    hmr: {
      host: 'localhost',
      protocol: 'ws',
    },
    cors: {
      origin: '*',
      methods: '*',
      allowedHeaders: '*',
    },
  },
  define: {
    'process.env': {
      NODE_ENV: JSON.stringify(
        process.env.IS_DEV ? 'development' : 'production'
      ),
      IS_DEV: JSON.stringify(process.env.IS_DEV),
    },
  },
});
