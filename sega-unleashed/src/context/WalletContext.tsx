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
  parseEther,
  TransactionReceipt
} from 'ethers';

interface WalletContextType {
  provider: BrowserProvider | null;
  account: string;
  balance: string;
  chainId: number;
  error: string;
  /** Now returns the connected account or throws */
  connectWallet: () => Promise<string>;
  switchToPolygon: () => Promise<void>;
  sendPayment: () => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(
  undefined
);

export const WalletProvider = ({
  children
}: {
  children: ReactNode;
}) => {
  const [provider, setProvider] = useState<BrowserProvider | null>(
    null
  );
  const [account, setAccount] = useState<string>('');
  const [balance, setBalance] = useState<string>('');
  const [chainId, setChainId] = useState<number>(0);
  const [error, setError] = useState<string>('');

  // Only run once on mount: set up provider + listeners
  useEffect(() => {
    if (!window.ethereum) {
      setError('MetaMask not found. Please install it.');
      return;
    }
    const web3Provider = new BrowserProvider(window.ethereum as any);
    setProvider(web3Provider);

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        setAccount(''); setBalance(''); setChainId(0);
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
      if (account) {
        const bal = await web3Provider.getBalance(account);
        setBalance(formatEther(bal));
      }
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, []);  // <-- no account dependency

  const connectWallet = async (): Promise<string> => {
    if (!window.ethereum) {
      setError('Ethereum provider not found.');
      throw new Error('No provider');
    }
    try {
      const accounts: string[] =
        await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
      if (!accounts.length) {
        throw new Error('No accounts returned');
      }
      // Manually update state right away
      setAccount(accounts[0]);
      setError('');
      return accounts[0];
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      throw err;
    }
  };

  const switchToPolygon = async () => { /* unchanged */ };

  const sendPayment = async (): Promise<string> => { /* unchanged */ };

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
