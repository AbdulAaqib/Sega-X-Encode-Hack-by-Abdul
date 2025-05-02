'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import chatStyles from './Leaderboard.module.css';
import Image from 'next/image';

// Define leaderboard entry type
type LeaderboardEntry = {
  wallet_address: string;
  wins: number;
  data: unknown;
};

// Transform type definition
export type Transform = {
  pos: { x: number; y: number; z: number };
  rot: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
};

// Models to load
const MODEL_LIST = [
  { key: 'trophy', path: '/trophy.glb' },
  { key: 'mountain', path: '/low_poly_mountain_free.glb' },
  { key: 'gold_medal', path: '/gold_medal_no_shine.glb' },
  { key: 'low_poly_planet_earth', path: '/low_poly_planet_earth.glb' },
  { key: 'sonic2', path: '/sonic2.glb' },
];

// Initial transforms
const INITIAL_TRANSFORMS: Record<string, Transform> = {
  mountain: {
    pos: { x: 8, y: 6, z: 77 },
    rot: { x: 0, y: 0.78, z: 0 },
    scale: { x: 3, y: 3, z: 3 },
  },
  trophy: {
    pos: { x: 11, y: 9, z: 75 },
    rot: { x: 0, y: -0.17, z: -0.15 },
    scale: { x: 3, y: 3, z: 3 },
  },
  gold_medal: {
    pos: { x: 9, y: 10, z: 74 },
    rot: { x: 0, y: -0.17, z: -0.15 },
    scale: { x: 3, y: 3, z: 3 },
  },
  low_poly_planet_earth: {
    pos: { x: 11.8, y: 9.5, z: 77 },
    rot: { x: 0, y: -0.17, z: -0.15 },
    scale: { x: 0.5, y: 0.5, z: 0.5 },
  },
  sonic2: {
    pos: { x: 7, y: 9, z: 75 },
    rot: { x: 0, y: 0.91, z: -0.15 },
    scale: { x: 0.05, y: 0.05, z: 0.05 },
  },
};

