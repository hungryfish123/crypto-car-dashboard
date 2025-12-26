// CarModelSelector.jsx - Car model headline and navigation arrows
// Allows switching between car models with smooth animations
// Supports owned/locked states with silhouette display for unpurchased cars

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Lock, Check } from 'lucide-react';

// Car models configuration - add new models here
const CAR_MODELS = [
    {
        id: 'bmw_m3_e30',
        name: 'BMW M3',
        subtitle: 'E30 Coupe • 1986',
        model: '/bmw_m3_coupe_e30_1986.glb',
        price: 0, // 0 = free/starter car
        defaultOwned: true,
        targetNames: ['Object_2', 'Object_20', 'Object_21', 'Object_22', 'Object_23'],
        autoScale: false
    },
    {
        id: 'vw_golf_gti_mk2',
        name: 'VW Golf GTI',
        subtitle: 'Mk2 • 1992',
        model: '/1992_volkswagen_golf_gti_mk2.glb',
        price: 1000, // Token amount to burn
        defaultOwned: false,
        targetNames: [
            'car_volkswagen_golfgtimk2_1992_Mesh:M_Paint_Metal_High_carpaint_0',
            'car_volkswagen_golfgtimk2_1992_Mesh_M_Paint_Metal_High_carpaint_0', // Colon -> Underscore
            'car_volkswagen_golfgtimk2_1992_MeshM_Paint_Metal_High_carpaint_0'   // Colon removed
        ],
        autoScale: false
    },
    {
        id: 'audi_sport_quattro_1984',
        name: 'Audi Sport Quattro',
        subtitle: '1984',
        model: '/1984_audi_sport_quattro.glb',
        price: 2500,
        defaultOwned: false,
        targetNames: ['Object_8', 'Object_11', 'Object_110', 'Object_128', 'Object_539'],
        autoScale: false
    },
    {
        id: 'mazda_mx5_1989',
        name: 'Mazda MX-5',
        subtitle: '1989',
        model: '/1989_mazda_mx-5.glb',
        price: 1500,
        defaultOwned: false,
        autoScale: false
    },
    {
        id: 'ferrari_f40_1987',
        name: 'Ferrari F40',
        subtitle: '1987',
        model: '/1987_ferrari_f40.glb',
        price: 5000,
        defaultOwned: false,
        autoScale: false
    },
];

