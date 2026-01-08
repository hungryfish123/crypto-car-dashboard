import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, useGLTF, Center, Grid, useTexture } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Lock, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { AppleStyleDock } from './components/AppleStyleDock';
import Marketplace from './components/Marketplace';
import GarageHUD from './components/GarageHUD';
import PaintShop from './components/PaintShop';
import LoginButton from './components/LoginButton';
import { usePrivy } from '@privy-io/react-auth';
import { fetchUserData, saveUserData } from './dbServices';
import { useAudio } from './hooks/useAudio';
import AudioControls from './components/AudioControls';
import ProfilePage from './components/ProfilePage';
import CarCallouts from './components/CarCallouts';
import CarModelSelector, { CAR_MODELS } from './components/CarModelSelector';
import AccessGate from './components/AccessGate';
import AdminPanel from './components/AdminPanel'; // Admin Panel Import
import Leaderboard from './components/Leaderboard';
import UsernameModal from './components/UsernameModal';
import { getProfile } from './dbServices';
import { supabase } from './supabaseClient';
import { MARKETPLACE_ITEMS } from './data/marketplaceItems';


// Preload the models
useGLTF.preload('/bmw_m3_coupe_e30_1986.glb');
useGLTF.preload('/1992_volkswagen_golf_gti_mk2.glb');
useGLTF.preload('/1984_audi_sport_quattro.glb');
useGLTF.preload('/1989_mazda_mx-5.glb');
useGLTF.preload('/1987_ferrari_f40.glb');


function IntroCamera() {
  const { camera } = useThree();
  const vec = new THREE.Vector3();

  useFrame((state) => {
    // Only run this lerp during the first ~3 seconds roughly
    if (state.clock.elapsedTime < 3) {
      // Lerp from a "far" position to the "target" position [5, 2, 5]
      // We calculate a step based on time to ease it in.
      // Ideally, start at [10, 5, 12] and end at [5, 2, 5]

      // Simple LERP approach:
      // Note: This is a continuous lerp towards target, which creates an ease-out effect.
      // Camera at Z=12.5 for a wider default view
      camera.position.lerp(vec.set(0, 0, 12.5), 0.05);
      camera.lookAt(0, 0, 0);
    }
  });
  return null;
}

// Custom Camera Controller with Pendulum Rotation
function PendulumControls({ activePage }) {
  const controlsRef = useRef();
  const lastInteractionTime = useRef(Date.now());
  const rotationDirection = useRef(1); // 1 = right, -1 = left
  const rotationSpeed = 0.05; // Slower rotation (was 0.15)
  const idleDelay = 2000; // 2 seconds delay before resuming

  // Target X offset based on active page (camera follows car position)
  const targetXOffset = activePage === 'Paint Shop' ? 5 : 0;
  const currentXOffset = useRef(0);

  // Azimuth limits (0 to PI/2 = front to right side)
  const minAzimuth = 0.05;
  const maxAzimuth = (Math.PI / 2) - 0.05;

  useFrame((state, delta) => {
    if (!controlsRef.current) return;

    const controls = controlsRef.current;
    const timeSinceInteraction = Date.now() - lastInteractionTime.current;

    // Smoothly lerp camera X offset for page transitions
    currentXOffset.current += (targetXOffset - currentXOffset.current) * 0.05;
    controls.target.x = currentXOffset.current;

    // Only auto-rotate after idle delay
    if (timeSinceInteraction > idleDelay) {
      // Get current azimuth angle
      const currentAzimuth = controls.getAzimuthalAngle();

      // Check if we hit the limits and need to reverse direction
      if (currentAzimuth >= maxAzimuth) {
        rotationDirection.current = -1; // Reverse to go left
      } else if (currentAzimuth <= minAzimuth) {
        rotationDirection.current = 1; // Reverse to go right
      }

      // Calculate new azimuth with smooth rotation
      const newAzimuth = currentAzimuth + (rotationSpeed * delta * rotationDirection.current);
      const clampedAzimuth = Math.max(minAzimuth, Math.min(maxAzimuth, newAzimuth));

      // Update camera position spherically
      const radius = controls.getDistance();
      const polarAngle = controls.getPolarAngle();
      const target = controls.target;

      controls.object.position.x = target.x + radius * Math.sin(polarAngle) * Math.sin(clampedAzimuth);
      controls.object.position.z = target.z + radius * Math.sin(polarAngle) * Math.cos(clampedAzimuth);
      controls.object.position.y = target.y + radius * Math.cos(polarAngle);
      controls.update();
    }
  });

  // Listen for user interactions to reset idle timer
  // REMOVED pointermove so hover doesn't stop it, only manual interaction
  useEffect(() => {
    const handleInteraction = () => {
      lastInteractionTime.current = Date.now();
    };

    window.addEventListener('pointerdown', handleInteraction);
    // window.addEventListener('pointermove', handleInteraction); // Removed hover stop
    window.addEventListener('wheel', handleInteraction);

    return () => {
      window.removeEventListener('pointerdown', handleInteraction);
      // window.removeEventListener('pointermove', handleInteraction);
      window.removeEventListener('wheel', handleInteraction);
    };
  }, []);

  return (
    <OrbitControls
      ref={controlsRef}
      autoRotate={false}
      minAzimuthAngle={0}
      maxAzimuthAngle={Math.PI / 2}
      minPolarAngle={Math.PI / 3}
      maxPolarAngle={Math.PI / 2.2}
      minDistance={5.2}
      maxDistance={15}
      enablePan={false}
    />
  );
}

// Dynamic Grid Component
function DynamicGrid({ carColor, specialEffect, ...props }) {
  const gridRef = useRef();

  useFrame((state) => {
    if (gridRef.current && specialEffect === 'rainbow') {
      const time = state.clock.elapsedTime;
      const hue = (time * 0.1) % 1; // Slower cycle for grid background
      // We can't easily animate internal shader uniforms of Drei Grid without knowing them.
      // However, we can cycle the cellColor/sectionColor props via a small ref logic if needed, 
      // but updating props triggers React render. 
      // For a simple effect, we'll try to rely on re-renders for the grid since it's just one object, 
      // OR we accept that the grid stays static rainbow.
      // User requested: "turns the car to rainbow colors and also applies that rainbow effect globally".
      // Let's try to animate the cellColor PROPS by using state in a parent? No, too slow.
      // Actually, to make it performant:
      // The Drei Grid creates a mesh with a shader material.
      // We can try to assume standard uniforms like 'cellColor' exist.
      // Let's access the material.
      const material = gridRef.current.material;
      if (material && material.uniforms && material.uniforms.cellColor) {
        material.uniforms.cellColor.value.setHSL(hue, 1, 0.5);
        material.uniforms.sectionColor.value.setHSL((hue + 0.5) % 1, 1, 0.3);
      }
    }
  });

  // Fallback: If specialEffect is on, we initiate with a base color, but useFrame handles animation.
  // If OFF, we pass standard colors.
  const activeCellColor = specialEffect === 'rainbow' ? '#ff0000' : (carColor === '#000000' || carColor === '#333333' ? '#444444' : carColor);

  return <Grid ref={gridRef} cellColor={activeCellColor} sectionColor={specialEffect === 'rainbow' ? '#00ff00' : '#666666'} {...props} />;
}

