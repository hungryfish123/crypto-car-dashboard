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
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
      }
    },
    rollupOptions: {
      output: {
        // Function-based chunking for maximum control and deduplication
        manualChunks(id) {
          // THREE.JS - Largest dependency, split aggressively
          if (id.includes('node_modules/three/')) {
            return 'three-core';
          }
          if (id.includes('@react-three/fiber')) {
            return 'three-fiber';
          }
          if (id.includes('@react-three/drei')) {
            return 'three-drei';
          }
          if (id.includes('@react-three/postprocessing') || id.includes('postprocessing')) {
            return 'three-post';
          }

          // SOLANA - Heavy crypto libraries
          if (id.includes('@solana/web3.js') || id.includes('node_modules/@solana/web3')) {
            return 'solana-core';
          }
          if (id.includes('@solana/spl-token')) {
            return 'solana-spl';
          }
          if (id.includes('@solana/wallet-adapter') || id.includes('@solana/kit')) {
            return 'solana-wallet';
          }

          // AUTH - Defer loading until needed
          if (id.includes('@privy-io')) {
            return 'auth-privy';
          }
          if (id.includes('@supabase')) {
            return 'auth-supabase';
          }

          // UI LIBRARIES - Common but not critical
          if (id.includes('framer-motion')) {
            return 'ui-motion';
          }
          if (id.includes('lucide-react')) {
            return 'ui-icons';
          }
          if (id.includes('howler')) {
            return 'ui-audio';
          }

          // POLYFILLS - Keep separate for caching
          if (id.includes('buffer') || id.includes('process') || id.includes('stream-browserify')) {
            return 'polyfills';
          }

          // REACT CORE - Keep together
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'react-vendor';
          }

          // Everything else in node_modules goes to vendor
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    },
    chunkSizeWarningLimit: 500,
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
