'use client';

import React, { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import Image from 'next/image';
import './sega-sky.css';

export default function Home() {
  const { connectWallet, error, account } = useWallet();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const mountRef = useRef<HTMLDivElement>(null);
  const islandRef = useRef<THREE.Object3D | null>(null);
  const townRef = useRef<THREE.Object3D | null>(null);
  const sonicRef = useRef<THREE.Object3D | null>(null);

  const [devOpen, setDevOpen] = useState(false);
  const [pos, setPos] = useState({ x: -1, y: -4, z: -10 });
  const [rot, setRot] = useState({ x: 0.06, y: -0.04, z: 0 });

  const phaseDuration = 5;

  const handleConnect = async () => {
    setLoading(true);
    try {
      const acct = await connectWallet();
      if (acct) router.replace('/packs');
    } catch {
      // Error handled by context
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 5, 20);
    camera.lookAt(0, 0, 0);
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const clock = new THREE.Clock();
    const loader = new GLTFLoader();

    const staticPos = { x: -1, y: -4, z: -10 };
    const staticRot = { x: 0.06, y: -0.04, z: 0 };
    const islandStartY = 0.33;
    const islandEndY = -0.9;
    const townStartY = 0.93;
    const townEndY = -0.4;

    loader.load('/green_island.glb', gltf => {
      const m = gltf.scene;
      m.scale.set(1, 1, 1);
      m.position.set(staticPos.x, staticPos.y, staticPos.z);
      m.rotation.set(staticRot.x, islandStartY, staticRot.z);
      m.visible = true;
      camera.add(m);
      islandRef.current = m;
    });

    loader.load('/fishing_town.glb', gltf => {
      const m = gltf.scene;
      m.scale.set(1, 1, 1);
      m.position.set(0.9, -0.9, -15.1);
      m.rotation.set(0.22, townStartY, 0);
      m.visible = false;
      camera.add(m);
      townRef.current = m;
    });

    loader.load('/sonic2.glb', gltf => {
      const m = gltf.scene;
      m.scale.set(0.5, 0.5, 0.5);
      m.position.set(0, -2, -5);
      m.rotation.set(0, Math.PI, 0);
      m.visible = true;
      scene.add(m);
      sonicRef.current = m;
    });

    const animate = () => {
      requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      const cycle = Math.floor(elapsed / phaseDuration) % 2;
      const t = (elapsed % phaseDuration) / phaseDuration;

      if (islandRef.current && townRef.current) {
        const showingIsland = cycle === 0;
        islandRef.current.visible = showingIsland;
        townRef.current.visible = !showingIsland;

        if (showingIsland) {
          islandRef.current.rotation.y = THREE.MathUtils.lerp(
            islandStartY,
            islandEndY,
            t
          );
        } else {
          townRef.current.rotation.y = THREE.MathUtils.lerp(
            townStartY,
            townEndY,
            t
          );
        }
      }

      if (sonicRef.current) {
        sonicRef.current.rotation.y += 0.01;
      }

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyI') setDevOpen(o => !o);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const updateTransform = (
    newPos: typeof pos,
    newRot: typeof rot
  ) => {
    const m = islandRef.current;
    if (!m) return;
    m.position.set(newPos.x, newPos.y, newPos.z);
    m.rotation.set(newRot.x, newRot.y, newRot.z);
    setPos(newPos);
    setRot(newRot);
  };

  const buttonText = loading
    ? 'Connecting…'
    : account
    ? 'Signed into MetaMask'
    : 'Connect MetaMask';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div className="stars" />
      <div className="clouds" />

      <div
        ref={mountRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />

      <div
        className="page"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <Image
          src="/SEGA-UNLEASHED-gif.gif"
          alt="Welcome to SEGA Unleashed"
          className="welcome-gif"
          width={500}
          height={300}
          style={{ pointerEvents: 'all' }}
          priority
        />
        {error && <p className="App-error">{error}</p>}
        <button
          onClick={handleConnect}
          disabled={loading || Boolean(account)}
          className="connect-btn"
          style={{ pointerEvents: 'all' }}
        >
          <span className="shadow" />
          <span className="edge" />
          <span className="front">{buttonText}</span>
        </button>
      </div>

      <button
        onClick={() => setDevOpen(o => !o)}
        style={{ position: 'absolute', top: 10, right: 10, zIndex: 2, pointerEvents: 'all' }}
      >
        {devOpen ? 'Hide Dev' : 'Show Dev'}
      </button>

      {devOpen && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%,-50%)',
            background: 'rgba(0,0,0,0.7)',
            padding: '1rem',
            color: '#0f0',
            zIndex: 2,
            fontFamily: 'monospace',
          }}
        >
          <div><strong>Position</strong></div>
          {(['x', 'y', 'z'] as const).map(a => (
            <div key={a}>
              <label>{a.toUpperCase()}: </label>
              <input
                type="number"
                step="0.1"
                value={pos[a]}
                onChange={e =>
                  updateTransform(
                    { ...pos, [a]: parseFloat(e.target.value) },
                    rot
                  )
                }
                style={{ width: '50px' }}
              />
            </div>
          ))}
          <div><strong>Rotation</strong></div>
          {(['x', 'y', 'z'] as const).map(a => (
            <div key={a}>
              <label>{a.toUpperCase()}: </label>
              <input
                type="number"
                step="0.01"
                value={rot[a]}
                onChange={e =>
                  updateTransform(pos, {
                    ...rot,
                    [a]: parseFloat(e.target.value),
                  })
                }
                style={{ width: '50px' }}
              />
            </div>
          ))}
          <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
            Press &apos;I&apos; to toggle
          </div>
        </div>
      )}
    </div>
  );
}
