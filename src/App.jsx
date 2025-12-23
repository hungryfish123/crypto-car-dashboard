import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, useGLTF, Center, Grid, useTexture } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Lock, Bell } from 'lucide-react';
import { motion } from 'framer-motion';
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


// Preload the model
useGLTF.preload('/bmw_m3_coupe_e30_1986.glb');

// Concrete Floor Component with texture (smooth fade like Grid)
function ConcreteFloor() {
  const texture = useTexture('/backgrounds/189_concrete bare PBR texture-seamless.jpg');
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;

  return (
    <group>
      {/* Main textured floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial map={texture} roughness={0.9} metalness={0.1} />
      </mesh>
      {/* Gradient fade rings - innermost to outermost */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.99, 0]}>
        <ringGeometry args={[12, 18, 64]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.15} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.99, 0]}>
        <ringGeometry args={[18, 22, 64]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.99, 0]}>
        <ringGeometry args={[22, 26, 64]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.55} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.99, 0]}>
        <ringGeometry args={[26, 30, 64]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.75} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.99, 0]}>
        <ringGeometry args={[30, 100, 64]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.95} />
      </mesh>
    </group>
  );
}

// Damaged Concrete Floor Component (smooth fade)
function DamagedConcreteFloor() {
  const texture = useTexture('/backgrounds/69_concrete bare damaged texture-seamless.jpg');
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial map={texture} roughness={0.95} metalness={0.05} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.99, 0]}>
        <ringGeometry args={[12, 18, 64]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.15} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.99, 0]}>
        <ringGeometry args={[18, 22, 64]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.99, 0]}>
        <ringGeometry args={[22, 26, 64]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.55} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.99, 0]}>
        <ringGeometry args={[26, 30, 64]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.75} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.99, 0]}>
        <ringGeometry args={[30, 100, 64]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.95} />
      </mesh>
    </group>
  );
}

// Custom Floor Component (smooth fade)
function CustomFloor() {
  const texture = useTexture('/backgrounds/Untitled-5.jpg');
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial map={texture} roughness={0.85} metalness={0.15} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.99, 0]}>
        <ringGeometry args={[12, 18, 64]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.15} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.99, 0]}>
        <ringGeometry args={[18, 22, 64]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.35} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.99, 0]}>
        <ringGeometry args={[22, 26, 64]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.55} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.99, 0]}>
        <ringGeometry args={[26, 30, 64]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.75} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.99, 0]}>
        <ringGeometry args={[30, 100, 64]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.95} />
      </mesh>
    </group>
  );
}




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
      // Camera at Z=9.1 for 30% more zoom out
      camera.position.lerp(vec.set(0, 1.5, 9.1), 0.05);
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
  const targetXOffset = activePage === 'Paint Shop' ? 4.5 : 0;
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
      maxDistance={13}
      enablePan={false}
    />
  );
}

