// BurnerWalletDashboard.jsx - Ephemeral Wallet UI Component
// Modern UI for managing a burner wallet with QR deposit and key export

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Wallet, Copy, Check, RefreshCw, AlertTriangle,
    Eye, EyeOff, QrCode, Trash2, Download, ExternalLink
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { useBurnerWallet } from '../hooks/useBurnerWallet';

const BurnerWalletDashboard = ({ rpcUrl }) => {
    const {
        walletAddress,
        balance,
        isLoading,
        error,
        refreshBalance,
        exportPrivateKey,
        resetWallet
    } = useBurnerWallet(rpcUrl);

    const [copied, setCopied] = useState(false);
    const [showPrivateKey, setShowPrivateKey] = useState(false);
    const [privateKey, setPrivateKey] = useState('');
    const [showQR, setShowQR] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Truncate address for display
    const truncatedAddress = walletAddress
        ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
        : '---';

    // Copy address to clipboard
    const copyAddress = () => {
        if (walletAddress) {
            navigator.clipboard.writeText(walletAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Reveal private key
    const handleRevealKey = () => {
        const key = exportPrivateKey();
        if (key) {
            setPrivateKey(key);
            setShowPrivateKey(true);
        }
    };

    // Hide private key
    const handleHideKey = () => {
        setShowPrivateKey(false);
        setPrivateKey('');
    };

    // Copy private key
    const copyPrivateKey = () => {
        navigator.clipboard.writeText(privateKey);
        alert('Private key copied to clipboard!');
    };

    // Refresh balance with loading state
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refreshBalance();
        setTimeout(() => setIsRefreshing(false), 500);
    };

    // Reset wallet with confirmation
    const handleReset = () => {
        if (confirmReset) {
            resetWallet();
            setConfirmReset(false);
            setShowPrivateKey(false);
            setPrivateKey('');
        } else {
            setConfirmReset(true);
            setTimeout(() => setConfirmReset(false), 5000);
        }
    };

    if (isLoading) {
        return (
            <div className="bg-black/40 border border-white/10 backdrop-blur-md rounded-2xl p-6 flex items-center justify-center">
                <div className="text-gray-400 animate-pulse">Initializing wallet...</div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/40 border border-white/10 backdrop-blur-md rounded-2xl p-6 flex flex-col space-y-5"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Wallet size={18} className="text-purple-500" />
                    </div>
                    <h3 className="text-white text-sm font-bold tracking-[0.15em] uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                        Ephemeral Wallet
                    </h3>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-green-400 text-[10px] uppercase font-bold tracking-wider">Active</span>
                </div>
            </div>

            {/* Address Section */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-2">Wallet Address</div>
                <div className="flex items-center justify-between">
                    <span className="text-white font-mono text-lg tracking-wide">{truncatedAddress}</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowQR(!showQR)}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                            title="Show QR Code"
                        >
                            <QrCode size={16} className="text-gray-400" />
                        </button>
                        <button
                            onClick={copyAddress}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                            title="Copy Address"
                        >
                            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-gray-400" />}
                        </button>
                        {walletAddress && (
                            <a
                                href={`https://solscan.io/account/${walletAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                                title="View on Solscan"
                            >
                                <ExternalLink size={16} className="text-gray-400" />
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {/* Balance Section */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">SOL Balance</span>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Refresh Balance"
                    >
                        <RefreshCw size={14} className={`text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                </div>
                <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    {balance.toFixed(4)} <span className="text-lg text-gray-500">SOL</span>
                </div>

                {balance === 0 && (
                    <div className="mt-3 flex items-center gap-2 text-yellow-400 text-xs">
                        <AlertTriangle size={14} />
                        <span>Low Balance. Deposit SOL to interact.</span>
                    </div>
                )}
            </div>

            {/* QR Code Deposit Section */}
            <AnimatePresence>
                {showQR && walletAddress && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-white/5 border border-white/10 rounded-xl p-4 overflow-hidden"
                    >
                        <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-3 text-center">
                            Scan to Deposit
                        </div>
                        <div className="flex justify-center bg-white p-3 rounded-lg">
                            <QRCode value={walletAddress} size={150} />
                        </div>
                        <p className="text-gray-500 text-[10px] text-center mt-3">
                            Send SOL to this address to fund your ephemeral wallet
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Danger Zone - Private Key */}
            <div className="border border-red-500/30 bg-red-500/5 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} className="text-red-400" />
                    <span className="text-red-400 text-[10px] uppercase font-bold tracking-widest">Danger Zone</span>
                </div>

                <AnimatePresence mode="wait">
                    {!showPrivateKey ? (
                        <motion.button
                            key="reveal"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleRevealKey}
                            className="w-full py-2.5 px-4 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-red-400 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                        >
                            <Eye size={14} />
                            Reveal Private Key
                        </motion.button>
                    ) : (
                        <motion.div
                            key="private-key"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-3"
                        >
                            <div className="bg-black/40 rounded-lg p-3 break-all">
                                <code className="text-red-300 text-[10px] font-mono">{privateKey}</code>
                            </div>
                            <p className="text-red-300/70 text-[10px] text-center">
                                ⚠️ If you clear your cache, this account is lost. Save this key!
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={copyPrivateKey}
                                    className="flex-1 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-lg text-red-400 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
                                >
                                    <Download size={12} />
                                    Copy Key
                                </button>
                                <button
                                    onClick={handleHideKey}
                                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-gray-400 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
                                >
                                    <EyeOff size={12} />
                                    Hide
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Reset Wallet Button */}
                <div className="mt-3 pt-3 border-t border-red-500/20">
                    <button
                        onClick={handleReset}
                        className={`w-full py-2 px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${confirmReset
                                ? 'bg-red-600 text-white animate-pulse'
                                : 'bg-transparent border border-red-500/30 text-red-400/60 hover:text-red-400 hover:border-red-500/50'
                            }`}
                    >
                        <Trash2 size={12} />
                        {confirmReset ? 'Click Again to Confirm Reset' : 'Reset Wallet'}
                    </button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="text-red-400 text-xs text-center bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                    {error}
                </div>
            )}
        </motion.div>
    );
};

export default BurnerWalletDashboard;
