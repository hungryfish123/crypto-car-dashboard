import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Check, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { claimBurnReward } from '../services/burnService';

const ManualBurnVerification = ({ walletAddress, onRewardClaimed }) => {
    const [signature, setSignature] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');
    const [reward, setReward] = useState(0);

    const handleVerify = async () => {
        if (!signature.trim()) {
            setStatus('error');
            setMessage('Please enter a transaction ID');
            return;
        }

        if (!walletAddress) {
            setStatus('error');
            setMessage('Please connect your wallet first');
            return;
        }

        setStatus('loading');
        setMessage('Verifying burn transaction...');

        try {
            const result = await claimBurnReward(signature.trim(), walletAddress);

            if (result.success) {
                setStatus('success');
                setMessage(`Successfully verified! You burned ${result.amountBurned} tokens.`);
                setReward(result.reward);

                // Callback to update parent state
                if (onRewardClaimed) {
                    onRewardClaimed(result.reward);
                }
            } else {
                setStatus('error');
                setMessage(result.error || 'Verification failed');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Network error. Please try again.');
        }
    };

    const resetForm = () => {
        setSignature('');
        setStatus('idle');
        setMessage('');
        setReward(0);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/40 border border-white/10 backdrop-blur-md rounded-2xl p-6 flex flex-col"
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Flame size={18} className="text-orange-500" />
                </div>
                <h3 className="text-white text-sm font-bold tracking-[0.2em] uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    Burn Verification
                </h3>
            </div>

            <p className="text-gray-400 text-xs mb-4">
                Burn tokens using <a href="https://sol-incinerator.com" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline">Sol Incinerator</a> and paste the transaction ID below to claim rewards.
            </p>

            {/* Input Area */}
            <div className="space-y-3">
                <div className="relative">
                    <input
                        type="text"
                        value={signature}
                        onChange={(e) => setSignature(e.target.value)}
                        placeholder="Paste Sol Incinerator Transaction ID..."
                        disabled={status === 'loading' || status === 'success'}
                        className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-xs 
                                   placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50 
                                   disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    />
                    {signature && status === 'idle' && (
                        <a
                            href={`https://solscan.io/tx/${signature}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-400 transition-colors"
                            title="View on Solscan"
                        >
                            <ExternalLink size={14} />
                        </a>
                    )}
                </div>

                {/* Verify Button */}
                {status !== 'success' && (
                    <button
                        onClick={handleVerify}
                        disabled={status === 'loading' || !signature.trim()}
                        className={`w-full py-3 px-4 rounded-xl font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all
                            ${status === 'loading' || !signature.trim()
                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-orange-600 to-red-600 text-white hover:shadow-[0_0_20px_rgba(234,88,12,0.4)]'
                            }`}
                        style={{ fontFamily: 'Rajdhani, sans-serif' }}
                    >
                        {status === 'loading' ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            <>
                                <Flame size={18} />
                                Verify Burn
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Status Messages */}
            <AnimatePresence mode="wait">
                {status === 'success' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-xl"
                    >
                        <div className="flex items-center gap-2 text-green-400 mb-2">
                            <Check size={18} />
                            <span className="font-bold uppercase text-sm tracking-wider" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                                Burn Verified!
                            </span>
                        </div>
                        <p className="text-green-300/80 text-xs mb-3">{message}</p>
                        <div className="flex items-center justify-between">
                            <div className="text-2xl font-bold text-green-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                                +{reward.toLocaleString()} CR
                            </div>
                            <button
                                onClick={resetForm}
                                className="text-xs text-gray-400 hover:text-white underline transition-colors"
                            >
                                Verify Another
                            </button>
                        </div>
                    </motion.div>
                )}

                {status === 'error' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl"
                    >
                        <div className="flex items-center gap-2 text-red-400">
                            <AlertCircle size={18} />
                            <span className="font-bold uppercase text-sm tracking-wider" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                                Verification Failed
                            </span>
                        </div>
                        <p className="text-red-300/80 text-xs mt-1">{message}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Info Footer */}
            <div className="mt-4 pt-4 border-t border-white/5">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest">
                    Each transaction can only be claimed once
                </p>
            </div>
        </motion.div>
    );
};

export default ManualBurnVerification;