function CarModel({ rotationSpeed, triggerFlash, carColor, carFinish, activePage }) {
  const { scene } = useGLTF('/bmw_m3_coupe_e30_1986.glb');
  const meshRef = useRef();

  // Animation states
  const scaleRef = useRef(1);
  const targetXPosition = activePage === 'Paint Shop' ? 4.5 : 0;
  const currentXPosition = useRef(0);


  // Store original materials to revert after flash, and apply color/finish
  const originalMaterials = useRef({});

  // Function to apply color and finish to the main car body
  const targetNames = ['Object_2', 'Object_20', 'Object_21', 'Object_22', 'Object_23'];

  const applyCarStyle = useCallback((color, finish) => {
    if (!scene) return;

    scene.traverse((child) => {
      if (child.isMesh && child.material && targetNames.includes(child.name)) {
        // Ensure material is not an array (MultiMaterial)
        const material = Array.isArray(child.material) ? child.material[0] : child.material;

        if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhysicalMaterial) {
          material.color.set(color);

          if (finish === 'glossy') {
            material.metalness = 0.1;
            material.roughness = 0.2;
          } else if (finish === 'matte') {
            material.metalness = 0.0;
            material.roughness = 0.8;
          } else if (finish === 'metallic') {
            material.metalness = 0.9;
            material.roughness = 0.3;
          }
          material.needsUpdate = true;
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

  }, [scene]);

  // Flash Effect logic - triggered by counter change
  useEffect(() => {
    if (triggerFlash > 0 && scene) {
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

      // Smooth X position lerp for page transitions
      currentXPosition.current += (targetXPosition - currentXPosition.current) * 0.08;
      meshRef.current.position.x = currentXPosition.current;

      // Bounce/Scale Animation
      if (scaleRef.current > 1) {
        scaleRef.current = THREE.MathUtils.lerp(scaleRef.current, 1, delta * 5);
        meshRef.current.scale.setScalar(scaleRef.current);
      }
    }
  });

  return (
    <group ref={meshRef} position={[0, -1.03, 0]}>
      <Center top>
        <primitive object={scene} />
      </Center>
    </group>
  );
}

function App() {
  const [activePage, setActivePage] = useState('Garage');
  const [earnings, setEarnings] = useState(0); // Using this as 'Cash' for now
  const [environment, setEnvironment] = useState('city'); // Default environment lighting
  const [sceneBackground, setSceneBackground] = useState('grid'); // Default floor type
  const [rotationSpeed, setRotationSpeed] = useState(0.00);
  const [earningRate, setEarningRate] = useState(0.00001);

  // Auth
  const { user, authenticated } = usePrivy();

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

  // Check if user is "authenticated" (real wallet OR demo mode)
  const isAuthenticated = authenticated || demoMode;
  const currentWalletAddress = demoMode ? DEMO_WALLET_ADDRESS : user?.wallet?.address;

  // Audio
  const { playEquip, playSuccess } = useAudio();

  // Drag and Drop State
  const [draggedItem, setDraggedItem] = useState(null);
  const [actionTrigger, setActionTrigger] = useState(0);

  // Inventory State (purchased items)
  const [inventory, setInventory] = useState([]);

  // Equipped Parts State
  const [equippedParts, setEquippedParts] = useState({
    Engines: null,
    Turbos: null,
    Suspensions: null,
    Wheels: null,
    Special: null,
  });

  // Flash Effect State - Use counter to trigger unique flashes
  const [flashTrigger, setFlashTrigger] = useState(0);

  // Referral Code State
  const [referralCode, setReferralCode] = useState('');

  // Function to equip an item (triggered by drag & drop)
  const equipItem = (item) => {
    if (!item || !item.category) return;

    setEquippedParts(prev => ({
      ...prev,
      [item.category]: item
    }));

    // Trigger flash effect by incrementing counter
    setFlashTrigger(prev => prev + 1);

    // Play category-specific equip sound
    playEquip(item.category);
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

  // Car Customization State
  const [carColor, setCarColor] = useState('#FF0000'); // Initial Red
  const [carFinish, setCarFinish] = useState('glossy'); // 'glossy', 'matte', 'metallic'
  const [activeTab, setActiveTab] = useState('color'); // 'color', 'finish'

  // HSL State for color picker
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [lightness, setLightness] = useState(50);

  // Sync HSL to hex when sliders change
  useEffect(() => {
    const h = Number(hue);
    const s = Number(saturation) / 100;
    const l = Number(lightness) / 100;
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
    else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
    else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
    else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
    else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    setCarColor('#' + toHex(r) + toHex(g) + toHex(b));
  }, [hue, saturation, lightness]);

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
        setEquippedParts({
          Engines: DEMO_INVENTORY[0],
          Turbos: DEMO_INVENTORY[1],
          Wheels: DEMO_INVENTORY[2],
          Suspensions: DEMO_INVENTORY[3],
          Special: DEMO_INVENTORY[4],
        });
        setEarnings(999999);
        setReferralCode('DEMO1234');
        return;
      }

      // Real wallet connection
      if (authenticated && user?.wallet?.address) {
        console.log('Fetching data for:', user.wallet.address);
        const data = await fetchUserData(user.wallet.address);

        if (data) {
          console.log('Data loaded:', data);
          setCarColor(data.car_color || '#FF0000');
          setInventory(data.inventory || []);
          setEquippedParts(data.equipped_parts || {
            Engines: null, Turbos: null, Suspensions: null, Wheels: null, Special: null
          });
          setEarnings(Number(data.cash) || 50000);
          setReferralCode(data.referral_code || '');
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

    if (authenticated && user?.wallet?.address) {
      // Calculate net worth roughly for saving
      const currentNetWorth = inventory.reduce((sum, item) => {
        const price = parseInt(item.price?.replace(/[^0-9]/g, '') || 0);
        return sum + price;
      }, 0);

      saveUserData(user.wallet.address, {
        carColor,
        inventory,
        equippedParts,
        cash: earnings,
        netWorth: currentNetWorth
      });
    }
  }, [carColor, inventory, equippedParts, earnings, authenticated, user?.wallet?.address, demoMode]);


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

  return (
    <div
      className="h-screen w-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black relative overflow-hidden font-sans select-none text-white"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >

      {/* AudioControls & LoginButton - Top Right (Not on Marketplace) */}
      {activePage !== 'Marketplace' && (
        <div className="absolute top-6 right-6 z-50 flex items-center gap-3">
          <AudioControls />
          <LoginButton />
        </div>
      )}

      {/* 3D Scene Layer - Visible in Garage and Paint Shop */}
      {(activePage === 'Garage' || activePage === 'Paint Shop') && (
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
              rotationSpeed={rotationSpeed}
              triggerFlash={flashTrigger}
              carColor={carColor}
              carFinish={carFinish}
              activePage={activePage}
            />

            {/* Part Callouts - Only in Garage view */}
            {activePage === 'Garage' && (
              <CarCallouts equippedParts={equippedParts} inventory={inventory} visible={true} />
            )}

            {/* Floor - switches based on sceneBackground */}
            {sceneBackground === 'grid' && (
              <Grid
                position={[0, -1, 0]}
                args={[100, 100]}
                cellSize={0.5}
                cellThickness={0.5}
                cellColor={carColor === '#000000' || carColor === '#333333' ? '#444444' : carColor}
                sectionSize={3}
                sectionThickness={1}
                sectionColor={carColor === '#000000' || carColor === '#333333' ? '#666666' : carColor}
                fadeDistance={30}
                fadeStrength={1}
                followCamera={false}
                infiniteGrid={true}
              />
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
              <Bloom luminanceThreshold={1} intensity={1.5} mipmapBlur />
            </EffectComposer>

            {/* Custom Pendulum Camera Controls */}
            <PendulumControls activePage={activePage} />
          </Canvas>

        </div>
      )}

      {/* Marketplace Layer */}
      {activePage === 'Marketplace' && (
        <div className="absolute inset-0 z-20 bg-black/80 backdrop-blur-sm">
          <Marketplace addToInventory={addToInventory} />
        </div>
      )}

      {/* Race Page - Locked Interface */}
      {activePage === 'Race' && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black overflow-hidden">
          {/* Cyber-Grid Background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

          {/* Red Vignette */}
          <div className="absolute inset-0 bg-radial-gradient from-red-900/20 to-transparent pointer-events-none"></div>

          {/* Main Card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="relative max-w-2xl w-full p-12 border border-white/10 bg-black/60 backdrop-blur-xl flex flex-col items-center text-center shadow-[0_0_50px_rgba(220,38,38,0.1)]"
          >
            {/* Hazard Stripes Top Border */}
            <div className="absolute top-0 left-0 w-full h-1 bg-[repeating-linear-gradient(45deg,#DC2626,#DC2626_10px,transparent_10px,transparent_20px)] opacity-50"></div>

            {/* Lock Icon */}
            <div className="mb-8 relative">
              <div className="absolute inset-0 bg-red-500/20 blur-xl rounded-full scale-150 animate-pulse"></div>
              <Lock className="w-24 h-24 text-red-500 opacity-90 animate-pulse relative z-10" />
            </div>

            {/* Title */}
            <h1
              className="text-6xl font-bold italic uppercase text-white mb-2 tracking-wider"
              style={{ fontFamily: 'Rajdhani, sans-serif', textShadow: '0 0 30px rgba(220,38,38,0.5)' }}
            >
              Race Mode Locked
            </h1>

            {/* Subtitle */}
            <p className="text-xl text-gray-400 tracking-[0.2em] font-medium mb-12 uppercase" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Server maintenance in progress. The streets are closed.
            </p>

            {/* Notify Button */}
            <button className="group relative px-8 py-3 bg-transparent border border-red-500/50 hover:border-red-600 text-red-500 hover:text-white overflow-hidden transition-all duration-300">
              <div className="absolute inset-0 w-full h-full bg-red-600 -translate-x-full group-hover:translate-x-0 transition-transform duration-300 ease-out z-0"></div>
              <span className="relative z-10 font-bold uppercase tracking-widest text-sm flex items-center gap-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                <Bell size={16} />
                Notify When Live
              </span>
            </button>

            {/* Footer Text */}
            <div className="mt-8 text-xs text-red-500/60 font-mono flex items-center gap-2">
              <span>ESTIMATED LAUNCH</span>
              <span className="animate-pulse">:</span>
              <span>Q4 2025</span>
            </div>

            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-white/30"></div>
            <div className="absolute top-0 right-0 w-2 h-2 border-r border-t border-white/30"></div>
            <div className="absolute bottom-0 left-0 w-2 h-2 border-l border-b border-white/30"></div>
            <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-white/30"></div>
          </motion.div>
        </div>
      )}


      {/* Garage HUD - Only visible in Garage tab */}
      {activePage === 'Garage' && (
        <GarageHUD
          carColor={carColor}
          setActivePage={setActivePage}
          inventory={inventory}
          equippedParts={equippedParts}
          equipItem={equipItem}
          setDraggedItem={setDraggedItem}
          draggedItem={draggedItem}
        />
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
        />
      )}

      {/* Profile Page */}
      {activePage === 'Profile' && (
        <ProfilePage
          inventory={inventory}
          equippedParts={equippedParts}
          earnings={earnings}
          referralCode={referralCode} // Pass referral code
        />
      )}

      {/* Apple Dock - Always Last/Top */}
      <AppleStyleDock activePage={activePage} setActivePage={setActivePage} />
    </div>
  );
}

export default App;
