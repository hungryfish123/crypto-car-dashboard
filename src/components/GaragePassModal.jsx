import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock } from 'lucide-react';
import GarageCountdown from './GarageCountdown';

const GaragePassModal = ({ isOpen, onClose, carColor = '#dc2626' }) => {
    const orbitronFont = { fontFamily: 'Orbitron, sans-serif' };

    // Dummy blurred items to show in the background
    const dummyItems = [1, 2, 3];

    // Helper to convert hex to rgba
    const hexToRgba = (hex, alpha) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Color Logic (Matching Race Mode)
    let displayThemeColor = carColor || '#dc2626';
    if (displayThemeColor === '#000000' || displayThemeColor === '#000') displayThemeColor = '#9ca3af';
    if (displayThemeColor === '#ffffff' || displayThemeColor === '#fff') displayThemeColor = '#ffffff';

    const glowColor = displayThemeColor;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop with blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative w-full max-w-2xl p-8 overflow-hidden border rounded-[3rem]"
                        style={{
                            background: 'rgba(0, 0, 0, 0.6)',
                            backdropFilter: 'blur(40px)',
                            WebkitBackdropFilter: 'blur(40px)',
                            borderColor: `${displayThemeColor}30`,
                            boxShadow: 'none'
                        }}
                    >
                        {/* Dynamic Background Gradient */}
                        <div
                            className="absolute inset-0 opacity-10 pointer-events-none"
                            style={{
                                background: `linear-gradient(180deg, ${displayThemeColor}20 0%, transparent 100%)`
                            }}
                        ></div>
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>

                        {/* Centered Lock Message */}
                        <div className="relative z-20 flex flex-col items-center justify-center text-center py-12">
                            <div
                                className="w-20 h-20 rounded-full flex items-center justify-center mb-6"
                                style={{
                                    backgroundColor: hexToRgba(glowColor, 0.2),
                                    border: `1px solid ${hexToRgba(glowColor, 0.5)}`,
                                    boxShadow: `0 0 30px ${hexToRgba(glowColor, 0.4)}`
                                }}
                            >
                                <Lock size={40} style={{ color: glowColor }} />
                            </div>
                            <h2 className="text-3xl font-bold uppercase tracking-widest mb-4 transition-colors" style={{ ...orbitronFont, color: glowColor }}>
                                Garage Pass
                            </h2>
                            <div>
                                <GarageCountdown showLabel={false} size="text-xl md:text-2xl" align="items-center" />
                            </div>
                        </div>

                        {/* Blurred Background Content (Teaser) */}
                        <div className="absolute inset-0 z-10 opacity-30 pointer-events-none blur-sm flex items-center justify-center gap-4 p-8">
                            {dummyItems.map((item) => (
                                <div key={item} className="w-1/3 h-64 bg-neutral-900 border border-white/10 rounded-xl"></div>
                            ))}
                        </div>

                        {/* Decorative borders */}
                        <div
                            className="absolute top-0 left-0 w-full h-1 opacity-50"
                            style={{ background: `linear-gradient(to right, transparent, ${glowColor}, transparent)` }}
                        ></div>
                        <div
                            className="absolute bottom-0 left-0 w-full h-1 opacity-50"
                            style={{ background: `linear-gradient(to right, transparent, ${glowColor}, transparent)` }}
                        ></div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default GaragePassModal;