function CarModel({ rotationSpeed, triggerFlash, carColor, carFinish, activePage, isTransitioning = false, modelPath = '/bmw_m3_coupe_e30_1986.glb', isOwned = true, targetNames = [], autoScale = false, transitionDirection = 1, equippedParts = {}, inventory = [], carModelId = 'bmw_m3_e30', specialEffect = null }) {
  const { scene } = useGLTF(modelPath);
  const meshRef = useRef();
  const transformGroupRef = useRef();
  const prevIsOwned = useRef(isOwned);
  const revealState = useRef('idle'); // 'idle', 'heating', 'cooling'
  const glowIntensity = useRef(0);


  // Animation states
  const scaleRef = useRef(1);
  const opacityRef = useRef(1);
  const targetXPosition = activePage === 'Paint Shop' ? 4.5 : 0;
  // Track if this is the initial mount (no slide animation needed)
  const isInitialMount = useRef(true);
  // Initialize position: 0 on first load, slide from off-screen on model changes
  const currentXPosition = useRef(0);

  // Set slide-in position only after first mount (for model switching)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      currentXPosition.current = targetXPosition; // Start at final position
    } else {
      // Model switch - start from off-screen
      currentXPosition.current = transitionDirection === 1 ? 15 : -15;
    }
  }, [modelPath]);

  const transitionScale = useRef(1);
  const activeEffectRef = useRef(null); // Track active effect for cleanup

  // Robust Bounding Box Normalization - Scale matches models to TARGET_LENGTH
  const TARGET_LENGTH = 10.5;

  useLayoutEffect(() => {
    if (!scene) return;

    // Reset to identity for a clean measurement
    scene.scale.setScalar(1);
    scene.position.set(0, 0, 0);
    scene.updateMatrixWorld();

    // 1. Calculate bounding box of Meshes only (ignore lights/cameras)
    const box = new THREE.Box3();
    let hasMesh = false;
    scene.traverse((child) => {
      if (child.isMesh) {
        // EXCEPTION: Clone material for Object_85 so it doesn't share updates with others
        if (child.name === 'Object_85' && child.material) {
          child.material = child.material.clone();
        }

        box.expandByObject(child);
        hasMesh = true;
      }
    });

    if (hasMesh) {
      const size = new THREE.Vector3();
      box.getSize(size);
      const center = new THREE.Vector3();
      box.getCenter(center);

      // 2. Calculate scale factor based on model's length (X or Z axis)
      const currentLength = Math.max(size.x, size.z);
      let scale = TARGET_LENGTH / currentLength;

      // Safety check for NaN/Infinity/0
      if (!isFinite(scale) || scale <= 0) {
        scale = 1;
      }

      // 3. Apply normalization and centering to the wrapper group
      if (transformGroupRef.current) {
        transformGroupRef.current.scale.setScalar(scale);
        // Center X and Z
        transformGroupRef.current.position.x = -center.x * scale;
        transformGroupRef.current.position.z = -center.z * scale;
        // Align Y so the bottom of the bounding box (tires) sits on the floor (y=-1)
        const GROUND_Y = -1;
        transformGroupRef.current.position.y = (-box.min.y * scale) + GROUND_Y;
      }

      // Reset scene transforms to identity so wrapper has full control
      scene.scale.setScalar(1);
      scene.position.set(0, 0, 0);

      console.log(`[Fit-to-Target] ${modelPath} | Scale: ${scale.toFixed(3)} | Center: [${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)}]`);
    }
  }, [scene, modelPath]);


  // Store original materials to revert after flash, and apply color/finish
  const originalMaterials = useRef({});

  // Function to apply color and finish to the main car body
  const defaultTargetNames = ['Object_2', 'Object_20', 'Object_21', 'Object_22', 'Object_23'];
  const effectiveTargetNames = targetNames && targetNames.length > 0 ? targetNames : defaultTargetNames;

  // Function to apply silhouette effect (black with slight edge highlighting)
  const applySilhouette = useCallback(() => {
    if (!scene) return;

    scene.traverse((child) => {
      if (child.isMesh && child.material) {
        if (!child.userData.originalMaterial) {
          child.userData.originalMaterial = child.material.clone();
        }

        // Apply visible silhouette material
        const silhouetteMaterial = new THREE.MeshStandardMaterial({
          color: 0x1a1a1a,      // Lighter grey
          emissive: 0x111111,   // Slight self-illumination
          roughness: 0.8,
          metalness: 0.2,
          transparent: true,
          opacity: 0.95,        // More opaque
        });
        child.material = silhouetteMaterial;
      }
    });
  }, [scene]);

  // Function to restore original materials
  const restoreOriginalMaterials = useCallback(() => {
    if (!scene) return;

    scene.traverse((child) => {
      if (child.isMesh && child.userData.originalMaterial) {
        child.material = child.userData.originalMaterial;
        child.material.needsUpdate = true;
      }
    });
  }, [scene]);

  // Apply silhouette or restore based on ownership
  useEffect(() => {
    if (!isOwned) {
      applySilhouette();
      revealState.current = 'idle';
    } else if (prevIsOwned.current === false && isOwned === true) {
      // Car unlocked - restore materials immediately (no glow animation)
      restoreOriginalMaterials();
      revealState.current = 'idle';
      glowIntensity.current = 0;
      scaleRef.current = 1.1; // Small bounce effect only
    }
    prevIsOwned.current = isOwned;
  }, [isOwned, applySilhouette, restoreOriginalMaterials]);


  const applyCarStyle = useCallback((color, finish) => {
    if (!scene || !isOwned) return; // Don't apply car style if not owned

    // DEBUG: Log all mesh names to help find the correct target
    console.log('--- Apply Car Style Debug ---');
    scene.traverse((child) => {
      if (child.isMesh) {
        console.log('Mesh Name:', child.name);
      }
    });

    scene.traverse((child) => {
      // Use effectiveTargetNames instead of hardcoded targetNames
      if (child.isMesh && child.material) {
        // Get material(s) to check
        const materials = Array.isArray(child.material) ? child.material : [child.material];

        // Check if mesh name OR any material name matches targetNames
        const meshNameMatches = effectiveTargetNames.includes(child.name);
        const materialNameMatches = materials.some(mat => mat.name && effectiveTargetNames.includes(mat.name));

        if (meshNameMatches || materialNameMatches) {
          // EXCEPTION: Mazda MX-5 Object_85 should not change color (User Request)
          if (child.name === 'Object_85') {
            return;
          }

          console.log('Applying color to:', child.name, 'Material:', materials[0]?.name, 'Targets:', effectiveTargetNames);
          const material = materials[0];

          if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
            // Only apply standard color if NO special effect is active, or if this call is restoring state
            if (!specialEffect) {
              material.color.set(color);

              // FIX: Disable texture map if present, as it likely contains a baked color that interferes with tinting
              if (material.map) {
                material.map = null;
                material.needsUpdate = true;
              }

              // CRITICAL: Force emissive OFF to prevent glow effect on bright colors
              material.emissive.set('#000000');
              material.emissiveIntensity = 0;
            }

            // Clamp environment map intensity to prevent over-brightening
            material.envMapIntensity = 1.0;

            // Apply finish-specific material properties
            if (finish === 'glossy') {
              material.metalness = 0.15;
              material.roughness = 0.15;
            } else if (finish === 'matte') {
              material.metalness = 0.0;
              material.roughness = 0.85;
            } else if (finish === 'metallic') {
              material.metalness = 0.6;
              material.roughness = 0.25;
            } else if (finish === 'chrome') {
              material.metalness = 1.0;
              material.roughness = 0.0;
            }
            material.needsUpdate = true;
          }
        }
      }
    });

    // Reset any lingering flash effects when style is reapplied
    scene.traverse((child) => {
      if (child.isMesh && child.userData.originalEmissive) {
        child.material.emissive.copy(child.userData.originalEmissive);
        child.material.emissiveIntensity = child.userData.originalEmissiveIntensity;
      }
    });

  }, [scene, isOwned, effectiveTargetNames, specialEffect]);

  // Flash Effect logic - triggered by counter change
  // Flash Effect logic - triggered by counter change (Standard flash)
  useEffect(() => {
    // Only flash if we are NOT in the middle of a reveal animation
    if (triggerFlash > 0 && scene && revealState.current === 'idle') {
      scaleRef.current = 1.1; // Bounce animation

      // 1. FLASH ON: Set all materials to white glow
      scene.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.emissive.setHex(0xffffff);
          child.material.emissiveIntensity = 2.0;
        }
      });

      // 2. FLASH OFF: Revert after 150ms and reapply car style
      const timer = setTimeout(() => {
        scene.traverse((child) => {
          if (child.isMesh && child.material) {
            // Reset emissive to black (no glow)
            child.material.emissive.setHex(0x000000);
            child.material.emissiveIntensity = 0;
          }
        });
        // Reapply car color/finish after flash ends
        applyCarStyle(carColor, carFinish);
      }, 150);

      return () => clearTimeout(timer);
    }
  }, [triggerFlash]); // Only depend on triggerFlash counter


  // Initial Setup: Shadows & Positioning, and store original materials
  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        // Hide object_15
        if (child.name === 'Object_15' || child.name === 'object_15') {
          child.visible = false;
          return;
        }

        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;

          // Store original material properties for non-main-body parts or for flash revert
          if (!originalMaterials.current[child.uuid]) {
            originalMaterials.current[child.uuid] = {
              material: child.material.clone(), // Clone to preserve original state
              originalEmissive: child.material.emissive ? child.material.emissive.clone() : new THREE.Color(0, 0, 0),
              originalEmissiveIntensity: child.material.emissiveIntensity || 0
            };
          }
        }
      });
      // Apply initial color and finish
      applyCarStyle(carColor, carFinish);
    }
  }, [scene, applyCarStyle, carColor, carFinish]); // Re-apply if color/finish changes

  // Update car style when carColor or carFinish props change
  useEffect(() => {
    applyCarStyle(carColor, carFinish);
  }, [carColor, carFinish, applyCarStyle]);






  useFrame((state, delta) => {
    if (meshRef.current) {
      // Rotation
      meshRef.current.rotation.y += rotationSpeed;

      // Special Effect Logic
      if (specialEffect && scene && isOwned && revealState.current === 'idle') {
        const time = state.clock.elapsedTime;
        scene.traverse((child) => {
          if (child.isMesh && child.material && effectiveTargetNames.includes(child.name)) {

            // Rainbow Rush
            if (specialEffect === 'rainbow') {
              const hue = (time * 0.5) % 1; // Cycle hue every 2 seconds
              child.material.color.setHSL(hue, 1, 0.5);
              child.material.emissive.setHSL(hue, 1, 0.2); // Slight emissive for pop
              child.material.emissiveIntensity = 0.5;
            }
          }
        });
      } else if (!specialEffect && activeEffectRef.current) {
        // Effect was just turned off, restore static style immediately
        applyCarStyle(carColor, carFinish);
      }
      activeEffectRef.current = specialEffect;

      // Base X position for page transitions (Paint Shop offset)
      const baseX = activePage === 'Paint Shop' ? 4.5 : 0;

      // Slide transition on X-axis based on direction
      // If Next (dir=1): Old exits Left (-15), New enters from Right (+15)
      // If Prev (dir=-1): Old exits Right (+15), New enters from Left (-15)

      let targetX = baseX;

      if (isTransitioning) {
        // Exiting
        targetX = baseX + (transitionDirection === 1 ? -15 : 15);
      } else {
        // Entering (Target is baseX)
        targetX = baseX;
      }

      currentXPosition.current = THREE.MathUtils.lerp(currentXPosition.current, targetX, delta * 6);
      meshRef.current.position.x = currentXPosition.current;

      // Bounce/Scale Animation (no shrink during slide)
      if (scaleRef.current > 1 && !isTransitioning) {
        scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, 1, delta * 5);
        meshRef.current.scale.setScalar(scaleRef.current);
      }

      // Keep Y position stable
      meshRef.current.position.y = 0;

      // Handle Burn Reveal Animation
      if (revealState.current === 'heating') {
        const speed = 2.0;
        glowIntensity.current = THREE.MathUtils.lerp(glowIntensity.current, 8.0, delta * speed); // Heat up to 8.0 intensity

        // Apply heat to silhouette
        scene.traverse(child => {
          if (child.isMesh && child.material) {
            child.material.emissive.setHex(0xffffff);
            child.material.emissiveIntensity = glowIntensity.current;
            // Also make it fully opaque
            if (child.material.opacity) child.material.opacity = 1;
          }
        });

        // Trigger switch when hot enough (close to 8.0)
        if (glowIntensity.current > 7.0) {
          revealState.current = 'cooling';
          restoreOriginalMaterials();
          applyCarStyle(carColor, carFinish); // Ensure correct color is applied to restored mats

          // Set initial glow for cooling phase (start hot)
          glowIntensity.current = 5.0;

          // FORCE overwrite emissive immediately to prevent 1-frame dark flicker
          scene.traverse(child => {
            if (child.isMesh && child.material) {
              child.material.emissive.setHex(0xffffff);
              child.material.emissiveIntensity = glowIntensity.current;
            }
          });

          scaleRef.current = 1.15; // Bounce effect
        }

      } else if (revealState.current === 'cooling') {
        const coolSpeed = 1.0;
        glowIntensity.current = THREE.MathUtils.lerp(glowIntensity.current, 0, delta * coolSpeed);

        // Apply glow to restored materials
        scene.traverse(child => {
          if (child.isMesh && child.material) {
            child.material.emissive.setHex(0xffffff);
            child.material.emissiveIntensity = glowIntensity.current;
          }
        });

        // End animation
        if (glowIntensity.current < 0.05) {
          revealState.current = 'idle';
          glowIntensity.current = 0;
          // Final cleanup to ensure no lingering glow
          scene.traverse(child => {
            if (child.isMesh && child.material) {
              child.material.emissiveIntensity = 0;
              child.material.emissive.setHex(0x000000);
            }
          });
        }
      }

    }
  });

  return (
    <group ref={meshRef}>
      <group ref={transformGroupRef}>
        <primitive object={scene} />
        {/* Part Callouts - Now relative to car dimensions */}
        {activePage === 'Garage' && (
          <CarCallouts equippedParts={equippedParts} inventory={inventory} visible={true} carModelId={carModelId} />
        )}
      </group>
    </group>
  );
}

