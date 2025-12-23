import React from 'react';
import { Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const MyCars = ({ cars, currentCarId, onSelectCar }) => {
    return (
        <div className="flex h-full w-full flex-col pt-20 pb-24 px-8 relative overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-4xl font-bold text-white italic tracking-wide uppercase flex items-center gap-3" style={{ fontFamily: 'Exo 2, sans-serif' }}>
                    My Garage <span className="text-red-600">/</span> Collection
                </h1>
                <p className="text-gray-400 font-mono mt-2">Select a vehicle to drive.</p>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {cars.map((car) => {
                    const isLocked = car.locked;
                    const isActive = car.id === currentCarId;

                    return (
                        <motion.div
                            key={car.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={!isLocked ? { scale: 1.02, borderColor: 'rgba(255,255,255,0.5)' } : {}}
                            onClick={() => !isLocked && onSelectCar(car)}
                            className={`
                                relative aspect-video rounded-2xl overflow-hidden border-2 transition-all duration-300 group
                                ${isActive ? 'border-red-600 shadow-[0_0_30px_rgba(220,38,38,0.3)]' : 'border-white/10 hover:border-white/30'}
                                ${isLocked ? 'cursor-not-allowed grayscale brightness-50' : 'cursor-pointer'}
                            `}
                        >
                            {/* Background / Image Placeholder */}
                            <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black flex items-center justify-center">
                                {/* Ideally this would be car.image, using a placeholder for now if missing */}
                                {car.image ? (
                                    <img src={car.image} alt={car.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-gray-600 font-mono text-xs">{car.name} Preview</div>
                                )}
                            </div>

                            {/* Info Overlay */}
                            <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent">
                                <h3 className="text-2xl font-bold text-white uppercase italic" style={{ fontFamily: 'Exo 2, sans-serif' }}>
                                    {car.name}
                                </h3>
                                {isActive && (
                                    <span className="text-red-500 text-xs font-bold tracking-widest uppercase mt-1 block">
                                        ● Active Vehicle
                                    </span>
                                )}
                            </div>

                            {/* Locked Overlay */}
                            {isLocked && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                                    <div className="text-center transform rotate-[-5deg]">
                                        <h2
                                            className="text-4xl font-bold text-white uppercase tracking-widest drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] border-4 border-white px-6 py-2"
                                            style={{ fontFamily: 'Rajdhani, sans-serif' }}
                                        >
                                            Coming Soon
                                        </h2>
                                        <div className="mt-2 flex items-center justify-center gap-2 text-gray-300">
                                            <Lock size={16} />
                                            <span className="text-sm font-mono tracking-wider">LOCKED</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default MyCars;
