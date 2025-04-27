// app/ClientLayout.tsx
'use client';

import { ReactNode } from 'react';
import { useWallet } from '@/context/WalletContext';
import NavBar from '@/components/NavBar';

export default function ClientLayout({ children }: { children: ReactNode }) {
  const { account, balance } = useWallet();

  return (
    <div className="layout-container">
      {/* Top bar with account info and navbar */}
      <div className="top-bar flex justify-between items-center p-4 bg-gray-100">
        {account ? (
          <div className="account-info text-sm">
            <span className="mr-2">
              {account.substring(0, 6)}...{account.substring(account.length - 4)}
            </span>
            <span>{parseFloat(balance).toFixed(4)} ETH</span>
          </div>
        ) : null}
        {account && <NavBar />}
      </div>

      {/* Main area: centers whatever’s inside (your Home page) */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
