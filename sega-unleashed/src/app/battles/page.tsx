'use client';

import React, { useRef, useEffect, useState } from 'react';
import ChatBot from '../../components/ChatBot';
import type { Player } from '../types';
import { useWallet } from '@/context/WalletContext';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 1) Make MODEL_LIST a readonly tuple so that its "key" is narrowed
const MODEL_LIST = [
  { key: 'desert',   path: '/desert.glb'   },
  { key: 'tails',    path: '/tails.glb'    },
  { key: 'sonic',    path: '/sonic.glb'    },
  { key: 'amy',      path: '/amy.glb'      },
  { key: 'knuckles', path: '/Knuckles.glb' },
] as const;

// 2) Derive the exact union of keys from MODEL_LIST
type ModelEntry = typeof MODEL_LIST[number];
type ModelKey   = ModelEntry['key'];

// 3) Animation map now keyed by ModelKey
const ANIMATIONS: Record<ModelKey, string> = {
  desert:   '',               // (no animation on the terrain model)
  tails:    'tl_run_loop',
  sonic:    'sn_run_loop',
  amy:      'Walk',
  knuckles: 'kn_run_loop',
};

// 4) Initial transforms typed with ModelKey
const INITIAL_TRANSFORMS: Record<ModelKey, { pos: XYZ; rot: XYZ }> = {
  desert:   { pos: { x: 22,  y: -5, z: 10 }, rot: { x: 0.17, y: -0.26, z: 0 } },
  tails:    { pos: { x: 13,  y: -1, z: 46 }, rot: { x: 0.02, y:  0.47, z: -0.01 } },
  sonic:    { pos: { x: 26,  y: 10, z:  1 }, rot: { x: 0.17, y: -0.26, z:  0 } },
  amy:      { pos: { x: 34,  y:  7, z: 35 }, rot: { x: 0.13, y: -1.12, z:  0 } },
  knuckles: { pos: { x: 21,  y: -5, z: 35 }, rot: { x: 0.15, y: -0.75, z: -0.07 } },
};

type XYZ = { x: number; y: number; z: number };

export default function Page() {
  const { account } = useWallet();
  const mountRef  = useRef<HTMLDivElement>(null);
  const modelsRef = useRef<Partial<Record<ModelKey, THREE.Object3D>>>({});
  const mixersRef = useRef<Partial<Record<ModelKey, THREE.AnimationMixer>>>({});

    // Selected model (never changes at runtime)
    const [selectedModel] = useState<ModelKey>(MODEL_LIST[0].key);
  const [transforms, setTransforms] = useState(() => ({ ...INITIAL_TRANSFORMS }));
  const [showDevMenu, setShowDevMenu] = useState(false);

  // ————————————————————————————————————————————————
  // Scene setup, loader & animation loop
  // ————————————————————————————————————————————————
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Basic Three.js setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(10,10,80);
    camera.lookAt(0,0,0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5,10,7);
    scene.add(dirLight);

    const clock  = new THREE.Clock();
    const loader = new GLTFLoader();

    // — Load each model with fully-typed "key" —
    MODEL_LIST.forEach(({ key, path }) => {
      loader.load(
        path,
        (gltf) => {
          const model = gltf.scene;
          model.scale.set(3,3,3);

          // now type-safe: key is ModelKey
          const { pos, rot } = transforms[key];
          model.position.set(pos.x, pos.y, pos.z);
          model.rotation.set(rot.x, rot.y, rot.z);

          scene.add(model);
          modelsRef.current[key] = model;

          // start animation if it exists
          const animName = ANIMATIONS[key];
          if (animName) {
            const clip = gltf.animations.find(a => a.name === animName);
            if (clip) {
              const mixer = new THREE.AnimationMixer(model);
              mixersRef.current[key] = mixer;
              mixer.clipAction(clip)
                   .setLoop(THREE.LoopRepeat, Infinity)
                   .play();
            }
          }
        },
        undefined,
        err => console.error(`Error loading ${path}:`, err)
      );
    });

    // render loop
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      Object.values(mixersRef.current).forEach(m => m?.update(delta));
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth/window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [transforms]);

  // ————————————————————————————————————————————————
  // Keyboard controls
  // ————————————————————————————————————————————————
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const model = modelsRef.current[selectedModel];
      if (!model) return;

      const moveAmt = 1;
      const rotAmt  = Math.PI/36;
      const { pos: oldPos, rot: oldRot } = transforms[selectedModel];

      const newPos = { ...oldPos };
      const newRot = { ...oldRot };

      switch (e.code) {
        case 'KeyW': newPos.z -= moveAmt; break;
        case 'KeyS': newPos.z += moveAmt; break;
        case 'KeyA': newPos.x -= moveAmt; break;
        case 'KeyD': newPos.x += moveAmt; break;
        case 'ArrowUp':    newRot.x -= rotAmt; break;
        case 'ArrowDown':  newRot.x += rotAmt; break;
        case 'ArrowLeft':  newRot.y -= rotAmt; break;
        case 'ArrowRight': newRot.y += rotAmt; break;
        case 'KeyI':
          setShowDevMenu(v => !v);
          return;
        default:
          return;
      }

      updateTransform(selectedModel, { pos: newPos, rot: newRot });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedModel, transforms]);

  const updateTransform = (
    key: ModelKey,
    newVal: { pos?: XYZ; rot?: XYZ }
  ) => {
    setTransforms(prev => {
      const updated = {
        ...prev,
        [key]: {
          pos: newVal.pos ?? prev[key].pos,
          rot: newVal.rot ?? prev[key].rot,
        },
      };
      // apply immediately in the scene
      const m = modelsRef.current[key];
      if (m) {
        const { pos, rot } = updated[key];
        m.position.set(pos.x, pos.y, pos.z);
        m.rotation.set(rot.x, rot.y, rot.z);
      }
      return updated;
    });
  };

  // ————————————————————————————————————————————————
  // ChatBot data & render
  // ————————————————————————————————————————————————
  const player: Player = {
    name:              'Player Sonic',
    description:       'Your custom Sonic avatar with Speed Shoes and Spin Dash.',
    attributes: [
      { trait_type: 'Character', value: 'Sonic' },
      { trait_type: 'Gear',      value: 'Speed Shoes' },
      {
        trait_type: 'Move Set',
        value: ['Spin Dash', 'Homing Attack', 'Super Peel Out', 'Tornado'],
      },
    ],
    health:              100,
    wallet_address_real: account,
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* 3D Canvas */}
      <div
        ref={mountRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
      />

      {/* Dev Menu Toggle */}
      <button
        onClick={() => setShowDevMenu(v => !v)}
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 3,
          padding: '0.5rem',
          background: '#000',
          color: '#0f0',
          border: '1px solid #0f0',
          cursor: 'pointer',
        }}
      >
        {showDevMenu ? 'Hide Dev Menu' : 'Show Dev Menu'}
      </button>

      {/* Dev Menu Overlay */}
      {showDevMenu && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '1rem',
            background: 'rgba(0,0,0,0.7)',
            color: '#0f0',
            fontFamily: 'monospace',
            zIndex: 2,
            borderRadius: '6px',
            minWidth: '240px',
          }}
        >
          <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Use W/A/S/D, Arrow keys, or press I to toggle this menu.
          </div>
        </div>
      )}

      {/* ChatBot Sidebar */}
      <aside
        style={{
          position: 'absolute',
          top: '50%',
          left: '3%',
          transform: 'translateY(-50%)',
          width: '38%',
          height: '80%',
          zIndex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <ChatBot player={player} />
      </aside>
    </div>
  );
}
