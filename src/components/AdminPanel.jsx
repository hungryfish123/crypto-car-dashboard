import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Lock, ArrowLeft, RefreshCw, Database, Eye, EyeOff, Link, Coins, BarChart3 } from 'lucide-react';
import { supabase } from '../supabaseClient';

const AdminPanel = ({ onClose, items }) => {
    const [itemDetails, setItemDetails] = useState({});
    const [hiddenItems, setHiddenItems] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [statusMsg, setStatusMsg] = useState('');

    useEffect(() => {
        fetchMappings();
    }, []);

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
                <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500 font-mono">{statusMsg}</span>
                    <button onClick={fetchMappings} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 max-w-6xl mx-auto w-full">
                <div className="grid grid-cols-1 gap-6">
                    {items.map(item => {
                        const details = itemDetails[item.id] || { ca: '', yield: '', supply: '', buyUrl: '' };
                        const isHidden = hiddenItems[item.id];

                        return (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`bg-white/5 border rounded-xl p-6 flex flex-col gap-4 transition-colors ${isHidden
                                    ? 'border-yellow-500/30 bg-yellow-500/5 opacity-60'
                                    : 'border-white/10 hover:border-red-500/20'
                                    }`}
                            >
                                {/* Row 1: Item Info & Action Buttons */}
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 bg-black/40 rounded-lg p-2 flex items-center justify-center border border-white/5">
                                        <img src={item.image} alt={item.title} className="max-w-full max-h-full object-contain" />
                                    </div>

                                    <div className="w-48">
                                        <h3 className="font-bold text-sm uppercase tracking-wide">{item.title}</h3>
                                        <p className="text-xs text-gray-500 font-mono">{item.id}</p>
                                        {isHidden && (
                                            <span className="text-[10px] text-yellow-500 uppercase tracking-wider">Hidden</span>
                                        )}
                                    </div>

                                    <div className="flex-1"></div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => toggleHidden(item.id)}
                                            className={`p-3 rounded-lg transition-all border ${isHidden
                                                ? 'bg-yellow-600/20 border-yellow-600/30 text-yellow-500 hover:bg-yellow-600 hover:text-white'
                                                : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                                                }`}
                                            title={isHidden ? 'Show in Marketplace' : 'Hide from Marketplace'}
                                        >
                                            {isHidden ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </button>
                                        <button
                                            onClick={() => handleSave(item.id)}
                                            disabled={saving}
                                            className="p-3 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-lg transition-all border border-red-600/30 flex items-center gap-2"
                                        >
                                            <Save size={20} />
                                            <span className="text-xs font-bold uppercase">Save Updates</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Row 2: Inputs Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* CA Input */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-gray-500 uppercase font-bold px-1">Contract Address (CA)</label>
                                        <div className="relative">
                                            <Database size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                            <input
                                                type="text"
                                                placeholder="Solana CA"
                                                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs font-mono text-green-400 placeholder-gray-700 focus:outline-none focus:border-red-500 transition-colors"
                                                value={details.ca}
                                                onChange={(e) => updateField(item.id, 'ca', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Yield Input */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-gray-500 uppercase font-bold px-1">Yield / Daily Earn</label>
                                        <div className="relative">
                                            <Coins size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                            <input
                                                type="text"
                                                placeholder="e.g. +5% or 100 $GEAR"
                                                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs font-mono text-yellow-500 placeholder-gray-700 focus:outline-none focus:border-yellow-500/50 transition-colors"
                                                value={details.yield}
                                                onChange={(e) => updateField(item.id, 'yield', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Supply Input */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-gray-500 uppercase font-bold px-1">Supply Override</label>
                                        <div className="relative">
                                            <BarChart3 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                            <input
                                                type="text"
                                                placeholder="e.g. 100/1000"
                                                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs font-mono text-blue-400 placeholder-gray-700 focus:outline-none focus:border-blue-500/50 transition-colors"
                                                value={details.supply}
                                                onChange={(e) => updateField(item.id, 'supply', e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Buy Link Input */}
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[10px] text-gray-500 uppercase font-bold px-1">Buy URL (Direct Link)</label>
                                        <div className="relative">
                                            <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                            <input
                                                type="text"
                                                placeholder="https://..."
                                                className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs font-mono text-pink-400 placeholder-gray-700 focus:outline-none focus:border-pink-500/50 transition-colors"
                                                value={details.buyUrl}
                                                onChange={(e) => updateField(item.id, 'buyUrl', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
