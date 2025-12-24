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
            itemCategory: 'Special',
            itemFilter: 'brakes',
        },
        Seat: {
            attachPoint: [0.4, 0.1, 1.5],
            calloutPos: [1.2, 1.5, 1],
            itemCategory: 'Special',
            itemFilter: 'seat',
        },
        Nitro: {
            attachPoint: [0, -0.2, 0],
            calloutPos: [0, 1.5, -0.9],
            itemCategory: 'Special',
            itemFilter: 'nitro',
        },
    },

    // ========== VW Golf GTI Mk2 1992 ==========
    vw_golf_gti_mk2: {
        Engine: {
            attachPoint: [0, 0.2, 3.5],
            calloutPos: [0, 1.2, 4],
            itemCategory: 'Engines',
        },
        Turbo: {
            attachPoint: [0.5, 0.3, 3.2],
            calloutPos: [1, 0.9, 4],
            itemCategory: 'Turbos',
        },
        Wheels: {
            attachPoint: [1.2, -0.3, 3.5],
            calloutPos: [2.0, 0, 3.8],
            itemCategory: 'Wheels',
        },
        Suspension: {
            attachPoint: [1.0, -0.1, 0],
            calloutPos: [1.8, 0.5, 0],
            itemCategory: 'Suspensions',
        },
        Breaks: {
            attachPoint: [1.2, -0.4, 3.3],
            calloutPos: [2.0, 0.6, 3],
            itemCategory: 'Special',
            itemFilter: 'brakes',
        },
        Seat: {
            attachPoint: [0.4, 0.2, 1.2],
            calloutPos: [1.2, 1.4, 0.8],
            itemCategory: 'Special',
            itemFilter: 'seat',
        },
        Nitro: {
            attachPoint: [0, -0.1, -0.5],
            calloutPos: [0, 1.4, -1.2],
            itemCategory: 'Special',
            itemFilter: 'nitro',
        },
    },

    // ========== Audi Sport Quattro 1984 ==========
    audi_sport_quattro_1984: {
        Engine: {
            attachPoint: [0, 0.1, 3.6],
            calloutPos: [0, 1.2, 4.2],
            itemCategory: 'Engines',
        },
        Turbo: {
            attachPoint: [0.6, 0.25, 3.4],
            calloutPos: [1.1, 0.9, 4.2],
            itemCategory: 'Turbos',
        },
        Wheels: {
            attachPoint: [1.3, -0.35, 3.7],
            calloutPos: [2.0, 0, 4],
            itemCategory: 'Wheels',
        },
        Suspension: {
            attachPoint: [1.1, -0.15, 0],
            calloutPos: [2, 0.5, 0],
            itemCategory: 'Suspensions',
        },
        Breaks: {
            attachPoint: [1.3, -0.45, 3.5],
            calloutPos: [2.0, 0.6, 3.2],
            itemCategory: 'Special',
            itemFilter: 'brakes',
        },
        Seat: {
            attachPoint: [0.45, 0.15, 1.4],
            calloutPos: [1.2, 1.5, 1],
            itemCategory: 'Special',
            itemFilter: 'seat',
        },
        Nitro: {
            attachPoint: [0, -0.15, -0.3],
            calloutPos: [0, 1.5, -1],
            itemCategory: 'Special',
            itemFilter: 'nitro',
        },
    },

    // ========== Mazda MX-5 1989 ==========
    mazda_mx5_1989: {
        Engine: {
            attachPoint: [0, 0, 3.2],
            calloutPos: [0, 1.1, 3.8],
            itemCategory: 'Engines',
        },
        Turbo: {
            attachPoint: [0.5, 0.2, 3],
            calloutPos: [1, 0.8, 3.8],
            itemCategory: 'Turbos',
        },
        Wheels: {
            attachPoint: [1.1, -0.4, 3.3],
            calloutPos: [1.8, 0, 3.5],
            itemCategory: 'Wheels',
        },
        Suspension: {
            attachPoint: [1.0, -0.2, 0],
            calloutPos: [1.8, 0.5, 0],
            itemCategory: 'Suspensions',
        },
        Breaks: {
            attachPoint: [1.1, -0.5, 3.1],
            calloutPos: [1.8, 0.6, 2.8],
            itemCategory: 'Special',
            itemFilter: 'brakes',
        },
        Seat: {
            attachPoint: [0.35, 0.05, 1.2],
            calloutPos: [1.1, 1.4, 0.8],
            itemCategory: 'Special',
            itemFilter: 'seat',
        },
        Nitro: {
            attachPoint: [0, -0.2, -0.5],
            calloutPos: [0, 1.4, -1.1],
            itemCategory: 'Special',
            itemFilter: 'nitro',
        },
    },

    // ========== Ferrari F40 1987 ==========
    ferrari_f40_1987: {
        Engine: {
            attachPoint: [0, 0.1, -2],
            calloutPos: [0, 1.2, -2.5],
            itemCategory: 'Engines',
        },
        Turbo: {
            attachPoint: [0.6, 0.2, -1.8],
            calloutPos: [1.1, 0.9, -2.2],
            itemCategory: 'Turbos',
        },
        Wheels: {
            attachPoint: [1.4, -0.4, 3.5],
            calloutPos: [2.2, 0, 3.8],
            itemCategory: 'Wheels',
        },
        Suspension: {
            attachPoint: [1.2, -0.2, 0],
            calloutPos: [2.2, 0.5, 0],
            itemCategory: 'Suspensions',
        },
        Breaks: {
            attachPoint: [1.4, -0.5, 3.3],
            calloutPos: [2.2, 0.6, 3],
            itemCategory: 'Special',
            itemFilter: 'brakes',
        },
        Seat: {
            attachPoint: [0.4, 0.1, 1],
            calloutPos: [1.2, 1.5, 0.5],
            itemCategory: 'Special',
            itemFilter: 'seat',
        },
        Nitro: {
            attachPoint: [0, -0.2, -2.5],
            calloutPos: [0, 1.5, -3],
            itemCategory: 'Special',
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
const Callout = ({ category, item, attachPoint, calloutPos }) => {
    const hasItem = item !== null && item !== undefined;

    // Only show callout if item is equipped
    if (!hasItem) return null;

    // Get rarity color for the item
    const rarityColor = getRarityColor(item.rarityLevel);
    const rarityGlow = getRarityGlow(item.rarityLevel);

    // Check if item is special (rainbow animated)
    const isSpecial = item.rarityLevel >= 6;

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

            {/* Small dot at attachment point - white, full opacity */}
            <mesh position={attachPoint}>
                <sphereGeometry args={[0.03, 16, 16]} />
                <meshBasicMaterial color="#ffffff" transparent={false} opacity={1} />
            </mesh>

            {/* Callout Box - rarity colored border (rainbow for special) */}
            <Html
                position={calloutPos}
                center
                distanceFactor={6}
                style={{ pointerEvents: 'none' }}
            >
                <div
                    className={isSpecial ? 'rainbow-border' : ''}
                    style={{
                        width: '160px',
                        height: '160px',
                        border: isSpecial ? '3px solid' : `3px solid ${rarityColor}`,
                        borderRadius: '12px',
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px',
                        boxShadow: isSpecial ? undefined : `0 0 40px ${rarityGlow}`,
                    }}
                >
                    <img
                        src={item.image?.startsWith('/') ? item.image : `/${item.image}`}
                        alt={item.title}
                        style={{
                            width: '80px',
                            height: '80px',
                            objectFit: 'contain',
                            marginBottom: '6px',
                        }}
                        onError={(e) => {
                            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect fill="%23333" width="80" height="80"/></svg>';
                        }}
                    />
                    <span
                        className={isSpecial ? 'rainbow-text' : ''}
                        style={{
                            color: isSpecial ? undefined : rarityColor,
                            fontSize: '16px',
                            fontFamily: 'Rajdhani, sans-serif',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            textAlign: 'center',
                            lineHeight: 1.1,
                            marginBottom: '4px',
                        }}
                    >
                        {item.title}
                    </span>
                    <span style={{
                        color: '#22C55E',
                        fontSize: '14px',
                        fontFamily: 'Rajdhani, sans-serif',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                    }}>
                        YIELD: {item.cashback || '0%'}
                    </span>
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

    // For Special items with filters, also check inventory
    if (itemFilter && inventory) {
        const inventoryItem = inventory.find(item =>
            item.category === itemCategory &&
            item.title?.toLowerCase().includes(itemFilter.toLowerCase())
        );
        if (inventoryItem) {
            return inventoryItem;
        }
    }

    return null;
};

// Main CarCallouts Component
const CarCallouts = ({ equippedParts = {}, inventory = [], visible = true, carModelId = 'bmw_m3_e30' }) => {
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
                    />
                );
            })}
        </group>
    );
};

export default CarCallouts;
