import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Users } from 'lucide-react';
import { useSolanaToken } from '../hooks/useSolanaToken';

const SolanaPanel = () => {
    const { price, marketCap, holders, loading } = useSolanaToken();

    const formatLargeNumber = (num) => {
        if (!num) return '$0';
        if (num >= 1e9) return '$' + (num / 1e9).toFixed(2) + 'B';
        if (num >= 1e6) return '$' + (num / 1e6).toFixed(2) + 'M';
        if (num >= 1e3) return '$' + (num / 1e3).toFixed(2) + 'K';
        return '$' + num.toFixed(2);
    };

    const truncateAddress = (addr) => {
        if (!addr) return '';
        return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
    };

    return (
        <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }}
            className="fixed left-8 top-24 bottom-auto w-80 bg-black/50 backdrop-blur-md border border-white/10 rounded-2xl z-30 flex flex-col overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]"
        >
            <div className="p-6 space-y-6">
                <div className="bg-black/40 rounded-xl p-4 border border-white/5 relative overflow-hidden group hover:border-red-500/30 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={14} className="text-green-500" />
                        <span className="text-gray-400 text-[10px] uppercase tracking-widest font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Market Cap (FDV)</span>
                    </div>
                    {loading ? (<div className="h-8 w-32 bg-white/10 animate-pulse rounded"></div>) : (
                        <div className="text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{formatLargeNumber(marketCap)}</div>
                    )}
                </div>
                <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-4">
                        <Users size={14} className="text-blue-500" />
                        <span className="text-gray-400 text-[10px] uppercase tracking-widest font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Top 5 Holders</span>
                    </div>
                    <div className="space-y-3">
                        {loading ? ([...Array(5)].map((_, i) => (<div key={i} className="flex justify-between items-center"><div className="h-3 w-20 bg-white/10 animate-pulse rounded"></div></div>))) : holders && holders.length > 0 ? (
                            holders.map((holder, idx) => (<div key={idx} className="flex items-center gap-2"><span className={`text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded ${idx === 0 ? 'bg-yellow-500 text-black' : 'bg-white/10 text-gray-400'}`}>{idx + 1}</span><span className="text-gray-300 text-xs font-mono">{truncateAddress(holder.address)}</span></div>))
                        ) : (<div className="text-gray-500 text-xs text-center py-2">Loading Holders...</div>)}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default SolanaPanel;
