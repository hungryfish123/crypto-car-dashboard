import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, useGLTF, Center, Grid, useTexture } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Lock, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { AppleStyleDock } from './components/AppleStyleDock';
import GarageHUD from './components/GarageHUD';
import { useDynamicLinks } from './hooks/useDynamicLinks';
import { useRewardRate } from './hooks/useRewardRate'; // New Hook
import { useRewards } from './hooks/useRewards'; // Centralized Rewards Hook
import LoginButton from './components/LoginButton';
import { usePrivy } from '@privy-io/react-auth';
import { fetchUserData, saveUserData } from './dbServices';
import { useAudio } from './hooks/useAudio';
import AudioControls from './components/AudioControls';
import CarCallouts from './components/CarCallouts';
import CarModelSelector, { CAR_MODELS } from './components/CarModelSelector';
import AccessGate from './components/AccessGate';
import UsernameModal from './components/UsernameModal';
import { Loader2 } from 'lucide-react'; // Import Loader icon
import RaceCountdown from './components/RaceCountdown'; // Race Countdown Timer

// Lazy Load Heavy Components
const Marketplace = React.lazy(() => import('./components/Marketplace'));
const PaintShop = React.lazy(() => import('./components/PaintShop'));
const AdminPanel = React.lazy(() => import('./components/AdminPanel'));
const Leaderboard = React.lazy(() => import('./components/Leaderboard'));
const ProfilePage = React.lazy(() => import('./components/ProfilePage'));

// Loading Fallback Component
const PageLoader = () => (
  <div className="flex items-center justify-center w-full h-full text-red-500">
    <Loader2 size={48} className="animate-spin" />
  </div>
);
import { getProfile } from './dbServices';
import { supabase } from './supabaseClient';
import { MARKETPLACE_ITEMS } from './data/marketplaceItems';


// Preload the default car model early for faster LCP
useGLTF.preload('/bmw_m3_coupe_e30_1986.glb');

// Centralized YIELD_WEIGHTS (must match SolanaPanel)
const YIELD_WEIGHTS = {
  'eng_lv1': 1, 'eng_lv2': 2, 'eng_lv3': 4, 'eng_lv4': 8, 'eng_lv5': 16,
  'turbo_lv1': 1, 'turbo_lv2': 2, 'turbo_lv3': 4, 'turbo_lv4': 8, 'turbo_lv5': 16,
  'susp_lv1': 1, 'susp_lv2': 2, 'susp_lv3': 4, 'susp_lv4': 8, 'susp_lv5': 16,
  'sus_lv1': 1, 'sus_lv2': 2, 'sus_lv3': 4, 'sus_lv4': 8, 'sus_lv5': 16,
  'wheel_lv1': 1, 'wheel_lv2': 2, 'wheel_lv3': 4, 'wheel_lv4': 8, 'wheel_lv5': 16,
  'wheels_lv1': 1, 'wheels_lv2': 2, 'wheels_lv3': 4, 'wheels_lv4': 8, 'wheels_lv5': 16,
  'special_seat': 33, 'special_brakes': 33, 'special_nitro': 33, 'special_rainbow': 33,
  'vw_golf_gti_mk2': 20, 'audi_sport_quattro': 20, 'mazda_mx5_na': 20, 'ferrari_f40': 20, 'lamborghini_huracan_2015': 20
};


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
      minDistance={8}
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

