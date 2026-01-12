import { PrivyProvider } from '@privy-io/react-auth'
import { toSolanaWalletConnectors } from '@privy-io/react-auth/solana'
import App from './App.jsx'

// Solana wallet connectors - initialized here to be part of the lazy chunk
const solanaConnectors = toSolanaWalletConnectors({
    shouldAutoConnect: true,
});

// This entire component is lazy loaded, deferring Privy bundle
export default function LazyApp() {
    return (
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
                    walletChainType: 'solana-only',
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
    );
}
