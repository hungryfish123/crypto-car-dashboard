import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Wallet, Trophy, Car, Package, Settings, ExternalLink, Copy, Check, Shield, Zap, TrendingUp, Edit, X, Lock } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import ManualBurnVerification from './ManualBurnVerification';
import BurnerWalletDashboard from './BurnerWalletDashboard';
import { useBurnerWallet } from '../hooks/useBurnerWallet';

const ProfilePage = ({ inventory = [], equippedParts = {}, earnings = 0, referralCode = '', onRewardClaimed, onBurnerAuth }) => {
    const { user, authenticated, logout, login } = usePrivy();
    const burnerWallet = useBurnerWallet();
    const [copied, setCopied] = React.useState(false);
    const [codeCopied, setCodeCopied] = React.useState(false);
    const [showBurnerWallet, setShowBurnerWallet] = React.useState(false);
    const [burnerAuthenticated, setBurnerAuthenticated] = React.useState(false);

    // Check localStorage for burner auth on mount
    React.useEffect(() => {
        const isBurnerAuth = localStorage.getItem('burner_authenticated') === 'true';
        if (isBurnerAuth && burnerWallet.hasWallet) {
            setBurnerAuthenticated(true);
        }
    }, [burnerWallet.hasWallet]);

    // Combined authentication check (Privy OR Burner wallet)
    const isAuthenticated = authenticated || burnerAuthenticated;

    // Wallet address - prioritize Privy, fallback to burner
    const walletAddress = user?.wallet?.address || (burnerAuthenticated ? burnerWallet.walletAddress : '');
    const shortAddress = walletAddress ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Not Connected';

    // Calculate stats
    const totalParts = inventory.length;
    const equippedCount = Object.values(equippedParts).filter(Boolean).length;
    const totalValue = inventory.reduce((sum, item) => {
        const price = parseInt(item.price?.replace(/[^0-9]/g, '') || 0);
        return sum + price;
    }, 0);

    // Copy wallet address
    const copyAddress = () => {
        if (walletAddress) {
            navigator.clipboard.writeText(walletAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Copy referral code
    const copyReferral = () => {
        if (referralCode) {
            navigator.clipboard.writeText(referralCode);
            setCodeCopied(true);
            setTimeout(() => setCodeCopied(false), 2000);
        }
    };

    // Mock achievements
    const achievements = [
        { id: 1, title: 'First Purchase', description: 'Buy your first part', unlocked: totalParts > 0, icon: Package },
        { id: 2, title: 'Collector', description: 'Own 5+ parts', unlocked: totalParts >= 5, icon: Trophy },
        { id: 3, title: 'High Roller', description: 'Spend 50k CR', unlocked: totalValue >= 50000, icon: TrendingUp },
        { id: 4, title: 'Full Setup', description: 'Equip all slots', unlocked: equippedCount >= 5, icon: Car },
    ];

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <div className="absolute inset-0 z-20 bg-black/90 backdrop-blur-sm overflow-hidden flex flex-col items-center justify-center">
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>

            {/* Red Glow */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-600/5 blur-[150px] rounded-full pointer-events-none"></div>

            <motion.div
                className="w-full h-full max-w-[1600px] p-8 pb-28 md:grid md:grid-cols-3 md:gap-6 flex flex-col gap-6 overflow-y-auto md:overflow-hidden"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* LEFT COLUMN: IDENTITY CARD (Row Span 2) */}
                <motion.div
                    variants={itemVariants}
                    className="col-span-1 h-full bg-black/40 border border-white/10 backdrop-blur-md rounded-2xl p-8 flex flex-col relative overflow-hidden group"
                >
                    {/* Corner Accents */}
                    <div className="absolute top-0 left-0 w-20 h-20 border-l-2 border-t-2 border-red-500/30 rounded-tl-2xl"></div>
                    <div className="absolute bottom-0 right-0 w-20 h-20 border-r-2 border-b-2 border-red-500/30 rounded-br-2xl"></div>

                    {/* Content Centered Vertically */}
                    <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="relative">
                            <div className="w-48 h-48 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center border-4 border-white/10 shadow-[0_0_50px_rgba(220,38,38,0.4)] relative z-10">
                                <User size={80} className="text-white/80" />
                            </div>
                            {/* Pulse Effect */}
                            <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full animate-pulse"></div>

                            {isAuthenticated && (
                                <div className="absolute bottom-2 right-2 w-12 h-12 rounded-full bg-green-500 border-4 border-black flex items-center justify-center z-20">
                                    <Check size={24} className="text-white" />
                                </div>
                            )}
                        </div>

                        <div>
                            <h2 className="text-4xl font-bold text-white uppercase tracking-wider mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                                {isAuthenticated ? (burnerAuthenticated ? 'Burner Driver' : 'Connected Driver') : 'Anonymous Racer'}
                            </h2>
                            <div className="flex items-center justify-center gap-2">
                                <Shield size={16} className="text-yellow-500" />
                                <span className="text-yellow-500 font-bold uppercase tracking-[0.2em] text-sm">Street King</span>
                            </div>
                        </div>

                        {/* Rank Progress Bar */}
                        <div className="w-full max-w-xs mt-4">
                            <div className="flex justify-between text-xs text-gray-500 uppercase font-bold mb-1">
                                <span>Level 0</span>
                                <span>0 / 100 XP</span>
                            </div>
                            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-red-600 to-yellow-500 w-[0%]"></div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Area: Wallet & Edit */}
                    <div className="mt-auto space-y-4 w-full">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Wallet size={20} className="text-red-500" />
                                <span className="text-white font-mono text-sm tracking-wider">{shortAddress}</span>
                            </div>
                            <div className="flex gap-1">
                                <button onClick={copyAddress} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Copy">
                                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-gray-400" />}
                                </button>
                                {walletAddress && (
                                    <a href={`https://solscan.io/account/${walletAddress}`} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Solscan">
                                        <ExternalLink size={16} className="text-gray-400" />
                                    </a>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {!isAuthenticated ? (
                                <>
                                    <button
                                        onClick={login}
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 border border-red-500/30 rounded-xl text-white text-sm font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                                    >
                                        <Wallet size={16} /> Connect Wallet
                                    </button>
                                    <button
                                        onClick={() => {
                                            // Auto-authenticate with burner wallet
                                            localStorage.setItem('burner_authenticated', 'true');
                                            setBurnerAuthenticated(true);
                                            setShowBurnerWallet(true);
                                            if (onBurnerAuth) onBurnerAuth(burnerWallet.walletAddress);
                                        }}
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl text-purple-300 text-sm font-bold uppercase tracking-wider transition-all"
                                    >
                                        <Zap size={16} /> Use Burner Wallet
                                    </button>
                                </>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setShowBurnerWallet(true)}
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl text-purple-300 text-xs font-bold uppercase tracking-wider transition-all"
                                    >
                                        <Zap size={14} /> Burner
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (burnerAuthenticated) {
                                                // Disconnect burner wallet
                                                localStorage.removeItem('burner_authenticated');
                                                setBurnerAuthenticated(false);
                                            } else {
                                                logout();
                                            }
                                        }}
                                        className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600/20 hover:bg-red-600/40 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider rounded-xl transition-all"
                                    >
                                        Disconnect
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>


                {/* RIGHT AREA (Col span 2) */}
                <div className="col-span-2 h-full flex flex-col gap-6 relative">

                    {/* Blur Overlay for Unauthenticated Users */}
                    {!isAuthenticated && (
                        <div className="absolute inset-0 z-30 flex items-center justify-center">
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-md rounded-2xl"></div>
                            <div className="relative z-10 text-center p-8">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                                    <Lock size={32} className="text-gray-500" />
                                </div>
                                <h3 className="text-white text-xl font-bold uppercase tracking-wider mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                                    Sign In Required
                                </h3>
                                <p className="text-gray-400 text-sm mb-4 max-w-xs">
                                    Connect your wallet or use a burner wallet to access your profile.
                                </p>
                                <button
                                    onClick={login}
                                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 rounded-xl text-white text-sm font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(220,38,38,0.3)]"
                                >
                                    Connect Wallet
                                </button>
                            </div>
                        </div>
                    )}

                    {/* B. TOP RIGHT: STATS ROW */}
                    <motion.div variants={itemVariants} className={`grid grid-cols-4 gap-4 ${!isAuthenticated ? 'blur-sm pointer-events-none' : ''}`}>
                        {[
                            { label: 'Total Value', value: `${(totalValue / 1000).toFixed(1)}k`, icon: TrendingUp, color: 'text-green-500', unit: 'CR' },
                            { label: 'Parts Owned', value: totalParts, icon: Package, color: 'text-blue-500', unit: 'items' },
                            { label: 'Equipped', value: `${equippedCount}/5`, icon: Car, color: 'text-purple-500', unit: 'slots' },
                            { label: 'Achievements', value: `${achievements.filter(a => a.unlocked).length}`, icon: Trophy, color: 'text-yellow-500', unit: 'unlocked' },
                        ].map((stat, idx) => (
                            <div key={idx} className="bg-black/40 border border-white/10 backdrop-blur-md rounded-2xl p-5 flex flex-col justify-between hover:border-red-500/30 transition-colors group h-32">
                                <div className="flex items-start justify-between">
                                    <span className="text-gray-500 text-[10px] uppercase tracking-widest font-bold">{stat.label}</span>
                                    <stat.icon size={18} className={`${stat.color} opacity-80 group-hover:scale-110 transition-transform`} />
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-white group-hover:text-red-500 transition-colors" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                                        {stat.value}
                                    </div>
                                    <div className="text-xs text-gray-600 uppercase font-mono mt-1">{stat.unit}</div>
                                </div>
                            </div>
                        ))}
                    </motion.div>

                    {/* C. MIDDLE: REFERRAL, BURN VERIFICATION & ACHIEVEMENTS ROW */}
                    <div className={`flex-1 grid grid-cols-3 gap-4 min-h-0 ${!isAuthenticated ? 'blur-sm pointer-events-none' : ''}`}>
                        {/* REFERRAL MODULE */}
                        <motion.div variants={itemVariants} className="bg-black/40 border border-white/10 backdrop-blur-md rounded-2xl p-5 flex flex-col overflow-hidden">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                    <Zap size={16} className="text-blue-500" />
                                </div>
                                <h3 className="text-white text-xs font-bold tracking-[0.15em] uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Referral</h3>
                            </div>

                            <p className="text-gray-400 text-[10px] mb-3">Invite friends and earn <span className="text-green-400 font-bold">5% fees</span>!</p>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between group hover:border-blue-500/30 transition-colors cursor-pointer mb-3" onClick={copyReferral}>
                                <div>
                                    <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-1">Your Code</div>
                                    <div className="text-lg font-bold text-white tracking-widest font-mono">{referralCode || '--------'}</div>
                                </div>
                                <button className="p-2 bg-blue-500/10 rounded-lg text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                    {codeCopied ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                <div className="text-[9px] text-gray-500 uppercase font-bold tracking-widest mb-2 border-b border-white/5 pb-1">Recent Invites</div>
                                <div className="space-y-2 text-xs">
                                    <div className="text-center text-gray-600 italic py-2 text-[10px]">No invites yet</div>
                                </div>
                            </div>
                        </motion.div>

                        {/* BURN VERIFICATION MODULE */}
                        <ManualBurnVerification
                            walletAddress={walletAddress}
                            onRewardClaimed={onRewardClaimed}
                        />

                        {/* ACHIEVEMENTS */}
                        <motion.div variants={itemVariants} className="bg-black/40 border border-white/10 backdrop-blur-md rounded-2xl p-5 flex flex-col overflow-hidden">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-yellow-500/10 rounded-lg">
                                    <Trophy size={16} className="text-yellow-500" />
                                </div>
                                <h3 className="text-white text-xs font-bold tracking-[0.15em] uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Achievements</h3>
                            </div>

                            <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                                {achievements.map((achievement) => (
                                    <div key={achievement.id} className={`p-2 rounded-xl border flex items-center gap-2 transition-all hover:bg-white/5 ${achievement.unlocked ? 'bg-green-500/5 border-green-500/20' : 'bg-black/20 border-white/5 opacity-60'}`}>
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${achievement.unlocked ? 'bg-green-500/20 text-green-500' : 'bg-white/5 text-gray-500'}`}>
                                            <achievement.icon size={14} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-bold uppercase text-[9px] tracking-wider" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{achievement.title}</h4>
                                            <p className="text-gray-500 text-[8px] truncate">{achievement.description}</p>
                                        </div>
                                        {achievement.unlocked && <Check size={12} className="text-green-500 flex-shrink-0" />}
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    {/* D. BOTTOM RIGHT: GARAGE PASS BANNER */}
                    <motion.div variants={itemVariants} className="relative h-32 rounded-2xl overflow-hidden group cursor-pointer">
                        {/* Blurred Background with Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-red-900/60 to-purple-900/60 backdrop-blur-md border border-white/10 transition-all group-hover:scale-105"></div>

                        {/* Interactive Content */}
                        <div className="absolute inset-0 flex items-center justify-between px-8">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg transform group-hover:rotate-12 transition-transform">
                                    <Zap size={32} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white uppercase italic tracking-wider" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                                        Garage Pass <span className="text-yellow-500 not-italic ml-2 text-xl font-mono border border-yellow-500/50 px-2 rounded">PREMIUM</span>
                                    </h3>
                                    <div className="flex items-center gap-3 mt-1 text-gray-300 text-xs uppercase tracking-widest font-bold">
                                        <span className="flex items-center gap-1"><Check size={12} className="text-green-500" /> +50% Rewards</span>
                                        <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                                        <span className="flex items-center gap-1"><Check size={12} className="text-green-500" /> VIP Access</span>
                                    </div>
                                </div>
                            </div>

                            {/* Action Side */}
                            <div className="text-right">
                                <div className="text-sm text-gray-400 font-mono mb-1 line-through opacity-50">1.0 SOL</div>
                                <div className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>0.1 SOL</div>
                                <div className="px-3 py-1 bg-black/40 rounded border border-white/10 text-[10px] text-gray-400 uppercase tracking-widest">
                                    Coming Soon
                                </div>
                            </div>
                        </div>

                        {/* Overlay for "COMING SOON" slightly less intrusive now as per 'banner' style, but keeping it clear */}
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors"></div>
                    </motion.div>

                </div>
            </motion.div>

            {/* Burner Wallet Modal */}
            <AnimatePresence>
                {showBurnerWallet && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        onClick={() => setShowBurnerWallet(false)}
                    >
                        {/* Backdrop */}
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

                        {/* Modal Content */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative z-10 w-full max-w-md"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setShowBurnerWallet(false)}
                                className="absolute -top-2 -right-2 z-20 w-10 h-10 bg-black/80 border border-white/20 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:border-red-500/50 transition-all"
                            >
                                <X size={18} />
                            </button>

                            {/* Burner Wallet Dashboard */}
                            <BurnerWalletDashboard />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProfilePage;

