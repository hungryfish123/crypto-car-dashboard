import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

/**
 * ClaimPopup Component
 * 
 * Shows toast notifications for claim transactions:
 * - Loading state
 * - Success with amount and Solscan link
 * - Error state (including cooldown messages)
 */
const ClaimPopup = ({
    isLoading = false,
    success = null,  // { amount, txSignature, recipientAddress }
    error = null,
    onClose
}) => {
    const isVisible = isLoading || success || error;

    // Auto-close success/error after 8 seconds
    React.useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => {
                if (onClose) onClose();
            }, 8000);
            return () => clearTimeout(timer);
        }
    }, [success, error, onClose]);

    const openSolscan = () => {
        if (success?.txSignature) {
            window.open(`https://solscan.io/tx/${success.txSignature}`, '_blank');
        }
    };

    const formatAddress = (addr) => {
        if (!addr) return '';
        return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[9998]"
                >
                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex items-center gap-3 px-6 py-4 bg-black/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                            <span
                                className="text-white font-bold uppercase tracking-wider text-sm"
                                style={{ fontFamily: 'Orbitron, sans-serif' }}
                            >
                                Transaction loading...
                            </span>
                        </div>
                    )}

                    {/* Success State */}
                    {success && !isLoading && (
                        <div
                            className="flex items-center gap-4 px-6 py-4 bg-green-900/90 backdrop-blur-xl border border-green-500/30 rounded-2xl shadow-2xl cursor-pointer hover:bg-green-900/95 transition-colors"
                            onClick={openSolscan}
                        >
                            <CheckCircle className="w-7 h-7 text-green-400 flex-shrink-0" />
                            <div className="flex flex-col">
                                <span
                                    className="text-white font-bold uppercase tracking-wider text-sm"
                                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                                >
                                    Sent {success.amount?.toFixed(4)} SOL
                                </span>
                                <span
                                    className="text-green-300/80 text-xs uppercase tracking-wider"
                                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                                >
                                    to {formatAddress(success.recipientAddress)}
                                </span>
                            </div>
                            <ExternalLink className="w-5 h-5 text-green-400 flex-shrink-0" />
                        </div>
                    )}

                    {/* Error State */}
                    {error && !isLoading && !success && (
                        <div
                            className="flex items-center gap-3 px-6 py-4 bg-red-900/90 backdrop-blur-xl border border-red-500/30 rounded-2xl shadow-2xl cursor-pointer"
                            onClick={onClose}
                        >
                            <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                            <span
                                className="text-white font-bold uppercase tracking-wider text-sm max-w-md"
                                style={{ fontFamily: 'Orbitron, sans-serif' }}
                            >
                                {error}
                            </span>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ClaimPopup;
