'use client';

import { useState, useRef, useEffect } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DragControls } from "three/examples/jsm/controls/DragControls.js";
import { BrowserProvider, getAddress, parseEther, TransactionResponse } from "ethers";
import Image from "next/image";
import ErrorMessage from "./ErrorMessage";
import TxList from "./TxList";
import styles from "./PackOpenings.module.css";
import type { MetaMaskInpageProvider } from "@metamask/providers";

interface PaymentHandlers {
  setError: (msg: string) => void;
  setTxs: (txs: TransactionResponse[]) => void;
  amount: string;
}

const PACK_TIERS = [
  { amount: "0",    img: "/Free.png" },
  { amount: "0.01", img: "/BRONZE.png" },
  { amount: "0.05", img: "/SILVER.png" },
  { amount: "0.1",  img: "/GOLD.png" },
];

async function startPayment({ setError, setTxs, amount }: PaymentHandlers) {
  // treat amount string directly
  if (amount !== "0" && !window.ethereum) {
    const err = "No crypto wallet found. Please install MetaMask.";
    setError(err);
    throw new Error(err);
  }

  try {
    let tx: TransactionResponse | null = null;

    // Only send transaction if amount > 0
    if (amount !== "0" && window.ethereum) {
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const provider = new BrowserProvider(window.ethereum as unknown as MetaMaskInpageProvider);
      const signer = await provider.getSigner();
      const recipient = "0xA05228D9D57Fa3D2fc3D33885Ee5E281A94100C9";
      getAddress(recipient);
      tx = await signer.sendTransaction({ to: recipient, value: parseEther(amount) });
      setTxs([tx]);
    }

    setError("");
    return tx;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "An unknown error occurred.";
    setError(msg);
    throw err;
  }
}

export default function PackOpenings() {
  const [error, setError] = useState<string>("");
  const [txs, setTxs] = useState<TransactionResponse[]>([]);
  const [selectedTier, setSelectedTier] = useState(PACK_TIERS[0].amount);
  const [mintedIds, setMintedIds] = useState<number[]>([]);
  const [isMinting, setIsMinting] = useState<boolean>(false);
  const mountRef = useRef<HTMLDivElement>(null);
  const [buyHover, setBuyHover] = useState(false);

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
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
    mountNode.innerHTML = '';
    mountNode.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(0, 10, 0);
    scene.add(dirLight);

    const loader = new GLTFLoader();
    const draggable: THREE.Object3D[] = [];

    loader.load(
      "/low_poly_mine_cave.glb",
      (gltf) => {
        const modelRoot = gltf.scene;
        modelRoot.scale.set(2, 2, 2);
        scene.add(modelRoot);

        modelRoot.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            draggable.push(child);
          }
        });

        const controls = new DragControls(draggable, camera, renderer.domElement);

        controls.addEventListener("dragstart", (e) => {
          const mesh = e.object as THREE.Mesh;
          const mat = mesh.material as THREE.Material & {
            transparent: boolean;
            opacity: number;
          };
          mat.transparent = true;
          mat.opacity = 0.7;
        });
        controls.addEventListener("dragend", (e) => {
          const mesh = e.object as THREE.Mesh;
          const mat = mesh.material as THREE.Material & {
            transparent: boolean;
            opacity: number;
          };
          mat.opacity = 1;
          mat.transparent = false;
        });
      },
      undefined,
      (err) => console.error("Error loading GLB:", err)
    );

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

    const animate = () => {
      requestAnimationFrame(animate);
      theta += speedH;
      phi = Math.min(Math.max(0.1, phi + speedV), Math.PI - 0.1);
      updateCameraPos();
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
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      mountNode.innerHTML = '';
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setTxs([]);
    setMintedIds([]);
    setIsMinting(true);

    // if free selected, treat as bronze price
    const paymentAmount = selectedTier === '0' ? '0.01' : selectedTier;

    try {
      const tx = await startPayment({ setError, setTxs, amount: paymentAmount });

      // label still based on original selectedTier
      const tierLabel =
        selectedTier === '0'    ? 'Bronze' :
        selectedTier === '0.01' ? 'Bronze' :
        selectedTier === '0.05' ? 'Silver' : 'Gold';

      const res = await fetch('https://mpdfunction2.azurewebsites.net/api/mintpack2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient: tx?.from, traits: { packType: tierLabel } }),
      });

      if (!res.ok) throw new Error((await res.json()).error || 'Mint failed');
      const ids: number[] = await res.json();
      setMintedIds(ids);
    } catch {
      // error displayed via setError
    } finally {
      setIsMinting(false);
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
        className={styles.formGlass}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 10,
        }}
      >
        <div className="text-glass" style={{ textAlign: "center", marginBottom: "1rem" }}>
          <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: "1rem" }}>
            {PACK_TIERS.map((tier) => (
              <button
                key={tier.amount + tier.img}
                type="button"
                onClick={() => setSelectedTier(tier.amount)}
                className={styles.btnGlass}
                style={{ width: "140px", height: "140px", padding: 0 }}
              >
                <Image
                  src={tier.img}
                  alt={`${tier.amount} ETH pack`}
                  className={styles.imgReset}
                  width={140}
                  height={140}
                  style={{
                    objectFit: "contain",
                    opacity: selectedTier === tier.amount ? 1 : 0.5,
                  }}
                  priority
                />
              </button>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center" }}>
          <button
            type="submit"
            className={styles.btnGlass}
            onMouseEnter={() => setBuyHover(true)}
            onMouseLeave={() => setBuyHover(false)}
            style={{ marginBottom: "1rem" }}
            disabled={isMinting}
          >
            {isMinting ? (
              <span className="text-glass">Minting NFTs...</span>
            ) : (
              <Image
                src={buyHover ? "/Buy-Pack.png" : "/Buy-a-Pack.png"}
                alt="Buy a Pack"
                width={240}
                height={80}
                className={styles.imgReset}
                priority
              />
            )}
          </button>

          <ErrorMessage message={error} />
          <TxList txs={txs} />

          {txs.length > 0 && (
            <div className="text-glass" style={{ marginTop: "1rem", textAlign: "left" }}>
              <strong>Transaction Hash:</strong>
              <div style={{ marginTop: "0.5rem" }}>
                <a
                  href={`https://polygonscan.com/tx/${txs[0].hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-glass"
                  style={{
                    textDecoration: "underline",
                    wordBreak: "break-all",
                    pointerEvents: "auto",
                  }}
                >
                  https://polygonscan.com/tx/{txs[0].hash}
                </a>
              </div>
            </div>
          )}

          {mintedIds.length > 0 && (
            <div
              className="text-glass"
              style={{
                marginTop: "1rem",
                padding: "0.5rem",
                border: "1px solid rgba(255,255,255,0.4)",
                borderRadius: "8px",
                background: "rgba(255,255,255,0.1)",
              }}
            >
              <strong>Minted Token IDs:</strong> {mintedIds.join(", ")}
            </div>
          )}
        </div>
      </form>
    </div>
  );
}