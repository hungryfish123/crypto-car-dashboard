import { Howl, Howler } from 'howler';
import { useState, useCallback, useEffect, useRef } from 'react';

// Sound configurations
// Sound configurations
const SOUNDS_CONFIG = {
    // bgm removed as requested
    engine: { src: ['/sounds/carengine.mp3'], volume: 0.8 },
    ratchet: { src: ['/sounds/ratchet.mp3'], volume: 0.7 },
    colorSuccess: { src: ['/sounds/colorchange.mp3'], volume: 0.6 },
    click: { src: ['/sounds/click.mp3'], volume: 0.4 },
    hover: { src: ['/sounds/hover.mp3'], volume: 0.2 },
    success: { src: ['/sounds/success.mp3'], volume: 0.6 }
};

// TRUE Singleton - only one instance ever created
let soundsInstance = null;
let musicMutedGlobal = false;
let sfxMutedGlobal = false;

// Subscribers for state updates
const subscribers = new Set();

const notifySubscribers = () => {
    subscribers.forEach(callback => callback());
};

const initializeSounds = () => {
    if (!soundsInstance) {
        soundsInstance = {};

        Object.entries(SOUNDS_CONFIG).forEach(([key, config]) => {
            try {
                const sound = new Howl({
                    src: config.src,
                    volume: config.volume,
                    loop: config.loop || false,
                    preload: true,
                    onloaderror: () => console.warn(`${key}.mp3 not found`)
                });
                soundsInstance[key] = sound;
            } catch (e) {
                console.warn(`Failed to load ${key}:`, e);
            }
        });
    }
    return soundsInstance;
};

// Initialize sounds immediately (singleton)
initializeSounds();

export const useAudio = () => {
    const [, forceUpdate] = useState(0);

    // Subscribe to global state changes
    useEffect(() => {
        const update = () => forceUpdate(n => n + 1);
        subscribers.add(update);
        return () => subscribers.delete(update);
    }, []);

    // SFX Play Functions
    const playSFX = useCallback((soundKey) => {
        try {
            if (!sfxMutedGlobal && soundsInstance?.[soundKey]) {
                soundsInstance[soundKey].play();
            }
        } catch (e) {
            console.warn(`Error playing ${soundKey}:`, e);
        }
    }, []);

    const playClick = useCallback(() => playSFX('click'), [playSFX]);
    const playHover = useCallback(() => playSFX('hover'), [playSFX]);
    const playSuccess = useCallback(() => playSFX('success'), [playSFX]);
    const playEngine = useCallback(() => playSFX('engine'), [playSFX]);
    const playRatchet = useCallback(() => playSFX('ratchet'), [playSFX]);
    const playColorSuccess = useCallback(() => playSFX('colorSuccess'), [playSFX]);

    const playEquip = useCallback((category) => {
        if (category === 'Engines') {
            playEngine();
        } else {
            playRatchet();
        }
    }, [playEngine, playRatchet]);

    const toggleMusicMute = useCallback(() => {
        musicMutedGlobal = !musicMutedGlobal;
        // BGM instance removed, just toggling state for UI compatibility
        notifySubscribers();
    }, []);

    const toggleSfxMute = useCallback(() => {
        sfxMutedGlobal = !sfxMutedGlobal;
        notifySubscribers();
    }, []);

    return {
        playClick,
        playHover,
        playSuccess,
        playEngine,
        playRatchet,
        playColorSuccess,
        playEquip,
        musicMuted: musicMutedGlobal,
        sfxMuted: sfxMutedGlobal,
        toggleMusicMute,
        toggleSfxMute
    };
};

export default useAudio;
