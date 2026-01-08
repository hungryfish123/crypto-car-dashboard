import React from 'react';
import { usePrivy } from '@privy-io/react-auth';

export default function LoginButton({ onProfileClick }) {
    const { login, authenticated, user, logout } = usePrivy();
    const [isOpen, setIsOpen] = React.useState(false);

    if (authenticated) {
        const walletAddress = user?.wallet?.address;
        const shortAddress = walletAddress
            ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
            : 'Connected';

        return (
            <div className="relative" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
                <button
                    className={`px-4 py-2 bg-green-600/20 border border-green-500/30 text-green-400 hover:text-green-300 hover:border-green-400 text-sm font-bold uppercase tracking-wider transition-all flex items-center gap-2 w-full justify-between ${isOpen ? 'rounded-t-lg border-b-0' : 'rounded-lg'}`}
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                        {shortAddress}
                    </div>
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute top-full right-0 mt-0 w-full bg-black/90 border border-white/10 border-t-0 rounded-b-lg shadow-xl overflow-hidden backdrop-blur-xl z-50">
                        <div className="flex flex-col p-1">
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    if (onProfileClick) onProfileClick();
                                }}
                                className="px-4 py-3 text-left text-white/80 hover:text-white hover:bg-white/10 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors flex items-center gap-2"
                                style={{ fontFamily: 'Orbitron, sans-serif' }}
                            >
                                <img src="/user-icon.png" className="w-4 h-4 opacity-50" onError={(e) => e.target.style.display = 'none'} />
                                Profile
                            </button>
                            <div className="h-px bg-white/10 my-1 mx-2"></div>
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    logout();
                                }}
                                className="px-4 py-3 text-left text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                                style={{ fontFamily: 'Orbitron, sans-serif' }}
                            >
                                Disconnect
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <button
            onClick={login}
            className="group flex items-center gap-3 px-5 py-2.5 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-bold uppercase tracking-wider transition-all duration-300 min-w-[210px] justify-center"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
        >
            <div className="flex items-center gap-3 h-4">
                <img
                    src="/privy-logo.png"
                    alt="Privy"
                    className="h-full w-auto object-contain brightness-0 invert opacity-80 group-hover:opacity-100 transition-opacity"
                />
                <div className="w-px h-full bg-white/30"></div>
            </div>
            <span className="whitespace-nowrap tracking-widest text-[13px]">Connect Wallet</span>
        </button>
    );
}
