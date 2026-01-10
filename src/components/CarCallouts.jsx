import React from 'react';
import { Html, Line } from '@react-three/drei';

// Define callout positions PER CAR MODEL
// Each car model has its own set of attach points and callout positions
// To adjust a specific car's callouts, modify its section below

const CALLOUT_POSITIONS_BY_MODEL = {
    // ========== BMW M3 E30 1986 ==========
    bmw_m3_e30: {
        Engine: {
            attachPoint: [0, 0, 3.8],
            calloutPos: [0, 1.1, 4.2],
            itemCategory: 'Engines',
        },
        Turbo: {
            attachPoint: [0.6, 0.2, 3.6],
            calloutPos: [1, 0.8, 4.5],
            itemCategory: 'Turbos',
        },
        Wheels: {
            attachPoint: [1.3, -0.4, 3.9],
            calloutPos: [2.0, 0, 4],
            itemCategory: 'Wheels',
        },
        Suspension: {
            attachPoint: [1.1, -0.2, 0],
            calloutPos: [2, 0.5, 0],
            itemCategory: 'Suspensions',
        },
        Breaks: {
            attachPoint: [1.3, -0.5, 3.7],
            calloutPos: [2.0, 0.6, 3.3],
            itemCategory: 'Special_Brakes',
            itemFilter: 'brake',
        },
        Seat: {
            attachPoint: [0.4, 0.1, 1.5],
            calloutPos: [1.2, 1.5, 1],
            itemCategory: 'Special_Seat',
            itemFilter: 'seat',
        },
        Nitro: {
            attachPoint: [0, -0.2, 0],
            calloutPos: [0, 1.5, -0.9],
            itemCategory: 'Special_Nitro',
            itemFilter: 'nitro',
        },
    },

    // ========== VW Golf GTI Mk2 1992 ==========
    // NOTE: All positions use NORMALIZED coordinates (car is scaled to ~10.5 units length)
    // Adjust X (left/right), Y (up/down), Z (front/back) to position callouts
    vw_golf_gti_mk2: {
        Engine: {
            attachPoint: [0, 0.0068, 0.015],
            calloutPos: [0, 0.012, 0.015],
            itemCategory: 'Engines',
        },
        Turbo: {
            attachPoint: [0.003, 0.0068, 0.015],
            calloutPos: [0.01, 0.012, 0.015],
            itemCategory: 'Turbos',
        },
        Wheels: {
            attachPoint: [0.008, 0.002, 0.013],
            calloutPos: [0.01, 0.008, 0.01],
            itemCategory: 'Wheels',
        },
        Suspension: {
            attachPoint: [0.007, 0.005, -0.011],
            calloutPos: [0.01, 0.012, -0.012],
            itemCategory: 'Suspensions',
        },
        Breaks: {
            attachPoint: [0.008, 0.002, -0.012],
            calloutPos: [0.013, 0.008, -0.013],
            itemCategory: 'Special_Brakes',
            itemFilter: 'brake',
        },
        Seat: {
            attachPoint: [0.003, 0.005, -0.0001],
            calloutPos: [0.009, 0.015, -0.0001],
            itemCategory: 'Special_Seat',
            itemFilter: 'seat',
        },
        Nitro: {
            attachPoint: [0, 0.0068, -0.015],
            calloutPos: [0, 0.012, -0.015],
            itemCategory: 'Special_Nitro',
            itemFilter: 'nitro',
        },
    },

    // ========== Audi Sport Quattro 1984 ==========
    audi_sport_quattro: {
        Engine: {
            attachPoint: [0, 0.0066, 0.015],
            calloutPos: [0, 0.012, 0.015],
            itemCategory: 'Engines',
        },
        Turbo: {
            attachPoint: [0.003, 0.0066, 0.015],
            calloutPos: [0.006, 0.010, 0.015],
            itemCategory: 'Turbos',
        },
        Wheels: {
            attachPoint: [0.0082, 0.002, 0.013],
            calloutPos: [0.01, 0.01, 0.013],
            itemCategory: 'Wheels',
        },
        Suspension: {
            attachPoint: [0.007, 0.005, -0.008],
            calloutPos: [0.01, 0.012, -0.01],
            itemCategory: 'Suspensions',
        },
        Breaks: {
            attachPoint: [0.008, 0.002, -0.01],
            calloutPos: [0.013, 0.008, -0.01],
            itemCategory: 'Special_Brakes',
            itemFilter: 'brake',
        },
        Seat: {
            attachPoint: [0.003, 0.005, -0.0001],
            calloutPos: [0.009, 0.015, -0.0001],
            itemCategory: 'Special_Seat',
            itemFilter: 'seat',
        },
        Nitro: {
            attachPoint: [0, 0.0066, -0.013],
            calloutPos: [0, 0.015, -0.015],
            itemCategory: 'Special_Nitro',
            itemFilter: 'nitro',
        },
    },

    // ========== Mazda MX-5 1989 ==========
    mazda_mx5_na: {
        Engine: {
            attachPoint: [0, 0.7, 1.2],
            calloutPos: [0, 1.1, 1.5],
            itemCategory: 'Engines',
        },
        Turbo: {
            attachPoint: [0.4, 0.7, 1.2],
            calloutPos: [0.5, 1.1, 1.5],
            itemCategory: 'Turbos',
        },
        Wheels: {
            attachPoint: [0.8, 0.3, 1.15],
            calloutPos: [1.1, 0.8, 1],
            itemCategory: 'Wheels',
        },
        Suspension: {
            attachPoint: [0.6, 0.5, -1.1],
            calloutPos: [1, 1.1, -1],
            itemCategory: 'Suspensions',
        },
        Breaks: {
            attachPoint: [0.75, 0.3, -1.1],
            calloutPos: [1.1, 0.8, -0.8],
            itemCategory: 'Special_Brakes',
            itemFilter: 'brake',
        },
        Seat: {
            attachPoint: [0.4, 0.5, -0.2],
            calloutPos: [0.7, 1.4, -0.2],
            itemCategory: 'Special_Seat',
            itemFilter: 'seat',
        },
        Nitro: {
            attachPoint: [0, 0.5, -1.1],
            calloutPos: [0, 1.4, -1.1],
            itemCategory: 'Special_Nitro',
            itemFilter: 'nitro',
        },
    },

    // ========== Ferrari F40 1987 ==========
    ferrari_f40: {
        Engine: {
            attachPoint: [0, 0.3, -1.1],
            calloutPos: [0, 1.4, -1.5],
            itemCategory: 'Engines',
        },
        Turbo: {
            attachPoint: [0.5, 0.3, -1.1],
            calloutPos: [0.5, 1.1, -1.2],
            itemCategory: 'Turbos',
        },
        Wheels: {
            attachPoint: [0.9, 0.33, -1.23],
            calloutPos: [1, 0.8, -1],
            itemCategory: 'Wheels',
        },
        Suspension: {
            attachPoint: [0.7, 0.5, 1.2],
            calloutPos: [0.8, 1, 1.3],
            itemCategory: 'Suspensions',
        },
        Breaks: {
            attachPoint: [0.85, 0.3, 1.1],
            calloutPos: [1.1, 0.6, 1],
            itemCategory: 'Special_Brakes',
            itemFilter: 'brake',
        },
        Seat: {
            attachPoint: [0.3, 0.4, 0.1],
            calloutPos: [0.5, 1.5, 0.2],
            itemCategory: 'Special_Seat',
            itemFilter: 'seat',
        },
        Nitro: {
            attachPoint: [0, 0, 1.8],
            calloutPos: [0, 1.1, 1.2],
            itemCategory: 'Special_Nitro',
            itemFilter: 'nitro',
        },
    },

    // ========== Lamborghini Huracan 2015 ==========
    lamborghini_huracan_2015: {
        Engine: {
            attachPoint: [0, 0.3, -1.1],
            calloutPos: [0, 1.4, -1.5],
            itemCategory: 'Engines',
        },
        Turbo: {
            attachPoint: [0.5, 0.3, -1.1],
            calloutPos: [0.5, 1.1, -1.2],
            itemCategory: 'Turbos',
        },
        Wheels: {
            attachPoint: [0.9, 0.33, -1.23],
            calloutPos: [1, 0.8, -1],
            itemCategory: 'Wheels',
        },
        Suspension: {
            attachPoint: [0.7, 0.5, 1.2],
            calloutPos: [0.8, 1, 1.3],
            itemCategory: 'Suspensions',
        },
        Breaks: {
            attachPoint: [0.85, 0.3, 1.1],
            calloutPos: [1.1, 0.6, 1],
            itemCategory: 'Special_Brakes',
            itemFilter: 'brake',
        },
        Seat: {
            attachPoint: [0.3, 0.4, 0.1],
            calloutPos: [0.5, 1.5, 0.2],
            itemCategory: 'Special_Seat',
            itemFilter: 'seat',
        },
        Nitro: {
            attachPoint: [0, 0, 1.8],
            calloutPos: [0, 1.1, 1.2],
            itemCategory: 'Special_Nitro',
            itemFilter: 'nitro',
        },
    },
};

