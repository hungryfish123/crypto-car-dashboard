import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
