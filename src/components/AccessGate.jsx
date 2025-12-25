import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, ArrowRight, AlertCircle } from 'lucide-react';

const AccessGate = ({ onUnlock, correctCode = ["SUSKO", "MAURO"] }) => {
    const [inputCode, setInputCode] = useState('');
    const [error, setError] = useState(false);
    const [isUnlocked, setIsUnlocked] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        const normalizedInput = inputCode.toUpperCase().trim();
        const isCorrect = Array.isArray(correctCode)
            ? correctCode.includes(normalizedInput)
            : normalizedInput === correctCode;

        if (isCorrect) {
            setIsUnlocked(true);
            // Wait for exit animation
            setTimeout(() => {
                onUnlock();
            }, 800);
        } else {
            setError(true);
            setInputCode('');
            setTimeout(() => setError(false), 2000);
        }
    };

    return (
        <AnimatePresence>
            {!isUnlocked && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 0.8, ease: "easeInOut" } }}
                    className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black"
                >
                    {/* Background Video */}
                    <div className="absolute inset-0 w-full h-full">
                        <div className="absolute inset-0 bg-black/60 z-10 backdrop-blur-[2px]" />
                        <video
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="w-full h-full object-cover"
                        >
                            <source src="/backgrounds/access_bg.mp4" type="video/mp4" />
                        </video>
                    </div>

                    {/* Content Container */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="relative z-20 w-full max-w-md p-8 mx-4"
                    >
                        {/* Header / Logo Area */}
                        <div className="text-center mb-8">
                            <motion.div
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="inline-flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-red-600/20 border border-red-500/50 backdrop-blur-md"
                            >
                                <Lock className="w-8 h-8 text-red-500" />
                            </motion.div>
                            <h1 className="text-4xl font-bold text-white mb-2 font-['Orbitron'] tracking-wider">
                                RESTRICTED ACCESS
                            </h1>
                            <p className="text-gray-400 text-sm tracking-[0.2em] uppercase">
                                Authorized Personnel Only
                            </p>
                        </div>

                        {/* Input Form */}
                        <form onSubmit={handleSubmit} className="relative group">
                            <div
                                className={`
                  relative overflow-hidden rounded-xl border transition-all duration-300
                  ${error
                                        ? 'border-red-500 bg-red-950/30'
                                        : 'border-white/10 bg-black/40 hover:border-white/20 focus-within:border-red-500/50 focus-within:bg-black/60'
                                    }
                  backdrop-blur-xl
                `}
                            >
                                <input
                                    type="text"
                                    value={inputCode}
                                    onChange={(e) => {
                                        setInputCode(e.target.value);
                                        if (error) setError(false);
                                    }}
                                    className="w-full bg-transparent px-6 py-4 text-white placeholder-gray-500 outline-none text-center text-lg tracking-[0.2em] font-['Rajdhani'] uppercase"
                                    placeholder="ENTER ACCESS CODE"
                                    autoFocus
                                    spellCheck="false"
                                    autoComplete="off"
                                />

                                {/* Error Shake Effect Overlay */}
                                {error && (
                                    <motion.div
                                        initial={{ x: -10, opacity: 0 }}
                                        animate={{ x: [0, -10, 10, -10, 10, 0], opacity: 1 }}
                                        transition={{ duration: 0.4 }}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500"
                                    >
                                        <AlertCircle size={20} />
                                    </motion.div>
                                )}
                            </div>

                            {/* Submit Button */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                type="submit"
                                className="mt-6 w-full group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-red-600 to-red-800 px-6 py-4 text-white font-bold tracking-wider transition-all hover:brightness-110 active:brightness-90"
                            >
                                <span className="relative z-10 font-['Orbitron']">AUTHENTICATE</span>
                                <ArrowRight className="relative z-10 w-5 h-5 transition-transform group-hover:translate-x-1" />

                                {/* Button Glow Effect */}
                                <div className="absolute inset-0 -z-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:animate-[shimmer_1.5s_infinite]" />
                            </motion.button>

                            {/* Error Message Text */}
                            <AnimatePresence>
                                {error && (
                                    <motion.p
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute -bottom-8 left-0 right-0 text-center text-red-500 text-sm font-medium tracking-wide"
                                    >
                                        ACCESS DENIED: INVALID CODE
                                    </motion.p>
                                )}
                            </AnimatePresence>
                        </form>

                        {/* Decorative Elements */}
                        <div className="absolute -top-4 -left-4 w-8 h-8 border-t-2 border-l-2 border-white/20 rounded-tl-lg" />
                        <div className="absolute -bottom-4 -right-4 w-8 h-8 border-b-2 border-r-2 border-white/20 rounded-br-lg" />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default AccessGate;