// Helper to get positions for a specific model (fallback to BMW)
const getCalloutPositions = (carModelId) => {
    return CALLOUT_POSITIONS_BY_MODEL[carModelId] || CALLOUT_POSITIONS_BY_MODEL.bmw_m3_e30;
};

// Get rarity color based on rarityLevel
const getRarityColor = (rarityLevel) => {
    switch (rarityLevel) {
        case 1: return '#6B7280'; // Gray
        case 2: return '#22C55E'; // Green
        case 3: return '#3B82F6'; // Blue
        case 4: return '#A855F7'; // Purple
        case 5: return '#EAB308'; // Yellow/Gold
        case 6: return '#F97316'; // Orange (Special)
        case 7: return '#EF4444'; // Red (Ultra Special)
        default: return '#ffffff'; // White fallback
    }
};

// Get rarity glow color with transparency
const getRarityGlow = (rarityLevel) => {
    switch (rarityLevel) {
        case 1: return 'rgba(107, 114, 128, 0.4)';
        case 2: return 'rgba(34, 197, 94, 0.5)';
        case 3: return 'rgba(59, 130, 246, 0.5)';
        case 4: return 'rgba(168, 85, 247, 0.6)';
        case 5: return 'rgba(234, 179, 8, 0.6)';
        case 6: return 'rgba(249, 115, 22, 0.7)';
        case 7: return 'rgba(239, 68, 68, 0.8)';
        default: return 'rgba(255, 255, 255, 0.3)';
    }
};

