import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CheckCircle, Lock } from 'lucide-react';
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
    setSceneBackground,
    specialEffect,
    setSpecialEffect,
    rainbowUnlocked, // New prop
    onUnlockRainbow  // New prop
}) {
    const [showSuccess, setShowSuccess] = useState(false);

    // Initialize state based on persisted unlocked status
    const [rainbowState, setRainbowState] = useState(rainbowUnlocked ? 'verified' : 'idle');

    // Update state if prop changes (e.g. initial load or subsequent login)
    useEffect(() => {
        if (rainbowUnlocked) {
            setRainbowState('verified');
        }
    }, [rainbowUnlocked]);

    const savedColorRef = useRef(carColor);
    const savedFinishRef = useRef(carFinish);
    const savedEffectRef = useRef(specialEffect);

    const [previewColor, setPreviewColor] = useState(carColor);
    const [previewFinish, setPreviewFinish] = useState(carFinish);

    const { playColorSuccess, playClick } = useAudio();

    const hasPendingChanges = previewColor !== savedColorRef.current || previewFinish !== savedFinishRef.current || specialEffect !== savedEffectRef.current;

    const stockColor = '#CC0000';
    const stockFinish = 'glossy';

    const predefinedColors = [
        '#FF0000', // Red
        '#FF8C00', // Orange
        '#FFD700', // Yellow
        '#22C55E', // Green
        '#3B82F6', // Blue
        '#A855F7', // Purple
        '#FFFFFF', // White
        '#000000', // Black
    ];

    const finishOptions = [
        { id: 'glossy', label: 'Gloss' },
        { id: 'matte', label: 'Matte' },
        { id: 'chrome', label: 'Chrome' },
    ];

    const hexToHSL = (H) => {
        let r = 0, g = 0, b = 0;
        if (H.length == 4) {
            r = "0x" + H[1] + H[1];
            g = "0x" + H[2] + H[2];
            b = "0x" + H[3] + H[3];
        } else if (H.length == 7) {
            r = "0x" + H[1] + H[2];
            g = "0x" + H[3] + H[4];
            b = "0x" + H[5] + H[6];
        }
        r /= 255; g /= 255; b /= 255;
        let cmin = Math.min(r, g, b), cmax = Math.max(r, g, b), delta = cmax - cmin, h = 0, s = 0, l = 0;
        if (delta == 0) h = 0;
        else if (cmax == r) h = ((g - b) / delta) % 6;
        else if (cmax == g) h = (b - r) / delta + 2;
        else h = (r - g) / delta + 4;
        h = Math.round(h * 60);
        if (h < 0) h += 360;
        l = (cmax + cmin) / 2;
        s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
        s = +(s * 100).toFixed(1);
        l = +(l * 100).toFixed(1);
        return { h, s, l };
    };

    const handlePresetClick = (color) => {
        setPreviewColor(color);
        setSpecialEffect(null);
        const { h, s, l } = hexToHSL(color);
        setHue(h);
        setSaturation(s);
        setLightness(l);
        playClick();
    };

    const handleRainbowClick = () => {
        if (rainbowState === 'idle') {
            // Open X.com in a new tab
            window.open('https://x.com', '_blank');
            setRainbowState('verifying'); // Start verifying

            // Start 10s timer
            setTimeout(() => {
                setRainbowState('verified');
                if (onUnlockRainbow) onUnlockRainbow(); // Call persistence handler
            }, 10000);
        } else if (rainbowState === 'verified') {
            // Apply Rainbow Effect
            setSpecialEffect('rainbow');
            playClick();
        }
    };

    const handleFinishClick = (finishId) => {
        setPreviewFinish(finishId);
        playClick();
    };


    const handleReset = () => {
        setPreviewColor(stockColor);
        setPreviewFinish(stockFinish);
        setSpecialEffect(null);
        setCarColor(stockColor);
        setCarFinish(stockFinish);
        savedColorRef.current = stockColor;
        savedFinishRef.current = stockFinish;
        savedEffectRef.current = null;
        setHue(0);
        setSaturation(100);
        setLightness(50);
        // We do NOT reset rainbowState so they don't have to verify again this session
        playClick();
    };

    const handleApplyPaint = () => {
        savedColorRef.current = previewColor;
        savedFinishRef.current = previewFinish;
        savedEffectRef.current = specialEffect;
        setCarColor(previewColor);
        setCarFinish(previewFinish);
        playColorSuccess();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    useEffect(() => {
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
        const hex = ('#' + toHex(r) + toHex(g) + toHex(b)).toUpperCase();
        setPreviewColor(hex);
    }, [hue, saturation, lightness]);

    useEffect(() => {
        setCarColor(previewColor);
        setCarFinish(previewFinish);
    }, [previewColor, previewFinish, setCarColor, setCarFinish]);

    const sliderThumbStyle = `
        [&::-webkit-slider-thumb]:appearance-none
        [&::-webkit-slider-thumb]:h-4
        [&::-webkit-slider-thumb]:w-4
        [&::-webkit-slider-thumb]:rounded-full
        [&::-webkit-slider-thumb]:bg-red-500
        [&::-webkit-slider-thumb]:border-2
        [&::-webkit-slider-thumb]:border-white
        [&::-webkit-slider-thumb]:cursor-pointer
        [&::-webkit-slider-thumb]:transition-transform
        [&::-webkit-slider-thumb]:hover:scale-110
        [&::-moz-range-thumb]:h-4
        [&::-moz-range-thumb]:w-4
        [&::-moz-range-thumb]:rounded-full
        [&::-moz-range-thumb]:bg-red-500
        [&::-moz-range-thumb]:border-2
        [&::-moz-range-thumb]:border-white
        [&::-moz-range-thumb]:cursor-pointer
    `;

    return (
        <motion.div
            initial={{ x: -400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-8 top-24 w-80 max-h-[85vh] h-fit bg-black/80 backdrop-blur-xl border border-white/10 rounded-3xl z-40 flex flex-col shadow-2xl shadow-black/50 overflow-hidden ring-1 ring-white/5"
        >
            {/* Header */}
            <div className="p-6 pb-2">
                <h1 className="text-xl font-bold text-red-500 uppercase tracking-widest" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    Paint Shop
                </h1>
            </div>

            {/* Content & Footer Combined for Compactness */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">

                {/* 1. Base Color */}
                <div>
                    <h3 className="text-red-500 text-xs uppercase tracking-[0.2em] font-bold mb-3" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                        Base Color
                    </h3>

                    {/* Presets - 2 Rows of 4 */}
                    <div className="grid grid-cols-4 gap-3 mb-5">
                        {predefinedColors.map((color) => (
                            <button
                                key={color}
                                onClick={() => handlePresetClick(color)}
                                className={`aspect-square rounded-full transition-all duration-200 ${previewColor.toUpperCase() === color.toUpperCase() && !specialEffect
                                    ? 'ring-2 ring-offset-2 ring-offset-black ring-red-500 scale-110'
                                    : 'border border-white/10 hover:border-white/30'
                                    }`}
                                style={{ backgroundColor: color }}
                                title={color}
                            />
                        ))}
                    </div>

                    {/* HSL Sliders */}
                    <div className={`space-y-4 transition-opacity duration-300 ${specialEffect ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                        {/* Hue */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] text-white uppercase tracking-widest font-bold">Hue</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="360"
                                value={hue}
                                onChange={(e) => setHue(parseInt(e.target.value))}
                                className={`w-full h-1 rounded-full appearance-none cursor-pointer bg-red-900/30 ${sliderThumbStyle}`}
                            />
                        </div>

                        {/* Saturation */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] text-white uppercase tracking-widest font-bold">Saturation</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="100"
                                value={saturation}
                                onChange={(e) => setSaturation(parseInt(e.target.value))}
                                className={`w-full h-1 rounded-full appearance-none cursor-pointer bg-red-900/30 ${sliderThumbStyle}`}
                            />
                        </div>

                        {/* Lightness */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] text-white uppercase tracking-widest font-bold">Lightness</span>
                            </div>
                            <input
                                type="range"
                                min="0" max="90"
                                value={lightness}
                                onChange={(e) => setLightness(parseInt(e.target.value))}
                                className={`w-full h-1 rounded-full appearance-none cursor-pointer bg-red-900/30 ${sliderThumbStyle}`}
                            />
                        </div>
                    </div>
                </div>

                {/* Divider */}
                <div className="h-px w-full bg-red-500/30" />

                {/* 2. Finish */}
                <div className={`${specialEffect && specialEffect !== 'rainbow' ? 'opacity-30 pointer-events-none' : 'opacity-100'} transition-opacity`}>
                    <h3 className="text-red-500 text-xs uppercase tracking-[0.2em] font-bold mb-3" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                        Finish
                    </h3>

                    {/* Standard Finishes */}
                    <div className="flex gap-2 mb-3">
                        {finishOptions.map((finish) => (
                            <button
                                key={finish.id}
                                onClick={() => handleFinishClick(finish.id)}
                                className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-all border ${previewFinish === finish.id
                                    ? 'bg-red-600 border-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.3)]'
                                    : 'bg-transparent border-red-500/30 text-gray-400 hover:text-white hover:border-red-500'
                                    }`}
                                style={{ fontFamily: 'Orbitron, sans-serif' }}
                            >
                                {finish.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 2. Special Effects Section - Styled to stand out */}
                <div className="bg-red-500/5 -mx-6 px-6 py-6 border-y border-white/5">
                    <div className="mb-4">
                        <h3 className="text-red-500 text-xs uppercase tracking-[0.2em] font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                            Special Effects
                        </h3>
                    </div>

                    {/* Rainbow Rush Button with Overlay */}
                    <button
                        onClick={handleRainbowClick}
                        disabled={rainbowState === 'verifying'}
                        className={`w-full h-11 rounded-lg relative overflow-hidden group border transition-all ${specialEffect === 'rainbow'
                            ? 'border-red-500 shadow-[0_0_20px_rgba(220,38,38,0.4)] scale-[1.02]'
                            : 'border-white/10 hover:border-white/30 hover:scale-[1.01]'
                            }`}
                    >
                        {/* Rainbow Background */}
                        <div className="absolute inset-0 opacity-50" style={{ background: 'linear-gradient(90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }} />

                        {/* Content based on State */}
                        <div className={`absolute inset-0 flex items-center justify-center gap-2 transition-colors ${rainbowState === 'verified' && specialEffect !== 'rainbow'
                            ? 'bg-transparent hover:bg-black/20'
                            : 'bg-black/60'
                            }`}>
                            {rainbowState === 'idle' && (
                                <>
                                    <span className="text-white font-bold text-xs uppercase" style={{ fontFamily: 'Orbitron, sans-serif' }}>𝕏</span>
                                    <span className="text-[9px] font-bold text-white uppercase tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                                        Follow to unlock
                                    </span>
                                </>
                            )}

                            {rainbowState === 'verifying' && (
                                <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider animate-pulse" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                                    Verifying...
                                </span>
                            )}

                            {rainbowState === 'verified' && (
                                <span className={`text-xs font-bold uppercase tracking-widest ${specialEffect === 'rainbow' ? 'text-white drop-shadow-md' : 'text-white/90'
                                    }`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
                                    Rainbow Rush
                                </span>
                            )}
                        </div>
                    </button>
                </div>

                {/* Footer - Compact & Inline */}
                <div className="pt-2 space-y-3">
                    <button
                        onClick={handleApplyPaint}
                        disabled={!hasPendingChanges}
                        className={`w-full py-3.5 rounded-xl font-bold text-xs tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2
                            ${hasPendingChanges
                                ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40 translate-y-[-1px]'
                                : 'bg-red-900/20 text-red-500/50 cursor-default'}`}
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        {hasPendingChanges ? 'Apply Paint' : 'Applied'}
                    </button>

                    <button
                        onClick={handleReset}
                        className="w-full text-center text-[10px] uppercase tracking-[0.2em] font-bold text-gray-500 hover:text-red-400 transition-colors py-2 flex items-center justify-center gap-2"
                        style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                        Reset Stock
                    </button>
                </div>
            </div>

            {/* Success Animation */}
            <AnimatePresence>
                {showSuccess && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    >
                        <div className="flex flex-col items-center">
                            <CheckCircle size={48} className="text-red-500 mb-4" />
                            <h2 className="text-xl font-bold text-white uppercase tracking-widest" style={{ fontFamily: 'Orbitron, sans-serif' }}>Paint Applied</h2>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

        </motion.div>
    );
}