const CarModelSelector = ({
    currentModelIndex = 0,
    onModelChange,
    isTransitioning = false,
    ownedCars = ['bmw_m3_e30'], // Array of owned car IDs
    onPurchase // Callback when user wants to purchase: (carId, price) => void
}) => {
    const currentModel = CAR_MODELS[currentModelIndex] || CAR_MODELS[0];
    const hasMultipleModels = CAR_MODELS.length > 1;
    const isOwned = ownedCars.includes(currentModel.id);

    const handlePrevious = () => {
        if (isTransitioning || !hasMultipleModels) return;
        const newIndex = currentModelIndex === 0
            ? CAR_MODELS.length - 1
            : currentModelIndex - 1;
        // Direction -1 for Previous
        onModelChange?.(newIndex, CAR_MODELS[newIndex], -1);
    };

    const handleNext = () => {
        if (isTransitioning || !hasMultipleModels) return;
        const newIndex = currentModelIndex === CAR_MODELS.length - 1
            ? 0
            : currentModelIndex + 1;
        // Direction 1 for Next
        onModelChange?.(newIndex, CAR_MODELS[newIndex], 1);
    };

    const handlePurchase = async () => {
        if (onPurchase && !isOwned) {
            // Direct purchase/unlock
            onPurchase(currentModel.id, currentModel.price);
        }
    };

    return (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
            {/* Main Container */}
            <div className="flex items-center gap-4 pointer-events-auto">
                {/* Left Arrow */}
                <motion.button
                    onClick={handlePrevious}
                    disabled={!hasMultipleModels || isTransitioning}
                    className={`group relative w-12 h-12 flex items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300 ${hasMultipleModels
                        ? 'bg-black/40 border-white/20 hover:bg-red-600/20 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] cursor-pointer'
                        : 'bg-black/20 border-white/10 cursor-not-allowed opacity-30'
                        }`}
                    whileHover={hasMultipleModels ? { scale: 1.1 } : {}}
                    whileTap={hasMultipleModels ? { scale: 0.95 } : {}}
                >
                    <ChevronLeft
                        size={24}
                        className={`transition-colors ${hasMultipleModels
                            ? 'text-gray-400 group-hover:text-red-400'
                            : 'text-gray-600'
                            }`}
                    />
                </motion.button>

                {/* Car Name Display */}
                <div className="min-w-[320px] text-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentModel.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ duration: 0.3 }}
                            className="relative"
                        >
                            {/* Ownership Badge */}
                            <div className="flex items-center justify-center gap-2 mb-1">
                                {isOwned ? (
                                    <span className="flex items-center gap-1 text-[10px] text-green-400 uppercase tracking-widest font-bold bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/30">
                                        <Check size={10} /> Owned
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-[10px] text-orange-400 uppercase tracking-widest font-bold bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/30">
                                        <Lock size={10} /> Locked
                                    </span>
                                )}
                            </div>

                            {/* Main Car Name */}
                            <h1
                                className={`text-4xl md:text-5xl font-black uppercase tracking-wider ${isOwned
                                    ? 'text-white drop-shadow-[0_0_30px_rgba(220,38,38,0.3)]'
                                    : 'text-gray-500 drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]'
                                    }`}
                                style={{ fontFamily: 'Rajdhani, sans-serif' }}
                            >
                                {currentModel.name}
                            </h1>

                            {/* Subtitle */}
                            <div className="flex items-center justify-center gap-2 mt-1">
                                <div className={`h-px w-8 bg-gradient-to-r from-transparent ${isOwned ? 'to-red-500/50' : 'to-gray-600/50'}`}></div>
                                <span className={`text-sm uppercase tracking-[0.3em] font-medium ${isOwned ? 'text-gray-400' : 'text-gray-600'}`}>
                                    {currentModel.subtitle}
                                </span>
                                <div className={`h-px w-8 bg-gradient-to-l from-transparent ${isOwned ? 'to-red-500/50' : 'to-gray-600/50'}`}></div>
                            </div>

                            {/* Decorative underline */}
                            <motion.div
                                className={`absolute -bottom-2 left-1/2 -translate-x-1/2 h-0.5 bg-gradient-to-r from-transparent ${isOwned ? 'via-red-500' : 'via-gray-600'} to-transparent`}
                                initial={{ width: 0 }}
                                animate={{ width: '60%' }}
                                transition={{ delay: 0.2, duration: 0.4 }}
                            />

                            {/* Purchase Button - Only for locked cars */}
                            {!isOwned && (
                                <motion.button
                                    onClick={handlePurchase}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className={`mt-6 px-6 py-3 
                                             bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 border-orange-500/30
                                             text-white font-bold uppercase tracking-wider text-sm rounded-xl
                                             border shadow-[0_0_20px_rgba(234,88,12,0.3)]
                                             hover:shadow-[0_0_30px_rgba(234,88,12,0.5)] transition-all duration-300
                                             flex items-center justify-center gap-2 mx-auto`}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    style={{ fontFamily: 'Rajdhani, sans-serif' }}
                                >
                                    <Lock size={18} />
                                    Unlock Car
                                </motion.button>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Right Arrow */}
                <motion.button
                    onClick={handleNext}
                    disabled={!hasMultipleModels || isTransitioning}
                    className={`group relative w-12 h-12 flex items-center justify-center rounded-full border backdrop-blur-md transition-all duration-300 ${hasMultipleModels
                        ? 'bg-black/40 border-white/20 hover:bg-red-600/20 hover:border-red-500/50 hover:shadow-[0_0_20px_rgba(220,38,38,0.3)] cursor-pointer'
                        : 'bg-black/20 border-white/10 cursor-not-allowed opacity-30'
                        }`}
                    whileHover={hasMultipleModels ? { scale: 1.1 } : {}}
                    whileTap={hasMultipleModels ? { scale: 0.95 } : {}}
                >
                    <ChevronRight
                        size={24}
                        className={`transition-colors ${hasMultipleModels
                            ? 'text-gray-400 group-hover:text-red-400'
                            : 'text-gray-600'
                            }`}
                    />
                </motion.button>
            </div>

            {/* Model Counter Dots */}
            {hasMultipleModels && (
                <div className="flex items-center gap-2 mt-4 pointer-events-auto">
                    {CAR_MODELS.map((carModel, index) => {
                        const carIsOwned = ownedCars.includes(carModel.id);
                        return (
                            <button
                                key={index}
                                onClick={() => !isTransitioning && onModelChange?.(index, CAR_MODELS[index])}
                                className={`h-2 rounded-full transition-all duration-300 ${index === currentModelIndex
                                    ? carIsOwned
                                        ? 'bg-red-500 w-6 shadow-[0_0_10px_rgba(220,38,38,0.5)]'
                                        : 'bg-orange-500 w-6 shadow-[0_0_10px_rgba(234,88,12,0.5)]'
                                    : carIsOwned
                                        ? 'w-2 bg-white/30 hover:bg-white/50'
                                        : 'w-2 bg-gray-600/50 hover:bg-gray-500/50'
                                    }`}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// Export the models configuration for use in App.jsx
export { CAR_MODELS };
export default CarModelSelector;
