'use client';

import React, { useEffect, useState, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import './leaderboard.css';

type Player = {
  wallet_address: string;
  wins: number;
};

type Transform = {
  pos: { x: number; y: number; z: number };
  rot: { x: number; y: number; z: number };
};

// Initial transform for mountain background
const INITIAL_MOUNTAIN_TRANSFORM: Transform = {
  pos: { x: 0, y: -5, z: -30 },
  rot: { x: 0, y: 0, z: 0 },
};

export default function LeaderboardWithDevMenu() {
  // Leaderboard state
  const [leaders, setLeaders] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Three.js refs & state
  const mountRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const [mountainTransform, setMountainTransform] = useState(INITIAL_MOUNTAIN_TRANSFORM);

  // Dev menu toggle
  const [showDevMenu, setShowDevMenu] = useState(false);

  // Fetch leaderboard data
  useEffect(() => {
    async function fetchLeaders() {
      try {
        const res = await fetch('/api/leaderboard');
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data: Player[] = await res.json();
        setLeaders(data);
      } catch (err: any) {
        console.error('Failed to load leaderboard', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaders();
  }, []);

  // Initialize Three.js scene with mountain background
  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 50);

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

    const loader = new GLTFLoader();
    // Load mountain model
    loader.load(
      '/low_poly_mountain_free.glb',
      (gltf) => {
        const mountain = gltf.scene;
        mountain.scale.set(5, 5, 5);
        // apply initial transform
        mountain.position.set(
          mountainTransform.pos.x,
          mountainTransform.pos.y,
          mountainTransform.pos.z
        );
        mountain.rotation.set(
          mountainTransform.rot.x,
          mountainTransform.rot.y,
          mountainTransform.rot.z
        );
        scene.add(mountain);
        modelRef.current = mountain;
      },
      undefined,
      (err) => console.error('Error loading mountain model:', err)
    );

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
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
  }, [mountainTransform]);

  // Update mountain transform both in state and in scene
  const updateMountainTransform = (newTransform: Partial<Transform>) => {
    setMountainTransform((prev) => {
      const updated = {
        pos: newTransform.pos ? newTransform.pos : prev.pos,
        rot: newTransform.rot ? newTransform.rot : prev.rot,
      };
      const model = modelRef.current;
      if (model) {
        model.position.set(updated.pos.x, updated.pos.y, updated.pos.z);
        model.rotation.set(updated.rot.x, updated.rot.y, updated.rot.z);
      }
      return updated;
    });
  };

  // Keyboard controls for dev menu and mountain transform
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      let { x: px, y: py, z: pz } = mountainTransform.pos;
      let { x: rx, y: ry, z: rz } = mountainTransform.rot;
      const moveAmt = 1;
      const rotAmt = Math.PI / 36;
      switch (e.code) {
        case 'KeyW': pz -= moveAmt; break;
        case 'KeyS': pz += moveAmt; break;
        case 'KeyA': px -= moveAmt; break;
        case 'KeyD': px += moveAmt; break;
        case 'ArrowUp': rx -= rotAmt; break;
        case 'ArrowDown': rx += rotAmt; break;
        case 'ArrowLeft': ry -= rotAmt; break;
        case 'ArrowRight': ry += rotAmt; break;
        case 'KeyI':
          setShowDevMenu(prev => !prev);
          return;
        default:
          return;
      }
      updateMountainTransform({ pos: { x: px, y: py, z: pz }, rot: { x: rx, y: ry, z: rz } });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mountainTransform]);

  // Render states for leaderboard
  if (loading) return <p className="loading">Loading…</p>;
  if (error) return <p className="error">Error: {error}</p>;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* Three.js mount point */}
      <div
        ref={mountRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}
      />

      {/* Dev Menu Toggle Button */}
      <button
        onClick={() => setShowDevMenu(prev => !prev)}
        style={{
          position: 'absolute', top: 10, right: 10,
          zIndex: 3, padding: '0.5rem', background: '#000', color: '#0f0', border: '1px solid #0f0', cursor: 'pointer'
        }}
      >{showDevMenu ? 'Hide Dev Menu' : 'Show Dev Menu'}</button>

      {/* Dev Menu Overlay */}
      {showDevMenu && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          padding: '1rem', background: 'rgba(0,0,0,0.7)', color: '#0f0', fontFamily: 'monospace',
          zIndex: 2, borderRadius: '6px', minWidth: '240px'
        }}>
          <div style={{ marginBottom: '0.5rem' }}><strong>Mountain Transform</strong></div>
          {(['x','y','z'] as const).map(axis => (
            <div key={axis} style={{ marginBottom: '0.25rem' }}>
              <label>{axis.toUpperCase()} Pos: </label>
              <input
                type="number"
                value={mountainTransform.pos[axis].toFixed(1)}
                onChange={e => updateMountainTransform({ pos: { ...mountainTransform.pos, [axis]: parseFloat(e.target.value) } })}
                style={{ width: '60px', marginLeft: '0.5rem' }}
              />
            </div>
          ))}
          {(['x','y','z'] as const).map(axis => (
            <div key={axis} style={{ marginBottom: '0.25rem' }}>
              <label>{axis.toUpperCase()} Rot: </label>
              <input
                type="number" step="0.01"
                value={mountainTransform.rot[axis].toFixed(2)}
                onChange={e => updateMountainTransform({ rot: { ...mountainTransform.rot, [axis]: parseFloat(e.target.value) } })}
                style={{ width: '60px', marginLeft: '0.5rem' }}
              />
            </div>
          ))}
          <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Use W/A/S/D & arrows to move/rotate, I or button to toggle menu.
          </div>
        </div>
      )}

      {/* Leaderboard Panel */}
      <main className="leaderboard-page" style={{ position: 'relative', zIndex: 1 }}>
        <h2>Leaderboard</h2>
        <ol className="leader-list">
          {leaders.map((p, i) => (
            <li key={p.wallet_address}>
              <div className="card">
                <span className="rank">{i + 1}.</span>
                <span className="address">{p.wallet_address}</span>
                <span className="wins">{p.wins} wins</span>
              </div>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
