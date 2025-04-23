'use client';

import { useRouter } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';

export default function Home() {
  const { account, connectWallet, error } = useWallet();
  const router = useRouter();

  const handleConnect = async () => {
    await connectWallet();
    if (window.ethereum && account) router.replace('/packs');
  };

  return (
    <div className="page">
      <h2>Welcome to SEGA Unleashed</h2>
      {error && <p className="App-error">{error}</p>}
      {!account && (
        <button className="connect-btn" onClick={handleConnect}>
          <span className="shadow" />
          <span className="edge" />
          <span className="front">Connect MetaMask</span>
        </button>
      )}
    </div>
  );
}