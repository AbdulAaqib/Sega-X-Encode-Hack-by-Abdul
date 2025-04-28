// src/app/battles/page.tsx
'use client';
import React from 'react';
// Use relative import to match project structure
import ChatBot from '../../components/ChatBot';
import type { Player } from '../types';
import { useWallet } from '@/context/WalletContext';
export default function Page() {
  const { account, balance } = useWallet();
  const player: Player = {
    name: 'Player Sonic',
    description: 'Your custom Sonic avatar with Speed Shoes and Spin Dash.',
    attributes: [
      { trait_type: 'Character', value: 'Sonic' },
      { trait_type: 'Gear',      value: 'Speed Shoes' },
      {
        trait_type: 'Move Set',
        value: ['Spin Dash', 'Homing Attack', 'Super Peel Out', 'Tornado'],
      },
    ],
    health: 100,
    wallet_address_real: account,
  };

  return (
    <main className="flex flex-col items-center justify-center h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Battle</h1>
      <div className="w-full max-w-md h-[600px]">
        <ChatBot player={player} />
      </div>
    </main>
  );
}