// Single Callout Component - only renders when item is equipped
const Callout = ({ category, item, attachPoint, calloutPos, carScale = 1, unequipItem }) => {
    const hasItem = item !== null && item !== undefined;
    const [isHovered, setIsHovered] = React.useState(false);

    // Only show callout if item is equipped
    if (!hasItem) return null;

    // Get rarity color for the item
    const rarityColor = getRarityColor(item.rarityLevel);
    const rarityGlow = getRarityGlow(item.rarityLevel);

    // Check if item is special (rainbow animated)
    const isSpecial = item.rarityLevel >= 6;

    const handleUnequip = (e) => {
        e.stopPropagation();
        if (unequipItem && item) {
            unequipItem(item);
        }
    };

    return (
        <group>
            {/* 3D Line connecting attach point to callout - white, slightly transparent */}
            <Line
                points={[attachPoint, calloutPos]}
                color="#ffffff"
                lineWidth={1}
                dashed={false}
                opacity={0.8}
                transparent={true}
            />

            {/* Small dot at attachment point - size adjusted for car scale */}
            <mesh position={attachPoint} scale={[1 / carScale, 1 / carScale, 1 / carScale]}>
                <sphereGeometry args={[0.05, 16, 16]} />
                <meshBasicMaterial color="#ffffff" transparent={false} opacity={1} />
            </mesh>

            {/* Clickable Area Helper - Invisible mesh to catch clicks better if needed, but Html captures mouse events well */}

            {/* Callout Box - rarity colored border (rainbow for special) */}
            <Html
                position={calloutPos}
                center
                distanceFactor={6}
                style={{ cursor: 'pointer' }}
            >
                <div
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    onClick={handleUnequip}
                    className={isSpecial ? 'rainbow-full-glow' : ''}
                    style={{
                        position: 'relative', // For overlay
                        width: '192px',
                        height: '192px',
                        border: isSpecial ? '3px solid' : `3px solid ${rarityColor}`,
                        borderRadius: '12px',
                        backgroundColor: 'rgba(0, 0, 0, 0.95)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px',
                        boxShadow: isSpecial
                            ? undefined
                            : `0 0 40px ${rarityGlow}, inset 0 0 20px ${rarityGlow}`,
                        transition: 'all 0.2s ease',
                    }}
                >
                    {/* Content Container - Blurs on hover */}
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '100%',
                        height: '100%',
                        filter: isHovered ? 'blur(4px)' : 'none',
                        transition: 'filter 0.2s ease',
                        opacity: isHovered ? 0.4 : 1
                    }}>
                        <img
                            src={item.image?.startsWith('/') ? item.image : `/${item.image}`}
                            alt={item.title}
                            style={{
                                width: '125px',
                                height: '125px',
                                objectFit: 'contain',
                                marginBottom: '6px',
                            }}
                            onError={(e) => {
                                e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="125" height="125" viewBox="0 0 125 125"><rect fill="%23333" width="125" height="125"/></svg>';
                            }}
                        />
                        <span
                            style={{
                                color: '#ffffff',
                                fontSize: '16px',
                                fontFamily: 'Orbitron, sans-serif',
                                fontWeight: '800',
                                textTransform: 'uppercase',
                                textAlign: 'center',
                                lineHeight: 1.1,
                            }}
                        >
                            {item.title}
                        </span>
                    </div>

                    {/* Remove Overlay - Shows on hover */}
                    {isHovered && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 10
                        }}>
                            <span
                                style={{
                                    color: '#EF4444', // Red-500
                                    fontSize: '18px',
                                    fontFamily: 'Orbitron, sans-serif',
                                    fontWeight: '900',
                                    textTransform: 'uppercase',
                                    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                                    letterSpacing: '0.05em'
                                }}
                            >
                                REMOVE ITEM
                            </span>
                        </div>
                    )}
                </div>
            </Html>
        </group>
    );
};

