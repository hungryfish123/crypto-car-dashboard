import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, DollarSign, Wallet, Activity, Gauge, Zap, Weight, Award } from 'lucide-react';
import { useSolanaToken } from '../hooks/useSolanaToken';
import { useClaimRewards } from '../hooks/useClaimRewards';
import { useUserRewards } from '../hooks/useUserRewards';
import { useAudio } from '../hooks/useAudio';
import { usePrivy } from '@privy-io/react-auth';
import confetti from 'canvas-confetti';

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
    let percentage = (numValue / max) * 100;

    if (inverse) {
        percentage = Math.max(0, Math.min(100, ((10 - numValue) / (10 - 2.5)) * 100));
    } else {
        percentage = Math.max(0, Math.min(100, percentage));
    }

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
                    className="h-full rounded-full bg-red-500"
                />
            </div>
        </div>
    );
};

const SolanaPanel = ({ pendingRewards = 0, hourlyEarnings = 0, onRewardsClaimed, currentCarModel, equippedParts = {}, carColor }) => {
    const { marketCap, chartData, loading: tokenLoading } = useSolanaToken();
    const { claimRewards, loading: claiming } = useClaimRewards();
    const { playSuccess } = useAudio();
    const { user } = usePrivy();

    // Fetch user rewards from database (claimable fees + lifetime earnings)
    const { claimableSol, lifetimeEarnings, onClaimSuccess } = useUserRewards(user?.wallet?.address);

    const formatLargeNumber = (num) => {
        if (!num) return '$0';
        if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return '$' + (num / 1e3).toFixed(2) + 'K';
        return '$' + num.toFixed(2);
    };

    const handleClaim = async () => {
        const totalClaimable = pendingRewards + claimableSol;
        if (claiming || totalClaimable <= 0 || !user?.wallet?.address) return;

        const result = await claimRewards(user.wallet.address);

        if (result.success) {
            playSuccess(); // Play success sound
            confetti({
                particleCount: 150,
                spread: 100,
                origin: { x: 0.1, y: 0.5 },
                colors: ['#FFD700', '#FFA500', '#FFFFFF']
            });
            if (onRewardsClaimed) onRewardsClaimed();
        }
    };

    // Calculate stat bonuses from equipped parts
    // Level 1: +5%, Level 2: +10%, Level 3: +15%, etc. (level × 5%)
    // Special items: +50% all stats except weight
    const calculateStatBonus = () => {
        let totalBonus = 0;
        let specialBonus = 0;

        Object.values(equippedParts).forEach(part => {
            if (!part) return;

            const level = part.rarityLevel || 1;

            if (part.category === 'Special') {
                // Special items give 50% boost
                specialBonus += 50;
            } else {
                // Regular items give level × 5% boost
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

    // Apply bonuses to stats (weight not affected by special bonus)
    const applyBonus = (value, includeSpecial = true) => {
        const numVal = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
        const bonusMultiplier = includeSpecial ? (100 + totalBonus) / 100 : (100 + regularBonus) / 100;
        return Math.round(numVal * bonusMultiplier);
    };

    const stats = {
        power: applyBonus(baseStats.power) + ' HP',
        topSpeed: applyBonus(baseStats.topSpeed) + ' km/h',
        acceleration: (parseFloat(String(baseStats.acceleration).replace(/[^0-9.]/g, '')) / ((100 + totalBonus) / 100)).toFixed(1) + 's',
        weight: baseStats.weight // Weight stays the same for special items
    };

    return (
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

                    {/* Rewards Display */}
                    {/* Rewards Display - Reverted */}
                    <div className="space-y-3 mb-4">
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-white tracking-widest font-bold uppercase" style={{ fontFamily: 'Orbitron, sans-serif' }}>Hourly Yield</span>
                            <span className="text-sm font-bold text-gray-400 font-mono">{hourlyEarnings.toFixed(5)} SOL</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <span className="text-xs text-white tracking-widest font-bold uppercase" style={{ fontFamily: 'Orbitron, sans-serif' }}>SOL Earned</span>
                            <span className="text-sm font-bold text-gray-400 font-mono">{lifetimeEarnings.toFixed(4)} SOL</span>
                        </div>
                    </div>
                </div>

                {/* Centered Claimable Amount - Combined from props + database */}
                <div className="flex flex-col items-center mt-6">
                    {/* Show claimable fees from database if any */}
                    {claimableSol > 0 && (
                        <div className="text-[10px] text-green-400 uppercase tracking-wider mb-1 font-bold">
                            + {claimableSol.toFixed(4)} SOL from Fees
                        </div>
                    )}
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-white font-mono">
                            {(pendingRewards + claimableSol).toFixed(3)}
                        </span>
                        <span className="text-sm text-gray-400 font-bold uppercase" style={{ fontFamily: 'Orbitron, sans-serif' }}>SOL</span>
                    </div>
                    <button
                        onClick={handleClaim}
                        disabled={(pendingRewards + claimableSol) <= 0 || claiming}
                        className={`w-full py-3 mt-4 rounded-lg font-bold text-sm tracking-wider uppercase transition-colors
                                ${(pendingRewards + claimableSol) > 0
                                ? 'bg-red-600 hover:bg-red-500 text-white'
                                : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
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
                    <StatBar label="Power" value={stats.power} max={600} />
                    <StatBar label="Top Speed" value={stats.topSpeed} max={350} />
                    <StatBar label="Acceleration" value={stats.acceleration} max={10} inverse={true} />
                    <StatBar label="Weight" value={stats.weight} max={2000} />
                </div>

            </div>
        </motion.div >
    );
};

export default SolanaPanel;
