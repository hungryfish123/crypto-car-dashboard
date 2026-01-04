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
                            className="max-w-4xl mx-auto"
                        >
                            {/* Fee Distribution Logic */}
                            <div className="bg-gradient-to-br from-green-900/20 to-green-900/5 border border-green-500/30 rounded-xl p-8 mb-8">
                                <h2 className="text-xl font-bold text-green-400 uppercase tracking-widest mb-6 flex items-center gap-3" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                                    <Wallet size={24} />
                                    Revenue Distribution
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                    <div className="space-y-4">
                                        <label className="text-xs text-green-400/80 uppercase font-bold tracking-wider">Total Fees Collected (SOL)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-green-500 font-bold">◎</span>
                                            <input
                                                type="number"
                                                step="0.001"
                                                min="0"
                                                placeholder="0.00"
                                                value={feeAmount}
                                                onChange={(e) => setFeeAmount(e.target.value)}
                                                className="w-full bg-black/60 border border-green-500/50 rounded-xl py-4 pl-10 pr-4 text-2xl font-mono text-white placeholder-gray-700 focus:outline-none focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all font-bold"
                                            />
                                        </div>
                                        <p className="text-[10px] text-gray-500">
                                            This amount will be split among the <span className="text-white font-bold">{activeItems.length} active items</span> based on their rarity weight and supply.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs text-gray-400 uppercase font-bold tracking-wider">Distribution Note</label>
                                        <textarea
                                            value={distributionNotes}
                                            onChange={(e) => setDistributionNotes(e.target.value)}
                                            placeholder="e.g. Weekly Royale Revenue Distribution #42..."
                                            className="w-full h-full min-h-[100px] bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-white/20 resize-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={async () => {
                                        if (!feeAmount || parseFloat(feeAmount) <= 0) {
                                            alert('Please enter a valid fee amount');
                                            return;
                                        }
                                        if (confirm(`Are you sure you want to distribute ${feeAmount} SOL to ${activeItems.length} item types? This action cannot be undone.`)) {
                                            await distributeFees(parseFloat(feeAmount), null, distributionNotes || null);
                                        }
                                    }}
                                    disabled={distributing || !feeAmount}
                                    className={`w-full py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-sm transition-all flex items-center justify-center gap-3 relative overflow-hidden group ${distributing
                                        ? 'bg-green-900/30 text-green-500/50 cursor-wait'
                                        : 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_30px_rgba(34,197,94,0.3)]'
                                        }`}
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                                    {distributing ? (
                                        <>
                                            <RefreshCw size={20} className="animate-spin" />
                                            Allocating Rewards...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={20} />
                                            Distribute Now
                                        </>
                                    )}
                                </button>

                                {/* Feedback Messages */}
                                {lastResult && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start gap-4"
                                    >
                                        <CheckCircle size={24} className="text-green-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-green-400 font-bold text-sm uppercase tracking-wider mb-1">Distribution Successful</p>
                                            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs font-mono text-green-300/70">
                                                <span>Total Distributed: <b className="text-white">{lastResult.total_distributed} SOL</b></span>
                                                <span>Users Rewarded: <b className="text-white">{lastResult.users_affected}</b></span>
                                                <span className="col-span-2 text-[10px] opacity-50 mt-1">Transaction ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {distributionError && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-4"
                                    >
                                        <AlertCircle size={24} className="text-red-500 flex-shrink-0" />
                                        <div>
                                            <p className="text-red-400 font-bold text-sm uppercase tracking-wider">Distribution Failed</p>
                                            <p className="text-red-400/70 text-xs font-mono mt-1">{distributionError}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* Active Items List */}
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 pl-2">
                                Active Token Pool ({activeItems.length})
                            </h3>

                            <div className="space-y-2">
                                {activeItems.map(item => (
                                    <div key={item.id} className="bg-white/5 border border-white/5 rounded-lg p-3 flex items-center gap-4 hover:bg-white/[0.07] transition-colors">
                                        <div className="w-10 h-10 bg-black/40 rounded p-1 flex items-center justify-center border border-white/5">
                                            <img src={item.image} alt={item.title} className="max-w-full max-h-full object-contain" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-xs font-bold text-white uppercase">{item.title}</h4>
                                            <div className="flex gap-3 text-[10px] text-gray-500 font-mono mt-0.5">
                                                <span>Level {item.rarityLevel || '?'}</span>
                                                <span>Supply: {item.supply}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] text-green-500 font-bold uppercase tracking-wider bg-green-900/20 px-2 py-1 rounded border border-green-900/30">
                                                Eligible for Fees
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default AdminPanel;
