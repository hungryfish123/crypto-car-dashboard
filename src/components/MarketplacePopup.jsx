import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Zap,
    Activity,
    Users,
    TrendingUp,
    DollarSign,
    Box,
    X
} from 'lucide-react';

// =========================================
// 1. ANIMATION VARIANTS
// =========================================

const ANIMATIONS = {
    container: {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.1 },
        },
        exit: {
            opacity: 0,
            transition: { duration: 0.2 },
        },
    },
    item: {
        hidden: { opacity: 0, y: 20, filter: 'blur(10px)' },
        visible: {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            transition: { type: 'spring', stiffness: 100, damping: 20 },
        },
        exit: { opacity: 0, y: -10, filter: 'blur(5px)' },
    },
    image: (isLeft) => ({
        initial: {
            opacity: 0,
            scale: 1.5,
            filter: 'blur(15px)',
            rotate: isLeft ? -15 : 15,
            x: isLeft ? -50 : 50,
        },
        animate: {
            opacity: 1,
            scale: 1,
            filter: 'blur(0px)',
            rotate: 0,
            x: 0,
            transition: { type: 'spring', stiffness: 260, damping: 20 },
        },
        exit: {
            opacity: 0,
            scale: 0.6,
            filter: 'blur(20px)',
            transition: { duration: 0.25 },
        },
    }),
};

// =========================================
// 2. SUB-COMPONENTS
// =========================================

const BackgroundGradient = ({ colors }) => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
        <motion.div
            animate={{
                background: `radial-gradient(circle at 0% 50%, ${colors.glowRgba}, transparent 60%)`,
            }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
        />
    </div>
);

const ProductVisual = ({ data }) => (
    <motion.div layout="position" className="relative group shrink-0">
        {/* Animated Rings */}
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className={`absolute inset-[-20%] rounded-full border border-dashed ${data.colors.ring}`}
        />
        <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${data.colors.gradient} blur-2xl opacity-40`}
        />

        {/* Image Container */}
        <div className="relative h-64 w-64 md:h-[350px] md:w-[350px] rounded-full border border-white/5 shadow-2xl flex items-center justify-center overflow-hidden bg-black/40 backdrop-blur-md">
            <motion.div
                animate={{ y: [-5, 5, -5] }}
                transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
                className="relative z-10 w-full h-full flex items-center justify-center"
            >
                <motion.img
                    key={data.id}
                    src={data.image}
                    alt={data.title}
                    variants={ANIMATIONS.image(true)}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="w-4/5 h-4/5 object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                    draggable={false}
                />
            </motion.div>
        </div>

        {/* Status Label (Supply) */}
        <motion.div
            layout="position"
            className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap"
        >
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-zinc-400 bg-black/80 px-4 py-2 rounded-full border border-white/10 backdrop-blur">
                <Box size={12} className={data.colors.text} />
                Supply: <span className="text-white font-bold">{data.supply}</span>
            </div>
        </motion.div>
    </motion.div>
);

const ProductDetails = ({ data, rawItem, addToInventory, onClose }) => {
    const [isConfirmed, setIsConfirmed] = useState(false);

    const handlePurchase = () => {
        if (isConfirmed) return; // Prevent double-click
        setIsConfirmed(true);

        // Wait 1.5 seconds, then add to inventory and close
        setTimeout(() => {
            if (addToInventory) {
                addToInventory(rawItem);
            }
            onClose();
        }, 1500);
    };

    return (
        <motion.div
            variants={ANIMATIONS.container}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="flex flex-col items-center text-center md:items-start md:text-left w-full"
        >
            {/* Category + ID */}
            <motion.div variants={ANIMATIONS.item} className="flex items-center gap-3 mb-4">
                <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white rounded-full ${data.colors.bg} bg-opacity-80`}>
                    {data.category}
                </span>
                <span className="text-[10px] font-mono text-gray-500">ID: {data.id.toUpperCase()}</span>
            </motion.div>

            <motion.h1 variants={ANIMATIONS.item} className="text-4xl md:text-5xl font-black italic tracking-wide mb-4 text-white uppercase" style={{ fontFamily: 'Exo 2, sans-serif' }}>
                {data.title}
            </motion.h1>

            <motion.p variants={ANIMATIONS.item} className="text-gray-400 leading-relaxed mb-8 font-light text-lg">
                {data.description}
            </motion.p>

            {/* Feature Grid */}
            <motion.div variants={ANIMATIONS.item} className="w-full grid grid-cols-2 gap-4 bg-zinc-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-sm mb-8">
                {data.features.map((feature) => (
                    <div key={feature.label} className="group flex flex-col items-center md:items-start p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                        <div className="flex items-center gap-2 text-zinc-500 mb-1 text-xs uppercase tracking-wider">
                            <feature.icon size={14} /> <span>{feature.label}</span>
                        </div>
                        <div className="text-xl font-bold text-white font-mono">
                            {feature.value}
                        </div>
                    </div>
                ))}
            </motion.div>

            {/* Price + Action */}
            <motion.div variants={ANIMATIONS.item} className="w-full border-t border-white/10 pt-8 flex justify-between items-end">
                <div>
                    <span className="block text-xs text-gray-500 uppercase tracking-widest mb-1">Current Price</span>
                    <span className="text-4xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                        {data.price}
                    </span>
                </div>
                <button
                    onClick={handlePurchase}
                    disabled={isConfirmed}
                    className={`px-10 py-4 font-bold uppercase tracking-widest rounded transition-all shadow-lg ${isConfirmed
                        ? 'bg-green-500 text-white scale-110 animate-pulse cursor-not-allowed'
                        : `bg-green-600 text-white hover:bg-green-500 active:scale-95 ${data.colors?.isSpecial ? 'rainbow-button' : ''}`
                        }`}
                    style={{ transition: 'all 0.3s ease' }}
                >
                    {isConfirmed ? '✓ CONFIRMED' : 'Claim Asset (Free)'}
                </button>
            </motion.div>
        </motion.div>
    );
};