// Basic Error Boundary for production safety
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("CRITICAL UI ERROR:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-black flex flex-col items-center justify-center p-8 text-center">
          <h1 className="text-red-500 text-4xl font-bold mb-4 uppercase tracking-widest">System Failure</h1>
          <p className="text-gray-400 mb-8 max-w-md">The application encountered a critical rendering error. This usually happens when data is missing or a service is unavailable.</p>
          <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl mb-8 w-full max-w-lg overflow-auto max-h-40">
            <code className="text-red-400 text-xs text-left block whitespace-pre-wrap">{this.state.error?.toString()}</code>
          </div>
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="px-8 py-4 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-widest rounded-xl transition-all"
          >
            Reset App State & Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// MARKETPLACE_ITEMS already imported at top of file

function App() {
  const { user, authenticated } = usePrivy();
  const [activePage, setActivePage] = useState('Garage');
  const [initialSelectedItem, setInitialSelectedItem] = useState(null);
  const [earnings, setEarnings] = useState(0); // Using this as 'Cash' for now
  const [environment, setEnvironment] = useState('city'); // Default environment lighting
  const [sceneBackground, setSceneBackground] = useState('grid'); // Default floor type
  const [rotationSpeed, setRotationSpeed] = useState(0.00);
  const [earningRate, setEarningRate] = useState(0.00001);

  const [specialEffect, setSpecialEffect] = useState(null); // 'rainbow', 'galaxy', or null
  const [isDataLoaded, setIsDataLoaded] = useState(false); // Validates when data is fully synchronized
  const [userTokenBalances, setUserTokenBalances] = useState({}); // Map of contract address -> balance

  // Global Theme Utility - Apply saved theme on load
  const applyGlobalThemeFromColor = (color) => {
    let themeColor = color;
    if (color.toLowerCase() === '#000000') themeColor = '#9ca3af';
    if (color.toLowerCase() === '#ffffff') themeColor = '#ffffff';

    const hexToRgb = (hex) => {
      let r, g, b;
      if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
      } else {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
      }
      return `${r}, ${g}, ${b}`;
    };

    const rgb = hexToRgb(themeColor);
    const styleId = 'dynamic-theme-styles';
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }

    style.textContent = `
      .text-red-400, .text-red-500, .text-red-600, .text-red-700 { color: ${themeColor} !important; }
      .bg-red-400, .bg-red-500, .bg-red-600, .bg-red-700 { background-color: ${themeColor} !important; }
      .border-red-400, .border-red-500, .border-red-600, .border-red-500\\/20, .border-red-500\\/30, .border-red-500\\/50 { border-color: ${themeColor} !important; }
      .from-red-400, .from-red-500, .from-red-600 { --tw-gradient-from: ${themeColor} !important; }
      .to-red-400, .to-red-500, .to-red-600 { --tw-gradient-to: ${themeColor} !important; }
      .via-red-400, .via-red-500, .via-red-600 { --tw-gradient-via: ${themeColor} !important; }
      .bg-red-500\\/5 { background-color: rgba(${rgb}, 0.05) !important; }
      .bg-red-500\\/10, .bg-red-900\\/20 { background-color: rgba(${rgb}, 0.1) !important; }
      .bg-red-500\\/20, .bg-red-600\\/20 { background-color: rgba(${rgb}, 0.2) !important; }
      .bg-red-500\\/30 { background-color: rgba(${rgb}, 0.3) !important; }
      .bg-red-500\\/50 { background-color: rgba(${rgb}, 0.5) !important; }
      .shadow-red-500\\/50, .shadow-red-900\\/40 { --tw-shadow-color: ${themeColor} !important; }
      ::selection { background-color: ${themeColor}; color: black; }
      input[type="range"]::-webkit-slider-thumb { background-color: ${themeColor} !important; border-color: white !important; }
      input[type="range"]::-moz-range-thumb { background-color: ${themeColor} !important; border-color: white !important; }
      ::-webkit-scrollbar-thumb { background-color: ${themeColor} !important; }
    `;
  };

  // Car model selection
  const [currentCarModelIndex, setCurrentCarModelIndex] = useState(0);
  const [isModelTransitioning, setIsModelTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState(1); // 1 = Next, -1 = Prev

  // Owned cars - Load from localStorage for instant display, then verify with Supabase
  const [ownedCars, setOwnedCarsState] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_owned_cars');
      return cached ? JSON.parse(cached) : ['bmw_m3_e30'];
    } catch { return ['bmw_m3_e30']; }
  });

  // Wrapper setter that also caches to localStorage
  const setOwnedCars = (newValue) => {
    const value = typeof newValue === 'function' ? newValue(ownedCars) : newValue;
    setOwnedCarsState(value);
    try { localStorage.setItem('cached_owned_cars', JSON.stringify(value)); } catch { }
  };

  const [itemMappings, setItemMappings] = useState({}); // Map of itemId -> Contract Address

  // Get current car model info
  const currentCarModel = CAR_MODELS[currentCarModelIndex] || CAR_MODELS[0];
  const isCurrentCarOwned = ownedCars.includes(currentCarModel.id);

  // Access Gate State - Initialize from localStorage for persistence
  const [hasAccess, setHasAccess] = useState(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem('garage_access') === 'true';
    } catch (e) {
      console.warn("localStorage not accessible:", e);
      return false;
    }
  });
  const [showAdmin, setShowAdmin] = useState(false); // Admin Panel State

  // Rainbow Unlock State - Persistence per wallet
  const [rainbowUnlocked, setRainbowUnlocked] = useState(false);

  useEffect(() => {
    const storageKey = user?.wallet?.address ? `rainbow_unlocked_${user.wallet.address}` : 'rainbow_unlocked_guest';
    try {
      const stored = localStorage.getItem(storageKey);
      setRainbowUnlocked(stored === 'true');
    } catch (e) {
      console.warn("Failed to read rainbow state", e);
    }
  }, [user?.wallet?.address]);

  const handleUnlockRainbow = () => {
    setRainbowUnlocked(true);
    const storageKey = user?.wallet?.address ? `rainbow_unlocked_${user.wallet.address}` : 'rainbow_unlocked_guest';
    try {
      localStorage.setItem(storageKey, 'true');
    } catch (e) {
      console.error("Failed to save rainbow state", e);
    }
  };

  // Profile Onboarding State
  const [showUsernameModal, setShowUsernameModal] = useState(false);

  useEffect(() => {
    const checkProfile = async () => {
      if (authenticated && user?.wallet?.address) {
        const profile = await getProfile(user.wallet.address);
        if (!profile) {
          setShowUsernameModal(true);
        }
      }
    };
    checkProfile();
  }, [authenticated, user?.wallet?.address]);


  // Auto-bypass gate if wallet is connected
  useEffect(() => {
    if (authenticated && !hasAccess) {
      setHasAccess(true);
      try {
        localStorage.setItem('garage_access', 'true');
      } catch (e) { console.error("Failed to save access state:", e); }
    }
  }, [authenticated, hasAccess]);

  const handleUnlock = () => {
    setHasAccess(true);
    try {
      localStorage.setItem('garage_access', 'true');
    } catch (e) { console.error("Failed to save access state:", e); }
  };



  // Handle car model change with animation
  const handleCarModelChange = (newIndex, modelInfo, direction = 1) => {
    if (isModelTransitioning) return;
    setTransitionDirection(direction);
    setIsModelTransitioning(true);
    // After a short delay to allow exit animation
    setTimeout(() => {
      setCurrentCarModelIndex(newIndex);
      // Immediately turn off transitioning flag for the new component
      // The new component mounts with x=-15 and slides to 0 because isModelTransitioning is false
      setIsModelTransitioning(false);
    }, 300);
  };

  // Handle car purchase (State update only - actual burn is in CarModelSelector)
  const handleCarPurchase = (carId, price) => {
    if (demoMode) {
      setOwnedCars(prev => {
        if (!prev.includes(carId)) {
          return [...prev, carId];
        }
        return prev;
      });
      alert(`[DEMO MODE] Car ${carId} unlocked instantly!`);
      return;
    }

    // Standard unlock (called after successful burn)
    setOwnedCars(prev => {
      if (!prev.includes(carId)) {
        return [...prev, carId];
      }
      return prev;
    });
    playSuccess();
  };

  // Manual unlock handler - called when user clicks "Unlock" while holding tokens
  const handleManualUnlock = async (carId) => {
    console.log('[ManualUnlock] Unlocking car:', carId);

    // Add to owned cars
    setOwnedCars(prev => {
      if (!prev.includes(carId)) {
        return [...prev, carId];
      }
      return prev;
    });

    // Persist to database
    const walletAddress = user?.wallet?.address;
    if (walletAddress) {
      try {
        await unlockCar(walletAddress, carId);
        console.log('[ManualUnlock] Car unlock persisted to database');
      } catch (err) {
        console.warn('[ManualUnlock] Failed to persist unlock:', err);
      }
    }

    playSuccess();
  };

  // Auth
  // (usePrivy moved to top of App)

  // Demo Admin Mode - Press Ctrl+Shift+D to toggle
  const [demoMode, setDemoMode] = useState(false);
  const DEMO_WALLET_ADDRESS = 'DEMO_ADMIN_0x1234567890ABCDEF';

  // Demo mode keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Shift+D to toggle demo mode
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setDemoMode(prev => {
          const newMode = !prev;
          if (newMode) {
            console.log('🔧 DEMO ADMIN MODE ENABLED');
            alert('Demo Admin Mode ENABLED\nWallet: ' + DEMO_WALLET_ADDRESS + '\nCash: 999,999 CR');
          } else {
            console.log('🔧 DEMO ADMIN MODE DISABLED');
            alert('Demo Admin Mode DISABLED');
          }
          return newMode;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Admin Panel Shortcut (Alt + A)
  useEffect(() => {
    const handleAdminParams = (e) => {
      if (e.altKey && e.key.toLowerCase() === 'a') {
        setShowAdmin(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleAdminParams);
    return () => window.removeEventListener('keydown', handleAdminParams);
  }, []);

  // Check if user is "authenticated" (real wallet OR demo mode)
  const isAuthenticated = authenticated || demoMode;
  const currentWalletAddress = demoMode ? DEMO_WALLET_ADDRESS : user?.wallet?.address;

  // Audio
  const { playEquip, playSuccess } = useAudio();

  // Drag and Drop State
  const [draggedItem, setDraggedItem] = useState(null);
  const [actionTrigger, setActionTrigger] = useState(0);

  // Inventory State (purchased items) - Load from localStorage for instant display
  const [inventory, setInventoryState] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_inventory');
      return cached ? JSON.parse(cached) : [];
    } catch { return []; }
  });

  // Wrapper setter that also caches to localStorage
  const setInventory = (newInventory) => {
    const value = typeof newInventory === 'function'
      ? newInventory(inventory)
      : newInventory;
    setInventoryState(value);
    try { localStorage.setItem('cached_inventory', JSON.stringify(value)); } catch { }
  };

  // Equipped Parts State
  // Equipped Parts Map State (carId -> parts object)
  const [equippedPartsByCar, setEquippedPartsByCar] = useState({
    'bmw_m3_e30': {
      Engines: null,
      Turbos: null,
      Suspensions: null,
      Wheels: null,
      Special: null,
    },
    'vw_golf_gti_mk2': {
      Engines: null,
      Turbos: null,
      Suspensions: null,
      Wheels: null,
      Special: null,
    }
  });

  // Derived state for current car's equipped parts
  const equippedParts = equippedPartsByCar[currentCarModel.id] || {
    Engines: null,
    Turbos: null,
    Suspensions: null,
    Wheels: null,
    Special: null,
  };

  // Flash Effect State - Use counter to trigger unique flashes
  const [flashTrigger, setFlashTrigger] = useState(0);

  // Referral Code State
  const [referralCode, setReferralCode] = useState('');

  // Username and Avatar State (from player_data)
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Pending Rewards State (for Treasury Payout)
  const [pendingRewards, setPendingRewards] = useState(0);

  // Total Earned (Referral Earnings)
  const [referralEarnings, setReferralEarnings] = useState(0);

  // Function to equip an item (triggered by drag & drop)
  // Enforces "Unique Item" rule: Item can only be on one car at a time
  const equipItem = (item) => {
    if (!item || !item.category) return;

    // Prevent equipping on locked/unowned cars
    if (!isCurrentCarOwned) {
      console.log('[Equip] Cannot equip on locked car');
      return;
    }

    const currentCarId = currentCarModel.id;

    setEquippedPartsByCar(prev => {
      const newState = { ...prev };

      // 1. Check if item is equipped on ANY other car and remove it
      Object.keys(newState).forEach(carId => {
        const carParts = { ...newState[carId] };
        let changed = false;

        if (carParts[item.category]?.id === item.id) {
          // If this exact item is equipped elsewhere (or here), remove/replace it
          // Actually, if it's already here, we are just re-equipping (fine)
          // If it's elsewhere, we remove it from there (move to current)
          if (carId !== currentCarId) {
            carParts[item.category] = null;
            changed = true;
          }
        }

        if (changed) newState[carId] = carParts;
      });

      // 2. Equip on current car
      newState[currentCarId] = {
        ...(newState[currentCarId] || {}),
        [item.category]: item
      };

      return newState;
    });

    // Trigger flash effect by incrementing counter
    setFlashTrigger(prev => prev + 1);
    // Placeholder Items for Admin Panel Prop (This assumes MARKETPLACE_ITEMS is not exported, 
    // so we might need to export it from Marketplace.jsx or define it centrally. 
    // For now, I will assume Marketplace.jsx has the items. logic. 
    // Actually, MARKETPLACE_ITEMS are defined inside Marketplace component which is not ideal.
    // I will need to refactor or pass empty array first, then fix Marketplace.)
    // TEMPORARY FIX: Define items here or move them to a constant file.
    // BETTER APPROACH: Let's create a shared data/items.js file.

    // Play category-specific equip sound
    playEquip(item.category);
  };

  // Function to UNEQUIP an item from the current car
  const unequipItem = (item) => {
    if (!item || !item.category) return;
    const currentCarId = currentCarModel.id;

    setEquippedPartsByCar(prev => {
      const newState = { ...prev };
      const carParts = { ...(newState[currentCarId] || {}) };

      // Only unequip if it holds this specific item (or just clear the category)
      if (carParts[item.category]?.id === item.id) {
        carParts[item.category] = null;
        newState[currentCarId] = carParts;
      }
      return newState;
    });
  };

  // Function to add item to inventory
  const addToInventory = (item) => {
    setInventory(prev => {
      // Prevent duplicates
      if (prev.some(i => i.id === item.id)) {
        setTimeout(() => alert('You already own this item!'), 100);
        return prev;
      }
      // Show success message after state update
      setTimeout(() => alert('Item added to Garage!'), 100);
      playSuccess();
      return [...prev, { ...item, purchasedAt: Date.now() }];
    });
  };

  // Car Customization State - Single Global Color for All Cars
  // Initialize from localStorage for instant visual (no flash), then Supabase will override if different
  const [carColor, setCarColorState] = useState(() => {
    try {
      return localStorage.getItem('cached_car_color') || '#FF0000';
    } catch { return '#FF0000'; }
  });
  const [themeColor, setThemeColorState] = useState(() => {
    try {
      return localStorage.getItem('cached_theme_color') || '#dc2626';
    } catch { return '#dc2626'; }
  });
  const [carFinish, setCarFinish] = useState('glossy'); // 'glossy', 'matte', 'metallic'
  const [activeTab, setActiveTab] = useState('color'); // 'color', 'finish'

  // Wrapper setters that also cache to localStorage
  const setCarColor = (color) => {
    setCarColorState(color);
    try { localStorage.setItem('cached_car_color', color); } catch { }
  };
  const setThemeColor = (color) => {
    setThemeColorState(color);
    try { localStorage.setItem('cached_theme_color', color); } catch { }
  };

  // Apply cached theme CSS on initial mount (before Supabase loads)
  useEffect(() => {
    if (themeColor && themeColor !== '#dc2626') {
      applyGlobalThemeFromColor(themeColor);
    }
  }, []); // Run once on mount

  // HSL State for color picker (used by PaintShop, sync happens there)
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);
  // NOTE: HSL->hex conversion removed from here. It now only happens in PaintShop
  // when user actively changes sliders, preventing the saved color from being overwritten.

  // Earnings Ticker
  // Supabase Integration

  // Demo mode test data
  const DEMO_INVENTORY = [
    { id: 'eng_lv3', title: 'V8 Smooth', price: '4,500 CR', numPrice: 4500, image: '/level3.png', category: 'Engines', rarityLevel: 3, cashback: '2.5%' },
    { id: 'turbo_lv2', title: 'Small Turbo', price: '2,500 CR', numPrice: 2500, image: '/turbo2.png', category: 'Turbos', rarityLevel: 2, cashback: '1.8%' },
    { id: 'wheel_lv4', title: 'NASCAR Steelie', price: '14,000 CR', numPrice: 14000, image: '/wheel4.png', category: 'Wheels', rarityLevel: 4, cashback: '5.8%' },
    { id: 'susp_lv3', title: 'Sport Suspension', price: '4,800 CR', numPrice: 4800, image: '/suspension3.png', category: 'Suspensions', rarityLevel: 3, cashback: '3.0%' },
    { id: 'special_seat', title: 'Sparco Racing Seat', price: '25,000 CR', numPrice: 25000, image: '/sparco seat.png', category: 'Special', rarityLevel: 6, cashback: '8.0%' },
    { id: 'special_brakes', title: 'Ceramic Brembo Brakes', price: '35,000 CR', numPrice: 35000, image: '/ceramic breaks.png', category: 'Special', rarityLevel: 6, cashback: '10.5%' },
    { id: 'special_nitro', title: 'Nitro Boost System', price: '100,000 CR', numPrice: 100000, image: '/nitro boost.png', category: 'Special', rarityLevel: 7, cashback: '25.0%' },
  ];

  // 1. Load Data on Connect (or Demo Mode)
  useEffect(() => {
    const loadData = async () => {
      // Demo Mode - load test data
      if (demoMode) {
        console.log('🔧 Loading DEMO data...');
        setCarColor('#00FF00'); // Green car for demo
        setInventory(DEMO_INVENTORY);
        setEquippedPartsByCar({
          'bmw_m3_e30': {
            Engines: DEMO_INVENTORY[0],
            Turbos: DEMO_INVENTORY[1],
            Wheels: DEMO_INVENTORY[2],
            Suspensions: DEMO_INVENTORY[3],
            Special: DEMO_INVENTORY[4],
          },
          'vw_golf_gti_mk2': {
            Engines: null, Turbos: null, Suspensions: null, Wheels: null, Special: null
          }
        });
        setEarnings(999999);
        setReferralCode('DEMO1234');
        return;
      }

      // Real wallet connection
      const walletAddress = user?.wallet?.address;
      if (authenticated && walletAddress) {
        console.log('Fetching data for:', walletAddress);
        const pendingReferral = localStorage.getItem('pending_referral');
        const data = await fetchUserData(walletAddress, pendingReferral);

        if (data) {
          console.log('Data loaded:', data);
          if (pendingReferral) {
            localStorage.removeItem('pending_referral');
            console.log('Cleared pending referral:', pendingReferral);
          }
          // Load global car color
          setCarColor(data.car_color || '#FF0000');
          // Apply saved theme on load (car color IS the theme now)
          if (data.theme_color) {
            setThemeColor(data.theme_color);
            applyGlobalThemeFromColor(data.theme_color);
          } else if (data.car_color) {
            // If no theme_color, use car_color as theme
            setThemeColor(data.car_color);
            applyGlobalThemeFromColor(data.car_color);
          }

          // ==============================================
          // FETCH PERSISTED CAR UNLOCKS from user_unlocks table
          // ==============================================
          // ==============================================
          // FETCH PERSISTED CAR UNLOCKS from user_unlocks table
          // ==============================================
          try {
            const { data: unlocks, error: unlocksError } = await supabase
              .from('user_unlocks')
              .select('car_id')
              .eq('user_wallet', walletAddress);

            if (!unlocksError && unlocks && unlocks.length > 0) {
              const unlockedCarIds = unlocks.map(u => u.car_id);
              console.log('[BurnUnlock] Loaded persisted unlocks:', unlockedCarIds);
              // Merge with default owned cars (bmw_m3_e30 is always owned)
              setOwnedCars(prev => {
                const merged = new Set([...prev, ...unlockedCarIds]);
                return Array.from(merged);
              });
            }
          } catch (unlockErr) {
            console.warn('[BurnUnlock] Failed to load unlocks:', unlockErr);
          }


          // ==============================================
          // WALLET SYNC: Check wallet for tokens matching item_mappings
          // ==============================================
          let mergedInventory = data.inventory || [];
          try {
            console.log('[WalletSync] Checking for on-chain tokens...');

            // 1. Get all items with contract addresses from item_mappings
            const { data: mappings, error: mappingsError } = await supabase
              .from('item_mappings')
              .select('item_id, contract_address')
              .not('contract_address', 'is', null);

            if (mappingsError) {
              console.warn('[WalletSync] Mappings query error:', mappingsError);
            } else if (mappings && mappings.length > 0) {
              console.log('[WalletSync] Found mappings with CAs:', mappings);

              // 2. Create a map of contract address -> item_id AND item_id -> CA
              const caToItemId = {};
              const idToCa = {};
              mappings.forEach(m => {
                if (m.contract_address) {
                  caToItemId[m.contract_address.toLowerCase()] = m.item_id;
                  idToCa[m.item_id] = m.contract_address;
                }
              });
              setItemMappings(idToCa);

              // 3. Fetch wallet SPL tokens using Moralis API
              const moralisApiKey = import.meta.env.VITE_MORALIS_API_KEY;

              if (!moralisApiKey) {
                console.warn('[WalletSync] VITE_MORALIS_API_KEY not set in environment');
              } else {
                try {
                  const moralisUrl = `https://solana-gateway.moralis.io/account/mainnet/${walletAddress}/tokens`;

                  const response = await fetch(moralisUrl, {
                    method: 'GET',
                    headers: {
                      'Accept': 'application/json',
                      'X-API-Key': moralisApiKey
                    }
                  });

                  if (!response.ok) {
                    console.warn('[WalletSync] Moralis API returned:', response.status);
                  } else {
                    const tokens = await response.json();
                    console.log('[WalletSync] Found', tokens.length, 'SPL tokens in wallet');

                    // Build token balances map for all tokens (for unlock button)
                    const balancesMap = {};
                    for (const token of tokens) {
                      const mint = token.mint?.toLowerCase();
                      const balance = parseFloat(token.amount) || 0;
                      if (mint && balance > 0) {
                        balancesMap[mint] = balance;
                      }
                    }
                    setUserTokenBalances(balancesMap);
                    console.log('[WalletSync] Token balances:', balancesMap);

                    // 4. Check each token against our mappings
                    const existingIds = new Set(mergedInventory.map(item => item.id || item.item_id));

                    for (const token of tokens) {
                      const mint = token.mint?.toLowerCase();
                      const balance = parseFloat(token.amount) || 0;

                      // Check if this token matches any of our items
                      if (mint && caToItemId[mint] && balance > 0) {
                        const itemId = caToItemId[mint];
                        const isCar = CAR_MODELS.some(c => c.id === itemId);

                        if (isCar) {
                          // Auto-Unlock Car Logic
                          console.log(`[WalletSync] 🚗 Found token for Car: ${itemId}`);
                          setOwnedCars(prev => {
                            if (!prev.includes(itemId)) {
                              return [...prev, itemId];
                            }
                            return prev;
                          });
                        } else if (!existingIds.has(itemId)) {
                          console.log('[WalletSync] 🎉 Found matching token!', itemId, 'Balance:', balance);

                          // Look up the actual marketplace item data
                          const marketplaceItem = MARKETPLACE_ITEMS.find(item => item.id === itemId);

                          // Add to inventory with real marketplace data
                          mergedInventory.push({
                            id: itemId,
                            item_id: itemId,
                            title: marketplaceItem?.title || itemId.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                            name: marketplaceItem?.title || itemId,
                            rarity: marketplaceItem?.rarity || 'bg-gray-500',
                            rarityLevel: marketplaceItem?.rarityLevel || 1,
                            category: marketplaceItem?.category || 'Special',
                            balance: balance,
                            contract_address: mint,
                            image: marketplaceItem?.image || '/level1.png',
                            price: marketplaceItem?.price || '0 CR',
                            isOnChain: true
                          });
                          existingIds.add(itemId);
                        }
                      }
                    }
                  }
                } catch (moralisErr) {
                  console.warn('[WalletSync] Moralis API call failed:', moralisErr);
                }
              }
            } else {
              console.log('[WalletSync] No item_mappings with contract addresses found');
            }
          } catch (syncErr) {
            console.warn('[WalletSync] Failed to sync:', syncErr);
          }

          setInventory(mergedInventory);

          // Handle migration from old single-car format to new multi-car format
          const loadedParts = data.equipped_parts || {};
          if (loadedParts.Engines || loadedParts.Turbos || loadedParts.Wheels) {
            // Legacy format detected
            setEquippedPartsByCar({
              'bmw_m3_e30': loadedParts,
              'vw_golf_gti_mk2': { Engines: null, Turbos: null, Suspensions: null, Wheels: null, Special: null }
            });
          } else {
            // New format or empty
            setEquippedPartsByCar(loadedParts.bmw_m3_e30 ? loadedParts : {
              'bmw_m3_e30': { Engines: null, Turbos: null, Suspensions: null, Wheels: null, Special: null },
              'vw_golf_gti_mk2': { Engines: null, Turbos: null, Suspensions: null, Wheels: null, Special: null }
            });
          }
          setEarnings(Number(data.cash) || 50000);
          setReferralCode(data.referral_code || '');
          setUsername(data.username || '');
          setAvatarUrl(data.avatar_url || '');
          const pending = Number(data.pending_rewards) || 0;
          console.log('💰 [App] Loaded Pending Rewards:', pending);
          setPendingRewards(pending);
          setReferralEarnings(Number(data.referral_earnings) || 0);
          setIsDataLoaded(true); // Enable auto-save now that data is loaded
        }
      }
    };
    loadData();
  }, [authenticated, user?.wallet?.address, demoMode]);


  // 2. Auto-Save on Changes (skip in demo mode)
  useEffect(() => {
    // Don't save in demo mode
    if (demoMode) {
      console.log('🔧 Demo mode - save skipped');
      return;
    }

    // CRITICAL: Prevent saving until initial data load is complete
    // This avoids overwriting user data with default state on login
    if (!isDataLoaded) {
      // console.log('⏳ Waiting for data load before saving...');
      return;
    }

    const walletAddress = user?.wallet?.address;
    if (authenticated && walletAddress) {
      // Calculate net worth roughly for saving
      const currentNetWorth = inventory.reduce((sum, item) => {
        const price = parseInt(item.price?.replace(/[^0-9]/g, '') || 0);
        return sum + price;
      }, 0);

      saveUserData(walletAddress, {
        carColor,
        themeColor,
        inventory,
        equipped_parts: equippedPartsByCar,
        cash: earnings,
        netWorth: currentNetWorth
      });
    }
  }, [carColor, themeColor, inventory, equippedPartsByCar, earnings, authenticated, user?.wallet?.address, demoMode, isDataLoaded]);


  const handleConnectWallet = () => {
    setActivePage('Garage'); // Connect wallet implies being in the garage
  };

  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e) => {
    e.preventDefault();

    // Try to get item from inventory drag
    const itemJson = e.dataTransfer.getData('item');
    if (itemJson && activePage === 'Garage') {
      try {
        const item = JSON.parse(itemJson);
        equipItem(item);
        console.log(`Equipped ${item.title}`);
        return;
      } catch (err) {
        console.error('Failed to parse dropped item:', err);
      }
    }

    // Legacy support for old drag items
    if (draggedItem && activePage === 'Garage') {
      setRotationSpeed((prev) => prev + 0.002);
      setEarningRate((prev) => prev * 1.5);
      setActionTrigger(prev => prev + 1);
      console.log(`Dropped ${draggedItem}`);
      setDraggedItem(null);
    } else if (activePage !== 'Garage') {
      alert("Connect Wallet first!");
    }
  };

  if (!hasAccess) {
    return <AccessGate onUnlock={handleUnlock} />;
  }

  return (
    <div
      className="h-screen w-screen bg-black relative overflow-hidden font-sans select-none text-white"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >

      {/* AudioControls & LoginButton - Top Right (Not on Marketplace) */}
      {activePage !== 'Marketplace' && activePage !== 'Leaderboard' && (
        <div className="absolute top-8 right-8 z-50 flex items-center gap-3">
          <AudioControls />
          <LoginButton onProfileClick={() => setActivePage('Profile')} />
        </div>
      )}

      {/* Car Model Selector - Garage only */}
      {activePage === 'Garage' && (
        <CarModelSelector
          currentModelIndex={currentCarModelIndex}
          onModelChange={handleCarModelChange}
          isTransitioning={isModelTransitioning}
          ownedCars={ownedCars}
          onPurchase={handleCarPurchase}
          walletAddress={user?.wallet?.address}
          tokenMappings={itemMappings}
          carColor={carColor}
          onUnlock={handleManualUnlock}
          userTokenBalances={userTokenBalances}
        />
      )}

      {/* 3D Scene Layer - Visible in Garage, Paint Shop, and Leaderboard */}
      {(activePage === 'Garage' || activePage === 'Paint Shop' || activePage === 'Leaderboard') && (
        <div
          className={`absolute inset-0 z-0 overflow-hidden ${draggedItem ? 'cursor-copy' : ''}`}
        >
          <Canvas className="w-full h-full" shadows>
            {/* Fog for depth */}
            <fog attach="fog" args={['#101010', 10, 50]} />

            {/* Helper for intro animation */}
            <IntroCamera />

            {/* We initially set position far away, IntroCamera will lerp it */}
            <PerspectiveCamera makeDefault position={[10, 5, 12]} fov={45} />

            <Environment preset={environment} />

            {/* Lighting */}
            <ambientLight intensity={0.5} />
            <spotLight
              position={[10, 10, 10]}
              angle={0.15}
              penumbra={1}
              intensity={20}
              castShadow
            />

            {/* Car Model */}
            <CarModel
              key={currentCarModel.id}
              rotationSpeed={rotationSpeed}
              triggerFlash={flashTrigger}
              carColor={carColor}
              carFinish={carFinish}
              activePage={activePage}
              isTransitioning={isModelTransitioning}
              modelPath={currentCarModel.model}
              isOwned={isCurrentCarOwned}
              targetNames={currentCarModel.targetNames}
              autoScale={currentCarModel.autoScale}
              transitionDirection={transitionDirection}
              equippedParts={equippedParts}
              inventory={inventory}
              carModelId={currentCarModel.id}
              specialEffect={specialEffect}
            />

            {/* Floors and Post processing */}
            {sceneBackground === 'grid' && (
              <DynamicGrid position={[0, -1, 0]} args={[100, 100]} cellSize={0.5} cellThickness={0.5} sectionSize={3} sectionThickness={1} fadeDistance={30} fadeStrength={1} followCamera={false} infiniteGrid={true} carColor={carColor} specialEffect={specialEffect} />
            )}
            {sceneBackground === 'concrete' && (
              <ConcreteFloor />
            )}
            {sceneBackground === 'damaged' && (
              <DamagedConcreteFloor />
            )}
            {sceneBackground === 'custom' && (
              <CustomFloor />
            )}

            {/* Post Processing */}
            <EffectComposer disableNormalPass>
              <Bloom luminanceThreshold={1.5} intensity={0.3} mipmapBlur />
            </EffectComposer>

            {/* Custom Pendulum Camera Controls */}
            <PendulumControls activePage={activePage} />
          </Canvas>

        </div>
      )}

      {/* Pages Overlay */}
      <AnimatePresence>
        {activePage === 'Garage' && (
          <GarageHUD
            currentCarModel={currentCarModel}
            carColor={carColor}
            setActivePage={setActivePage}
            inventory={inventory}
            equippedParts={equippedPartsByCar[currentCarModel.id] || { Engines: null, Turbos: null, Suspensions: null, Wheels: null, Special: null }}
            equipItem={equipItem}
            unequipItem={unequipItem}
            setDraggedItem={setDraggedItem}
            draggedItem={draggedItem}
            setSceneBackground={setSceneBackground}
            // New Earnings Props
            earnings={earnings}
            pendingRewards={pendingRewards}
            onRewardsClaimed={() => setPendingRewards(0)}
            hourlyEarnings={
              // Calculate total yield from all equipped parts on current car
              Object.values(equippedPartsByCar[currentCarModel.id] || {}).reduce((total, part) => {
                if (!part) return total;
                const yieldVal = parseFloat((part.cashback || '0').replace(/[^0-9.]/g, '')) || 0;
                return total + yieldVal;
              }, 0).toFixed(4)
            }
            onNavigateToItem={(item) => {
              setInitialSelectedItem(item);
              setActivePage('Marketplace');
            }}
          />)}

        {/* Admin Panel Overlay */}
        {showAdmin && (
          <AdminPanel
            onClose={() => setShowAdmin(false)}
            items={MARKETPLACE_ITEMS} // Pass all items to admin panel
          />
        )}

        {activePage === 'Marketplace' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-10 bg-black/80 backdrop-blur-sm"
          >
            <div className="w-full h-full">
              <Marketplace
                addToInventory={addToInventory}
                onProfileClick={() => setActivePage('Profile')}
                initialSelectedItem={initialSelectedItem}
                clearInitialItem={() => setInitialSelectedItem(null)}
                carColor={carColor}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Race Page - Locked Interface */}
      {activePage === 'Race' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black overflow-hidden">
          {/* Cyber-Grid Background - Kept as requested */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

          {/* Main Card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative max-w-2xl w-full p-12 border border-white/10 bg-black/60 backdrop-blur-xl flex flex-col items-center text-center rounded-3xl"
          >
            {/* Lock Icon */}
            <div className="mb-8 relative">
              <Lock className="w-24 h-24 text-red-500 opacity-90 animate-pulse relative z-10" />
            </div>

            {/* Title */}
            <h1
              className="text-5xl font-bold italic uppercase text-red-500 mb-2 tracking-wider"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              RACE MODE LOCKED
            </h1>

            {/* Subtitle */}
            <p className="text-lg text-white tracking-[0.2em] font-medium mb-12 uppercase" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              Server maintenance in progress. The streets are closed.
            </p>

            {/* Notify Button */}
            <button className="group relative px-12 py-4 bg-transparent border border-white/20 hover:border-red-600 text-white overflow-hidden transition-all duration-300 rounded-lg">
              <div className="absolute inset-0 w-full h-full bg-red-600 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out z-0"></div>
              <span className="relative z-10 font-bold uppercase tracking-widest text-lg flex items-center gap-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                <Bell size={20} />
                Notify When Live
              </span>
            </button>

            {/* Footer Text */}
            <div className="mt-8 text-xs text-gray-400 font-mono flex items-center gap-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              <span>Launching soon...</span>
            </div>
          </motion.div>
        </div>
      )}




      {/* Paint Shop - Only visible in Paint Shop tab */}
      {activePage === 'Paint Shop' && (
        <PaintShop
          carColor={carColor}
          setCarColor={setCarColor}
          carFinish={carFinish}
          setCarFinish={setCarFinish}
          hue={hue}
          setHue={setHue}
          saturation={saturation}
          setSaturation={setSaturation}
          lightness={lightness}
          setLightness={setLightness}
          environment={environment}
          setEnvironment={setEnvironment}
          sceneBackground={sceneBackground}
          setSceneBackground={setSceneBackground}
          specialEffect={specialEffect}
          setSpecialEffect={setSpecialEffect}
          rainbowUnlocked={rainbowUnlocked}
          onUnlockRainbow={handleUnlockRainbow}
          themeColor={themeColor}
          setThemeColor={setThemeColor}
        />
      )}

      {/* Username Onboarding Modal */}
      {showUsernameModal && (
        <UsernameModal
          walletAddress={user?.wallet?.address}
          onComplete={(newUsername) => {
            setShowUsernameModal(false);
            // After username is set, update the referral code to match
            setUsername(newUsername);
            setReferralCode(newUsername.toUpperCase());
          }}
        />
      )}

      {/* Leaderboard Page */}
      {activePage === 'Leaderboard' && (
        <Leaderboard
          onBack={() => setActivePage('Garage')}
          onProfileClick={() => setActivePage('Profile')}
          carColor={carColor}
        />
      )}

      {/* Profile Page */}
      {activePage === 'Profile' && (
        <ProfilePage
          inventory={inventory}
          equippedParts={equippedParts}
          earnings={earnings}
          referralCode={referralCode}
          pendingRewards={pendingRewards}
          onRewardsClaimed={() => setPendingRewards(0)}
          username={username}
          avatarUrl={avatarUrl}
          onAvatarUpdated={(url) => setAvatarUrl(url)}
          hourlyEarnings={
            Object.values(equippedParts || {}).reduce((total, part) => {
              if (!part) return total;
              const yieldVal = parseFloat((part.cashback || '0').replace(/[^0-9.]/g, '')) || 0;
              return total + yieldVal;
            }, 0).toFixed(4)
          }
          totalEarned={activePage === 'Profile' ? referralEarnings : 0}
          currentCarModel={currentCarModel}
          carColor={carColor}
          carFinish={carFinish}
          ownedCars={ownedCars}
        />
      )}

      {/* Apple Dock - Always Last/Top */}
      <AppleStyleDock activePage={activePage} setActivePage={setActivePage} />
    </div>
  );
}

export default function Root() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
