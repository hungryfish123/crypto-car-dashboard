import React from 'react';
import { Package, Users, Wallet, TrendingUp, Zap } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';

const MarketplaceItem = ({
    image,
    title,
    price,
    supply = '1000/1000',
    holders = 0,
    marketCap = '$0',
    cashback = '0%',
    rarityLevel = 1,
    rarityColor = 'bg-gray-500',
    isCrypto = false,
    ca = '',
    onClick
}) => {
    // Map rarity level to specific colors
    const getRarityStyles = (level) => {
        switch (level) {
            case 1: return { bgColor: 'bg-gray-500', label: 'COMMON', isSpecial: false };
            case 2: return { bgColor: 'bg-green-500', label: 'UNCOMMON', isSpecial: false };
            case 3: return { bgColor: 'bg-blue-500', label: 'RARE', isSpecial: false };
            case 4: return { bgColor: 'bg-purple-500', label: 'EPIC', isSpecial: false };
            case 5: return { bgColor: 'bg-yellow-500', label: 'LEGENDARY', isSpecial: false };
            case 6: return { bgColor: 'rainbow-button', label: 'LEGENDARY', isSpecial: true };
            case 7: return { bgColor: 'rainbow-button', label: 'GOD TIER', isSpecial: true };
            default: return { bgColor: 'bg-gray-500', label: 'COMMON', isSpecial: false };
        }
    };

    const style = getRarityStyles(rarityLevel);
    const isSpecial = rarityLevel >= 6;
    const { playHover } = useAudio();

    return (
        <div
            onClick={onClick}
            onMouseEnter={playHover}
            className={`group relative bg-[#0a0a0a]/80 backdrop-blur-md rounded-xl overflow-hidden hover:scale-[1.02] transition-all duration-300 shadow-xl flex flex-col h-[420px] cursor-pointer ${isSpecial ? 'rainbow-border' : 'border border-white/5'}`}
        >
            {/* Price Badge (Top Right) */}
            {/* Price Badge (Top Right) */}
            <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-2">
                {isCrypto ? (
                    <>
                        <span className="flex items-center gap-1 text-[10px] text-green-500 font-bold animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> LIVE
                        </span>
                        <span className="text-sm font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{price}</span>
                    </>
                ) : (
                    <span className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        <span className="w-2 h-2 rounded-full border-2 border-gray-500 border-t-transparent animate-spin"></span>
                        FETCHING DATA
                    </span>
                )}
            </div>

            {/* Centered Rarity Badge (Top Center) */}
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 text-xs font-bold uppercase tracking-widest rounded-full ${style.bgColor} text-white shadow-lg`}>
                {style.label}
            </div>

            {/* Main Content (Image & Title) */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 pt-14 relative">
                {/* Hero Image */}
                <div className="w-full h-48 flex items-center justify-center mb-6 relative z-10">
                    {image ? (
                        <img
                            src={image}
                            alt={title}
                            className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-500"
                        />
                    ) : (
                        <Package size={64} className="text-gray-700" />
                    )}
                </div>

                {/* Title */}
                <div className="text-center relative z-10 w-full">
                    <h3 className="text-2xl font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                        {title}
                    </h3>
                </div>
            </div>

            {/* Slide-Up Hover Overlay (Dark Glass) */}
            <div className="absolute bottom-0 left-0 w-full h-[50%] z-20 bg-black/90 backdrop-blur-xl border-t border-white/10 flex flex-col justify-center items-center p-6 translate-y-[100%] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 ease-out">
                <div className="grid grid-cols-2 gap-x-6 gap-y-5 w-full">
                    {/* Supply */}
                    <div className="flex flex-col items-center text-center">
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-semibold">Supply</span>
                        <div className="flex items-center gap-2">
                            <Zap size={14} className="text-yellow-500" />
                            <span className="text-base font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{supply}</span>
                        </div>
                    </div>

                    {/* Holders */}
                    <div className="flex flex-col items-center text-center">
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-semibold">Holders</span>
                        <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{holders}</span>
                            <Users size={14} className="text-gray-500" />
                        </div>
                    </div>

                    {/* Market Cap */}
                    <div className="flex flex-col items-center text-center">
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-semibold">Market Cap</span>
                        <div className="flex items-center gap-2">
                            <TrendingUp size={14} className="text-green-500" />
                            <span className="text-base font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{marketCap}</span>
                        </div>
                    </div>

                    {/* Yield */}
                    <div className="flex flex-col items-center text-center">
                        <span className="text-[10px] text-gray-400 uppercase tracking-widest mb-1 font-semibold">Yield</span>
                        <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-green-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{cashback}</span>
                            <Wallet size={14} className="text-gray-500" />
                        </div>
                    </div>
                </div>

                {/* CA Display for Crypto Items */}
                {isCrypto && ca && (
                    <div className="mt-4 pt-4 border-t border-white/10 w-full text-center">
                        <p className="text-[10px] text-gray-500 font-mono mb-1">Contract Address</p>
                        <div className="text-[10px] text-blue-400 font-mono bg-blue-500/10 rounded px-2 py-1 truncate select-all cursor-text flex items-center justify-center gap-2">
                            {ca.slice(0, 6)}...{ca.slice(-6)}
                            <span className="text-[8px] opacity-50">(Click to Copy)</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MarketplaceItem;
