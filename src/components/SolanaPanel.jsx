import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Wallet, Activity, Gauge, Zap, Weight, Award } from 'lucide-react';
import { useSolanaToken } from '../hooks/useSolanaToken';
import { useUserRewards } from '../hooks/useUserRewards'; // Keeping for claimableSol (fees)
import { useAudio } from '../hooks/useAudio';
import { usePrivy } from '@privy-io/react-auth';
import confetti from 'canvas-confetti';
import PnLCard from './PnLCard';
import ClaimPopup from './ClaimPopup'; // New popup component
import { supabase } from '../supabaseClient';

// Constants for yield weights (must match DB/marketplaceItems.js)
const YIELD_WEIGHTS = {
    // Engines
    'eng_lv1': 1, 'eng_lv2': 2, 'eng_lv3': 4, 'eng_lv4': 8, 'eng_lv5': 16,
    // Turbos
    'turbo_lv1': 1, 'turbo_lv2': 2, 'turbo_lv3': 4, 'turbo_lv4': 8, 'turbo_lv5': 16,
    // Suspensions
    'susp_lv1': 1, 'susp_lv2': 2, 'susp_lv3': 4, 'susp_lv4': 8, 'susp_lv5': 16,
    'sus_lv1': 1, 'sus_lv2': 2, 'sus_lv3': 4, 'sus_lv4': 8, 'sus_lv5': 16, // Old mapping
    // Wheels
    'wheel_lv1': 1, 'wheel_lv2': 2, 'wheel_lv3': 4, 'wheel_lv4': 8, 'wheel_lv5': 16,
    'wheels_lv1': 1, 'wheels_lv2': 2, 'wheels_lv3': 4, 'wheels_lv4': 8, 'wheels_lv5': 16, // Old mapping
    // Special
    'special_seat': 33, 'special_brakes': 33, 'special_nitro': 33,
    'special_rainbow': 33, // Backward compatibility
    // Cars
    'vw_golf_gti_mk2': 20, 'audi_sport_quattro': 20,
    'mazda_mx5_na': 20, 'ferrari_f40': 20, 'lamborghini_huracan_2015': 20
};

const SimpleLineChart = ({ data, isPositive, color }) => {
    if (!data || !data.points || data.points.length < 2) return null;

    const points = data.points;
    const prices = points.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const range = maxPrice - minPrice || 1;

    // SVG dimensions
    const width = 250;
    const height = 100;
    const padding = 5;

    // Calculate path points
    const pathPoints = points.map((p, i) => {
        const x = (i / (points.length - 1)) * width;
        const normalizedY = (p.price - minPrice) / range;
        const y = height - (normalizedY * (height - (padding * 2))) - padding;
        return `${x},${y}`;
    }).join(' ');

    // Dynamic color from prop, default to red
    let strokeColor = color || '#ef4444';

    // Fix: If car color is black, use gray for the chart so it's visible against the dark background
    if (strokeColor.toLowerCase() === '#000000' || strokeColor.toLowerCase() === '#000' || strokeColor.toLowerCase() === '#1a1a1a') {
        strokeColor = '#9ca3af'; // gray-400
    }

    // Use 8-digit hex for glow transparency (approx 60%) or fallback
    const glowColor = strokeColor.startsWith('#') ? `${strokeColor}99` : strokeColor;

    return (
        <div className="w-full mt-3 relative">
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
                {/* Futuristic Gradient Fill */}
                <defs>
                    <linearGradient id="chartGradientRed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={strokeColor} stopOpacity="0.4" />
                        <stop offset="50%" stopColor={strokeColor} stopOpacity="0.1" />
                        <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                        <feMerge>
                            <feMergeNode in="coloredBlur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                </defs>
                {/* Fill Area */}
                <path
                    d={`M 0,${height} L 0,${points[0] ? height - ((points[0].price - minPrice) / range * (height - 10)) - 5 : 0} ${pathPoints} L ${width},${height} Z`}
                    fill="url(#chartGradientRed)"
                    stroke="none"
                />
                {/* Main Line with Glow */}
                <path
                    d={`M ${pathPoints}`}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    filter="url(#glow)"
                    style={{ filter: `drop-shadow(0 0 6px ${glowColor})` }}
                />
                {/* End Point Dot */}
                {points.length > 0 && (() => {
                    const lastPoint = points[points.length - 1];
                    const x = width;
                    const y = height - ((lastPoint.price - minPrice) / range * (height - 10)) - 5;
                    return (
                        <circle cx={x} cy={y} r="4" fill={strokeColor} style={{ filter: `drop-shadow(0 0 8px ${glowColor})` }}>
                            <animate attributeName="r" values="4;6;4" dur="1.5s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="1;0.6;1" dur="1.5s" repeatCount="indefinite" />
                        </circle>
                    );
                })()}
            </svg>
            <div className="flex justify-between text-[8px] text-gray-500 font-mono mt-1 px-1">
                <span>-24h</span>
                <span className="text-red-400">Now</span>
            </div>
        </div>
    );
};

