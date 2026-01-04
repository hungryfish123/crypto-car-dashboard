import React from 'react';

const InteractiveLogo = ({ height = "h-10" }) => {
    return (
        <a
            href="https://jup.ag/"
            target="_blank"
            rel="noopener noreferrer"
            className="block cursor-pointer group"
        >
            {/* SVG Logo - White by default, Red on hover */}
            <img
                src="/gear-logo.svg"
                alt="Gear.fun"
                className={`${height} w-auto object-contain transition-all duration-200 
                    [filter:brightness(0)_invert(1)] 
                    group-hover:[filter:brightness(0)_saturate(100%)_invert(27%)_sepia(95%)_saturate(6167%)_hue-rotate(354deg)_brightness(92%)_contrast(120%)]`}
            />
        </a>
    );
};

export default InteractiveLogo;