const CarModel = ({ rotationSpeed, triggerFlash, carColor, carFinish, activePage, isTransitioning = false, modelPath = '/bmw_m3_coupe_e30_1986.glb', isOwned = true, targetNames = [], autoScale = false, transitionDirection = 1, equippedParts = {}, inventory = [], carModelId = 'bmw_m3_e30', specialEffect = null, unequipItem }) => {
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
  const [carScale, setCarScale] = useState(1); // Store the car's normalization scale for callouts

  // Robust Bounding Box Normalization - Scale matches models to TARGET_LENGTH
  const TARGET_LENGTH = 10.5;

  useLayoutEffect(() => {
    if (!scene) return;

    // Reset to identity for a clean measurement
    scene.scale.setScalar(1);
    scene.position.set(0, 0, 0);

    // CRITICAL: Reset transformGroupRef scale BEFORE measuring to prevent feedback loop
    // Otherwise box.expandByObject uses world matrix which includes previous scale
    if (transformGroupRef.current) {
      transformGroupRef.current.scale.setScalar(1);
      transformGroupRef.current.position.set(0, 0, 0);
      transformGroupRef.current.updateMatrixWorld(true);
    }

    scene.updateMatrixWorld(true);

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

        // Store scale for callouts to use (inverse scaling)
        setCarScale(scale);
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
              if (material.color) material.color.set(color);

              // FIX: Disable texture map if present, as it likely contains a baked color that interferes with tinting
              if (material.map) {
                material.map = null;
                material.needsUpdate = true;
              }

              // CRITICAL: Force emissive OFF to prevent glow effect on bright colors
              if (material.emissive) {
                material.emissive.set('#000000');
                material.emissiveIntensity = 0;
              }
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
      if (child.isMesh && child.userData.originalEmissive && child.material && child.material.emissive) {
        child.material.emissive.copy(child.userData.originalEmissive);
        child.material.emissiveIntensity = child.userData.originalEmissiveIntensity;
      }
    });

  }, [scene, isOwned, effectiveTargetNames, specialEffect]);

  // Flash Effect logic - DISABLED (was causing glitches)
  // Previously triggered white glow when equipping items
  // Now just applies car style without any flash
  useEffect(() => {
    if (triggerFlash > 0 && scene) {
      // Just apply car style without flash animation
      applyCarStyle(carColor, carFinish);
    }
  }, [triggerFlash]);


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
              if (child.material.color) child.material.color.setHSL(hue, 1, 0.5);
              if (child.material.emissive) {
                child.material.emissive.setHSL(hue, 1, 0.2); // Slight emissive for pop
                child.material.emissiveIntensity = 0.5;
              }
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

      // Handle Burn Reveal Animation - DISABLED (was causing loading glitches)
      // Previously had 'heating' and 'cooling' phases with white glow
      // Now the reveal state is always 'idle' and car appears immediately
      // (keeping the code path but skipping all glow logic)

    }
  });

  return (
    <group ref={meshRef}>
      <group ref={transformGroupRef}>
        <primitive object={scene} />
        {/* Part Callouts - Now relative to car dimensions */}
        {activePage === 'Garage' && (
          <CarCallouts equippedParts={equippedParts} inventory={inventory} visible={true} carModelId={carModelId} carScale={carScale} unequipItem={unequipItem} />
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
  const { links } = useDynamicLinks();
  const [activePage, setActivePage] = useState('Garage');
  const [initialSelectedItem, setInitialSelectedItem] = useState(null);
  const [earnings, setEarnings] = useState(0); // Using this as 'Cash' for now
  const [environment, setEnvironment] = useState('city'); // Default environment lighting
  const [sceneBackground, setSceneBackground] = useState('grid'); // Default floor type
  const [rotationSpeed, setRotationSpeed] = useState(0.00);
  const [earningRate, setEarningRate] = useState(0.00001);

  const [specialEffect, setSpecialEffect] = useState(null); // 'rainbow', 'galaxy', or null
  const [isIntroComplete, setIsIntroComplete] = useState(false);
  const { rate: rewardRate } = useRewardRate(); // Get reward rate
  const [isDataLoaded, setIsDataLoaded] = useState(false); // Validates when data is fully synchronized
  const [userTokenBalances, setUserTokenBalances] = useState({}); // Map of contract address -> balance

  // Global Theme Utility - Apply saved theme on load
  const applyGlobalThemeFromColor = (color) => {
    // Safety check - skip if color is null/undefined
    if (!color || typeof color !== 'string') return;

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

  // Owned cars - Start with default only. DB/user_unlocks will populate correctly.
  // IMPORTANT: Don't trust localStorage for this - it can persist stale data across wallet changes
  const [ownedCars, setOwnedCarsState] = useState(['bmw_m3_e30']);
  const previousWalletRef = useRef(null);

  // Reset ownedCars when wallet changes (prevents cross-user contamination)
  useEffect(() => {
    const currentWallet = user?.wallet?.address;

    // If wallet changed (including initial login), reset to default and clear localStorage cache
    if (currentWallet && previousWalletRef.current !== currentWallet) {
      console.log('[App] Wallet changed, resetting ownedCars to default');
      setOwnedCarsState(['bmw_m3_e30']);
      try { localStorage.removeItem('cached_owned_cars'); } catch { }
      previousWalletRef.current = currentWallet;
    }
  }, [user?.wallet?.address]);

  // Wrapper setter that also caches to localStorage (for current session only)
  const setOwnedCars = (newValue) => {
    const value = typeof newValue === 'function' ? newValue(ownedCars) : newValue;
    setOwnedCarsState(value);
    // Cache to localStorage for this session (will be reset on wallet change)
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

  // Global Sync for Rainbow Animations
  useEffect(() => {
    let frameId;
    const animate = () => {
      // Speed factor: 50 degrees per second (~7.2s per cycle)
      const time = Date.now() / 1000;
      const hue = (time * 50) % 360;
      document.documentElement.style.setProperty('--rainbow-hue', hue);
      frameId = requestAnimationFrame(animate);
    };
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, []);


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

  // Hydrate inventory on mount to ensure fresh data (e.g. cashback) from MARKETPLACE_ITEMS
  useEffect(() => {
    setInventory(prev => {
      if (!prev || prev.length === 0) return prev;
      return prev.map(item => {
        const fresh = MARKETPLACE_ITEMS.find(m => m.id === item.id);
        return fresh ? { ...item, ...fresh } : item;
      });
    });
  }, []); // Run once on mount

  // Derived state for current car's equipped parts
  // Derived state for current car's equipped parts
  // FILTERED by actual inventory ownership to prevent stale items appearing
  const equippedPartsRaw = equippedPartsByCar[currentCarModel.id] || {};

  const equippedParts = {
    Engines: null,
    Turbos: null,
    Suspensions: null,
    Wheels: null,
    Special: null,
    ...Object.keys(equippedPartsRaw).reduce((acc, key) => {
      const item = equippedPartsRaw[key];
      // VALIDATION: Only show if it still exists in user's inventory
      if (item && inventory.some(i => i.id === item.id)) {
        acc[key] = item;
      } else {
        acc[key] = null;
      }
      return acc;
    }, {})
  };

  // Flash Effect State - Use counter to trigger unique flashes
  const [flashTrigger, setFlashTrigger] = useState(0);

  // Referral Code State
  const [referralCode, setReferralCode] = useState('');

  // Username and Avatar State (from player_data)
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Centralized Rewards Hook - Single source of truth for both Garage and Profile pages
  const {
    pendingRewards,
    totalEarned: rewardsTotalEarned,
    hourlyRate: rewardsHourlyRate,
    claimRewards: centralClaimRewards,
    isLoading: rewardsLoading,
    claimError: rewardsClaimError,
    claimSuccess: rewardsClaimSuccess,
    clearClaimStatus: rewardsClearClaimStatus
  } = useRewards(user?.wallet?.address, equippedPartsByCar, YIELD_WEIGHTS, ownedCars);

  // Total Earned (Referral Earnings)
  const [referralEarnings, setReferralEarnings] = useState(0);

  // Helper to determine storage key for items
  // Splits 'Special' category into sub-slots (Brakes, Seat, Nitro) to allow simultaneous equipping
  const getEquipKey = (item) => {
    if (item.category === 'Special') {
      const title = item.title?.toLowerCase() || '';
      if (title.includes('brake') || title.includes('break')) return 'Special_Brakes';
      if (title.includes('seat')) return 'Special_Seat';
      if (title.includes('nitro')) return 'Special_Nitro';
    }
    return item.category;
  };

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
    const equipKey = getEquipKey(item);

    // 1. Check if item is equipped on ANY other car (MANUAL UNEQUIP RULE)
    let equippedOnOtherCar = null;
    let otherCarName = null;

    Object.entries(equippedPartsByCar).forEach(([carId, parts]) => {
      // Check the specific key for this item type
      let isEquipped = false;
      if (parts) {
        if (parts[equipKey]?.id === item.id) isEquipped = true;
        // Also check legacy if needed, though strictly we care about ID match
        if (equipKey !== 'Special' && parts['Special']?.id === item.id) isEquipped = true;
      }

      if (carId !== currentCarId && isEquipped) {
        equippedOnOtherCar = carId;
        // Try to get model name from ID
        const model = CAR_MODELS.find(c => c.id === carId);
        otherCarName = model ? model.name : carId;
      }
    });

    if (equippedOnOtherCar) {
      alert(`Item is equipped on ${otherCarName}. Unequip it from there first!`);
      return;
    }

    setEquippedPartsByCar(prev => {
      const newState = { ...prev };

      // Removed auto-unequip logic as per new rule

      // 2. Equip on current car
      const newCarParts = { ...(newState[currentCarId] || {}) };

      // Assign to new key WITH equipped_at timestamp for rewards tracking
      newCarParts[equipKey] = {
        ...item,
        equipped_at: new Date().toISOString()
      };

      // CLEANUP: If we are equipping a Special item to a sub-slot, ensure it's not also in 'Special'
      if (equipKey !== 'Special' && newCarParts['Special']?.id === item.id) {
        delete newCarParts['Special']; // Remove from legacy slot
      }

      newState[currentCarId] = newCarParts;
      return newState;
    });

    // Trigger flash effect by incrementing counter
    setFlashTrigger(prev => prev + 1);

    // Play category-specific equip sound
    playEquip(item.category);
  };

  // Function to UNEQUIP an item from the current car
  const unequipItem = (item) => {
    if (!item || !item.category) return;
    const currentCarId = currentCarModel.id;
    const equipKey = getEquipKey(item);

    setEquippedPartsByCar(prev => {
      const newState = { ...prev };

      // Iterate ALL cars to find and remove this item
      Object.keys(newState).forEach(carId => {
        const carParts = { ...(newState[carId] || {}) };
        let modified = false;

        // Check target key
        if (carParts[equipKey]?.id === item.id) {
          carParts[equipKey] = null;
          modified = true;
        }

        // FAILSAFE: Also check 'Special' legacy key if relevant
        if (item.category === 'Special' && carParts['Special']?.id === item.id) {
          carParts['Special'] = null;
          modified = true;
        }

        if (modified) {
          newState[carId] = carParts;
        }
      });

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

  // Wrapper setters that also caches to localStorage
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
    { id: 'eng_lv3', title: 'V8 Smooth', price: '4,500 CR', numPrice: 4500, image: '/level3.webp', category: 'Engines', rarityLevel: 3, cashback: '2.5%' },
    { id: 'turbo_lv2', title: 'Small Turbo', price: '2,500 CR', numPrice: 2500, image: '/turbo2.webp', category: 'Turbos', rarityLevel: 2, cashback: '1.8%' },
    { id: 'wheel_lv4', title: 'NASCAR Steelie', price: '14,000 CR', numPrice: 14000, image: '/wheel4.webp', category: 'Wheels', rarityLevel: 4, cashback: '5.8%' },
    { id: 'susp_lv3', title: 'Sport Suspension', price: '4,800 CR', numPrice: 4800, image: '/suspension3.webp', category: 'Suspensions', rarityLevel: 3, cashback: '3.0%' },
    { id: 'special_seat', title: 'Sparco Racing Seat', price: '25,000 CR', numPrice: 25000, image: '/sparco seat.webp', category: 'Special', rarityLevel: 6, cashback: '8.0%' },
    { id: 'special_brakes', title: 'Ceramic Brembo Brakes', price: '35,000 CR', numPrice: 35000, image: '/ceramic breaks.webp', category: 'Special', rarityLevel: 6, cashback: '10.5%' },
    { id: 'special_nitro', title: 'Nitro Boost System', price: '100,000 CR', numPrice: 100000, image: '/nitro boost.webp', category: 'Special', rarityLevel: 7, cashback: '25.0%' },
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
            // If no theme_color, use car_color as theme
            setThemeColor(data.car_color);
            applyGlobalThemeFromColor(data.car_color);
          }

          // Hydrate inventory with fresh data from MARKETPLACE_ITEMS (fixes stale image paths)
          if (data.inventory && Array.isArray(data.inventory)) {
            data.inventory = data.inventory.map(savedItem => {
              const freshItem = MARKETPLACE_ITEMS.find(m => m.id === savedItem.id);
              if (freshItem) {
                return { ...savedItem, ...freshItem, balance: savedItem.balance }; // Keep saved balance/data but overwrite static info
              }
              return savedItem;
            });
          }

          // Load owned cars from database (merge with localStorage cache)
          if (data.owned_cars && Array.isArray(data.owned_cars)) {
            console.log('[App] Loading owned_cars from database:', data.owned_cars);
            setOwnedCars(prev => {
              const merged = new Set([...prev, ...data.owned_cars]);
              return Array.from(merged);
            });
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

                    // [CRITICAL FIX] Clean up stale on-chain items before re-syncing
                    // Identify items that are tracked as on-chain (via idToCa)
                    // and REMOVE them from the current mergedInventory.
                    // We will re-add them ONLY if they exist in the fresh 'tokens' list.
                    const trackedItemIds = new Set(Object.keys(idToCa));

                    // Filter out stale on-chain items from the base inventory
                    mergedInventory = mergedInventory.filter(item => !trackedItemIds.has(item.id || item.item_id));
                    console.log('[WalletSync] Cleared potential stale on-chain items. Re-syncing...');

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

                          // Persist to user_unlocks table (so it survives page reloads)
                          const walletAddr = user?.wallet?.address;
                          if (walletAddr) {
                            supabase
                              .from('user_unlocks')
                              .upsert({ user_wallet: walletAddr, car_id: itemId }, { onConflict: 'user_wallet,car_id' })
                              .then(() => console.log(`[WalletSync] ✅ Persisted car unlock: ${itemId}`))
                              .catch(err => console.warn('[WalletSync] Failed to persist unlock:', err));
                          }
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
                            image: marketplaceItem?.image || '/level1.webp',
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
          let loadedParts = data.equipped_parts || {};

          // HYDRATE EQUIPPED PARTS: Ensure they have fresh data (cashback, images, etc.) from MARKETPLACE_ITEMS
          const hydrateParts = (partsObj) => {
            if (!partsObj) return null;
            const hydrated = { ...partsObj };
            Object.keys(hydrated).forEach(key => {
              const part = hydrated[key];
              if (part) {
                const fresh = MARKETPLACE_ITEMS.find(m => m.id === part.id);
                if (fresh) hydrated[key] = { ...part, ...fresh };
              }
            });
            return hydrated;
          };

          if (loadedParts.Engines || loadedParts.Turbos || loadedParts.Wheels) {
            // Legacy format detected
            loadedParts = hydrateParts(loadedParts);
            setEquippedPartsByCar({
              'bmw_m3_e30': loadedParts,
              'vw_golf_gti_mk2': { Engines: null, Turbos: null, Suspensions: null, Wheels: null, Special: null }
            });
          } else {
            // New format or empty - Hydrate each car's parts
            const hydratedPartsByCar = {};
            Object.keys(loadedParts).forEach(carId => {
              hydratedPartsByCar[carId] = hydrateParts(loadedParts[carId]);
            });

            // Merge with defaults to ensure all cars exist
            setEquippedPartsByCar({
              'bmw_m3_e30': { Engines: null, Turbos: null, Suspensions: null, Wheels: null, Special: null },
              'vw_golf_gti_mk2': { Engines: null, Turbos: null, Suspensions: null, Wheels: null, Special: null },
              ...hydratedPartsByCar
            });
          }
          setEarnings(Number(data.cash) || 0);
          setReferralCode(data.referral_code || '');
          setUsername(data.username || '');
          setAvatarUrl(data.avatar_url || '');
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
        netWorth: currentNetWorth,
        ownedCars // Add owned cars to DB
      });
    }
  }, [carColor, themeColor, inventory, equippedPartsByCar, earnings, ownedCars, authenticated, user?.wallet?.address, demoMode, isDataLoaded]);


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
          <Canvas
            className="w-full h-full"
            shadows
            frameloop="demand" // Only render when state changes - saves CPU/battery
            dpr={[1, 1.5]} // Limit pixel ratio for performance
          >
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
            <React.Suspense fallback={null}>
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
                unequipItem={unequipItem}
              />
            </React.Suspense>

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

            {/* Post Processing DISABLED - was causing 'alpha' crash on initial load */}
            {/* <EffectComposer disableNormalPass multisampling={0}>
              <Bloom luminanceThreshold={1.5} intensity={0.3} mipmapBlur />
            </EffectComposer> */}

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
            equippedParts={equippedParts}
            allEquippedParts={equippedPartsByCar}
            equipItem={equipItem}
            unequipItem={unequipItem}
            setDraggedItem={setDraggedItem}
            draggedItem={draggedItem}
            setSceneBackground={setSceneBackground}
            pendingRewards={pendingRewards}
            totalEarned={rewardsTotalEarned}
            hourlyRate={rewardsHourlyRate}
            claimRewards={centralClaimRewards}
            rewardsLoading={rewardsLoading}
            rewardsClaimError={rewardsClaimError}
            rewardsClaimSuccess={rewardsClaimSuccess}
            onRewardsClaimed={() => rewardsClearClaimStatus && rewardsClearClaimStatus()}
            hourlyEarnings={
              inventory.reduce((total, item) => {
                const yieldVal = parseFloat((item.cashback || '0').replace(/[^0-9.]/g, '')) || 0;
                return total + (yieldVal * (item.quantity || 1));
              }, 0) * rewardRate // Multiply total points by reward rate to get SOL
            }
            onNavigateToItem={(item) => {
              setInitialSelectedItem(item);
              setActivePage('Marketplace');
            }}
            username={username}
          />)}

        {/* Admin Panel Overlay */}
        {/* Admin Panel Overlay */}
        {showAdmin && (
          <React.Suspense fallback={<div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50"><Loader2 className="animate-spin text-red-500" size={40} /></div>}>
            <AdminPanel
              onClose={() => setShowAdmin(false)}
              items={MARKETPLACE_ITEMS} // Pass all items to admin panel
            />
          </React.Suspense>
        )}

        {activePage === 'Marketplace' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-10 bg-black/80 backdrop-blur-sm"
          >
            <div className="w-full h-full">
              <React.Suspense fallback={<PageLoader />}>
                <Marketplace
                  addToInventory={addToInventory}
                  onProfileClick={() => setActivePage('Profile')}
                  initialSelectedItem={initialSelectedItem}
                  clearInitialItem={() => setInitialSelectedItem(null)}
                  carColor={carColor}
                />
              </React.Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Race Page - Locked Interface */}
      {/* Race Page - Locked Interface */}
      {activePage === 'Race' && (() => {
        // Calculate dynamic theme color based on car color
        let displayThemeColor = carColor;
        if (carColor === '#000000') displayThemeColor = '#9ca3af'; // Gray-400 for visibility on black
        if (carColor === '#ffffff') displayThemeColor = '#ffffff';

        return (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black overflow-hidden">
            {/* Cyber-Grid Background */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

            {/* Main Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="relative max-w-3xl w-full p-16 border flex flex-col items-center text-center rounded-[3rem] overflow-hidden shadow-2xl"
              style={{
                background: 'rgba(0, 0, 0, 0.6)', // Darker background
                backdropFilter: 'blur(40px)',     // Heavy blur
                WebkitBackdropFilter: 'blur(40px)',
                borderColor: `${displayThemeColor}30`, // Subtle colored border, no glow
                boxShadow: 'none' // Explicitly removed glow around module
              }}
            >
              {/* Dynamic Background Gradient - Very faint and internal only */}
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  background: `linear-gradient(180deg, ${displayThemeColor}20 0%, transparent 100%)`
                }}
              ></div>

              {/* Content Container - Using Flex Gap for even spacing */}
              <div className="relative z-10 flex flex-col items-center w-full gap-10 py-4">

                {/* Title Group */}
                <div className="flex flex-col items-center w-full">
                  {/* DYNAMIC COLORED TITLE */}
                  <h1
                    className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none mb-2"
                    style={{
                      fontFamily: 'Orbitron, sans-serif',
                      color: displayThemeColor,
                    }}
                  >
                    RACE MODE
                  </h1>

                  {/* SMALL WHITE SUBTITLE */}
                  <div className="w-full flex justify-between px-2">
                    <span
                      className="text-white font-bold tracking-[0.3em] text-sm md:text-lg uppercase w-full"
                      style={{ fontFamily: 'Orbitron, sans-serif' }}
                    >
                      Unlocks in Season 2
                    </span>
                  </div>
                </div>

                {/* Countdown Timer */}
                <div className="scale-90 md:scale-100">
                  <RaceCountdown />
                </div>

                {/* Notify Button */}
                <a
                  href={links.race_notify}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative px-12 py-4 bg-transparent border border-white/10 text-white overflow-hidden transition-all duration-300 rounded-lg block w-fit mx-auto cursor-pointer hover:border-white/30"
                >
                  <div
                    className="absolute inset-0 w-full h-full transition-transform duration-300 ease-out z-0 -translate-x-full group-hover:translate-x-0"
                    style={{ backgroundColor: displayThemeColor }}
                  ></div>
                  <span className="relative z-10 font-bold uppercase tracking-widest text-lg flex items-center gap-2" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    <Bell size={20} />
                    Notify When Live
                  </span>
                </a>
              </div>
            </motion.div>
          </div>
        );
      })()}




      {/* Paint Shop - Only visible in Paint Shop tab */}
      {/* Paint Shop - Only visible in Paint Shop tab */}
      {
        activePage === 'Paint Shop' && (
          <React.Suspense fallback={null}>
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
          </React.Suspense>
        )
      }

      {/* Username Onboarding Modal */}
      {
        showUsernameModal && (
          <UsernameModal
            walletAddress={user?.wallet?.address}
            onComplete={(newUsername) => {
              setShowUsernameModal(false);
              // After username is set, update the referral code to match
              setUsername(newUsername);
              setReferralCode(newUsername.toUpperCase());
            }}
          />
        )
      }

      {/* Leaderboard Page */}
      {
        activePage === 'Leaderboard' && (
          <React.Suspense fallback={<PageLoader />}>
            <Leaderboard
              onBack={() => setActivePage('Garage')}
              onProfileClick={() => setActivePage('Profile')}
              carColor={carColor}
            />
          </React.Suspense>
        )
      }

      {/* Profile Page */}
      {/* Profile Page */}
      {
        activePage === 'Profile' && (
          <React.Suspense fallback={<PageLoader />}>
            <ProfilePage
              inventory={inventory}
              equippedParts={equippedPartsByCar}
              earnings={earnings}
              referralCode={referralCode}
              pendingRewards={pendingRewards}
              totalEarned={rewardsTotalEarned}
              hourlyRate={rewardsHourlyRate}
              claimRewards={centralClaimRewards}
              rewardsLoading={rewardsLoading}
              rewardsClaimError={rewardsClaimError}
              rewardsClaimSuccess={rewardsClaimSuccess}
              onRewardsClaimed={() => rewardsClearClaimStatus && rewardsClearClaimStatus()}
              username={username}
              avatarUrl={avatarUrl}
              onAvatarUpdated={(url) => setAvatarUrl(url)}
              hourlyEarnings={rewardsHourlyRate.toFixed(5)}
              currentCarModel={currentCarModel}
              carColor={carColor}
              carFinish={carFinish}
              ownedCars={ownedCars}
            />
          </React.Suspense>
        )
      }

      {/* Apple Dock - Always Last/Top */}
      <AppleStyleDock activePage={activePage} setActivePage={setActivePage} />
    </div >
  );
}

export default function Root() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}
