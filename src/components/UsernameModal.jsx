import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Check, AlertCircle } from 'lucide-react';
import { createProfile, checkUsernameAvailability } from '../dbServices';

const UsernameModal = ({ walletAddress, onComplete }) => {
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const trimmed = username.trim();
        if (!trimmed) {
            setError('Username cannot be empty');
            return;
        }
        if (trimmed.length > 12) {
            setError('Username must be 12 characters or less');
            return;
        }

        setLoading(true);
        try {
            // Check availability first
            const available = await checkUsernameAvailability(trimmed);
            if (!available) {
                setError('Username already in use. Please choose another one.');
                setLoading(false);
                return;
            }

            await createProfile(walletAddress, trimmed);
            onComplete(trimmed); // Pass username to App for state update
        } catch (err) {
            console.error("Full Save Error:", err);
            setError('Failed to save username. Check console for details.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="w-full max-w-md bg-black border border-white/10 rounded-2xl p-8 shadow-[0_0_50px_rgba(220,38,38,0.2)] relative overflow-hidden"
                >
                    {/* Background Glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div className="flex flex-col items-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-red-600/10 flex items-center justify-center mb-4 border border-red-600/20">
                            <User size={32} className="text-red-500" />
                        </div>
                        <h2 className="text-2xl font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                            Welcome Racer
                        </h2>
                        <p className="text-gray-400 text-sm mt-2 text-center">
                            Set your identifier for the leaderboards.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => {
                                    if (e.target.value.length <= 12) setUsername(e.target.value);
                                }}
                                placeholder="ENTER USERNAME"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:bg-white/10 transition-all font-bold text-center tracking-widest uppercase"
                                style={{ fontFamily: 'Rajdhani, sans-serif' }}
                                maxLength={12}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">
                                {username.length}/12
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center justify-center gap-2 text-red-500 text-xs font-bold uppercase tracking-wider bg-red-500/10 py-2 rounded-lg border border-red-500/20">
                                <AlertCircle size={14} />
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || !username.trim()}
                            className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-xl uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)]"
                            style={{ fontFamily: 'Orbitron, sans-serif' }}
                        >
                            {loading ? (
                                <span className="animate-pulse">Saving...</span>
                            ) : (
                                <>
                                    Confirm <Check size={18} />
                                </>
                            )}
                        </button>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default UsernameModal;