// Reusable Street League Stat Bar
const StatBar = ({ label, value, max, inverse = false }) => {
    // Parse numeric value
    const numValue = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;

    // Calculate percentage
    let percentage;

    if (inverse) {
        // For acceleration: constant scale 0-15 seconds
        // 15s = 0% (slowest), 0s = 100% (instant)
        const maxSlow = 15; // 15 seconds = barely any bar
        const minFast = 0;  // 0 seconds = full bar
        percentage = Math.max(0, Math.min(100, ((maxSlow - numValue) / (maxSlow - minFast)) * 100));
    } else {
        percentage = Math.max(0, Math.min(100, (numValue / max) * 100));
    }

    // Check if bar is full (100%)
    const isFull = percentage >= 99;

    return (
        <div className="mb-4 last:mb-0">
            <div className="flex justify-between items-end mb-2">
                <span className="text-xs text-white tracking-widest font-bold uppercase" style={{ fontFamily: 'Orbitron, sans-serif' }}>{label}</span>
                <span className="text-sm font-bold text-gray-400 font-mono">{value}</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className={`h-full rounded-full relative ${isFull ? 'bg-red-500' : 'bg-red-500'}`}
                    style={{
                        background: isFull
                            ? 'linear-gradient(90deg, #ef4444 0%, #ef4444 100%)'
                            : '#ef4444'
                    }}
                >
                    {/* Shimmer effect when bar is full */}
                    {isFull && (
                        <div
                            className="absolute inset-0 rounded-full"
                            style={{
                                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                                backgroundSize: '200% 100%',
                                animation: 'shimmer 1.5s linear infinite'
                            }}
                        />
                    )}
                </motion.div>
            </div>
            {/* Inline keyframes for shimmer animation */}
            {isFull && (
                <style>{`
                    @keyframes shimmer {
                        0% { background-position: 200% 0; }
                        100% { background-position: -200% 0; }
                    }
                `}</style>
            )}
        </div>
    );
};

