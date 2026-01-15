import React, { useState, useEffect, memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Package } from 'lucide-react';
import MarketplaceItem from './MarketplaceItem';
import MarketplacePopup from './MarketplacePopup';
import LoginButton from './LoginButton';
import InteractiveLogo from './InteractiveLogo';
import { supabase } from '../supabaseClient';
import { usePrices } from '../hooks/usePrices';
import { MARKETPLACE_ITEMS } from '../data/marketplaceItems';

import { useDynamicLinks } from '../hooks/useDynamicLinks';

const Marketplace = ({ addToInventory, onProfileClick, initialSelectedItem, clearInitialItem, carColor }) => {
    const { links } = useDynamicLinks();
    const [activeCategory, setActiveCategory] = useState('All');
    const [selectedItem, setSelectedItem] = useState(initialSelectedItem || null);
    const [items, setItems] = useState(MARKETPLACE_ITEMS);

    useEffect(() => {
        if (initialSelectedItem) {
            setSelectedItem(initialSelectedItem);
            if (clearInitialItem) clearInitialItem();
        }
    }, [initialSelectedItem, clearInitialItem]);

    const categories = ['All', 'Engines', 'Turbos', 'Suspensions', 'Wheels', 'Special'];

    // Use shared prices from Realtime subscription (same for all users)
    const { prices, loading: pricesLoading } = usePrices();

    // Function to reload items from DB and merge with metrics
    const loadItems = async () => {
        console.log('[Marketplace] Loading items with prices:', prices);

        // Get mappings from Supabase for hidden status, CAs, and manual overrides
        const { data: mappings } = await supabase.from('item_mappings').select('*');

        const mappingMap = {};
        if (mappings) {
            mappings.forEach(m => {
                mappingMap[m.item_id] = m;
            });
        }

        // Merge items with token metrics and DB overrides
        const updatedItems = MARKETPLACE_ITEMS.map(item => {
            const dbMapping = mappingMap[item.id] || {};

            // Skip hidden items
            if (dbMapping.hidden) {
                return { ...item, hidden: true };
            }

            const ca = dbMapping.contract_address;
            const priceData = prices?.[item.id];

            // Base merged item
            let mergedItem = {
                ...item,
                isCrypto: !!ca,
                ca: ca,
                buyUrl: dbMapping.buy_url || null
            };

            // Apply metrics if available, otherwise default to 0/empty as requested
            // 1. Determine Final Output Supply 
            // Priority: DB Override > Item Default > 0
            let displaySupply = dbMapping.override_supply || item.supply;

            // Clean supply string: "1000/1000" -> "1000"
            if (displaySupply && typeof displaySupply === 'string' && displaySupply.includes('/')) {
                displaySupply = displaySupply.split('/')[1];
            }

            // Parse numeric supply for calculation (remove commas/non-digits)
            const numericSupply = typeof displaySupply === 'string'
                ? parseFloat(displaySupply.replace(/,/g, '').replace(/[^0-9.]/g, ''))
                : (typeof displaySupply === 'number' ? displaySupply : 0);

            // 2. Determine Price & Market Cap
            let displayPrice = null;
            let displayMarketCap = "$0";

            if (priceData && priceData.price_usd > 0) {
                // Show live crypto price
                displayPrice = `$${priceData.price_usd.toFixed(6)}`;

                // Calculate Market Cap = Supply * Price
                const rawMC = numericSupply * priceData.price_usd;

                // Format MC
                if (rawMC >= 1e6) {
                    displayMarketCap = `$${(rawMC / 1e6).toFixed(2)}M`;
                } else if (rawMC >= 1e3) {
                    displayMarketCap = `$${(rawMC / 1e3).toFixed(2)}k`;
                } else {
                    displayMarketCap = `$${rawMC.toFixed(2)}`;
                }

            } else if (item.price && !item.price.includes('CR')) {
                // Keep non-CR prices (static)
                displayPrice = item.price;
            }

            // Calculate YIELD: (yield_weight / 1000) * 100%
            const calculateYield = (yieldWeight) => {
                if (!yieldWeight) return '0.0%';
                const yieldPercent = (yieldWeight / 1000) * 100;
                return `${yieldPercent.toFixed(1)}%`;
            };
            const yieldWeight = dbMapping.yield_weight || 0;
            const calculatedYield = calculateYield(yieldWeight);

            // Construct Final Merged Item
            mergedItem = {
                ...mergedItem,
                price: displayPrice,
                supply: displaySupply, // Use the clean/overridden supply
                marketCap: displayMarketCap,
                holders: priceData ? (priceData.holders || 0) : 0,
                cashback: calculatedYield
            };

            return mergedItem;
        });

        // Filter out hidden items
        const visibleItems = updatedItems.filter(item => !item.hidden);
        console.log('[Marketplace] Visible items:', visibleItems.length);

        setItems(visibleItems);

        // REAL-TIME POPUP SYNC: If an item is currently selected, update its data too
        if (selectedItem) {
            const latestVersion = visibleItems.find(i => i.id === selectedItem.id);
            if (latestVersion) {
                setSelectedItem(latestVersion);
            } else {
                // If the item was hidden while open, close the popup
                setSelectedItem(null);
            }
        }
    };

    // Refetch when prices change
    useEffect(() => {
        loadItems();
    }, [prices]);

    // REAL-TIME: Listen for database changes (Admin Panel updates)
    useEffect(() => {
        const channel = supabase
            .channel('item-mappings-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'item_mappings' },
                (payload) => {
                    console.log('[Marketplace] Database change detected!', payload);
                    loadItems(); // Trigger instant reload
                }
            )
            .subscribe((status) => {
                console.log('[Marketplace] Realtime status:', status);
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [prices]);
    // Items imported from data file


    const filteredItems = items
        .filter(item => {
            return (activeCategory === 'All' || item.category === activeCategory) && item.category !== 'Cars';
        })
        .reverse(); // Show newest (bottom of file) first

    // Animation Variants
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="flex flex-col h-full w-full relative overflow-hidden">

            {/* Header - Slim & Inline */}
            <div className="flex items-center justify-between h-20 px-8 z-10 w-full bg-black/60 backdrop-blur-md border-b border-white/10 relative">

                {/* Left: Logos */}
                <div className="flex items-center gap-3">
                    <div className="scale-90 origin-left">
                        <InteractiveLogo color={carColor} />
                    </div>

                    {/* X Logo with hover effect */}
                    <a
                        href={links.social_x}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block relative group cursor-pointer h-6 w-6"
                    >
                        <img
                            src="/x-logo-white.webp"
                            alt="Follow us on X"
                            className="h-full w-full object-contain absolute top-0 left-0 transition-opacity duration-200 group-hover:opacity-0"
                            loading="lazy"
                        />
                        <img
                            src="/x-logo-red.webp"
                            alt="Follow us on X"
                            className="h-full w-full object-contain absolute top-0 left-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                            loading="lazy"
                        />
                    </a>
                </div>

                {/* Categories - Centered Absolutely */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="flex gap-16">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`text-sm font-bold uppercase tracking-[0.2em] pb-2 transition-all ${activeCategory === cat
                                    ? 'text-white border-b-2 border-red-600'
                                    : 'text-gray-500 hover:text-white hover:border-b-2 hover:border-gray-500'
                                    }`}
                                style={{ fontFamily: 'Orbitron, sans-serif' }}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Wallet Only */}
                <div className="flex items-center gap-4">
                    <LoginButton onProfileClick={onProfileClick} />
                </div>
            </div>

            {/* Main Grid Content */}
            <motion.div
                className="flex-1 overflow-y-auto w-full max-w-[1920px] mx-auto marketplace-scrollbar px-8 pb-24 pt-8"
                variants={containerVariants}
                initial="hidden"
                animate="show"
                key={activeCategory} // Triggers re-animation on category change
            >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-8 pb-20">
                    {filteredItems.map(item => (
                        <motion.div key={item.id} variants={itemVariants}>
                            <MarketplaceItem
                                title={item.title}
                                price={item.price}
                                image={item.image}
                                rarityColor={item.rarity}
                                rarityLevel={item.rarityLevel}
                                supply={item.supply}
                                holders={item.holders}
                                marketCap={item.marketCap}
                                cashback={item.cashback}
                                isCrypto={item.isCrypto || false}
                                ca={item.ca || ''}
                                onClick={() => setSelectedItem(item)}
                                carColor={carColor}
                            />
                        </motion.div>
                    ))}

                    {/* FILLER LOGIC: Fill grid with "Dropping Soon" teasers */}
                    {(() => {
                        // Always show at least one full row of teasers to indicate upcoming content
                        const columns = 4; // Assuming max columns (2xl)
                        const minFillers = 4;

                        // Calculate total items needed to fill current row + add one full row
                        const totalNeeded = Math.ceil((filteredItems.length + minFillers) / columns) * columns;
                        const fillerCount = totalNeeded - filteredItems.length;

                        return Array.from({ length: fillerCount }).map((_, i) => {
                            // Deterministic rarity based on index to avoid flicker
                            const rLevels = [
                                { bg: 'bg-gray-500', label: 'COMMON' },
                                { bg: 'bg-green-500', label: 'UNCOMMON' },
                                { bg: 'bg-blue-500', label: 'RARE' },
                                { bg: 'bg-purple-500', label: 'EPIC' },
                                { bg: 'bg-yellow-500', label: 'LEGENDARY' }
                            ];
                            const rarity = rLevels[(i + filteredItems.length) % 5];

                            return (
                                <motion.div
                                    key={`teaser-${i}`}
                                    variants={itemVariants}
                                    className="group relative bg-[#0a0a0a]/80 backdrop-blur-md rounded-xl overflow-hidden shadow-xl flex flex-col h-[420px] border border-white/5 opacity-80 hover:opacity-100 transition-opacity duration-300"
                                >
                                    {/* Fake Rarity Badge */}
                                    <div
                                        className={`absolute top-4 left-1/2 -translate-x-1/2 z-10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest rounded-lg ${rarity.bg} text-white shadow-lg border border-white/20`}
                                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                                    >
                                        {rarity.label}
                                    </div>

                                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center">
                                        <div className="p-3 bg-red-600/20 rounded-full border border-red-500/30 mb-4 animate-pulse">
                                            <Package size={32} className="text-red-500" />
                                        </div>
                                        <h3 className="text-2xl font-bold italic uppercase tracking-wider text-white mb-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                                            DROPPING SOON
                                        </h3>
                                    </div>

                                    {/* Blurred Background Mockup */}
                                    <div className="absolute inset-0 opacity-20 pointer-events-none blur-xl">
                                        <div className="w-full h-full bg-gradient-to-br from-gray-700 via-gray-900 to-black"></div>
                                    </div>
                                </motion.div>
                            );
                        });
                    })()}
                </div>
            </motion.div>

            {/* Item Details Popup */}
            <AnimatePresence>
                {selectedItem && (
                    <MarketplacePopup
                        item={selectedItem}
                        onClose={() => setSelectedItem(null)}
                        addToInventory={addToInventory}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default memo(Marketplace);
