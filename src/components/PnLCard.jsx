import React, { useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Link2, ExternalLink } from 'lucide-react';
import html2canvas from 'html2canvas';

/**
 * Convert hex to HSL
 */
const hexToHsl = (hex) => {
    if (!hex || hex.length < 7) return { h: 0, s: 100, l: 50 };
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
            default: h = 0;
        }
    }
    return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

/**
 * Check if color is very dark (black or near-black)
 */
const isBlackish = (hex) => {
    if (!hex) return false;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return r < 40 && g < 40 && b < 40;
};

/**
 * P&L Card Modal Component
 */
const PnLCard = ({
    isOpen = false,
    onClose,
    username = "PLAYER",
    claimedAmount = 0.000,
    txSignature = null,
    referralCode = "PLAYER",
    carColor = "#dc2626"
}) => {
    const cardRef = useRef(null);
    const referralLink = `https://gear.fun?ref=${referralCode}`;

    // Calculate CSS filter and button color
    // Use the exact same HSL values as the paint shop does
    const { cardFilter, buttonColor, textColor } = useMemo(() => {
        // Handle black -> grey
        if (isBlackish(carColor)) {
            return {
                cardFilter: 'grayscale(0.8) brightness(0.6)',
                buttonColor: '#666666',
                textColor: '#888888'
            };
        }

        // Base red colors from P&L card design
        const baseRedHue = 0; // Red hue

        // Get target color's HSL
        const targetHsl = hexToHsl(carColor);

        // If already red-ish (hue 0-20 or 340-360), no rotation needed
        if (targetHsl.h <= 20 || targetHsl.h >= 340) {
            return {
                cardFilter: 'none',
                buttonColor: carColor,
                textColor: carColor
            };
        }

        // Calculate hue rotation from red to target
        const hueRotate = targetHsl.h - baseRedHue;

        // Apply the same saturation and lightness adjustments
        // Normalize saturation (100 is default, adjust based on target)
        const satAdjust = targetHsl.s / 100;

        return {
            cardFilter: `hue-rotate(${hueRotate}deg) saturate(${satAdjust})`,
            buttonColor: carColor,
            textColor: carColor
        };
    }, [carColor]);

    const handleDownload = async () => {
        if (!cardRef.current) return;

        try {
            const canvas = await html2canvas(cardRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: null
            });

            const link = document.createElement('a');
            link.download = `gear-pnl-${username.toLowerCase()}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('Failed to download card:', err);
            alert('Failed to download. Please try again.');
        }
    };

    const handleShareLink = () => {
        navigator.clipboard.writeText(referralLink);
        alert('Referral link copied!');
    };

    const handleShareOnX = () => {
        const text = encodeURIComponent(`I just claimed ${claimedAmount.toFixed(3)} SOL on @geardotfun\n\nJoin with my referral code: ${referralCode}`);
        const url = encodeURIComponent(referralLink);
        window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    };

    const handleOpenSolscan = () => {
        if (txSignature) {
            window.open(`https://solscan.io/tx/${txSignature}`, '_blank');
        } else {
            alert('Transaction hash unavailable');
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute -top-4 -right-4 z-10 w-12 h-12 rounded-full flex items-center justify-center transition-opacity shadow-lg hover:opacity-80"
                            style={{ backgroundColor: buttonColor }}
                        >
                            <X size={26} strokeWidth={3} className="text-white" />
                        </button>

                        {/* P&L Card with CSS filter to match car color */}
                        <div
                            className="pnl-card"
                            ref={cardRef}
                            style={{ filter: cardFilter }}
                        >
                            <img
                                src="/pnl-background.jpg"
                                alt="P&L Card Background"
                                className="pnl-background"
                            />

                            <div className="pnl-overlay">
                                <div className="pnl-username">{username}</div>

                                <div className="pnl-claimed-section">
                                    <div className="pnl-claimed-label">CLAIMED:</div>
                                    <div className="pnl-claimed-amount">
                                        <span className="pnl-amount">{claimedAmount.toFixed(3)}</span>
                                        <span className="pnl-currency">SOL</span>
                                    </div>
                                </div>

                                <div className="pnl-referral-section">
                                    <div className="pnl-referral-label">SIGN UP WITH:</div>
                                    <div className="pnl-referral-code">{referralCode}</div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons - Flat solid colors, no gradients */}
                        <div className="flex gap-3 mt-4 justify-center">
                            <button
                                onClick={handleDownload}
                                className="flex items-center gap-2 px-5 py-3 rounded-lg text-white font-bold transition-opacity hover:opacity-80"
                                style={{
                                    backgroundColor: buttonColor,
                                    fontFamily: 'Orbitron, sans-serif',
                                    backgroundImage: 'none'
                                }}
                            >
                                <Download size={18} />
                                Download
                            </button>

                            <button
                                onClick={handleShareLink}
                                className="flex items-center gap-2 px-5 py-3 rounded-lg text-white font-bold transition-opacity hover:opacity-80"
                                style={{
                                    backgroundColor: 'rgba(255,255,255,0.1)',
                                    fontFamily: 'Orbitron, sans-serif',
                                    backgroundImage: 'none'
                                }}
                            >
                                <Link2 size={18} />
                                Copy Link
                            </button>

                            <button
                                onClick={handleShareOnX}
                                className="flex items-center gap-2 px-5 py-3 rounded-lg text-white font-bold transition-opacity hover:opacity-80"
                                style={{
                                    backgroundColor: '#000000',
                                    border: '1px solid rgba(255,255,255,0.2)',
                                    fontFamily: 'Orbitron, sans-serif',
                                    backgroundImage: 'none'
                                }}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                </svg>
                                Share
                            </button>

                            {txSignature && (
                                <button
                                    onClick={handleOpenSolscan}
                                    className="flex items-center gap-2 px-5 py-3 rounded-lg text-white font-bold transition-opacity hover:opacity-80"
                                    style={{
                                        backgroundColor: '#1C1C1C', // Dark grey for Solscan
                                        border: '1px solid rgba(255,255,255,0.2)',
                                        fontFamily: 'Orbitron, sans-serif',
                                        backgroundImage: 'none'
                                    }}
                                >
                                    <ExternalLink size={18} />
                                    SolScan
                                </button>
                            )}
                        </div>
                    </motion.div>

                    <style>{`
                        .pnl-card {
                            position: relative;
                            width: 800px;
                            height: 566px;
                            overflow: hidden;
                            font-family: 'Orbitron', sans-serif;
                            border-radius: 16px;
                            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
                        }

                        .pnl-background {
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            object-fit: cover;
                        }

                        .pnl-overlay {
                            position: absolute;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            padding: 32px 40px;
                            display: flex;
                            flex-direction: column;
                        }

                        .pnl-username {
                            font-size: 22px;
                            font-weight: 700;
                            color: #9a9a9a;
                            text-transform: uppercase;
                            letter-spacing: 2px;
                        }

                        .pnl-claimed-section {
                            position: absolute;
                            top: 50%;
                            left: 40px;
                            transform: translateY(-50%);
                        }

                        .pnl-claimed-label {
                            font-size: 44px;
                            font-weight: 700;
                            color: #ffffff;
                            text-transform: uppercase;
                            letter-spacing: 2px;
                            margin-bottom: 0;
                            line-height: 1.1;
                        }

                        .pnl-claimed-amount {
                            display: flex;
                            align-items: baseline;
                            gap: 8px;
                            margin-top: 0;
                        }

                        .pnl-amount {
                            font-size: 52px;
                            font-weight: 700;
                            color: #e31b23;
                            letter-spacing: 3px;
                            line-height: 1.1;
                        }

                        .pnl-currency {
                            font-size: 18px;
                            font-weight: 700;
                            color: #888888;
                            text-transform: uppercase;
                        }

                        .pnl-referral-section {
                            position: absolute;
                            bottom: 32px;
                            left: 40px;
                        }

                        .pnl-referral-label {
                            font-size: 20px;
                            font-weight: 700;
                            color: #ffffff;
                            text-transform: uppercase;
                            letter-spacing: 2px;
                            margin-bottom: 2px;
                            line-height: 1.2;
                        }

                        .pnl-referral-code {
                            font-size: 22px;
                            font-weight: 700;
                            color: #e31b23;
                            text-transform: uppercase;
                            letter-spacing: 2px;
                            line-height: 1.2;
                        }
                    `}</style>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PnLCard;
