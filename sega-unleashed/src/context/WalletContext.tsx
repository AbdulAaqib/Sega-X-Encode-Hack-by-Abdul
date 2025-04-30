/* src/context/WalletContext.tsx */
'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode
} from 'react';
import {
  BrowserProvider,
  formatEther,
  Eip1193Provider
} from 'ethers';

interface WalletContextType {
  provider: BrowserProvider | null;
  account: string;
  balance: string;
  chainId: number;
  error: string;
  connectWallet: () => Promise<string>;
  switchToPolygon: () => Promise<void>;
  sendPayment: () => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [account, setAccount] = useState<string>('');
  const [balance, setBalance] = useState<string>('');
  const [chainId, setChainId] = useState<number>(0);
  const [error, setError] = useState<string>('');

  // Setup provider and event listeners on mount
  useEffect(() => {
    if (!window.ethereum) {
      setError('MetaMask not found. Please install it.');
      return;
    }
  
    const web3Provider = new BrowserProvider(window.ethereum as Eip1193Provider);
    setProvider(web3Provider);
  
    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        setAccount('');
        setBalance('');
        setChainId(0);
      } else {
        const addr = accounts[0];
        setAccount(addr);
        const bal = await web3Provider.getBalance(addr);
        setBalance(formatEther(bal));
      }
    };
  
    const handleChainChanged = async (chainHex: string) => {
      const id = parseInt(chainHex, 16);
      setChainId(id);
    };
  
    // ✅ Use variadic args + proper type checks
    window.ethereum.on('accountsChanged', (...args: unknown[]) => {
      if (Array.isArray(args[0]) && typeof args[0][0] === 'string') {
        handleAccountsChanged(args[0] as string[]);
      }
    });
  
    window.ethereum.on('chainChanged', (...args: unknown[]) => {
      const chainId = args[0];
      if (typeof chainId === 'string') {
        handleChainChanged(chainId);
      }
    });
  
    return () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);
  
  // Update balance when account changes
  useEffect(() => {
    if (provider && account) {
      provider.getBalance(account).then((bal) => {
        setBalance(formatEther(bal));
      });
    }
  }, [provider, account]);

  const connectWallet = async (): Promise<string> => {
    if (!window.ethereum) {
      setError('Ethereum provider not found.');
      throw new Error('No provider');
    }
  
    try {
      const result = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
  
      if (!Array.isArray(result) || typeof result[0] !== 'string') {
        throw new Error('Invalid account response');
      }
  
      const accounts = result as string[];
      setAccount(accounts[0]);
      setError('');
      return accounts[0];
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        throw err;
      } else {
        setError('Unknown error occurred');
        throw new Error('Unknown error');
      }
    }
  };
  
  const switchToPolygon = async (): Promise<void> => {
    if (!window.ethereum) {
      setError('Ethereum provider not found.');
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x89' }] // Polygon Mainnet
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        throw err;
      } else {
        setError('Unknown error switching chain');
        throw new Error('Unknown error');
      }
    }
  };

  const sendPayment = async (): Promise<string> => {
    if (!provider || !account) {
      setError('No provider or account connected');
      throw new Error('Wallet not connected');
    }
  
    try {
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: '0x000000000000000000000000000000000000dead',
        value: BigInt(1e16) // 0.01 ETH
      });
  
      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('Transaction receipt not found.');
      }
  
      return receipt.hash;
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        throw err;
      } else {
        setError('Unknown error sending transaction');
        throw new Error('Unknown error');
      }
    }
  };
  
  return (
    <WalletContext.Provider
      value={{
        provider,
        account,
        balance,
        chainId,
        error,
        connectWallet,
        switchToPolygon,
        sendPayment
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider');
  return ctx;
};