// Find matching item for a callout based on category and filter
const findMatchingItem = (calloutConfig, equippedParts, inventory) => {
    const { itemCategory, itemFilter } = calloutConfig;

    // First check equippedParts for the main category
    if (equippedParts[itemCategory]) {
        const equippedItem = equippedParts[itemCategory];

        // If there's a filter, check if the item title matches
        if (itemFilter) {
            if (equippedItem.title?.toLowerCase().includes(itemFilter.toLowerCase())) {
                return equippedItem;
            }
        } else {
            // No filter, just return the equipped item
            return equippedItem;
        }
    }
    return null;
};

// Main CarCallouts Component
const CarCallouts = ({ equippedParts = {}, inventory = [], visible = true, carModelId = 'bmw_m3_e30', carScale = 1, unequipItem }) => {
    if (!visible) return null;

    // Get the callout positions for this specific car model
    const CALLOUT_POSITIONS = getCalloutPositions(carModelId);

    return (
        <group>
            {Object.entries(CALLOUT_POSITIONS).map(([calloutName, config]) => {
                const matchingItem = findMatchingItem(config, equippedParts, inventory);

                return (
                    <Callout
                        key={calloutName}
                        category={calloutName}
                        item={matchingItem}
                        attachPoint={config.attachPoint}
                        calloutPos={config.calloutPos}
                        carScale={carScale}
                        unequipItem={unequipItem}
                    />
                );
            })}
        </group>
    );
};

export default CarCallouts;
