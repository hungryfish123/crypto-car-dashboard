import React, { useState } from 'react';
import { Volume2, VolumeX, Music, Music2 } from 'lucide-react';
import { useAudio } from '../hooks/useAudio';

const AudioControls = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const { musicMuted, sfxMuted, toggleMusicMute, toggleSfxMute } = useAudio();

    return (
        <div
            className="relative flex items-center"
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            {/* Expandable Container - Circle to Pill */}
            <div
                className={`flex items-center justify-center bg-black/60 backdrop-blur-md border border-white/10 overflow-hidden transition-all duration-300 ease-out ${isExpanded
                        ? 'w-[88px] h-10 rounded-full gap-1 px-2'
                        : 'w-10 h-10 rounded-full'
                    }`}
            >
                {/* Music Toggle */}
                <button
                    onClick={toggleMusicMute}
                    className={`flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 ${isExpanded
                            ? 'w-8 h-8 opacity-100'
                            : 'w-0 h-0 opacity-0'
                        } ${musicMuted
                            ? 'bg-red-600/30 text-red-400 hover:bg-red-600/50'
                            : 'bg-green-600/30 text-green-400 hover:bg-green-600/50'
                        }`}
                    title={musicMuted ? 'Unmute Music' : 'Mute Music'}
                >
                    {musicMuted ? (
                        <Music size={14} className="opacity-60" />
                    ) : (
                        <Music2 size={14} />
                    )}
                </button>

                {/* SFX Toggle */}
                <button
                    onClick={toggleSfxMute}
                    className={`flex-shrink-0 rounded-full flex items-center justify-center transition-all duration-300 ${isExpanded
                            ? 'w-8 h-8 opacity-100'
                            : 'w-0 h-0 opacity-0'
                        } ${sfxMuted
                            ? 'bg-red-600/30 text-red-400 hover:bg-red-600/50'
                            : 'bg-green-600/30 text-green-400 hover:bg-green-600/50'
                        }`}
                    title={sfxMuted ? 'Unmute SFX' : 'Mute SFX'}
                >
                    {sfxMuted ? (
                        <VolumeX size={14} className="opacity-60" />
                    ) : (
                        <Volume2 size={14} />
                    )}
                </button>

                {/* Main Icon (Visible when collapsed) */}
                <div
                    className={`flex-shrink-0 flex items-center justify-center transition-all duration-300 ${isExpanded
                            ? 'w-0 h-0 opacity-0'
                            : 'w-6 h-6 opacity-100'
                        }`}
                >
                    {musicMuted && sfxMuted ? (
                        <VolumeX size={18} className="text-gray-500" />
                    ) : (
                        <Volume2 size={18} className="text-red-500" />
                    )}
                </div>
            </div>
        </div>
    );
};

export default AudioControls;
