import React from 'react';
import { Html, Line } from '@react-three/drei';

// Define callout positions - 7 key parts around the car
// Each callout maps to item categories from the marketplace
const CALLOUT_POSITIONS = {
    Engine: {
        attachPoint: [0.1, 0.3, 2.2],     // Hood attachment point
        calloutPos: [0, 1.2, 2.5],        // Box above hood
        itemCategory: 'Engines',          // Maps to marketplace category
    },
    Turbo: {
        attachPoint: [0.8, 0.29, 2.1],    // Front door/body attachment point
        calloutPos: [1.2, 0.6, 2.5],      // Box forward and to the left
        itemCategory: 'Turbos',
    },
    Wheels: {
        attachPoint: [1.2, -0.4, 2.4],    // Front wheel area
        calloutPos: [2.0, 0, 2.5],        // Box to the front-right
        itemCategory: 'Wheels',
    },
    Suspension: {
        attachPoint: [1.3, -0.2, -2],     // Rear wheel area
        calloutPos: [2, 0.5, -2],         // Box to the rear-left
        itemCategory: 'Suspensions',
    },
    Breaks: {
        attachPoint: [1.3, -0.5, 2.1],    // Front wheel area
        calloutPos: [2.0, 0.5, 1.5],      // Box above rear
        itemCategory: 'Special',          // Brakes are in Special category
        itemFilter: 'brakes',             // Filter by title containing "brakes"
    },
    Seat: {
        attachPoint: [0.6, 0.3, 0],       // Interior
        calloutPos: [1.2, 1.5, 0],        // Box to the side
        itemCategory: 'Special',
        itemFilter: 'seat',
    },
    Nitro: {
        attachPoint: [0, -0.2, -2.2],     // Rear area
        calloutPos: [0, 1.5, -2.5],       // Box to the rear
        itemCategory: 'Special',
        itemFilter: 'nitro',
    },
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
                        width: '180px',
                        height: '160px',
                        border: isSpecial ? '3px solid' : `3px solid ${rarityColor}`,
                        borderRadius: '12px',
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '12px',
                        boxShadow: isSpecial ? undefined : `0 0 30px ${rarityGlow}`,
                    }}
                >
                    <img
                        src={item.image?.startsWith('/') ? item.image : `/${item.image}`}
                        alt={item.title}
                        style={{
                            width: '90px',
                            height: '90px',
                            objectFit: 'contain',
                            marginBottom: '8px',
                        }}
                        onError={(e) => {
                            e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 90 90"><rect fill="%23333" width="90" height="90"/></svg>';
                        }}
                    />
                    <span
                        className={isSpecial ? 'rainbow-text' : ''}
                        style={{
                            color: isSpecial ? undefined : rarityColor,
                            fontSize: '13px',
                            fontFamily: 'Rajdhani, sans-serif',
                            fontWeight: '800',
                            textTransform: 'uppercase',
                            textAlign: 'center',
                            lineHeight: 1.2,
                            marginBottom: '4px',
                        }}
                    >
                        {item.title}
                    </span>
                    <span style={{
                        color: '#22C55E',
                        fontSize: '12px',
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
const CarCallouts = ({ equippedParts = {}, inventory = [], visible = true }) => {
    if (!visible) return null;

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
