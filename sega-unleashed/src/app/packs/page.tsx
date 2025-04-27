/* src/components/PackOpenings.tsx */
'use client';

import { useState } from "react";
import { BrowserProvider, getAddress, parseEther, TransactionResponse } from "ethers";
import ErrorMessage from "./ErrorMessage";
import TxList from "./TxList";

interface PaymentHandlers {
  setError: (msg: string) => void;
  setTxs: (txs: TransactionResponse[]) => void;
  amount: string;
}

const PACK_TIERS = [
  { label: 'Bronze (0.01 MATIC)', amount: '0.01' },
  { label: 'Silver (0.05 MATIC)', amount: '0.05' },
  { label: 'Gold (0.1 MATIC)', amount: '0.1' }
];

async function startPayment({ setError, setTxs, amount }: PaymentHandlers) {
  try {
    if (!window.ethereum) throw new Error('No crypto wallet found. Please install MetaMask.');
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const recipient = '0xA05228D9D57Fa3D2fc3D33885Ee5E281A94100C9';
    getAddress(recipient);
    const tx = await signer.sendTransaction({ to: recipient, value: parseEther(amount) });
    setTxs([tx]);
    setError('');
    return tx;
  } catch (err: any) {
    setError(err.message || 'An unknown error occurred.');
    throw err;
  }
}

export default function PackOpenings() {
  const [error, setError] = useState<string>('');
  const [txs, setTxs] = useState<TransactionResponse[]>([]);
  const [packs, setPacks] = useState<number[][]>([]);
  const [selectedTier, setSelectedTier] = useState(PACK_TIERS[0].amount);
  const [mintedIds, setMintedIds] = useState<number[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setTxs([]);
    setMintedIds([]);

    try {
      const tx = await startPayment({ setError, setTxs, amount: selectedTier });

      // Generate and display pack
      const newPack = Array.from({ length: 5 }, () => Math.floor(Math.random() * 100));
      setPacks(prev => [...prev, newPack]);

      // Prepare JSON payload for server
      const payload = {
        recipient: tx.from,
        traits: {
          packType: selectedTier === '0.01' ? 'Bronze'
                   : selectedTier === '0.05' ? 'Silver'
                   : 'Gold'
        }
      };

      // Send JSON request to server
      const response = await fetch('http://20.117.181.22:5111/mint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Mint request failed');
      }

      // Parse minted token IDs and display
      const ids: number[] = await response.json();
      setMintedIds(ids);

    } catch {
      // Error already handled
    }
  };

  return (
    <form className="m-4" onSubmit={handleSubmit}>
      <div className="credit-card w-full lg:w-1/2 sm:w-auto shadow-lg mx-auto rounded-xl bg-white">
        <main className="mt-4 p-4">
          <h1 className="text-xl font-semibold text-gray-700 text-center">Open a Pack</h1>
          <div className="mt-4">
            {PACK_TIERS.map(tier => (
              <label key={tier.amount} className="flex items-center space-x-2 mb-2">
                <input
                  type="radio"
                  name="packTier"
                  value={tier.amount}
                  checked={selectedTier === tier.amount}
                  onChange={() => setSelectedTier(tier.amount)}
                  className="form-radio"
                />
                <span className="text-gray-600">{tier.label}</span>
              </label>
            ))}
          </div>
        </main>
        <footer className="p-4">
          <button type="submit" className="btn btn-primary w-full">Open Pack</button>
          <ErrorMessage message={error} />
          <TxList txs={txs} />
          {mintedIds.length > 0 && (
            <div className="mt-4 p-2 border rounded bg-gray-50">
              <strong>Minted Token IDs:</strong> {mintedIds.join(', ')}
            </div>
          )}
          <div className="mt-4 space-y-2">
            {packs.map((pack, i) => (
              <div key={i} className="p-2 border rounded">
                <strong>Pack {i + 1} ({pack.length} items):</strong> {pack.join(', ')}
              </div>
            ))}
          </div>
        </footer>
      </div>
    </form>
  );
}