import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Lock, ArrowLeft, RefreshCw, Database, Eye, EyeOff, Link, Coins, BarChart3, Send, CheckCircle, AlertCircle, Settings, Wallet } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useFeeDistribution } from '../hooks/useFeeDistribution';

const AdminPanel = ({ onClose, items }) => {
    const [activeTab, setActiveTab] = useState('management'); // 'management' | 'fees'
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

    const handleUnlock = (e) => {
        e.preventDefault();
        const code = import.meta.env.VITE_ADMIN_CODE;

        if (accessCode === code) {
            setIsUnlocked(true);
            setUnlockError(false);
        } else {
            setUnlockError(true);
            setAccessCode('');
            setTimeout(() => setUnlockError(false), 800);
        }
    };

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
                details[row.item_id] = {
                    ca: row.contract_address || '',
                    yield: row.yield || '',
                    supply: row.override_supply || '',
                    buyUrl: row.buy_url || ''
                };
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
                yield: details.yield || null,
                override_supply: details.supply || null,
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
        setItemDetails(prev => ({
            ...prev,
            [itemId]: {
                ...(prev[itemId] || { ca: '', yield: '', supply: '', buyUrl: '' }),
                [field]: value
            }
        }));
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
                yield: details.yield || null,
                override_supply: details.supply || null,
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
                    className="bg-black/80 border border-red-500/20 p-12 rounded-2xl max-w-md w-full text-center shadow-[0_0_50px_rgba(220,38,38,0.1)] relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-red-500/5 animate-pulse" />
                    <div className="relative z-10 flex flex-col items-center">
                        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
                            <Lock size={40} className="text-red-500" />
                        </div>
                        <h2 className="text-3xl font-bold uppercase tracking-widest mb-2 font-['Orbitron']">Admin Access</h2>
                        <p className="text-gray-500 text-sm mb-8 font-mono tracking-wider">SECURE ENVIRONMENT DETECTED</p>

                        <form onSubmit={handleUnlock} className="w-full">
                            <input
                                type="password"
                                value={accessCode}
                                onChange={(e) => {
                                    setAccessCode(e.target.value);
                                    setUnlockError(false);
                                }}
                                placeholder="ENTER SECURITY CODE"
                                className={`w-full bg-black/50 border ${unlockError ? 'border-red-500 text-red-500' : 'border-white/10 text-white'} rounded-xl px-6 py-4 text-center text-xl font-mono tracking-[0.5em] focus:outline-none focus:border-red-500 transition-all placeholder-gray-700 mb-6`}
                                autoFocus
                            />
                            <button
                                type="submit"
                                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl uppercase tracking-widest transition-all shadow-lg shadow-red-900/20"
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
                    {activeTab === 'management' ? (
                        <motion.div
                            key="management"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-2"
                        >
                            {/* Management Header */}
                            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-[10px] items-center uppercase text-gray-500 font-bold tracking-wider">
                                <div className="col-span-1">Preview</div>
                                <div className="col-span-2">Item Info</div>
                                <div className="col-span-3">Contract Address</div>
                                <div className="col-span-2">Stats (Yield/Supply)</div>
                                <div className="col-span-3">Buy Link</div>
                                <div className="col-span-1 text-right">Actions</div>
                            </div>

                            {items.map(item => {
                                const details = itemDetails[item.id] || { ca: '', yield: '', supply: '', buyUrl: '' };
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

                                        {/* 3. CA */}
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

                                        {/* 4. Stats */}
                                        <div className="col-span-2 space-y-1">
                                            <input
                                                type="text"
                                                placeholder="Yield"
                                                className="w-full bg-black/40 border border-white/5 rounded py-1 px-2 text-[10px] font-mono text-yellow-500 placeholder-gray-700 focus:outline-none focus:border-yellow-500/50"
                                                value={details.yield}
                                                onChange={(e) => updateField(item.id, 'yield', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                placeholder="Supply"
                                                className="w-full bg-black/40 border border-white/5 rounded py-1 px-2 text-[10px] font-mono text-blue-400 placeholder-gray-700 focus:outline-none focus:border-blue-500/50"
                                                value={details.supply}
                                                onChange={(e) => updateField(item.id, 'supply', e.target.value)}
                                            />
                                        </div>

                                        {/* 5. Link */}
                                        <div className="col-span-3">
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
                    ) : (
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
                </AnimatePresence>
            </div>
        </div>
    );
};

const FeeDashboard = ({ items, itemDetails }) => {
    const [stats, setStats] = useState({
        treasuryBalance: 0,
        activeCounts: {},
        totalActiveUsers: 0
    });
    const [loading, setLoading] = useState(true);

    const HOURLY_POT = 10; // Hardcoded global constant
    const TREASURY_WALLET = '967NP22RYpMydnMdtT7QF8f3oahZZx18hwULXcn9iadM';

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
        } else {
            console.warn('[AdminFees] Missing Moralis API Key');
        }

        // 2. Get User Inventory Counts
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
            totalActiveUsers: totalUsers
        });
        setLoading(false);
    };

    // --- Calculations ---
    const activeItems = items.filter(i => !itemDetails[i.id]?.hidden); // Assuming hiding logic passed down or handled
    // Recalculate Total Theoretical Points
    const totalPoints = activeItems.reduce((sum, item) => {
        const rawSupply = itemDetails[item.id]?.supply || item.supply || '1000/1000';
        const supplyStr = rawSupply.includes('/') ? rawSupply.split('/')[1] : rawSupply;
        const supply = parseInt(supplyStr || 1000);

        const weight = parseInt(itemDetails[item.id]?.yield || 0);
        return sum + (supply * weight);
    }, 0);

    const rewardPerPoint = totalPoints > 0 ? (HOURLY_POT / totalPoints) : 0;

    return (
        <div className="space-y-8">
            {/* 1. Treasury Header */}
            <div className="bg-gradient-to-r from-green-900/40 to-black border border-green-500/30 rounded-2xl p-8 flex items-center justify-between">
                <div>
                    <h2 className="text-gray-400 font-bold uppercase tracking-widest text-xs mb-2">Treasury Vault</h2>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-white font-mono tracking-tighter">
                            {stats.treasuryBalance.toFixed(4)}
                        </span>
                        <span className="text-green-500 font-bold">SOL</span>
                    </div>
                    <p className="text-green-500/50 text-[10px] mt-2 font-mono uppercase tracking-wider">
                        Next Hourly Pot Injection: +{HOURLY_POT} SOL
                    </p>
                </div>
                <div className="text-right">
                    <button
                        onClick={fetchStats}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin text-white' : 'text-gray-500'} />
                    </button>
                    <div className="mt-4 text-right">
                        <span className="block text-2xl font-bold text-white">{stats.totalActiveUsers}</span>
                        <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Active Earners</span>
                    </div>
                </div>
            </div>

            {/* 2. Breakdown Table */}
            <div className={`overflow-hidden rounded-xl border border-white/10 bg-black/40 ${loading ? 'opacity-50' : ''}`}>
                <div className="grid grid-cols-12 bg-white/5 p-4 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                    <div className="col-span-4">Item Name / Yield</div>
                    <div className="col-span-3 text-right">Theoretical Max (Per Item)</div>
                    <div className="col-span-2 text-center">Active Users</div>
                    <div className="col-span-3 text-right">Current Hourly Breakdown</div>
                </div>

                <div className="max-h-[500px] overflow-y-auto">
                    {activeItems.map(item => {
                        const details = itemDetails[item.id] || {};
                        const weight = parseInt(details.yield || 0);
                        const activeCount = stats.activeCounts[item.id] || 0;

                        // Theoretical: The amount ONE item *could* earn if all existed
                        const theoreticalShare = rewardPerPoint * weight;

                        // Current Payout: Theoretical * Active Count
                        const currentPayout = theoreticalShare * activeCount;

                        return (
                            <div key={item.id} className="grid grid-cols-12 p-4 border-b border-white/5 items-center hover:bg-white/[0.02] transition-colors">
                                <div className="col-span-4 flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded flex items-center justify-center bg-white/5 border border-white/5`}>
                                        <img src={item.image} className="w-6 h-6 object-contain" />
                                    </div>
                                    <div>
                                        <div className="text-white font-bold text-xs">{item.title}</div>
                                        <div className="text-gray-600 text-[10px] font-mono mt-0.5">Weight: <span className="text-yellow-500">{weight}</span></div>
                                    </div>
                                </div>

                                <div className="col-span-3 text-right">
                                    <div className="text-gray-400 font-mono text-xs">{theoreticalShare.toFixed(6)} SOL</div>
                                    <div className="text-[9px] text-gray-600 uppercase">Max / Hr</div>
                                </div>

                                <div className="col-span-2 text-center">
                                    <div className={`inline-block px-2 py-1 rounded text-[10px] font-bold ${activeCount > 0 ? 'bg-blue-900/30 text-blue-400' : 'bg-gray-800 text-gray-600'}`}>
                                        {activeCount}
                                    </div>
                                </div>

                                <div className="col-span-3 text-right">
                                    <div className="text-green-400 font-mono font-bold text-xs">
                                        {currentPayout.toFixed(5)} SOL
                                    </div>
                                    <div className="text-[9px] text-green-900/60 uppercase">Total Burn</div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Summary Footer */}
                <div className="bg-white/5 p-4 flex justify-between items-center text-xs font-mono border-t border-white/10">
                    <span className="text-gray-500">Universal Rate (Per 1.0 Weight): <span className="text-white">{rewardPerPoint.toFixed(8)} SOL</span></span>
                    <span className="text-green-500">Total Hourly Output: <span className="font-bold text-white">
                        {activeItems.reduce((sum, item) => {
                            const weight = parseInt(itemDetails[item.id]?.yield || 0);
                            return sum + (rewardPerPoint * weight * (stats.activeCounts[item.id] || 0));
                        }, 0).toFixed(4)} SOL
                    </span></span>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