// =========================================
// 3. MAIN COMPONENT
// =========================================

export default function MarketplacePopup({ item, onClose, addToInventory }) {
    if (!item) return null;

    // Map item data to display format
    const getRarityColors = (rarityLevel) => {
        switch (rarityLevel) {
            case 1: return { gradient: 'from-gray-600 to-gray-900', glow: 'bg-gray-500', ring: 'border-gray-500/50', text: 'text-gray-400', bg: 'bg-gray-600', glowRgba: 'rgba(107, 114, 128, 0.15)', isSpecial: false };
            case 2: return { gradient: 'from-green-600 to-emerald-900', glow: 'bg-green-500', ring: 'border-green-500/50', text: 'text-green-400', bg: 'bg-green-600', glowRgba: 'rgba(34, 197, 94, 0.15)', isSpecial: false };
            case 3: return { gradient: 'from-blue-600 to-indigo-900', glow: 'bg-blue-500', ring: 'border-blue-500/50', text: 'text-blue-400', bg: 'bg-blue-600', glowRgba: 'rgba(59, 130, 246, 0.15)', isSpecial: false };
            case 4: return { gradient: 'from-purple-600 to-violet-900', glow: 'bg-purple-500', ring: 'border-purple-500/50', text: 'text-purple-400', bg: 'bg-purple-600', glowRgba: 'rgba(168, 85, 247, 0.15)', isSpecial: false };
            case 5: return { gradient: 'from-amber-500 to-orange-900', glow: 'bg-amber-500', ring: 'border-amber-500/50', text: 'text-amber-400', bg: 'bg-amber-500', glowRgba: 'rgba(245, 158, 11, 0.15)', isSpecial: false };
            case 6: return { gradient: 'from-red-500 via-yellow-500 to-blue-500', glow: 'rainbow-button', ring: 'rainbow-border', text: 'rainbow-text', bg: 'rainbow-button', glowRgba: 'rgba(255, 100, 100, 0.2)', isSpecial: true };
            case 7: return { gradient: 'from-red-500 via-yellow-500 to-blue-500', glow: 'rainbow-button', ring: 'rainbow-border', text: 'rainbow-text', bg: 'rainbow-button', glowRgba: 'rgba(255, 100, 100, 0.25)', isSpecial: true };
            default: return { gradient: 'from-gray-600 to-gray-900', glow: 'bg-gray-500', ring: 'border-gray-500/50', text: 'text-gray-400', bg: 'bg-gray-600', glowRgba: 'rgba(107, 114, 128, 0.15)', isSpecial: false };
        }
    };

    const colors = getRarityColors(item.rarityLevel);

    const displayData = {
        id: item.id,
        title: item.title,
        description: item.description,
        image: item.image,
        price: item.price,
        category: item.category,
        supply: item.supply,
        colors: colors,
        features: [
            { label: 'Market Cap', value: item.marketCap, icon: DollarSign },
            { label: 'Yield', value: item.cashback, icon: TrendingUp },
            { label: 'Holders', value: item.holders.toLocaleString(), icon: Users },
            { label: 'Supply', value: item.supply, icon: Zap },
        ],
    };

    return (
        // 1. Outer Overlay: Closes on click
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            {/* 2. Inner Container: Stops click propagation so popup stays open */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-5xl h-[85vh] max-h-[700px] bg-[#0a0a0a] rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 3. Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                >
                    <X size={24} className="text-white" />
                </button>

                <BackgroundGradient colors={displayData.colors} />

                <main className="relative z-10 w-full h-full flex flex-col md:flex-row items-center justify-center p-8 gap-12 overflow-y-auto">

                    {/* Left Column: Visuals */}
                    <ProductVisual data={displayData} />

                    {/* Right Column: Content */}
                    <motion.div layout="position" className="w-full max-w-md">
                        <AnimatePresence mode="wait">
                            <ProductDetails
                                key={item.id}
                                data={displayData}
                                rawItem={item}
                                addToInventory={addToInventory}
                                onClose={onClose}
                            />
                        </AnimatePresence>
                    </motion.div>

                </main>
            </motion.div>
        </div>
    );
}
