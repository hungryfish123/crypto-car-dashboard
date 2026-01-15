import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, CheckCircle, Upload, Palette, Sticker } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';
import GarageCountdown from './GarageCountdown';

import { useDynamicLinks } from '../hooks/useDynamicLinks';

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
    rainbowUnlocked,
    onUnlockRainbow,
    themeColor,
    setThemeColor
}) {
    const { links } = useDynamicLinks();
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
    const hasUserInteracted = useRef(false); // Track if user has changed sliders

    const [previewColor, setPreviewColor] = useState(carColor);
    const [previewFinish, setPreviewFinish] = useState(carFinish);

    // Sync preview state with actual car color when it changes from parent (e.g. on mount)
    // This ensures we start with the correct saved color
    useEffect(() => {
        if (!hasUserInteracted.current) {
            setPreviewColor(carColor);
            savedColorRef.current = carColor;
        }
    }, [carColor]);

    useEffect(() => {
        if (!hasUserInteracted.current) {
            setPreviewFinish(carFinish);
            savedFinishRef.current = carFinish;
        }
    }, [carFinish]);

    const updateGlobalTheme = (color) => {
        let themeColor = color;
        // Handle Black -> Gray mapping for visibility
        if (color.toLowerCase() === '#000000') themeColor = '#9ca3af'; // gray-400
        if (color.toLowerCase() === '#ffffff') themeColor = '#ffffff';

        // Helper to convert hex to rgb
        const hexToRgbVals = (hex) => {
            let r = 0, g = 0, b = 0;
            if (hex.length === 4) {
                r = parseInt(hex[1] + hex[1], 16);
                g = parseInt(hex[2] + hex[2], 16);
                b = parseInt(hex[3] + hex[3], 16);
            } else {
                r = parseInt(hex.substring(1, 3), 16);
                g = parseInt(hex.substring(3, 5), 16);
                b = parseInt(hex.substring(5, 7), 16);
            }
            return { r, g, b };
        };

        const { r, g, b } = hexToRgbVals(themeColor);
        const rgbString = `${r}, ${g}, ${b}`;

        // Calculate YIQ contrast
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        const textColor = (yiq >= 128) ? '#000000' : '#FFFFFF';

        const styleId = 'dynamic-theme-styles';
        let style = document.getElementById(styleId);
        if (!style) {
            style = document.createElement('style');
            style.id = styleId;
            document.head.appendChild(style);
        }

        style.textContent = `
            .text-red-400, .text-red-500, .text-red-600, .text-red-700 { color: ${themeColor} !important; }
            
            /* Backgrounds needing potential text contrast adjustment */
            .bg-red-400, .bg-red-500, .bg-red-600, .bg-red-700 { 
                background-color: ${themeColor} !important; 
                color: ${textColor} !important;
            }
            
            /* Buttons specifically might need explicit color overrides if they use text-white */
            button.bg-red-600, button.bg-red-500, .group.bg-red-600 {
                color: ${textColor} !important;
            }

            /* Fix Icon Contrast - If text is black, remove white invert filter */
            button.bg-red-600 img, button.bg-red-500 img {
                filter: ${textColor === '#000000' ? 'brightness(0)' : 'brightness(0) invert(1)'} !important;
                opacity: 0.8;
            }

            .border-red-400, .border-red-500, .border-red-600, .border-red-500\\/20, .border-red-500\\/30, .border-red-500\\/50 { border-color: ${themeColor} !important; }
            .from-red-400, .from-red-500, .from-red-600 { --tw-gradient-from: ${themeColor} !important; }
            .to-red-400, .to-red-500, .to-red-600 { --tw-gradient-to: ${themeColor} !important; }
            .via-red-400, .via-red-500, .via-red-600 { --tw-gradient-via: ${themeColor} !important; }
            
            /* Opacity variants */
            .bg-red-500\\/5 { background-color: rgba(${rgbString}, 0.05) !important; }
            .bg-red-500\\/10, .bg-red-900\\/20 { background-color: rgba(${rgbString}, 0.1) !important; }
            .bg-red-500\\/20, .bg-red-600\\/20 { background-color: rgba(${rgbString}, 0.2) !important; }
            .bg-red-500\\/30 { background-color: rgba(${rgbString}, 0.3) !important; }
            .bg-red-500\\/50 { background-color: rgba(${rgbString}, 0.5) !important; }
            
            /* Shadows */
            .shadow-red-500\\/50, .shadow-red-900\\/40 { --tw-shadow-color: ${themeColor} !important; }
            
            /* Selection */
            ::selection { background-color: ${themeColor}; color: ${textColor}; }
            
            /* Range Sliders */
            input[type="range"]::-webkit-slider-thumb { background-color: ${themeColor} !important; border-color: white !important; }
            input[type="range"]::-moz-range-thumb { background-color: ${themeColor} !important; border-color: white !important; }
            
            /* Scrollbars */
            ::-webkit-scrollbar-thumb { background-color: ${themeColor} !important; }
        `;
    };

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
        hasUserInteracted.current = true; // Mark as user interaction
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
            window.open(links.paint_unlock, '_blank');
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
        hasUserInteracted.current = true; // Mark as user interaction
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
        // Reset global theme to red
        updateGlobalTheme('#dc2626');
        if (setThemeColor) setThemeColor('#dc2626');
        playClick();
    };

    const handleApplyPaint = () => {
        // Apply updates
        if (previewColor !== carColor) setCarColor(previewColor);
        if (previewFinish !== carFinish) setCarFinish(previewFinish);

        // Update refs
        savedColorRef.current = previewColor;
        savedFinishRef.current = previewFinish;
        savedEffectRef.current = specialEffect;

        // ALWAYS apply global theme (car color = global theme)
        updateGlobalTheme(previewColor);
        if (setThemeColor) setThemeColor(previewColor);

        playColorSuccess();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
    };

    // HSL to Hex conversion - ONLY when user actively changes sliders
    useEffect(() => {
        // Skip on initial mount - only run when user interacts with sliders
        if (!hasUserInteracted.current) return;

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

    // Live preview: sync previewColor to actual car color for real-time feedback
    // Only when user is actively previewing (hasUserInteracted)
    useEffect(() => {
        if (hasUserInteracted.current) {
            setCarColor(previewColor);
        }
    }, [previewColor, setCarColor]);

    useEffect(() => {
        if (hasUserInteracted.current) {
            setCarFinish(previewFinish);
        }
    }, [previewFinish, setCarFinish]);

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
        <>
            <motion.div
                initial={{ x: -400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed left-8 top-24 w-80 h-[80vh] bg-black/80 backdrop-blur-xl border border-white/10 rounded-3xl z-40 flex flex-col shadow-2xl shadow-black/50 overflow-hidden ring-1 ring-white/5"
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
                                    className={`aspect-square rounded-full transition-all duration-300 relative overflow-hidden group flex items-center justify-center ${previewColor.toUpperCase() === color.toUpperCase() && !specialEffect
                                        ? 'scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)] ring-1 ring-white/50'
                                        : 'border border-white/10 hover:border-white/30 hover:scale-105'
                                        }`}
                                    style={{ backgroundColor: color }}
                                    title={color}
                                >
                                    {previewColor.toUpperCase() === color.toUpperCase() && !specialEffect && (
                                        <div className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] flex items-center justify-center w-full h-full">
                                            <Check size={20} className="text-white filter drop-shadow-md" strokeWidth={4} />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* HSL Sliders */}
                        <div className={`space-y-4 transition-opacity duration-300 ${specialEffect ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                            <style>{`
                            .custom-slider::-webkit-slider-thumb { 
                                background-color: ${previewColor} !important; 
                                border: none !important; 
                                box-shadow: none !important;
                            }
                            .custom-slider::-moz-range-thumb { 
                                background-color: ${previewColor} !important; 
                                border: none !important;
                                box-shadow: none !important;
                            }
                        `}</style>

                            {/* Hue */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[11px] text-white uppercase tracking-widest font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>Hue</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="360"
                                    value={hue}
                                    onChange={(e) => { hasUserInteracted.current = true; setHue(parseInt(e.target.value)); }}
                                    className={`w-full h-1 rounded-full appearance-none cursor-pointer bg-neutral-800 custom-slider ${sliderThumbStyle}`}
                                />
                            </div>

                            {/* Saturation */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[11px] text-white uppercase tracking-widest font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>Saturation</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="100"
                                    value={saturation}
                                    onChange={(e) => { hasUserInteracted.current = true; setSaturation(parseInt(e.target.value)); }}
                                    className={`w-full h-1 rounded-full appearance-none cursor-pointer bg-neutral-800 custom-slider ${sliderThumbStyle}`}
                                />
                            </div>

                            {/* Lightness */}
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[11px] text-white uppercase tracking-widest font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>Lightness</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="90"
                                    value={lightness}
                                    onChange={(e) => { hasUserInteracted.current = true; setLightness(parseInt(e.target.value)); }}
                                    className={`w-full h-1 rounded-full appearance-none cursor-pointer bg-neutral-800 custom-slider ${sliderThumbStyle}`}
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
                                        ? 'bg-red-600 border-red-600 text-white'
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
                                    ? 'bg-red-600 hover:bg-red-500 text-white translate-y-[-1px]'
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
                            Reset
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

            </motion.div >

            {/* RIGHT SIDE PANEL - Garage Pass */}
            <motion.div
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30, delay: 0.1 }}
                className="fixed right-8 top-24 w-80 h-[80vh] bg-black/80 backdrop-blur-xl border border-white/10 rounded-3xl z-40 flex flex-col shadow-2xl shadow-black/50 overflow-hidden ring-1 ring-white/5"
            >
                {/* Header */}
                <div className="p-6 pb-2">
                    <h1 className="text-xl font-bold text-red-500 uppercase tracking-widest" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                        Garage Pass
                    </h1>
                    <div className="mt-2">
                        <GarageCountdown showLabel={false} size="text-sm" align="items-start" />
                    </div>
                </div>

                {/* Scrollable Content - Expanded Spacing */}
                <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8">

                    {/* 1. Part Colors - Expanded */}
                    <div>
                        <h3 className="text-red-500 text-xs uppercase tracking-[0.2em] font-bold mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                            Part Colors
                        </h3>
                        <div className="filter blur-[2px] pointer-events-none select-none opacity-50">
                            {/* Colors Grid - Larger Circles */}
                            <div className="grid grid-cols-4 gap-4 mb-4">
                                {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ffffff', '#000000'].map((color, i) => (
                                    <div key={i} className="aspect-square rounded-full border-2 border-white/20 shadow-lg" style={{ backgroundColor: color }}></div>
                                ))}
                            </div>
                            {/* Part Selection - Vertical Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col items-center justify-center gap-2 aspect-[4/3]">
                                    <Palette size={24} className="text-gray-400" />
                                    <span className="text-white text-[10px] uppercase font-bold tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>Wheels</span>
                                </div>
                                <div className="p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col items-center justify-center gap-2 aspect-[4/3]">
                                    <Palette size={24} className="text-gray-400" />
                                    <span className="text-white text-[10px] uppercase font-bold tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>Calipers</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px w-full bg-white/5"></div>

                    {/* 2. Add Vinyl - Larger Grid */}
                    <div>
                        <h3 className="text-red-500 text-xs uppercase tracking-[0.2em] font-bold mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                            Add Vinyl
                        </h3>
                        <div className="filter blur-[2px] pointer-events-none select-none opacity-50">
                            <div className="grid grid-cols-2 gap-3">
                                {['Racing', 'Stripes', 'Flames', 'Camo', 'Carbon', '+ More'].map((label, i) => (
                                    <div key={i} className="aspect-[3/2] bg-white/5 rounded-xl border border-white/10 flex flex-col items-center justify-center hover:bg-white/10 transition-colors">
                                        <Sticker size={24} className="text-gray-500 mb-2" />
                                        <span className="text-[10px] text-gray-500 font-bold uppercase">{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px w-full bg-white/5"></div>

                    {/* 3. Custom Wrap - Taller Upload Area */}
                    <div>
                        <h3 className="text-red-500 text-xs uppercase tracking-[0.2em] font-bold mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                            Custom Wrap
                        </h3>
                        <div className="filter blur-[2px] pointer-events-none select-none opacity-50">
                            <div className="w-full h-32 bg-white/5 rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center gap-3 hover:bg-white/10 transition-colors">
                                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                                    <Upload size={24} className="text-gray-400" />
                                </div>
                                <div className="text-center">
                                    <span className="block text-xs text-gray-400 font-bold uppercase mb-1" style={{ fontFamily: 'Orbitron, sans-serif' }}>Upload Image</span>
                                    <span className="text-[10px] text-gray-600">Supports PNG, JPG</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px w-full bg-white/5"></div>

                    {/* 4. Decals & Stickers - Real Images */}
                    <div>
                        <h3 className="text-red-500 text-xs uppercase tracking-[0.2em] font-bold mb-4" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                            Decals & Stickers
                        </h3>
                        <div className="filter blur-[1px] pointer-events-none select-none opacity-60">
                            <div className="grid grid-cols-2 gap-3">
                                {/* Sticker 1: Flame */}
                                <div className="aspect-square bg-white/5 rounded-xl border border-white/10 p-4 flex items-center justify-center overflow-hidden">
                                    <img src="/stickers/sticker_flame.png" alt="Flame" className="w-full h-full object-contain grayscale opacity-70" />
                                </div>
                                {/* Sticker 2: Skull */}
                                <div className="aspect-square bg-white/5 rounded-xl border border-white/10 p-4 flex items-center justify-center overflow-hidden">
                                    <img src="/stickers/sticker_skull.png" alt="Skull" className="w-full h-full object-contain grayscale opacity-70" />
                                </div>
                                {/* Sticker 3: Sponsor */}
                                <div className="aspect-square bg-white/5 rounded-xl border border-white/10 p-4 flex items-center justify-center overflow-hidden">
                                    <img src="/stickers/sticker_sponsor.png" alt="Sponsor" className="w-full h-full object-contain grayscale opacity-70" />
                                </div>
                                {/* Sticker 4: Number */}
                                <div className="aspect-square bg-white/5 rounded-xl border border-white/10 p-4 flex items-center justify-center overflow-hidden">
                                    <img src="/stickers/sticker_number.png" alt="Number" className="w-full h-full object-contain grayscale opacity-70" />
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </motion.div>
        </>
    );
}

