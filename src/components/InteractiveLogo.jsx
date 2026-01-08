import React from 'react';

const InteractiveLogo = ({ height = "h-10", color = "#EF4444" }) => {
    return (
        <a
            href="https://jup.ag/"
            target="_blank"
            rel="noopener noreferrer"
            className="block cursor-pointer group relative"
        >
            {/* Invisible Image to maintain layout/aspect ratio */}
            <img
                src="/gear-logo.svg"
                alt="Gear.fun"
                className={`${height} w-auto opacity-0`}
            />
            {/* Colored Mask Overlay */}
            <div
                className={`absolute inset-0 transition-colors duration-200 ease-out`}
                style={{
                    backgroundColor: 'white',
                    maskImage: 'url(/gear-logo.svg)',
                    maskRepeat: 'no-repeat',
                    maskSize: 'contain',
                    maskPosition: 'center',
                    WebkitMaskImage: 'url(/gear-logo.svg)',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskSize: 'contain',
                    WebkitMaskPosition: 'center',
                    // Dynamic Hover Logic via inline style override on hover is tricky in React without state
                    // So we use a CSS variable for the hover color and a generic class
                }}
            >
                {/* We need to apply the hover color. Since we can't easily do group-hover:bg-[dynamic], 
                    we'll wrap this inner div or use style injection. 
                    Actually, cleaner way: */}
            </div>
            <div
                className="absolute inset-0 transition-colors duration-200 ease-out bg-white group-hover:bg-[var(--hover-color)]"
                style={{
                    '--hover-color': color,
                    maskImage: 'url(/gear-logo.svg)',
                    maskRepeat: 'no-repeat',
                    maskSize: 'contain',
                    maskPosition: 'center',
                    WebkitMaskImage: 'url(/gear-logo.svg)',
                    WebkitMaskRepeat: 'no-repeat',
                    WebkitMaskSize: 'contain',
                    WebkitMaskPosition: 'center',
                }}
            />
        </a>
    );
};

export default InteractiveLogo;
