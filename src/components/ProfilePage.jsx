import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Wallet, Trophy, Car, Package, Settings, ExternalLink, Copy, Check, Shield, Zap, TrendingUp, Edit, X, Lock, Clock, Gift, Coins, BarChart3, Activity } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { getReferralHistory } from '../dbServices';
import { useClaimRewards } from '../hooks/useClaimRewards';
import { supabase } from '../supabaseClient';
import InteractiveLogo from './InteractiveLogo';
import GaragePassModal from './GaragePassModal';
import ProfileCarViewer from './ProfileCarViewer';
import { CAR_MODELS } from './CarModelSelector';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PLAYER_TAGS = [
    "Street King", "Drift Master", "Tarmac Terror", "Apex Predator", "Speed Demon",
    "Asphalt Assassin", "Night Rider", "Redline Chaser", "Gearhead", "Octane Addict",
    "Circuit Breaker", "Lane Splitter", "Burnout Bandit", "Velocity Viper", "Turbo Titan",
    "Nitrous Nomad", "Shift Shifter", "Garage Guru", "Wheel Wizard", "Road Warrior"
];

const ProfilePage = ({ inventory = [], equippedParts = {}, earnings = 0, referralCode = '', pendingRewards = 0, onRewardsClaimed, username = '', avatarUrl = '', onAvatarUpdated, hourlyEarnings = '0.0000', totalEarned = 0, currentCarModel, carColor, carFinish, ownedCars = ['bmw_m3_e30'] }) => {
    const { user, authenticated, logout, login } = usePrivy();
    const [copied, setCopied] = useState(false);
    const [codeCopied, setCodeCopied] = useState(false);
    const [referrals, setReferrals] = useState([]);
    const [loadingReferrals, setLoadingReferrals] = useState(true);
    const [claimSuccess, setClaimSuccess] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [avatarError, setAvatarError] = useState('');
    const [showGarageModal, setShowGarageModal] = useState(false);
    const [profileCarIndex, setProfileCarIndex] = useState(0);
    const [xProfile, setXProfile] = useState('');
    const [showXModal, setShowXModal] = useState(false);
    const [xInput, setXInput] = useState('');
    const [savingX, setSavingX] = useState(false);
    const fileInputRef = useRef(null);

    // Claim Rewards Hook
    const { claimRewards, loading: claimLoading, error: claimError, txSignature } = useClaimRewards();

    // Authentication check (Privy only)
    const isAuthenticated = authenticated;

    // Wallet address from Privy
    const walletAddress = user?.wallet?.address || '';

    // Deterministic Tag Selection
    const playerTag = useMemo(() => {
        if (!walletAddress) return "Street King";
        let hash = 0;
        for (let i = 0; i < walletAddress.length; i++) {
            hash = walletAddress.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % PLAYER_TAGS.length;
        return PLAYER_TAGS[index];
    }, [walletAddress]);

    useEffect(() => {
        const fetchReferrals = async () => {
            if (walletAddress) {
                setLoadingReferrals(true);
                const history = await getReferralHistory(walletAddress);
                setReferrals(history || []);
                setLoadingReferrals(false);

                // Also fetch X profile
                const { data } = await supabase
                    .from('player_data')
                    .select('x_profile')
                    .eq('wallet_id', walletAddress)
                    .single();
                if (data?.x_profile) {
                    setXProfile(data.x_profile);
                }
            }
        };
        fetchReferrals();
    }, [walletAddress]);

    // Save X profile to Supabase
    const saveXProfile = async () => {
        if (!xInput.trim() || !walletAddress) return;
        setSavingX(true);
        try {
            // Clean up the input - extract username if full URL provided
            let username = xInput.trim();
            if (username.includes('twitter.com/') || username.includes('x.com/')) {
                username = username.split('/').pop().split('?')[0];
            }
            username = username.replace('@', '');

            await supabase
                .from('player_data')
                .update({ x_profile: username })
                .eq('wallet_id', walletAddress);

            setXProfile(username);
            setShowXModal(false);
            setXInput('');
        } catch (err) {
            console.error('Failed to save X profile:', err);
        } finally {
            setSavingX(false);
        }
    };

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

    // Avatar Upload Handler
    const handleAvatarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !walletAddress) return;

        setAvatarError('');
        setUploadingAvatar(true);

        try {
            const img = new Image();
            const imageUrl = URL.createObjectURL(file);

            const resizedBlob = await new Promise((resolve, reject) => {
                img.onload = () => {
                    const maxSize = 500;
                    let width = img.width;
                    let height = img.height;
                    if (width > maxSize || height > maxSize) {
                        if (width > height) {
                            height = Math.round((height / width) * maxSize);
                            width = maxSize;
                        } else {
                            width = Math.round((width / height) * maxSize);
                            height = maxSize;
                        }
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Failed to process image'));
                    }, 'image/jpeg', 0.9);
                };
                img.onerror = () => reject(new Error('Invalid image file'));
                img.src = imageUrl;
            });

            URL.revokeObjectURL(imageUrl);
            const fileName = `${walletAddress}.jpg`;
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, resizedBlob, { upsert: true, contentType: 'image/jpeg' });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(fileName);

            const urlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;

            await supabase
                .from('player_data')
                .update({ avatar_url: urlWithCacheBuster })
                .eq('wallet_id', walletAddress);

            if (onAvatarUpdated) onAvatarUpdated(urlWithCacheBuster);

        } catch (err) {
            console.error('Avatar upload error:', err);
            setAvatarError(err.message || 'Upload failed');
        } finally {
            setUploadingAvatar(false);
        }
    };

    const handleClaimRewards = async () => {
        if (!walletAddress || pendingRewards <= 0 || claimLoading) return;
        const result = await claimRewards(walletAddress);
        if (result.success) {
            setClaimSuccess(true);
            if (onRewardsClaimed) onRewardsClaimed(result.txSignature);
            setTimeout(() => setClaimSuccess(false), 5000);
        }
    };

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

    const orbitronFont = { fontFamily: 'Orbitron, sans-serif' };

    return (
        <div className="absolute inset-0 z-20 bg-black/90 backdrop-blur-sm overflow-hidden flex flex-col items-center justify-center font-orbitron" style={orbitronFont}>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-600/5 blur-[150px] rounded-full pointer-events-none"></div>

            <motion.div
                className="w-full h-full max-w-[1600px] p-8 pb-28 md:grid md:grid-cols-3 gap-6 flex flex-col overflow-y-auto md:overflow-hidden"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {/* LEFT COLUMN: PROFILE SUMMARY */}
                <motion.div
                    variants={itemVariants}
                    className="col-span-1 h-full bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden transition-colors"
                >
                    {/* Top Section: Logo, Avatar & Name */}
                    <div className="flex flex-col items-center text-center">
                        {/* Interactive Gear Logo */}
                        <div className="mb-3">
                            <InteractiveLogo />
                        </div>

                        <div className="relative mb-3">
                            <div
                                className="w-44 h-44 rounded-full flex items-center justify-center border-4 border-white/10 relative z-10 cursor-pointer overflow-hidden group bg-black/50 shadow-[0_0_40px_rgba(0,0,0,0.5)]"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User size={64} className="text-white/50" />
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Edit size={32} className="text-white" />
                                </div>
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                            {isAuthenticated && (
                                <div className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-green-500 border-4 border-black flex items-center justify-center z-20">
                                    {uploadingAvatar ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Check size={20} className="text-white" />}
                                </div>
                            )}
                        </div>

                        {avatarError && <div className="text-xs text-red-500 bg-red-500/10 px-3 py-1 rounded-lg font-bold uppercase tracking-wider mb-4">{avatarError}</div>}

                        <div className="space-y-1">
                            <h2 className="text-4xl font-bold text-white uppercase tracking-wider" style={orbitronFont}>
                                {isAuthenticated ? (username || 'Racer') : 'Anonymous'}
                            </h2>
                            <div className="flex items-center justify-center">
                                <span className="text-red-500 font-bold uppercase tracking-[0.2em] text-sm" style={orbitronFont}>{playerTag}</span>
                            </div>
                        </div>

                        {/* X Profile Link Section */}
                        {isAuthenticated && (
                            <div className="mt-4">
                                {xProfile ? (
                                    // Connected - Show clickable link with animation
                                    <a
                                        href={`https://x.com/${xProfile}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="relative group cursor-pointer block"
                                    >
                                        <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black/40 px-4 py-2">
                                            {/* Red Fill Animation Layer */}
                                            <div className="absolute inset-0 bg-red-600 z-0 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out"></div>
                                            <div className="relative z-10 flex items-center justify-center gap-2">
                                                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                                </svg>
                                                <span className="text-xs font-bold uppercase tracking-widest text-white group-hover:text-white transition-colors" style={orbitronFont}>
                                                    @{xProfile}
                                                </span>
                                            </div>
                                        </div>
                                    </a>
                                ) : (
                                    // Not connected - Show prompt
                                    <button
                                        onClick={() => setShowXModal(true)}
                                        className="relative group cursor-pointer w-full"
                                    >
                                        <div className="relative overflow-hidden rounded-lg border border-white/10 bg-black/40 px-4 py-2">
                                            {/* Red Fill Animation Layer */}
                                            <div className="absolute inset-0 bg-red-600 z-0 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out"></div>
                                            <div className="relative z-10 flex items-center justify-center gap-2">
                                                <svg className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="currentColor">
                                                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                                                </svg>
                                                <span className="text-xs font-bold uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors" style={orbitronFont}>
                                                    Link X Profile
                                                </span>
                                            </div>
                                        </div>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">

                        {/* REWARDS MODULE */}
                        <div className="bg-black/80 rounded-xl p-5 border border-white/5 space-y-4">
                            <h3 className="text-red-500 font-bold uppercase tracking-[0.2em] text-base text-center" style={orbitronFont}>
                                REWARDS
                            </h3>

                            {/* Hourly Yield Row */}
                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-white" style={orbitronFont}>
                                <span>HOURLY YIELD</span>
                                <span className="text-gray-400">+{hourlyEarnings}</span>
                            </div>

                            {/* Total Earned Row */}
                            <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-white" style={orbitronFont}>
                                <span>TOTAL EARNED</span>
                                <span className="text-gray-400">{totalEarned.toFixed(4)}</span>
                            </div>

                            {/* Large Available Amount */}
                            <div className="text-center py-2">
                                <div className="flex items-baseline justify-center gap-2">
                                    <span className="text-5xl font-bold text-white" style={orbitronFont}>
                                        {pendingRewards > 0 ? pendingRewards.toFixed(4) : '0.0010'}
                                    </span>
                                    <span className="text-sm font-bold text-gray-500 uppercase tracking-widest">SOL</span>
                                </div>
                            </div>

                            <button
                                onClick={handleClaimRewards}
                                disabled={pendingRewards <= 0 || claimLoading}
                                className={`w-full py-3 rounded-xl text-lg font-bold uppercase tracking-[0.15em] transition-all duration-300 ${claimSuccess
                                    ? 'bg-green-500 text-white'
                                    : pendingRewards > 0
                                        ? 'bg-[#DC2626] text-white hover:bg-[#B91C1C]'
                                        : 'bg-[#DC2626] text-white'
                                    }`}
                                style={orbitronFont}
                            >
                                {claimLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    </span>
                                ) : claimSuccess ? (
                                    <span className="flex items-center justify-center gap-2"><Check size={20} /> CLAIMED</span>
                                ) : (
                                    'CLAIM'
                                )}
                            </button>

                            {/* Validation Messages */}
                            {txSignature && claimSuccess && (<a href={`https://solscan.io/tx/${txSignature}`} target="_blank" rel="noopener noreferrer" className="block text-center text-xs text-green-400 hover:text-green-300 underline mt-2" style={orbitronFont}> View on Solscan → </a>)}
                            {claimError && <div className="text-center text-xs text-red-500 mt-2 font-bold uppercase" style={orbitronFont}>{claimError}</div>}
                        </div>

                        <div className="pt-1">
                            {!isAuthenticated ? (
                                <button onClick={login} className="w-full py-3 bg-white text-black text-sm font-bold uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all hover:scale-[1.01]" style={orbitronFont}>Connect Wallet</button>
                            ) : (
                                <div className="relative group">
                                    <button
                                        onClick={logout}
                                        className="w-full py-3 px-4 bg-black border border-white/10 rounded-xl flex items-center justify-center transition-all group-hover:border-red-600/50 group-hover:bg-red-600/10 group-hover:text-red-500 text-gray-300 font-mono text-xs tracking-wider hover:scale-[1.01]"
                                    >
                                        <div className="absolute inset-0 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity duration-200 gap-2 px-6">
                                            {shortAddress} <Copy size={14} className="opacity-50" />
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 font-bold uppercase tracking-widest text-base" style={orbitronFont}>
                                            DISCONNECT
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>

                    </div>
                </motion.div>

                {/* RIGHT AREA: STATS, REFERRAL, ETC. */}
                <div className="col-span-2 h-full flex flex-col gap-6 relative">
                    {!isAuthenticated && (
                        <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-md rounded-2xl"></div>
                            <div className="relative z-10 text-center p-8 pointer-events-auto">
                                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"> <Lock size={32} className="text-white" /> </div>
                                <h3 className="text-white text-xl font-bold uppercase tracking-wider mb-2" style={orbitronFont}> Sign In Required </h3>
                                <p className="text-gray-400 text-sm mb-4 max-w-xs" style={orbitronFont}> Connect your wallet to experience the full features. </p>
                                <button onClick={login} className="px-6 py-3 bg-white hover:bg-gray-200 rounded-xl text-black text-sm font-bold uppercase tracking-wider transition-all" style={orbitronFont}> Connect Wallet </button>
                            </div>
                        </div>
                    )}

                    {/* TOP STATS ROW */}
                    <motion.div variants={itemVariants} className={`grid grid-cols-3 gap-6 ${!isAuthenticated ? 'blur-sm opacity-50' : ''}`}>
                        {[
                            { label: 'Total Invites', value: referrals.length, unit: 'Recruits' },
                            { label: 'Equipped', value: `${equippedCount}/8`, unit: 'slots' },
                            { label: 'Fee Bonus', value: `${referrals.length * 5}%`, unit: 'Boost' },
                        ].map((stat, idx) => (
                            <div key={idx} className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col justify-between transition-colors group h-32">
                                <div className="flex items-start justify-between">
                                    <span className="text-red-500 text-sm uppercase tracking-widest font-bold" style={orbitronFont}>{stat.label}</span>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-gray-400" style={orbitronFont}> {stat.value} </div>
                                    <div className="text-xs text-gray-600 uppercase font-mono mt-1" style={orbitronFont}>{stat.unit}</div>
                                </div>
                            </div>
                        ))}
                    </motion.div>

                    {/* MIDDLE SECTION: REFERRAL (Left) & ACHIEVEMENTS + CAR (Right) */}
                    <div className={`flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0 ${!isAuthenticated ? 'blur-sm opacity-50' : ''}`}>

                        {/* REFERRAL SYSTEM (Left Column) */}
                        <motion.div variants={itemVariants} className="col-span-1 bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col overflow-hidden transition-colors h-full">
                            <div className="flex items-center gap-3 mb-4">
                                <h3 className="text-red-500 text-sm font-bold tracking-widest uppercase" style={orbitronFont}>Referral System</h3>
                            </div>
                            <p className="text-gray-400 text-xs mb-4" style={orbitronFont}>Invite friends and earn <span className="text-white font-bold">5% fees</span>!</p>

                            <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-center justify-between group hover:border-white/20 transition-colors cursor-pointer mb-4" onClick={copyReferral}>
                                <div>
                                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1" style={orbitronFont}>Your Code</div>
                                    <div className="text-xl font-bold text-gray-400 tracking-widest" style={orbitronFont}>{referralCode || '--------'}</div>
                                </div>
                                <button className="p-2 bg-white/5 rounded-lg text-gray-400 group-hover:bg-white/10 group-hover:text-white transition-all"> {codeCopied ? <Check size={16} /> : <Copy size={16} />} </button>
                            </div>

                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                                <div className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-3 border-b border-white/5 pb-2" style={orbitronFont}>Recent Recruits</div>
                                <div className="space-y-2">
                                    {loadingReferrals ? (<div className="text-center py-4 text-gray-600 animate-pulse text-[10px] uppercase" style={orbitronFont}>Loading...</div>) : referrals.length === 0 ? (<div className="text-center text-gray-600 italic py-2 text-[10px]" style={orbitronFont}>No invites yet</div>) : (referrals.map((ref, idx) => (<div key={idx} className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-lg hover:border-white/10 transition-all"> <div className="flex flex-col"> <span className="text-xs font-mono text-gray-400" style={orbitronFont}>{ref.wallet_id?.slice(0, 6)}...{ref.wallet_id?.slice(-4)}</span> <span className="text-[10px] text-gray-600 flex items-center gap-1 mt-1" style={orbitronFont}><Clock size={10} /> {new Date(ref.created_at).toLocaleDateString()}</span> </div> <div className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded" style={orbitronFont}>ACTIVE</div> </div>)))}
                                </div>
                            </div>
                        </motion.div>

                        {/* RIGHT COLUMN STACK (Achievements + My Car) */}
                        <div className="col-span-2 flex flex-col gap-6 h-full">

                            {/* ACHIEVEMENTS */}
                            <motion.div variants={itemVariants} className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 flex flex-col overflow-hidden transition-colors h-1/2">
                                <div className="flex items-center gap-3 mb-4">
                                    <h3 className="text-red-500 text-sm font-bold tracking-widest uppercase" style={orbitronFont}>Achievements</h3>
                                </div>
                                <div className="grid grid-cols-2 gap-3 overflow-y-auto pr-1">
                                    {achievements.map((achievement) => (
                                        <div key={achievement.id} className={`p-4 rounded-xl border flex items-center gap-3 transition-all ${achievement.unlocked ? 'bg-white/5 border-white/20' : 'bg-black/20 border-white/5 opacity-50'}`}>
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${achievement.unlocked ? 'bg-white text-black' : 'bg-white/5 text-gray-500'}`}> <achievement.icon size={18} /> </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-white font-bold uppercase text-xs tracking-wider mb-1" style={orbitronFont}>{achievement.title}</h4>
                                                <p className="text-gray-500 text-[10px] truncate" style={orbitronFont}>{achievement.description}</p>
                                            </div>
                                            {achievement.unlocked && <Check size={14} className="text-green-500 flex-shrink-0" />}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>

                            {/* MY CAR VIEWER */}
                            <motion.div variants={itemVariants} className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl p-0 flex flex-col overflow-hidden transition-colors h-1/2 relative">
                                <ProfileCarViewer
                                    carColor={carColor}
                                    isLocked={!ownedCars.includes('bmw_m3_e30')}
                                />
                            </motion.div>
                        </div>
                    </div>

                    {/* GARAGE PASS */}
                    <motion.div
                        variants={itemVariants}
                        onClick={() => setShowGarageModal(true)}
                        className="relative h-32 rounded-2xl overflow-hidden group cursor-pointer bg-neutral-900/80 border border-white/10"
                    >
                        {/* Red Fill Animation Layer */}
                        <div className="absolute inset-0 bg-red-600 z-0 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-out"></div>

                        <div className="absolute inset-0 flex items-center justify-between px-8 z-10">
                            <div className="flex items-center gap-6">
                                {/* Image Layer */}
                                <div className="w-20 h-20 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center overflow-hidden shadow-lg group-hover:scale-105 transition-transform duration-300">
                                    <img src="/garage-pass.png" alt="Pass" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-bold text-white group-hover:text-white transition-colors uppercase italic tracking-wider" style={orbitronFont}>
                                        Garage Pass
                                    </h3>
                                    <div className="flex items-center gap-3 mt-2 text-gray-400 group-hover:text-white/80 transition-colors text-[10px] uppercase tracking-widest font-bold" style={orbitronFont}>
                                        <span>More Rewards</span>
                                        <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                                        <span>Special Items</span>
                                        <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                                        <span>Special Cars</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-gray-400 group-hover:text-white transition-colors mb-1" style={orbitronFont}>0.2 SOL</div>
                            </div>
                        </div>
                    </motion.div>

                </div>
            </motion.div>

            {/* Modal */}
            <GaragePassModal isOpen={showGarageModal} onClose={() => setShowGarageModal(false)} />

            {/* X Profile Modal */}
            <AnimatePresence>
                {showXModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                        onClick={() => setShowXModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-neutral-900 border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-white uppercase tracking-wider" style={orbitronFont}>
                                    Link X Profile
                                </h3>
                                <button
                                    onClick={() => setShowXModal(false)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                    <X size={20} className="text-gray-400" />
                                </button>
                            </div>

                            <p className="text-gray-400 text-sm mb-6" style={orbitronFont}>
                                Enter your X username or profile URL to link your account.
                            </p>

                            <input
                                type="text"
                                value={xInput}
                                onChange={(e) => setXInput(e.target.value)}
                                placeholder="@username or x.com/username"
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors mb-6"
                                style={orbitronFont}
                            />

                            <button
                                onClick={saveXProfile}
                                disabled={!xInput.trim() || savingX}
                                className="w-full py-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl text-white font-bold uppercase tracking-widest transition-all"
                                style={orbitronFont}
                            >
                                {savingX ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
                                ) : (
                                    'Link Profile'
                                )}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ProfilePage;
