import React, { useState } from 'react';
import MarketplaceItem from './MarketplaceItem';
import MarketplacePopup from './MarketplacePopup';
import LoginButton from './LoginButton';
import { Search, Filter, Package, X, SlidersHorizontal } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const Marketplace = ({ addToInventory }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [maxPrice, setMaxPrice] = useState(100000);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showFilters, setShowFilters] = useState(false);

    const categories = ['All', 'Engines', 'Turbos', 'Suspensions', 'Wheels', 'Special'];

    const items = [
        {
            id: 'eng_lv1',
            title: '1.0L Rusty & Old',
            description: 'Barely runs. Good for a project car or an anchor.',
            price: '500 CR',
            numPrice: 500,
            image: '/level1.png',
            category: 'Engines',
            rarity: 'bg-gray-500',
            supply: '5000/5000',
            holders: 4210,
            marketCap: '$2.5M',
            cashback: '1.0%',
            rarityLevel: 1
        },
        {
            id: 'eng_lv2',
            title: '2.0L Diesel',
            description: 'Reliable workhorse. High torque, low excitement.',
            price: '1,500 CR',
            numPrice: 1500,
            image: '/level2.png',
            category: 'Engines',
            rarity: 'bg-green-500',
            supply: '2500/2500',
            holders: 1850,
            marketCap: '$4.2M',
            cashback: '1.5%',
            rarityLevel: 2
        },
        {
            id: 'eng_lv3',
            title: 'V8 Smooth',
            description: 'The gold standard. Good power and a beautiful sound.',
            price: '4,500 CR',
            numPrice: 4500,
            image: '/level3.png',
            category: 'Engines',
            rarity: 'bg-blue-500',
            supply: '1000/1000',
            holders: 850,
            marketCap: '$6.8M',
            cashback: '2.5%',
            rarityLevel: 3
        },
        {
            id: 'eng_lv4',
            title: 'V12 Power',
            description: 'Serious performance for serious drivers. Expect high maintenance.',
            price: '12,000 CR',
            numPrice: 12000,
            image: '/level4.png',
            category: 'Engines',
            rarity: 'bg-purple-500',
            supply: '250/250',
            holders: 180,
            marketCap: '$12.5M',
            cashback: '4.0%',
            rarityLevel: 4
        },
        {
            id: 'eng_lv5',
            title: 'W16 Legendary',
            description: 'A technological marvel. Unmatched speed and power.',
            price: '50,000 CR',
            numPrice: 50000,
            image: '/level5.png',
            category: 'Engines',
            rarity: 'bg-yellow-500',
            supply: '10/10',
            holders: 8,
            marketCap: '$45.0M',
            cashback: '8.5%',
            rarityLevel: 5
        },
        // Turbos
        {
            id: 'turbo_lv1',
            title: 'Junk Turbo',
            description: 'Found in a junkyard. It whistles, but that is about it.',
            price: '800 CR',
            numPrice: 800,
            image: '/turbo1.png',
            category: 'Turbos',
            rarity: 'bg-gray-500',
            supply: '3500/3500',
            holders: 2900,
            marketCap: '$1.8M',
            cashback: '1.0%',
            rarityLevel: 1
        },
        {
            id: 'turbo_lv2',
            title: 'Small Turbo',
            description: 'Standard factory issue. Adds a little kick.',
            price: '2,500 CR',
            numPrice: 2500,
            image: '/turbo2.png',
            category: 'Turbos',
            rarity: 'bg-green-500',
            supply: '1200/1200',
            holders: 950,
            marketCap: '$3.5M',
            cashback: '1.8%',
            rarityLevel: 2
        },
        {
            id: 'turbo_lv3',
            title: 'High Pressure Turbo',
            description: 'Aftermarket street kit. Now we are talking.',
            price: '6,000 CR',
            numPrice: 6000,
            image: '/turbo3.png',
            category: 'Turbos',
            rarity: 'bg-blue-500',
            supply: '600/600',
            holders: 420,
            marketCap: '$7.2M',
            cashback: '3.0%',
            rarityLevel: 3
        },
        {
            id: 'turbo_lv4',
            title: 'Twin Turbo Setup',
            description: 'Lag? What lag? relentless acceleration.',
            price: '18,000 CR',
            numPrice: 18000,
            image: '/turbo4.png',
            category: 'Turbos',
            rarity: 'bg-purple-500',
            supply: '150/150',
            holders: 110,
            marketCap: '$15.0M',
            cashback: '4.5%',
            rarityLevel: 4
        },
        {
            id: 'turbo_lv5',
            title: 'Jet Turbine Swap',
            description: 'Stolen from an aircraft. Dangerous and absolutely necessary.',
            price: '65,000 CR',
            numPrice: 65000,
            image: '/turbo5.png',
            category: 'Turbos',
            rarity: 'bg-yellow-500',
            supply: '3/3',
            holders: 2,
            marketCap: '$80.0M',
            cashback: '10.0%',
            rarityLevel: 5
        },
        // Suspensions
        {
            id: 'susp_lv1',
            title: 'Pen Spring',
            description: 'Literally taken from a ballpoint pen. Bouncy.',
            price: '200 CR',
            numPrice: 200,
            image: '/suspension1.png',
            category: 'Suspensions',
            rarity: 'bg-gray-500',
            supply: '10000/10000',
            holders: 8500,
            marketCap: '$50k',
            cashback: '0.5%',
            rarityLevel: 1
        },
        {
            id: 'susp_lv2',
            title: 'Rusty Coils',
            description: 'Stiff, noisy, and dangerous. But better than nothing.',
            price: '1,200 CR',
            numPrice: 1200,
            image: '/suspension2.png',
            category: 'Suspensions',
            rarity: 'bg-green-500',
            supply: '5000/5000',
            holders: 3200,
            marketCap: '$800k',
            cashback: '1.2%',
            rarityLevel: 2
        },
        {
            id: 'susp_lv3',
            title: 'Sport Suspension',
            description: 'Factory sport tune. Good handling for the streets.',
            price: '4,800 CR',
            numPrice: 4800,
            image: '/suspension3.png',
            category: 'Suspensions',
            rarity: 'bg-blue-500',
            supply: '1500/1500',
            holders: 900,
            marketCap: '$3.5M',
            cashback: '3.0%',
            rarityLevel: 3
        },
        {
            id: 'susp_lv4',
            title: 'Air Suspension',
            description: 'Variable ride height. Drop it low for the show.',
            price: '15,000 CR',
            numPrice: 15000,
            image: '/suspension4.png',
            category: 'Suspensions',
            rarity: 'bg-purple-500',
            supply: '400/400',
            holders: 250,
            marketCap: '$18.2M',
            cashback: '6.5%',
            rarityLevel: 4
        },
        {
            id: 'susp_lv5',
            title: 'Magnetic Suspension',
            description: 'Electromagnetic dampers that react in milliseconds. Alien tech.',
            price: '55,000 CR',
            numPrice: 55000,
            image: '/suspension5.png',
            category: 'Suspensions',
            rarity: 'bg-yellow-500',
            supply: '50/50',
            holders: 35,
            marketCap: '$60.0M',
            cashback: '15.0%',
            rarityLevel: 5
        },
        // Wheels
        {
            id: 'wheel_lv1',
            title: 'Shopping Cart Wheel',
            description: 'Stolen from a supermarket. Wobbly at high speeds.',
            price: '150 CR',
            numPrice: 150,
            image: '/wheel1.png',
            category: 'Wheels',
            rarity: 'bg-gray-500',
            supply: '25000/25000',
            holders: 12500,
            marketCap: '$15k',
            cashback: '0.2%',
            rarityLevel: 1
        },
        {
            id: 'wheel_lv2',
            title: 'Bicycle Wheel',
            description: 'Aerodynamic, but might snap under the weight of the car.',
            price: '900 CR',
            numPrice: 900,
            image: '/wheel2.png',
            category: 'Wheels',
            rarity: 'bg-green-500',
            supply: '8000/8000',
            holders: 4100,
            marketCap: '$450k',
            cashback: '1.0%',
            rarityLevel: 2
        },
        {
            id: 'wheel_lv3',
            title: 'Mini Van Alloy',
            description: 'Sensible, reliable, and totally boring. School run spec.',
            price: '3,500 CR',
            numPrice: 3500,
            image: '/wheel3.png',
            category: 'Wheels',
            rarity: 'bg-blue-500',
            supply: '2000/2000',
            holders: 1200,
            marketCap: '$2.8M',
            cashback: '2.5%',
            rarityLevel: 3
        },
        {
            id: 'wheel_lv4',
            title: 'NASCAR Steelie',
            description: 'Built for speed and left turns only. Heavy duty.',
            price: '14,000 CR',
            numPrice: 14000,
            image: '/wheel4.png',
            category: 'Wheels',
            rarity: 'bg-purple-500',
            supply: '500/500',
            holders: 300,
            marketCap: '$15.5M',
            cashback: '5.8%',
            rarityLevel: 4
        },
        {
            id: 'wheel_lv5',
            title: 'F1 Pirelli Slick',
            description: 'The pinnacle of grip. Sticky, wide, and illegal on the street.',
            price: '60,000 CR',
            numPrice: 60000,
            image: '/wheel5.png',
            category: 'Wheels',
            rarity: 'bg-yellow-500',
            supply: '25/25',
            holders: 15,
            marketCap: '$85.0M',
            cashback: '18.5%',
            rarityLevel: 5
        },
        // Special Items (Rainbow/Holographic)
        {
            id: 'special_seat',
            title: 'Sparco Racing Seat',
            description: 'Carbon fiber bucket seat. Weight reduction +100.',
            price: '25,000 CR',
            numPrice: 25000,
            image: '/sparco seat.png',
            category: 'Special',
            rarity: 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500',
            supply: '50/50',
            holders: 45,
            marketCap: '$2.5M',
            cashback: '8.0%',
            rarityLevel: 6
        },
        {
            id: 'special_brakes',
            title: 'Ceramic Brembo Brakes',
            description: 'Stops on a dime. Glowing red hot rotors.',
            price: '35,000 CR',
            numPrice: 35000,
            image: '/ceramic breaks.png',
            category: 'Special',
            rarity: 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500',
            supply: '30/30',
            holders: 28,
            marketCap: '$4.2M',
            cashback: '10.5%',
            rarityLevel: 6
        },
        {
            id: 'special_nitro',
            title: 'Nitro Boost System',
            description: 'Press button to say goodbye to your opponents.',
            price: '100,000 CR',
            numPrice: 100000,
            image: '/nitro boost.png',
            category: 'Special',
            rarity: 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500',
            supply: '5/5',
            holders: 3,
            marketCap: '$50.0M',
            cashback: '25.0%',
            rarityLevel: 7
        }
    ];

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
