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
    minify: 'terser', // Better minification than esbuild
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          // Core Three.js - largest chunk, loaded only when needed
          'three-core': ['three'],
          'three-fiber': ['@react-three/fiber', '@react-three/drei'],
          'three-post': ['@react-three/postprocessing'],
          // Solana - separate for wallet operations
          'solana-core': ['@solana/web3.js'],
          'solana-spl': ['@solana/spl-token'],
          'solana-wallet': ['@solana/wallet-adapter-react', '@solana/kit'],
          // UI - commonly used
          'ui-framer': ['framer-motion'],
          'ui-icons': ['lucide-react'],
          'ui-audio': ['howler'],
          // Auth - loaded after initial render
          'auth-supabase': ['@supabase/supabase-js'],
          'auth-privy': ['@privy-io/react-auth']
        }
      }
    },
    chunkSizeWarningLimit: 500, // Warn if chunks exceed 500KB
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
