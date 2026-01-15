import React, { useState, useEffect } from 'react';

// Fixed Target Date: January 22, 2026 at 03:36:21+01:00 (7 days from implementation)
const RACE_UNLOCK_DATE = new Date('2026-01-22T03:36:21+01:00').getTime();

const RaceCountdown = () => {
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    function calculateTimeLeft() {
        const difference = RACE_UNLOCK_DATE - new Date().getTime();

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

    const timeUnits = [
        { label: 'DAYS', value: timeLeft.days },
        { label: 'HOURS', value: timeLeft.hours },
        { label: 'MINUTES', value: timeLeft.minutes },
        { label: 'SECONDS', value: timeLeft.seconds }
    ];

    return (
        <div className="flex items-center justify-center gap-4 md:gap-8">
            {timeUnits.map((unit, index) => (
                <React.Fragment key={unit.label}>
                    <div className="flex flex-col items-center">
                        <div
                            className="text-4xl md:text-6xl font-bold text-white tabular-nums tracking-wider"
                            style={{
                                fontFamily: 'Orbitron, sans-serif'
                            }}
                        >
                            {unit.value.toString().padStart(2, '0')}
                        </div>
                        <div
                            className="text-xs md:text-sm text-red-500 font-bold uppercase tracking-[0.2em] mt-2"
                            style={{ fontFamily: 'Orbitron, sans-serif' }}
                        >
                            {unit.label}
                        </div>
                    </div>
                    {index < timeUnits.length - 1 && (
                        <div className="text-2xl md:text-4xl text-gray-600 font-bold -mt-8 animate-pulse">:</div>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

export default RaceCountdown;
