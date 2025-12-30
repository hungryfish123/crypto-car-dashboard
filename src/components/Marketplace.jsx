import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Filter, Package, X, SlidersHorizontal } from 'lucide-react';
import MarketplaceItem from './MarketplaceItem';
import MarketplacePopup from './MarketplacePopup';
import LoginButton from './LoginButton';
import { supabase } from '../supabaseClient';
import { fetchTokenData } from '../services/tokenDataService';
import { MARKETPLACE_ITEMS } from '../data/marketplaceItems';

const Marketplace = ({ addToInventory }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [maxPrice, setMaxPrice] = useState(100000);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [items, setItems] = useState(MARKETPLACE_ITEMS);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const categories = ['All', 'Engines', 'Turbos', 'Suspensions', 'Wheels', 'Special'];

    // Fetch Crypto Data
    React.useEffect(() => {
        const loadCryptoData = async () => {
            console.log('[Marketplace] Loading crypto data...');

            // 1. Get mappings from Supabase
            const { data: mappings, error } = await supabase.from('item_mappings').select('*');
            console.log('[Marketplace] Mappings from DB:', mappings, 'Error:', error);

            // Build hidden items map
            const hiddenMap = {};
            const itemMap = {};
            if (mappings) {
                mappings.forEach(m => {
                    itemMap[m.item_id] = m.contract_address;
                    hiddenMap[m.item_id] = m.hidden || false;
                });
            }
            console.log('[Marketplace] Hidden items:', hiddenMap);

            // 2. Create NEW item objects with crypto data, filtering hidden ones
            const updatedItems = await Promise.all(MARKETPLACE_ITEMS.map(async (item) => {
                // Skip hidden items
                if (hiddenMap[item.id]) {
                    return { ...item, hidden: true };
                }

                const ca = itemMap[item.id];
                if (ca) {
                    console.log(`[Marketplace] Fetching token data for ${item.id} (${ca})`);
                    const tokenData = await fetchTokenData(ca);
                    console.log(`[Marketplace] Token data for ${item.id}:`, tokenData);

                    if (tokenData && tokenData.priceUsd) {
                        return {
                            ...item,
                            isCrypto: true,
                            ca: ca,
                            price: `$${tokenData.priceUsd.toFixed(6)}`,
                            marketCap: tokenData.marketCap > 0 ? `$${(tokenData.marketCap / 1000).toFixed(1)}k` : item.marketCap
                        };
                    }
                    // CA exists but no price data yet
                    return { ...item, isCrypto: true, ca: ca };
                }
                return item; // No CA, return unchanged
            }));

            // Filter out hidden items
            const visibleItems = updatedItems.filter(item => !item.hidden);
            console.log('[Marketplace] Visible items:', visibleItems.length);
            setItems(visibleItems);
        };

        loadCryptoData();
        // Poll every 30s
        const interval = setInterval(loadCryptoData, 30000);
        return () => clearInterval(interval);
    }, [refreshTrigger]);
    // Items imported from data file


    const filteredItems = items
        .filter(item => {
            const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
            const matchesPrice = item.numPrice <= maxPrice;
            return matchesSearch && matchesCategory && matchesPrice;
        })
        .sort((a, b) => a.numPrice - b.numPrice);

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
            <div className="flex items-center justify-between h-20 px-8 z-10 w-full bg-black/60 backdrop-blur-md border-b border-white/10">

                {/* Left: Gallery Title & Tabs */}
                <div className="flex items-center gap-8">
                    <h1 className="text-xl font-bold text-white italic tracking-wide uppercase border-r border-white/20 pr-6 mr-2 hidden md:block" style={{ fontFamily: 'Exo 2, sans-serif' }}>
                        Gallery <span className="text-red-600">/</span>
                    </h1>
                    <div className="flex gap-4">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`text-xs font-bold uppercase tracking-widest pb-1 transition-all ${activeCategory === cat
                                    ? 'text-white border-b-2 border-red-600'
                                    : 'text-gray-500 hover:text-white hover:border-b-2 hover:border-gray-500'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Search, Filter, Wallet */}
                <div className="flex items-center gap-4">
                    <div className="relative group hidden md:block">
                        <input
                            type="text"
                            placeholder="SEARCH..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-full py-1.5 pl-8 pr-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-500 transition-all w-48 uppercase text-[10px] tracking-wider"
                        />
                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-red-500 transition-colors" />
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-1.5 rounded-full border transition-all ${showFilters ? 'bg-red-600 border-red-600 text-white' : 'bg-black/30 border-white/10 text-gray-400 hover:text-white hover:border-white/30'}`}
                        >
                            <SlidersHorizontal size={16} />
                        </button>

                        {/* Filter Popover */}
                        <AnimatePresence>
                            {showFilters && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full right-0 mt-3 w-64 bg-[#0F0F0F] border border-white/10 rounded-xl p-5 shadow-2xl z-30"
                                >
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-gray-400 text-[10px] uppercase tracking-widest font-bold">Max Price</h3>
                                        <span className="text-white font-bold font-mono text-xs">{maxPrice.toLocaleString()} CR</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="500"
                                        max="70000"
                                        step="500"
                                        value={maxPrice}
                                        onChange={(e) => setMaxPrice(parseInt(e.target.value))}
                                        className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-red-600"
                                    />
                                    <div className="flex justify-between text-[10px] text-gray-600 mt-2 font-mono">
                                        <span>500</span>
                                        <span>70k</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Integrated Wallet Button */}
                    <LoginButton />
                </div>
            </div>

            {/* Main Grid Content */}
            <motion.div
                className="flex-1 overflow-y-auto w-full max-w-[1920px] mx-auto custom-scrollbar px-8 pb-24"
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
                            />
                        </motion.div>
                    ))}

                    {filteredItems.length === 0 && (
                        <motion.div variants={itemVariants} className="col-span-full flex flex-col items-center justify-center text-gray-500 h-96">
                            <Package size={64} className="mb-6 opacity-20" />
                            <p className="text-xl font-light tracking-widest uppercase">No assets found</p>
                        </motion.div>
                    )}
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

export default Marketplace;
