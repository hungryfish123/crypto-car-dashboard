import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'process', 'util', 'stream', 'events'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      stream: 'stream-browserify',
      zlib: 'browserify-zlib',
      util: 'util',
      buffer: 'buffer',
      assert: 'assert',
    }
  },
  optimizeDeps: {
    include: ['@solana/web3.js', '@solana/spl-token', 'buffer'],
    esbuildOptions: {
      target: 'esnext',
      define: {
        global: 'globalThis'
      }
    }
  },
  build: {
    target: 'esnext' // Support top-level await
  },
  server: {
    proxy: {
      '/moralis': {
        target: 'https://solana-gateway.moralis.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/moralis/, ''),
      },
    },
  },
})
