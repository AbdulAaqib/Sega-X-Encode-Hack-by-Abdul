'use client';

import React, { useRef, useEffect, useState } from 'react';
import ChatBot from '../../components/ChatBot';
import type { Player } from '../types';
import { useWallet } from '@/context/WalletContext';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// List of models to load
const MODEL_LIST = [
  { key: 'desert', path: '/desert.glb' },
  { key: 'tails',  path: '/tails.glb' },
  { key: 'sonic',  path: '/sonic.glb' },
  { key: 'amy',    path: '/amy.glb' },
  { key: 'knuckles', path: '/Knuckles.glb' },
];

// Animation name map
const ANIMATIONS: Record<string, string> = {
  sonic: 'sn_run_loop',
  amy: 'Walk',
  knuckles: 'kn_run_loop',
  tails: 'tl_run_loop',
};

// Initial transform values for each model
const INITIAL_TRANSFORMS = {
  desert:   { pos: { x: 22.0, y: -5.0,  z: 10.0 }, rot: { x: 0.17, y: -0.26, z: 0.00 } },
  tails:    { pos: { x: 13.0, y: -1.0,  z: 46.0 }, rot: { x: 0.02, y:  0.47, z: -0.01 } },
  sonic:    { pos: { x: 26.0, y: 10.0,  z:  1.0 }, rot: { x: 0.17, y: -0.26, z:  0.00 } },
  amy:      { pos: { x: 34.0, y:  7.0,  z: 35.0 }, rot: { x: 0.13, y: -1.12, z:  0.00 } },
  knuckles: { pos: { x: 21.0, y: -5.0,  z: 35.0 }, rot: { x: 0.15, y: -0.75, z: -0.07 } },
};

