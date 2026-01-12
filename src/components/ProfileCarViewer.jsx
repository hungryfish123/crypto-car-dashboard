import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment, Center } from '@react-three/drei';

// BMW M3 E30 Model Path (hardcoded)
const BMW_MODEL_PATH = '/bmw_m3_coupe_e30_1986.glb';

/**
 * BMW Car Model Component
 * - Displays BMW M3 E30 in color
 * - Spins slowly 360° around itself
 */
function BMWModel({ color }) {
    const { scene } = useGLTF(BMW_MODEL_PATH, '/draco-gltf/');
    const groupRef = useRef();

    // Clone scene to avoid side effects
    const clonedScene = useMemo(() => scene.clone(true), [scene]);

    // Apply color styling
    useEffect(() => {
        if (!clonedScene) return;

        clonedScene.traverse((child) => {
            if (child.isMesh && child.material) {
                // Store original material
                if (!child.userData.originalMaterial) {
                    child.userData.originalMaterial = child.material.clone();
                }

                child.material = child.userData.originalMaterial.clone();

                // Apply color to body parts
                const matName = child.material.name?.toLowerCase() || '';
                const meshName = child.name?.toLowerCase() || '';
                if (matName.includes('paint') || matName.includes('body') || meshName.includes('body') || meshName.includes('paint')) {
                    child.material.color.set(color);
                    child.material.roughness = 0.2;
                    child.material.metalness = 0.6;
                }
                child.material.needsUpdate = true;
            }
        });
    }, [clonedScene, color]);

    // Slow spin animation (360° around Y axis)
    useFrame((_, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * 0.3; // Slow rotation
        }
    });

    return (
        <group ref={groupRef}>
            <Center>
                <primitive object={clonedScene} scale={0.65} />
            </Center>
        </group>
    );
}

// Preload BMW model
useGLTF.preload(BMW_MODEL_PATH, '/draco-gltf/');

/**
 * ProfileCarViewer Component
 * Displays BMW M3 E30 in a mini 3D viewer
 */
const ProfileCarViewer = ({ carColor = '#ff0000', isLocked = false }) => {
    return (
        <div className="w-full h-full relative flex flex-col">
            {/* Car Title - Color matches user selection */}
            <div className="absolute top-4 left-0 right-0 z-10 text-center">
                <h3
                    className="text-lg font-bold tracking-widest uppercase"
                    style={{ fontFamily: 'Orbitron, sans-serif', color: carColor }}
                >
                    BMW M3
                </h3>
                <p className="text-gray-500 text-[10px] uppercase tracking-wide" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    E30 Coupe · 1986
                </p>
            </div>

            {/* 3D Canvas */}
            <Canvas
                shadows={false}
                dpr={[1, 1.5]}
                camera={{ fov: 35, position: [0, 1.5, 6], near: 0.1, far: 100 }}
                gl={{ antialias: true, powerPreference: 'high-performance' }}
                style={{ flex: 1 }}
            >
                {/* Lighting */}
                <ambientLight intensity={0.8} />
                <directionalLight position={[5, 5, 5]} intensity={1.2} />
                <directionalLight position={[-5, 3, -5]} intensity={0.6} />

                <Suspense fallback={null}>
                    <BMWModel color={carColor} />
                    <Environment preset="city" />
                </Suspense>
            </Canvas>

            {/* Locked Blur Overlay */}
            {isLocked && (
                <div className="absolute inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center pointer-events-none z-20 rounded-xl">
                    <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-2 backdrop-blur-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <p className="text-gray-300 text-xs uppercase tracking-widest font-bold" style={{ fontFamily: 'Orbitron, sans-serif' }}>Locked</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileCarViewer;
