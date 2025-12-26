import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrivyProvider } from '@privy-io/react-auth'
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana'

import './index.css'
import App from './App.jsx'

// Solana wallet connectors
const solanaConnectors = toSolanaWalletConnectors({
  shouldAutoConnect: true,
});

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
      <App />
    </PrivyProvider>
  </StrictMode>,
)
