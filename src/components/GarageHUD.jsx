import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Zap, Package, X } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';
import SolanaPanel from './SolanaPanel';
import InteractiveLogo from './InteractiveLogo';
import { supabase } from '../supabaseClient';
import { MARKETPLACE_ITEMS } from '../data/marketplaceItems';

const GarageHUD = ({ carColor, setActivePage, inventory = [], equippedParts = {}, equipItem, unequipItem, setDraggedItem, draggedItem, earnings, pendingRewards, hourlyEarnings, onRewardsClaimed, currentCarModel, onNavigateToItem }) => {
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

    const [modItems, setModItems] = useState([]);

    useEffect(() => {
        const fetchVisibleItems = async () => {
            const { data: mappings } = await supabase.from('item_mappings').select('*');
            const hiddenIds = mappings ? mappings.filter(m => m.hidden).map(m => m.item_id) : [];

            // Filter all marketplace items that are NOT hidden AND NOT Cars
            const visibleItems = MARKETPLACE_ITEMS.filter(item => !hiddenIds.includes(item.id) && item.category !== 'Cars');

            // Prefer showing 'Special' mods first, or just take the last few
            const specials = visibleItems.filter(item => item.category === 'Special');
            const displayItems = specials.length >= 2 ? specials.slice(-2) : visibleItems.slice(-2);

            setModItems(displayItems);
        };

        fetchVisibleItems();
    }, []);

    return (
        <>
            <div className="fixed left-8 top-6 z-40 flex items-center gap-4">
                <InteractiveLogo color={carColor} />

                {/* X Logo with hover effect */}
                <a
                    href="https://x.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative group cursor-pointer h-7 w-7"
                >
                    {/* White X Logo (default) */}
                    <img
                        src="/x-logo-white.png"
                        alt="Follow us on X"
                        className="h-full w-full object-contain absolute top-0 left-0 transition-opacity duration-200 group-hover:opacity-0"
                    />
                    {/* Red X Logo (hover) */}
                    <img
                        src="/x-logo-red.png"
                        alt="Follow us on X"
                        className="h-full w-full object-contain absolute top-0 left-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                    />
                </a>
            </div>

            <SolanaPanel
                earnings={earnings}
                pendingRewards={pendingRewards}
                hourlyEarnings={hourlyEarnings}
                onRewardsClaimed={onRewardsClaimed}
                currentCarModel={currentCarModel}
                equippedParts={equippedParts}
                carColor={carColor}
            />
            <motion.div
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.2 }}
                className="fixed right-8 top-24 bottom-32 w-[450px] bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl z-30 flex flex-col overflow-hidden shadow-2xl shadow-black/50"
            >
                <div className="p-4 py-5">
                    <h3 className="text-red-500 text-base font-bold tracking-[0.2em] mb-4 uppercase" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                        NEW MODS
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        {modItems.map((item) => {
                            const rarityLabels = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'LEGENDARY', 'GOD TIER'];
                            const rarityLabel = rarityLabels[Math.min(item.rarityLevel - 1, 6)] || 'COMMON';
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
                                <div key={item.id} onClick={() => onNavigateToItem && onNavigateToItem(item)} onMouseEnter={playHover}
                                    className={`h-36 bg-white/5 border ${getRarityBorder(item.rarityLevel)} rounded-xl relative overflow-hidden cursor-pointer active:scale-95 transition-all duration-200 hover:scale-105 group`}>

                                    {/* Rarity Label (Top Right) */}
                                    <div className={`absolute top-2 right-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-white/20 shadow-md ${getRarityStyles(item.rarityLevel)} text-white z-10`} style={{ fontFamily: 'Orbitron, sans-serif' }}>{rarityLabel}</div>

                                    {/* Full image - takes entire space */}
                                    <div className="h-full w-full flex items-center justify-center p-3">
                                        <img src={item.image} alt={item.title} className="w-full h-full object-contain drop-shadow-md transition-transform duration-200 group-hover:scale-110 pointer-events-none" onError={(e) => e.target.style.display = 'none'} />
                                    </div>

                                    {/* Hover Panel - Slides up from bottom */}
                                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/95 to-transparent flex flex-col items-center justify-end translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out h-1/2">
                                        <h4 className="text-white text-xs font-bold uppercase text-center truncate w-full leading-tight" style={{ fontFamily: 'Orbitron, sans-serif' }}>{item.title}</h4>
                                        <div className="text-[10px] text-red-500 font-bold mt-1 uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>{item.cashback} Yield</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div >
                </div >

                {/* Shortened centered divider */}
                < div className="h-px w-[85%] mx-auto bg-white/10 shrink-0" ></div >

                <div className="flex-1 overflow-hidden flex flex-col relative">
                    <h3 className="px-4 pt-4 text-red-500 text-base font-bold tracking-[0.2em] mb-4 uppercase" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                        MY INVENTORY ({inventory.length})
                    </h3>

                    {/* Inventory List - Wraps in a container that leaves space for the bottom button */}
                    <div className="flex-1 flex flex-col p-4 pb-20 scrollbar-hide">
                        {inventory.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                                <Package size={64} strokeWidth={1.5} className="text-gray-500 mb-6" />
                                <p className="text-gray-400 text-base uppercase font-bold tracking-[0.3em]" style={{ fontFamily: 'Orbitron, sans-serif' }}>Garage Empty</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                {inventory.map((item) => {
                                    // Check if item is currently equipped on THIS car
                                    const isEquipped = Object.values(equippedParts).some(p => p && p.id === item.id);

                                    const rarityLabels = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'LEGENDARY', 'GOD TIER'];
                                    const rarityLabel = rarityLabels[Math.min(item.rarityLevel - 1, 6)] || 'COMMON';
                                    const isBeingDragged = draggedItem && draggedItem.id === item.id;
                                    const getRarityBorder = (level) => {
                                        if (isEquipped) return 'border-red-500/50 hover:border-red-500 shadow-[0_0_15px_rgba(220,38,38,0.3)]';
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
                                        <div key={item.id} draggable={!isEquipped}
                                            onDragStart={(e) => {
                                                if (isEquipped) { e.preventDefault(); return; }
                                                if (setDraggedItem) setDraggedItem(item);
                                                e.dataTransfer.setData('item', JSON.stringify(item));
                                                e.dataTransfer.effectAllowed = 'move';
                                            }}
                                            onDragEnd={() => { if (setDraggedItem) setDraggedItem(null); }}
                                            onMouseEnter={playHover}
                                            className={`aspect-square bg-white/5 border ${getRarityBorder(item.rarityLevel)} rounded-xl relative overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-200 hover:scale-105 group ${isBeingDragged ? 'opacity-40 border-dashed scale-95 grayscale' : ''} ${isEquipped ? 'cursor-default ring-1 ring-red-500/50' : ''}`}>

                                            {/* Rarity Label (Top Right) */}
                                            <div className={`absolute top-2 right-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-white/20 shadow-md ${getRarityStyles(item.rarityLevel)} text-white z-10`} style={{ fontFamily: 'Orbitron, sans-serif' }}>{rarityLabel}</div>

                                            {/* Minimal Remove Icon (Top Left) - Only if equipped */}
                                            {isEquipped && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); unequipItem(item); }}
                                                    className="absolute top-2 left-2 w-5 h-5 flex items-center justify-center bg-red-600/80 hover:bg-red-500 rounded text-white shadow-lg transition-transform hover:scale-110 z-20 group-hover:opacity-100"
                                                    title="Unequip"
                                                >
                                                    <X size={12} strokeWidth={3} />
                                                </button>
                                            )}

                                            <div className="h-[75%] w-full flex items-center justify-center p-1">
                                                <img src={item.image?.startsWith('/') ? item.image : `/${item.image}`} alt={item.title} draggable="false" className={`w-full h-full object-contain drop-shadow-md p-1 transition-transform duration-200 pointer-events-none ${isEquipped ? '' : 'group-hover:scale-110'}`} onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text fill="%23666" font-size="12" x="50" y="55" text-anchor="middle">No Image</text></svg>'; }} />
                                            </div>

                                            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col items-center justify-end h-[35%]">
                                                <h4 className={`text-white text-sm font-bold uppercase text-center truncate w-full leading-tight ${isEquipped ? 'text-red-400' : ''}`} style={{ fontFamily: 'Orbitron, sans-serif' }}>{item.title}</h4>
                                                {item.cashback && (<div className="text-[10px] text-green-400 font-bold mt-0.5" style={{ fontFamily: 'Orbitron, sans-serif' }}>{item.cashback} Yield</div>)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Fixed 'Visit Marketplace' Button Overlay */}
                    <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black/90 to-transparent pt-12 pointer-events-none flex justify-center z-10">
                        <button
                            onClick={() => setActivePage('Marketplace')}
                            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white text-sm font-bold uppercase tracking-wider rounded-lg transition-all shadow-lg hover:shadow-red-900/50 pointer-events-auto"
                            style={{ fontFamily: 'Orbitron, sans-serif' }}
                        >
                            Visit Marketplace
                        </button>
                    </div>
                </div>
            </motion.div >
        </>
    );
};

export default GarageHUD;
