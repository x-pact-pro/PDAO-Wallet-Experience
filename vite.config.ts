import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.PDAO_GITHUB_PAGES === '1' ? '/PDAO-Wallet-Experience/' : '/',
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'mobile-wallet', test: /node_modules[\\/](?:@solana-mobile[\\/]|@solana[\\/]wallet-standard-chains[\\/]|@wallet-standard[\\/]wallet[\\/]|lit[\\/]|qrcode[\\/])/, priority: 35 },
            { name: 'react-core', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 30 },
            { name: 'auth0', test: /node_modules[\\/]@auth0[\\/]/, priority: 25 },
            { name: 'icons', test: /node_modules[\\/]lucide-react[\\/]/, priority: 20 },
            { name: 'vendor', test: /node_modules[\\/]/, priority: 10 },
          ],
        },
      },
    },
  },
})
