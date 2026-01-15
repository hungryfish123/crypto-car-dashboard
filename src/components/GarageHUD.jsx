import React, { useState, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { Zap, Package, X } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';
import SolanaPanel from './SolanaPanel';
import InteractiveLogo from './InteractiveLogo';
import { supabase } from '../supabaseClient';
import { MARKETPLACE_ITEMS } from '../data/marketplaceItems';

import { useDynamicLinks } from '../hooks/useDynamicLinks';

// Individual Inventory Item Component - handles hover state for equipped/unequipped items
const InventoryItem = ({ item, isEquipped, isBeingDragged, rarityLabel, setDraggedItem, playHover, getRarityBorder, getRarityStyles }) => {
    const [isHovered, setIsHovered] = useState(false);

    // Show overlay only when hovered AND not being dragged
    const showOverlay = isHovered && !isBeingDragged;

    return (
        <div
            draggable={!isEquipped}
            onDragStart={(e) => {
                if (isEquipped) { e.preventDefault(); return; }
                if (setDraggedItem) setDraggedItem(item);
                e.dataTransfer.setData('item', JSON.stringify(item));
                e.dataTransfer.effectAllowed = 'move';
                setIsHovered(false); // Clear hover when dragging starts
            }}
            onDragEnd={() => { if (setDraggedItem) setDraggedItem(null); }}
            onMouseEnter={() => { if (!isBeingDragged) { playHover(); setIsHovered(true); } }}
            onMouseLeave={() => setIsHovered(false)}
            className={`aspect-square bg-white/5 border ${getRarityBorder(item.rarityLevel)} rounded-xl relative overflow-hidden cursor-grab active:cursor-grabbing transition-all duration-200 hover:scale-105 ${isBeingDragged ? 'opacity-40 border-dashed scale-95 grayscale' : ''} ${isEquipped ? 'cursor-default' : ''}`}
        >
            {/* Rarity Label (Top Right) */}
            <div className={`absolute top-2 right-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-white/20 shadow-md ${getRarityStyles(item.rarityLevel)} text-white z-10`} style={{ fontFamily: 'Orbitron, sans-serif' }}>{rarityLabel}</div>

            {/* Content Container */}
            <div className="absolute inset-0 flex items-center justify-center p-6 pb-12 transition-all duration-200">
                <img
                    src={item.image?.startsWith('/') ? item.image : `/${item.image}`}
                    alt={item.title}
                    draggable="false"
                    className="w-full h-full object-contain drop-shadow-md transition-transform duration-200 pointer-events-none"
                    loading="lazy"
                    onError={(e) => { e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect fill="%23333" width="100" height="100"/><text fill="%23666" font-size="12" x="50" y="55" text-anchor="middle">No Image</text></svg>'; }}
                />
            </div>

            {/* Title Area */}
            <div className="absolute bottom-0 left-0 right-0 p-3 pb-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent flex flex-col items-center justify-end h-[40%] transition-all duration-200">
                <h4 className="text-white text-sm font-bold uppercase text-center truncate w-full leading-tight" style={{ fontFamily: 'Orbitron, sans-serif' }}>{item.title}</h4>
            </div>

            {/* Hover Overlay - Shows on hover (not while dragging) */}
            {showOverlay && (
                <div
                    className="absolute inset-0 flex items-center justify-center z-20 rounded-xl"
                    style={{
                        backgroundColor: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)'
                    }}
                >
                    <span
                        className="text-white text-sm font-black uppercase tracking-wider text-center px-2"
                        style={{
                            fontFamily: 'Orbitron, sans-serif',
                            textShadow: '0 2px 6px rgba(0,0,0,0.8)'
                        }}
                    >
                        {isEquipped ? (
                            <>ALREADY<br />EQUIPPED</>
                        ) : (
                            <>DRAG TO<br />EQUIP</>
                        )}
                    </span>
                </div>
            )}
        </div>
    );
};

const GarageHUD = ({ carColor, setActivePage, inventory = [], equippedParts = {}, allEquippedParts = {}, equipItem, unequipItem, setDraggedItem, draggedItem, pendingRewards, totalEarned, hourlyRate, claimRewards, rewardsLoading, rewardsClaimError, rewardsClaimSuccess, hourlyEarnings, onRewardsClaimed, currentCarModel, onNavigateToItem, username = '' }) => {
    const { links } = useDynamicLinks();
    const { playHover } = useAudio();

    const getRarityStyles = (level) => {
        switch (level) {
            case 1: return 'bg-gray-500';
            case 2: return 'bg-green-500';
            case 3: return 'bg-blue-500';
            case 4: return 'bg-purple-500';
            case 5: return 'bg-yellow-500';
            case 6: case 7: return 'rainbow-bg';
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

    // Shared Rarity Border Logic
    const getRarityBorder = (level) => {
        switch (level) {
            case 1: return 'border-white/20 hover:border-gray-400';
            case 2: return 'border-green-500/50 hover:border-green-500';
            case 3: return 'border-blue-500/50 hover:border-blue-500';
            case 4: return 'border-purple-500/50 hover:border-purple-500';
            case 5: return 'border-yellow-500/50 hover:border-yellow-500';
            case 6: case 7: return 'rainbow-border-subtle border-transparent'; // Special
            default: return 'border-white/20 hover:border-white/50';
        }
    };

    return (
        <>
            <div className="fixed left-8 top-6 z-40 flex items-center gap-4">
                <InteractiveLogo color={carColor} />

                {/* X Logo with hover effect */}
                <a
                    href={links.social_x}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block relative group cursor-pointer h-7 w-7"
                >
                    {/* White X Logo (default) */}
                    <img
                        src="/x-logo-white.webp"
                        alt="Follow us on X"
                        className="h-full w-full object-contain absolute top-0 left-0 transition-opacity duration-200 group-hover:opacity-0"
                        loading="lazy"
                    />
                    {/* Red X Logo (hover) */}
                    <img
                        src="/x-logo-red.webp"
                        alt="Follow us on X"
                        className="h-full w-full object-contain absolute top-0 left-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                        loading="lazy"
                    />
                </a>
            </div>

            <SolanaPanel
                pendingRewards={pendingRewards}
                totalEarned={totalEarned}
                hourlyRate={hourlyRate}
                claimRewards={claimRewards}
                rewardsLoading={rewardsLoading}
                rewardsClaimError={rewardsClaimError}
                rewardsClaimSuccess={rewardsClaimSuccess}
                hourlyEarnings={hourlyEarnings}
                onRewardsClaimed={onRewardsClaimed}
                currentCarModel={currentCarModel}
                equippedParts={equippedParts}
                carColor={carColor}
                username={username}
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
                            const rarityLabels = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'SPECIAL', 'SPECIAL'];
                            const rarityLabel = rarityLabels[Math.min(item.rarityLevel - 1, 6)] || 'COMMON';

                            return (
                                <div key={item.id} onClick={() => onNavigateToItem && onNavigateToItem(item)} onMouseEnter={playHover}
                                    className={`h-36 bg-white/5 border ${getRarityBorder(item.rarityLevel)} rounded-xl relative overflow-hidden cursor-pointer active:scale-95 transition-all duration-200 hover:scale-105 group`}>

                                    {/* Rarity Label (Top Right) */}
                                    <div className={`absolute top-2 right-2 px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-white/20 shadow-md ${getRarityStyles(item.rarityLevel)} text-white z-10`} style={{ fontFamily: 'Orbitron, sans-serif' }}>{rarityLabel}</div>

                                    {/* Full image - takes entire space */}
                                    <div className="h-full w-full flex items-center justify-center p-3">
                                        <img src={item.image} alt={item.title} className="w-full h-full object-contain drop-shadow-md transition-transform duration-200 group-hover:scale-110 pointer-events-none" loading="lazy" onError={(e) => e.target.style.display = 'none'} />
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
                    <div className="flex-1 flex flex-col p-4 pb-20 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                        {inventory.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                                <Package size={64} strokeWidth={1.5} className="text-gray-500 mb-6" />
                                <p className="text-gray-400 text-base uppercase font-bold tracking-[0.3em]" style={{ fontFamily: 'Orbitron, sans-serif' }}>Garage Empty</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                {inventory.map((item) => {
                                    // Check if item is currently equipped using the passed equippedParts prop
                                    // Also check allEquippedParts if provided for global status
                                    const isEquipped = allEquippedParts
                                        ? Object.values(allEquippedParts).some(carParts => carParts && Object.values(carParts).some(p => p && p.id === item.id))
                                        : Object.values(equippedParts).some(p => p && p.id === item.id);

                                    const rarityLabels = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'SPECIAL', 'SPECIAL'];
                                    const rarityLabel = rarityLabels[Math.min(item.rarityLevel - 1, 6)] || 'COMMON';
                                    const isBeingDragged = draggedItem && draggedItem.id === item.id;

                                    return (
                                        <InventoryItem
                                            key={item.id}
                                            item={item}
                                            isEquipped={isEquipped}
                                            isBeingDragged={isBeingDragged}
                                            rarityLabel={rarityLabel}
                                            setDraggedItem={setDraggedItem}
                                            playHover={playHover}
                                            getRarityBorder={getRarityBorder}
                                            getRarityStyles={getRarityStyles}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Fixed 'Visit Marketplace' Button Overlay */}
                    <div className="absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t from-black via-black/90 to-transparent pt-12 pointer-events-none flex justify-center z-30">
                        <button
                            onClick={() => setActivePage('Marketplace')}
                            className="w-full py-3 bg-red-600 hover:bg-red-500 text-white text-sm font-bold uppercase tracking-wider rounded-lg transition-all pointer-events-auto"
                            style={{ fontFamily: 'Orbitron, sans-serif' }}
                        >
                            Visit Marketplace
                        </button>
                    </div >
                </div >
            </motion.div >
        </>
    );
};

export default memo(GarageHUD);
