import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Lock, ArrowLeft, RefreshCw, Database, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabaseClient';

const AdminPanel = ({ onClose, items }) => {
    const [mappings, setMappings] = useState({});
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
            const map = {};
            const hidden = {};
            data.forEach(row => {
                map[row.item_id] = row.contract_address;
                hidden[row.item_id] = row.hidden || false;
            });
            setMappings(map);
            setHiddenItems(hidden);
        }
        setLoading(false);
    };

    const handleSave = async (itemId, ca, hidden) => {
        setSaving(true);
        setStatusMsg('Saving...');

        // Upsert the mapping with hidden status
        const { error } = await supabase
            .from('item_mappings')
            .upsert({
                item_id: itemId,
                contract_address: ca || null,
                hidden: hidden || false
            }, { onConflict: 'item_id' });

        if (error) {
            console.error('Error saving mapping:', error);
            setStatusMsg('Failed to save');
        } else {
            setStatusMsg('Saved!');
            setMappings(prev => ({ ...prev, [itemId]: ca }));
            setHiddenItems(prev => ({ ...prev, [itemId]: hidden }));
            setTimeout(() => setStatusMsg(''), 2000);
        }
        setSaving(false);
    };

    const toggleHidden = async (itemId) => {
        const newHidden = !hiddenItems[itemId];
        setHiddenItems(prev => ({ ...prev, [itemId]: newHidden }));
        await handleSave(itemId, mappings[itemId], newHidden);
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
            <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
                <div className="grid grid-cols-1 gap-4">
                    {items.map(item => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`bg-white/5 border rounded-xl p-4 flex items-center gap-4 transition-colors ${hiddenItems[item.id]
                                    ? 'border-yellow-500/30 bg-yellow-500/5 opacity-60'
                                    : 'border-white/10 hover:border-red-500/20'
                                }`}
                        >
                            {/* Item Info */}
                            <div className="w-16 h-16 bg-black/40 rounded-lg p-2 flex items-center justify-center border border-white/5">
                                <img src={item.image} alt={item.title} className="max-w-full max-h-full object-contain" />
                            </div>

                            <div className="w-48">
                                <h3 className="font-bold text-sm uppercase tracking-wide">{item.title}</h3>
                                <p className="text-xs text-gray-500 font-mono">{item.id}</p>
                                {hiddenItems[item.id] && (
                                    <span className="text-[10px] text-yellow-500 uppercase tracking-wider">Hidden</span>
                                )}
                            </div>

                            {/* Hide Toggle */}
                            <button
                                onClick={() => toggleHidden(item.id)}
                                className={`p-2 rounded-lg transition-all border ${hiddenItems[item.id]
                                        ? 'bg-yellow-600/20 border-yellow-600/30 text-yellow-500 hover:bg-yellow-600 hover:text-white'
                                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                                    }`}
                                title={hiddenItems[item.id] ? 'Show in Marketplace' : 'Hide from Marketplace'}
                            >
                                {hiddenItems[item.id] ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>

                            {/* Input Area */}
                            <div className="flex-1 flex items-center gap-2">
                                <div className="flex-1 relative">
                                    <Database size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                    <input
                                        type="text"
                                        placeholder="Solana Contract Address (CA)"
                                        className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs font-mono text-green-400 placeholder-gray-700 focus:outline-none focus:border-red-500 transition-colors"
                                        value={mappings[item.id] || ''}
                                        onChange={(e) => setMappings(prev => ({ ...prev, [item.id]: e.target.value }))}
                                    />
                                </div>
                                <button
                                    onClick={() => handleSave(item.id, mappings[item.id], hiddenItems[item.id])}
                                    disabled={saving}
                                    className="p-2 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white rounded-lg transition-all border border-red-600/30"
                                >
                                    <Save size={18} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
