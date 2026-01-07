import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Lock, Car, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { unlockCar } from '../dbServices'; // Import the new unlock service

// Define Car Models Configuration
export const CAR_MODELS = [
    {
        id: 'bmw_m3_e30',
        name: 'BMW M3 E30',
        year: '1986',
        description: 'The legend that started it all. Required for entry.',
        price: 'Owned',
        hp: '200 HP',
        accel: '6.7s',
        topSpeed: '235 km/h',
        model: '/bmw_m3_coupe_e30_1986.glb',
        meshName: 'paint_M3', // For color changing
        isDefault: true
    },
    {
        id: 'vw_golf_gti_mk2',
        name: 'VW Golf GTI Mk2',
        year: '1992',
        description: 'The hot hatch benchmark. Practical speed.',
        price: '10 Tokens',
        hp: '139 HP',
        accel: '8.3s',
        topSpeed: '208 km/h',
        model: '/1992_volkswagen_golf_gti_mk2.glb',
        meshName: 'paint_golf',
        locked: true
    },
    {
        id: 'audi_sport_quattro',
        name: 'Audi Sport Quattro',
        year: '1984',
        description: 'Rally legend. Pure grip and acceleration.',
        price: '10 Tokens',
        hp: '306 HP',
        accel: '4.8s',
        topSpeed: '250 km/h',
        model: '/1984_audi_sport_quattro.glb',
        meshName: 'paint_audi',
        locked: true
    },
    {
        id: 'mazda_mx5_na',
        name: 'Mazda MX-5 NA',
        year: '1989',
        description: 'Pure driving joy. Lightweight roadster.',
        price: '10 Tokens',
        hp: '116 HP',
        accel: '8.1s',
        topSpeed: '203 km/h',
        model: '/1989_mazda_mx-5.glb',
        meshName: 'paint_mazda',
        locked: true
    },
    {
        id: 'ferrari_f40',
        name: 'Ferrari F40',
        year: '1987',
        description: 'The last Ferrari approved by Enzo. No aids.',
        price: '20 Tokens',
        hp: '478 HP',
        accel: '4.1s',
        topSpeed: '324 km/h',
        model: '/1987_ferrari_f40.glb',
        meshName: 'paint_f40',
        locked: true
    }
];

const CarModelSelector = ({ currentModelIndex = 0, onModelChange, ownedCars = [], walletAddress, tokenMappings = {} }) => {

    // Ensure index is valid
    const safeIndex = (currentModelIndex >= 0 && currentModelIndex < CAR_MODELS.length) ? currentModelIndex : 0;

    // Derived state
    const currentModel = CAR_MODELS[safeIndex];
    // Check ownership
    const isOwned = currentModel.isDefault || ownedCars.includes(currentModel.id);

    // Get Contract Address for this car
    const contractAddress = tokenMappings[currentModel.id];

    const handleNext = () => {
        const nextIndex = (safeIndex + 1) % CAR_MODELS.length;
        if (onModelChange) {
            onModelChange(nextIndex, CAR_MODELS[nextIndex], 1);
        }
    };

    const handlePrev = () => {
        const prevIndex = (safeIndex - 1 + CAR_MODELS.length) % CAR_MODELS.length;
        if (onModelChange) {
            onModelChange(prevIndex, CAR_MODELS[prevIndex], -1);
        }
    };

    const handleBuy = () => {
        if (contractAddress) {
            window.open(`https://jup.ag/swap/SOL-${contractAddress}`, '_blank');
        } else {
            alert("Token contract not yet launched for this car. Check back soon!");
        }
    };

    return (
        <div className="absolute top-24 left-0 w-full px-8 pointer-events-none z-30">
            <div className="max-w-4xl mx-auto relative flex flex-col items-center">

                {/* 1. BADGE (Top) */}
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={`badge-${currentModel.id}`}
                    className="mb-2 pointer-events-auto"
                >
                    {isOwned ? (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-green-500/50 bg-black/60 backdrop-blur text-green-400 font-bold uppercase tracking-widest text-[10px]">
                            <Car size={12} /> <span>OWNED</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/50 bg-black/60 backdrop-blur text-orange-400 font-bold uppercase tracking-widest text-[10px]">
                            <Lock size={12} /> <span>LOCKED</span>
                        </div>
                    )}
                </motion.div>

                {/* 2. CAR NAME + ARROWS ROW */}
                <div className="flex items-center justify-center gap-4 md:gap-8 w-full pointer-events-auto mb-1">
                    {/* Prev Arrow */}
                    <button
                        onClick={handlePrev}
                        className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/10 bg-black/40 backdrop-blur flex items-center justify-center hover:bg-white/10 hover:border-white/30 transition-all text-white/70 hover:text-white"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    {/* Car Name */}
                    <motion.h2
                        key={currentModel.name}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-3xl md:text-4xl font-black uppercase text-white tracking-tighter text-center"
                        style={{
                            fontFamily: 'Orbitron, sans-serif',
                            textShadow: '0 4px 10px rgba(0,0,0,0.5)'
                        }}
                    >
                        {currentModel.name}
                    </motion.h2>

                    {/* Next Arrow */}
                    <button
                        onClick={handleNext}
                        className="w-8 h-8 md:w-10 md:h-10 rounded-full border border-white/10 bg-black/40 backdrop-blur flex items-center justify-center hover:bg-white/10 hover:border-white/30 transition-all text-white/70 hover:text-white"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* 3. SUBTITLE (Model • Year) */}
                <motion.div
                    key={`sub-${currentModel.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 text-gray-500 font-bold tracking-[0.2em] text-[10px] uppercase mb-6 pointer-events-auto"
                    style={{ fontFamily: 'Orbitron, sans-serif' }}
                >
                    <div className="h-px w-8 bg-gray-700"></div>
                    <span>{currentModel.id.replace(/_/g, ' ')}</span>
                    <span className="text-red-600">•</span>
                    <span>{currentModel.year}</span>
                    <div className="h-px w-8 bg-gray-700"></div>
                </motion.div>

                {/* 4. BUY BUTTON (If Locked) */}
                <AnimatePresence mode="wait">
                    {!isOwned && (
                        <motion.div
                            key="buy-btn"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mb-6 pointer-events-auto"
                        >
                            <button
                                onClick={handleBuy}
                                disabled={!contractAddress}
                                className={`
                                    px-8 py-3 font-bold uppercase tracking-widest text-sm transition-all rounded-xl
                                    ${contractAddress
                                        ? 'bg-red-600 hover:bg-red-500 text-white'
                                        : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'}
                                `}
                            >
                                {contractAddress ? 'UNLOCK CAR' : 'COMING SOON'}
                            </button>
                            {contractAddress && (
                                <p className="text-[10px] text-green-400 font-mono mt-2 text-center tracking-wider animate-pulse">
                                    Hold Token to Auto-Unlock
                                </p>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 5. PAGINATION DOTS (Bottom of stack) */}
                <div className="flex items-center gap-2 pointer-events-auto">
                    {CAR_MODELS.map((model, idx) => (
                        <button
                            key={model.id}
                            onClick={() => onModelChange && onModelChange(idx, model, idx > safeIndex ? 1 : -1)}
                            className={`
                                transition-all duration-300 rounded-full
                                ${idx === safeIndex
                                    ? 'w-8 h-1.5 bg-red-600'
                                    : 'w-1.5 h-1.5 bg-gray-600 hover:bg-gray-400'}
                            `}
                        />
                    ))}
                </div>

            </div>
        </div>
    );
};

export default CarModelSelector;
