import React from 'react';
import { usePrivy } from '@privy-io/react-auth';

export default function LoginButton() {
    const { login, authenticated, user, logout } = usePrivy();

    if (authenticated) {
        const walletAddress = user?.wallet?.address;
        const shortAddress = walletAddress
            ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
            : 'Connected';

        return (
            <div className="flex items-center gap-3">
                <div
                    className="px-4 py-2 bg-green-600/20 border border-green-500/30 rounded-lg text-green-400 text-sm font-bold uppercase tracking-wider"
                    style={{ fontFamily: 'Rajdhani, sans-serif' }}
                >
                    {shortAddress}
                </div>
                <button
                    onClick={logout}
                    className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700 border border-white/10 rounded-lg text-gray-300 hover:text-white text-sm font-bold uppercase tracking-wider transition-all"
                    style={{ fontFamily: 'Rajdhani, sans-serif' }}
                >
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={login}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 rounded-lg text-white text-sm font-bold uppercase tracking-wider shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.6)] transition-all duration-300 border border-red-400/30"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
        >
            🔗 Connect Wallet
        </button>
    );
}
