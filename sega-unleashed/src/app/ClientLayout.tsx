// src/app/ClientLayout.tsx
'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import NavBar from '@/components/NavBar';

export let globalWalletAddress = '';

declare global {
  interface Window {
    globalWalletAddress?: string;
  }
}

export default function ClientLayout({ children }: { children: ReactNode }) {
  const { account, balance } = useWallet();
  const [localWalletAddress, setLocalWalletAddress] = useState('');

  useEffect(() => {
    if (!account) return;
    globalWalletAddress = account;
    if (typeof window !== 'undefined') {
      window.globalWalletAddress = account;
    }
    setLocalWalletAddress(account);
    console.log('🌐 globalWalletAddress set to', account);
  }, [account]);

  useEffect(() => {
    if (!localWalletAddress) return;

    (async () => {
      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallet_address: localWalletAddress }),
        });

        const json = await res.json();
        if (!res.ok) {
          console.error('❌ chat error:', json);
        } else {
          console.log('✅ Wallet saved:', json.user);
        }
      } catch (e) {
        console.error('❌ Failed to send wallet:', e);
      }
    })();
  }, [localWalletAddress]);

  return (
    <div className="layout-container">
      <div className="top-bar flex justify-between items-center p-4 bg-gray-100">
        {localWalletAddress && (
          <div className="account-info text-sm">
            <span className="mr-2">{localWalletAddress}</span>
            <span>{balance ? parseFloat(balance).toFixed(4) : '0.0000'} ETH</span>
          </div>
        )}
        {localWalletAddress && <NavBar />}
      </div>
      <main className="main-content">{children}</main>
    </div>
  );
}
