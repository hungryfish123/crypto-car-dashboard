import React from 'react';
import { motion } from 'framer-motion';
import { Zap, Package } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';
import SolanaPanel from './SolanaPanel';

const GarageHUD = ({ carColor, setActivePage, inventory = [], equippedParts = {}, equipItem, setDraggedItem, draggedItem }) => {
    const { playHover } = useAudio();

    const getRarityStyles = (level) => {
        switch (level) {
            case 1: return 'bg-gray-500';
            case 2: return 'bg-green-500';
            case 3: return 'bg-blue-500';
            case 4: return 'bg-purple-500';
            case 5: return 'bg-yellow-500';
            case 6: case 7: return 'rainbow-button';
            default: return 'bg-gray-500';
        }
    };

    const marketWatch = [
        { id: 'special_nitro', title: 'Nitro Boost System', price: '100,000 CR', image: '/nitro boost.png', rarityLevel: 7 },
        { id: 'special_brakes', title: 'Ceramic Brembo Brakes', price: '35,000 CR', image: '/ceramic breaks.png', rarityLevel: 6 },
    ];

    return (
        <>
            <SolanaPanel />
            <motion.div
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.2 }}
                className="fixed right-8 top-24 bottom-32 w-[450px] bg-black/50 backdrop-blur-md border-l border-white/10 rounded-2xl z-30 flex flex-col overflow-hidden"
            >
                <div className="p-4 border-b border-white/10 max-h-[120px]">
                    <h3 className="text-red-500 text-xs font-bold tracking-[0.2em] mb-3 flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                        <Zap size={14} className="text-red-500" />
                        MARKET WATCH
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {marketWatch.map((item) => (
                            <div key={item.id} onClick={() => setActivePage('Marketplace')} onMouseEnter={playHover}
                                className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/5 hover:border-red-500/30 hover:bg-white/10 transition-all cursor-pointer group">
                                <div className="w-12 h-12 rounded-lg bg-black/40 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    <img src={item.image} alt={item.title} className="w-full h-full object-contain" onError={(e) => e.target.style.display = 'none'} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white text-[10px] font-bold truncate group-hover:text-red-400 transition-colors uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{item.title}</h4>
                                    <p className="text-green-400 text-[10px] font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{item.price}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex-1 overflow-hidden flex flex-col">
                    <h3 className="px-4 pt-4 text-red-500 text-xs font-bold tracking-[0.2em] mb-2 flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                        <Package size={14} className="text-red-500" />
                        MY INVENTORY ({inventory.length})
                    </h3>
                    {inventory.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <Package size={48} className="text-gray-700 mb-4" />
                            <p className="text-gray-500 text-sm uppercase font-bold tracking-wider" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Garage Empty</p>
                            <button onClick={() => setActivePage('Marketplace')} className="mt-4 px-6 py-3 bg-red-600 hover:bg-red-500 text-white text-sm font-bold uppercase tracking-wider rounded-lg transition-colors" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Visit Marketplace</button>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-4" style={{ scrollbarWidth: 'none' }}>
                            <div className="grid grid-cols-2 gap-4">
                                {inventory.map((item) => {
                                    const rarityLabels = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'LEGENDARY', 'GOD TIER'];
                                    const rarityLabel = rarityLabels[Math.min(item.rarityLevel - 1, 6)] || 'COMMON';
                                    const isBeingDragged = draggedItem && draggedItem.id === item.id;
                                    const getRarityBorder = (level) => {
                                        switch (level) {
                                            case 1: return 'border-white/10 hover:border-gray-400';
                                            case 2: return 'border-green-500/20 hover:border-green-500';
                                            case 3: return 'border-blue-500/20 hover:border-blue-500';
                                            case 4: return 'border-purple-500/20 hover:border-purple-500';
                                            case 5: return 'border-yellow-500/20 hover:border-yellow-500';
                                            case 6: case 7: return 'border-red-500/20 hover:border-red-500';
                                            default: return 'border-white/10 hover:border-white/30';
                                        }
                                    };
                                    return (
                                        <div key={item.id} draggable="true"
                                            onDragStart={(e) => { if (setDraggedItem) setDraggedItem(item); e.dataTransfer.setData('item', JSON.stringify(item)); e.dataTransfer.effectAllowed = 'move'; }}
                                            onDragEnd={() => { if (setDraggedItem) setDraggedItem(null); }}
                                            onMouseEnter={playHover}
                                            className={`aspect-square bg-white/5 border ${getRarityBorder(item.rarityLevel)} rounded-xl relative overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-200 hover:scale-105 group ${isBeingDragged ? 'opacity-40 border-dashed scale-95 grayscale' : ''}`}>
                                            <div className={`absolute top-2 right-2 px-2 py-1 text-[9px] font-bold uppercase tracking-wider rounded ${getRarityStyles(item.rarityLevel)} text-white z-10`}>{rarityLabel}</div>
                                            <div className="h-[75%] w-full flex items-center justify-center p-1">
                                                <img src={item.image?.startsWith('/') ? item.image : `/${item.image}`} alt={item.title} draggable="false" className="w-full h-full object-contain drop-shadow-md p-1 group-hover:scale-110 transition-transform duration-200 pointer-events-none" onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text fill="%23666" font-size="12" x="50" y="55" text-anchor="middle">No Image</text></svg>'; }} />
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col items-center justify-end h-[35%]">
                                                <h4 className="text-white text-sm font-bold uppercase text-center truncate w-full leading-tight" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{item.title}</h4>
                                                {item.cashback && (<div className="text-[10px] text-green-400 font-bold mt-0.5" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{item.cashback} Yield</div>)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>
        </>
    );
};

export default GarageHUD;
