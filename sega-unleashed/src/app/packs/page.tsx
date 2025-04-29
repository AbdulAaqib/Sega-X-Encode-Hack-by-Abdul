// PackOpenings.tsx
'use client';

import { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DragControls } from "three/examples/jsm/controls/DragControls";
import { BrowserProvider, getAddress, parseEther, TransactionResponse } from "ethers";
import ErrorMessage from "./ErrorMessage";
import TxList from "./TxList";
import "./styles.css";

interface PaymentHandlers {
  setError: (msg: string) => void;
  setTxs: (txs: TransactionResponse[]) => void;
  amount: string;
}

const PACK_TIERS = [
  { amount: "0.01", img: "/BRONZE.png" },
  { amount: "0.05", img: "/SILVER.png" },
  { amount: "0.1",  img: "/GOLD.png"   },
];

async function startPayment({ setError, setTxs, amount }: PaymentHandlers) {
  if (!window.ethereum) {
    const err = "No crypto wallet found. Please install MetaMask.";
    setError(err);
    throw new Error(err);
  }
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const recipient = "0xA05228D9D57Fa3D2fc3D33885Ee5E281A94100C9";
    getAddress(recipient);
    const tx = await signer.sendTransaction({ to: recipient, value: parseEther(amount) });
    setTxs([tx]);
    setError("");
    return tx;
  } catch (err: any) {
    setError(err.message || "An unknown error occurred.");
    throw err;
  }
}

export default function PackOpenings() {
  const [error, setError] = useState<string>("");
  const [txs, setTxs] = useState<TransactionResponse[]>([]);
  const [selectedTier, setSelectedTier] = useState(PACK_TIERS[0].amount);
  const [mintedIds, setMintedIds] = useState<number[]>([]);
  const mountRef = useRef<HTMLDivElement>(null);
  const [buyHover, setBuyHover] = useState(false);

  useEffect(() => {
    // THREE.js scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const initialPos = { x: -20.86, y: 25.02, z: 27 };
    const radius = Math.hypot(initialPos.x, initialPos.y, initialPos.z);
    let theta = Math.atan2(initialPos.z, initialPos.x);
    let phi = Math.acos(initialPos.y / radius);

    const updateCameraPos = () => {
      camera.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
      camera.lookAt(0, 0, 0);
    };
    updateCameraPos();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (mountRef.current) {
      mountRef.current.innerHTML = '';
      mountRef.current.appendChild(renderer.domElement);
    }

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(0, 10, 0);
    scene.add(dirLight);

    // Load model and enable dragging
    const loader = new GLTFLoader();
    const draggable: THREE.Object3D[] = [];
    loader.load(
      "/low_poly_mine_cave.glb",
      (gltf) => {
        const modelRoot = gltf.scene;
        modelRoot.scale.set(2, 2, 2);
        scene.add(modelRoot);
        modelRoot.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) draggable.push(child);
        });
        const controls = new DragControls(draggable, camera, renderer.domElement);
        controls.addEventListener("dragstart", (e) => {
          const mat = (e.object as THREE.Mesh).material as any;
          mat.transparent = true;
          mat.opacity = 0.7;
        });
        controls.addEventListener("dragend", (e) => {
          const mat = (e.object as THREE.Mesh).material as any;
          mat.opacity = 1;
          mat.transparent = false;
        });
      },
      undefined,
      (err) => console.error("Error loading GLB:", err)
    );

    // Keyboard controls for camera
    let speedH = 0, speedV = 0;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') speedH = 0.02;
      if (e.code === 'ArrowRight') speedH = -0.02;
      if (e.code === 'ArrowUp') speedV = 0.02;
      if (e.code === 'ArrowDown') speedV = -0.02;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft','ArrowRight'].includes(e.code)) speedH = 0;
      if (['ArrowUp','ArrowDown'].includes(e.code)) speedV = 0;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      theta += speedH;
      phi = Math.min(Math.max(0.1, phi + speedV), Math.PI - 0.1);
      updateCameraPos();
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      if (mountRef.current) mountRef.current.innerHTML = '';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTxs([]);
    setMintedIds([]);
    try {
      const tx = await startPayment({ setError, setTxs, amount: selectedTier });
      const tierLabel =
        selectedTier === '0.01' ? 'Bronze' :
        selectedTier === '0.05' ? 'Silver' : 'Gold';
      const res = await fetch('http://20.117.181.22:5111/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: tx.from, traits: { packType: tierLabel } }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Mint failed');
      const ids: number[] = await res.json();
      setMintedIds(ids);
    } catch {
      // error already set
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div
        ref={mountRef}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      />

      <form
        onSubmit={handleSubmit}
        className="form-glass"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 10,
        }}
      >
        <div className="text-glass" style={{ textAlign: 'center', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            {PACK_TIERS.map((tier) => (
              <button
                key={tier.amount}
                type="button"
                onClick={() => setSelectedTier(tier.amount)}
                className="btn-glass"
                style={{ width: '140px', height: '140px', padding: 0 }}
              >
                <img
                  src={tier.img}
                  alt={`${tier.amount} ETH pack`}
                  style={{ width: '100%', height: '100%', objectFit: 'contain', opacity: selectedTier === tier.amount ? 1 : 0.5 }}
                />
              </button>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            type="submit"
            className="btn-glass"
            onMouseEnter={() => setBuyHover(true)}
            onMouseLeave={() => setBuyHover(false)}
            style={{ marginBottom: '1rem' }}
          >
            <img
              src={buyHover ? '/Buy-Pack.png' : '/Buy-a-Pack.png'}
              alt="Buy a Pack"
              style={{ width: '240px', height: 'auto' }}
            />
          </button>

          <ErrorMessage message={error} />
          <TxList txs={txs} />

          {txs.length > 0 && (
            <div className="text-glass" style={{ marginTop: '1rem', textAlign: 'left' }}>
              <strong>Transaction Hash:</strong>
              <div style={{ marginTop: '0.5rem' }}>
                <a
                  href={`https://polygonscan.com/tx/${txs[0].hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-glass"
                  style={{ position: 'relative', zIndex: 2, textDecoration: 'underline', wordBreak: 'break-all', pointerEvents: 'auto' }}
                >
                  https://polygonscan.com/tx/{txs[0].hash}
                </a>
              </div>
            </div>
          )}

          {mintedIds.length > 0 && (
            <div
              className="text-glass"
              style={{ marginTop: '1rem', padding: '0.5rem', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '8px', background: 'rgba(255,255,255,0.1)' }}
            >
              <strong>Minted Token IDs:</strong> {mintedIds.join(', ')}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
