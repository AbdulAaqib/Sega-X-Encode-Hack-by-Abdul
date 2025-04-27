'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';

export default function Home() {
  const { connectWallet, error } = useWallet();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const acct = await connectWallet();
      if (acct) {
        router.replace('/packs');
      }
    } catch {
      // error is handled by context.error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h2>Welcome to SEGA Unleashed</h2>
      {error && <p className="App-error">{error}</p>}

      <button
        className="connect-btn"
        onClick={handleConnect}
        disabled={loading}
      >
        <span className="shadow" />
        <span className="edge" />
        <span className="front">
          {loading ? 'Connecting…' : 'Connect MetaMask'}
        </span>
      </button>
    </div>
  );
}