const SolanaPanel = ({ onRewardsClaimed, currentCarModel, equippedParts = {}, carColor, username = '', pendingRewards = 0, totalEarned = 0, hourlyRate = 0, claimRewards, rewardsLoading = false, rewardsClaimError, rewardsClaimSuccess }) => {
    const { marketCap, chartData, loading: tokenLoading } = useSolanaToken();
    const { playSuccess } = useAudio();
    const { user } = usePrivy();

    // P&L Card Modal State
    const [showPnLCard, setShowPnLCard] = useState(false);
    const [claimData, setClaimData] = useState({ amount: 0, txSignature: null });

    // Use legacy fees claim hook as backup/additive
    const { claimableSol: feesSol } = useUserRewards(user?.wallet?.address);

    // Use centralized rewards from props (passed from App.jsx)
    const claiming = rewardsLoading;
    const claimSuccess = rewardsClaimSuccess;
    const claimError = rewardsClaimError;

    const formatLargeNumber = (num) => {
        if (!num) return '$0';
        if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return '$' + (num / 1e3).toFixed(2) + 'K';
        return '$' + num.toFixed(2);
    };

    const handleClaim = async () => {
        if (claiming || (!pendingRewards && !feesSol)) return;

        // Process claim
        const result = await claimRewards();

        if (result.success) {
            playSuccess();
            confetti({
                particleCount: 150,
                spread: 100,
                origin: { x: 0.1, y: 0.5 },
                colors: ['#FFD700', '#FFA500', '#FFFFFF']
            });

            if (onRewardsClaimed) onRewardsClaimed();

            // Show P&L Card with success data
            setClaimData({
                amount: result.amount,
                txSignature: result.txSignature
            });
            setShowPnLCard(true);
        }
    };

    // Calculate stat bonuses from equipped parts
    const calculateStatBonus = () => {
        let totalBonus = 0;
        let specialBonus = 0;

        // Handle both prop format and internal state format
        const partsIter = Object.values(equippedParts).flatMap(val => {
            // If val is the car object (e.g. { Engines: ... }), retrieve its values
            if (val && typeof val === 'object' && !val.id) return Object.values(val);
            return val;
        });

        partsIter.forEach(part => {
            if (!part) return;

            const level = part.rarityLevel || 1;

            if (part.category === 'Special') {
                specialBonus += 50;
            } else {
                totalBonus += level * 5;
            }
        });

        return { regularBonus: totalBonus, specialBonus };
    };

    const { regularBonus, specialBonus } = calculateStatBonus();
    const totalBonus = regularBonus + specialBonus;

    const baseStats = currentCarModel?.stats || {
        weight: 1200,
        power: 200,
        topSpeed: 200,
        acceleration: 7
    };

    // Get per-car max stats for progress bar scaling
    const maxStats = currentCarModel?.maxStats || {
        power: 600,
        topSpeed: 350,
        acceleration: 2.5,
        weight: 2000
    };

    // Apply bonuses to stats
    const applyBonus = (value, includeSpecial = true) => {
        const numVal = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
        const bonusMultiplier = includeSpecial ? (100 + totalBonus) / 100 : (100 + regularBonus) / 100;
        return Math.round(numVal * bonusMultiplier);
    };

    const stats = {
        power: applyBonus(baseStats.power),
        powerDisplay: applyBonus(baseStats.power) + ' HP',
        topSpeed: applyBonus(baseStats.topSpeed),
        topSpeedDisplay: applyBonus(baseStats.topSpeed) + ' km/h',
        acceleration: parseFloat((baseStats.acceleration / ((100 + totalBonus) / 100)).toFixed(1)),
        accelerationDisplay: (baseStats.acceleration / ((100 + totalBonus) / 100)).toFixed(1) + 's',
        weight: baseStats.weight,
        weightDisplay: baseStats.weight + ' kg'
    };

    // Total displayable Rewards (Live + any cached fees)
    const totalDisplayRewards = pendingRewards;

    return (
        <>
            <motion.div
                initial={{ x: -400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                className="fixed left-8 top-24 bottom-32 w-80 z-30 flex flex-col"
            >
                {/* Unified Glass Container */}
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col justify-between h-full shadow-2xl shadow-black/50">

                    {/* A. REWARDS */}
                    <div>
                        <h3 className="text-base text-red-500 tracking-widest font-bold uppercase mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                            Rewards
                        </h3>

                        <div className="space-y-3 mb-4">
                            <div className="flex justify-between items-end">
                                <span className="text-xs text-white tracking-widest font-bold uppercase" style={{ fontFamily: 'Orbitron, sans-serif' }}>Hourly Income</span>
                                <span className="text-sm font-bold text-gray-400 font-mono">{hourlyRate.toFixed(5)} SOL</span>
                            </div>
                            <div className="flex justify-between items-end">
                                <span className="text-xs text-white tracking-widest font-bold uppercase" style={{ fontFamily: 'Orbitron, sans-serif' }}>Total Earned</span>
                                <span className="text-sm font-bold text-gray-400 font-mono">{totalEarned.toFixed(4)} SOL</span>
                            </div>
                        </div>
                    </div>

                    {/* Centered Claimable Amount */}
                    <div className="flex flex-col items-center mt-6">
                        {feesSol > 0 && (
                            <div className="text-[10px] text-green-400 uppercase tracking-wider mb-1 font-bold">
                                + {feesSol.toFixed(4)} Fees
                            </div>
                        )}
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-white font-mono">
                                {totalDisplayRewards.toFixed(6)}
                            </span>
                            <span className="text-sm text-gray-400 font-bold uppercase" style={{ fontFamily: 'Orbitron, sans-serif' }}>SOL</span>
                        </div>
                        <button
                            onClick={handleClaim}
                            disabled={claiming}
                            className="w-full py-3 mt-4 rounded-lg font-bold text-sm tracking-wider uppercase transition-colors bg-red-600 hover:bg-red-500 text-white disabled:bg-gray-700 disabled:cursor-not-allowed"
                            style={{ fontFamily: 'Orbitron, sans-serif' }}
                        >
                            {claiming ? 'Processing...' : 'Claim'}
                        </button>
                    </div>


                    {/* divider */}
                    <div className="h-px w-full bg-white/5"></div>

                    {/* B. MARKET CAP */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[20px] text-red-500 tracking-widest font-bold uppercase" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                                $GEAR
                            </h3>
                            <div className="flex items-center gap-2">
                                {tokenLoading ? (
                                    <div className="h-4 w-16 bg-white/10 animate-pulse rounded"></div>
                                ) : (
                                    <span className="text-lg font-bold text-white font-mono">{formatLargeNumber(marketCap)}</span>
                                )}
                            </div>
                        </div>
                        <div className="h-32 w-full opacity-80 mix-blend-screen flex items-center">
                            {tokenLoading ? (
                                <div className="h-full w-full bg-white/5 animate-pulse rounded-lg"></div>
                            ) : (
                                chartData && <SimpleLineChart data={chartData} isPositive={chartData.isPositive} color={carColor} />
                            )}
                        </div>
                    </div>

                    {/* divider */}
                    <div className="h-px w-full bg-white/5"></div>

                    {/* C. VEHICLE STATISTICS */}
                    <div>
                        <h3 className="text-base text-red-500 tracking-widest font-bold uppercase mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                            STATS
                        </h3>
                        <StatBar label="Power" value={stats.powerDisplay} max={maxStats.power} />
                        <StatBar label="Top Speed" value={stats.topSpeedDisplay} max={maxStats.topSpeed} />
                        <StatBar label="Acceleration" value={stats.accelerationDisplay} max={maxStats.acceleration} inverse={true} />
                        <StatBar label="Weight" value={stats.weightDisplay} max={maxStats.weight} />
                    </div>

                </div>
            </motion.div>

            {/* P&L Card Modal */}
            <PnLCard
                isOpen={showPnLCard}
                onClose={() => setShowPnLCard(false)}
                username={username || 'PLAYER'}
                claimedAmount={claimData.amount}
                txSignature={claimData.txSignature}
                referralCode={username || 'PLAYER'}
                carColor={carColor}
            />

            {/* Toast Notifications */}
            <ClaimPopup
                isLoading={claiming}
                success={claimSuccess}
                error={claimError}
                onClose={onRewardsClaimed}
            />
        </>
    );
};

export default SolanaPanel;