export default function Page() {
  const { account } = useWallet();
  const mountRef = useRef<HTMLDivElement>(null);
  const modelsRef = useRef<Record<string, THREE.Object3D>>({});
  const mixersRef = useRef<Record<string, THREE.AnimationMixer>>({});
  const [selectedModel, setSelectedModel] = useState<string>(MODEL_LIST[0].key);
  const [transforms, setTransforms] = useState(INITIAL_TRANSFORMS);
  // Toggle for dev info menu
  const [showDevMenu, setShowDevMenu] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(10, 10, 80);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const clock = new THREE.Clock();

    // Load all models with animations
    const loader = new GLTFLoader();
    MODEL_LIST.forEach(({ key, path }) => {
      loader.load(
        path,
        (gltf) => {
          const model = gltf.scene;
          model.scale.set(3, 3, 3);

          // Apply initial transform
          const { pos, rot } = transforms[key as keyof typeof transforms];
          model.position.set(pos.x, pos.y, pos.z);
          model.rotation.set(rot.x, rot.y, rot.z);

          scene.add(model);
          modelsRef.current[key] = model;

          // Setup animation if available
          const animName = ANIMATIONS[key as keyof typeof ANIMATIONS];
          const clip = gltf.animations.find(a => a.name === animName);
          if (clip) {
            const mixer = new THREE.AnimationMixer(model);
            mixersRef.current[key] = mixer;
            const action = mixer.clipAction(clip);
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.play();
          }
        },
        undefined,
        (error) => console.error(`Error loading ${path}:`, error)
      );
    });

    // Animation + render loop
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      Object.values(mixersRef.current).forEach(m => m.update(delta));
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      if (mountRef.current && renderer.domElement.parentNode === mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Keyboard controls
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const model = modelsRef.current[selectedModel];
      if (!model) return;
      const moveAmt = 1;
      const rotAmt = Math.PI / 36;
      let { x: px, y: py, z: pz } = transforms[selectedModel as keyof typeof transforms].pos;
      let { x: rx, y: ry, z: rz } = transforms[selectedModel as keyof typeof transforms].rot;
      switch (e.code) {
        case 'KeyW': pz -= moveAmt; break;
        case 'KeyS': pz += moveAmt; break;
        case 'KeyA': px -= moveAmt; break;
        case 'KeyD': px += moveAmt; break;
        case 'ArrowUp':    rx -= rotAmt; break;
        case 'ArrowDown':  rx += rotAmt; break;
        case 'ArrowLeft':  ry -= rotAmt; break;
        case 'ArrowRight': ry += rotAmt; break;
        case 'KeyI': // toggle dev menu
          setShowDevMenu(prev => !prev);
          return;
        default: return;
      }
      updateTransform(selectedModel, { pos: { x: px, y: py, z: pz }, rot: { x: rx, y: ry, z: rz } });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedModel, transforms]);

  const updateTransform = (
    key: string,
    newVal: { pos?: { x: number; y: number; z: number }; rot?: { x: number; y: number; z: number } }
  ) => {
    setTransforms(prev => {
      const updated = {
        ...prev,
        [key]: {
          pos: newVal.pos ?? prev[key as keyof typeof prev].pos,
          rot: newVal.rot ?? prev[key as keyof typeof prev].rot,
        }
      };
      const model = modelsRef.current[key];
      if (model) {
        const { pos, rot } = updated[key as keyof typeof updated];
        model.position.set(pos.x, pos.y, pos.z);
        model.rotation.set(rot.x, rot.y, rot.z);
      }
      return updated;
    });
  };

  // Build player
  const player: Player = {
    name: 'Player Sonic',
    description: 'Your custom Sonic avatar with Speed Shoes and Spin Dash.',
    attributes: [
      { trait_type: 'Character', value: 'Sonic' },
      { trait_type: 'Gear',      value: 'Speed Shoes' },
      { trait_type: 'Move Set', value: ['Spin Dash', 'Homing Attack', 'Super Peel Out', 'Tornado'] },
    ],
    health: 100,
    wallet_address_real: account,
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={mountRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} />

      {/* Toggle Button */}
      <button
        onClick={() => setShowDevMenu(prev => !prev)}
        style={{
          position: 'absolute', top: 10, right: 10,
          zIndex: 3, padding: '0.5rem', background: '#000', color: '#0f0', border: '1px solid #0f0', cursor: 'pointer'
        }}
      >{showDevMenu ? 'Hide Dev Menu' : 'Show Dev Menu'}</button>

      {/* Central info + controls */}
      {showDevMenu && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          padding: '1rem', background: 'rgba(0,0,0,0.7)', color: '#0f0', fontFamily: 'monospace',
          zIndex: 2, borderRadius: '6px', minWidth: '240px'
        }}>
          <label htmlFor="model-select" style={{ display: 'block', marginBottom: '0.5rem' }}>Select Model:</label>
          <select
            id="model-select"
            value={selectedModel}
            onChange={e => setSelectedModel(e.target.value)}
            style={{ width: '100%', marginBottom: '1rem' }}
          >
            {MODEL_LIST.map(m => <option key={m.key} value={m.key}>{m.key}</option>)}
          </select>

          <div style={{ marginBottom: '0.5rem' }}><strong>Position</strong></div>
          {(['x','y','z'] as const).map(axis => (
            <div key={axis} style={{ marginBottom: '0.25rem' }}>
              <label>{axis.toUpperCase()}: </label>
              <input
                type="number"
                value={transforms[selectedModel as keyof typeof transforms].pos[axis].toFixed(1)}
                onChange={e => updateTransform(selectedModel, { pos: { ...transforms[selectedModel as keyof typeof transforms].pos, [axis]: parseFloat(e.target.value) } })}
                style={{ width: '60px', marginLeft: '0.5rem' }}
              />
            </div>
          ))}

          <div style={{ margin: '0.5rem 0 0.25rem' }}><strong>Rotation</strong></div>
          {(['x','y','z'] as const).map(axis => (
            <div key={axis} style={{ marginBottom: '0.25rem' }}>
              <label>{axis.toUpperCase()}: </label>
              <input
                type="number"
                step="0.01"
                value={transforms[selectedModel as keyof typeof transforms].rot[axis].toFixed(2)}
                onChange={e => updateTransform(selectedModel, { rot: { ...transforms[selectedModel as keyof typeof transforms].rot, [axis]: parseFloat(e.target.value) } })}
                style={{ width: '60px', marginLeft: '0.5rem' }}
              />
            </div>
          ))}

          <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Use fields above, W/A/S/D and Arrows, or I to toggle this menu.</div>
        }</div>
      )}

      <aside style={{ position: 'absolute', top: '50%', left: '3%', transform: 'translateY(-50%)', width: '38%', height: '80%', zIndex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <ChatBot player={player} />
      </aside>
    </div>
  );
}