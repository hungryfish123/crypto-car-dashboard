import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock } from 'lucide-react';

const GaragePassModal = ({ isOpen, onClose }) => {
    const orbitronFont = { fontFamily: 'Orbitron, sans-serif' };

    // Dummy blurred items to show in the background
    const dummyItems = [1, 2, 3];

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
                        className="relative w-full max-w-2xl bg-black/80 border border-white/10 rounded-2xl p-8 overflow-hidden shadow-[0_0_50px_rgba(220,38,38,0.3)]"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>

                        {/* Centered Lock Message */}
                        <div className="relative z-20 flex flex-col items-center justify-center text-center py-12">
                            <div className="w-20 h-20 rounded-full bg-red-600/20 border border-red-500/50 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(220,38,38,0.4)]">
                                <Lock size={40} className="text-red-500" />
                            </div>
                            <h2 className="text-3xl font-bold text-white uppercase tracking-widest mb-2" style={orbitronFont}>
                                Garage Pass
                            </h2>
                            <p className="text-red-500 font-bold uppercase tracking-[0.2em] text-sm animate-pulse">
                                Coming Soon
                            </p>
                        </div>

                        {/* Blurred Background Content (Teaser) */}
                        <div className="absolute inset-0 z-10 opacity-30 pointer-events-none blur-sm flex items-center justify-center gap-4 p-8">
                            {dummyItems.map((item) => (
                                <div key={item} className="w-1/3 h-64 bg-neutral-900 border border-white/10 rounded-xl"></div>
                            ))}
                        </div>

                        {/* Decorative borders */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50"></div>
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-600 to-transparent opacity-50"></div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default GaragePassModal;