export default function Page() {
  const mountRef = useRef<HTMLDivElement>(null);
  const modelsRef = useRef<Record<string, THREE.Object3D>>({});
  const mixersRef = useRef<Record<string, THREE.AnimationMixer>>({});
  const [selectedModel, setSelectedModel] = useState<string>(MODEL_LIST[0].key);
  const [transforms, setTransforms] = useState(INITIAL_TRANSFORMS);
  const [showDevMenu, setShowDevMenu] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingLb, setLoadingLb] = useState(true);

  useEffect(() => {
    fetch('/api/leaderboard')
      .then((res) => res.json())
      .then((data: LeaderboardEntry[]) => {
        const normalized: LeaderboardEntry[] = data.map((entry) => ({
          wallet_address: entry.wallet_address,
          wins: entry.wins,
          data: entry.data,
        }));
        setLeaderboard(normalized);
      })
      .catch((err) => console.error('Leaderboard fetch error:', err))
      .finally(() => setLoadingLb(false));
  }, []);

  const updateTransform = useCallback(
    (key: string, newVal: Partial<Transform>) => {
      setTransforms((prev) => {
        const updated: Record<string, Transform> = {
          ...prev,
          [key]: {
            pos: newVal.pos ?? prev[key].pos,
            rot: newVal.rot ?? prev[key].rot,
            scale: newVal.scale ?? prev[key].scale,
          },
        };
        const model = modelsRef.current[key];
        if (model) {
          const { pos, rot, scale } = updated[key];
          model.position.set(pos.x, pos.y, pos.z);
          model.rotation.set(rot.x, rot.y, rot.z);
          model.scale.set(scale.x, scale.y, scale.z);
        }
        return updated;
      });
    },
    []
  );

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(10, 10, 80);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const clock = new THREE.Clock();
    const loader = new GLTFLoader();

    MODEL_LIST.forEach(({ key, path }) => {
      loader.load(
        path,
        (gltf) => {
          const model = gltf.scene;
          const { scale, pos, rot } = transforms[key];
          model.scale.set(scale.x, scale.y, scale.z);
          model.position.set(pos.x, pos.y, pos.z);
          model.rotation.set(rot.x, rot.y, rot.z);
          scene.add(model);
          modelsRef.current[key] = model;

          if (gltf.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(model);
            mixersRef.current[key] = mixer;
            gltf.animations.forEach((clip) => {
              const action = mixer.clipAction(clip);
              action.setLoop(THREE.LoopRepeat, Infinity);
              action.play();
            });
          }
        },
        undefined,
        (error) => console.error(`Error loading ${path}:`, error)
      );
    });

    const PLANET_ROTATION_SPEED = 0.5;
    let reqId: number;

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      Object.values(mixersRef.current).forEach((m) => m.update(delta));
      const planet = modelsRef.current['low_poly_planet_earth'];
      if (planet) planet.rotation.y += PLANET_ROTATION_SPEED * delta;
      renderer.render(scene, camera);
    };

    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(reqId);
      renderer.dispose();
      if (mount && renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [transforms]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const model = modelsRef.current[selectedModel];
      if (!model) return;
      const moveAmt = 1;
      const rotAmt = Math.PI / 36;
      const { x: px, y: py, z: pz } = transforms[selectedModel].pos;
      const { x: rx, y: ry, z: rz } = transforms[selectedModel].rot;

      const newPos = { x: px, y: py, z: pz };
      const newRot = { x: rx, y: ry, z: rz };


      switch (e.code) {
        case 'KeyW': newPos.z -= moveAmt; break;
        case 'KeyS': newPos.z += moveAmt; break;
        case 'KeyA': newPos.x -= moveAmt; break;
        case 'KeyD': newPos.x += moveAmt; break;
        case 'ArrowUp': newRot.x -= rotAmt; break;
        case 'ArrowDown': newRot.x += rotAmt; break;
        case 'ArrowLeft': newRot.y -= rotAmt; break;
        case 'ArrowRight': newRot.y += rotAmt; break;
        case 'KeyI': setShowDevMenu((prev) => !prev); return;
        default: return;
      }

      updateTransform(selectedModel, { pos: newPos, rot: newRot });
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedModel, transforms, updateTransform]);

  const topLeaderboard = leaderboard.slice(0, 10);

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '120vh', height: 'auto' }}>
      {/* Leaderboard */}
      <aside className={chatStyles.container} style={{
        position: 'absolute',
        top: '120px',
        left: 0,
        width: '25%',
        bottom: 0,
        overflowY: 'auto',
        zIndex: 4
      }}>
        <Image
          src="/LEADERBOARD.png"
          alt="Leaderboard"
          width={500}
          height={150}
          style={{ width: '100%', height: 'auto', marginBottom: '1rem' }}
        />
        {loadingLb ? (
          <p>Loading…</p>
        ) : (
          <ol style={{
            paddingLeft: '1.2rem',
            margin: 0,
            color: 'white',
            listStylePosition: 'inside',
            fontSize: '0.9rem',
            lineHeight: '1.4'
          }}>
            {topLeaderboard.map((entry, i) => (
              <li key={entry.wallet_address ?? i} style={{ marginBottom: '0.6rem' }}>
                <span style={{ display: 'block', wordBreak: 'break-word' }}>{entry.wallet_address}</span>
                <small style={{ opacity: 0.8 }}>Wins: {entry.wins}</small>
              </li>
            ))}
          </ol>
        )}
      </aside>

      {/* Three.js Canvas */}
      <div
        ref={mountRef}
        /** make the canvas container full-screen behind overlays **/
        style={{
          position: 'fixed',   /* fix to viewport */
          top: 0,
          left: 0,
          width: '100vw',      /* full viewport width */
          height: '100vh',     /* full viewport height */
          zIndex: 0,
        }}
      />

      {/* Toggle Dev Menu */}
      <button
        onClick={() => setShowDevMenu(prev => !prev)}
        style={{
          position: 'absolute', top: 10, right: 10,
          zIndex: 3, padding: '0.5rem', background: '#000', color: '#0f0', border: '1px solid #0f0', cursor: 'pointer'
        }}
      >{showDevMenu ? 'Hide Dev Menu' : 'Show Dev Menu'}</button>

      {/* Dev Menu */}
      {showDevMenu && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          padding: '1rem', background: 'rgba(0,0,0,0.7)', color: '#0f0', fontFamily: 'monospace', zIndex: 2,
          borderRadius: '6px', minWidth: '240px'
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

          {(['x', 'y', 'z'] as const).map(axis => (
            <div key={axis}>
              <label>{axis.toUpperCase()} Pos:</label>
              <input
                type="number"
                value={transforms[selectedModel].pos[axis].toFixed(1)}
                onChange={e => updateTransform(selectedModel, {
                  pos: { ...transforms[selectedModel].pos, [axis]: parseFloat(e.target.value) }
                })}
                style={{ width: '60px', margin: '0.25rem' }}
              />
              <label>{axis.toUpperCase()} Rot:</label>
              <input
                type="number"
                value={transforms[selectedModel].rot[axis].toFixed(2)}
                step="0.01"
                onChange={e => updateTransform(selectedModel, {
                  rot: { ...transforms[selectedModel].rot, [axis]: parseFloat(e.target.value) }
                })}
                style={{ width: '60px', margin: '0.25rem' }}
              />
              <label>{axis.toUpperCase()} Scale:</label>
              <input
                type="number"
                value={transforms[selectedModel].scale[axis].toFixed(1)}
                step="0.1"
                onChange={e => updateTransform(selectedModel, {
                  scale: { ...transforms[selectedModel].scale, [axis]: parseFloat(e.target.value) }
                })}
                style={{ width: '60px', margin: '0.25rem' }}
              />
            </div>
          ))}
          <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Use fields above, W/A/S/D and Arrows, or I to toggle this menu.
          </div>
        </div>
      )}
    </div>
  );
}
