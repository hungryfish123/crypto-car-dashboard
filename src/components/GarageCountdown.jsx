import React, { useState, useEffect } from 'react';

// Fixed Target Date: January 17, 2026 at 04:00:00+01:00 (2 days from request)
const GARAGE_UNLOCK_DATE = new Date('2026-01-17T04:00:00+01:00').getTime();

const GarageCountdown = ({ showLabel = true, size = "text-sm md:text-base", align = "items-end" }) => {
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    function calculateTimeLeft() {
        const difference = GARAGE_UNLOCK_DATE - new Date().getTime();

        if (difference <= 0) {
            return { days: 0, hours: 0, minutes: 0, seconds: 0 };
        }

        return {
            days: Math.floor(difference / (1000 * 60 * 60 * 24)),
            hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
            minutes: Math.floor((difference / 1000 / 60) % 60),
            seconds: Math.floor((difference / 1000) % 60)
        };
    }

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <div className={`flex flex-col ${align}`}>
            <div className={`flex items-center gap-2 font-bold text-white tabular-nums tracking-wider ${size}`} style={{ fontFamily: 'Orbitron, sans-serif' }}>
                <span>{timeLeft.days}d</span>
                <span>{timeLeft.hours.toString().padStart(2, '0')}h</span>
                <span>{timeLeft.minutes.toString().padStart(2, '0')}m</span>
                <span>{timeLeft.seconds.toString().padStart(2, '0')}s</span>
            </div>
            {showLabel && <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mt-1">Unlocks In</div>}
        </div>
    );
};

export default GarageCountdown;
