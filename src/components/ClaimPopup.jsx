import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ExternalLink } from 'lucide-react';

/**
 * ClaimPopup Component
 * 
 * Glassmorphism toast notification - clean white Orbitron text
 * Centered on screen, fades out after a few seconds
 */
const ClaimPopup = ({
    isLoading = false,
    success = null,  // { amount, txSignature, recipientAddress }
    error = null,
    onClose
}) => {
    const isVisible = isLoading || success || error;

    // Auto-close success/error after 5 seconds
    React.useEffect(() => {
        if (success || error) {
            const timer = setTimeout(() => {
                if (onClose) onClose();
            }, 5000);
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
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="fixed top-20 left-1/2 -translate-x-1/2 z-[9998]"
                >
                    {/* Glassmorphism container - less rounded to match buttons */}
                    <div
                        className="px-6 py-4 rounded-lg cursor-pointer pointer-events-auto"
                        style={{
                            background: 'rgba(0, 0, 0, 0.8)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                        }}
                        onClick={success ? openSolscan : onClose}
                    >
                        <div className="flex items-center gap-3">
                            {/* Loading spinner */}
                            {isLoading && (
                                <Loader2 className="w-5 h-5 text-white animate-spin" />
                            )}

                            {/* Success external link icon */}
                            {success && !isLoading && (
                                <ExternalLink className="w-5 h-5 text-white/70" />
                            )}

                            {/* Text content */}
                            <div className="flex flex-col">
                                {isLoading && (
                                    <span
                                        className="text-white text-sm uppercase tracking-wider"
                                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                                    >
                                        Transaction loading...
                                    </span>
                                )}

                                {success && !isLoading && (
                                    <>
                                        <span
                                            className="text-white text-sm uppercase tracking-wider"
                                            style={{ fontFamily: 'Orbitron, sans-serif' }}
                                        >
                                            Sent {success.amount?.toFixed(4)} SOL
                                        </span>
                                        <span
                                            className="text-white/60 text-xs uppercase tracking-wider"
                                            style={{ fontFamily: 'Orbitron, sans-serif' }}
                                        >
                                            to {formatAddress(success.recipientAddress)}
                                        </span>
                                    </>
                                )}

                                {error && !isLoading && !success && (
                                    <span
                                        className="text-white text-sm uppercase tracking-wider max-w-md"
                                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                                    >
                                        {error}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ClaimPopup;

