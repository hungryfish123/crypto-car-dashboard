import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import '@solana/wallet-adapter-react-ui/styles.css';

import './index.css'
import App from './App.jsx'

// Solana wallet connectors
const solanaConnectors = toSolanaWalletConnectors({
  shouldAutoConnect: true,
});

// Wallets for Adapter
const wallets = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter()
];

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PrivyProvider
      appId="cmjc46n8i018fjp0dpqa455ux"
      onSuccess={(user) => {
        console.log('Privy login success:', user)
        console.log('Wallet Address:', user.wallet?.address)
      }}
      config={{
        loginMethods: ['wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#EF4444',
        },
        embeddedWallets: {
          createOnLogin: 'off',
        },
        externalWallets: {
          solana: {
            connectors: solanaConnectors,
          },
        },
      }}
    >
      <ConnectionProvider endpoint="https://api.devnet.solana.com">
        <WalletProvider wallets={wallets} autoConnect>
          <WalletModalProvider>
            <App />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </PrivyProvider>
  </StrictMode>,
)
