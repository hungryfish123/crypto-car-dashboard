import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Check, RotateCcw, Sparkles, CheckCircle } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';

export default function PaintShop({
    carColor,
    setCarColor,
    carFinish,
    setCarFinish,
    hue,
    setHue,
    saturation,
    setSaturation,
    lightness,
    setLightness,
    environment,
    setEnvironment,
    sceneBackground,
    setSceneBackground
}) {
    const [activeTab, setActiveTab] = useState('simple');
    const [copied, setCopied] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Track the "saved" color (what was last confirmed)
    const savedColorRef = useRef(carColor);
    const savedFinishRef = useRef(carFinish);

    // Preview color (temporary until applied)
    const [previewColor, setPreviewColor] = useState(carColor);
    const [previewFinish, setPreviewFinish] = useState(carFinish);

    const { playColorSuccess, playClick } = useAudio();

    // Check if changes are pending (compare to saved, not current)
    const hasPendingChanges = previewColor !== savedColorRef.current || previewFinish !== savedFinishRef.current;

    // Default/Stock color
    const stockColor = '#CC0000';
    const stockFinish = 'glossy';

    // Premium paint chips - organized by row
    const predefinedColors = [
        // Row 1: Reds & Oranges
        '#FF0000', '#CC0000', '#990000', '#FF4500', '#FF6600',
        // Row 2: Yellows & Greens
        '#FFD700', '#FFFF00', '#7CFC00', '#00FF00', '#228B22',
        // Row 3: Blues & Purples
        '#00BFFF', '#0066FF', '#0000FF', '#4B0082', '#9400D3',
        // Row 4: Neutrals
        '#FFFFFF', '#C0C0C0', '#808080', '#333333', '#000000',
    ];

    // Finish options with material properties
    const finishOptions = [
        { id: 'glossy', label: 'Gloss', description: 'High-shine finish with deep reflections.', roughness: 0.1, metalness: 0.3 },
        { id: 'matte', label: 'Matte', description: 'Flat, non-reflective. Stealthy and modern.', roughness: 0.8, metalness: 0.1 },
        { id: 'metallic', label: 'Metallic', description: 'Sparkling flakes. Eye-catching under light.', roughness: 0.3, metalness: 0.7 },
        { id: 'chrome', label: 'Chrome', description: 'Mirror finish. Maximum reflection.', roughness: 0, metalness: 1 },
    ];

    // Background options (drei presets)
    const backgroundOptions = [
        { id: 'city', label: 'City', color: '#1a1a2e' },
        { id: 'studio', label: 'Studio', color: '#2C2C2C' },
        { id: 'night', label: 'Night', color: '#000000' },
        { id: 'sunset', label: 'Sunset', color: '#4a2c2c' },
        { id: 'dawn', label: 'Dawn', color: '#2c3e50' },
        { id: 'forest', label: 'Forest', color: '#1e3323' },
    ];

    const tabs = [
        { id: 'simple', label: 'Simple' },
        { id: 'advanced', label: 'Advanced' },
        { id: 'finish', label: 'Finish' },
    ];

    const handleCopyHex = () => {
        navigator.clipboard.writeText(previewColor);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleReset = () => {
        setPreviewColor(stockColor);
        setPreviewFinish(stockFinish);
        setCarColor(stockColor);
        setCarFinish(stockFinish);
        savedColorRef.current = stockColor;
        savedFinishRef.current = stockFinish;
        setHue(0);
        setSaturation(100);
        setLightness(50);
        setEnvironment('city');
        setSceneBackground('grid');
        playClick();
    };

    const handleApplyPaint = () => {
        // Save the current preview as the new "saved" state
        savedColorRef.current = previewColor;
        savedFinishRef.current = previewFinish;
        setCarColor(previewColor);
        setCarFinish(previewFinish);
        playColorSuccess();

        // Show success toast
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    // Update preview when HSL changes (advanced tab)
    useEffect(() => {
        if (activeTab === 'advanced') {
            const h = Number(hue);
            const s = Number(saturation) / 100;
            const l = Number(lightness) / 100;
            const c = (1 - Math.abs(2 * l - 1)) * s;
            const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
            const m = l - c / 2;
            let r = 0, g = 0, b = 0;
            if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
            else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
            else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
            else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
            else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
            else { r = c; g = 0; b = x; }
            const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
            setPreviewColor('#' + toHex(r) + toHex(g) + toHex(b));
        }
    }, [hue, saturation, lightness, activeTab]);

    // Live preview on car
    useEffect(() => {
        setCarColor(previewColor);
        setCarFinish(previewFinish);
    }, [previewColor, previewFinish, setCarColor, setCarFinish]);

    return (
        // Full-Height Left Sidebar
        <motion.div
            initial={{ x: -400 }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 h-full w-[400px] bg-black/60 backdrop-blur-md border-r border-white/10 z-40 flex flex-col"
        >
            {/* Success Toast */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-green-600/90 backdrop-blur-md rounded-lg flex items-center gap-2 shadow-lg"
                    >
                        <CheckCircle size={18} className="text-white" />
                        <span className="text-white text-sm font-bold uppercase tracking-wider" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                            Paint Applied!
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header */}
            <div className="p-6 border-b border-white/10">
                <div className="flex items-center gap-3 mb-6">
                    <Sparkles className="text-red-500" size={24} />
                    <h1 className="text-xl font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                        Vehicle Customization
                    </h1>
                </div>

                {/* Tab Bar */}
                <div className="flex gap-1 bg-black/40 rounded-lg p-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); playClick(); }}
                            className={`flex-1 py-2 px-3 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${activeTab === tab.id
                                ? 'bg-red-600 text-white shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            style={{ fontFamily: 'Rajdhani, sans-serif' }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 transition-all scrollbar-hide">
                {/* Simple Tab: Paint Chips */}
                {activeTab === 'simple' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-4 font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                            Select Paint Color
                        </h3>

                        {/* Paint Chip Grid */}
                        <div className="grid grid-cols-5 gap-3 mb-6">
                            {predefinedColors.map((color) => (
                                <button
                                    key={color}
                                    onClick={() => setPreviewColor(color)}
                                    className={`w-12 h-12 rounded-lg cursor-pointer transition-all duration-200 hover:scale-110 ${previewColor.toUpperCase() === color.toUpperCase()
                                        ? 'ring-2 ring-white ring-offset-2 ring-offset-black scale-110 shadow-lg'
                                        : 'hover:ring-1 hover:ring-white/50'
                                        }`}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                />
                            ))}
                        </div>

                        {/* Hex Input / Technical Readout */}
                        <div className="bg-black/40 rounded-xl p-4 border border-white/10 mb-8">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                                Preview Color
                            </span>
                            <div className="flex items-center gap-3 mt-2">
                                <div
                                    className="w-10 h-10 rounded-lg border border-white/20 shadow-inner"
                                    style={{ backgroundColor: previewColor }}
                                />
                                <div className="flex-1 flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={previewColor.toUpperCase()}
                                        onChange={(e) => setPreviewColor(e.target.value)}
                                        className="flex-1 bg-black/60 border border-white/10 rounded-lg px-3 py-2 text-white font-mono text-sm uppercase focus:outline-none focus:border-red-500 transition-colors"
                                    />
                                    <button
                                        onClick={handleCopyHex}
                                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                                        title="Copy Hex"
                                    >
                                        {copied ? (
                                            <Check size={18} className="text-green-400" />
                                        ) : (
                                            <Copy size={18} className="text-gray-400" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Global Light Selection Section (was Background) */}
                        <div className="border-t border-white/10 pt-6">
                            <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-4 font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                                Global Light
                            </h3>
                            <div className="grid grid-cols-3 gap-3">
                                {backgroundOptions.map((bg) => (
                                    <button
                                        key={bg.id}
                                        onClick={() => {
                                            setEnvironment(bg.id);
                                            playClick();
                                        }}
                                        className={`p-3 rounded-lg border flex flex-col items-center gap-2 transition-all ${environment === bg.id
                                            ? 'bg-red-900/20 border-red-500'
                                            : 'bg-black/40 border-white/10 hover:bg-white/5 hover:border-white/30'
                                            }`}
                                    >
                                        <div
                                            className="w-full h-8 rounded-md shadow-inner"
                                            style={{ backgroundColor: bg.color }}
                                        />
                                        <span className={`text-[10px] font-bold uppercase tracking-wider ${environment === bg.id ? 'text-white' : 'text-gray-400'}`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                                            {bg.label}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Background Floor Selection Section */}
                        <div className="border-t border-white/10 pt-6 mt-6">
                            <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-4 font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                                Background
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {/* Grid Option */}
                                <button
                                    onClick={() => {
                                        setSceneBackground('grid');
                                        playClick();
                                    }}
                                    className={`p-4 rounded-lg border flex flex-col items-center gap-3 transition-all ${sceneBackground === 'grid'
                                        ? 'bg-red-900/20 border-red-500'
                                        : 'bg-black/40 border-white/10 hover:bg-white/5 hover:border-white/30'
                                        }`}
                                >
                                    <div className="w-full h-12 rounded-md bg-black border border-white/20 relative overflow-hidden">
                                        {/* Grid pattern preview */}
                                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ff000030_1px,transparent_1px),linear-gradient(to_bottom,#ff000030_1px,transparent_1px)] bg-[size:8px_8px]"></div>
                                    </div>
                                    <span className={`text-xs font-bold uppercase tracking-wider ${sceneBackground === 'grid' ? 'text-white' : 'text-gray-400'}`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                                        Neon Grid
                                    </span>
                                </button>

                                {/* Concrete Option */}
                                <button
                                    onClick={() => {
                                        setSceneBackground('concrete');
                                        playClick();
                                    }}
                                    className={`p-4 rounded-lg border flex flex-col items-center gap-3 transition-all ${sceneBackground === 'concrete'
                                        ? 'bg-red-900/20 border-red-500'
                                        : 'bg-black/40 border-white/10 hover:bg-white/5 hover:border-white/30'
                                        }`}
                                >
                                    <div className="w-full h-12 rounded-md bg-gradient-to-b from-gray-500 to-gray-600 shadow-inner"></div>
                                    <span className={`text-xs font-bold uppercase tracking-wider ${sceneBackground === 'concrete' ? 'text-white' : 'text-gray-400'}`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                                        Concrete
                                    </span>
                                </button>

                                {/* Damaged Concrete Option */}
                                <button
                                    onClick={() => {
                                        setSceneBackground('damaged');
                                        playClick();
                                    }}
                                    className={`p-4 rounded-lg border flex flex-col items-center gap-3 transition-all ${sceneBackground === 'damaged'
                                        ? 'bg-red-900/20 border-red-500'
                                        : 'bg-black/40 border-white/10 hover:bg-white/5 hover:border-white/30'
                                        }`}
                                >
                                    <div className="w-full h-12 rounded-md bg-gradient-to-b from-gray-600 to-gray-700 shadow-inner relative overflow-hidden">
                                        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_30%_40%,#333_0%,transparent_40%),radial-gradient(circle_at_70%_60%,#222_0%,transparent_30%)]"></div>
                                    </div>
                                    <span className={`text-xs font-bold uppercase tracking-wider ${sceneBackground === 'damaged' ? 'text-white' : 'text-gray-400'}`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                                        Damaged
                                    </span>
                                </button>

                                {/* Custom Option */}
                                <button
                                    onClick={() => {
                                        setSceneBackground('custom');
                                        playClick();
                                    }}
                                    className={`p-4 rounded-lg border flex flex-col items-center gap-3 transition-all ${sceneBackground === 'custom'
                                        ? 'bg-red-900/20 border-red-500'
                                        : 'bg-black/40 border-white/10 hover:bg-white/5 hover:border-white/30'
                                        }`}
                                >
                                    <div className="w-full h-12 rounded-md bg-gradient-to-br from-amber-700 via-stone-600 to-neutral-700 shadow-inner"></div>
                                    <span className={`text-xs font-bold uppercase tracking-wider ${sceneBackground === 'custom' ? 'text-white' : 'text-gray-400'}`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                                        Custom
                                    </span>
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Advanced Tab: HSL Sliders */}
                {activeTab === 'advanced' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-4 font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                            HSL Adjustment
                        </h3>

                        <div className="space-y-6">
                            {/* Hue Slider */}
                            <div className="bg-black/40 rounded-xl p-4 border border-white/10">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs text-gray-400 uppercase tracking-widest font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Hue</span>
                                    <span className="text-sm text-white font-mono">{hue}°</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="360"
                                    value={hue}
                                    onChange={(e) => setHue(parseInt(e.target.value))}
                                    className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                                    style={{
                                        background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
                                    }}
                                />
                            </div>

                            {/* Saturation Slider */}
                            <div className="bg-black/40 rounded-xl p-4 border border-white/10">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs text-gray-400 uppercase tracking-widest font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Saturation</span>
                                    <span className="text-sm text-white font-mono">{saturation}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={saturation}
                                    onChange={(e) => setSaturation(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gradient-to-r from-gray-500 to-red-500 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>

                            {/* Lightness Slider */}
                            <div className="bg-black/40 rounded-xl p-4 border border-white/10">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs text-gray-400 uppercase tracking-widest font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Lightness</span>
                                    <span className="text-sm text-white font-mono">{lightness}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={lightness}
                                    onChange={(e) => setLightness(parseInt(e.target.value))}
                                    className="w-full h-2 bg-gradient-to-r from-black via-gray-500 to-white rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        </div>

                        {/* Color Preview */}
                        <div className="mt-6 bg-black/40 rounded-xl p-4 border border-white/10">
                            <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                                Result
                            </span>
                            <div className="flex items-center gap-3 mt-2">
                                <div
                                    className="w-14 h-14 rounded-lg border border-white/20"
                                    style={{ backgroundColor: previewColor }}
                                />
                                <div>
                                    <p className="text-white font-mono text-sm">{previewColor.toUpperCase()}</p>
                                    <p className="text-gray-500 text-xs mt-1">HSL({hue}, {saturation}%, {lightness}%)</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Finish Tab */}
                {activeTab === 'finish' && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-4 font-bold" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                            Paint Finish
                        </h3>

                        <div className="space-y-3">
                            {finishOptions.map((finish) => (
                                <button
                                    key={finish.id}
                                    onClick={() => setPreviewFinish(finish.id)}
                                    className={`w-full p-4 rounded-xl text-left transition-all ${previewFinish === finish.id
                                        ? 'bg-red-600/20 border-2 border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.3)]'
                                        : 'bg-black/40 border border-white/10 hover:border-white/30 hover:bg-white/5'
                                        }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className={`text-sm font-bold uppercase tracking-wider ${previewFinish === finish.id ? 'text-white' : 'text-gray-300'
                                            }`} style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                                            {finish.label}
                                        </span>
                                        {previewFinish === finish.id && (
                                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                                        {finish.description}
                                    </p>
                                    {/* Technical specs */}
                                    <div className="flex gap-4 mt-2 text-[10px] text-gray-600 font-mono">
                                        <span>R: {finish.roughness}</span>
                                        <span>M: {finish.metalness}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Footer: Apply & Reset Buttons */}
            <div className="p-6 border-t border-white/10 space-y-3">
                {/* Apply Paint Button */}
                <button
                    onClick={handleApplyPaint}
                    className={`w-full py-3 px-4 rounded-lg font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-2 transition-all ${hasPendingChanges
                        ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)]'
                        : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        }`}
                    style={{ fontFamily: 'Rajdhani, sans-serif' }}
                >
                    <CheckCircle size={18} />
                    {hasPendingChanges ? 'Apply Paint' : 'No Changes'}
                </button>

                {/* Reset Button */}
                <button
                    onClick={handleReset}
                    className="w-full py-3 px-4 rounded-lg border border-white/10 bg-transparent text-gray-400 hover:text-red-500 hover:border-red-500/50 transition-all flex items-center justify-center gap-2 group"
                    style={{ fontFamily: 'Rajdhani, sans-serif' }}
                >
                    <RotateCcw size={16} className="group-hover:rotate-[-360deg] transition-transform duration-500" />
                    <span className="text-sm font-bold uppercase tracking-wider">Reset to Stock</span>
                </button>
            </div>
        </motion.div>
    );
}
