import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Lock, ArrowLeft, RefreshCw, Database, Eye, EyeOff, Link, Coins, BarChart3, Send, CheckCircle, AlertCircle, Settings, Wallet } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useFeeDistribution } from '../hooks/useFeeDistribution';

const AdminPanel = ({ onClose, items }) => {
    const [activeTab, setActiveTab] = useState('management'); // 'management' | 'fees' | 'links'
    const [itemDetails, setItemDetails] = useState({});
    const [hiddenItems, setHiddenItems] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    // Fee Distribution State
    const [feeAmount, setFeeAmount] = useState('');
    const [distributionNotes, setDistributionNotes] = useState('');
    const { distributeFees, distributing, lastResult, error: distributionError } = useFeeDistribution();

    const [isUnlocked, setIsUnlocked] = useState(false);
    const [accessCode, setAccessCode] = useState('');
    const [unlockError, setUnlockError] = useState(false);

    useEffect(() => {
        if (isUnlocked) {
            fetchMappings();
        }
    }, [isUnlocked]);

    const handleUnlock = async (e) => {
        e.preventDefault();

        try {
            // SECURE VERIFICATION: Call Edge Function
            // The password is stored in Supabase secrets (Vault) associated with the function.
            // It is NEVER exposed to the client in plain text variables or hardcoded strings.
            const { data, error } = await supabase.functions.invoke('verify-admin', {
                body: { code: accessCode }
            });

            if (error) {
                console.error("Verification failed:", error);
                setUnlockError(true);
                setAccessCode('');
                setTimeout(() => setUnlockError(false), 800);
                return;
            }

            if (data && data.success) {
                setIsUnlocked(true);
                setUnlockError(false);
            } else {
                console.log("Invalid code provided.");
                setUnlockError(true);
                setAccessCode('');
                setTimeout(() => setUnlockError(false), 800);
            }
        } catch (err) {
            console.error("Unlock exception:", err);
            setUnlockError(true);
        }
    };

    // Wrapped SOL mint address for Jupiter swap links
    const WSOL_MINT = 'So11111111111111111111111111111111111111112';

    const fetchMappings = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('item_mappings')
            .select('*');

        if (error) {
            console.error('Error fetching mappings:', error);
            setStatusMsg('Error fetching data');
        } else {
            const details = {};
            const hidden = {};
            data.forEach(row => {
                const ca = row.contract_address || '';
                let buyUrl = row.buy_url || '';
                const supply = row.supply || 0;

                // Auto-generate Jupiter URL if CA exists but buyUrl is empty
                if (ca && !buyUrl) {
                    buyUrl = `https://jup.ag/?sell=${WSOL_MINT}&buy=${ca}`;
                }

                details[row.item_id] = { ca, buyUrl, supply };
                hidden[row.item_id] = row.hidden || false;
            });
            setItemDetails(details);
            setHiddenItems(hidden);
        }
        setLoading(false);
    };

    const handleSave = async (itemId) => {
        setSaving(true);
        setStatusMsg('Saving...');

        const details = itemDetails[itemId] || {};
        const isHidden = hiddenItems[itemId] || false;

        // Upsert the mapping with all fields
        const { error } = await supabase
            .from('item_mappings')
            .upsert({
                item_id: itemId,
                contract_address: details.ca || null,
                hidden: isHidden,
                buy_url: details.buyUrl || null
            }, { onConflict: 'item_id' });

        if (error) {
            console.error('Error saving mapping:', error);
            setStatusMsg('Failed to save');
        } else {
            setStatusMsg('Saved!');
            setTimeout(() => setStatusMsg(''), 2000);
        }
        setSaving(false);
    };

    const updateField = (itemId, field, value) => {
        setItemDetails(prev => {
            const current = prev[itemId] || { ca: '', buyUrl: '' };
            const updated = { ...current, [field]: value };

            // Auto-generate Jupiter buy link when CA is entered/updated
            if (field === 'ca' && value && value.trim().length > 0) {
                updated.buyUrl = `https://jup.ag/?sell=${WSOL_MINT}&buy=${value.trim()}`;
            }

            return { ...prev, [itemId]: updated };
        });
    };

    const toggleHidden = async (itemId) => {
        const newHidden = !hiddenItems[itemId];
        setHiddenItems(prev => ({ ...prev, [itemId]: newHidden }));

        // We need to save immediately when toggling hidden
        setSaving(true);
        const details = itemDetails[itemId] || {};
        const { error } = await supabase
            .from('item_mappings')
            .upsert({
                item_id: itemId,
                contract_address: details.ca || null,
                hidden: newHidden,
                buy_url: details.buyUrl || null
            }, { onConflict: 'item_id' });

        if (error) setStatusMsg('Failed to save toggle');
        else setStatusMsg('Visibility updated');
        setSaving(false);
        setTimeout(() => setStatusMsg(''), 2000);
    };

    // Derived stats for Fee Preview
    const activeItems = useMemo(() => {
        return items.filter(item => !hiddenItems[item.id]);
    }, [items, hiddenItems]);


    if (!isUnlocked) {
        return (
            <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center text-white font-sans">
                <div className="absolute top-8 left-8">
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white">
                        <ArrowLeft size={24} />
                    </button>
                </div>

                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-black/90 p-12 rounded-2xl max-w-md w-full text-center relative overflow-hidden border border-white/20"
                >
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <Lock size={40} className="text-white/50" />
                        </div>
                        <h2 className="text-3xl font-bold uppercase tracking-widest mb-2 font-['Orbitron']">Admin Access</h2>
                        <p className="text-gray-500 text-sm mb-8 font-mono tracking-wider">SECURE ENVIRONMENT</p>

                        <form onSubmit={handleUnlock} className="w-full">
                            <input
                                type="password"
                                value={accessCode}
                                onChange={(e) => {
                                    setAccessCode(e.target.value);
                                    setUnlockError(false);
                                }}
                                placeholder="ENTER SECURITY CODE"
                                className={`w-full bg-black/50 border ${unlockError ? 'border-red-500 text-red-500' : 'border-white/10 text-white'} rounded-xl px-6 py-4 text-center text-xl font-mono tracking-[0.5em] focus:outline-none focus:border-white transition-all placeholder-gray-700 mb-6`}
                                autoFocus
                            />
                            <button
                                type="submit"
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl uppercase tracking-widest transition-all"
                            >
                                Authenticate
                            </button>
                        </form>
                        {unlockError && (
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-red-500 text-xs font-bold mt-6 tracking-widest uppercase"
                            >
                                Access Denied: Invalid Credentials
                            </motion.p>
                        )}
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col overflow-hidden text-white font-sans">
            {/* Header */}
            <div className="h-20 border-b border-red-900/30 flex items-center justify-between px-8 bg-black/80">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-2xl font-bold uppercase tracking-widest text-red-500 flex items-center gap-2">
                        <Lock size={24} /> Admin Ops
                    </h1>
                </div>

                {/* Tabs */}
                <div className="flex bg-black/40 p-1 rounded-lg border border-white/10">
                    <button
                        onClick={() => setActiveTab('management')}
                        className={`px-6 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'management' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Settings size={14} /> Management
                    </button>
                    <button
                        onClick={() => setActiveTab('fees')}
                        className={`px-6 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'fees' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Coins size={14} /> Fees & Revenue
                    </button>
                    <button
                        onClick={() => setActiveTab('links')}
                        className={`px-6 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'links' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-white'}`}
                    >
                        <Link size={14} /> Web Links
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 font-mono">{statusMsg}</span>
                    <button onClick={fetchMappings} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full">

                <AnimatePresence mode="wait">
                    {activeTab === 'management' && (
                        <motion.div
                            key="management"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-2"
                        >
                            {/* === MAIN CHART TOKEN CONFIG === */}
                            <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-4 mb-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                        <BarChart3 size={20} className="text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-wider text-purple-300">Main Chart Token</h3>
                                        <p className="text-[10px] text-gray-500">This CA is used for the market cap chart on the main page</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex-1 relative">
                                        <Database size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
                                        <input
                                            type="text"
                                            placeholder="Enter Solana Contract Address for main chart..."
                                            className="w-full bg-black/50 border border-purple-500/30 rounded-lg py-2.5 pl-9 pr-3 text-sm font-mono text-purple-300 placeholder-gray-600 focus:outline-none focus:border-purple-400 transition-colors"
                                            value={itemDetails['main_chart']?.ca || ''}
                                            onChange={(e) => updateField('main_chart', 'ca', e.target.value)}
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleSave('main_chart')}
                                        disabled={saving}
                                        className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg uppercase text-xs tracking-wider transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        <Save size={14} />
                                        Save
                                    </button>
                                </div>
                            </div>

                            {/* === MARKETPLACE ITEMS === */}
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 mt-4">Marketplace Items</h3>

                            {/* Management Header */}
                            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] items-center uppercase text-gray-500 font-bold tracking-wider">
                                <div className="col-span-1">Preview</div>
                                <div className="col-span-2">Item Info</div>
                                <div className="col-span-1">Supply</div>
                                <div className="col-span-3">Contract Address</div>
                                <div className="col-span-4">Buy Link</div>
                                <div className="col-span-1 text-right">Actions</div>
                            </div>

                            {items.map(item => {
                                const details = itemDetails[item.id] || { ca: '', buyUrl: '', supply: 0 };
                                const isHidden = hiddenItems[item.id];

                                return (
                                    <div
                                        key={item.id}
                                        className={`group relative bg-white/5 border rounded-lg p-2 grid grid-cols-12 gap-4 items-center transition-all hover:bg-white/[0.07] ${isHidden ? 'border-yellow-500/20 opacity-50' : 'border-white/5 hover:border-white/10'}`}
                                    >
                                        {/* 1. Image */}
                                        <div className="col-span-1 aspect-square rounded bg-black/40 p-1 flex items-center justify-center border border-white/5">
                                            <img src={item.image} alt={item.title} className="max-w-full max-h-full object-contain" />
                                        </div>

                                        {/* 2. Info */}
                                        <div className="col-span-2 h-full flex flex-col justify-center">
                                            <h3 className="font-bold text-xs uppercase text-white truncate">{item.title}</h3>
                                            <p className="text-[10px] text-gray-500 font-mono truncate">{item.id}</p>
                                            {isHidden && <span className="text-[9px] text-yellow-500 uppercase mt-1">Hidden</span>}
                                        </div>

                                        {/* 3. Supply */}
                                        <div className="col-span-1 flex items-center justify-center">
                                            <span className="text-xs font-mono text-cyan-400 font-bold">
                                                {details.supply ? details.supply.toLocaleString() : '—'}
                                            </span>
                                        </div>

                                        {/* 4. CA */}
                                        <div className="col-span-3">
                                            <div className="relative">
                                                <Database size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600" />
                                                <input
                                                    type="text"
                                                    placeholder="Solana CA..."
                                                    className="w-full bg-black/40 border border-white/5 rounded py-1.5 pl-6 pr-2 text-[10px] font-mono text-green-400 placeholder-gray-700 focus:outline-none focus:border-red-500/50 transition-colors"
                                                    value={details.ca}
                                                    onChange={(e) => updateField(item.id, 'ca', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* 4. Buy Link */}
                                        <div className="col-span-4">
                                            <div className="relative">
                                                <Link size={10} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600" />
                                                <input
                                                    type="text"
                                                    placeholder="Buy URL..."
                                                    className="w-full bg-black/40 border border-white/5 rounded py-1.5 pl-6 pr-2 text-[10px] font-mono text-pink-400 placeholder-gray-700 focus:outline-none focus:border-pink-500/50 transition-colors"
                                                    value={details.buyUrl}
                                                    onChange={(e) => updateField(item.id, 'buyUrl', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* 6. Actions */}
                                        <div className="col-span-1 flex justify-end gap-1">
                                            <button
                                                onClick={() => toggleHidden(item.id)}
                                                className={`p-1.5 rounded transition-colors ${isHidden ? 'text-yellow-500 hover:bg-yellow-500/10' : 'text-gray-600 hover:text-white hover:bg-white/10'}`}
                                                title={isHidden ? 'Show Item' : 'Hide Item'}
                                            >
                                                {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                            <button
                                                onClick={() => handleSave(item.id)}
                                                className="p-1.5 rounded text-red-500 hover:bg-red-500/10 transition-colors"
                                                title="Save Changes"
                                            >
                                                <Save size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </motion.div>
                    )}

                    {activeTab === 'fees' && (
                        <motion.div
                            key="fees"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="max-w-6xl mx-auto"
                        >
                            <FeeDashboard items={items} itemDetails={itemDetails} />
                        </motion.div>
                    )}

                    {activeTab === 'links' && (
                        <motion.div
                            key="links"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="max-w-4xl mx-auto"
                        >
                            <LinksManager />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const FeeDashboard = ({ items, itemDetails }) => {
    const [stats, setStats] = useState({
        treasuryBalance: 0,
        activeCounts: {},
        totalActiveUsers: 0,
        mappings: {}
    });
    const [loading, setLoading] = useState(true);

    // Treasury wallet address to watch
    const TREASURY_WALLET = 'cLaimUeEMC13r8Hf1CLen1Sn723pM5UEpZX1ZmEg2CN';
    const TREASURY_RESERVE = 0.01; // Keep 0.01 SOL for fees

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        let balance = 0;

        // 1. Get Real Wallet Balance via Moralis
        const moralisApiKey = import.meta.env.VITE_MORALIS_API_KEY;
        if (moralisApiKey) {
            try {
                const url = `https://solana-gateway.moralis.io/account/mainnet/${TREASURY_WALLET}/balance`;
                const response = await fetch(url, {
                    headers: { 'X-API-Key': moralisApiKey }
                });
                const data = await response.json();
                if (data && data.lamports) {
                    balance = parseFloat(data.lamports) / 1e9; // Convert lamports to SOL
                    console.log(`[AdminFees] Fetched treasury balance: ${balance} SOL`);
                }
            } catch (err) {
                console.error('[AdminFees] Failed to fetch treasury balance:', err);
                // Fallback to logs if API fails
                const { data: logs } = await supabase
                    .from('system_logs')
                    .select('retained_in_treasury')
                    .eq('event_type', 'REWARD_DISTRIBUTION')
                    .order('created_at', { ascending: false })
                    .limit(1);
                balance = logs?.[0]?.retained_in_treasury || 0;
            }
        }

        // 2. Fetch Item Mappings (Source of Truth for Yield/Supply)
        const { data: mappingsData } = await supabase
            .from('item_mappings')
            .select('item_id, supply, yield_weight');

        const mappings = {};
        if (mappingsData) {
            mappingsData.forEach(m => {
                mappings[m.item_id] = {
                    supply: m.supply,
                    yield_weight: m.yield_weight
                };
            });
        }

        // 3. Get User Inventory Counts
        const { data: players } = await supabase
            .from('player_data')
            .select('inventory');

        const counts = {};
        let totalUsers = 0;

        if (players) {
            players.forEach(p => {
                if (p.inventory && p.inventory.length > 0) {
                    totalUsers++;
                    p.inventory.forEach(item => {
                        const id = item.id || item.item_id;
                        counts[id] = (counts[id] || 0) + (item.quantity || 1);
                    });
                }
            });
        }

        setStats({
            treasuryBalance: balance,
            activeCounts: counts,
            totalActiveUsers: totalUsers,
            mappings: mappings
        });
        setLoading(false);
    };

    // --- Calculations ---
    const activeItems = items.filter(i => !itemDetails[i.id]?.hidden);

    // Distributable Pot (User confirmed: whatever is in wallet gets split)
    // We reserve 0.01 SOL for gas fees
    const distributablePot = Math.max(0, stats.treasuryBalance - TREASURY_RESERVE);

    // 1. Calculate Total Theoretical Points = Sum(Supply * YieldWeight) for ALL items
    // This denominator is fixed regardless of how many items are actually held
    const totalTheoreticalPoints = Object.values(stats.mappings).reduce((sum, m) => {
        return sum + (m.supply * m.yield_weight);
    }, 0);

    // 2. Reward Per Point
    const rewardPerPoint = totalTheoreticalPoints > 0 ? (distributablePot / totalTheoreticalPoints) : 0;

    return (
        <div className="space-y-8 pb-12">
            {/* 1. Treasury Header */}
            <div className="bg-gradient-to-r from-green-900/40 to-black border border-green-500/30 rounded-2xl p-8 flex items-center justify-between shadow-[0_0_50px_rgba(34,197,94,0.1)]">
                <div>
                    <h2 className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
                        <Wallet size={14} className="text-green-500" /> Treasury Vault
                    </h2>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black text-white font-mono tracking-tighter">
                            {stats.treasuryBalance.toFixed(4)}
                        </span>
                        <span className="text-green-500 font-bold text-xl">SOL</span>
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                        <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] text-green-400 font-mono uppercase font-bold">
                            Distributable: {distributablePot.toFixed(4)} SOL
                        </div>
                        <div className="text-gray-600 text-[10px] uppercase font-bold">
                            Reserve: {TREASURY_RESERVE} SOL
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <button
                        onClick={fetchStats}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors mb-4 inline-block"
                        title="Refresh Stats"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin text-white' : 'text-gray-500'} />
                    </button>
                    <div>
                        <span className="block text-3xl font-bold text-white mb-1">{stats.totalActiveUsers}</span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Active Earners</span>
                    </div>
                </div>
            </div>

            {/* 2. Global Stats Bar */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Total Network Points</div>
                    <div className="text-xl font-mono text-white">
                        {totalTheoreticalPoints.toLocaleString()} <span className="text-xs text-gray-600">pts</span>
                    </div>
                    <div className="text-[9px] text-gray-600 mt-1">Sum of (Supply × Yield)</div>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Value Per Point</div>
                    <div className="text-xl font-mono text-yellow-500">
                        {rewardPerPoint.toFixed(8)} <span className="text-xs text-yellow-500/50">SOL</span>
                    </div>
                    <div className="text-[9px] text-gray-600 mt-1">Pot / Total Points</div>
                </div>
                <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-1">Distribution Health</div>
                    <div className="text-xl font-mono text-blue-400">
                        100<span className="text-xs">%</span>
                    </div>
                    <div className="text-[9px] text-gray-600 mt-1">System Operational</div>
                </div>
            </div>

            {/* 3. Breakdown Table */}
            <div className={`overflow-hidden rounded-xl border border-white/10 bg-black/40 ${loading ? 'opacity-50' : ''}`}>
                <div className="grid grid-cols-12 bg-white/5 p-4 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                    <div className="col-span-4">Item (Yield Weight)</div>
                    <div className="col-span-2 text-right">Holders / Supply</div>
                    <div className="col-span-3 text-right">Payout Per Item</div>
                    <div className="col-span-3 text-right">Total Payout (Next Hr)</div>
                </div>

                <div className="max-h-[600px] overflow-y-auto divide-y divide-white/5">
                    {activeItems.map(item => {
                        const mapping = stats.mappings[item.id] || { supply: 1000, yield_weight: 0 };
                        const activeCount = stats.activeCounts[item.id] || 0;

                        // How much ONE item earns = Yield Weight * Reward Per Point
                        const earningsPerItem = mapping.yield_weight * rewardPerPoint;

                        // How much this item type pays out total = Active Count * Earnings Per Item
                        const totalPayoutForType = activeCount * earningsPerItem;

                        // What percentage of the supply is active?
                        const utilization = (activeCount / mapping.supply) * 100;

                        return (
                            <div key={item.id} className="grid grid-cols-12 p-4 items-center hover:bg-white/[0.02] transition-colors group">
                                {/* Item Info */}
                                <div className="col-span-4 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded flex items-center justify-center bg-white/5 border border-white/5 group-hover:border-white/20 transition-colors">
                                        <img src={item.image} className="w-8 h-8 object-contain" />
                                    </div>
                                    <div>
                                        <div className="text-white font-bold text-xs">{item.title}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-gray-500 font-mono">ID: {item.id}</span>
                                            <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-500 text-[10px] font-bold border border-yellow-500/20">
                                                {mapping.yield_weight} pts
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Supply Stats */}
                                <div className="col-span-2 text-right">
                                    <div className="text-white font-mono text-xs">
                                        {activeCount} <span className="text-gray-600">/ {mapping.supply}</span>
                                    </div>
                                    <div className="mt-1 w-full bg-gray-800 h-1 rounded-full overflow-hidden ml-auto max-w-[80px]">
                                        <div
                                            className={`h-full ${utilization > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                                            style={{ width: `${Math.min(utilization, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                {/* Per Item Earnings */}
                                <div className="col-span-3 text-right">
                                    <div className="text-green-400 font-mono font-bold text-xs">
                                        {earningsPerItem.toFixed(6)} SOL
                                    </div>
                                    <div className="text-[9px] text-gray-600 uppercase">Per Holder</div>
                                </div>

                                {/* Total Category Payout */}
                                <div className="col-span-3 text-right">
                                    <div className="text-white font-mono font-bold text-xs">
                                        {totalPayoutForType.toFixed(5)} SOL
                                    </div>
                                    <div className="text-[9px] text-gray-600 uppercase">
                                        {((totalPayoutForType / (distributablePot || 1)) * 100).toFixed(1)}% of Pot
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer Sum */}
                <div className="bg-white/5 p-4 flex justify-between items-center text-xs font-mono border-t border-white/10">
                    <span className="text-gray-500 uppercase tracking-widest font-bold">Total Projected Payout</span>
                    <span className="text-green-500 text-lg font-bold">
                        {activeItems.reduce((sum, item) => {
                            const mapping = stats.mappings[item.id] || { yield_weight: 0 };
                            return sum + ((stats.activeCounts[item.id] || 0) * mapping.yield_weight * rewardPerPoint);
                        }, 0).toFixed(4)} SOL
                    </span>
                </div>
            </div>
        </div>
    );
};

// --- 3. Links Management Component ---
const LinksManager = () => {
    const [links, setLinks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchLinks();
    }, []);

    const fetchLinks = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('dynamic_links')
            .select('*')
            .order('key');
        if (data) setLinks(data);
        setLoading(false);
    };

    const handleUpdate = (id, field, value) => {
        const newLinks = links.map(l => l.id === id ? { ...l, [field]: value } : l);
        setLinks(newLinks);
    };

    const saveChanges = async () => {
        setSaving(true);
        let errorOccurred = false;

        console.log("Saving links...", links);

        for (const link of links) {
            const { error } = await supabase
                .from('dynamic_links')
                .update({ url: link.url, label: link.label })
                .eq('id', link.id);

            if (error) {
                console.error("Error saving link:", link.key, error);
                errorOccurred = true;
            }
        }
        setSaving(false);

        if (errorOccurred) {
            alert('Some links failed to save. Check console for details.');
        } else {
            console.log("All links saved successfully.");
            alert('Links updated successfully!');
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white uppercase tracking-wider">Dynamic Links</h3>
                    <button
                        onClick={saveChanges}
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold uppercase text-xs tracking-wider transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                <div className="space-y-4">
                    {links.filter(l => l.key !== 'logo_redirect').map(link => (
                        <div key={link.id} className="grid grid-cols-12 gap-4 items-center bg-black/40 p-4 rounded-lg border border-white/5">
                            <div className="col-span-3">
                                <div className="text-xs text-gray-500 uppercase font-bold mb-1">Key</div>
                                <div className="text-sm font-mono text-blue-400">{link.key}</div>
                            </div>
                            <div className="col-span-3">
                                <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Label</label>
                                <input
                                    type="text"
                                    value={link.label || ''}
                                    onChange={(e) => handleUpdate(link.id, 'label', e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded px-3 py-1.5 text-sm text-gray-300 focus:border-blue-500 focus:outline-none"
                                />
                            </div>
                            <div className="col-span-6">
                                <label className="text-xs text-gray-500 uppercase font-bold mb-1 block">Destination URL</label>
                                <input
                                    type="text"
                                    value={link.url}
                                    onChange={(e) => handleUpdate(link.id, 'url', e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded px-3 py-1.5 text-sm text-white font-mono focus:border-green-500 focus:outline-none"
                                />
                            </div>
                        </div>
                    ))}

                    {links.length === 0 && !loading && (
                        <div className="text-center py-8 text-gray-500">
                            No links found. Run the <code>dynamic_links.sql</code> migration.
                        </div>
                    )}
                </div>
            </div>

            <div className="text-[10px] text-gray-600 italic">
                * Run the migration in Supabase to create the table first.
            </div>
        </div>
    );
};

export default AdminPanel;
