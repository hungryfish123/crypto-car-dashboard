import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, User } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { usePrivy } from '@privy-io/react-auth';
import InteractiveLogo from './InteractiveLogo';
import LoginButton from './LoginButton';

const Leaderboard = ({ onBack, onProfileClick }) => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = usePrivy();
    const currentWallet = user?.wallet?.address;

    useEffect(() => {
        fetchLeaderboard();
    }, []);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('leaderboard_view')
                .select('*');

            if (error) {
                console.error('[Leaderboard] Error fetching:', error);
            } else {
                setLeaderboard(data || []);
            }
        } catch (err) {
            console.error('[Leaderboard] Fetch failed:', err);
        } finally {
            setLoading(false);
        }
    };

    // Shorten wallet address
    const shortenAddress = (address) => {
        if (!address) return 'Unknown';
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    };

    // Format SOL amount
    const formatSol = (amount) => {
        const num = parseFloat(amount) || 0;
        return num.toFixed(4);
    };

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const rowVariants = {
        hidden: { opacity: 0, x: -20 },
        show: { opacity: 1, x: 0 }
    };

    // Skeleton loader
    const SkeletonRow = () => (
        <div className="flex items-center gap-4 p-4 bg-black/40 rounded-xl border border-white/5 animate-pulse">
            <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
            <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
            <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-700 rounded w-24"></div>
            </div>
            <div className="h-4 bg-gray-700 rounded w-20"></div>
        </div>
    );

    // Empty state row
    const EmptyRow = ({ rank }) => (
        <div className="grid grid-cols-12 gap-4 items-center p-4 rounded-xl border border-white/5 bg-black/20 opacity-40">
            <div className="col-span-1 text-xl font-bold text-gray-600" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                #{rank}
            </div>
            <div className="col-span-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-800 border border-white/5 flex items-center justify-center">
                    <User size={18} className="text-gray-600" />
                </div>
                <p className="text-gray-600 font-bold text-sm uppercase tracking-wider" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    —
                </p>
            </div>
            <div className="col-span-2 text-center text-gray-600">—</div>
            <div className="col-span-2 text-center text-gray-600">—</div>
            <div className="col-span-3 text-right text-gray-600">— SOL</div>
        </div>
    );

    return (
        <div className="flex flex-col h-full w-full relative overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between h-20 px-8 z-10 w-full bg-black/60 backdrop-blur-md border-b border-white/10 relative">
                {/* Left: Back + Logo */}
                <div className="flex items-center gap-6">
                    <button
                        onClick={onBack}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} className="text-gray-400 hover:text-white" />
                    </button>
                    <div className="scale-75 origin-left">
                        <InteractiveLogo />
                    </div>
                </div>

                {/* Center: Title */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <h1
                        className="text-2xl font-bold uppercase tracking-[0.3em] text-white"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        LEADERBOARD
                    </h1>
                </div>

                {/* Right: Wallet */}
                <div className="flex items-center gap-4">
                    <LoginButton onProfileClick={onProfileClick} />
                </div>
            </div>

            {/* Main Content - Wider container */}
            <div className="flex-1 overflow-y-auto w-full max-w-6xl mx-auto custom-scrollbar px-8 py-8">
                {/* Column Headers */}
                <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs text-red-500 uppercase tracking-widest font-bold mb-4 border-b border-white/10" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    <div className="col-span-1">Rank</div>
                    <div className="col-span-4">Player</div>
                    <div className="col-span-2 text-center">Cars</div>
                    <div className="col-span-2 text-center">Parts</div>
                    <div className="col-span-3 text-right">Fees Earned</div>
                </div>

                {loading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 10 }).map((_, i) => (
                            <SkeletonRow key={i} />
                        ))}
                    </div>
                ) : (
                    <motion.div
                        className="space-y-3"
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                    >
                        {(() => {
                            const rows = [];
                            const totalSlots = 20;

                            // Real users
                            leaderboard.forEach((player, index) => {
                                const rank = index + 1;
                                const isCurrentUser = currentWallet && player.user_wallet.toLowerCase() === currentWallet.toLowerCase();
                                const displayName = player.username || shortenAddress(player.user_wallet);
                                const feesEarned = parseFloat(player.fees_earned) || 0;
                                const carsCount = player.cars_count || 1; // Default 1 (BMW starter)
                                const partsCount = player.parts_count || 0;

                                rows.push(
                                    <motion.div
                                        key={player.user_wallet}
                                        variants={rowVariants}
                                        className={`grid grid-cols-12 gap-4 items-center p-4 rounded-xl border transition-all duration-300 
                                            ${rank === 1 ? 'bg-red-500/10 border-red-500/30' :
                                                rank <= 3 ? 'bg-gray-500/10 border-gray-500/30' :
                                                    'bg-black/40 backdrop-blur-sm border-white/5'} 
                                            ${isCurrentUser ? 'ring-2 ring-white/50' : ''} 
                                            hover:bg-white/5`}
                                    >
                                        {/* Rank */}
                                        <div
                                            className={`col-span-1 text-2xl font-bold ${rank === 1 ? 'text-red-500' :
                                                rank <= 3 ? 'text-gray-400' :
                                                    'text-gray-500'
                                                }`}
                                            style={{ fontFamily: 'Orbitron, sans-serif' }}
                                        >
                                            #{rank}
                                        </div>

                                        {/* Player with Avatar */}
                                        <div className="col-span-4 flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {player.avatar_url ? (
                                                    <img
                                                        src={player.avatar_url}
                                                        alt={displayName}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <User size={20} className="text-gray-500" />
                                                )}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-white font-bold text-base uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                                                        {displayName}
                                                    </p>
                                                    {/* X Profile Link - Inline with name */}
                                                    {player.x_profile && (
                                                        <a
                                                            href={`https://x.com/${player.x_profile}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="hover:opacity-70 transition-opacity"
                                                        >
                                                            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                                            </svg>
                                                        </a>
                                                    )}
                                                </div>
                                                {isCurrentUser && (
                                                    <span className="text-[10px] text-white uppercase tracking-widest" style={{ fontFamily: 'Orbitron, sans-serif' }}>You</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Cars Count */}
                                        <div className="col-span-2 text-center">
                                            <span className="text-white font-bold text-lg" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                                                {carsCount}
                                            </span>
                                        </div>

                                        {/* Parts Count */}
                                        <div className="col-span-2 text-center">
                                            <span className="text-white font-bold text-lg" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                                                {partsCount}
                                            </span>
                                        </div>

                                        {/* Fees Earned */}
                                        <div className="col-span-3 text-right">
                                            <p
                                                className={`text-lg font-bold ${rank === 1 ? 'text-red-500' : 'text-white'}`}
                                                style={{ fontFamily: 'Orbitron, sans-serif' }}
                                            >
                                                {formatSol(feesEarned)} SOL
                                            </p>
                                        </div>
                                    </motion.div>
                                );
                            });

                            // Fill remaining slots with empty rows
                            for (let i = leaderboard.length; i < totalSlots; i++) {
                                rows.push(<EmptyRow key={`empty-${i}`} rank={i + 1} />);
                            }

                            return rows;
                        })()}
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default Leaderboard;
